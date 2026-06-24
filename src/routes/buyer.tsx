import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase, type Buyer, type Listing } from "@/lib/supabase";

export const Route = createFileRoute("/buyer")({
  head: () => ({ meta: [{ title: "Buyer — AgriConnect" }] }),
  component: BuyerPage,
});

function BuyerPage() {
  const [buyer, setBuyer] = useState<Buyer | null>(null);
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { data, error } = await supabase
      .from("buyers")
      .select("*")
      .eq("phone", phone.trim())
      .maybeSingle();
    setLoading(false);
    if (error) return setError(error.message);
    if (!data) return setError("No buyer found with that phone number.");
    setBuyer(data as Buyer);
  }

  if (buyer) return <Marketplace buyer={buyer} onLogout={() => setBuyer(null)} />;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <form
        onSubmit={login}
        className="w-full max-w-sm space-y-4 bg-card border border-border rounded-lg p-6"
      >
        <div>
          <Link to="/" className="text-sm text-muted-foreground hover:underline">
            ← Back
          </Link>
          <h1 className="text-2xl font-semibold mt-2">Buyer Login</h1>
          <p className="text-sm text-muted-foreground">Enter your phone number</p>
        </div>
        <input
          type="tel"
          required
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Phone number"
          className="w-full px-3 py-2 border border-input rounded-md bg-background"
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-primary text-primary-foreground rounded-md py-2 font-medium hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? "Looking up..." : "Continue"}
        </button>
      </form>
    </div>
  );
}

type ListingWithFarmer = Listing & {
  farmers: { name: string; village: string; trust_score: number } | null;
};

function Marketplace({ buyer, onLogout }: { buyer: Buyer; onLogout: () => void }) {
  const [listings, setListings] = useState<ListingWithFarmer[]>([]);
  const [qtys, setQtys] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  async function refresh() {
    const { data } = await supabase
      .from("listings")
      .select("*, farmers(name, village, trust_score)")
      .eq("status", "active")
      .order("id", { ascending: false });
    if (data) setListings(data as ListingWithFarmer[]);
  }

  useEffect(() => {
    refresh();
  }, []);

  async function order(l: ListingWithFarmer) {
    const q = Number(qtys[l.id] || 0);
    if (!q || q <= 0) return alert("Enter a quantity");
    if (q > l.quantity_kg) return alert(`Max available: ${l.quantity_kg} kg`);
    setBusy(l.id);
    const total = q * l.price_per_kg;
    const { error: oErr } = await supabase.from("orders").insert({
      buyer_id: buyer.id,
      farmer_id: l.farmer_id,
      listing_id: l.id,
      quantity_kg: q,
      total_price: total,
      status: "pending",
    });
    if (oErr) {
      setBusy(null);
      return alert(oErr.message);
    }
    const { error: uErr } = await supabase
      .from("listings")
      .update({ status: "sold" })
      .eq("id", l.id);
    setBusy(null);
    if (uErr) return alert(uErr.message);
    refresh();
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-semibold">Welcome, {buyer.name}</h1>
            <p className="text-sm text-muted-foreground">{buyer.business_type}</p>
          </div>
          <button onClick={onLogout} className="text-sm text-muted-foreground hover:underline">
            Logout
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <h2 className="text-lg font-semibold mb-4">Marketplace</h2>
        {listings.length === 0 ? (
          <p className="text-sm text-muted-foreground">No active listings.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {listings.map((l) => (
              <div key={l.id} className="bg-card border border-border rounded-lg p-4 space-y-3">
                <div>
                  <div className="text-lg font-semibold">{l.crop_type}</div>
                  <div className="text-sm text-muted-foreground">
                    {l.quantity_kg} kg available · ₹{l.price_per_kg}/kg
                  </div>
                </div>
                <div className="text-sm">
                  <div className="font-medium">{l.farmers?.name ?? "—"}</div>
                  <div className="text-muted-foreground">
                    {l.farmers?.village ?? "—"} · Trust: {l.farmers?.trust_score ?? "—"}
                  </div>
                </div>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="1"
                    max={l.quantity_kg}
                    placeholder="Qty (kg)"
                    value={qtys[l.id] ?? ""}
                    onChange={(e) => setQtys((s) => ({ ...s, [l.id]: e.target.value }))}
                    className="flex-1 px-3 py-2 border border-input rounded-md bg-background"
                  />
                  <button
                    onClick={() => order(l)}
                    disabled={busy === l.id}
                    className="bg-primary text-primary-foreground rounded-md px-4 font-medium hover:bg-primary/90 disabled:opacity-50"
                  >
                    {busy === l.id ? "..." : "Order Now"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
