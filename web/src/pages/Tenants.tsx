import { useEffect, useState, type FormEvent } from 'react';
import { createAssignment, createTenant, deleteTenant, listAssignments, listRooms, listTenants } from '../api/endpoints';
import type { Assignment, Room, Tenant } from '../api/types';

export default function Tenants() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [assigns, setAssigns] = useState<Assignment[]>([]);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [showAssign, setShowAssign] = useState(false);
  const [aRoomId, setARoomId] = useState(0);
  const [aTenantId, setATenantId] = useState(0);
  const [aStart, setAStart] = useState(new Date().toISOString().slice(0, 10));

  const reload = async () => {
    const [t, r, a] = await Promise.all([listTenants(), listRooms(), listAssignments()]);
    setTenants(t); setRooms(r); setAssigns(a);
  };
  useEffect(() => { reload(); }, []);

  const submitTenant = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await createTenant({ name: name.trim(), phone: phone || undefined });
    setName(''); setPhone(''); reload();
  };

  const submitAssign = async (e: FormEvent) => {
    e.preventDefault();
    if (!aRoomId || !aTenantId || !aStart) return;
    await createAssignment({ room_id: aRoomId, tenant_id: aTenantId, start_date: aStart });
    setShowAssign(false); reload();
  };

  const remove = async (id: number) => {
    if (!confirm('Xoá người thuê này?')) return;
    try { await deleteTenant(id); reload(); }
    catch (e: any) { alert(e.response?.data?.error ?? 'Lỗi xoá'); }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Người thuê</h2>
        <button onClick={() => setShowAssign(s => !s)} className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm">
          {showAssign ? 'Đóng' : '+ Đổi/gán phòng'}
        </button>
      </div>

      {showAssign && (
        <form onSubmit={submitAssign} className="bg-white p-4 rounded-lg shadow mb-4 grid md:grid-cols-4 gap-3">
          <select value={aRoomId} onChange={e => setARoomId(+e.target.value)} className="px-3 py-2 border rounded">
            <option value={0}>-- Chọn phòng --</option>
            {rooms.map(r => <option key={r.id} value={r.id}>{r.name} (đang: {r.current_tenant_name ?? '-'})</option>)}
          </select>
          <select value={aTenantId} onChange={e => setATenantId(+e.target.value)} className="px-3 py-2 border rounded">
            <option value={0}>-- Chọn người --</option>
            {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <input type="date" value={aStart} onChange={e => setAStart(e.target.value)} className="px-3 py-2 border rounded" />
          <button className="bg-indigo-600 text-white rounded">Lưu</button>
        </form>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="font-semibold mb-3">Danh sách người thuê</h3>
          <form onSubmit={submitTenant} className="flex gap-2 mb-3">
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Tên..."
              className="flex-1 px-3 py-2 border rounded" />
            <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="SĐT (tuỳ chọn)"
              className="w-32 px-3 py-2 border rounded" />
            <button className="bg-indigo-600 text-white px-3 rounded text-sm">+ Thêm</button>
          </form>

          <ul className="divide-y">
            {tenants.map(t => (
              <li key={t.id} className="py-2 flex justify-between items-center">
                <div>
                  <div className="font-medium">{t.name}</div>
                  {t.phone && <div className="text-xs text-gray-500">{t.phone}</div>}
                </div>
                <button onClick={() => remove(t.id)} className="text-red-600 text-xs hover:underline">Xoá</button>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="font-semibold mb-3">Lịch sử thuê phòng</h3>
          <ul className="divide-y text-sm">
            {assigns.map(a => (
              <li key={a.id} className="py-2">
                <div className="flex justify-between">
                  <span><b>{a.tenant_name}</b> @ {a.room_name}</span>
                  {!a.end_date && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">đang ở</span>}
                </div>
                <div className="text-xs text-gray-500">{a.start_date} → {a.end_date ?? 'nay'}</div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
