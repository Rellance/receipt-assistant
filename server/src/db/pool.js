import pg from 'pg';
import { env } from '../config/env.js';

// Пул соединений: вместо открытия нового соединения на каждый запрос
// (дорого, ~50-100мс) переиспользуем готовые из пула.
export const pool = new pg.Pool({
  connectionString: env.DATABASE_URL,
  max: 10,                      // Максимум соединений (для пет-проекта хватит)
  idleTimeoutMillis: 30_000,    // Закрывать простаивающие через 30 сек
  connectionTimeoutMillis: 5_000,
});

// Если соединение в пуле умерло (БД перезапустилась) — логируем,
// но не роняем процесс. Пул сам создаст новое соединение.
pool.on('error', (err) => {
  console.error('[DB] Ошибка простаивающего соединения:', err.message);
});
