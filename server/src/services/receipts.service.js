import { parseReceipt } from './ai.service.js';
import * as receiptsRepo from '../repositories/receipts.repository.js';

/**
 * Orchestrates the receipt upload flow:
 * photo -> AI -> validated data -> DB.
 */
export async function processReceiptUpload(imageBuffer, mimeType, imagePath) {
  // 1. AI parsing (retries and Zod validation inside)
  const { data, raw } = await parseReceipt(imageBuffer, mimeType);

  // 2. Save to DB (atomic)
  const { id, created_at } = await receiptsRepo.insertReceiptWithItems(
    data,
    raw,
    imagePath
  );

  // 3. Return full object for immediate display on the frontend
  return { id, created_at, ...data };
}

export async function getReceipts() {
  return receiptsRepo.findAllReceipts();
}

export async function getReceiptById(id) {
  return receiptsRepo.findReceiptById(id);
}

export async function getCategoryStats() {
  return receiptsRepo.sumByCategory();
}

export async function deleteReceipt(id) {
  return receiptsRepo.deleteReceiptById(id);
}
