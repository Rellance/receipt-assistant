import multer from 'multer';

// Центральный обработчик ошибок. Express вызывает его, когда
// любой роут/middleware передал ошибку в next(err).
export function errorHandler(err, req, res, next) {
  // Ошибки multer (например, файл больше лимита)
  if (err instanceof multer.MulterError) {
    const message =
      err.code === 'LIMIT_FILE_SIZE'
        ? 'Tiedosto on liian suuri (enintään 10 Mt)'
        : 'Tiedoston lataus epäonnistui';
    return res.status(400).json({ error: message });
  }

  const status = err.statusCode || 500;

  // 5xx логируем полностью (это наши баги или сбои внешних сервисов),
  // 4xx — это ошибки клиента, стектрейс не нужен.
  if (status >= 500) {
    console.error('[ERROR]', err);
  }

  res.status(status).json({
    error:
      status >= 500 && !err.statusCode
        ? 'Sisäinen palvelinvirhe' // Не светим детали наружу
        : err.message,
  });
}
