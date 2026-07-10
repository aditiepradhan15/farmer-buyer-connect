import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useLang, LanguageSwitcher } from "@/lib/i18n";
import { PhoneFrame } from "@/components/AppShell";
import { Leaf, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Mitti & Market — Farm to table, directly" },
      {
        name: "description",
        content: "Mitti & Market connects farmers, buyers and drivers — direct from farm to you.",
      },
    ],
  }),
  component: Index,
});

const roles = [
  {
    to: "/farmer",
    emoji: "🌾",
    titleKey: "iAmFarmer",
    subKey: "farmerTagline",
  },
  {
    to: "/buyer",
    emoji: "🛒",
    titleKey: "iAmBuyer",
    subKey: "buyerTagline",
  },
  {
    to: "/driver",
    emoji: "🚚",
    titleKey: "iAmDriver",
    subKey: "driverTagline",
  },
] as const;

function Index() {
  const { lang, t } = useLang();
  const navigate = useNavigate();

  useEffect(() => {
    if (lang === null) navigate({ to: "/language" });
  }, [lang, navigate]);

  if (lang === null) return null;

  return (
    <PhoneFrame>
      <div className="px-6 pt-14 pb-10 flex flex-col min-h-screen">
        <div className="flex justify-end">
          <LanguageSwitcher />
        </div>

        <div className="text-center mt-4">
          <div className="mx-auto grid place-items-center h-16 w-16 rounded-2xl bg-primary-soft text-primary shadow-sm">
            <Leaf className="h-8 w-8" />
          </div>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight">
            Mitti & Market
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("whoAreYou")}
          </p>
        </div>

        <div className="mt-8 space-y-3">
          {roles.map((r) => (
            <Link
              key={r.to}
              to={r.to}
              className="block card-soft border border-border/60 p-5 active:scale-[0.99] transition-transform"
            >
              <div className="flex items-center gap-4">
                <div className="grid place-items-center h-14 w-14 rounded-2xl bg-primary-soft text-3xl">
                  {r.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-lg font-bold text-foreground">
                    {t(r.titleKey)}
                  </div>
                  <div className="text-sm text-muted-foreground mt-0.5">
                    {t(r.subKey)}
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </PhoneFrame>
  );
}
