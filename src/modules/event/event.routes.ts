import { Router } from 'express';
import * as eventController from './event.controller';
import validate from '../../middlewares/validate';
import * as eventValidation from './event.validation';

const router = Router();

router.get('/', eventController.getActiveEvents);
router.get('/:id', validate(eventValidation.eventIdParam), eventController.getEventById);

export default router;
