import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listBills, listRooms } from '../api/endpoints';
import type { Bill, Room } from '../api/types';
import { vnd, monthLabel } from '../utils/format';

export default function Dashboard() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [latestBills, setLatestBills] = useState<Record<number, Bill>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const rs = await listRooms();
      setRooms(rs);
      const bills = await listBills();
      const map: Record<number, Bill> = {};
      for (const b of bills) {
        if (!map[b.room_id] || b.month > map[b.room_id].month) map[b.room_id] = b;
      }
      setLatestBills(map);
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="text-gray-500">Đang tải...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Tổng quan 5 phòng</h2>
        <Link to="/bills/new/bulk" className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 text-sm">
          📷 Chụp 5 phòng
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-600">
            <tr>
              <th className="px-3 py-3">Phòng</th>
              <th className="px-3 py-3">Người thuê</th>
              <th className="px-3 py-3 text-right">Tiền phòng</th>
              <th className="hidden md:table-cell px-3 py-3 text-right">Nước + rác</th>
              <th className="hidden md:table-cell px-3 py-3 text-right">Điện/số</th>
              <th className="hidden lg:table-cell px-3 py-3">Bill gần nhất</th>
              <th className="hidden lg:table-cell px-3 py-3 text-right">Tổng tháng đó</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rooms.map(r => {
              const b = latestBills[r.id];
              return (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-3 py-3 font-medium">
                    <div>{r.name}</div>
                    <div className="text-xs text-gray-500">Tầng {r.floor}</div>
                  </td>
                  <td className="px-3 py-3">
                    {r.current_tenant_name ? (
                      <span>👤 {r.current_tenant_name}</span>
                    ) : (
                      <span className="text-gray-400 italic">-</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-right">{vnd(r.rent_amount)}</td>
                  <td className="hidden md:table-cell px-3 py-3 text-right">{vnd(r.water_fee)}</td>
                  <td className="hidden md:table-cell px-3 py-3 text-right">{vnd(r.electric_unit_price)}</td>
                  <td className="hidden lg:table-cell px-3 py-3">
                    {b ? (
                      <div>
                        <div>{monthLabel(b.month)}</div>
                        <div className="text-xs text-gray-500">Điện {b.electric_diff} số</div>
                      </div>
                    ) : <span className="text-gray-400">-</span>}
                  </td>
                  <td className="hidden lg:table-cell px-3 py-3 text-right font-semibold text-indigo-700">
                    {b ? vnd(b.total) : '-'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
