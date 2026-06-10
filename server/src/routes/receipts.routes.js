import { Router } from 'express';
import { uploadReceiptImage } from '../middleware/upload.js';
import * as controller from '../controllers/receipts.controller.js';

export const receiptsRouter = Router();

receiptsRouter.post('/', uploadReceiptImage, controller.uploadReceipt);
receiptsRouter.get('/', controller.listReceipts);
receiptsRouter.get('/stats/categories', controller.categoryStats); // ДО /:id!
receiptsRouter.get('/:id', controller.getReceipt);
receiptsRouter.delete('/:id', controller.deleteReceipt);