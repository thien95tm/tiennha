export interface Room {
  id: number;
  code: string;
  name: string;
  floor: number;
  is_active: number;
  sort_order: number;
  current_tenant_id: number | null;
  current_tenant_name: string | null;
  tenant_since: string | null;
  rent_amount: number;
  water_fee: number;
  electric_unit_price: number;
  pricing_from: string;
}

export interface Tenant {
  id: number;
  name: string;
  phone: string | null;
  note: string | null;
  created_at: string;
}

export interface Assignment {
  id: number;
  room_id: number;
  tenant_id: number;
  start_date: string;
  end_date: string | null;
  note: string | null;
  tenant_name: string;
  room_name: string;
}

export interface Pricing {
  id: number;
  room_id: number;
  rent_amount: number;
  water_fee: number;
  electric_unit_price: number;
  effective_from: string;
  note: string | null;
}

export interface ExtraFee {
  id: number;
  bill_id: number;
  description: string;
  amount: number;
}

export interface Bill {
  id: number;
  room_id: number;
  tenant_id: number | null;
  month: string;
  electric_prev: number;
  electric_current: number;
  electric_unit_price: number;
  water_fee: number;
  rent_amount: number;
  note: string | null;
  room_name: string;
  room_code: string;
  tenant_name: string | null;
  electric_diff: number;
  electric_amount: number;
  extras: ExtraFee[];
  extras_total: number;
  total: number;
}

export interface BillSuggestion {
  electric_prev: number;
  pricing: { rent_amount: number; water_fee: number; electric_unit_price: number } | null;
  tenant: { id: number; name: string } | null;
}
