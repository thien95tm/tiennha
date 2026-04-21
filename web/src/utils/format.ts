export const vnd = (n: number | null | undefined) =>
  n == null ? '-' : new Intl.NumberFormat('vi-VN').format(n) + 'đ';

export const monthLabel = (m: string) => {
  const [y, mm] = m.split('-');
  return `Tháng ${parseInt(mm, 10)}/${y}`;
};

export const currentMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

export const monthOptions = (from = '2024-09', to = currentMonth()) => {
  const out: string[] = [];
  let [y, m] = from.split('-').map(Number);
  const [ty, tm] = to.split('-').map(Number);
  while (y < ty || (y === ty && m <= tm)) {
    out.unshift(`${y}-${String(m).padStart(2, '0')}`);
    m++; if (m > 12) { m = 1; y++; }
  }
  return out;
};
