import type { DashboardMetrics } from '../types/dashboard.types';

function cell(value: string | number | null | undefined) {
  const text = String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function row(...values: Array<string | number | null | undefined>) {
  return values.map(cell).join(',');
}

function slugify(name: string) {
  return (
    name
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/đ/gi, 'd')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'du-an'
  );
}

/** Xuất số liệu dashboard hiện tại ra file CSV (có BOM để Excel đọc đúng tiếng Việt). */
export function exportDashboardCsv(projectName: string, metrics: DashboardMetrics) {
  const lines: string[] = [
    row('Báo cáo dự án', projectName),
    row('Ngày xuất', new Date().toLocaleString('vi-VN')),
    '',
    row('TỔNG QUAN'),
    row('Tổng nhiệm vụ', metrics.totalTasks),
    row('Đã hoàn thành', metrics.completedTasks),
    row('Đang thực hiện', metrics.activeTasks ?? 0),
    row('Quá hạn', metrics.overdueTasks),
    row('Tiến độ (%)', metrics.progress),
    '',
    row('PHÂN BỔ TRẠNG THÁI'),
    row('Cột', 'Số nhiệm vụ', 'Tỷ lệ (%)'),
    ...metrics.statusDistribution.map((s) => row(s.columnName, s.count, s.percentage ?? '')),
    '',
    row('KHỐI LƯỢNG THEO THÀNH VIÊN'),
    row('Thành viên', 'Đang xử lý', 'Tổng', 'Hoàn thành', 'Tải cao'),
    ...metrics.memberWorkload.map((m) =>
      row(m.fullName, m.activeTaskCount, m.totalTaskCount ?? '', m.completedCount ?? '', m.isOverloaded ? 'Có' : ''),
    ),
  ];

  const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `bao-cao-${slugify(projectName)}-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
