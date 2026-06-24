import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase, type Farmer, type Listing, type Order } from "@/lib/supabase";

export const Route = createFileRoute("/farmer")({
  head: () => ({ meta: [{ title: "Farmer — AgriConnect" }] }),
  component: FarmerPage,
});

function FarmerPage() {
  const [farmer, setFarmer] = useState<Farmer | null>(null);
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { data, error } = await supabase
      .from("farmers")
      .select("*")
      .eq("phone", phone.trim())
      .maybeSingle();
    setLoading(false);
    if (error) return setError(error.message);
    if (!data) return setError("No farmer found with that phone number.");
    setFarmer(data as Farmer);
  }

  if (farmer) return <FarmerDashboard farmer={farmer} onLogout={() => setFarmer(null)} />;

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
          <h1 className="text-2xl font-semibold mt-2">Farmer Login</h1>
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

type OrderWithJoins = Order & {
  buyers: { name: string } | null;
  listings: { crop_type: string } | null;
};

function FarmerDashboard({ farmer, onLogout }: { farmer: Farmer; onLogout: () => void }) {
  const [listings, setListings] = useState<Listing[]>([]);
  const [orders, setOrders] = useState<OrderWithJoins[]>([]);
  const [crop, setCrop] = useState("");
  const [qty, setQty] = useState("");
  const [price, setPrice] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function refresh() {
    const [l, o] = await Promise.all([
      supabase.from("listings").select("*").eq("farmer_id", farmer.id).order("id", { ascending: false }),
      supabase
        .from("orders")
        .select("*, buyers(name), listings(crop_type)")
        .eq("farmer_id", farmer.id)
        .order("id", { ascending: false }),
    ]);
    if (l.data) setListings(l.data as Listing[]);
    if (o.data) setOrders(o.data as OrderWithJoins[]);
  }

  useEffect(() => {
    refresh();
  }, [farmer.id]);

  async function createListing(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.from("listings").insert({
      farmer_id: farmer.id,
      crop_type: crop,
      quantity_kg: Number(qty),
      price_per_kg: Number(price),
      status: "active",
    });
    setSubmitting(false);
    if (error) return alert(error.message);
    setCrop("");
    setQty("");
    setPrice("");
    refresh();
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-semibold">Welcome, {farmer.name}</h1>
            <p className="text-sm text-muted-foreground">
              {farmer.village} · Trust score: {farmer.trust_score}
            </p>
          </div>
          <button onClick={onLogout} className="text-sm text-muted-foreground hover:underline">
            Logout
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        <section className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Create New Listing</h2>
          <form onSubmit={createListing} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <input
              required
              value={crop}
              onChange={(e) => setCrop(e.target.value)}
              placeholder="Crop type"
              className="px-3 py-2 border border-input rounded-md bg-background"
            />
            <input
              required
              type="number"
              min="1"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              placeholder="Quantity (kg)"
              className="px-3 py-2 border border-input rounded-md bg-background"
            />
            <input
              required
              type="number"
              min="0"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="Price/kg"
              className="px-3 py-2 border border-input rounded-md bg-background"
            />
            <button
              type="submit"
              disabled={submitting}
              className="bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90 disabled:opacity-50"
            >
              {submitting ? "Adding..." : "Add Listing"}
            </button>
          </form>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">My Listings</h2>
          {listings.length === 0 ? (
            <p className="text-sm text-muted-foreground">No listings yet.</p>
          ) : (
            <div className="space-y-2">
              {listings.map((l) => (
                <div
                  key={l.id}
                  className="bg-card border border-border rounded-md p-4 flex justify-between"
                >
                  <div>
                    <div className="font-medium">{l.crop_type}</div>
                    <div className="text-sm text-muted-foreground">
                      {l.quantity_kg} kg @ ₹{l.price_per_kg}/kg
                    </div>
                  </div>
                  <span className="text-xs px-2 py-1 rounded bg-secondary text-secondary-foreground self-start">
                    {l.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">My Orders</h2>
          {orders.length === 0 ? (
            <p className="text-sm text-muted-foreground">No orders yet.</p>
          ) : (
            <div className="space-y-2">
              {orders.map((o) => (
                <OrderCard key={o.id} order={o} onChanged={refresh} />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function statusClass(status: string) {
  switch (status) {
    case "placed":
      return "bg-yellow-100 text-yellow-900";
    case "confirmed":
      return "bg-blue-100 text-blue-900";
    case "delivered":
      return "bg-green-100 text-green-900";
    case "cancelled":
      return "bg-red-100 text-red-900";
    default:
      return "bg-secondary text-secondary-foreground";
  }
}

function OrderCard({ order, onChanged }: { order: OrderWithJoins; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);

  async function setStatus(status: string) {
    setBusy(true);
    const { error } = await supabase.from("orders").update({ status }).eq("id", order.id);
    if (error) {
      setBusy(false);
      return alert(error.message);
    }
    if (status === "cancelled") {
      const { error: lErr } = await supabase
        .from("listings")
        .update({ status: "active" })
        .eq("id", order.listing_id);
      if (lErr) {
        setBusy(false);
        return alert(lErr.message);
      }
    }
    setBusy(false);
    onChanged();
  }

  return (
    <div className="bg-card border border-border rounded-md p-4 flex flex-col sm:flex-row sm:justify-between gap-3">
      <div>
        <div className="font-medium">
          {order.listings?.crop_type ?? "—"} · {order.quantity_kg} kg
        </div>
        <div className="text-sm text-muted-foreground">
          Buyer: {order.buyers?.name ?? "—"} · Total: ₹{order.total_price}
        </div>
        <div className="mt-1 text-sm">
          Status:{" "}
          <span className={`text-xs px-2 py-0.5 rounded font-medium ${statusClass(order.status)}`}>
            {order.status}
          </span>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 sm:self-center">
        {order.status === "placed" && (
          <>
            <button
              onClick={() => setStatus("confirmed")}
              disabled={busy}
              className="text-sm px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              Accept Order
            </button>
            <button
              onClick={() => setStatus("cancelled")}
              disabled={busy}
              className="text-sm px-3 py-1.5 rounded-md border border-border hover:bg-accent disabled:opacity-50"
            >
              Decline Order
            </button>
          </>
        )}
        {order.status === "confirmed" && (
          <button
            onClick={() => setStatus("delivered")}
            disabled={busy}
            className="text-sm px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            Mark as Delivered
          </button>
        )}
      </div>
    </div>
  );
}

