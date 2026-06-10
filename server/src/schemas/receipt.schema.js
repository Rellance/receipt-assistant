import { z } from 'zod';

export const CATEGORIES = ['Ruoka', 'Liikenne', 'Elektroniikka', 'Vapaa-aika', 'Muu'];

export const receiptItemSchema = z.object({
    name: z.string().min(1).describe('Tuotteen tai palvelun nimi kuitissa'),
    quantity: z.number().positive().describe('Määrä (kpl tai kg)'),
    price: z.number().nonnegative().describe('Rivin loppuhinta'),
});

export const receiptSchema = z.object({
    store_name: z.string().min(1).describe('Kaupan nimi'),
    date: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, 'Päivämäärän on oltava muodossa YYYY-MM-DD')
        .describe('Ostopäivä ISO-muodossa: YYYY-MM-DD'),
    items: z.array(receiptItemSchema).min(1),
    total_amount: z.number().nonnegative().describe('Kuitin loppusumma'),
    currency: z.string().length(3).describe('Valuuttakoodi ISO 4217, esim. EUR'),
    category: z.enum(CATEGORIES).describe('Kululuokka'),
});