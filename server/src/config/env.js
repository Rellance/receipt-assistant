// Single entry point for reading environment variables.
// Fail immediately at startup if anything is missing.
import 'dotenv/config';

function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`[CONFIG] Missing environment variable: ${name}. Check your .env file`);
  }
  return value;
}

export const env = {
  GEMINI_API_KEY: required('GEMINI_API_KEY'),
  GEMINI_MODEL: process.env.GEMINI_MODEL || 'gemini-3.5-flash',
  DATABASE_URL: required('DATABASE_URL'),
  PORT: Number(process.env.PORT) || 3000,
};
