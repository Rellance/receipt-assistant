import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';
import { env } from '../config/env.js';
import { receiptSchema } from '../schemas/receipt.schema.js';

const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });

// System prompt: short and imperative, no examples.
// Field structure is defined by responseSchema — duplicating it in the prompt
// wastes tokens and risks drift.
const SYSTEM_PROMPT = `Olet kassakuittien jäsentäjä. Poimi tiedot kuitin kuvasta.
Säännöt:
- Jos päivämäärä on muodossa DD.MM.YYYY — muunna muotoon YYYY-MM-DD.
- total_amount on MAKSETTAVA loppusumma (YHTEENSÄ/TOTAL/SUMMA), ei välisumma.
- Jos määrää ei ole merkitty — käytä arvoa 1.
- Valuutta: pelkkä €-merkki tarkoittaa EUR.
- Valitse category kaupan tyypin ja tuotteiden perusteella:
  Ruoka, Liikenne, Elektroniikka, Vapaa-aika, Muu.
- Älä keksi rivejä, joita kuitissa ei ole. Ohita lukukelvottomat rivit.`;

// Custom error so errorHandler can distinguish AI failures from other errors
export class AiParsingError extends Error {
    constructor(message, cause) {
        super(message);
        this.name = 'AiParsingError';
        this.cause = cause;
        this.statusCode = 502; // Bad Gateway: upstream service failure
    }
}

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const FALLBACK_MODEL = 'gemini-3.1-flash-lite'; // Lighter model when primary is overloaded

export async function parseReceipt(imageBuffer, mimeType) {
    let lastError;
    let useFallback = false; // Switch to fallback model after quota errors

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        const model =
            useFallback || attempt === MAX_RETRIES ? FALLBACK_MODEL : env.GEMINI_MODEL;

        try {
            const response = await ai.models.generateContent({
                model,
                contents: [
                    {
                        role: 'user',
                        parts: [
                            { inlineData: { mimeType, data: imageBuffer.toString('base64') } },
                            { text: 'Poimi tiedot tästä kuitista.' },
                        ],
                    },
                ],
                config: {
                    systemInstruction: SYSTEM_PROMPT,
                    responseMimeType: 'application/json',
                    responseSchema: z.toJSONSchema(receiptSchema),
                    temperature: 0,
                },
            });

            const rawText = response.text;
            if (!rawText) throw new Error('Empty response from model');

            const parsed = receiptSchema.safeParse(JSON.parse(rawText));
            if (!parsed.success) {
                throw new Error(
                    `AI response failed validation: ${parsed.error.issues
                        .map((i) => `${i.path.join('.')}: ${i.message}`)
                        .join('; ')}`
                );
            }

            return { data: parsed.data, raw: rawText };
        } catch (err) {
            lastError = err;
            const status = err?.status ?? err?.cause?.status;
            console.error(
                `[AI] Attempt ${attempt + 1}/${MAX_RETRIES + 1} (${model}) failed:`,
                err.message
            );

            // Do not retry: bad API key or unknown model
            if (status === 401 || status === 403 || status === 404) break;

            // 429 = quota exhausted. Waiting is pointless (daily limit) —
            // on the next attempt switch to fallback model immediately.
            if (status === 429) {
                if (useFallback || model === FALLBACK_MODEL) break; // Quota hit on fallback too — give up
                useFallback = true;
                continue;
            }

            if (attempt < MAX_RETRIES) {
                const delay =
                    status === 503
                        ? RETRY_DELAY_MS * 2 ** (attempt + 1) // Overload: 4s, 8s, 16s
                        : RETRY_DELAY_MS * (attempt + 1);     // Other: 2s, 4s, 6s
                await sleep(delay);
            }
        }
    }

    throw new AiParsingError('Kuitin tunnistus epäonnistui', lastError);
}
