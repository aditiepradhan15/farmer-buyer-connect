import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  supabase,
  type Buyer,
  type Listing,
  type Order,
  BUYER_ORDER_COLUMNS,
  adjustTrustScore,
} from "@/lib/supabase";
import { useLang, LanguageSwitcher } from "@/lib/i18n";
import { OtpLogin } from "@/components/OtpLogin";
import {
  PhoneFrame,
  TopBar,
  BottomNav,
  StatusPill,
  cropEmoji,
  OrderTracker,
} from "@/components/AppShell";
import { Home, ClipboardList, User, Search, MapPin, LogOut, Star } from "lucide-react";

export const Route = createFileRoute("/buyer")({
  head: () => ({ meta: [{ title: "Buyer — Mitti & Market" }] }),
  component: BuyerPage,
});

function BuyerPage() {
  const { t } = useLang();
  const [buyer, setBuyer] = useState<Buyer | null>(null);

  if (buyer) return <BuyerDashboard buyer={buyer} onLogout={() => setBuyer(null)} />;

  return (
    <OtpLogin
      title={t("buyerLogin")}
      onVerified={async (phone) => {
        const { data, error } = await supabase
          .from("buyers")
          .select("*")
          .eq("phone", phone)
          .maybeSingle();
        if (error) return error.message;
        if (!data) return "register";
        setBuyer(data as Buyer);
        return "ok";
      }}
      renderRegister={(phone) => (
        <BuyerRegister phone={phone} onRegistered={(b) => setBuyer(b)} />
      )}
    />
  );
}

function BuyerRegister({
  phone,
  onRegistered,
}: {
  phone: string;
  onRegistered: (b: Buyer) => void;
}) {
  const { t } = useLang();
  const [name, setName] = useState("");
  const [businessType, setBusinessType] = useState("household");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const { data, error: insErr } = await supabase
      .from("buyers")
      .insert({ phone, name: name.trim(), business_type: businessType })
      .select("*")
      .maybeSingle();
    setBusy(false);
    if (insErr || !data) return setError(insErr?.message ?? "Failed to register");
    onRegistered(data as Buyer);
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
      <input
        required
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={t("yourName")}
        className="input-app"
      />
      <select
        required
        value={businessType}
        onChange={(e) => setBusinessType(e.target.value)}
        className="input-app"
      >
        <option value="household">{t("businessHousehold")}</option>
        <option value="restaurant">{t("businessRestaurant")}</option>
        <option value="hotel">{t("businessHotel")}</option>
        <option value="supermarket">{t("businessSupermarket")}</option>
      </select>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <button type="submit" disabled={busy} className="btn-primary w-full">
        {busy ? t("registering") : t("registerBtn")}
      </button>
    </form>
  );
}

type ListingWithFarmer = Listing & {
  farmers: { name: string; village: string; trust_score: number } | null;
};

type BuyerOrder = Order & {
  listings: { crop_type: string } | null;
  farmers: { name: string } | null;
  drivers: { name: string; vehicle_reg_number: string } | null;
};

const FILTERS = ["All", "Vegetables", "Fruits", "Grains", "Leafy"] as const;

function filterLabel(f: (typeof FILTERS)[number], t: ReturnType<typeof useLang>["t"]): string {
  if (f === "All") return t("filterAll");
  if (f === "Vegetables") return t("filterVegetables");
  if (f === "Fruits") return t("filterFruits");
  if (f === "Grains") return t("filterGrains");
  return t("filterLeafy");
}

function categoryOf(crop: string): (typeof FILTERS)[number] {
  const c = (crop || "").toLowerCase();
  if (/(leaf|spinach|methi|coriander)/.test(c)) return "Leafy";
  if (/(mango|grape|apple|orange|banana|papaya)/.test(c)) return "Fruits";
  if (/(wheat|rice|corn|maize|soy|millet|bajra|jowar)/.test(c)) return "Grains";
  if (/(onion|tomato|potato|garlic|carrot|chilli|chili|pepper|okra|brinjal|cabbage|cauliflower)/.test(c))
    return "Vegetables";
  return "All";
}

function BuyerDashboard({ buyer, onLogout }: { buyer: Buyer; onLogout: () => void }) {
  const { t } = useLang();
  const [tab, setTab] = useState<"home" | "orders" | "profile">("home");
  const [listings, setListings] = useState<ListingWithFarmer[]>([]);
  const [myOrders, setMyOrders] = useState<BuyerOrder[]>([]);
  const [otpReady, setOtpReady] = useState<Record<string, boolean>>({});
  const [myTrust, setMyTrust] = useState<number>(buyer.trust_score ?? 0);

  // Confirmation UI state — kept identical to original logic.
  const [codes, setCodes] = useState<Record<string, string>>({});
  const [otpMsg, setOtpMsg] = useState<Record<string, { kind: "error" | "info"; text: string }>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [qtys, setQtys] = useState<Record<string, string>>({});

  async function refresh() {
    const orderCols = `${BUYER_ORDER_COLUMNS}, listings(crop_type), farmers(name), drivers(name, vehicle_reg_number)`;
    const [l, o, otpFlags, me] = await Promise.all([
      supabase
        .from("listings")
        .select("*, farmers(name, village, trust_score)")
        .eq("status", "active")
        .order("id", { ascending: false }),
      supabase
        .from("orders")
        .select(orderCols)
        .eq("buyer_id", buyer.id)
        .order("id", { ascending: false }),
      supabase
        .from("orders")
        .select("id")
        .eq("buyer_id", buyer.id)
        .not("delivery_otp", "is", null),
      supabase.from("buyers").select("trust_score").eq("id", buyer.id).maybeSingle(),
    ]);
    if (l.data) setListings(l.data as ListingWithFarmer[]);
    if (o.data) setMyOrders(o.data as unknown as BuyerOrder[]);
    if (otpFlags.data) {
      const map: Record<string, boolean> = {};
      for (const r of otpFlags.data as { id: string }[]) map[r.id] = true;
      setOtpReady(map);
    }
    if (me.data) setMyTrust((me.data.trust_score as number | null) ?? 0);
  }

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 5000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buyer.id]);

  async function confirmDelivery(orderId: string) {
    const entered = (codes[orderId] || "").trim();
    if (!entered) return;
    setBusy(orderId);
    const { data: matched, error: mErr } = await supabase
      .from("orders")
      .update({ status: "delivered" })
      .eq("id", orderId)
      .eq("status", "confirmed")
      .eq("delivery_otp", entered)
      .select("id, farmer_id, driver_id, buyer_id");
    if (mErr) {
      setBusy(null);
      return alert(mErr.message);
    }
    if (matched && matched.length > 0) {
      const row = matched[0] as {
        farmer_id: string;
        driver_id: string | null;
        buyer_id: string;
      };
      await Promise.all([
        adjustTrustScore("farmers", row.farmer_id, +10),
        row.driver_id ? adjustTrustScore("drivers", row.driver_id, +8) : Promise.resolve(),
        adjustTrustScore("buyers", row.buyer_id, +5),
      ]);
      setOtpMsg((s) => ({ ...s, [orderId]: { kind: "info", text: t("deliveryConfirmed") } }));
      setCodes((s) => ({ ...s, [orderId]: "" }));
      setBusy(null);
      refresh();
      return;
    }
    const { data: attemptRow } = await supabase
      .from("orders")
      .select("otp_failed_attempts")
      .eq("id", orderId)
      .maybeSingle();
    const newCount = ((attemptRow?.otp_failed_attempts as number) ?? 0) + 1;
    await supabase
      .from("orders")
      .update({ otp_failed_attempts: newCount })
      .eq("id", orderId);
    if (newCount >= 3) {
      const { data: disputed } = await supabase
        .from("orders")
        .update({ status: "disputed" })
        .eq("id", orderId)
        .eq("status", "confirmed")
        .select("id, farmer_id, driver_id");
      if (disputed && disputed.length > 0) {
        const row = disputed[0] as { farmer_id: string; driver_id: string | null };
        await Promise.all([
          adjustTrustScore("farmers", row.farmer_id, -15),
          row.driver_id ? adjustTrustScore("drivers", row.driver_id, -20) : Promise.resolve(),
        ]);
      }
      setOtpMsg((s) => ({
        ...s,
        [orderId]: { kind: "error", text: t("flaggedForReview") },
      }));
    } else {
      setOtpMsg((s) => ({
        ...s,
        [orderId]: { kind: "error", text: t("incorrectCode") },
      }));
    }
    setCodes((s) => ({ ...s, [orderId]: "" }));
    setBusy(null);
    refresh();
  }

  async function placeOrder(l: ListingWithFarmer) {
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
      status: "placed",
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
    <PhoneFrame>
      {tab === "home" && (
        <HomeTab
          listings={listings}
          onOrder={placeOrder}
          busy={busy}
          qtys={qtys}
          setQtys={setQtys}
          onLogout={onLogout}
        />
      )}
      {tab === "orders" && (
        <OrdersTab
          myOrders={myOrders}
          otpReady={otpReady}
          codes={codes}
          setCodes={setCodes}
          otpMsg={otpMsg}
          busy={busy}
          onConfirm={confirmDelivery}
        />
      )}
      {tab === "profile" && (
        <ProfileTab buyer={buyer} trust={myTrust} orderCount={myOrders.length} onLogout={onLogout} />
      )}

      <BottomNav
        active={tab}
        onChange={(k) => setTab(k as typeof tab)}
        tabs={[
          { key: "home", label: t("homeTab"), icon: <Home className="h-5 w-5" /> },
          { key: "orders", label: t("ordersTab"), icon: <ClipboardList className="h-5 w-5" /> },
          { key: "profile", label: t("profileTab"), icon: <User className="h-5 w-5" /> },
        ]}
      />
    </PhoneFrame>
  );
}

function HomeTab({
  listings,
  onOrder,
  busy,
  qtys,
  setQtys,
  onLogout,
}: {
  listings: ListingWithFarmer[];
  onOrder: (l: ListingWithFarmer) => void;
  busy: string | null;
  qtys: Record<string, string>;
  setQtys: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  onLogout: () => void;
}) {
  const { t } = useLang();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");

  const filtered = useMemo(() => {
    return listings.filter((l) => {
      if (filter !== "All" && categoryOf(l.crop_type) !== filter) return false;
      if (q && !`${l.crop_type} ${l.farmers?.name ?? ""}`.toLowerCase().includes(q.toLowerCase()))
        return false;
      return true;
    });
  }, [listings, filter, q]);

  return (
    <>
      <TopBar
        right={
          <button
            onClick={onLogout}
            aria-label={t("logout")}
            className="grid place-items-center h-10 w-10 rounded-full bg-card shadow-sm"
          >
            <LogOut className="h-5 w-5" />
          </button>
        }
      />
      <div className="px-5 space-y-4">
        {/* search */}
        <div className="flex items-center gap-2 card-soft px-3 py-2">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("searchPlaceholderCrops")}
            className="flex-1 bg-transparent outline-none text-sm py-1.5"
          />
        </div>

        {/* location */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary-soft text-primary text-xs font-semibold">
          <MapPin className="h-3.5 w-3.5" /> {t("nearbyVillages")}
        </div>

        {/* hero banner */}
        <div className="rounded-3xl p-5 text-white bg-gradient-to-br from-primary to-emerald-700 shadow-md">
          <div className="text-lg font-extrabold">{t("freshFromFarm")} 🌾</div>
          <div className="text-sm text-white/85 mt-1">
            {t("directFromFarmers")}
          </div>
        </div>

        {/* filter chips */}
        <div className="-mx-5 px-5 flex gap-2 overflow-x-auto">
          {FILTERS.map((f) => {
            const active = f === filter;
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-semibold border ${
                  active
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-foreground border-border"
                }`}
              >
                {filterLabel(f, t)}
              </button>
            );
          })}
        </div>

        {/* product grid */}
        <div>
          <h2 className="text-base font-bold mb-2">{t("allFreshListings")}</h2>
          {filtered.length === 0 ? (
            <div className="card-soft p-8 text-center">
              <div className="text-4xl">🥬</div>
              <p className="mt-2 text-sm text-muted-foreground">
                {t("noActiveListings")}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {filtered.map((l) => (
                <div key={l.id} className="card-soft p-3 flex flex-col">
                  <div className="aspect-square rounded-xl bg-primary-soft grid place-items-center text-5xl">
                    {cropEmoji(l.crop_type)}
                  </div>
                  <div className="mt-2 font-bold truncate">{l.crop_type}</div>
                  <div className="text-[11px] text-muted-foreground truncate">
                    {t("byLabel")} {l.farmers?.name ?? "—"}
                  </div>
                  <div className="mt-1 flex items-baseline justify-between">
                    <div className="text-primary font-extrabold">
                      ₹{l.price_per_kg}
                      <span className="text-[10px] font-semibold text-muted-foreground">/kg</span>
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {l.quantity_kg}kg
                    </div>
                  </div>
                  <div className="mt-2 flex gap-1">
                    <input
                      type="number"
                      min="1"
                      max={l.quantity_kg}
                      placeholder="kg"
                      value={qtys[l.id] ?? ""}
                      onChange={(e) =>
                        setQtys((s) => ({ ...s, [l.id]: e.target.value }))
                      }
                      className="w-12 text-xs px-2 py-1.5 rounded-lg border border-input text-center"
                    />
                    <button
                      onClick={() => onOrder(l)}
                      disabled={busy === l.id}
                      className="flex-1 bg-primary text-primary-foreground rounded-lg text-xs font-bold py-1.5 disabled:opacity-60"
                    >
                      {busy === l.id ? "..." : t("orderBtn")}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-center pt-2">
          <LanguageSwitcher />
        </div>
      </div>
    </>
  );
}

function OrdersTab({
  myOrders,
  otpReady,
  codes,
  setCodes,
  otpMsg,
  busy,
  onConfirm,
}: {
  myOrders: BuyerOrder[];
  otpReady: Record<string, boolean>;
  codes: Record<string, string>;
  setCodes: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  otpMsg: Record<string, { kind: "error" | "info"; text: string }>;
  busy: string | null;
  onConfirm: (orderId: string) => void;
}) {
  const { t } = useLang();
  return (
    <>
      <TopBar title={t("myOrdersTitle")} />
      <div className="px-5 space-y-3">
        {myOrders.length === 0 ? (
          <div className="card-soft p-8 text-center">
            <div className="text-4xl">📋</div>
            <p className="mt-2 text-sm text-muted-foreground">
              {t("noOrdersBuyer")}
            </p>
          </div>
        ) : (
          myOrders.map((o) => (
            <div key={o.id} className="card-soft p-4">
              <div className="flex items-start gap-3">
                <div className="text-3xl">{cropEmoji(o.listings?.crop_type ?? "")}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-bold truncate">
                      {o.listings?.crop_type ?? "—"}
                    </div>
                    <StatusPill status={o.status} />
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {o.quantity_kg}kg · ₹{o.total_price}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {t("farmer")}: {o.farmers?.name ?? "—"}
                  </div>
                  {o.drivers && (
                    <div className="text-xs text-muted-foreground truncate">
                      🚚 {o.drivers.name}
                    </div>
                  )}
                </div>
              </div>

              {o.status !== "cancelled" && o.status !== "disputed" && (
                <OrderTracker
                  status={o.status}
                  hasDriver={!!o.drivers}
                  hasOtp={!!otpReady[o.id]}
                />
              )}

              {o.status === "confirmed" && otpReady[o.id] && (
                <div className="mt-4 rounded-2xl bg-primary-soft border border-primary/20 p-3">
                  <label className="text-xs font-bold text-primary block mb-2">
                    {t("enterDeliveryCode")}
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      autoComplete="off"
                      placeholder={t("codePlaceholder")}
                      value={codes[o.id] ?? ""}
                      onChange={(e) =>
                        setCodes((s) => ({ ...s, [o.id]: e.target.value }))
                      }
                      className="flex-1 px-3 py-2 rounded-xl border border-input bg-white tracking-widest text-center font-bold"
                    />
                    <button
                      onClick={() => onConfirm(o.id)}
                      disabled={busy === o.id}
                      className="btn-primary py-2 px-4 text-sm"
                    >
                      {busy === o.id ? "..." : t("confirmDelivery")}
                    </button>
                  </div>
                  {otpMsg[o.id] && (
                    <p
                      className={`text-xs mt-2 font-semibold ${
                        otpMsg[o.id].kind === "error"
                          ? "text-destructive"
                          : "text-primary"
                      }`}
                    >
                      {otpMsg[o.id].text}
                    </p>
                  )}
                </div>
              )}
              {o.status === "disputed" && otpMsg[o.id] && (
                <p className="text-xs text-destructive mt-3 font-semibold">
                  {otpMsg[o.id].text}
                </p>
              )}
            </div>
          ))
        )}
      </div>
    </>
  );
}

function ProfileTab({
  buyer,
  trust,
  orderCount,
  onLogout,
}: {
  buyer: Buyer;
  trust: number;
  orderCount: number;
  onLogout: () => void;
}) {
  const { t } = useLang();
  const stars = Math.round((trust / 100) * 5);
  return (
    <>
      <TopBar title={t("profileTitle")} />
      <div className="px-5 space-y-4">
        <div className="card-soft p-6 text-center">
          <div className="mx-auto grid place-items-center h-20 w-20 rounded-full bg-primary-soft text-3xl font-extrabold text-primary">
            {buyer.name.charAt(0).toUpperCase()}
          </div>
          <div className="mt-3 text-2xl font-extrabold">{buyer.name}</div>
          <div className="mt-1 text-sm text-muted-foreground capitalize">
            {buyer.business_type}
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

        <div className="grid grid-cols-2 gap-3">
          <div className="card-soft p-4">
            <div className="text-xs text-muted-foreground font-semibold">{t("totalOrdersLabel")}</div>
            <div className="mt-1 text-2xl font-extrabold">{orderCount}</div>
          </div>
          <div className="card-soft p-4">
            <div className="text-xs text-muted-foreground font-semibold">{t("phoneLabel")}</div>
            <div className="mt-1 text-sm font-bold truncate">{buyer.phone}</div>
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
