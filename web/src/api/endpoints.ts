import { api } from './client';
import type { Assignment, Bill, BillSuggestion, Pricing, Room, Tenant } from './types';

// Auth
export const login = (username: string, password: string) =>
  api.post<{ token: string; user: { id: number; username: string } }>('/auth/login', { username, password }).then(r => r.data);

export const me = () => api.get<{ id: number; username: string }>('/auth/me').then(r => r.data);

// Rooms
export const listRooms = () => api.get<Room[]>('/rooms').then(r => r.data);
export const updateRoom = (id: number, data: Partial<Room>) => api.put(`/rooms/${id}`, data).then(r => r.data);

// Tenants
export const listTenants = () => api.get<Tenant[]>('/tenants').then(r => r.data);
export const createTenant = (data: { name: string; phone?: string; note?: string }) =>
  api.post<{ id: number }>('/tenants', data).then(r => r.data);
export const updateTenant = (id: number, data: Partial<Tenant>) => api.put(`/tenants/${id}`, data).then(r => r.data);
export const deleteTenant = (id: number) => api.delete(`/tenants/${id}`).then(r => r.data);

// Assignments
export const listAssignments = (roomId?: number) =>
  api.get<Assignment[]>('/assignments', { params: roomId ? { room_id: roomId } : {} }).then(r => r.data);
export const createAssignment = (data: { room_id: number; tenant_id: number; start_date: string; note?: string }) =>
  api.post<{ id: number }>('/assignments', data).then(r => r.data);

// Pricing
export const listPricing = (roomId?: number) =>
  api.get<Pricing[]>('/pricing', { params: roomId ? { room_id: roomId } : {} }).then(r => r.data);
export const createPricing = (data: Omit<Pricing, 'id'>) =>
  api.post<{ id: number }>('/pricing', data).then(r => r.data);
export const deletePricing = (id: number) => api.delete(`/pricing/${id}`).then(r => r.data);

// Bills
export const listBillMonths = () => api.get<string[]>('/bills/months').then(r => r.data);
export const listBills = (params?: { month?: string; room_id?: number }) =>
  api.get<Bill[]>('/bills', { params }).then(r => r.data);
export const getBill = (id: number) => api.get<Bill>(`/bills/${id}`).then(r => r.data);
export const suggestBill = (roomId: number, month: string) =>
  api.get<BillSuggestion>('/bills/suggest', { params: { room_id: roomId, month } }).then(r => r.data);
export const createBill = (data: {
  room_id: number; month: string; electric_prev: number; electric_current: number;
  electric_unit_price?: number; water_fee?: number; rent_amount?: number;
  tenant_id?: number; note?: string;
  extras?: { description: string; amount: number }[];
}) => api.post<{ id: number }>('/bills', data).then(r => r.data);
export const updateBill = (id: number, data: Partial<Bill>) => api.put(`/bills/${id}`, data).then(r => r.data);
export const deleteBill = (id: number) => api.delete(`/bills/${id}`).then(r => r.data);
export const addExtra = (billId: number, data: { description: string; amount: number }) =>
  api.post<{ id: number }>(`/bills/${billId}/extras`, data).then(r => r.data);
export const deleteExtra = (id: number) => api.delete(`/bills/extras/${id}`).then(r => r.data);

// OCR
export const ocrMeter = (file: File) => {
  const fd = new FormData();
  fd.append('image', file);
  return api.post<{ reading: number; confidence: 'high' | 'medium' | 'low'; raw_text: string }>(
    '/ocr/meter', fd, { headers: { 'Content-Type': 'multipart/form-data' } }
  ).then(r => r.data);
};

export interface BulkOcrResult {
  index: number;
  reading: number | null;
  confidence: 'high' | 'medium' | 'low' | null;
  error: string | null;
  match: { room_id: number; room_name: string; room_code: string; prev: number; diff: number } | null;
}

export const ocrMeterBulk = (files: File[], month: string) => {
  const fd = new FormData();
  fd.append('month', month);
  files.forEach(f => fd.append('images[]', f));
  return api.post<{ results: BulkOcrResult[]; rooms: { id: number; name: string; code: string; prev: number }[] }>(
    '/ocr/meter/bulk', fd, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 180000 }
  ).then(r => r.data);
};

export const createBillsBulk = (month: string, items: Array<{
  room_id: number; electric_current: number; electric_prev?: number; note?: string;
  extras?: { description: string; amount: number }[];
}>) => api.post<{ created: Array<{ id: number; room_id: number }>; errors: string[] }>(
  '/bills/bulk', { month, items }
).then(r => r.data);
