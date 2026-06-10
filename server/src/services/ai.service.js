import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';
import { env } from '../config/env.js';
import { receiptSchema } from '../schemas/receipt.schema.js';

const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });

// Системный промпт: короткий, императивный, без примеров.
// Структуру полей описывает responseSchema — дублировать её в промпте
// не нужно, это лишние токены и риск рассинхрона.
const SYSTEM_PROMPT = `Olet kassakuittien jäsentäjä. Poimi tiedot kuitin kuvasta.
Säännöt:
- Jos päivämäärä on muodossa DD.MM.YYYY — muunna muotoon YYYY-MM-DD.
- total_amount on MAKSETTAVA loppusumma (YHTEENSÄ/TOTAL/SUMMA), ei välisumma.
- Jos määrää ei ole merkitty — käytä arvoa 1.
- Valuutta: pelkkä €-merkki tarkoittaa EUR.
- Valitse category kaupan tyypin ja tuotteiden perusteella:
  Ruoka, Liikenne, Elektroniikka, Vapaa-aika, Muu.
- Älä keksi rivejä, joita kuitissa ei ole. Ohita lukukelvottomat rivit.`;

// Кастомная ошибка, чтобы errorHandler мог отличить сбой ИИ от других ошибок
export class AiParsingError extends Error {
    constructor(message, cause) {
        super(message);
        this.name = 'AiParsingError';
        this.cause = cause;
        this.statusCode = 502; // Bad Gateway: проблема на стороне внешнего сервиса
    }
}

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const FALLBACK_MODEL = 'gemini-3.1-flash-lite'; // Лёгкая модель на случай перегрузки основной

export async function parseReceipt(imageBuffer, mimeType) {
    let lastError;
    let useFallback = false; // Переключаемся на запасную модель после ошибки квоты

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
            if (!rawText) throw new Error('Пустой ответ от модели');

            const parsed = receiptSchema.safeParse(JSON.parse(rawText));
            if (!parsed.success) {
                throw new Error(
                    `Ответ ИИ не прошёл валидацию: ${parsed.error.issues
                        .map((i) => `${i.path.join('.')}: ${i.message}`)
                        .join('; ')}`
                );
            }

            return { data: parsed.data, raw: rawText };
        } catch (err) {
            lastError = err;
            const status = err?.status ?? err?.cause?.status;
            console.error(
                `[AI] Попытка ${attempt + 1}/${MAX_RETRIES + 1} (${model}) не удалась:`,
                err.message
            );

            // Не ретраим: плохой ключ, несуществующая модель
            if (status === 401 || status === 403 || status === 404) break;

            // 429 = квота исчерпана. Ждать бессмысленно (лимит дневной!) —
            // на следующей попытке сразу идём в запасную модель без паузы.
            if (status === 429) {
                if (useFallback || model === FALLBACK_MODEL) break; // Квота и у запасной — сдаёмся
                useFallback = true;
                continue;
            }

            if (attempt < MAX_RETRIES) {
                const delay =
                    status === 503
                        ? RETRY_DELAY_MS * 2 ** (attempt + 1) // Перегрузка: 4с, 8с, 16с
                        : RETRY_DELAY_MS * (attempt + 1);     // Прочее: 2с, 4с, 6с
                await sleep(delay);
            }
        }
    }

    throw new AiParsingError('Kuitin tunnistus epäonnistui', lastError);
}