import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useLang, type Lang } from "@/lib/i18n";
import { PhoneFrame } from "@/components/AppShell";
import { Leaf } from "lucide-react";

export const Route = createFileRoute("/language")({
  head: () => ({ meta: [{ title: "Choose Language — Mitti & Market" }] }),
  component: LanguagePage,
});

const options: { code: Lang; label: string; sub: string }[] = [
  { code: "en", label: "English", sub: "Choose your language" },
  { code: "hi", label: "हिंदी", sub: "अपनी भाषा चुनें" },
  { code: "mr", label: "मराठी", sub: "तुमची भाषा निवडा" },
];

function LanguagePage() {
  const { setLang } = useLang();
  const navigate = useNavigate();

  function pick(l: Lang) {
    setLang(l);
    navigate({ to: "/" });
  }

  return (
    <PhoneFrame>
      <div className="px-6 pt-16 pb-10 flex flex-col min-h-screen">
        <div className="text-center">
          <div className="mx-auto grid place-items-center h-16 w-16 rounded-2xl bg-primary-soft text-primary shadow-sm">
            <Leaf className="h-8 w-8" />
          </div>
          <h1 className="mt-4 text-3xl font-extrabold text-foreground tracking-tight">
            Mitti & Market
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            किसान से सीधे आपके पास
          </p>
        </div>

        <div className="mt-10 space-y-3">
          {options.map((o) => (
            <button
              key={o.code}
              onClick={() => pick(o.code)}
              className="w-full card-soft border border-border/60 p-5 text-left active:scale-[0.99] transition-transform"
            >
              <div className="text-2xl font-bold">{o.label}</div>
              <div className="mt-1 text-sm text-muted-foreground">{o.sub}</div>
            </button>
          ))}
        </div>
      </div>
    </PhoneFrame>
  );
}
