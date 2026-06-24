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
  quantity_kg: number;
  total_price: number;
  status: string;
};
