import { pool } from '../db/pool.js';

/**
 * Сохраняет чек и его позиции АТОМАРНО (в одной транзакции).
 * Либо сохранится всё, либо ничего.
 */
export async function insertReceiptWithItems(receipt, rawAiJson, imagePath) {
  const client = await pool.connect(); // Берём одно соединение из пула

  try {
    await client.query('BEGIN');

    const receiptResult = await client.query(
      `INSERT INTO receipts
         (store_name, purchase_date, total_amount, currency, category, image_path, raw_ai_json)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, created_at`,
      [
        receipt.store_name,
        receipt.date,
        receipt.total_amount,
        receipt.currency,
        receipt.category,
        imagePath,
        rawAiJson,
      ]
    );

    const receiptId = receiptResult.rows[0].id;

    // Вставляем все позиции одним запросом (bulk insert),
    // а не циклом по одной — меньше round-trip'ов к БД.
    const values = [];
    const placeholders = receipt.items
      .map((item, i) => {
        const offset = i * 4;
        values.push(receiptId, item.name, item.quantity, item.price);
        return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4})`;
      })
      .join(', ');

    await client.query(
      `INSERT INTO receipt_items (receipt_id, name, quantity, price)
       VALUES ${placeholders}`,
      values
    );

    await client.query('COMMIT');

    return { id: receiptId, created_at: receiptResult.rows[0].created_at };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release(); // КРИТИЧНО: вернуть соединение в пул в любом случае
  }
}

/** Список чеков с агрегированным числом позиций (для дашборда). */
export async function findAllReceipts() {
  const result = await pool.query(
    `SELECT r.id, r.store_name, r.purchase_date, r.total_amount,
            r.currency, r.category, r.created_at,
            COUNT(ri.id)::int AS items_count
     FROM receipts r
     LEFT JOIN receipt_items ri ON ri.receipt_id = r.id
     GROUP BY r.id
     ORDER BY r.purchase_date DESC, r.id DESC`
  );
  return result.rows;
}

/** Один чек со всеми позициями. */
export async function findReceiptById(id) {
  const receiptResult = await pool.query(
    `SELECT id, store_name, purchase_date, total_amount, currency,
            category, image_path, created_at
     FROM receipts WHERE id = $1`,
    [id]
  );

  if (receiptResult.rows.length === 0) return null;

  const itemsResult = await pool.query(
    `SELECT id, name, quantity, price
     FROM receipt_items WHERE receipt_id = $1 ORDER BY id`,
    [id]
  );

  return { ...receiptResult.rows[0], items: itemsResult.rows };
}

/** Агрегация по категориям (для графика на дашборде). */
export async function sumByCategory() {
  const result = await pool.query(
    `SELECT category, SUM(total_amount)::numeric(12,2) AS total, COUNT(*)::int AS receipts
     FROM receipts
     GROUP BY category
     ORDER BY total DESC`
  );
  return result.rows;
}
