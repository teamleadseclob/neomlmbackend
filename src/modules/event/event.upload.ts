import multer from 'multer';
import { ALLOWED_MEDIA_TYPES, MAX_MEDIA_SIZE } from '../../models/Event';
import ApiError from '../../utils/ApiError';

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
