import multer from 'multer';

// Central error handler. Express calls this when any route/middleware passes next(err).
export function errorHandler(err, req, res, next) {
  // Multer errors (e.g. file exceeds size limit)
  if (err instanceof multer.MulterError) {
    const message =
      err.code === 'LIMIT_FILE_SIZE'
        ? 'Tiedosto on liian suuri (enintään 10 Mt)'
        : 'Tiedoston lataus epäonnistui';
    return res.status(400).json({ error: message });
  }

  const status = err.statusCode || 500;

  // Log 5xx fully (our bugs or upstream failures);
  // 4xx are client errors — stack trace not needed.
  if (status >= 500) {
    console.error('[ERROR]', err);
  }

  res.status(status).json({
    error:
      status >= 500 && !err.statusCode
        ? 'Sisäinen palvelinvirhe' // Do not expose internal details
        : err.message,
  });
}
