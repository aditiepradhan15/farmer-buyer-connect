import { useState } from "react";
import { CreditCard, Smartphone, Banknote, CheckCircle2, X } from "lucide-react";
import { useLang } from "@/lib/i18n";
import { cropEmoji } from "@/components/AppShell";

export type PaymentMethod = "card" | "upi" | "cod";

const PLATFORM_FEE_RATE = 0.07;

function generateFakePaymentId(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let id = "";
  for (let i = 0; i < 10; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return `PAY_${id}`;
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
   * order insert + listing status update, and return the row id created (or
   * null on failure). Payment fields are passed so the caller can persist them. */
  onConfirm: (payment: {
    method: PaymentMethod;
    paymentId: string;
    totalWithFee: number;
  }) => Promise<boolean>;
  onViewOrder: () => void;
}) {
  const { t } = useLang();
  const [method, setMethod] = useState<PaymentMethod | null>(null);
  const [stage, setStage] = useState<"select" | "processing" | "success" | "error">("select");
  const [paymentId, setPaymentId] = useState("");

  const subtotal = quantityKg * pricePerKg;
  const fee = Math.round(subtotal * PLATFORM_FEE_RATE * 100) / 100;
  const total = Math.round((subtotal + fee) * 100) / 100;

  function handlePay() {
    if (!method) return;
    setStage("processing");
    const fakeId = generateFakePaymentId();
    setTimeout(async () => {
      const ok = await onConfirm({ method, paymentId: fakeId, totalWithFee: total });
      if (ok) {
        setPaymentId(fakeId);
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
                  { key: "card" as const, icon: <CreditCard className="h-5 w-5" />, emoji: "💳", label: t("cardPayment") },
                  { key: "upi" as const, icon: <Smartphone className="h-5 w-5" />, emoji: "📱", label: t("upiPayment") },
                  { key: "cod" as const, icon: <Banknote className="h-5 w-5" />, emoji: "💵", label: t("codPayment") },
                ]
              ).map((opt) => {
                const active = method === opt.key;
                return (
                  <button
                    key={opt.key}
                    onClick={() => setMethod(opt.key)}
                    className={`w-full flex items-center gap-3 p-4 rounded-2xl border transition-colors text-left ${
                      active
                        ? "border-primary bg-primary-soft"
                        : "border-border/60 bg-card"
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

            <div className="mt-6 space-y-2">
              <button
                onClick={handlePay}
                disabled={!method}
                className="w-full rounded-2xl bg-green-600 text-white font-bold py-3.5 text-base disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.99] transition-transform"
              >
                {t("payLabel")} ₹{total.toFixed(2)}
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
            <p className="mt-4 text-3xl font-extrabold text-primary">₹{total.toFixed(2)}</p>
            <button
              onClick={onViewOrder}
              className="btn-primary w-full mt-8"
            >
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
