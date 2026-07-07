import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase, adjustTrustScore } from "@/lib/supabase";

const ADMIN_PASSWORD = "REPLACE_THIS_WITH_YOUR_PASSWORD";

export const Route = createFileRoute("/admin-mm")({
  head: () => ({ meta: [{ title: "Admin" }, { name: "robots", content: "noindex" }] }),
  component: AdminMM,
});

type Stats = { totalOrders: number; disputed: number; delivered: number; farmers: number };

type DisputedRow = {
  id: string;
  total_price: number;
  otp_failed_attempts: number | null;
  farmer_id: string;
  buyer_id: string;
  buyers: { name: string } | null;
  farmers: { name: string } | null;
  listings: { crop_type: string } | null;
};

type RecentOrder = {
  id: string;
  status: string;
  buyers: { name: string } | null;
  farmers: { name: string } | null;
  listings: { crop_type: string } | null;
};

function AdminMM() {
  const [pwd, setPwd] = useState("");
  const [authed, setAuthed] = useState(false);
  const [error, setError] = useState(false);

  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (pwd === ADMIN_PASSWORD) {
              setAuthed(true);
              setError(false);
            } else {
              setError(true);
            }
          }}
          className="w-full max-w-sm bg-card border border-border rounded-md p-6 space-y-4"
        >
          <h1 className="text-lg font-semibold">Admin</h1>
          <input
            type="password"
            value={pwd}
            onChange={(e) => setPwd(e.target.value)}
            className="w-full border border-border rounded-md px-3 py-2 bg-background"
            placeholder="Password"
            autoFocus
          />
          <button
            type="submit"
            className="w-full bg-primary text-primary-foreground rounded-md px-4 py-2 font-medium"
          >
            Enter
          </button>
          {error && <p className="text-sm text-red-600">Access denied</p>}
        </form>
      </div>
    );
  }

  return <Panel />;
}

function statusClass(status: string) {
  switch (status) {
    case "placed": return "bg-yellow-100 text-yellow-900";
    case "confirmed": return "bg-blue-100 text-blue-900";
    case "delivered": return "bg-green-100 text-green-900";
    case "cancelled": return "bg-red-100 text-red-900";
    case "disputed": return "bg-orange-100 text-orange-900";
    case "resolved_farmer": return "bg-emerald-100 text-emerald-900";
    case "resolved_buyer": return "bg-purple-100 text-purple-900";
    default: return "bg-secondary text-secondary-foreground";
  }
}

function Panel() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [disputed, setDisputed] = useState<DisputedRow[]>([]);
  const [recent, setRecent] = useState<RecentOrder[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  async function refresh() {
    const [oAll, oDisp, oDeli, fCount, disp, rec] = await Promise.all([
      supabase.from("orders").select("*", { count: "exact", head: true }),
      supabase.from("orders").select("*", { count: "exact", head: true }).eq("status", "disputed"),
      supabase.from("orders").select("*", { count: "exact", head: true }).eq("status", "delivered"),
      supabase.from("farmers").select("*", { count: "exact", head: true }),
      supabase
        .from("orders")
        .select("id, total_price, otp_failed_attempts, farmer_id, buyer_id, buyers(name), farmers(name), listings(crop_type)")
        .eq("status", "disputed")
        .order("id", { ascending: false }),
      supabase
        .from("orders")
        .select("id, status, buyers(name), farmers(name), listings(crop_type)")
        .order("id", { ascending: false })
        .limit(10),
    ]);
    setStats({
      totalOrders: oAll.count ?? 0,
      disputed: oDisp.count ?? 0,
      delivered: oDeli.count ?? 0,
      farmers: fCount.count ?? 0,
    });
    if (disp.data) setDisputed(disp.data as unknown as DisputedRow[]);
    if (rec.data) setRecent(rec.data as unknown as RecentOrder[]);
  }

  useEffect(() => {
    refresh();
    const iv = setInterval(refresh, 8000);
    return () => clearInterval(iv);
  }, []);

  async function resolve(order: DisputedRow, side: "farmer" | "buyer") {
    setBusy(order.id);
    const newStatus = side === "farmer" ? "resolved_farmer" : "resolved_buyer";
    const { data, error } = await supabase
      .from("orders")
      .update({ status: newStatus })
      .eq("id", order.id)
      .eq("status", "disputed")
      .select("id")
      .maybeSingle();
    if (error || !data) {
      setBusy(null);
      if (error) alert(error.message);
      refresh();
      return;
    }
    if (side === "farmer") {
      await adjustTrustScore("farmers", order.farmer_id, 10);
      await adjustTrustScore("buyers", order.buyer_id, -15);
    } else {
      await adjustTrustScore("buyers", order.buyer_id, 10);
      await adjustTrustScore("farmers", order.farmer_id, -10);
    }
    setBusy(null);
    refresh();
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-6xl mx-auto px-4 py-8 space-y-10">
        <section>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Total Orders", val: stats?.totalOrders },
              { label: "Disputed", val: stats?.disputed },
              { label: "Delivered", val: stats?.delivered },
              { label: "Farmers", val: stats?.farmers },
            ].map((s) => (
              <div key={s.label} className="bg-card border border-border rounded-md p-4">
                <div className="text-2xl font-bold">{s.val ?? "—"}</div>
                <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-4">Disputed Orders</h2>
          {disputed.length === 0 ? (
            <p className="text-sm text-muted-foreground">No disputed orders.</p>
          ) : (
            <div className="space-y-3">
              {disputed.map((o) => (
                <div key={o.id} className="bg-card border border-border rounded-md p-4">
                  <div className="text-sm space-y-1">
                    <div className="font-mono text-xs text-muted-foreground">#{o.id.slice(0, 8)}</div>
                    <div>Buyer: {o.buyers?.name ?? "—"}</div>
                    <div>Farmer: {o.farmers?.name ?? "—"}</div>
                    <div>Crop: {o.listings?.crop_type ?? "—"}</div>
                    <div>Total: ₹{o.total_price}</div>
                    <div>Failed OTP attempts: {o.otp_failed_attempts ?? 0}</div>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-3">
                    <button
                      onClick={() => resolve(o, "farmer")}
                      disabled={busy === o.id}
                      className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
                    >
                      Release to Farmer
                    </button>
                    <button
                      onClick={() => resolve(o, "buyer")}
                      disabled={busy === o.id}
                      className="bg-secondary text-secondary-foreground border border-border rounded-md px-4 py-2 text-sm font-medium hover:bg-accent disabled:opacity-50"
                    >
                      Refund to Buyer
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-4">Recent Orders</h2>
          {recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">No orders yet.</p>
          ) : (
            <div className="overflow-x-auto bg-card border border-border rounded-md">
              <table className="w-full text-sm">
                <thead className="bg-muted text-muted-foreground">
                  <tr>
                    <th className="text-left px-3 py-2">Buyer</th>
                    <th className="text-left px-3 py-2">Farmer</th>
                    <th className="text-left px-3 py-2">Crop</th>
                    <th className="text-left px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((o) => (
                    <tr key={o.id} className="border-t border-border">
                      <td className="px-3 py-2">{o.buyers?.name ?? "—"}</td>
                      <td className="px-3 py-2">{o.farmers?.name ?? "—"}</td>
                      <td className="px-3 py-2">{o.listings?.crop_type ?? "—"}</td>
                      <td className="px-3 py-2">
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${statusClass(o.status)}`}>
                          {o.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
