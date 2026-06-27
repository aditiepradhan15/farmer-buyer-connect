import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://wetsrdgdsbyiyxjpcexf.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndldHNyZGdkc2J5aXl4anBjZXhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIxMTg0ODAsImV4cCI6MjA5NzY5NDQ4MH0.L-sqUgaKVyEmpLwRNEmB_FJrudw_5OlECuX0fypy0OU";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

export type Farmer = {
  id: string;
  phone: string;
  name: string;
  village: string;
  trust_score: number;
};

export type Buyer = {
  id: string;
  phone: string;
  name: string;
  business_type: string;
};

export type Driver = {
  id: string;
  phone: string;
  name: string;
  vehicle_type: string;
  vehicle_reg_number: string;
  trust_score: number;
};

export type Listing = {
  id: string;
  farmer_id: string;
  crop_type: string;
  quantity_kg: number;
  price_per_kg: number;
  status: string;
};

export type Order = {
  id: string;
  buyer_id: string;
  farmer_id: string;
  listing_id: string;
  driver_id: string | null;
  quantity_kg: number;
  total_price: number;
  status: string;
  delivery_otp?: string | null;
  otp_failed_attempts?: number;
};

// Explicit column list for queries from the buyer's side.
// CRITICAL: must NEVER include `delivery_otp`. The buyer must never receive
// the OTP value from the database — only submit a guess and get match/no-match.
export const BUYER_ORDER_COLUMNS =
  "id, buyer_id, farmer_id, listing_id, driver_id, quantity_kg, total_price, status, otp_failed_attempts";

/**
 * Adjust a trust_score on farmers/drivers/buyers by `delta`, clamped at 0.
 * Read-modify-write; callers must ensure it fires exactly once per transition
 * (typically by gating on a status-conditional UPDATE returning a row).
 */
export async function adjustTrustScore(
  table: "farmers" | "drivers" | "buyers",
  id: string,
  delta: number,
): Promise<void> {
  const { data, error } = await supabase
    .from(table)
    .select("trust_score")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return;
  const current = (data.trust_score as number | null) ?? 0;
  const next = Math.max(0, current + delta);
  if (next === current) return;
  await supabase.from(table).update({ trust_score: next }).eq("id", id);
}

