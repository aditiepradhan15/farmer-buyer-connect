import { useRef, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { supabase, normalizePhone } from "@/lib/supabase";
import { useLang, LanguageSwitcher } from "@/lib/i18n";
import { PhoneFrame } from "@/components/AppShell";
import { ArrowLeft, Leaf } from "lucide-react";

export type VerifiedResult = "ok" | "register" | string;

type Props = {
  title: string;
  onVerified: (phone: string) => Promise<VerifiedResult>;
  renderRegister?: (phone: string) => ReactNode;
};

export function OtpLogin({ title, onVerified, renderRegister }: Props) {
  const { t } = useLang();
  const [step, setStep] = useState<"phone" | "otp" | "register">("phone");
  const [phone, setPhone] = useState("");
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const refs = useRef<Array<HTMLInputElement | null>>([]);

  const code = digits.join("");

  async function sendOtp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const normalized = normalizePhone(phone);
    setPhone(normalized);
    const { error: fnError } = await supabase.functions.invoke("send-otp", {
      body: { phone: normalized },
    });
    setLoading(false);
    if (fnError) return setError(fnError.message || t("otpSendFailed"));
    setDigits(["", "", "", "", "", ""]);
    setStep("otp");
    setTimeout(() => refs.current[0]?.focus(), 50);
  }

  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const normalized = normalizePhone(phone);
    const { data, error: fnError } = await supabase.functions.invoke("verify-otp", {
      body: { phone: normalized, code: code.trim() },
    });
    if (fnError || !data || (data as { verified?: boolean }).verified === false) {
      setLoading(false);
      return setError(t("incorrectCode"));
    }
    const result = await onVerified(normalized);
    setLoading(false);
    if (result === "ok") return;
    if (result === "register") {
      if (renderRegister) setStep("register");
      else setError(t("otpSendFailed"));
      return;
    }
    setError(result);
  }

  function setDigit(i: number, v: string) {
    const clean = v.replace(/\D/g, "").slice(-1);
    setDigits((d) => {
      const next = [...d];
      next[i] = clean;
      return next;
    });
    if (clean && i < 5) refs.current[i + 1]?.focus();
  }

  function onKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      refs.current[i - 1]?.focus();
    }
  }

  if (step === "register" && renderRegister) {
    return (
      <PhoneFrame>
        <div className="px-5 pt-6 pb-10">
          <div className="flex items-center justify-between">
            <Link to="/" className="grid place-items-center h-10 w-10 rounded-full bg-card shadow-sm">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <LanguageSwitcher />
          </div>
          <div className="mt-6">{renderRegister(normalizePhone(phone))}</div>
        </div>
      </PhoneFrame>
    );
  }

  // Show digits without +91 prefix for display in the input.
  const phoneDigits = phone.startsWith("+91") ? phone.slice(3) : phone;

  return (
    <PhoneFrame>
      <div className="px-5 pt-6 pb-10">
        <div className="flex items-center justify-between">
          <Link to="/" className="grid place-items-center h-10 w-10 rounded-full bg-card shadow-sm">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <LanguageSwitcher />
        </div>

        <div className="mt-6 text-center">
          <div className="mx-auto grid place-items-center h-14 w-14 rounded-2xl bg-primary-soft text-primary">
            <Leaf className="h-7 w-7" />
          </div>
          <h1 className="mt-3 text-2xl font-extrabold tracking-tight">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {step === "phone" ? t("enterPhone") : t("enterOtp")}
          </p>
        </div>

        <form
          onSubmit={step === "phone" ? sendOtp : verifyOtp}
          className="mt-8 card-soft p-5 space-y-4"
        >
          {step === "phone" ? (
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-2">
                {t("phonePlaceholder")}
              </label>
              <div className="flex items-stretch gap-2">
                <div className="grid place-items-center px-3 rounded-xl bg-primary-soft text-primary font-bold">
                  +91
                </div>
                <input
                  type="tel"
                  required
                  value={phoneDigits}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  placeholder="98765 43210"
                  className="input-app flex-1 tracking-wider"
                  inputMode="numeric"
                />
              </div>
            </div>
          ) : (
            <div>
              <div className="text-xs text-muted-foreground text-center mb-3">
                {t("otpSentTo")}:{" "}
                <span className="font-semibold text-foreground">{phone}</span>
              </div>
              <div className="flex justify-between gap-2">
                {digits.map((d, i) => (
                  <input
                    key={i}
                    ref={(el) => {
                      refs.current[i] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    value={d}
                    onChange={(e) => setDigit(i, e.target.value)}
                    onKeyDown={(e) => onKeyDown(i, e)}
                    className="w-11 h-14 text-center text-2xl font-bold rounded-xl border border-input bg-white focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                ))}
              </div>
            </div>
          )}

          {error && (
            <p className="text-sm text-destructive text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || (step === "otp" && code.length < 6)}
            className="btn-primary w-full"
          >
            {loading
              ? "..."
              : step === "phone"
                ? t("sendOtp")
                : t("verifyOtp")}
          </button>

          {step === "otp" && (
            <button
              type="button"
              onClick={() => {
                setStep("phone");
                setError("");
                setDigits(["", "", "", "", "", ""]);
              }}
              className="w-full text-sm text-muted-foreground py-1"
            >
              ← {t("changePhone")}
            </button>
          )}
        </form>
      </div>
    </PhoneFrame>
  );
}
