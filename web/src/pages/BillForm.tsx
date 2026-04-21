import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createBill, listRooms, ocrMeter, suggestBill } from '../api/endpoints';
import type { Room } from '../api/types';
import { currentMonth, vnd } from '../utils/format';

interface Extra { description: string; amount: number }

export default function BillForm() {
  const nav = useNavigate();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomId, setRoomId] = useState<number>(0);
  const [month, setMonth] = useState<string>(currentMonth());
  const [electricPrev, setElectricPrev] = useState(0);
  const [electricCurrent, setElectricCurrent] = useState(0);
  const [unitPrice, setUnitPrice] = useState(4000);
  const [waterFee, setWaterFee] = useState(0);
  const [rentAmount, setRentAmount] = useState(0);
  const [tenantName, setTenantName] = useState('');
  const [tenantId, setTenantId] = useState<number | null>(null);
  const [extras, setExtras] = useState<Extra[]>([]);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrPreview, setOcrPreview] = useState<string | null>(null);
  const [ocrConfidence, setOcrConfidence] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    listRooms().then(rs => {
      setRooms(rs);
      if (rs.length) setRoomId(rs[0].id);
    });
  }, []);

  // Auto fill khi đổi phòng/tháng
  useEffect(() => {
    if (!roomId || !month) return;
    suggestBill(roomId, month).then(s => {
      setElectricPrev(s.electric_prev);
      setElectricCurrent(s.electric_prev);
      if (s.pricing) {
        setUnitPrice(s.pricing.electric_unit_price);
        setWaterFee(s.pricing.water_fee);
        setRentAmount(s.pricing.rent_amount);
      }
      setTenantName(s.tenant?.name ?? '');
      setTenantId(s.tenant?.id ?? null);
    }).catch(() => {});
  }, [roomId, month]);

  const electricDiff = Math.max(0, electricCurrent - electricPrev);
  const electricAmount = electricDiff * unitPrice;
  const extrasTotal = extras.reduce((a, e) => a + (Number(e.amount) || 0), 0);
  const total = electricAmount + waterFee + rentAmount + extrasTotal;

  const addExtra = () => setExtras(es => [...es, { description: '', amount: 0 }]);
  const updExtra = (i: number, k: keyof Extra, v: any) => setExtras(es => es.map((e, idx) => idx === i ? { ...e, [k]: v } : e));
  const delExtra = (i: number) => setExtras(es => es.filter((_, idx) => idx !== i));

  const handleOcr = async (f: File) => {
    setOcrLoading(true); setErr(''); setOcrConfidence(null);
    setOcrPreview(URL.createObjectURL(f));
    try {
      const r = await ocrMeter(f);
      setElectricCurrent(r.reading);
      setOcrConfidence(r.confidence);
    } catch (e: any) {
      setErr(e.response?.data?.error ?? 'Lỗi OCR');
    } finally { setOcrLoading(false); }
  };

  const submit = async () => {
    setErr(''); setSaving(true);
    try {
      await createBill({
        room_id: roomId, month,
        electric_prev: electricPrev, electric_current: electricCurrent,
        electric_unit_price: unitPrice, water_fee: waterFee, rent_amount: rentAmount,
        tenant_id: tenantId ?? undefined, note: note || undefined,
        extras: extras.filter(e => e.description && e.amount),
      });
      nav('/bills');
    } catch (e: any) {
      setErr(e.response?.data?.error ?? 'Lỗi tạo hoá đơn');
    } finally { setSaving(false); }
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Tạo hoá đơn mới</h2>

      <div className="bg-white rounded-lg shadow p-6 grid md:grid-cols-2 gap-6">
        <div>
          <label className="block mb-3">
            <span className="text-sm text-gray-700">Phòng</span>
            <select value={roomId} onChange={e => setRoomId(+e.target.value)}
              className="mt-1 w-full px-3 py-2 border rounded-md">
              {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </label>

          <label className="block mb-3">
            <span className="text-sm text-gray-700">Tháng</span>
            <input type="month" value={month} onChange={e => setMonth(e.target.value)}
              className="mt-1 w-full px-3 py-2 border rounded-md" />
          </label>

          <label className="block mb-3">
            <span className="text-sm text-gray-700">Người thuê (gợi ý từ assignment)</span>
            <input value={tenantName} readOnly
              className="mt-1 w-full px-3 py-2 border rounded-md bg-gray-50 text-gray-600" />
          </label>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <label>
              <span className="text-sm text-gray-700">Số điện cũ</span>
              <input type="number" value={electricPrev} onChange={e => setElectricPrev(+e.target.value)}
                className="mt-1 w-full px-3 py-2 border rounded-md" />
            </label>
            <label>
              <span className="text-sm text-gray-700 flex justify-between">
                <span>Số điện mới</span>
                <button type="button" onClick={() => fileInput.current?.click()}
                  className="text-indigo-600 hover:text-indigo-800 text-xs">
                  📷 Chụp công tơ
                </button>
              </span>
              <input type="number" value={electricCurrent} onChange={e => setElectricCurrent(+e.target.value)}
                className="mt-1 w-full px-3 py-2 border rounded-md font-semibold" />
              <input ref={fileInput} type="file" accept="image/*" capture="environment"
                className="hidden"
                onChange={e => e.target.files?.[0] && handleOcr(e.target.files[0])} />
            </label>
          </div>

          {(ocrLoading || ocrPreview) && (
            <div className="mb-3 bg-blue-50 border border-blue-200 rounded p-2">
              <div className="flex items-center gap-2">
                {ocrPreview && <img src={ocrPreview} alt="meter" className="w-16 h-16 object-cover rounded" />}
                <div className="flex-1 text-sm">
                  {ocrLoading ? (
                    <span className="text-blue-700">🔍 Đang đọc chỉ số...</span>
                  ) : (
                    <>
                      <div>Gemini đọc được: <b>{electricCurrent}</b></div>
                      <div className="text-xs text-gray-600">
                        Độ tin cậy: <span className={
                          ocrConfidence === 'high' ? 'text-green-600' :
                          ocrConfidence === 'medium' ? 'text-yellow-600' : 'text-red-600'
                        }>{ocrConfidence}</span>
                        {' '}— kiểm tra lại và sửa nếu cần
                      </div>
                    </>
                  )}
                </div>
                {ocrPreview && !ocrLoading && (
                  <button type="button" onClick={() => { setOcrPreview(null); setOcrConfidence(null); }}
                    className="text-gray-400 hover:text-gray-600">×</button>
                )}
              </div>
            </div>
          )}

          <label className="block mb-3">
            <span className="text-sm text-gray-700">Đơn giá điện (đ/số)</span>
            <input type="number" value={unitPrice} onChange={e => setUnitPrice(+e.target.value)}
              className="mt-1 w-full px-3 py-2 border rounded-md" />
          </label>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <label>
              <span className="text-sm text-gray-700">Nước + rác</span>
              <input type="number" value={waterFee} onChange={e => setWaterFee(+e.target.value)}
                className="mt-1 w-full px-3 py-2 border rounded-md" />
            </label>
            <label>
              <span className="text-sm text-gray-700">Tiền phòng</span>
              <input type="number" value={rentAmount} onChange={e => setRentAmount(+e.target.value)}
                className="mt-1 w-full px-3 py-2 border rounded-md" />
            </label>
          </div>

          <label className="block mb-3">
            <span className="text-sm text-gray-700">Ghi chú</span>
            <textarea value={note} onChange={e => setNote(e.target.value)} rows={2}
              className="mt-1 w-full px-3 py-2 border rounded-md" />
          </label>
        </div>

        <div>
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <h3 className="font-semibold mb-3">Phí phát sinh</h3>
            {extras.map((e, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <input value={e.description} onChange={ev => updExtra(i, 'description', ev.target.value)}
                  placeholder="Mô tả (vd: thêm 1 người)"
                  className="flex-1 px-2 py-1.5 border rounded text-sm" />
                <input type="number" value={e.amount} onChange={ev => updExtra(i, 'amount', +ev.target.value)}
                  placeholder="Số tiền"
                  className="w-32 px-2 py-1.5 border rounded text-sm" />
                <button onClick={() => delExtra(i)} className="text-red-600 px-2">×</button>
              </div>
            ))}
            <button onClick={addExtra} className="text-sm text-indigo-600 hover:underline">+ Thêm phí</button>
          </div>

          <div className="bg-indigo-50 rounded-lg p-4 space-y-2">
            <h3 className="font-semibold mb-2">Tổng kết</h3>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Tiền điện ({electricDiff} số × {vnd(unitPrice)})</span>
              <span>{vnd(electricAmount)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Nước + rác</span><span>{vnd(waterFee)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Tiền phòng</span><span>{vnd(rentAmount)}</span>
            </div>
            {extrasTotal > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Phát sinh</span><span>{vnd(extrasTotal)}</span>
              </div>
            )}
            <div className="border-t pt-2 mt-2 flex justify-between font-semibold text-lg">
              <span>Tổng cộng</span>
              <span className="text-indigo-700">{vnd(total)}</span>
            </div>
          </div>

          {err && <div className="mt-3 text-sm text-red-600">{err}</div>}

          <div className="flex gap-3 mt-4">
            <button onClick={submit} disabled={saving}
              className="flex-1 bg-indigo-600 text-white py-2.5 rounded-md hover:bg-indigo-700 disabled:opacity-50">
              {saving ? 'Đang lưu...' : 'Lưu hoá đơn'}
            </button>
            <button onClick={() => nav(-1)} className="px-4 py-2.5 border rounded-md hover:bg-gray-50">Huỷ</button>
          </div>
        </div>
      </div>
    </div>
  );
}
