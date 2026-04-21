import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { deleteBill, listBillMonths, listBills } from '../api/endpoints';
import type { Bill } from '../api/types';
import { monthLabel, vnd } from '../utils/format';

export default function Bills() {
  const [months, setMonths] = useState<string[]>([]);
  const [month, setMonth] = useState<string>('');
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listBillMonths().then(ms => {
      setMonths(ms);
      if (ms.length) setMonth(ms[0]);
    });
  }, []);

  useEffect(() => {
    if (!month) return;
    setLoading(true);
    listBills({ month }).then(setBills).finally(() => setLoading(false));
  }, [month]);

  const sum = useMemo(() => bills.reduce((a, b) => a + b.total, 0), [bills]);

  const remove = async (id: number) => {
    if (!confirm('Xoá hoá đơn này?')) return;
    await deleteBill(id);
    setBills(bs => bs.filter(b => b.id !== id));
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Hoá đơn theo tháng</h2>
        <Link to="/bills/new" className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 text-sm">
          + Tạo hoá đơn
        </Link>
      </div>

      <div className="bg-white p-4 rounded-lg shadow mb-4 flex items-center gap-3">
        <label className="text-sm text-gray-700">Chọn tháng:</label>
        <select value={month} onChange={e => setMonth(e.target.value)}
          className="px-3 py-1.5 border rounded-md">
          {months.map(m => <option key={m} value={m}>{monthLabel(m)}</option>)}
        </select>
        <div className="ml-auto text-sm text-gray-500">
          Tổng tháng: <span className="font-semibold text-indigo-700">{vnd(sum)}</span>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Đang tải...</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr className="text-gray-600">
                <th className="px-4 py-3">Phòng</th>
                <th className="px-4 py-3">Người thuê</th>
                <th className="px-4 py-3 text-right">Điện cũ → mới</th>
                <th className="px-4 py-3 text-right">Tiền điện</th>
                <th className="px-4 py-3 text-right">Nước+rác</th>
                <th className="px-4 py-3 text-right">Tiền phòng</th>
                <th className="px-4 py-3 text-right">Phát sinh</th>
                <th className="px-4 py-3 text-right">Tổng</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {bills.map(b => (
                <tr key={b.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{b.room_name}</td>
                  <td className="px-4 py-3 text-gray-600">{b.tenant_name ?? '-'}</td>
                  <td className="px-4 py-3 text-right text-gray-600">
                    {b.electric_prev} → {b.electric_current}
                    <span className="text-xs text-gray-400 ml-1">({b.electric_diff} số)</span>
                  </td>
                  <td className="px-4 py-3 text-right">{vnd(b.electric_amount)}</td>
                  <td className="px-4 py-3 text-right">{vnd(b.water_fee)}</td>
                  <td className="px-4 py-3 text-right">{vnd(b.rent_amount)}</td>
                  <td className="px-4 py-3 text-right">{b.extras_total ? vnd(b.extras_total) : '-'}</td>
                  <td className="px-4 py-3 text-right font-semibold text-indigo-700">{vnd(b.total)}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => remove(b.id)} className="text-red-600 hover:underline text-xs">Xoá</button>
                  </td>
                </tr>
              ))}
              {bills.length === 0 && (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-500">Chưa có hoá đơn nào tháng này</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
