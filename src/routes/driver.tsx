import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase, type Driver, type Order } from "@/lib/supabase";
import { useLang, LanguageSwitcher } from "@/lib/i18n";
import { OtpLogin } from "@/components/OtpLogin";
import {
  PhoneFrame,
  TopBar,
  BottomNav,
  StatusPill,
  cropEmoji,
} from "@/components/AppShell";
import { Home, Wallet, User, LogOut, Star } from "lucide-react";

export const Route = createFileRoute("/driver")({
  head: () => ({ meta: [{ title: "Driver — Mitti & Market" }] }),
  component: DriverPage,
});

function DriverPage() {
  const { t } = useLang();
  const [driver, setDriver] = useState<Driver | null>(null);

  if (driver) return <DriverDashboard driver={driver} onLogout={() => setDriver(null)} />;

  return (
    <OtpLogin
      title={t("driverLogin")}
      onVerified={async (phone) => {
        const { data, error } = await supabase
          .from("drivers")
          .select("*")
          .eq("phone", phone)
          .maybeSingle();
        if (error) return error.message;
        if (!data) return "register";
        setDriver(data as Driver);
        return "ok";
      }}
      renderRegister={(phone) => (
        <DriverRegister phone={phone} onRegistered={(d) => setDriver(d)} />
      )}
    />
  );
}

function DriverRegister({
  phone,
  onRegistered,
}: {
  phone: string;
  onRegistered: (d: Driver) => void;
}) {
  const { t } = useLang();
  const [name, setName] = useState("");
  const [vehicleType, setVehicleType] = useState("");
  const [vehicleReg, setVehicleReg] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const { data, error: insErr } = await supabase
      .from("drivers")
      .insert({
        phone,
        name: name.trim(),
        vehicle_type: vehicleType.trim(),
        vehicle_reg_number: vehicleReg.trim(),
      })
      .select("*")
      .maybeSingle();
    setBusy(false);
    if (insErr || !data) return setError(insErr?.message ?? "Failed to register");
    onRegistered(data as Driver);
  }

  return (
    <form onSubmit={submit} className="space-y-4 card-soft p-6">
      <div>
        <h1 className="text-2xl font-extrabold">{t("registerTitle")}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t("registerHint")}</p>
        <p className="text-sm mt-2">
          {t("otpSentTo")}: <span className="font-semibold">{phone}</span>
        </p>
      </div>
      <input required value={name} onChange={(e) => setName(e.target.value)} placeholder={t("yourName")} className="input-app" />
      <input required value={vehicleType} onChange={(e) => setVehicleType(e.target.value)} placeholder={t("vehicleType")} className="input-app" />
      <input required value={vehicleReg} onChange={(e) => setVehicleReg(e.target.value)} placeholder={t("vehicleReg")} className="input-app" />
      {error && <p className="text-sm text-destructive">{error}</p>}
      <button type="submit" disabled={busy} className="btn-primary w-full">
        {busy ? t("registering") : t("registerBtn")}
      </button>
    </form>
  );
}

type PickupOrder = Order & {
  listings: { crop_type: string } | null;
  farmers: { name: string; village: string } | null;
  buyers: { name: string } | null;
};

function DriverDashboard({ driver, onLogout }: { driver: Driver; onLogout: () => void }) {
  const { t } = useLang();
  const [tab, setTab] = useState<"home" | "earnings" | "profile">("home");
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

  const earnings = useMemo(
    () =>
      mine
        .filter((o) => o.status === "delivered")
        .reduce((sum, o) => sum + Math.round(Number(o.total_price) * 0.1), 0),
    [mine],
  );

  return (
    <PhoneFrame>
      {tab === "home" && (
        <HomeTab
          driver={driver}
          trust={trust}
          available={available}
          mine={mine}
          busy={busy}
          onAccept={acceptPickup}
          onStart={startDelivery}
          onLogout={onLogout}
        />
      )}
      {tab === "earnings" && (
        <EarningsTab mine={mine} totalEarnings={earnings} />
      )}
      {tab === "profile" && (
        <ProfileTab driver={driver} trust={trust} onLogout={onLogout} />
      )}

      <BottomNav
        active={tab}
        onChange={(k) => setTab(k as typeof tab)}
        tabs={[
          { key: "home", label: "Home", icon: <Home className="h-5 w-5" /> },
          { key: "earnings", label: "Earnings", icon: <Wallet className="h-5 w-5" /> },
          { key: "profile", label: "Profile", icon: <User className="h-5 w-5" /> },
        ]}
      />
    </PhoneFrame>
  );
}

function HomeTab({
  driver,
  trust,
  available,
  mine,
  busy,
  onAccept,
  onStart,
  onLogout,
}: {
  driver: Driver;
  trust: number;
  available: PickupOrder[];
  mine: PickupOrder[];
  busy: string | null;
  onAccept: (id: string) => void;
  onStart: (o: PickupOrder) => void;
  onLogout: () => void;
}) {
  const { t } = useLang();
  const active = mine.filter((o) => o.status !== "delivered" && o.status !== "cancelled");
  return (
    <>
      <TopBar
        right={
          <button
            onClick={onLogout}
            aria-label="Logout"
            className="grid place-items-center h-10 w-10 rounded-full bg-card shadow-sm"
          >
            <LogOut className="h-5 w-5" />
          </button>
        }
      />
      <div className="px-5 space-y-4">
        {/* welcome */}
        <div className="rounded-3xl p-5 text-white bg-gradient-to-br from-primary to-emerald-700 shadow-md">
          <div className="text-lg font-bold">नमस्ते, {driver.name}! 🚚</div>
          <div className="text-sm text-white/85 mt-1">
            {driver.vehicle_type} · {driver.vehicle_reg_number}
          </div>
          <div className="mt-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/20 text-xs font-bold">
            ⭐ {t("trustScore")}: {trust}
          </div>
        </div>

        {/* Available pickups */}
        <section>
          <h2 className="text-base font-bold mb-2">{t("availablePickups")}</h2>
          {available.length === 0 ? (
            <div className="card-soft p-6 text-center">
              <div className="text-3xl">🕓</div>
              <p className="mt-2 text-sm text-muted-foreground">
                {t("noAvailablePickups")}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {available.map((o) => {
                const fee = Math.round(Number(o.total_price) * 0.1);
                return (
                  <div key={o.id} className="card-soft p-4">
                    <div className="flex items-start gap-3">
                      <div className="text-3xl">{cropEmoji(o.listings?.crop_type ?? "")}</div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold truncate">
                          {o.listings?.crop_type ?? "—"} · {o.quantity_kg}kg
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          📍 {o.farmers?.village ?? "—"} → {o.buyers?.name ?? "—"}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {t("farmer")}: {o.farmers?.name ?? "—"}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-[10px] text-muted-foreground font-semibold uppercase">
                          Earn
                        </div>
                        <div className="text-primary font-extrabold">₹{fee}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => onAccept(o.id)}
                      disabled={busy === o.id}
                      className="btn-primary w-full mt-3 py-2 text-sm"
                    >
                      {busy === o.id ? "..." : t("acceptPickup")}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Active deliveries */}
        <section>
          <h2 className="text-base font-bold mb-2">{t("myDeliveries")}</h2>
          {active.length === 0 ? (
            <div className="card-soft p-6 text-center text-sm text-muted-foreground">
              {t("noDeliveries")}
            </div>
          ) : (
            <div className="space-y-2">
              {active.map((o) => (
                <div key={o.id} className="card-soft p-4">
                  <div className="flex items-start gap-3">
                    <div className="text-3xl">{cropEmoji(o.listings?.crop_type ?? "")}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="font-bold truncate">
                          {o.listings?.crop_type ?? "—"} · {o.quantity_kg}kg
                        </div>
                        <StatusPill status={o.status} />
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {t("farmer")}: {o.farmers?.name ?? "—"} · {o.farmers?.village ?? "—"}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {t("buyer")}: {o.buyers?.name ?? "—"}
                      </div>
                    </div>
                  </div>

                  {o.status === "confirmed" && !o.delivery_otp && (
                    <button
                      onClick={() => onStart(o)}
                      disabled={busy === o.id}
                      className="btn-primary w-full mt-3 py-2 text-sm"
                    >
                      {busy === o.id ? "..." : t("startDelivery")}
                    </button>
                  )}
                  {o.status === "confirmed" && o.delivery_otp && (
                    <div className="mt-3 rounded-2xl bg-yellow-50 border border-yellow-300 p-3 text-center">
                      <div className="text-[11px] font-semibold text-yellow-900">
                        {t("giveCodeToBuyer")}
                      </div>
                      <div className="mt-1 text-3xl font-extrabold tracking-widest text-yellow-900">
                        {o.delivery_otp}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="flex justify-center pt-2">
          <LanguageSwitcher />
        </div>
      </div>
    </>
  );
}

function EarningsTab({
  mine,
  totalEarnings,
}: {
  mine: PickupOrder[];
  totalEarnings: number;
}) {
  const delivered = mine.filter((o) => o.status === "delivered");
  return (
    <>
      <TopBar title="Earnings" />
      <div className="px-5 space-y-4">
        <div className="rounded-3xl p-6 text-white bg-gradient-to-br from-primary to-emerald-700 shadow-md text-center">
          <div className="text-xs font-semibold text-white/80 uppercase">
            Total earned
          </div>
          <div className="mt-1 text-4xl font-extrabold">₹{totalEarnings}</div>
          <div className="mt-1 text-sm text-white/85">
            {delivered.length} deliveries completed
          </div>
        </div>

        <h2 className="text-base font-bold">Delivery history</h2>
        {delivered.length === 0 ? (
          <div className="card-soft p-6 text-center text-sm text-muted-foreground">
            No completed deliveries yet.
          </div>
        ) : (
          <div className="space-y-2">
            {delivered.map((o) => (
              <div key={o.id} className="card-soft p-4 flex items-center gap-3">
                <div className="text-2xl">{cropEmoji(o.listings?.crop_type ?? "")}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">
                    {o.listings?.crop_type ?? "—"} · {o.quantity_kg}kg
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {o.buyers?.name ?? "—"}
                  </div>
                </div>
                <div className="text-primary font-extrabold">
                  +₹{Math.round(Number(o.total_price) * 0.1)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function ProfileTab({
  driver,
  trust,
  onLogout,
}: {
  driver: Driver;
  trust: number;
  onLogout: () => void;
}) {
  const { t } = useLang();
  const stars = Math.round((trust / 100) * 5);
  return (
    <>
      <TopBar title="Profile" />
      <div className="px-5 space-y-4">
        <div className="card-soft p-6 text-center">
          <div className="mx-auto grid place-items-center h-20 w-20 rounded-full bg-primary-soft text-3xl font-extrabold text-primary">
            {driver.name.charAt(0).toUpperCase()}
          </div>
          <div className="mt-3 text-2xl font-extrabold">{driver.name}</div>
          <div className="mt-1 text-sm text-muted-foreground">
            {driver.vehicle_type} · {driver.vehicle_reg_number}
          </div>
          <div className="mt-3 inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary-soft text-primary text-xs font-bold">
            ⭐ {t("trustScore")}: {trust}
          </div>
          <div className="mt-2 flex items-center justify-center gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={`h-4 w-4 ${
                  i < stars ? "fill-yellow-400 text-yellow-400" : "text-border"
                }`}
              />
            ))}
          </div>
        </div>

        <div className="card-soft p-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Phone</span>
            <span className="font-semibold">{driver.phone}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Vehicle</span>
            <span className="font-semibold">{driver.vehicle_type}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Reg. Number</span>
            <span className="font-semibold">{driver.vehicle_reg_number}</span>
          </div>
        </div>

        <button
          onClick={onLogout}
          className="w-full card-soft p-4 flex items-center justify-center gap-2 text-destructive font-semibold"
        >
          <LogOut className="h-4 w-4" /> {t("logout")}
        </button>

        <div className="flex justify-center pt-2">
          <LanguageSwitcher />
        </div>
      </div>
    </>
  );
}
