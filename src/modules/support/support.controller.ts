import { Request, Response } from 'express';
import catchAsync from '../../utils/catchAsync';
import ApiResponse from '../../utils/ApiResponse';
import supportService from './support.service';
import { AuthRequest } from '../../types';

// ─── User Endpoints ───

export const createTicket = catchAsync(async (req: Request, res: Response) => {
  const ticket = await supportService.createTicket((req as AuthRequest).user._id, req.body);
  return ApiResponse.created(res, 'Support ticket created successfully', ticket);
});

export const getUserTickets = catchAsync(async (req: Request, res: Response) => {
  const result = await supportService.getUserTickets((req as AuthRequest).user._id, req.query);
  return res.status(200).json({
    success: true,
    statusCode: 200,
    message: 'Tickets retrieved',
    summary: result.summary,
    data: result.tickets,
    pagination: result.pagination,
  });
});

export const getUserTicketById = catchAsync(async (req: Request, res: Response) => {
  const ticket = await supportService.getUserTicketById(
    (req as AuthRequest).user._id,
    req.params.ticketId as string,
  );
  return ApiResponse.success(res, 'Ticket retrieved', ticket);
});

// ─── Admin Endpoints ───

export const getAdminTickets = catchAsync(async (req: Request, res: Response) => {
  const result = await supportService.getAdminTickets(req.query);
  return res.status(200).json({
    success: true,
    statusCode: 200,
    message: 'Tickets retrieved',
    summary: result.summary,
    data: result.tickets,
    pagination: result.pagination,
  });
});

export const getAdminTicketById = catchAsync(async (req: Request, res: Response) => {
  const ticket = await supportService.getAdminTicketById(req.params.ticketId as string);
  return ApiResponse.success(res, 'Ticket retrieved', ticket);
});

export const updateTicketStatus = catchAsync(async (req: Request, res: Response) => {
  const ticket = await supportService.updateTicketStatus(req.params.ticketId as string, req.body);
  return ApiResponse.success(res, 'Ticket updated successfully', ticket);
});
