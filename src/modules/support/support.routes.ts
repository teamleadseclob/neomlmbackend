import { Router } from 'express';
import * as supportController from './support.controller';
import auth from '../../middlewares/auth';
import authorize from '../../middlewares/authorize';
import validate from '../../middlewares/validate';
import * as supportValidation from './support.validation';

const userRouter = Router();

userRouter.use(auth as any);

userRouter.post('/tickets', validate(supportValidation.createTicket), supportController.createTicket);
userRouter.get('/tickets', validate(supportValidation.getUserTickets), supportController.getUserTickets);
userRouter.get('/tickets/:ticketId', validate(supportValidation.ticketIdParam), supportController.getUserTicketById);

const adminRouter = Router();

adminRouter.use(auth as any, authorize('admin') as any);

adminRouter.get('/tickets', validate(supportValidation.getAdminTickets), supportController.getAdminTickets);
adminRouter.get('/tickets/:ticketId', validate(supportValidation.ticketIdParam), supportController.getAdminTicketById);
adminRouter.patch('/tickets/:ticketId', validate(supportValidation.updateTicketStatus), supportController.updateTicketStatus);

export { userRouter, adminRouter };
