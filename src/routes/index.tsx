import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AgriConnect — Farmers & Buyers" },
      { name: "description", content: "Connect farmers and buyers directly." },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      <div className="max-w-xl w-full text-center space-y-8">
        <div>
          <h1 className="text-4xl font-bold text-foreground">AgriConnect</h1>
          <p className="mt-3 text-muted-foreground">
            Are you a Farmer or a Buyer?
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link
            to="/farmer"
            className="rounded-lg border border-border bg-card p-8 hover:bg-accent transition-colors"
          >
            <div className="text-2xl font-semibold">🌾 Farmer</div>
            <div className="mt-2 text-sm text-muted-foreground">
              Sell your crops directly to buyers
            </div>
          </Link>
          <Link
            to="/buyer"
            className="rounded-lg border border-border bg-card p-8 hover:bg-accent transition-colors"
          >
            <div className="text-2xl font-semibold">🛒 Buyer</div>
            <div className="mt-2 text-sm text-muted-foreground">
              Browse the marketplace and order
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
