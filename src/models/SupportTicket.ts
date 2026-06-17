import mongoose, { Schema, Model, Document, Types } from 'mongoose';

export interface ITicketField {
  label: string;
  value: string;
}

export interface ISupportTicket extends Document {
  _id: Types.ObjectId;
  ticketId: string;
  userId: Types.ObjectId;
  category: string;
  fields: ITicketField[];
  priority: 'low' | 'high';
  subject: string;
  message: string;
  image: string | null;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  adminReply: string | null;
  isRead: boolean;
  resolvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export const TICKET_CATEGORIES = [
  'Account Issues',
  'SWP & Investment',
  'Commission & Rewards',
  'Withdrawal',
  'Technical Issue',
  'Other',
];

export const TICKET_STATUSES = ['open', 'in_progress', 'resolved', 'closed'] as const;
export const TICKET_PRIORITIES = ['low', 'high'] as const;

const ticketFieldSchema = new Schema<ITicketField>(
  {
    label: { type: String, required: true, trim: true },
    value: { type: String, required: true, trim: true },
  },
  { _id: false },
);

const supportTicketSchema = new Schema<ISupportTicket>(
  {
    ticketId: {
      type: String,
      unique: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: TICKET_CATEGORIES,
    },
    fields: {
      type: [ticketFieldSchema],
      default: [],
    },
    priority: {
      type: String,
      required: true,
      enum: TICKET_PRIORITIES,
      default: 'low',
    },
    subject: {
      type: String,
      required: [true, 'Subject is required'],
      trim: true,
      maxlength: [200, 'Subject cannot exceed 200 characters'],
    },
    message: {
      type: String,
      required: [true, 'Message is required'],
      trim: true,
      maxlength: [5000, 'Message cannot exceed 5000 characters'],
    },
    image: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: TICKET_STATUSES,
      default: 'open',
    },
    adminReply: {
      type: String,
      default: null,
      trim: true,
      maxlength: [5000, 'Reply cannot exceed 5000 characters'],
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, unknown>) {
        delete ret.__v;
        return ret;
      },
    },
  },
);

supportTicketSchema.index({ userId: 1, createdAt: -1 });
supportTicketSchema.index({ status: 1, createdAt: -1 });
supportTicketSchema.index({ priority: 1, status: 1 });

/**
 * Auto-generate ticketId: TKT-000001, TKT-000002, ...
 */
supportTicketSchema.pre('validate', async function (next) {
  if (this.isNew && !this.ticketId) {
    const lastTicket = await mongoose.model('SupportTicket').findOne().sort({ createdAt: -1 }).select('ticketId').lean();
    let nextNum = 1;
    if (lastTicket && (lastTicket as any).ticketId) {
      const num = parseInt((lastTicket as any).ticketId.replace('TKT-', ''), 10);
      if (!isNaN(num)) nextNum = num + 1;
    }
    this.ticketId = `TKT-${String(nextNum).padStart(6, '0')}`;
  }
  next();
});

const SupportTicket: Model<ISupportTicket> = mongoose.model<ISupportTicket>('SupportTicket', supportTicketSchema);

export default SupportTicket;
