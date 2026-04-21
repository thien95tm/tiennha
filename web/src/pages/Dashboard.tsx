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
      // Lấy bill mới nhất của mỗi phòng (bill list không có filter "latest" nên fetch all rồi pick)
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
        <Link to="/bills/new" className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 text-sm">
          + Tạo hoá đơn
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {rooms.map(r => {
          const b = latestBills[r.id];
          return (
            <div key={r.id} className="bg-white rounded-lg shadow p-5">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-lg">{r.name}</h3>
                  <p className="text-sm text-gray-500">
                    {r.current_tenant_name ? `👤 ${r.current_tenant_name}` : 'Chưa có người thuê'}
                  </p>
                </div>
                <span className="text-xs px-2 py-1 bg-indigo-50 text-indigo-700 rounded">Tầng {r.floor}</span>
              </div>

              <div className="mt-4 space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Tiền phòng</span><span>{vnd(r.rent_amount)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Nước + rác</span><span>{vnd(r.water_fee)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Đơn giá điện</span><span>{vnd(r.electric_unit_price)}/số</span></div>
              </div>

              {b && (
                <div className="mt-4 pt-3 border-t">
                  <div className="text-xs text-gray-500 mb-1">Hoá đơn gần nhất ({monthLabel(b.month)})</div>
                  <div className="flex justify-between text-sm">
                    <span>Điện {b.electric_diff} số</span>
                    <span className="font-semibold text-indigo-600">{vnd(b.total)}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
