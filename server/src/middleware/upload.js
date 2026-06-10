import multer from 'multer';

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE_MB = 10;

// memoryStorage: файл живёт в req.file.buffer и не пишется на диск.
// Для нашего сценария идеально — буфер сразу уходит в Gemini.
export const uploadReceiptImage = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_SIZE_MB * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME.includes(file.mimetype)) {
      const err = new Error('Vain kuvatiedostot: JPEG, PNG, WebP');
      err.statusCode = 415; // Unsupported Media Type
      return cb(err);
    }
    cb(null, true);
  },
}).single('receipt'); // Имя поля в form-data
