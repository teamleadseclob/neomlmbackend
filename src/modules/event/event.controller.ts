import { Request, Response } from 'express';
import catchAsync from '../../utils/catchAsync';
import ApiResponse from '../../utils/ApiResponse';
import eventService from './event.service';
import { AuthRequest } from '../../types';

export const createEvent = catchAsync(async (req: Request, res: Response) => {
  const result = await eventService.create({
    ...req.body,
    createdBy: (req as AuthRequest).user._id,
  });
  return ApiResponse.created(res, 'Event created successfully', result);
});

export const getAllEvents = catchAsync(async (req: Request, res: Response) => {
  const events = await eventService.getAllEvents(req.query.type as string);
  return ApiResponse.success(res, 'All events retrieved', events);
});

export const updateEvent = catchAsync(async (req: Request, res: Response) => {
  const result = await eventService.update(req.params.id as string, req.body);
  return ApiResponse.success(res, 'Event updated successfully', result);
});

export const deleteEvent = catchAsync(async (req: Request, res: Response) => {
  await eventService.delete(req.params.id as string);
  return ApiResponse.success(res, 'Event deleted successfully');
});

// User-facing
export const getActiveEvents = catchAsync(async (req: Request, res: Response) => {
  const events = await eventService.getActiveEvents(req.query.type as string);
  return ApiResponse.success(res, 'Active events retrieved', events);
});

export const getEventById = catchAsync(async (req: Request, res: Response) => {
  const event = await eventService.getEventById(req.params.id as string);
  return ApiResponse.success(res, 'Event retrieved', event);
});
