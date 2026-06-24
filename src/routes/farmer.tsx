import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase, type Farmer, type Listing, type Order } from "@/lib/supabase";
import { useLang, LanguageSwitcher } from "@/lib/i18n";

export const Route = createFileRoute("/farmer")({
  head: () => ({ meta: [{ title: "Farmer — AgriConnect" }] }),
  component: FarmerPage,
});

function FarmerPage() {
  const { t } = useLang();
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
    if (!data) return setError(t("noFarmer"));
    setFarmer(data as Farmer);
  }

  if (farmer) return <FarmerDashboard farmer={farmer} onLogout={() => setFarmer(null)} />;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 relative">
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>
      <form
        onSubmit={login}
        className="w-full max-w-sm space-y-4 bg-card border border-border rounded-lg p-6"
      >
        <div>
          <Link to="/" className="text-sm text-muted-foreground hover:underline">
            ← {t("back")}
          </Link>
          <h1 className="text-2xl font-semibold mt-2">{t("farmerLogin")}</h1>
          <p className="text-sm text-muted-foreground">{t("enterPhone")}</p>
        </div>
        <input
          type="tel"
          required
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder={t("phonePlaceholder")}
          className="w-full px-3 py-2 border border-input rounded-md bg-background"
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-primary text-primary-foreground rounded-md py-2 font-medium hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? t("lookingUp") : t("continueBtn")}
        </button>
      </form>
    </div>
  );
}

type OrderWithJoins = Order & {
  buyers: { name: string } | null;
  listings: { crop_type: string } | null;
  drivers: { name: string; vehicle_reg_number: string } | null;
};

function FarmerDashboard({ farmer, onLogout }: { farmer: Farmer; onLogout: () => void }) {
  const { t } = useLang();
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
        .select("*, buyers(name), listings(crop_type), drivers(name, vehicle_reg_number)")
        .eq("farmer_id", farmer.id)
        .order("id", { ascending: false }),
    ]);
    if (l.data) setListings(l.data as Listing[]);
    if (o.data) setOrders(o.data as OrderWithJoins[]);
  }

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 5000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center gap-3">
          <div>
            <h1 className="text-xl font-semibold">
              {t("welcome")}, {farmer.name}
            </h1>
            <p className="text-sm text-muted-foreground">
              {farmer.village} · {t("trustScore")}: {farmer.trust_score}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <button onClick={onLogout} className="text-sm text-muted-foreground hover:underline">
              {t("logout")}
            </button>
            <LanguageSwitcher />
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        <section className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">{t("createListing")}</h2>
          <form onSubmit={createListing} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <input
              required
              value={crop}
              onChange={(e) => setCrop(e.target.value)}
              placeholder={t("cropType")}
              className="px-3 py-2 border border-input rounded-md bg-background"
            />
            <input
              required
              type="number"
              min="1"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              placeholder={t("quantityKg")}
              className="px-3 py-2 border border-input rounded-md bg-background"
            />
            <input
              required
              type="number"
              min="0"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder={t("pricePerKg")}
              className="px-3 py-2 border border-input rounded-md bg-background"
            />
            <button
              type="submit"
              disabled={submitting}
              className="bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90 disabled:opacity-50"
            >
              {submitting ? t("adding") : t("addListing")}
            </button>
          </form>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">{t("myListings")}</h2>
          {listings.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("noListings")}</p>
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
          <h2 className="text-lg font-semibold mb-3">{t("yourOrders")}</h2>
          {orders.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("noOrders")}</p>
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
  const { t } = useLang();
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
          {t("buyer")}: {order.buyers?.name ?? "—"} · {t("total")}: ₹{order.total_price}
        </div>
        {order.drivers && (
          <div className="text-sm text-muted-foreground">
            🚚 {t("driver")}: {order.drivers.name} · {t("vehicle")}: {order.drivers.vehicle_reg_number}
          </div>
        )}
        <div className="mt-1 text-sm">
          {t("status")}:{" "}
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
              {t("acceptOrder")}
            </button>
            <button
              onClick={() => setStatus("cancelled")}
              disabled={busy}
              className="text-sm px-3 py-1.5 rounded-md border border-border hover:bg-accent disabled:opacity-50"
            >
              {t("declineOrder")}
            </button>
          </>
        )}
        {order.status === "confirmed" && (
          <button
            onClick={() => setStatus("delivered")}
            disabled={busy}
            className="text-sm px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {t("markDelivered")}
          </button>
        )}
      </div>
    </div>
  );
}
