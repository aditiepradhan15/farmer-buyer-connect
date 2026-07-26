import { useState } from "react";
import { CreditCard, CheckCircle2, X } from "lucide-react";
import { useLang } from "@/lib/i18n";
import { cropEmoji } from "@/components/AppShell";

export type PaymentMethod = "card" | "upi" | "cod";
export type UpiApp = "gpay" | "phonepe" | "paytm";

const PLATFORM_FEE_RATE = 0.07;
const COD_ADVANCE_RATE = 0.2; // buyer pays 20% online upfront for COD orders

function generateFakePaymentId(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let id = "";
  for (let i = 0; i < 10; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return `PAY_${id}`;
}

function formatCardNumber(v: string) {
  const digits = v.replace(/\D/g, "").slice(0, 16);
  return digits.replace(/(.{4})/g, "$1 ").trim();
}

export function PaymentSheet({
  cropType,
  quantityKg,
  pricePerKg,
  onCancel,
  onConfirm,
  onViewOrder,
}: {
  cropType: string;
  quantityKg: number;
  pricePerKg: number;
  onCancel: () => void;
  /** Called once the (simulated) payment succeeds. Should perform the actual
   * order insert + listing status update, and return true/false for success. */
  onConfirm: (payment: {
    method: PaymentMethod;
    paymentId: string;
    totalWithFee: number;
    advancePaid: number;
    remainingAmount: number;
    methodDetail: string;
  }) => Promise<boolean>;
  onViewOrder: () => void;
}) {
  const { t } = useLang();
  const [method, setMethod] = useState<PaymentMethod | null>(null);
  const [stage, setStage] = useState<"select" | "processing" | "success" | "error">("select");
  const [paymentId, setPaymentId] = useState("");
  const [advancePaid, setAdvancePaid] = useState(0);

  // Card fields (demo only — never sent anywhere real, just simulated)
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [cardName, setCardName] = useState("");

  // UPI fields
  const [upiApp, setUpiApp] = useState<UpiApp | null>(null);
  const [upiId, setUpiId] = useState("");

  const subtotal = quantityKg * pricePerKg;
  const fee = Math.round(subtotal * PLATFORM_FEE_RATE * 100) / 100;
  const total = Math.round((subtotal + fee) * 100) / 100;
  const codAdvance = Math.round(total * COD_ADVANCE_RATE * 100) / 100;
  const codRemaining = Math.round((total - codAdvance) * 100) / 100;

  const cardValid =
    /^\d{16}$/.test(cardNumber.replace(/\s/g, "")) &&
    /^\d{2}\/\d{2}$/.test(cardExpiry) &&
    /^\d{3}$/.test(cardCvv) &&
    cardName.trim().length > 1;
  const upiValid = upiApp !== null;
  const codValid = true;

  const isValid =
    method === "card" ? cardValid : method === "upi" ? upiValid : method === "cod" ? codValid : false;

  function handlePay() {
    if (!method || !isValid) return;
    setStage("processing");
    const fakeId = generateFakePaymentId();
    const amountNow = method === "cod" ? codAdvance : total;
    const remaining = method === "cod" ? codRemaining : 0;
    const methodDetail =
      method === "card"
        ? `Card •••• ${cardNumber.replace(/\D/g, "").slice(-4)}`
        : method === "upi"
          ? `UPI - ${upiApp}`
          : "Cash on Delivery";

    setTimeout(async () => {
      const ok = await onConfirm({
        method,
        paymentId: fakeId,
        totalWithFee: total,
        advancePaid: amountNow,
        remainingAmount: remaining,
        methodDetail,
      });
      if (ok) {
        setPaymentId(fakeId);
        setAdvancePaid(amountNow);
        setStage("success");
      } else {
        setStage("error");
      }
    }, 2000);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50">
      <div className="w-full max-w-[430px] max-h-[92vh] overflow-y-auto bg-background rounded-t-3xl sm:rounded-3xl p-6">
        {stage === "select" && (
          <>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-extrabold">{t("orderSummary")}</h2>
              <button
                onClick={onCancel}
                aria-label={t("cancelPayment")}
                className="grid place-items-center h-9 w-9 rounded-full bg-card shadow-sm"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="card-soft p-4 space-y-2">
              <div className="flex items-center gap-3">
                <div className="text-3xl">{cropEmoji(cropType)}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold truncate">{cropType}</div>
                  <div className="text-xs text-muted-foreground">
                    {quantityKg}kg × ₹{pricePerKg}/kg
                  </div>
                </div>
              </div>
              <div className="border-t border-border/60 pt-2 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t("subtotal")}</span>
                  <span>₹{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t("platformFee")} (7%)</span>
                  <span>₹{fee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-baseline pt-1">
                  <span className="font-bold">{t("totalAmount")}</span>
                  <span className="text-2xl font-extrabold text-primary">
                    ₹{total.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            <h3 className="text-sm font-bold mt-6 mb-2">{t("selectPaymentMethod")}</h3>
            <div className="space-y-2">
              {(
                [
                  { key: "card" as const, emoji: "💳", label: t("cardPayment") },
                  { key: "upi" as const, emoji: "📱", label: t("upiPayment") },
                  { key: "cod" as const, emoji: "💵", label: t("codPayment") },
                ]
              ).map((opt) => {
                const active = method === opt.key;
                return (
                  <button
                    key={opt.key}
                    onClick={() => setMethod(opt.key)}
                    className={`w-full flex items-center gap-3 p-4 rounded-2xl border transition-colors text-left ${
                      active ? "border-primary bg-primary-soft" : "border-border/60 bg-card"
                    }`}
                  >
                    <span className="text-2xl">{opt.emoji}</span>
                    <span className="font-semibold flex-1">{opt.label}</span>
                    <span
                      className={`h-5 w-5 rounded-full border-2 grid place-items-center ${
                        active ? "border-primary" : "border-border"
                      }`}
                    >
                      {active && <span className="h-2.5 w-2.5 rounded-full bg-primary" />}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Card details */}
            {method === "card" && (
              <div className="mt-3 card-soft p-4 space-y-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <CreditCard className="h-3.5 w-3.5" /> Demo card — no real charge
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">
                    {t("cardNumberLabel")}
                  </label>
                  <input
                    value={cardNumber}
                    onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                    placeholder="4242 4242 4242 4242"
                    inputMode="numeric"
                    className="input-app mt-1"
                  />
                </div>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="text-xs font-semibold text-muted-foreground">
                      {t("cardExpiryLabel")}
                    </label>
                    <input
                      value={cardExpiry}
                      onChange={(e) => {
                        let v = e.target.value.replace(/[^\d]/g, "").slice(0, 4);
                        if (v.length > 2) v = `${v.slice(0, 2)}/${v.slice(2)}`;
                        setCardExpiry(v);
                      }}
                      placeholder="MM/YY"
                      inputMode="numeric"
                      className="input-app mt-1"
                    />
                  </div>
                  <div className="w-24">
                    <label className="text-xs font-semibold text-muted-foreground">
                      {t("cardCvvLabel")}
                    </label>
                    <input
                      value={cardCvv}
                      onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, "").slice(0, 3))}
                      placeholder="123"
                      inputMode="numeric"
                      className="input-app mt-1"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">
                    {t("cardNameLabel")}
                  </label>
                  <input
                    value={cardName}
                    onChange={(e) => setCardName(e.target.value)}
                    placeholder="A. Farmer Buyer"
                    className="input-app mt-1"
                  />
                </div>
              </div>
            )}

            {/* UPI details */}
            {method === "upi" && (
              <div className="mt-3 card-soft p-4 space-y-3">
                <label className="text-xs font-semibold text-muted-foreground">
                  {t("chooseUpiApp")}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      { key: "gpay" as const, label: "GPay", emoji: "🟢" },
                      { key: "phonepe" as const, label: "PhonePe", emoji: "🟣" },
                      { key: "paytm" as const, label: "Paytm", emoji: "🔵" },
                    ]
                  ).map((app) => {
                    const active = upiApp === app.key;
                    return (
                      <button
                        key={app.key}
                        onClick={() => setUpiApp(app.key)}
                        className={`flex flex-col items-center gap-1 py-3 rounded-xl border text-xs font-semibold ${
                          active ? "border-primary bg-primary-soft" : "border-border/60 bg-card"
                        }`}
                      >
                        <span className="text-xl">{app.emoji}</span>
                        {app.label}
                      </button>
                    );
                  })}
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">
                    {t("upiIdOptional")}
                  </label>
                  <input
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    placeholder="yourname@okhdfcbank"
                    className="input-app mt-1"
                  />
                </div>
              </div>
            )}

            {/* COD advance notice */}
            {method === "cod" && (
              <div className="mt-3 rounded-2xl bg-primary-soft border border-primary/20 p-4 space-y-2">
                <p className="text-xs font-semibold text-primary">{t("advanceNote")}</p>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t("advanceAmountLabel")}</span>
                  <span className="font-bold">₹{codAdvance.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t("remainingAmountLabel")}</span>
                  <span>
                    ₹{codRemaining.toFixed(2)} ({t("remainingOnDelivery")})
                  </span>
                </div>
              </div>
            )}

            <div className="mt-6 space-y-2">
              <button
                onClick={handlePay}
                disabled={!method || !isValid}
                className="w-full rounded-2xl bg-green-600 text-white font-bold py-3.5 text-base disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.99] transition-transform"
              >
                {method === "cod"
                  ? `${t("payAdvanceLabel")} ₹${codAdvance.toFixed(2)}`
                  : `${t("payLabel")} ₹${total.toFixed(2)}`}
              </button>
              <button
                onClick={onCancel}
                className="w-full rounded-2xl py-3 text-sm font-semibold text-muted-foreground"
              >
                {t("cancelPayment")}
              </button>
            </div>
          </>
        )}

        {stage === "processing" && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="h-14 w-14 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
            <p className="mt-6 text-base font-semibold">{t("processingPayment")}</p>
          </div>
        )}

        {stage === "success" && (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <CheckCircle2 className="h-20 w-20 text-green-600" />
            <p className="mt-4 text-xl font-extrabold">{t("paymentSuccessful")}</p>
            <p className="mt-3 text-xs text-muted-foreground">{t("paymentIdLabel")}</p>
            <p className="text-sm font-mono font-bold">{paymentId}</p>
            <p className="mt-4 text-3xl font-extrabold text-primary">₹{advancePaid.toFixed(2)}</p>
            {method === "cod" && codRemaining > 0 && (
              <p className="mt-1 text-xs text-muted-foreground">
                ₹{codRemaining.toFixed(2)} {t("remainingOnDelivery")}
              </p>
            )}
            <button onClick={onViewOrder} className="btn-primary w-full mt-8">
              {t("viewOrderBtn")}
            </button>
          </div>
        )}

        {stage === "error" && (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <p className="text-sm text-destructive font-semibold">
              Something went wrong placing your order. Please try again.
            </p>
            <button onClick={onCancel} className="btn-primary w-full mt-6">
              {t("back")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
