import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { ReportFilters } from '@/hooks/reports/useReportFilters';
import type { ReportOverviewData } from '@/hooks/reports/useReportOverview';
import type { EngagementReportData } from '@/hooks/reports/useEngagementReport';
import type { ContentReportData } from '@/hooks/reports/useContentReport';
import type { PublishingReportData } from '@/hooks/reports/usePublishingReport';
import type { ReportInsightsResult } from '@/hooks/reports/useReportInsights';
import { format } from 'date-fns';

interface BuildPdfArgs {
  filters: ReportFilters;
  workspaceName?: string;
  brandName?: string | null;
  overview?: ReportOverviewData;
  content?: ContentReportData;
  publishing?: PublishingReportData;
  engagement?: EngagementReportData;
  insights?: ReportInsightsResult;
}

export function buildReportPdf(args: BuildPdfArgs): jsPDF {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  let y = 48;

  // Header
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('Báo cáo Workspace', 40, y);
  y += 22;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(100);
  const rangeStr = `${format(args.filters.dateFrom, 'dd/MM/yyyy')} - ${format(args.filters.dateTo, 'dd/MM/yyyy')}`;
  doc.text(`Khoảng thời gian: ${rangeStr}`, 40, y);
  y += 14;
  if (args.workspaceName) {
    doc.text(`Workspace: ${args.workspaceName}`, 40, y);
    y += 14;
  }
  if (args.brandName) {
    doc.text(`Brand: ${args.brandName}`, 40, y);
    y += 14;
  }
  doc.text(`Xuất lúc: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 40, y);
  y += 22;
  doc.setTextColor(0);

  // KPI cards
  if (args.overview) {
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('Chỉ số chính', 40, y);
    y += 12;
    autoTable(doc, {
      startY: y,
      head: [['Nội dung tạo', 'Đã đăng', 'Thất bại', 'Engagement', 'Channel hoạt động']],
      body: [[
        String(args.overview.contentCreated),
        String(args.overview.publishedCount),
        String(args.overview.failedCount),
        String(args.overview.engagementTotal),
        String(args.overview.activeChannels),
      ]],
      theme: 'grid',
      styles: { fontSize: 10 },
      headStyles: { fillColor: [45, 45, 50], textColor: 255 },
    });
    y = (doc as any).lastAutoTable.finalY + 20;
  }

  // AI Summary
  if (args.insights?.summary) {
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('Tóm tắt AI', 40, y);
    y += 14;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(args.insights.summary, pageW - 80);
    doc.text(lines, 40, y);
    y += lines.length * 12 + 12;
  }

  // AI Insights
  if (args.insights?.insights?.length) {
    if (y > 720) { doc.addPage(); y = 48; }
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('AI Insights', 40, y);
    y += 8;
    autoTable(doc, {
      startY: y + 6,
      head: [['Loại', 'Tiêu đề', 'Mô tả', 'Hành động']],
      body: args.insights.insights.map((i) => [
        i.type.toUpperCase(),
        i.title,
        i.description,
        i.action ?? '-',
      ]),
      theme: 'striped',
      styles: { fontSize: 9, cellPadding: 6, valign: 'top' },
      columnStyles: { 0: { cellWidth: 60 }, 1: { cellWidth: 110 }, 2: { cellWidth: 200 }, 3: { cellWidth: 145 } },
      headStyles: { fillColor: [45, 45, 50], textColor: 255 },
    });
    y = (doc as any).lastAutoTable.finalY + 20;
  }

  // Content by channel
  if (args.content?.byChannel?.length) {
    if (y > 700) { doc.addPage(); y = 48; }
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('Nội dung theo channel', 40, y);
    autoTable(doc, {
      startY: y + 6,
      head: [['Channel', 'Số lượng']],
      body: args.content.byChannel.map((c) => [c.channel, String(c.count)]),
      theme: 'grid',
      styles: { fontSize: 10 },
      headStyles: { fillColor: [45, 45, 50], textColor: 255 },
    });
    y = (doc as any).lastAutoTable.finalY + 20;
  }

  // Publishing
  if (args.publishing?.byChannel?.length) {
    if (y > 700) { doc.addPage(); y = 48; }
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('Publishing theo channel', 40, y);
    autoTable(doc, {
      startY: y + 6,
      head: [['Channel', 'Đã đăng', 'Thất bại']],
      body: args.publishing.byChannel.map((c) => [c.channel, String(c.published), String(c.failed)]),
      theme: 'grid',
      styles: { fontSize: 10 },
      headStyles: { fillColor: [45, 45, 50], textColor: 255 },
    });
    y = (doc as any).lastAutoTable.finalY + 20;
  }

  // Engagement
  if (args.engagement?.byPlatform?.length) {
    if (y > 700) { doc.addPage(); y = 48; }
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('Engagement theo platform', 40, y);
    autoTable(doc, {
      startY: y + 6,
      head: [['Platform', 'Reach', 'Likes', 'Comments', 'Shares']],
      body: args.engagement.byPlatform.map((p) => [
        p.platform, String(p.reach), String(p.likes), String(p.comments ?? 0), String(p.shares ?? 0),
      ]),
      theme: 'grid',
      styles: { fontSize: 10 },
      headStyles: { fillColor: [45, 45, 50], textColor: 255 },
    });
    y = (doc as any).lastAutoTable.finalY + 20;
  }

  // Top posts
  if (args.engagement?.topPosts?.length) {
    if (y > 680) { doc.addPage(); y = 48; }
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('Top bài viết', 40, y);
    autoTable(doc, {
      startY: y + 6,
      head: [['Platform', 'Post ID', 'Reach', 'Likes', 'Comments', 'Shares']],
      body: args.engagement.topPosts.slice(0, 10).map((p) => [
        p.platform, p.post_id.slice(0, 24), String(p.reach), String(p.likes), String(p.comments), String(p.shares),
      ]),
      theme: 'striped',
      styles: { fontSize: 9 },
      headStyles: { fillColor: [45, 45, 50], textColor: 255 },
    });
  }

  // Footer
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Flowa - Trang ${i}/${pageCount}`, pageW - 80, doc.internal.pageSize.getHeight() - 20);
  }

  return doc;
}

export function downloadReportPdf(args: BuildPdfArgs, filename: string) {
  const doc = buildReportPdf(args);
  doc.save(filename);
}
