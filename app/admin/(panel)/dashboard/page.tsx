import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { OrderStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";

const LABELS: Record<OrderStatus, string> = {
  PENDING: "Menunggu bayar",
  PAID: "Dibayar",
  PROCESSING: "Diproses",
  SUCCESS: "Berhasil",
  FAILED: "Gagal",
  REFUNDED: "Direfund",
};

const BADGE: Record<OrderStatus, { pill: string; dot: string }> = {
  PENDING: { pill: "bg-amber-50 text-amber-700", dot: "bg-amber-400" },
  PAID: { pill: "bg-sky-50 text-sky-700", dot: "bg-sky-400" },
  PROCESSING: { pill: "bg-indigo-50 text-indigo-700", dot: "bg-indigo-400" },
  SUCCESS: { pill: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-400" },
  FAILED: { pill: "bg-rose-50 text-rose-700", dot: "bg-rose-400" },
  REFUNDED: { pill: "bg-slate-100 text-slate-600", dot: "bg-slate-400" },
};

const rupiah = (n: number) => `Rp ${n.toLocaleString("id-ID")}`;
const num = (n: number) => n.toLocaleString("id-ID");
const DAY = 24 * 60 * 60 * 1000;
const WIB = 7 * 60 * 60 * 1000;

const card = "rounded-2xl bg-white shadow-[0_1px_2px_rgba(30,27,75,0.04),0_8px_24px_-12px_rgba(30,27,75,0.08)] ring-1 ring-slate-200/60";

function Chip({ tone, d }: { tone: string; d: string }) {
  return (
    <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${tone}`}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
        <path d={d} />
      </svg>
    </span>
  );
}

function Stat({
  title,
  value,
  hint,
  tone,
  icon,
  href,
  alert,
}: {
  title: string;
  value: string;
  hint?: string;
  tone: string;
  icon: string;
  href?: string;
  alert?: boolean;
}) {
  const body = (
    <div className={`${card} h-full p-5 transition ${href ? "hover:-translate-y-0.5 hover:shadow-md" : ""}`}>
      <div className="flex items-start justify-between">
        <Chip tone={tone} d={icon} />
        {alert && <span className="h-2 w-2 rounded-full bg-rose-400 ring-4 ring-rose-100" />}
      </div>
      <p className="mt-4 text-sm text-slate-500">{title}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums tracking-tight text-slate-900">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

function StatusBadge({ status }: { status: OrderStatus }) {
  const b = BADGE[status];
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${b.pill}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${b.dot}`} />
      {LABELS[status]}
    </span>
  );
}

function WeekChart({ days }: { days: { label: string; total: number; isToday: boolean }[] }) {
  const max = Math.max(...days.map((d) => d.total), 1);
  return (
    <div className="mt-6 flex h-44 items-end gap-3">
      {days.map((d) => {
        const h = Math.max((d.total / max) * 100, d.total > 0 ? 6 : 3);
        return (
          <div key={d.label} className="group flex h-full flex-1 flex-col items-center justify-end gap-2">
            <div className="relative flex w-full flex-1 items-end">
              <div
                title={rupiah(d.total)}
                style={{ height: `${h}%` }}
                className={`w-full rounded-t-xl transition-all ${
                  d.isToday
                    ? "bg-gradient-to-t from-indigo-400 to-violet-300"
                    : "bg-indigo-100 group-hover:bg-indigo-200"
                }`}
              />
            </div>
            <span className={`text-xs ${d.isToday ? "font-semibold text-indigo-700" : "text-slate-400"}`}>
              {d.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

async function DashboardContent() {
  await requireAdmin();
  await connection(); // harus sebelum new Date()

  const now = Date.now();
  const startOfToday = Math.floor((now + WIB) / DAY) * DAY - WIB; // 00:00 WIB
  const weekStart = new Date(startOfToday - 6 * DAY);

  const [
    totalOrders,
    pendingOrders,
    successOrders,
    totalGames,
    totalProducts,
    recentOrders,
    revenue,
    today,
    paidOrders,
    needRefund,
    weekOrders,
  ] = await Promise.all([
    prisma.order.count(),
    prisma.order.count({ where: { status: "PENDING" } }),
    prisma.order.count({ where: { status: "SUCCESS" } }),
    prisma.game.count(),
    prisma.product.count(),
    prisma.order.findMany({
      include: { game: true, product: true },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    prisma.order.aggregate({ _sum: { price: true }, where: { status: "SUCCESS" } }),
    prisma.order.aggregate({
      _sum: { price: true },
      _count: { _all: true },
      where: { status: "SUCCESS", createdAt: { gte: new Date(startOfToday) } },
    }),
    prisma.order.count({ where: { status: "PAID" } }),
    prisma.order.count({ where: { status: "FAILED", note: { contains: "refund manual" } } }),
    prisma.order.findMany({
      where: { status: "SUCCESS", createdAt: { gte: weekStart } },
      select: { createdAt: true, price: true },
    }),
  ]);

  // Pendapatan per hari (WIB), 7 hari terakhir
  const fmtDay = new Intl.DateTimeFormat("id-ID", { weekday: "short", timeZone: "Asia/Jakarta" });
  const buckets = Array.from({ length: 7 }, (_, i) => {
    const start = startOfToday - (6 - i) * DAY;
    return { start, label: fmtDay.format(new Date(start + 12 * 60 * 60 * 1000)), total: 0, isToday: i === 6 };
  });
  for (const o of weekOrders) {
    const idx = Math.floor((o.createdAt.getTime() - (startOfToday - 6 * DAY)) / DAY);
    if (idx >= 0 && idx < 7) buckets[idx].total += Number(o.price);
  }
  const weekTotal = buckets.reduce((n, b) => n + b.total, 0);

  const todayRevenue = Number(today._sum.price ?? 0);
  const totalRevenue = Number(revenue._sum.price ?? 0);
  const dateLabel = new Intl.DateTimeFormat("id-ID", {
    dateStyle: "full",
    timeZone: "Asia/Jakarta",
  }).format(new Date(now));

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-slate-400">{dateLabel}</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Ringkasan toko
        </h1>
      </div>

      {/* Hero + perlu tindakan */}
      <div className="grid gap-4 lg:grid-cols-3">
        <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-500 via-indigo-400 to-violet-400 p-6 text-white shadow-lg shadow-indigo-200/60 lg:col-span-2">
          <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10" />
          <div className="pointer-events-none absolute -bottom-16 right-24 h-40 w-40 rounded-full bg-white/10" />
          <p className="text-sm text-indigo-50/90">Pendapatan hari ini</p>
          <p className="mt-2 text-4xl font-bold tabular-nums tracking-tight sm:text-5xl">
            {rupiah(todayRevenue)}
          </p>
          <div className="mt-6 flex flex-wrap gap-x-10 gap-y-3 text-sm">
            <div>
              <p className="text-indigo-50/80">Order berhasil hari ini</p>
              <p className="mt-0.5 text-lg font-semibold tabular-nums">{num(today._count._all)}</p>
            </div>
            <div>
              <p className="text-indigo-50/80">7 hari terakhir</p>
              <p className="mt-0.5 text-lg font-semibold tabular-nums">{rupiah(weekTotal)}</p>
            </div>
            <div>
              <p className="text-indigo-50/80">Seluruh waktu</p>
              <p className="mt-0.5 text-lg font-semibold tabular-nums">{rupiah(totalRevenue)}</p>
            </div>
          </div>
        </section>

        <section className={`${card} p-5`}>
          <h2 className="font-semibold text-slate-900">Perlu tindakan</h2>
          <div className="mt-3 space-y-2">
            <Link
              href="/admin/orders?status=PAID"
              className="flex items-center justify-between rounded-xl bg-sky-50/70 px-4 py-3 transition hover:bg-sky-50"
            >
              <span className="text-sm text-slate-600">Perlu diproses</span>
              <span className="text-lg font-bold tabular-nums text-sky-700">{num(paidOrders)}</span>
            </Link>
            <Link
              href="/admin/orders?status=FAILED"
              className="flex items-center justify-between rounded-xl bg-rose-50/70 px-4 py-3 transition hover:bg-rose-50"
            >
              <span className="text-sm text-slate-600">Perlu refund</span>
              <span className="text-lg font-bold tabular-nums text-rose-600">{num(needRefund)}</span>
            </Link>
            <Link
              href="/admin/orders?status=PENDING"
              className="flex items-center justify-between rounded-xl bg-amber-50/70 px-4 py-3 transition hover:bg-amber-50"
            >
              <span className="text-sm text-slate-600">Menunggu bayar</span>
              <span className="text-lg font-bold tabular-nums text-amber-700">{num(pendingOrders)}</span>
            </Link>
          </div>
        </section>
      </div>

      {/* Statistik kecil */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Stat title="Total order" value={num(totalOrders)} tone="bg-indigo-50 text-indigo-500" icon="M3 5h18M3 12h18M3 19h12" href="/admin/orders" />
        <Stat title="Order berhasil" value={num(successOrders)} tone="bg-emerald-50 text-emerald-500" icon="M20 6 9 17l-5-5" href="/admin/orders?status=SUCCESS" />
        <Stat title="Game aktif" value={num(totalGames)} tone="bg-violet-50 text-violet-500" icon="M6 12h4M8 10v4M15 13h.01M18 11h.01M17.3 5H6.7a4 4 0 0 0-3.9 3.1l-1.2 5.6A3 3 0 0 0 7.5 16l.9-1.5h7.2l.9 1.5a3 3 0 0 0 5.9-2.3l-1.2-5.6A4 4 0 0 0 17.3 5z" href="/admin/games" />
        <Stat title="Produk" value={num(totalProducts)} tone="bg-amber-50 text-amber-500" icon="M21 8 12 3 3 8m18 0-9 5m9-5v8l-9 5m0-8L3 8m9 5v8M3 8v8l9 5" href="/admin/games" />
      </div>

      {/* Grafik + order terbaru */}
      <div className="grid gap-4 xl:grid-cols-5">
        <section className={`${card} p-5 xl:col-span-2`}>
          <h2 className="font-semibold text-slate-900">Pendapatan 7 hari</h2>
          <p className="mt-0.5 text-sm text-slate-400">Hanya order berhasil</p>
          <WeekChart days={buckets} />
        </section>

        <section className={`${card} overflow-hidden xl:col-span-3`}>
          <div className="flex items-center justify-between gap-4 px-5 py-4">
            <div>
              <h2 className="font-semibold text-slate-900">Order terbaru</h2>
              <p className="mt-0.5 text-sm text-slate-400">6 transaksi terakhir</p>
            </div>
            <Link href="/admin/orders" className="rounded-lg bg-indigo-50 px-3 py-1.5 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100">
              Lihat semua
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[34rem] text-left text-sm">
              <thead className="bg-slate-50/70 text-xs font-medium text-slate-400">
                <tr>
                  <th className="px-5 py-2.5">Order</th>
                  <th className="px-5 py-2.5">Pesanan</th>
                  <th className="px-5 py-2.5 text-right">Total</th>
                  <th className="px-5 py-2.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentOrders.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-5 py-12 text-center">
                      <p className="font-medium text-slate-700">Belum ada order</p>
                      <p className="mt-1 text-sm text-slate-400">Order baru dari web top up akan muncul di sini.</p>
                    </td>
                  </tr>
                )}
                {recentOrders.map((o) => (
                  <tr key={o.id} className="transition hover:bg-slate-50/60">
                    <td className="px-5 py-3.5">
                      <Link href={`/admin/orders/${o.orderNumber}`} className="font-mono text-[13px] font-medium text-indigo-600 hover:underline">
                        {o.orderNumber}
                      </Link>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-slate-800">{o.game.name}</p>
                      <p className="text-xs text-slate-400">{o.product.name}</p>
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-right font-semibold tabular-nums text-slate-800">
                      {rupiah(Number(o.price))}
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={o.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  return (
    <Suspense fallback={<p className="text-sm text-slate-400">Memuat dashboard...</p>}>
      <DashboardContent />
    </Suspense>
  );
}