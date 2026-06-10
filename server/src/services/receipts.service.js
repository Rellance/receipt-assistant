import { parseReceipt } from './ai.service.js';
import * as receiptsRepo from '../repositories/receipts.repository.js';

/**
 * Оркестратор сценария "загрузка чека":
 * фото -> ИИ -> валидированные данные -> БД.
 */
export async function processReceiptUpload(imageBuffer, mimeType, imagePath) {
  // 1. ИИ-разбор (внутри уже есть ретраи и Zod-валидация)
  const { data, raw } = await parseReceipt(imageBuffer, mimeType);

  // 2. Сохранение в БД (атомарно)
  const { id, created_at } = await receiptsRepo.insertReceiptWithItems(
    data,
    raw,
    imagePath
  );

  // 3. Возвращаем полный объект для немедленного отображения на фронте
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