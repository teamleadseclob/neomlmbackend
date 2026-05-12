import multer from 'multer';
import ApiError from '../../utils/ApiError';

const ALLOWED_MEDIA_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'video/mp4',
  'video/webm',
];

const MAX_MEDIA_SIZE = 5 * 1024 * 1024; // 5MB

const storage = multer.memoryStorage();

const fileFilter = (_req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (ALLOWED_MEDIA_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(ApiError.badRequest(`Invalid file type. Allowed: ${ALLOWED_MEDIA_TYPES.join(', ')}`));
  }
};

export const uploadMedia = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_MEDIA_SIZE },
}).single('media');
