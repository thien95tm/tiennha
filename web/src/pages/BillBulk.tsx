import { useMemo, useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { createBillsBulk, ocrMeterBulk, type BulkOcrResult } from '../api/endpoints';
import { currentMonth, vnd } from '../utils/format';

interface Row {
  file: File;
  preview: string;
  reading: number | null;
  confidence: 'high' | 'medium' | 'low' | null;
  error: string | null;
  roomId: number | null; // user-editable room assignment
  prev: number;
}

interface RoomInfo { id: number; name: string; code: string; prev: number }

export default function BillBulk() {
  const nav = useNavigate();
  const [month, setMonth] = useState(currentMonth());
  const [files, setFiles] = useState<File[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [rooms, setRooms] = useState<RoomInfo[]>([]);
  const [phase, setPhase] = useState<'pick' | 'processing' | 'review' | 'saving'>('pick');
  const [err, setErr] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  // Phát hiện conflict: 2+ ảnh gán cùng phòng
  const conflicts = useMemo(() => {
    const count: Record<number, number> = {};
    rows.forEach(r => { if (r.roomId) count[r.roomId] = (count[r.roomId] ?? 0) + 1; });
    return new Set(Object.entries(count).filter(([, c]) => c > 1).map(([rid]) => +rid));
  }, [rows]);

  const addFiles = (picked: FileList | File[]) => {
    const arr = Array.from(picked).filter(f => f.type.startsWith('image/'));
    setFiles(fs => [...fs, ...arr]);
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault(); setDragOver(false);
    if (e.dataTransfer?.files) addFiles(e.dataTransfer.files);
  };

  const onChangeFile = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addFiles(e.target.files);
    e.target.value = '';
  };

  const removeFile = (i: number) => setFiles(fs => fs.filter((_, idx) => idx !== i));

  const process = async () => {
    if (!files.length) return;
    setPhase('processing'); setErr('');
    try {
      const data = await ocrMeterBulk(files, month);
      setRooms(data.rooms);
      const nextRows: Row[] = data.results.map((r: BulkOcrResult, idx) => ({
        file: files[idx],
        preview: URL.createObjectURL(files[idx]),
        reading: r.reading,
        confidence: r.confidence,
        error: r.error,
        roomId: r.match?.room_id ?? null,
        prev: r.match?.prev ?? 0,
      }));
      setRows(nextRows);
      setPhase('review');
    } catch (e: any) {
      setErr(e.response?.data?.error ?? 'Lỗi OCR');
      setPhase('pick');
    }
  };

  const updateRow = (i: number, patch: Partial<Row>) => {
    setRows(rs => rs.map((r, idx) => {
      if (idx !== i) return r;
      const merged = { ...r, ...patch };
      // Cập nhật prev theo phòng chọn
      if (patch.roomId !== undefined) {
        const room = rooms.find(ro => ro.id === patch.roomId);
        merged.prev = room?.prev ?? 0;
      }
      return merged;
    }));
  };

  const removeRow = (i: number) => {
    setRows(rs => rs.filter((_, idx) => idx !== i));
    setFiles(fs => fs.filter((_, idx) => idx !== i));
  };

  const canSave = rows.length > 0 &&
    rows.every(r => r.reading !== null && r.roomId !== null) &&
    conflicts.size === 0;

  const save = async () => {
    setPhase('saving'); setErr('');
    try {
      const res = await createBillsBulk(month,
        rows.filter(r => r.reading !== null && r.roomId !== null)
            .map(r => ({ room_id: r.roomId!, electric_current: r.reading!, electric_prev: r.prev }))
      );
      if (res.errors.length) {
        setErr('Một số bill lỗi: ' + res.errors.join('; '));
        setPhase('review'); return;
      }
      alert(`Đã tạo ${res.created.length} hoá đơn cho tháng ${month}`);
      nav('/bills');
    } catch (e: any) {
      setErr(e.response?.data?.error ?? 'Lỗi lưu');
      setPhase('review');
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Tạo hoá đơn hàng loạt (chụp 5 công tơ)</h2>
        <button onClick={() => nav('/bills/new')} className="text-sm text-gray-600 hover:underline">
          ← Chuyển sang tạo từng phòng
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-4 mb-4 flex items-center gap-3">
        <label className="text-sm text-gray-700">Tháng:</label>
        <input type="month" value={month} onChange={e => setMonth(e.target.value)}
          disabled={phase !== 'pick'}
          className="px-3 py-1.5 border rounded-md" />
        <span className="text-sm text-gray-500 ml-auto">
          Chỉ số cũ so sánh với bill gần nhất của mỗi phòng
        </span>
      </div>

      {phase === 'pick' && (
        <>
          <div
            onDrop={onDrop}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onClick={() => fileInput.current?.click()}
            className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition ${
              dragOver ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 bg-white hover:border-gray-400'
            }`}
          >
            <div className="text-4xl mb-2">📷</div>
            <div className="text-gray-700 font-medium">Kéo thả ảnh công tơ vào đây</div>
            <div className="text-sm text-gray-500 mt-1">hoặc click để chọn nhiều ảnh</div>
            <input ref={fileInput} type="file" accept="image/*" multiple capture="environment"
              className="hidden" onChange={onChangeFile} />
          </div>

          {files.length > 0 && (
            <div className="mt-4 bg-white rounded-lg shadow p-4">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-semibold">{files.length} ảnh đã chọn</h3>
                <button onClick={process}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700">
                  🔍 Đọc chỉ số từ ảnh
                </button>
              </div>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                {files.map((f, i) => (
                  <div key={i} className="relative">
                    <img src={URL.createObjectURL(f)} alt=""
                      className="w-full aspect-square object-cover rounded" />
                    <button onClick={() => removeFile(i)}
                      className="absolute top-1 right-1 bg-red-500 text-white w-6 h-6 rounded-full text-xs">×</button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {phase === 'processing' && (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <div className="text-4xl mb-3 animate-pulse">🔍</div>
          <div className="text-gray-700">Đang đọc {files.length} ảnh công tơ...</div>
          <div className="text-sm text-gray-500 mt-1">Có thể mất 30-90 giây do giới hạn tốc độ của Gemini free tier</div>
        </div>
      )}

      {(phase === 'review' || phase === 'saving') && (
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="p-3">Ảnh</th>
                <th className="p-3">Số đọc được</th>
                <th className="p-3">Phòng (auto-match)</th>
                <th className="p-3 text-right">Số cũ</th>
                <th className="p-3 text-right">Tăng</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((r, i) => {
                const diff = (r.reading ?? 0) - r.prev;
                const conflict = r.roomId && conflicts.has(r.roomId);
                return (
                  <tr key={i} className={conflict ? 'bg-red-50' : ''}>
                    <td className="p-3">
                      <img src={r.preview} alt="" className="w-20 h-20 object-cover rounded" />
                    </td>
                    <td className="p-3">
                      {r.error ? (
                        <span className="text-red-600 text-xs">❌ {r.error}</span>
                      ) : (
                        <div>
                          <input type="number" value={r.reading ?? ''}
                            onChange={e => updateRow(i, { reading: e.target.value ? +e.target.value : null })}
                            className="w-24 px-2 py-1 border rounded font-semibold" />
                          <div className="text-xs mt-1">
                            <span className={
                              r.confidence === 'high' ? 'text-green-600' :
                              r.confidence === 'medium' ? 'text-yellow-600' : 'text-red-600'
                            }>● {r.confidence}</span>
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="p-3">
                      <select value={r.roomId ?? 0}
                        onChange={e => updateRow(i, { roomId: +e.target.value || null })}
                        className={`px-2 py-1 border rounded ${conflict ? 'border-red-400' : ''}`}>
                        <option value={0}>-- Chọn phòng --</option>
                        {rooms.map(ro => (
                          <option key={ro.id} value={ro.id}>{ro.name} (cũ: {ro.prev})</option>
                        ))}
                      </select>
                      {conflict && <div className="text-xs text-red-600 mt-1">⚠ Trùng phòng với ảnh khác</div>}
                    </td>
                    <td className="p-3 text-right text-gray-600">{r.prev}</td>
                    <td className="p-3 text-right">
                      {r.reading !== null && (
                        <span className={diff < 0 ? 'text-red-600' : diff > 300 ? 'text-yellow-600' : 'text-green-600'}>
                          {diff > 0 ? `+${diff}` : diff} số
                          {diff > 0 && <div className="text-xs text-gray-500">{vnd(diff * 4000)}</div>}
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      <button onClick={() => removeRow(i)} className="text-red-600 text-xs hover:underline">Xoá</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {err && <div className="p-3 text-sm text-red-600 border-t">{err}</div>}

          <div className="p-4 border-t bg-gray-50 flex items-center gap-3">
            <button onClick={() => { setPhase('pick'); setRows([]); }}
              className="px-4 py-2 border rounded-md hover:bg-white">← Chọn ảnh khác</button>
            <div className="ml-auto flex items-center gap-3">
              {conflicts.size > 0 && (
                <span className="text-sm text-red-600">⚠ Có phòng bị gán trùng, sửa trước khi lưu</span>
              )}
              <button onClick={save} disabled={!canSave || phase === 'saving'}
                className="bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50">
                {phase === 'saving' ? 'Đang lưu...' : `💾 Lưu ${rows.filter(r => r.reading && r.roomId).length} hoá đơn`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
