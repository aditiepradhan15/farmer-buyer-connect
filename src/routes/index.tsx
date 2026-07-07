import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useLang, LanguageSwitcher } from "@/lib/i18n";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AgriConnect — Farmers, Buyers & Drivers" },
      { name: "description", content: "Connect farmers, buyers, and drivers directly." },
    ],
  }),
  component: Index,
});

function Index() {
  const { lang, t } = useLang();
  const navigate = useNavigate();

  useEffect(() => {
    if (lang === null) navigate({ to: "/language" });
  }, [lang, navigate]);

  if (lang === null) return null;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 relative">
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>
      <div className="max-w-2xl w-full text-center space-y-8">
        <div>
          <h1 className="text-4xl font-bold text-foreground">{t("appName")}</h1>
          <p className="mt-3 text-muted-foreground">{t("whoAreYou")}</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            to="/farmer"
            className="rounded-lg border border-border bg-card p-6 hover:bg-accent transition-colors"
          >
            <div className="text-xl font-semibold">🌾 {t("iAmFarmer")}</div>
            <div className="mt-2 text-sm text-muted-foreground">{t("farmerTagline")}</div>
          </Link>
          <Link
            to="/buyer"
            className="rounded-lg border border-border bg-card p-6 hover:bg-accent transition-colors"
          >
            <div className="text-xl font-semibold">🛒 {t("iAmBuyer")}</div>
            <div className="mt-2 text-sm text-muted-foreground">{t("buyerTagline")}</div>
          </Link>
          <Link
            to="/driver"
            className="rounded-lg border border-border bg-card p-6 hover:bg-accent transition-colors"
          >
            <div className="text-xl font-semibold">🚚 {t("iAmDriver")}</div>
            <div className="mt-2 text-sm text-muted-foreground">{t("driverTagline")}</div>
          </Link>
        </div>
      </div>
    </div>
  );
}
