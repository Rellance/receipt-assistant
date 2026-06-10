import * as receiptsService from '../services/receipts.service.js';

export async function uploadReceipt(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Tiedosto puuttuu. Odotettu kenttä: "receipt"' });
    }

    const result = await receiptsService.processReceiptUpload(
      req.file.buffer,
      req.file.mimetype,
      null // imagePath: photo not saved to disk yet
    );

    res.status(201).json(result);
  } catch (err) {
    next(err); // Pass to errorHandler — do not handle here
  }
}

export async function listReceipts(req, res, next) {
  try {
    res.json(await receiptsService.getReceipts());
  } catch (err) {
    next(err);
  }
}

export async function getReceipt(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'Virheellinen id' });
    }

    const receipt = await receiptsService.getReceiptById(id);
    if (!receipt) {
      return res.status(404).json({ error: 'Kuittia ei löytynyt' });
    }
    res.json(receipt);
  } catch (err) {
    next(err);
  }
}

export async function categoryStats(req, res, next) {
  try {
    res.json(await receiptsService.getCategoryStats());
  } catch (err) {
    next(err);
  }
}

export async function deleteReceipt(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'Virheellinen id' });
    }

    const deleted = await receiptsService.deleteReceipt(id);
    if (!deleted) {
      return res.status(404).json({ error: 'Kuittia ei löytynyt' });
    }

    res.status(204).end(); // 204 No Content: success, no body
  } catch (err) {
    next(err);
  }
}
