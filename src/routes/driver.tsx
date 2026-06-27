import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase, type Driver, type Order } from "@/lib/supabase";
import { useLang, LanguageSwitcher } from "@/lib/i18n";

export const Route = createFileRoute("/driver")({
  head: () => ({ meta: [{ title: "Driver — AgriConnect" }] }),
  component: DriverPage,
});

function DriverPage() {
  const { t } = useLang();
  const [driver, setDriver] = useState<Driver | null>(null);
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { data, error } = await supabase
      .from("drivers")
      .select("*")
      .eq("phone", phone.trim())
      .maybeSingle();
    setLoading(false);
    if (error) return setError(error.message);
    if (!data) return setError(t("noDriver"));
    setDriver(data as Driver);
  }

  if (driver) return <DriverDashboard driver={driver} onLogout={() => setDriver(null)} />;

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
          <h1 className="text-2xl font-semibold mt-2">{t("driverLogin")}</h1>
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

type PickupOrder = Order & {
  listings: { crop_type: string } | null;
  farmers: { name: string; village: string } | null;
  buyers: { name: string } | null;
};

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
    case "disputed":
      return "bg-orange-100 text-orange-900";
    default:
      return "bg-secondary text-secondary-foreground";
  }
}

function DriverDashboard({ driver, onLogout }: { driver: Driver; onLogout: () => void }) {
  const { t } = useLang();
  const [available, setAvailable] = useState<PickupOrder[]>([]);
  const [mine, setMine] = useState<PickupOrder[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [trust, setTrust] = useState<number>(driver.trust_score ?? 0);

  async function refresh() {
    const [a, m, me] = await Promise.all([
      supabase
        .from("orders")
        .select("*, listings(crop_type), farmers(name, village), buyers(name)")
        .eq("status", "confirmed")
        .is("driver_id", null)
        .order("id", { ascending: false }),
      supabase
        .from("orders")
        .select("*, listings(crop_type), farmers(name, village), buyers(name)")
        .eq("driver_id", driver.id)
        .order("id", { ascending: false }),
      supabase.from("drivers").select("trust_score").eq("id", driver.id).maybeSingle(),
    ]);
    if (a.data) setAvailable(a.data as PickupOrder[]);
    if (m.data) setMine(m.data as PickupOrder[]);
    if (me.data) setTrust((me.data.trust_score as number | null) ?? 0);
  }


  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 5000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [driver.id]);

  async function acceptPickup(orderId: string) {
    setBusy(orderId);
    const { error } = await supabase
      .from("orders")
      .update({ driver_id: driver.id })
      .eq("id", orderId);
    setBusy(null);
    if (error) return alert(error.message);
    refresh();
  }


  async function startDelivery(order: PickupOrder) {
    if (order.delivery_otp) {
      // OTP already generated; just refresh display
      refresh();
      return;
    }
    setBusy(order.id);
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const { error } = await supabase
      .from("orders")
      .update({ delivery_otp: otp })
      .eq("id", order.id);
    setBusy(null);
    if (error) return alert(error.message);
    refresh();
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center gap-3">
          <div>
            <h1 className="text-xl font-semibold">
              {t("welcome")}, {driver.name}
            </h1>
            <p className="text-sm text-muted-foreground">
              {driver.vehicle_type} · {driver.vehicle_reg_number} · {t("trustScore")}: {trust}
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

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-10">
        <section>
          <h2 className="text-lg font-semibold mb-4">{t("availablePickups")}</h2>
          {available.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("noAvailablePickups")}</p>
          ) : (
            <div className="space-y-2">
              {available.map((o) => (
                <div
                  key={o.id}
                  className="bg-card border border-border rounded-md p-4 flex flex-col sm:flex-row sm:justify-between gap-3"
                >
                  <div className="text-sm">
                    <div className="font-medium text-base">
                      {o.listings?.crop_type ?? "—"} · {o.quantity_kg} kg
                    </div>
                    <div className="text-muted-foreground">
                      {t("farmer")}: {o.farmers?.name ?? "—"} · {t("village")}: {o.farmers?.village ?? "—"}
                    </div>
                    <div className="text-muted-foreground">
                      {t("buyer")}: {o.buyers?.name ?? "—"}
                    </div>
                  </div>
                  <button
                    onClick={() => acceptPickup(o.id)}
                    disabled={busy === o.id}
                    className="sm:self-center bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
                  >
                    {busy === o.id ? "..." : t("acceptPickup")}
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-4">{t("myDeliveries")}</h2>
          {mine.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("noDeliveries")}</p>
          ) : (
            <div className="space-y-2">
              {mine.map((o) => (
                <div
                  key={o.id}
                  className="bg-card border border-border rounded-md p-4 flex flex-col sm:flex-row sm:justify-between gap-3"
                >
                  <div className="text-sm">
                    <div className="font-medium text-base">
                      {o.listings?.crop_type ?? "—"} · {o.quantity_kg} kg
                    </div>
                    <div className="text-muted-foreground">
                      {t("farmer")}: {o.farmers?.name ?? "—"} · {t("village")}: {o.farmers?.village ?? "—"}
                    </div>
                    <div className="text-muted-foreground">
                      {t("buyer")}: {o.buyers?.name ?? "—"}
                    </div>
                    <div className="mt-1">
                      {t("status")}:{" "}
                      <span
                        className={`text-xs px-2 py-0.5 rounded font-medium ${statusClass(o.status)}`}
                      >
                        {o.status}
                      </span>
                    </div>
                  </div>
                  {o.status === "confirmed" && !o.delivery_otp && (
                    <button
                      onClick={() => startDelivery(o)}
                      disabled={busy === o.id}
                      className="sm:self-center bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
                    >
                      {busy === o.id ? "..." : t("startDelivery")}
                    </button>
                  )}
                  {o.status === "confirmed" && o.delivery_otp && (
                    <div className="sm:self-center bg-yellow-50 border border-yellow-300 rounded-md px-4 py-3 text-center">
                      <div className="text-xs text-yellow-900 mb-1">{t("giveCodeToBuyer")}</div>
                      <div className="text-3xl font-bold tracking-widest text-yellow-900">
                        {o.delivery_otp}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
