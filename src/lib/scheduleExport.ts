// Client-side CSV / Markdown / clipboard exporters for content schedule

export type SchedulePiece = {
  piece_number: number;
  title: string;
  angle?: string;
  content_type?: string;
  target_channel: string;
  content_role?: string;
  format?: string;
  scheduled_date: string;       // YYYY-MM-DD
  recommended_time?: string;    // HH:mm
  key_message?: string;
  estimated_length?: string;
  pillar?: string;
  status?: string;
  pipeline_id?: string | null;
};

const DOW_VI = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

function dayOfWeek(dateStr: string) {
  const d = new Date(dateStr);
  return DOW_VI[d.getDay()] || '';
}

function csvEscape(s: any) {
  const str = s == null ? '' : String(s);
  if (/[",\n;]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

export function piecesToCSV(pieces: SchedulePiece[]): string {
  const header = ['Ngày', 'Thứ', 'Giờ', 'Kênh', 'Loại', 'Pillar', 'Tiêu đề', 'Key Message', 'Angle'];
  const rows = pieces
    .slice()
    .sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date))
    .map((p) =>
      [
        p.scheduled_date,
        dayOfWeek(p.scheduled_date),
        p.recommended_time || '',
        p.target_channel,
        p.content_type || p.format || '',
        p.pillar || '',
        p.title,
        p.key_message || '',
        p.angle || '',
      ]
        .map(csvEscape)
        .join(','),
    );
  // UTF-8 BOM for Excel
  return '\uFEFF' + [header.join(','), ...rows].join('\n');
}

export function piecesToMarkdown(pieces: SchedulePiece[]): string {
  if (pieces.length === 0) return '_Chưa có bài nào_';
  const sorted = pieces.slice().sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date));
  const firstDate = new Date(sorted[0].scheduled_date);
  firstDate.setHours(0, 0, 0, 0);
  type Group = { weekIdx: number; rows: SchedulePiece[] };
  const groups: Group[] = [];
  sorted.forEach((p) => {
    const d = new Date(p.scheduled_date);
    const diffDays = Math.floor((d.getTime() - firstDate.getTime()) / 86400000);
    const w = Math.floor(diffDays / 7);
    let g = groups.find((x) => x.weekIdx === w);
    if (!g) {
      g = { weekIdx: w, rows: [] };
      groups.push(g);
    }
    g.rows.push(p);
  });

  const out: string[] = [];
  groups.forEach((g) => {
    out.push(`\n### Tuần ${g.weekIdx + 1} (${g.rows.length} bài)\n`);
    out.push('| Ngày | Thứ | Giờ | Kênh | Loại | Pillar | Tiêu đề |');
    out.push('|------|-----|-----|------|------|--------|---------|');
    g.rows.forEach((p) => {
      out.push(
        `| ${p.scheduled_date} | ${dayOfWeek(p.scheduled_date)} | ${p.recommended_time || '—'} | ${p.target_channel} | ${p.content_type || p.format || '—'} | ${p.pillar || '—'} | ${escapeMd(p.title)} |`,
      );
    });
  });
  return out.join('\n');
}

function escapeMd(s: string) {
  return (s || '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

export function downloadFile(name: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
