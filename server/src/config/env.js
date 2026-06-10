// Единая точка чтения переменных окружения.
// Падаем СРАЗУ при старте, если чего-то не хватает.
import 'dotenv/config';

function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`[CONFIG] Отсутствует переменная окружения: ${name}. Проверь файл .env`);
  }
  return value;
}

export const env = {
  GEMINI_API_KEY: required('GEMINI_API_KEY'),
  GEMINI_MODEL: process.env.GEMINI_MODEL || 'gemini-3.5-flash',
  DATABASE_URL: required('DATABASE_URL'),
  PORT: Number(process.env.PORT) || 3000,
};