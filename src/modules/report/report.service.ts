import { Response } from 'express';
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import Transaction from '../../models/Transaction';
import RankReward from '../../models/RankReward';
import SwpPurchase from '../../models/SwpPurchase';
import RoiHistory from '../../models/RoiHistory';
import MultiLevelReward from '../../models/MultiLevelReward';

interface ReportQuery {
  fromDate?: string;
  toDate?: string;
  format: 'pdf' | 'excel';
}

function buildDateFilter(query: ReportQuery) {
  const filter: Record<string, unknown> = {};
  if (query.fromDate || query.toDate) {
    filter.createdAt = {} as Record<string, Date>;
    if (query.fromDate) (filter.createdAt as Record<string, Date>).$gte = new Date(query.fromDate);
    if (query.toDate) (filter.createdAt as Record<string, Date>).$lte = new Date(query.toDate);
  }
  return filter;
}

function formatDate(date: Date): string {
  return new Date(date).toISOString().split('T')[0];
}

function setDownloadHeaders(res: Response, filename: string, format: 'pdf' | 'excel') {
  const contentType = format === 'pdf'
    ? 'application/pdf'
    : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  const ext = format === 'pdf' ? 'pdf' : 'xlsx';

  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${filename}.${ext}"`);
}

// ─── PDF Helpers ───

function createPdf(res: Response, title: string, headers: string[], rows: string[][]) {
  const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });
  doc.pipe(res);

  // Title
  doc.fontSize(18).font('Helvetica-Bold').text(title, { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(9).font('Helvetica').text(`Generated: ${new Date().toISOString().split('T')[0]}`, { align: 'center' });
  doc.moveDown(1);

  // Table
  const colWidth = (doc.page.width - 80) / headers.length;
  const startX = 40;
  let y = doc.y;

  // Header row
  doc.font('Helvetica-Bold').fontSize(9);
  headers.forEach((h, i) => {
    doc.text(h, startX + i * colWidth, y, { width: colWidth, align: 'left' });
  });
  y += 18;
  doc.moveTo(startX, y).lineTo(doc.page.width - 40, y).stroke();
  y += 5;

  // Data rows
  doc.font('Helvetica').fontSize(8);
  for (const row of rows) {
    if (y > doc.page.height - 60) {
      doc.addPage();
      y = 40;
    }
    row.forEach((cell, i) => {
      doc.text(cell ?? '-', startX + i * colWidth, y, { width: colWidth, align: 'left' });
    });
    y += 16;
  }

  doc.end();
}

// ─── Excel Helper ───

async function createExcel(res: Response, title: string, headers: string[], rows: string[][]) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(title);

  // Header row
  const headerRow = sheet.addRow(headers);
  headerRow.font = { bold: true };
  headerRow.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
  });

  // Data rows
  for (const row of rows) {
    sheet.addRow(row);
  }

  // Auto-width columns
  sheet.columns.forEach((col) => {
    col.width = 18;
  });

  await workbook.xlsx.write(res);
}

// ─── Report Generators ───

class ReportService {
  async generateTransactions(res: Response, query: ReportQuery) {
    const filter = buildDateFilter(query);
    const transactions = await Transaction.find(filter)
      .populate('userId', 'name userId')
      .sort({ createdAt: -1 })
      .limit(500)
      .lean();

    const title = 'Recent Transactions';
    const headers = ['Date', 'User', 'User ID', 'Type', 'Amount', 'Status', 'Wallet Address'];
    const rows = transactions.map((t: any) => [
      formatDate(t.createdAt),
      t.userId?.name ?? '-',
      t.userId?.userId ?? '-',
      t.type,
      `$${t.amount}`,
      t.status,
      t.walletAddress ?? '-',
    ]);

    const filename = `transactions-${formatDate(new Date())}`;
    setDownloadHeaders(res, filename, query.format);

    if (query.format === 'pdf') {
      createPdf(res, title, headers, rows);
    } else {
      await createExcel(res, title, headers, rows);
      res.end();
    }
  }

  async generateRankRewards(res: Response, query: ReportQuery) {
    const filter = buildDateFilter(query);
    const rewards = await RankReward.find(filter)
      .populate('userId', 'name userId')
      .sort({ createdAt: -1 })
      .limit(500)
      .lean();

    const title = 'Rank Rewards';
    const headers = ['Date', 'User', 'User ID', 'Rank', 'Gross', 'Cutoff', 'Net'];
    const rows = rewards.map((r: any) => [
      formatDate(r.createdAt),
      r.userId?.name ?? '-',
      r.userId?.userId ?? '-',
      r.rankName,
      `$${r.grossAmount}`,
      `$${r.cutoffAmount}`,
      `$${r.netAmount}`,
    ]);

    const filename = `rank-rewards-${formatDate(new Date())}`;
    setDownloadHeaders(res, filename, query.format);

    if (query.format === 'pdf') {
      createPdf(res, title, headers, rows);
    } else {
      await createExcel(res, title, headers, rows);
      res.end();
    }
  }

  async generateSwpPackages(res: Response, query: ReportQuery) {
    const filter = buildDateFilter(query);
    const purchases = await SwpPurchase.find(filter)
      .populate('userId', 'name userId')
      .sort({ createdAt: -1 })
      .limit(500)
      .lean();

    const title = 'SWP Packages';
    const headers = ['Date', 'User', 'User ID', 'Amount', 'Type', 'SWP Before', 'SWP After'];
    const rows = purchases.map((p: any) => [
      formatDate(p.createdAt),
      p.userId?.name ?? '-',
      p.userId?.userId ?? '-',
      `$${p.amount}`,
      p.purchaseType,
      `${p.swpBefore}`,
      `${p.swpAfter}`,
    ]);

    const filename = `swp-packages-${formatDate(new Date())}`;
    setDownloadHeaders(res, filename, query.format);

    if (query.format === 'pdf') {
      createPdf(res, title, headers, rows);
    } else {
      await createExcel(res, title, headers, rows);
      res.end();
    }
  }

  async generateTradingCapitalProfit(res: Response, query: ReportQuery) {
    const filter = buildDateFilter(query);
    const history = await RoiHistory.find(filter)
      .populate('userId', 'name userId')
      .sort({ createdAt: -1 })
      .limit(500)
      .lean();

    const title = 'Trading Capital Profit';
    const headers = ['Date', 'User', 'User ID', 'Invested', 'ROI %', 'Days', 'ROI Earned', 'Capped'];
    const rows = history.map((r: any) => [
      formatDate(r.createdAt),
      r.userId?.name ?? '-',
      r.userId?.userId ?? '-',
      `$${r.totalInvestedAmount}`,
      `${r.roiPercentage}%`,
      `${r.daysCalculated}`,
      `$${r.roiEarned}`,
      r.roiCapped ? 'Yes' : 'No',
    ]);

    const filename = `trading-capital-profit-${formatDate(new Date())}`;
    setDownloadHeaders(res, filename, query.format);

    if (query.format === 'pdf') {
      createPdf(res, title, headers, rows);
    } else {
      await createExcel(res, title, headers, rows);
      res.end();
    }
  }

  async generateMultilevelRewards(res: Response, query: ReportQuery) {
    const filter = buildDateFilter(query);
    const rewards = await MultiLevelReward.find(filter)
      .populate('earnerId', 'name userId')
      .populate('fromUserId', 'name userId')
      .sort({ createdAt: -1 })
      .limit(500)
      .lean();

    const title = 'Multilevel Rewards';
    const headers = ['Date', 'Earner', 'Earner ID', 'From User', 'Level', 'ROI Amt', 'Gross', 'Cutoff', 'Net'];
    const rows = rewards.map((m: any) => [
      formatDate(m.createdAt),
      m.earnerId?.name ?? '-',
      m.earnerId?.userId ?? '-',
      m.fromUserId?.userId ?? '-',
      `${m.level}`,
      `$${m.roiAmount}`,
      `$${m.grossAmount}`,
      `$${m.cutoffAmount}`,
      `$${m.netAmount}`,
    ]);

    const filename = `multilevel-rewards-${formatDate(new Date())}`;
    setDownloadHeaders(res, filename, query.format);

    if (query.format === 'pdf') {
      createPdf(res, title, headers, rows);
    } else {
      await createExcel(res, title, headers, rows);
      res.end();
    }
  }

  async generateApprovedWithdrawals(res: Response, query: ReportQuery) {
    const filter = { ...buildDateFilter(query), status: 'completed', type: 'withdrawal' };
    const transactions = await Transaction.find(filter)
      .populate('userId', 'name userId')
      .populate('approvedBy', 'name userId')
      .sort({ createdAt: -1 })
      .limit(500)
      .lean();

    const title = 'Approved Withdrawals';
    const headers = ['Date', 'User', 'User ID', 'Amount', 'Wallet Address', 'Tx Hash', 'Approved By'];
    const rows = transactions.map((t: any) => [
      formatDate(t.updatedAt || t.createdAt),
      t.userId?.name ?? '-',
      t.userId?.userId ?? '-',
      `$${t.amount}`,
      t.walletAddress ?? '-',
      t.txHash ? `${t.txHash.slice(0, 10)}...` : '-',
      t.approvedBy?.userId ?? '-',
    ]);

    const filename = `approved-withdrawals-${formatDate(new Date())}`;
    setDownloadHeaders(res, filename, query.format);

    if (query.format === 'pdf') {
      createPdf(res, title, headers, rows);
    } else {
      await createExcel(res, title, headers, rows);
      res.end();
    }
  }
}

export default new ReportService();
