import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Bell, Leaf } from "lucide-react";
import { useLang } from "@/lib/i18n";

/** Mobile phone-frame wrapper used by every screen. */
export function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <div className="phone-frame">{children}</div>
    </div>
  );
}

/** Top brand bar used inside post-login home screens. */
export function TopBar({
  right,
  title = "Mitti & Market",
}: {
  right?: ReactNode;
  title?: string;
}) {
  const { t } = useLang();
  return (
    <div className="flex items-center justify-between px-5 pt-5 pb-3">
      <Link to="/" className="flex items-center gap-2 text-primary">
        <span className="grid place-items-center h-9 w-9 rounded-full bg-primary-soft">
          <Leaf className="h-5 w-5" />
        </span>
        <span className="font-extrabold text-lg tracking-tight text-foreground">
          {title}
        </span>
      </Link>
      <div className="flex items-center gap-2">
        {right ?? (
          <button
            type="button"
            aria-label={t("notificationsLabel")}
            className="grid place-items-center h-10 w-10 rounded-full bg-card shadow-sm"
          >
            <Bell className="h-5 w-5 text-foreground" />
          </button>
        )}
      </div>
    </div>
  );
}

export type BottomTab = {
  key: string;
  label: string;
  icon: ReactNode;
};

export function BottomNav({
  tabs,
  active,
  onChange,
}: {
  tabs: BottomTab[];
  active: string;
  onChange: (key: string) => void;
}) {
  return (
    <>
      {/* spacer so content isn't hidden behind fixed bar */}
      <div className="h-24" aria-hidden />
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-40">
        <div className="mx-3 mb-3 bg-card rounded-3xl shadow-[0_8px_30px_-8px_rgba(0,0,0,0.15)] border border-border/60">
          <ul className="grid grid-cols-3">
            {tabs.map((t) => {
              const isActive = t.key === active;
              return (
                <li key={t.key}>
                  <button
                    type="button"
                    onClick={() => onChange(t.key)}
                    className={`w-full flex flex-col items-center gap-1 py-3 rounded-3xl transition-colors ${
                      isActive
                        ? "text-primary"
                        : "text-muted-foreground"
                    }`}
                  >
                    <span
                      className={`grid place-items-center h-9 w-9 rounded-2xl ${
                        isActive ? "bg-primary-soft" : ""
                      }`}
                    >
                      {t.icon}
                    </span>
                    <span className="text-xs font-semibold">{t.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </nav>
    </>
  );
}

/** Colored status pill shared across roles. */
export function StatusPill({ status }: { status: string }) {
  const { t } = useLang();
  const map: Record<string, string> = {
    placed: "bg-yellow-100 text-yellow-900",
    confirmed: "bg-blue-100 text-blue-900",
    delivered: "bg-green-100 text-green-900",
    cancelled: "bg-red-100 text-red-900",
    disputed: "bg-orange-100 text-orange-900",
    resolved_farmer: "bg-green-100 text-green-900",
    resolved_buyer: "bg-green-100 text-green-900",
  };
  const labelMap: Record<string, string> = {
    placed: t("statusPlaced"),
    confirmed: t("statusConfirmed"),
    delivered: t("statusDelivered"),
    cancelled: t("statusCancelled"),
    disputed: t("statusDisputed"),
    resolved_farmer: t("statusResolvedFarmer"),
    resolved_buyer: t("statusResolvedBuyer"),
  };
  return (
    <span
      className={`inline-flex items-center text-[11px] font-semibold px-2.5 py-1 rounded-full ${
        map[status] ?? "bg-secondary text-secondary-foreground"
      }`}
    >
      {labelMap[status] ?? status.replace("_", " ")}
    </span>
  );
}

/** Emoji for crop name (best-effort match). */
export function cropEmoji(crop: string): string {
  const c = (crop || "").toLowerCase();
  if (c.includes("onion")) return "🧅";
  if (c.includes("tomato")) return "🍅";
  if (c.includes("wheat")) return "🌾";
  if (c.includes("rice")) return "🍚";
  if (c.includes("potato")) return "🥔";
  if (c.includes("leaf") || c.includes("spinach") || c.includes("green")) return "🥬";
  if (c.includes("corn") || c.includes("maize")) return "🌽";
  if (c.includes("mango")) return "🥭";
  if (c.includes("grape")) return "🍇";
  if (c.includes("garlic")) return "🧄";
  if (c.includes("soy")) return "🫘";
  if (c.includes("chili") || c.includes("chilli") || c.includes("pepper")) return "🌶️";
  if (c.includes("carrot")) return "🥕";
  if (c.includes("apple")) return "🍎";
  return "🌱";
}

/** Circular progress used for trust score display. */
export function TrustRing({ score, size = 84 }: { score: number; size?: number }) {
  const pct = Math.max(0, Math.min(100, score));
  const stroke = 8;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = (pct / 100) * c;
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#e4ebe0"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--primary)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c}`}
        />
      </svg>
      <div className="absolute text-center">
        <div className="text-xl font-extrabold text-foreground">{pct}</div>
        <div className="text-[9px] text-muted-foreground -mt-0.5">/ 100</div>
      </div>
    </div>
  );
}

/** Horizontal 5-step order tracker. */
const STEP_KEYS = ["placed", "confirmed", "driver", "transit", "delivered"] as const;

export function OrderTracker({
  status,
  hasDriver,
  hasOtp,
}: {
  status: string;
  hasDriver: boolean;
  hasOtp: boolean;
}) {
  const { t } = useLang();
  const labels: Record<(typeof STEP_KEYS)[number], string> = {
    placed: t("trackPlaced"),
    confirmed: t("trackConfirmed"),
    driver: t("trackDriver"),
    transit: t("trackTransit"),
    delivered: t("trackDelivered"),
  };
  let stepIndex = 0;
  if (status === "placed") stepIndex = 0;
  else if (status === "confirmed" && !hasDriver) stepIndex = 1;
  else if (status === "confirmed" && hasDriver && !hasOtp) stepIndex = 2;
  else if (status === "confirmed" && hasDriver && hasOtp) stepIndex = 3;
  else if (status === "delivered") stepIndex = 4;
  else if (status === "cancelled" || status === "disputed") stepIndex = -1;


  return (
    <div className="flex items-center gap-1 mt-3">
      {STEP_KEYS.map((key, i) => {
        const done = stepIndex >= i && stepIndex !== -1;
        const current = stepIndex === i;
        return (
          <div key={key} className="flex-1 flex flex-col items-center">
            <div
              className={`h-1.5 w-full rounded-full ${
                done ? "bg-primary" : "bg-border"
              }`}
            />
            <div
              className={`mt-1.5 text-[10px] font-semibold text-center leading-tight ${
                current
                  ? "text-primary"
                  : done
                    ? "text-foreground"
                    : "text-muted-foreground"
              }`}
            >
              {labels[key]}
            </div>
          </div>
        );
      })}
    </div>
  );
}
