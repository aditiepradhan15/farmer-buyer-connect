import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase, type Farmer, type Listing, type Order } from "@/lib/supabase";
import { useLang, LanguageSwitcher } from "@/lib/i18n";
import { OtpLogin } from "@/components/OtpLogin";
import {
  PhoneFrame,
  TopBar,
  BottomNav,
  StatusPill,
  cropEmoji,
  TrustRing,
} from "@/components/AppShell";
import { Home, Package, Plus, ArrowLeft, LogOut, Star } from "lucide-react";

export const Route = createFileRoute("/farmer")({
  head: () => ({ meta: [{ title: "Farmer — Mitti & Market" }] }),
  component: FarmerPage,
});

function FarmerPage() {
  const { t } = useLang();
  const [farmer, setFarmer] = useState<Farmer | null>(null);

  if (farmer) return <FarmerDashboard farmer={farmer} onLogout={() => setFarmer(null)} />;

  return (
    <OtpLogin
      title={t("farmerLogin")}
      onVerified={async (phone) => {
        const { data, error } = await supabase
          .from("farmers")
          .select("*")
          .eq("phone", phone)
          .maybeSingle();
        if (error) return error.message;
        if (!data) return "register";
        setFarmer(data as Farmer);
        return "ok";
      }}
      renderRegister={(phone) => (
        <FarmerRegister phone={phone} onRegistered={(f) => setFarmer(f)} />
      )}
    />
  );
}

function FarmerRegister({
  phone,
  onRegistered,
}: {
  phone: string;
  onRegistered: (f: Farmer) => void;
}) {
  const { t } = useLang();
const [name, setName] = useState("");
const [village, setVillage] = useState("");
const [city, setCity] = useState("");
const [state, setState] = useState("");
const [busy, setBusy] = useState(false);
const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
   const { data, error: insErr } = await supabase
  .from("farmers")
  .insert({ phone, name: name.trim(), village: village.trim(), city: city.trim(), state: state.trim() })
  .select("*")
  .maybeSingle();
    setBusy(false);
    if (insErr || !data) return setError(insErr?.message ?? "Failed to register");
    onRegistered(data as Farmer);
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
<input
  required
  value={village}
  onChange={(e) => setVillage(e.target.value)}
  placeholder={t("villageLabel")}
  className="input-app"
/>
<input
  required
  value={city}
  onChange={(e) => setCity(e.target.value)}
  placeholder="City (शहर)"
  className="input-app"
/>
<input
  required
  value={state}
  onChange={(e) => setState(e.target.value)}
  placeholder="State (राज्य)"
  className="input-app"
/>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <button type="submit" disabled={busy} className="btn-primary w-full">
        {busy ? t("registering") : t("registerBtn")}
      </button>
    </form>
  );
}

type OrderWithJoins = Order & {
  buyers: { name: string } | null;
  listings: { crop_type: string } | null;
  drivers: { name: string; vehicle_reg_number: string } | null;
};

function FarmerDashboard({ farmer, onLogout }: { farmer: Farmer; onLogout: () => void }) {
  const { t } = useLang();
  const [tab, setTab] = useState<"home" | "orders" | "sell">("home");
  const [listings, setListings] = useState<Listing[]>([]);
  const [orders, setOrders] = useState<OrderWithJoins[]>([]);
  const [trust, setTrust] = useState<number>(farmer.trust_score ?? 0);

  async function refresh() {
    const [l, o, me] = await Promise.all([
      supabase.from("listings").select("*").eq("farmer_id", farmer.id).order("id", { ascending: false }),
      supabase
        .from("orders")
        .select("*, buyers(name), listings(crop_type), drivers(name, vehicle_reg_number)")
        .eq("farmer_id", farmer.id)
        .order("id", { ascending: false }),
      supabase.from("farmers").select("trust_score").eq("id", farmer.id).maybeSingle(),
    ]);
    if (l.data) setListings(l.data as Listing[]);
    if (o.data) setOrders(o.data as OrderWithJoins[]);
    if (me.data) setTrust((me.data.trust_score as number | null) ?? 0);
  }

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 5000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [farmer.id]);

  return (
    <PhoneFrame>
      {tab === "home" && (
        <HomeTab
          farmer={farmer}
          trust={trust}
          listings={listings}
          orders={orders}
          onOpenSell={() => setTab("sell")}
          onOpenOrders={() => setTab("orders")}
          onLogout={onLogout}
        />
      )}
      {tab === "orders" && (
        <OrdersTab orders={orders} onRefresh={refresh} onBack={() => setTab("home")} />
      )}
      {tab === "sell" && (
        <SellTab farmer={farmer} onDone={() => { setTab("home"); refresh(); }} onBack={() => setTab("home")} />
      )}

      <BottomNav
        active={tab}
        onChange={(k) => setTab(k as typeof tab)}
        tabs={[
          { key: "home", label: t("homeTab"), icon: <Home className="h-5 w-5" /> },
          { key: "orders", label: t("ordersTab"), icon: <Package className="h-5 w-5" /> },
          { key: "sell", label: t("sellTab"), icon: <Plus className="h-5 w-5" /> },
        ]}
      />
    </PhoneFrame>
  );
}

function HomeTab({
  farmer,
  trust,
  listings,
  orders,
  onOpenSell,
  onOpenOrders,
  onLogout,
}: {
  farmer: Farmer;
  trust: number;
  listings: Listing[];
  orders: OrderWithJoins[];
  onOpenSell: () => void;
  onOpenOrders: () => void;
  onLogout: () => void;
}) {
  const { t } = useLang();
  const active = listings.filter((l) => l.status === "active");
  const recent = orders.slice(0, 2);
  const stars = Math.round((trust / 100) * 5);

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
      <div className="px-5 space-y-5">
        {/* welcome banner */}
        <div className="rounded-3xl p-5 text-white bg-gradient-to-br from-primary to-emerald-700 shadow-md">
          <div className="text-lg font-bold">
            {t("greeting")}, {farmer.name}! 🌾
          </div>
         <div className="text-sm text-white/85 mt-1">
  📍 {farmer.village}{farmer.city ? `, ${farmer.city}` : ''}{farmer.state ? `, ${farmer.state}` : ''}
</div>
        </div>

        {/* Trust score */}
        <div className="card-soft p-5 flex items-center gap-4">
          <TrustRing score={trust} />
          <div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">
              {t("trustScore")}
            </div>
            <div className="mt-1 flex items-center gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`h-4 w-4 ${
                    i < stars ? "fill-yellow-400 text-yellow-400" : "text-border"
                  }`}
                />
              ))}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {trust >= 80 ? t("trustedFarmer") : trust >= 40 ? t("growingReputation") : t("newFarmerLabel")}
            </div>
          </div>
        </div>

        {/* Listings */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-base font-bold">{t("yourActiveListings")}</h2>
            <button onClick={onOpenSell} className="text-xs font-semibold text-primary">
              {t("seeAll")} →
            </button>
          </div>
          {active.length === 0 ? (
            <button
              onClick={onOpenSell}
              className="w-full card-soft p-6 text-center border border-dashed border-primary/40"
            >
              <div className="text-4xl">🌱</div>
              <div className="mt-2 text-sm font-semibold">{t("noActiveListingsFarmer")}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {t("tapPlusCreate")}
              </div>
            </button>
          ) : (
            <div className="-mx-5 px-5 flex gap-3 overflow-x-auto pb-1 snap-x">
              {active.map((l) => (
                <div
                  key={l.id}
                  className="min-w-[180px] snap-start card-soft p-4"
                >
                  <div className="text-3xl">{cropEmoji(l.crop_type)}</div>
                  <div className="mt-2 font-bold">{l.crop_type}</div>
                  <div className="text-xs text-muted-foreground">
                    {l.quantity_kg} kg
                  </div>
                  <div className="mt-1 text-primary font-extrabold">
                    ₹{l.price_per_kg}/kg
                  </div>
                  <StatusPill status={l.status === "active" ? "confirmed" : "delivered"} />
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Recent orders */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-base font-bold">{t("recentOrders")}</h2>
            <button onClick={onOpenOrders} className="text-xs font-semibold text-primary">
              {t("seeAll")} →
            </button>
          </div>
          {recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("noOrders")}</p>
          ) : (
            <div className="space-y-2">
              {recent.map((o) => (
                <div key={o.id} className="card-soft p-4 flex items-center gap-3">
                  <div className="text-2xl">{cropEmoji(o.listings?.crop_type ?? "")}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">
                      {o.listings?.crop_type ?? "—"} · {o.quantity_kg}kg
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {t("buyer")}: {o.buyers?.name ?? "—"} · ₹{o.total_price}
                    </div>
                  </div>
                  <StatusPill status={o.status} />
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

function OrdersTab({
  orders,
  onRefresh,
  onBack,
}: {
  orders: OrderWithJoins[];
  onRefresh: () => void;
  onBack: () => void;
}) {
  const { t } = useLang();
  return (
    <>
      <div className="flex items-center gap-3 px-5 pt-5 pb-3">
        <button
          onClick={onBack}
          className="grid place-items-center h-10 w-10 rounded-full bg-card shadow-sm"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-extrabold">{t("yourOrders")}</h1>
      </div>
      <div className="px-5 space-y-2">
        {orders.length === 0 ? (
          <div className="card-soft p-8 text-center">
            <div className="text-4xl">📦</div>
            <p className="mt-2 text-sm text-muted-foreground">{t("noOrders")}</p>
          </div>
        ) : (
          orders.map((o) => <OrderCard key={o.id} order={o} onChanged={onRefresh} />)
        )}
      </div>
    </>
  );
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
    <div className="card-soft p-4">
      <div className="flex items-start gap-3">
        <div className="text-3xl">{cropEmoji(order.listings?.crop_type ?? "")}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="font-bold truncate">
              {order.listings?.crop_type ?? "—"}
            </div>
            <StatusPill status={order.status} />
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {order.quantity_kg}kg · ₹{order.total_price}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5 truncate">
            {t("buyer")}: {order.buyers?.name ?? "—"}
          </div>
          {(order.status === "confirmed" || order.status === "in_transit") && (
  
    href="tel:7028574619"
    className="mt-2 flex items-center gap-2 text-xs font-semibold text-primary"
  >
    📞 {t("callViaTollFree")} 7028574619
  </a>
)}
        </div>
      </div>
      {order.status === "placed" && (
        <div className="flex gap-2 mt-3">
          <button
            onClick={() => setStatus("confirmed")}
            disabled={busy}
            className="btn-primary flex-1 py-2 text-sm"
          >
            {t("acceptOrder")}
          </button>
          <button
            onClick={() => setStatus("cancelled")}
            disabled={busy}
            className="flex-1 py-2 rounded-full border border-border text-sm font-semibold text-foreground"
          >
            {t("declineOrder")}
          </button>
        </div>
      )}
      {order.status === "confirmed" && (
        <button
          onClick={() => setStatus("delivered")}
          disabled={busy}
          className="btn-primary w-full mt-3 py-2 text-sm"
        >
          {t("markDelivered")}
        </button>
      )}
    </div>
  );
}

const CROP_OPTIONS = [
  { name: "Onion", emoji: "🧅" },
  { name: "Tomato", emoji: "🍅" },
  { name: "Wheat", emoji: "🌾" },
  { name: "Rice", emoji: "🍚" },
  { name: "Potato", emoji: "🥔" },
  { name: "Leafy Greens", emoji: "🥬" },
  { name: "Corn", emoji: "🌽" },
  { name: "Mango", emoji: "🥭" },
  { name: "Grapes", emoji: "🍇" },
  { name: "Garlic", emoji: "🧄" },
  { name: "Soybean", emoji: "🫘" },
];

function suggestedRange(crop: string): [number, number] | null {
  const c = crop.toLowerCase();
  if (c.includes("onion")) return [18, 28];
  if (c.includes("tomato")) return [15, 25];
  if (c.includes("wheat")) return [22, 32];
  if (c.includes("rice")) return [28, 45];
  if (c.includes("potato")) return [12, 20];
  if (c.includes("leaf") || c.includes("green")) return [20, 35];
  if (c.includes("corn")) return [18, 26];
  if (c.includes("mango")) return [50, 90];
  if (c.includes("grape")) return [45, 75];
  if (c.includes("garlic")) return [90, 140];
  if (c.includes("soy")) return [35, 50];
  return null;
}

function SellTab({
  farmer,
  onDone,
  onBack,
}: {
  farmer: Farmer;
  onDone: () => void;
  onBack: () => void;
}) {
  const { t } = useLang();
  const [crop, setCrop] = useState("");
  const [otherCrop, setOtherCrop] = useState("");
  const [qty, setQty] = useState("");
  const [price, setPrice] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const finalCrop = crop === "__other" ? otherCrop.trim() : crop;
  const range = suggestedRange(finalCrop);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!finalCrop) return;
    setSubmitting(true);
    const { error } = await supabase.from("listings").insert({
      farmer_id: farmer.id,
      crop_type: finalCrop,
      quantity_kg: Number(qty),
      price_per_kg: Number(price),
      status: "active",
    });
    setSubmitting(false);
    if (error) return alert(error.message);
    onDone();
  }

  function onPhotoPick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    const urls = files.map((f) => URL.createObjectURL(f));
    setPhotos((p) => [...p, ...urls]);
  }

  return (
    <>
      <div className="flex items-center gap-3 px-5 pt-5 pb-3">
        <button
          onClick={onBack}
          className="grid place-items-center h-10 w-10 rounded-full bg-card shadow-sm"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-extrabold">{t("newListing")}</h1>
      </div>

      <form onSubmit={submit} className="px-5 space-y-5">
        {/* Step 1: crop */}
        <div>
          <div className="text-xs font-bold text-muted-foreground uppercase mb-2">
            1. {t("chooseCrop")}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {CROP_OPTIONS.map((c) => {
              const active = crop === c.name;
              return (
                <button
                  type="button"
                  key={c.name}
                  onClick={() => setCrop(c.name)}
                  className={`card-soft p-3 flex flex-col items-center gap-1 border ${
                    active ? "border-primary ring-2 ring-primary/30" : "border-transparent"
                  }`}
                >
                  <span className="text-2xl">{c.emoji}</span>
                  <span className="text-[11px] font-semibold text-center leading-tight">
                    {c.name}
                  </span>
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setCrop("__other")}
              className={`card-soft p-3 flex flex-col items-center gap-1 border ${
                crop === "__other"
                  ? "border-primary ring-2 ring-primary/30"
                  : "border-transparent"
              }`}
            >
              <span className="text-2xl">➕</span>
              <span className="text-[11px] font-semibold">{t("otherCrop")}</span>
            </button>
          </div>
          {crop === "__other" && (
            <input
              className="input-app mt-2"
              placeholder={t("cropType")}
              value={otherCrop}
              onChange={(e) => setOtherCrop(e.target.value)}
              required
            />
          )}
        </div>

        {/* Step 2: quantity */}
        <div>
          <div className="text-xs font-bold text-muted-foreground uppercase mb-2">
            2. {t("quantityKg")}
          </div>
          <input
            required
            type="number"
            inputMode="numeric"
            min="1"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            placeholder="0"
            className="input-app text-2xl font-bold text-center tracking-wide"
          />
        </div>

        {/* Step 3: price */}
        <div>
          <div className="text-xs font-bold text-muted-foreground uppercase mb-2">
            3. {t("pricePerKg")}
          </div>
          {range && (
            <div className="rounded-xl bg-primary-soft border border-primary/20 px-4 py-2.5 text-sm text-primary font-semibold mb-2">
              {t("suggestedPrice")}: ₹{range[0]}–₹{range[1]}/kg
            </div>
          )}
          <input
            required
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="₹/kg"
            className="input-app text-xl font-bold text-center"
          />
        </div>

        {/* Step 4: photos */}
        <div>
          <div className="text-xs font-bold text-muted-foreground uppercase mb-2">
            4. {t("photosOptional")}
          </div>
          <label className="block card-soft border-2 border-dashed border-border p-4 text-center cursor-pointer">
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={onPhotoPick}
            />
            <div className="text-2xl">📸</div>
            <div className="text-sm font-semibold mt-1">{t("addPhotos")}</div>
          </label>
          {photos.length > 0 && (
            <div className="flex gap-2 mt-2 overflow-x-auto">
              {photos.map((src, i) => (
                <img
                  key={i}
                  src={src}
                  alt=""
                  className="h-16 w-16 rounded-xl object-cover border border-border"
                />
              ))}
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={submitting || !finalCrop || !qty || !price}
          className="btn-primary w-full text-base"
        >
          {submitting ? t("adding") : t("publishListing")}
        </button>
      </form>
    </>
  );
}
