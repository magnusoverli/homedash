import multer from 'multer';

export const TOKEN_EXPIRY_SHORT = 12 * 60 * 60 * 1000;
export const TOKEN_EXPIRY_LONG = 7 * 24 * 60 * 60 * 1000;
export const TOKEN_REFRESH_THRESHOLD = 30 * 60 * 1000;

export const ACCESS_PASSWORD = process.env.ACCESS_PASSWORD;
export const ACCESS_CONTROL_ENABLED = !!ACCESS_PASSWORD;

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype.startsWith('image/') ||
      file.mimetype === 'application/pdf'
    ) {
      cb(null, true);
    } else {
      cb(new Error('Only image files and PDFs are allowed'), false);
    }
  },
});
