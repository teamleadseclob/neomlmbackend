import { Types, FilterQuery } from 'mongoose';
import ApiError from '../../utils/ApiError';
import { buildPagination } from '../../utils/helpers';
import SupportTicket, { ISupportTicket, ITicketField } from '../../models/SupportTicket';
import { Pagination } from '../../types';

interface TicketSummary {
  total: number;
  open: number;
  inProgress: number;
  resolved: number;
  closed: number;
}

interface TicketQuery {
  page?: string;
  limit?: string;
  status?: string;
  priority?: string;
  category?: string;
  search?: string;
  [key: string]: unknown;
}

function ticketQuery(ticketId: string): FilterQuery<ISupportTicket> {
  if (/^[a-fA-F0-9]{24}$/.test(ticketId)) return { _id: ticketId };
  return { ticketId };
}

class SupportService {
  // ─── User Methods ───

  async createTicket(userId: Types.ObjectId, data: {
    category: string;
    fields: ITicketField[];
    priority: 'low' | 'high';
    subject: string;
    message: string;
    image?: string;
  }): Promise<ISupportTicket> {
    return SupportTicket.create({
      userId,
      category: data.category,
      fields: data.fields,
      priority: data.priority,
      subject: data.subject,
      message: data.message,
      image: data.image || null,
    });
  }

  async getUserTickets(
    userId: Types.ObjectId,
    query: TicketQuery,
  ): Promise<{ summary: TicketSummary; tickets: ISupportTicket[]; pagination: Pagination }> {
    const filter: FilterQuery<ISupportTicket> = { userId };
    if (query.status) filter.status = query.status;

    const [total, open, inProgress, resolved, closed] = await Promise.all([
      SupportTicket.countDocuments({ userId }),
      SupportTicket.countDocuments({ userId, status: 'open' }),
      SupportTicket.countDocuments({ userId, status: 'in_progress' }),
      SupportTicket.countDocuments({ userId, status: 'resolved' }),
      SupportTicket.countDocuments({ userId, status: 'closed' }),
    ]);

    const totalDocs = await SupportTicket.countDocuments(filter);
    const pagination = buildPagination(query, totalDocs);

    const tickets = await SupportTicket.find(filter)
      .sort({ createdAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit);

    return {
      summary: { total, open, inProgress, resolved, closed },
      tickets,
      pagination,
    };
  }

  async getUserTicketById(userId: Types.ObjectId, ticketId: string): Promise<ISupportTicket> {
    const ticket = await SupportTicket.findOne({ ticketId, userId });
    if (!ticket) throw ApiError.notFound('Ticket not found');
    return ticket;
  }

  // ─── Admin Methods ───

  async getAdminTickets(
    query: TicketQuery,
  ): Promise<{ summary: TicketSummary; tickets: ISupportTicket[]; pagination: Pagination }> {
    const filter: FilterQuery<ISupportTicket> = {};
    if (query.status) filter.status = query.status;
    if (query.priority) filter.priority = query.priority;
    if (query.category) filter.category = query.category;
    if (query.search) {
      filter.$or = [
        { ticketId: { $regex: query.search, $options: 'i' } },
        { subject: { $regex: query.search, $options: 'i' } },
      ];
    }

    const [total, open, inProgress, resolved, closed] = await Promise.all([
      SupportTicket.countDocuments(),
      SupportTicket.countDocuments({ status: 'open' }),
      SupportTicket.countDocuments({ status: 'in_progress' }),
      SupportTicket.countDocuments({ status: 'resolved' }),
      SupportTicket.countDocuments({ status: 'closed' }),
    ]);

    const totalDocs = await SupportTicket.countDocuments(filter);
    const pagination = buildPagination(query, totalDocs);

    const tickets = await SupportTicket.find(filter)
      .populate('userId', 'name userId email')
      .sort({ createdAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit);

    return {
      summary: { total, open, inProgress, resolved, closed },
      tickets,
      pagination,
    };
  }

  async getAdminTicketById(ticketId: string): Promise<ISupportTicket> {
    const ticket = await SupportTicket.findOne(ticketQuery(ticketId))
      .populate('userId', 'name userId email swpBalance totalInvested walletBalance');
    if (!ticket) throw ApiError.notFound('Ticket not found');
    return ticket;
  }

  async updateTicketStatus(
    ticketId: string,
    data: { status: string; adminReply?: string },
  ): Promise<ISupportTicket> {
    const ticket = await SupportTicket.findOne(ticketQuery(ticketId));
    if (!ticket) throw ApiError.notFound('Ticket not found');

    // Validate status transitions
    const validTransitions: Record<string, string[]> = {
      open: ['in_progress', 'resolved', 'closed'],
      in_progress: ['resolved', 'closed'],
      resolved: ['closed'],
      closed: [],
    };

    const allowed = validTransitions[ticket.status] || [];
    if (!allowed.includes(data.status)) {
      throw ApiError.badRequest(
        `Cannot change status from '${ticket.status}' to '${data.status}'. Allowed: ${allowed.join(', ') || 'none'}`,
      );
    }

    ticket.status = data.status as ISupportTicket['status'];

    if (data.adminReply) {
      ticket.adminReply = data.adminReply;
    }

    if (data.status === 'resolved' && !ticket.resolvedAt) {
      ticket.resolvedAt = new Date();
    }

    await ticket.save();
    return ticket;
  }

  async getAdminTicketCounts() {
    const unread = await SupportTicket.countDocuments({ isRead: false });
    return { unread };
  }

  async markAllTicketsAsRead() {
    await SupportTicket.updateMany({ isRead: false }, { isRead: true });
  }
}

export default new SupportService();
