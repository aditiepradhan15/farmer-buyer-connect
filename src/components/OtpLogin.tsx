import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/lib/supabase";
import { useLang, LanguageSwitcher } from "@/lib/i18n";

type Props = {
  title: string;
  /** Called with the verified phone number. Return an error message string to display, or null on success. */
  onVerified: (phone: string) => Promise<string | null>;
};

export function OtpLogin({ title, onVerified }: Props) {
  const { t } = useLang();
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function sendOtp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { error: fnError } = await supabase.functions.invoke("send-otp", {
      body: { phone: phone.trim() },
    });
    setLoading(false);
    if (fnError) return setError(fnError.message || t("otpSendFailed"));
    setCode("");
    setStep("otp");
  }

  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { data, error: fnError } = await supabase.functions.invoke("verify-otp", {
      body: { phone: phone.trim(), code: code.trim() },
    });
    if (fnError || !data || (data as { verified?: boolean }).verified === false) {
      setLoading(false);
      return setError(t("incorrectCode"));
    }
    const loginError = await onVerified(phone.trim());
    setLoading(false);
    if (loginError) setError(loginError);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 relative">
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>
      <form
        onSubmit={step === "phone" ? sendOtp : verifyOtp}
        className="w-full max-w-sm space-y-4 bg-card border border-border rounded-lg p-6"
      >
        <div>
          <Link to="/" className="text-sm text-muted-foreground hover:underline">
            ← {t("back")}
          </Link>
          <h1 className="text-2xl font-semibold mt-2">{title}</h1>
          <p className="text-sm text-muted-foreground">
            {step === "phone" ? t("enterPhone") : t("enterOtp")}
          </p>
        </div>

        {step === "phone" ? (
          <input
            type="tel"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder={t("phonePlaceholder")}
            className="w-full px-3 py-2 border border-input rounded-md bg-background"
          />
        ) : (
          <>
            <div className="text-sm text-muted-foreground">
              {t("otpSentTo")}: <span className="font-medium text-foreground">{phone}</span>
            </div>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder={t("codePlaceholder")}
              className="w-full px-3 py-2 border border-input rounded-md bg-background tracking-widest text-center text-lg"
            />
          </>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-primary text-primary-foreground rounded-md py-2 font-medium hover:bg-primary/90 disabled:opacity-50"
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
              setCode("");
            }}
            className="w-full text-sm text-muted-foreground hover:underline"
          >
            ← {t("changePhone")}
          </button>
        )}
      </form>
    </div>
  );
}
