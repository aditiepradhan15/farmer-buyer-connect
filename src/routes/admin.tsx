import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase, adjustTrustScore, type Admin } from "@/lib/supabase";
import { LanguageSwitcher } from "@/lib/i18n";
import { OtpLogin } from "@/components/OtpLogin";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin — AgriConnect" }] }),
  component: AdminPage,
});

function AdminPage() {
  const [admin, setAdmin] = useState<Admin | null>(null);

  if (admin) return <AdminDashboard admin={admin} onLogout={() => setAdmin(null)} />;

  return (
    <OtpLogin
      title="Admin Login"
      onVerified={async (phone) => {
        const { data, error } = await supabase
          .from("admins")
          .select("*")
          .eq("phone", phone)
          .maybeSingle();
        if (error) return error.message;
        if (!data) return "You are not authorized as an admin.";
        setAdmin(data as Admin);
        return "ok";
      }}
    />
  );
}

type Stats = {
  farmers: number;
  buyers: number;
  drivers: number;
  totalOrders: number;
  disputed: number;
  delivered: number;
};

type DisputedRow = {
  id: string;
  quantity_kg: number;
  total_price: number;
  otp_failed_attempts: number | null;
  driver_id: string | null;
  buyers: { name: string } | null;
  farmers: { name: string } | null;
  drivers: { name: string } | null;
  listings: { crop_type: string } | null;
  farmer_id: string;
  buyer_id: string;
};

type RecentOrder = {
  id: string;
  quantity_kg: number;
  total_price: number;
  status: string;
  buyers: { name: string } | null;
  farmers: { name: string } | null;
  listings: { crop_type: string } | null;
};

type UserRow = { id: string; name: string; phone: string; trust_score: number };

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

function AdminDashboard({ admin, onLogout }: { admin: Admin; onLogout: () => void }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [disputed, setDisputed] = useState<DisputedRow[]>([]);
  const [recent, setRecent] = useState<RecentOrder[]>([]);
  const [farmers, setFarmers] = useState<UserRow[]>([]);
  const [buyers, setBuyers] = useState<UserRow[]>([]);
  const [drivers, setDrivers] = useState<UserRow[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  async function refresh() {
    const [f, b, d, oAll, oDisp, oDeli, disp, rec, fList, bList, dList] = await Promise.all([
      supabase.from("farmers").select("*", { count: "exact", head: true }),
      supabase.from("buyers").select("*", { count: "exact", head: true }),
      supabase.from("drivers").select("*", { count: "exact", head: true }),
      supabase.from("orders").select("*", { count: "exact", head: true }),
      supabase.from("orders").select("*", { count: "exact", head: true }).eq("status", "disputed"),
      supabase.from("orders").select("*", { count: "exact", head: true }).eq("status", "delivered"),
      supabase
        .from("orders")
        .select("id, quantity_kg, total_price, otp_failed_attempts, driver_id, farmer_id, buyer_id, buyers(name), farmers(name), drivers(name), listings(crop_type)")
        .eq("status", "disputed")
        .order("id", { ascending: false }),
      supabase
        .from("orders")
        .select("id, quantity_kg, total_price, status, buyers(name), farmers(name), listings(crop_type)")
        .order("id", { ascending: false })
        .limit(20),
      supabase.from("farmers").select("id, name, phone, trust_score").order("trust_score", { ascending: false }),
      supabase.from("buyers").select("id, name, phone, trust_score").order("trust_score", { ascending: false }),
      supabase.from("drivers").select("id, name, phone, trust_score").order("trust_score", { ascending: false }),
    ]);
    setStats({
      farmers: f.count ?? 0,
      buyers: b.count ?? 0,
      drivers: d.count ?? 0,
      totalOrders: oAll.count ?? 0,
      disputed: oDisp.count ?? 0,
      delivered: oDeli.count ?? 0,
    });
    if (disp.data) setDisputed(disp.data as unknown as DisputedRow[]);
    if (rec.data) setRecent(rec.data as unknown as RecentOrder[]);
    if (fList.data) setFarmers(fList.data as UserRow[]);
    if (bList.data) setBuyers(bList.data as UserRow[]);
    if (dList.data) setDrivers(dList.data as UserRow[]);
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
      <header className="border-b border-border bg-card">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center gap-3">
          <div>
            <h1 className="text-xl font-semibold">Admin · {admin.name}</h1>
            <p className="text-sm text-muted-foreground">Platform administration</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <button onClick={onLogout} className="text-sm text-muted-foreground hover:underline">
              Logout
            </button>
            <LanguageSwitcher />
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-10">
        {/* Section 1 — Stats */}
        <section>
          <h2 className="text-lg font-semibold mb-4">Platform Stats</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: "Farmers", val: stats?.farmers },
              { label: "Buyers", val: stats?.buyers },
              { label: "Drivers", val: stats?.drivers },
              { label: "Total Orders", val: stats?.totalOrders },
              { label: "Disputed", val: stats?.disputed },
              { label: "Delivered", val: stats?.delivered },
            ].map((s) => (
              <div key={s.label} className="bg-card border border-border rounded-md p-4">
                <div className="text-xs text-muted-foreground">{s.label}</div>
                <div className="text-2xl font-bold mt-1">{s.val ?? "—"}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Section 2 — Disputed */}
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
                    <div className="font-medium text-base">
                      {o.listings?.crop_type ?? "—"} · {o.quantity_kg} kg · ₹{o.total_price}
                    </div>
                    <div className="text-muted-foreground">Buyer: {o.buyers?.name ?? "—"}</div>
                    <div className="text-muted-foreground">Farmer: {o.farmers?.name ?? "—"}</div>
                    <div className="text-muted-foreground">
                      Driver: {o.driver_id ? (o.drivers?.name ?? "—") : "No driver"}
                    </div>
                    <div className="text-muted-foreground">
                      Failed OTP attempts: {o.otp_failed_attempts ?? 0}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-3">
                    <button
                      onClick={() => resolve(o, "farmer")}
                      disabled={busy === o.id}
                      className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
                    >
                      {busy === o.id ? "..." : "Release to Farmer"}
                    </button>
                    <button
                      onClick={() => resolve(o, "buyer")}
                      disabled={busy === o.id}
                      className="bg-secondary text-secondary-foreground border border-border rounded-md px-4 py-2 text-sm font-medium hover:bg-accent disabled:opacity-50"
                    >
                      {busy === o.id ? "..." : "Refund to Buyer"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Section 3 — Recent Orders */}
        <section>
          <h2 className="text-lg font-semibold mb-4">Recent Orders</h2>
          {recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">No orders yet.</p>
          ) : (
            <div className="overflow-x-auto bg-card border border-border rounded-md">
              <table className="w-full text-sm">
                <thead className="bg-muted text-muted-foreground">
                  <tr>
                    <th className="text-left px-3 py-2">ID</th>
                    <th className="text-left px-3 py-2">Buyer</th>
                    <th className="text-left px-3 py-2">Farmer</th>
                    <th className="text-left px-3 py-2">Crop</th>
                    <th className="text-right px-3 py-2">Qty (kg)</th>
                    <th className="text-right px-3 py-2">Total</th>
                    <th className="text-left px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((o) => (
                    <tr key={o.id} className="border-t border-border">
                      <td className="px-3 py-2 font-mono text-xs">{o.id.slice(0, 8)}</td>
                      <td className="px-3 py-2">{o.buyers?.name ?? "—"}</td>
                      <td className="px-3 py-2">{o.farmers?.name ?? "—"}</td>
                      <td className="px-3 py-2">{o.listings?.crop_type ?? "—"}</td>
                      <td className="px-3 py-2 text-right">{o.quantity_kg}</td>
                      <td className="px-3 py-2 text-right">₹{o.total_price}</td>
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

        {/* Section 4 — All Users */}
        <section>
          <h2 className="text-lg font-semibold mb-4">All Users</h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <UserList title="Farmers" rows={farmers} />
            <UserList title="Buyers" rows={buyers} />
            <UserList title="Drivers" rows={drivers} />
          </div>
        </section>
      </main>
    </div>
  );
}

function UserList({ title, rows }: { title: string; rows: UserRow[] }) {
  return (
    <div className="bg-card border border-border rounded-md">
      <div className="px-3 py-2 border-b border-border font-medium">
        {title} ({rows.length})
      </div>
      {rows.length === 0 ? (
        <div className="px-3 py-4 text-sm text-muted-foreground">None.</div>
      ) : (
        <ul className="divide-y divide-border">
          {rows.map((r) => (
            <li key={r.id} className="px-3 py-2 flex justify-between items-center gap-3 text-sm">
              <div className="min-w-0">
                <div className="font-medium truncate">{r.name}</div>
                <div className="text-xs text-muted-foreground truncate">{r.phone}</div>
              </div>
              <div className="text-xs font-medium bg-secondary text-secondary-foreground px-2 py-0.5 rounded shrink-0">
                {r.trust_score}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
