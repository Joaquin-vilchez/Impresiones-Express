import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type PrintType = 'offset' | 'digital' | 'gran_formato' | 'serigrafia';
export type Size = 'A4' | 'A3' | 'A2' | 'A1' | 'A0' | 'personalizado';
export type Material = 'papel_couche' | 'papel_bond' | 'vinilo' | 'lona' | 'cartulina';
export type Status = 'pendiente' | 'en_produccion' | 'completado';

export interface Order {
  id: string;
  client_name: string;
  print_type: PrintType;
  size: Size;
  quantity: number;
  material: Material;
  status: Status;
  predicted_hours: number | null;
  actual_hours: number | null;
  created_at: string;
  completed_at: string | null;
}

export interface NewOrder {
  client_name: string;
  print_type: PrintType;
  size: Size;
  quantity: number;
  material: Material;
}
