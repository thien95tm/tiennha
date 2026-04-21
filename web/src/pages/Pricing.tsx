import { useEffect, useState, type FormEvent } from 'react';
import { createPricing, deletePricing, listPricing, listRooms } from '../api/endpoints';
import type { Pricing as PricingT, Room } from '../api/types';
import { vnd } from '../utils/format';

export default function Pricing() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [pricing, setPricing] = useState<PricingT[]>([]);
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({
    room_id: 0, rent_amount: 0, water_fee: 154000,
    electric_unit_price: 4000, effective_from: new Date().toISOString().slice(0, 10), note: ''
  });

  const reload = async () => {
    const [r, p] = await Promise.all([listRooms(), listPricing()]);
    setRooms(r); setPricing(p);
  };
  useEffect(() => { reload(); }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.room_id) return;
    await createPricing(form);
    setShow(false); reload();
  };

  const remove = async (id: number) => {
    if (!confirm('Xoá mốc giá này?')) return;
    await deletePricing(id); reload();
  };

  const byRoom = rooms.map(r => ({
    room: r,
    list: pricing.filter(p => p.room_id === r.id).sort((a, b) => b.effective_from.localeCompare(a.effective_from)),
  }));

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Bảng giá theo thời gian</h2>
        <button onClick={() => setShow(s => !s)} className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm">
          {show ? 'Đóng' : '+ Thêm mốc giá'}
        </button>
      </div>

      {show && (
        <form onSubmit={submit} className="bg-white p-4 rounded-lg shadow mb-4 grid md:grid-cols-6 gap-3">
          <select value={form.room_id} onChange={e => setForm({ ...form, room_id: +e.target.value })}
            className="px-3 py-2 border rounded">
            <option value={0}>-- Phòng --</option>
            {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
          <input type="number" placeholder="Tiền phòng" value={form.rent_amount}
            onChange={e => setForm({ ...form, rent_amount: +e.target.value })}
            className="px-3 py-2 border rounded" />
          <input type="number" placeholder="Nước+rác" value={form.water_fee}
            onChange={e => setForm({ ...form, water_fee: +e.target.value })}
            className="px-3 py-2 border rounded" />
          <input type="number" placeholder="Đơn giá điện" value={form.electric_unit_price}
            onChange={e => setForm({ ...form, electric_unit_price: +e.target.value })}
            className="px-3 py-2 border rounded" />
          <input type="date" value={form.effective_from}
            onChange={e => setForm({ ...form, effective_from: e.target.value })}
            className="px-3 py-2 border rounded" />
          <button className="bg-indigo-600 text-white rounded">Lưu</button>
        </form>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {byRoom.map(({ room, list }) => (
          <div key={room.id} className="bg-white rounded-lg shadow p-4">
            <h3 className="font-semibold mb-3">{room.name}</h3>
            <table className="w-full text-xs">
              <thead className="text-gray-500">
                <tr><th className="text-left">Từ ngày</th><th className="text-right">Phòng</th><th className="text-right">Nước</th><th className="text-right">Điện/số</th><th></th></tr>
              </thead>
              <tbody className="divide-y">
                {list.map((p, i) => (
                  <tr key={p.id} className={i === 0 ? 'font-medium' : 'text-gray-500'}>
                    <td className="py-1.5">{p.effective_from}</td>
                    <td className="text-right">{vnd(p.rent_amount)}</td>
                    <td className="text-right">{vnd(p.water_fee)}</td>
                    <td className="text-right">{vnd(p.electric_unit_price)}</td>
                    <td className="text-right">
                      <button onClick={() => remove(p.id)} className="text-red-600 hover:underline">×</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  );
}
