import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";

type PageProps = { searchParams: Promise<{ range?: string }> };

const DAY = 24 * 60 * 60 * 1000;
const WIB = 7 * 60 * 60 * 1000;

const rupiah = (n: number) => `Rp ${Math.round(n).toLocaleString("id-ID")}`;
const labelFmt = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  timeZone: "Asia/Jakarta",
});

const card =
  "rounded-2xl bg-white shadow-[0_1px_2px_rgba(30,27,75,0.04),0_8px_24px_-12px_rgba(30,27,75,0.08)] ring-1 ring-slate-200/60";

function RangeLink({ days, active }: { days: number; active: boolean }) {
  return (
    <Link
      href={`/admin/statistik?range=${days}`}
      aria-current={active ? "page" : undefined}
      className={`rounded-lg px-3.5 py-1.5 text-sm font-medium transition ${
        active
          ? "bg-white text-indigo-700 shadow-sm ring-1 ring-slate-200"
          : "text-slate-500 hover:text-slate-800"
      }`}
    >
      {days} hari
    </Link>
  );
}

function Stat({
  title,
  value,
  hint,
  hintTone = "text-slate-400",
}: {
  title: string;
  value: string;
  hint?: string;
  hintTone?: string;
}) {
  return (
    <div className={`${card} p-5`}>
      <p className="text-sm text-slate-500">{title}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums tracking-tight text-slate-900">
        {value}
      </p>
      {hint && <p className={`mt-1 text-xs ${hintTone}`}>{hint}</p>}
    </div>
  );
}

function RankList({
  title,
  rows,
  empty,
}: {
  title: string;
  rows: { name: string; sub?: string; count: number; sum: number }[];
  empty: string;
}) {
  const top = Math.max(...rows.map((r) => r.sum), 1);
  return (
    <section className={`${card} p-5`}>
      <h2 className="font-semibold text-slate-900">{title}</h2>
      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-slate-400">{empty}</p>
      ) : (
        <ul className="mt-4 space-y-4">
          {rows.map((r) => (
            <li key={r.name + (r.sub ?? "")}>
              <div className="flex items-start justify-between gap-3 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-800">{r.name}</p>
                  {r.sub && <p className="truncate text-xs text-slate-400">{r.sub}</p>}
                </div>
                <div className="shrink-0 text-right tabular-nums">
                  <p className="font-semibold text-slate-800">{rupiah(r.sum)}</p>
                  <p className="text-xs text-slate-400">{r.count} order</p>
                </div>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-violet-300"
                  style={{ width: `${(r.sum / top) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

async function StatistikContent({ searchParams }: PageProps) {
  await requireAdmin();
  await connection(); // harus sebelum Date.now()

  const { range } = await searchParams;
  const days = range === "30" ? 30 : 7;

  // Awal hari ini (00:00 WIB), lalu mundur sesuai rentang
  const now = Date.now();
  const startOfToday = Math.floor((now + WIB) / DAY) * DAY - WIB;
  const firstStart = startOfToday - (days - 1) * DAY;
  const prevStart = firstStart - days * DAY;

  const [orders, prev] = await Promise.all([
    prisma.order.findMany({
      where: { status: "SUCCESS", createdAt: { gte: new Date(firstStart) } },
      select: {
        createdAt: true,
        price: true,
        game: { select: { name: true } },
        product: { select: { name: true } },
      },
    }),
    prisma.order.aggregate({
      where: {
        status: "SUCCESS",
        createdAt: { gte: new Date(prevStart), lt: new Date(firstStart) },
      },
      _sum: { price: true },
    }),
  ]);

  const buckets = Array.from({ length: days }, (_, i) => {
    const start = firstStart + i * DAY;
    return {
      label: labelFmt.format(new Date(start + 12 * 60 * 60 * 1000)),
      value: 0,
      isToday: i === days - 1,
    };
  });

  const perGame = new Map<string, { count: number; sum: number }>();
  const perProduct = new Map<string, { game: string; count: number; sum: number }>();

  for (const o of orders) {
    const price = Number(o.price);

    const idx = Math.floor((o.createdAt.getTime() - firstStart) / DAY);
    if (idx >= 0 && idx < days) buckets[idx].value += price;

    const g = perGame.get(o.game.name) ?? { count: 0, sum: 0 };
    perGame.set(o.game.name, { count: g.count + 1, sum: g.sum + price });

    const pk = `${o.game.name}||${o.product.name}`;
    const p = perProduct.get(pk) ?? { game: o.game.name, count: 0, sum: 0 };
    perProduct.set(pk, { game: p.game, count: p.count + 1, sum: p.sum + price });
  }

  const max = Math.max(...buckets.map((b) => b.value), 1);
  const omzet = buckets.reduce((n, b) => n + b.value, 0);
  const avg = orders.length ? omzet / orders.length : 0;
  const prevOmzet = Number(prev._sum.price ?? 0);

  let change = "Belum ada data periode sebelumnya";
  let changeTone = "text-slate-400";
  if (prevOmzet > 0) {
    const pct = ((omzet - prevOmzet) / prevOmzet) * 100;
    change = `${pct >= 0 ? "▲" : "▼"} ${Math.abs(pct).toFixed(1)}% dari ${days} hari sebelumnya`;
    changeTone = pct >= 0 ? "text-emerald-600" : "text-rose-600";
  }

  const topGames = [...perGame.entries()]
    .sort((a, b) => b[1].sum - a[1].sum)
    .slice(0, 5)
    .map(([name, g]) => ({ name, count: g.count, sum: g.sum }));

  const topProducts = [...perProduct.entries()]
    .sort((a, b) => b[1].count - a[1].count || b[1].sum - a[1].sum)
    .slice(0, 5)
    .map(([key, p]) => ({
      name: key.split("||")[1],
      sub: p.game,
      count: p.count,
      sum: p.sum,
    }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Statistik
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Hanya order berstatus Berhasil.
          </p>
        </div>
        <div className="flex gap-1 rounded-xl bg-slate-100/80 p-1">
          <RangeLink days={7} active={days === 7} />
          <RangeLink days={30} active={days === 30} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat
          title="Pendapatan"
          value={rupiah(omzet)}
          hint={change}
          hintTone={changeTone}
        />
        <Stat title="Order berhasil" value={orders.length.toLocaleString("id-ID")} />
        <Stat title="Rata-rata per order" value={rupiah(avg)} />
      </div>

      <section className={`${card} p-5`}>
        <h2 className="font-semibold text-slate-900">Pendapatan harian</h2>
        <p className="mt-0.5 text-sm text-slate-400">{days} hari terakhir</p>
        <div className="mt-6 overflow-x-auto">
          <ul
            className="flex h-56 items-end gap-1.5"
            style={{ minWidth: days === 30 ? "42rem" : undefined }}
            aria-label="Grafik pendapatan harian"
          >
            {buckets.map((b, i) => {
              const h = Math.max((b.value / max) * 100, b.value > 0 ? 4 : 2);
              return (
                <li
                  key={i}
                  title={`${b.label}: ${rupiah(b.value)}`}
                  className="group flex h-full flex-1 flex-col items-center justify-end gap-2"
                >
                  <div className="flex w-full flex-1 items-end">
                    <div
                      style={{ height: `${h}%` }}
                      className={`w-full rounded-t-lg transition-all ${
                        b.isToday
                          ? "bg-gradient-to-t from-indigo-400 to-violet-300"
                          : "bg-indigo-100 group-hover:bg-indigo-200"
                      }`}
                    />
                  </div>
                  <span
                    className={`text-[10px] ${
                      b.isToday ? "font-semibold text-indigo-700" : "text-slate-400"
                    }`}
                  >
                    {days === 7 || i % 5 === 0 || b.isToday ? b.label : "\u00a0"}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <RankList
          title="Game terlaris"
          rows={topGames}
          empty="Belum ada penjualan pada periode ini."
        />
        <RankList
          title="Produk terlaris"
          rows={topProducts}
          empty="Belum ada penjualan pada periode ini."
        />
      </div>
    </div>
  );
}

export default function StatistikPage({ searchParams }: PageProps) {
  return (
    <Suspense
      fallback={<p className="text-sm text-slate-400">Memuat statistik...</p>}
    >
      <StatistikContent searchParams={searchParams} />
    </Suspense>
  );
}