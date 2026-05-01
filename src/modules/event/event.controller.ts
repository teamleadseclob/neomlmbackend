import { Request, Response } from 'express';
import catchAsync from '../../utils/catchAsync';
import ApiResponse from '../../utils/ApiResponse';
import ApiError from '../../utils/ApiError';
import eventService from './event.service';
import { AuthRequest } from '../../types';

// Admin endpoints
export const createEvent = catchAsync(async (req: Request, res: Response) => {
  if (!req.file) throw ApiError.badRequest('Media file is required');

  const { title, description, expiryDays } = req.body;
  if (!title || !description || !expiryDays) {
    throw ApiError.badRequest('Title, description, and expiryDays are required');
  }

  const result = await eventService.create({
    title,
    description,
    expiryDays: parseInt(expiryDays, 10),
    mediaBuffer: req.file.buffer,
    mediaType: req.file.mimetype,
    mediaSize: req.file.size,
    createdBy: (req as AuthRequest).user._id,
  });

  return ApiResponse.created(res, 'Event created successfully', result);
});

export const getAllEvents = catchAsync(async (_req: Request, res: Response) => {
  const events = await eventService.getAllEvents();
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

// User-facing endpoints
export const getActiveEvents = catchAsync(async (_req: Request, res: Response) => {
  const events = await eventService.getActiveEvents();
  return ApiResponse.success(res, 'Active events retrieved', events);
});

export const getEventById = catchAsync(async (req: Request, res: Response) => {
  const event = await eventService.getEventById(req.params.id as string);
  return ApiResponse.success(res, 'Event retrieved', event);
});

export const getEventMedia = catchAsync(async (req: Request, res: Response) => {
  const { data, type } = await eventService.getEventMedia(req.params.id as string);

  res.set('Content-Type', type);
  res.set('Cache-Control', 'public, max-age=86400'); // cache 24h
  res.send(data);
});
