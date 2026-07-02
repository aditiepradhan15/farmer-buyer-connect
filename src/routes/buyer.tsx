import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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

export const Route = createFileRoute("/buyer")({
  head: () => ({ meta: [{ title: "Buyer — AgriConnect" }] }),
  component: BuyerPage,
});

function BuyerPage() {
  const { t } = useLang();
  const [buyer, setBuyer] = useState<Buyer | null>(null);

  if (buyer) return <Marketplace buyer={buyer} onLogout={() => setBuyer(null)} />;

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
        if (!data) return t("noBuyer");
        setBuyer(data as Buyer);
        return null;
      }}
    />
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

function Marketplace({ buyer, onLogout }: { buyer: Buyer; onLogout: () => void }) {
  const { t } = useLang();
  const [listings, setListings] = useState<ListingWithFarmer[]>([]);
  const [myOrders, setMyOrders] = useState<BuyerOrder[]>([]);
  const [otpReady, setOtpReady] = useState<Record<string, boolean>>({});
  const [qtys, setQtys] = useState<Record<string, string>>({});
  const [codes, setCodes] = useState<Record<string, string>>({});
  const [otpMsg, setOtpMsg] = useState<Record<string, { kind: "error" | "info"; text: string }>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [myTrust, setMyTrust] = useState<number>(buyer.trust_score ?? 0);

  async function refresh() {
    // CRITICAL: explicit column list excludes `delivery_otp`.
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
      // Get IDs of buyer's orders that have an OTP set, WITHOUT fetching the OTP value.
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
    // Compare server-side: only rows where delivery_otp matches AND the order
    // is still in `confirmed` will update. Gating on status ensures the
    // transition (and the trust-score side effect) fires exactly once.
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
      // Trust score updates on successful delivery — runs once per transition.
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
    // Mismatch: increment otp_failed_attempts and possibly dispute.
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
      // Gate dispute transition on status=confirmed so the trust deduction
      // only runs the single time we actually flip to disputed.
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
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center gap-3">
          <div>
            <h1 className="text-xl font-semibold">
              {t("welcome")}, {buyer.name}
            </h1>
            <p className="text-sm text-muted-foreground">
              {buyer.business_type} · {t("trustScore")}: {myTrust}
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
          <h2 className="text-lg font-semibold mb-4">{t("marketplace")}</h2>
          {listings.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("noActiveListings")}</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {listings.map((l) => (
                <div key={l.id} className="bg-card border border-border rounded-lg p-4 space-y-3">
                  <div>
                    <div className="text-lg font-semibold">{l.crop_type}</div>
                    <div className="text-sm text-muted-foreground">
                      {l.quantity_kg} kg {t("available")} · ₹{l.price_per_kg}/kg
                    </div>
                  </div>
                  <div className="text-sm">
                    <div className="font-medium">{l.farmers?.name ?? "—"}</div>
                    <div className="text-muted-foreground">
                      {l.farmers?.village ?? "—"} · {t("trustScore")}: {l.farmers?.trust_score ?? "—"}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="1"
                      max={l.quantity_kg}
                      placeholder={t("qtyKg")}
                      value={qtys[l.id] ?? ""}
                      onChange={(e) => setQtys((s) => ({ ...s, [l.id]: e.target.value }))}
                      className="flex-1 px-3 py-2 border border-input rounded-md bg-background"
                    />
                    <button
                      onClick={() => order(l)}
                      disabled={busy === l.id}
                      className="bg-primary text-primary-foreground rounded-md px-4 font-medium hover:bg-primary/90 disabled:opacity-50"
                    >
                      {busy === l.id ? "..." : t("orderNow")}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-4">{t("myOrders")}</h2>
          {myOrders.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("noOrdersBuyer")}</p>
          ) : (
            <div className="space-y-2">
              {myOrders.map((o) => (
                <div
                  key={o.id}
                  className="bg-card border border-border rounded-md p-4 flex flex-col gap-3"
                >
                  <div className="flex flex-col sm:flex-row sm:justify-between gap-2">
                    <div>
                      <div className="font-medium">
                        {o.listings?.crop_type ?? "—"} · {o.quantity_kg} kg
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {t("farmer")}: {o.farmers?.name ?? "—"} · {t("total")}: ₹{o.total_price}
                      </div>
                      {o.drivers && (
                        <div className="text-sm text-muted-foreground">
                          🚚 {t("driver")}: {o.drivers.name} · {t("vehicle")}:{" "}
                          {o.drivers.vehicle_reg_number}
                        </div>
                      )}
                    </div>
                    <div className="text-sm sm:self-center">
                      {t("status")}:{" "}
                      <span
                        className={`text-xs px-2 py-0.5 rounded font-medium ${statusClass(o.status)}`}
                      >
                        {o.status}
                      </span>
                    </div>
                  </div>
                  {o.status === "confirmed" && otpReady[o.id] && (
                    <div className="border-t border-border pt-3">
                      <label className="text-sm font-medium block mb-2">
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
                          className="flex-1 px-3 py-2 border border-input rounded-md bg-background tracking-widest"
                        />
                        <button
                          onClick={() => confirmDelivery(o.id)}
                          disabled={busy === o.id}
                          className="bg-primary text-primary-foreground rounded-md px-4 font-medium hover:bg-primary/90 disabled:opacity-50"
                        >
                          {busy === o.id ? "..." : t("confirmDelivery")}
                        </button>
                      </div>
                      {otpMsg[o.id] && (
                        <p
                          className={`text-sm mt-2 ${
                            otpMsg[o.id].kind === "error"
                              ? "text-destructive"
                              : "text-green-700"
                          }`}
                        >
                          {otpMsg[o.id].text}
                        </p>
                      )}
                    </div>
                  )}
                  {o.status === "disputed" && otpMsg[o.id] && (
                    <p className="text-sm text-destructive border-t border-border pt-3">
                      {otpMsg[o.id].text}
                    </p>
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
