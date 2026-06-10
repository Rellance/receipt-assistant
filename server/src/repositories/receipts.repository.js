import { pool } from '../db/pool.js';

/**
 * Saves a receipt and its line items ATOMICALLY (single transaction).
 * Either everything is saved or nothing is.
 */
export async function insertReceiptWithItems(receipt, rawAiJson, imagePath) {
  const client = await pool.connect(); // Take one connection from the pool

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

    // Insert all line items in one query (bulk insert),
    // not one-by-one in a loop — fewer round-trips to the DB.
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
    client.release(); // CRITICAL: always return connection to the pool
  }
}

/** Receipt list with aggregated line-item count (for dashboard). */
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

/** Single receipt with all line items. */
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

/** Aggregation by category (for dashboard chart). */
export async function sumByCategory() {
  const result = await pool.query(
    `SELECT category, SUM(total_amount)::numeric(12,2) AS total, COUNT(*)::int AS receipts
     FROM receipts
     GROUP BY category
     ORDER BY total DESC`
  );
  return result.rows;
}

/** Deletes a receipt. Line items are removed via ON DELETE CASCADE. */
export async function deleteReceiptById(id) {
  const result = await pool.query('DELETE FROM receipts WHERE id = $1', [id]);
  return result.rowCount > 0; // true = a row was actually deleted
}
