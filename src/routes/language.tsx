import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useLang, type Lang } from "@/lib/i18n";

export const Route = createFileRoute("/language")({
  head: () => ({ meta: [{ title: "Choose Language — AgriConnect" }] }),
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
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      <div className="max-w-xl w-full text-center space-y-8">
        <div>
          <h1 className="text-4xl font-bold">AgriConnect</h1>
          <p className="mt-3 text-muted-foreground">
            English · हिंदी · मराठी
          </p>
        </div>
        <div className="grid grid-cols-1 gap-3">
          {options.map((o) => (
            <button
              key={o.code}
              onClick={() => pick(o.code)}
              className="rounded-lg border border-border bg-card p-6 hover:bg-accent transition-colors text-left"
            >
              <div className="text-2xl font-semibold">{o.label}</div>
              <div className="mt-1 text-sm text-muted-foreground">{o.sub}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
