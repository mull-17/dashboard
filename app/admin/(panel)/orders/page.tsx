import { Suspense } from "react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { markRefunded } from "@/app/admin/actions";
import { requireAdmin } from "@/lib/admin-auth";

const STATUSES = [
  "PENDING",
  "PAID",
  "PROCESSING",
  "SUCCESS",
  "FAILED",
  "REFUNDED",
] as const;

const LABELS: Record<string, string> = {
  PENDING: "Menunggu bayar",
  PAID: "Dibayar",
  PROCESSING: "Diproses",
  SUCCESS: "Berhasil",
  FAILED: "Gagal",
  REFUNDED: "Direfund",
};

const BADGE: Record<string, { pill: string; dot: string }> = {
  PENDING: {
    pill: "bg-amber-50 text-amber-800 ring-amber-600/20",
    dot: "bg-amber-500",
  },
  PAID: {
    pill: "bg-sky-50 text-sky-800 ring-sky-600/20",
    dot: "bg-sky-500",
  },
  PROCESSING: {
    pill: "bg-indigo-50 text-indigo-800 ring-indigo-600/20",
    dot: "bg-indigo-500",
  },
  SUCCESS: {
    pill: "bg-emerald-50 text-emerald-800 ring-emerald-600/20",
    dot: "bg-emerald-500",
  },
  FAILED: {
    pill: "bg-red-50 text-red-800 ring-red-600/20",
    dot: "bg-red-500",
  },
  REFUNDED: {
    pill: "bg-slate-100 text-slate-700 ring-slate-500/20",
    dot: "bg-slate-400",
  },
};

const dateFmt = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Jakarta",
});

const rupiah = (n: number) => `Rp ${n.toLocaleString("id-ID")}`;

type PageProps = { searchParams: Promise<{ status?: string }> };

function Tab({
  href,
  active,
  label,
  count,
}: {
  href: string;
  active: boolean;
  label: string;
  count: number;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`relative flex items-center whitespace-nowrap px-3.5 py-2.5 text-sm font-medium transition-colors after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600 ${
        active
          ? "text-indigo-950 after:bg-indigo-950"
          : "text-slate-500 hover:text-slate-800 hover:after:bg-slate-300"
      }`}
    >
      {label}
      <span
        className={`ml-2 rounded-full px-1.5 py-0.5 text-xs tabular-nums ${
          active ? "bg-indigo-950 text-white" : "bg-slate-100 text-slate-600"
        }`}
      >
        {count}
      </span>
    </Link>
  );
}

async function OrdersContent({ searchParams }: PageProps) {
  await requireAdmin();
  const { status } = await searchParams;
  const activeStatus = STATUSES.find((s) => s === status);

  const [orders, needRefund, grouped, revenue] = await Promise.all([
    prisma.order.findMany({
      where: activeStatus ? { status: activeStatus } : {},
      include: { game: true, product: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.order.count({
      where: { status: "FAILED", note: { contains: "refund manual" } },
    }),
    prisma.order.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.order.aggregate({
      where: { status: "SUCCESS" },
      _sum: { price: true },
    }),
  ]);

  const counts: Record<string, number> = Object.fromEntries(
    grouped.map((g) => [g.status, g._count._all])
  );
  const total = grouped.reduce((n, g) => n + g._count._all, 0);
  const omzet = Number(revenue._sum.price ?? 0);

  return (
    <>
      {/* ===== Bagian atas yang menempel saat digulir ===== */}
      <div className="sticky top-14 z-10 -mx-4 -mt-6 bg-[#f5f5fa] px-4 pt-6 sm:-mx-5 sm:px-5 lg:top-0 lg:-mx-8 lg:-mt-8 lg:px-8 lg:pt-8 2xl:px-10">
        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Order
            </h1>
            <p className="mt-1 text-sm text-slate-500">{total} order tercatat</p>
          </div>

          <dl className="flex gap-8 text-sm">
            <div>
              <dt className="text-slate-500">Pendapatan</dt>
              <dd className="mt-0.5 font-bold tabular-nums text-slate-900">
                {rupiah(omzet)}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Perlu refund</dt>
              <dd
                className={`mt-0.5 font-bold tabular-nums ${
                  needRefund > 0 ? "text-red-600" : "text-slate-900"
                }`}
              >
                {needRefund}
                {needRefund > 0 && (
                  <Link
                    href="/admin/orders?status=FAILED"
                    className="ml-2 text-xs font-semibold underline underline-offset-2"
                  >
                    Lihat
                  </Link>
                )}
              </dd>
            </div>
          </dl>
        </div>

        <nav
          aria-label="Filter status"
          className="mt-4 flex gap-1 overflow-x-auto border-b border-slate-200"
        >
          <Tab
            href="/admin/orders"
            active={!activeStatus}
            label="Semua"
            count={total}
          />
          {STATUSES.map((s) => (
            <Tab
              key={s}
              href={`/admin/orders?status=${s}`}
              active={activeStatus === s}
              label={LABELS[s]}
              count={counts[s] ?? 0}
            />
          ))}
        </nav>
      </div>

      {/* ===== Tabel, memenuhi lebar layar ===== */}
      <div className="mt-5 overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
        <table className="w-full min-w-[56rem] text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50/80 text-xs font-medium text-slate-500">
            <tr>
              <th className="px-5 py-3">Order</th>
              <th className="px-5 py-3">Pesanan</th>
              <th className="px-5 py-3 text-right">Total</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Catatan</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {orders.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-16 text-center">
                  <p className="font-medium text-slate-700">
                    {activeStatus
                      ? "Belum ada order dengan status ini"
                      : "Belum ada order"}
                  </p>
                  <p className="mt-1 text-sm text-slate-400">
                    {activeStatus
                      ? "Pilih status lain atau lihat semua order."
                      : "Order baru dari web top up akan muncul di sini."}
                  </p>
                </td>
              </tr>
            )}

            {orders.map((order) => {
              const inputs = Object.entries(
                (order.playerInputs ?? {}) as Record<string, string>
              );
              const canRefund =
                order.status === "FAILED" &&
                order.note?.includes("refund manual");
              const badge = BADGE[order.status] ?? BADGE.REFUNDED;

              return (
                <tr
                  key={order.id}
                  className={`align-top transition-colors hover:bg-slate-50/70 ${
                    canRefund ? "bg-red-50/50" : ""
                  }`}
                >
                  <td className="px-5 py-4">
                    <Link
                      href={`/admin/orders/${order.orderNumber}`}
                      className="whitespace-nowrap font-mono text-[13px] font-medium text-indigo-700 hover:underline"
                    >
                      {order.orderNumber}
                    </Link>
                    <div className="mt-1 text-xs text-slate-500">
                      {dateFmt.format(order.createdAt)}
                    </div>
                    <div className="mt-0.5 text-xs text-slate-400">
                      {order.customerEmail ?? order.customerPhone ?? "-"}
                    </div>
                  </td>

                  <td className="px-5 py-4">
                    <div className="font-semibold text-slate-900">
                      {order.game.name}
                    </div>
                    <div className="text-slate-600">{order.product.name}</div>
                    {inputs.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {inputs.map(([k, v]) => (
                          <span
                            key={k}
                            className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-600"
                          >
                            {k}: {v}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>

                  <td className="whitespace-nowrap px-5 py-4 text-right font-semibold tabular-nums">
                    {rupiah(Number(order.price))}
                  </td>

                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${badge.pill}`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${badge.dot}`} />
                      {LABELS[order.status] ?? order.status}
                    </span>
                  </td>

                  <td className="px-5 py-4">
                    {order.note ? (
                      <div className="break-words text-slate-600">
                        {order.note}
                      </div>
                    ) : (
                      <span className="text-slate-300">-</span>
                    )}
                    {canRefund && (
                      <form action={markRefunded} className="mt-2.5">
                        <input type="hidden" name="id" value={order.id} />
                        <button className="rounded-md bg-red-600 px-2.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-red-700">
                          Tandai refund selesai
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
export default function AdminOrdersPage({ searchParams }: PageProps) {
  return (
    <Suspense
      fallback={
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Order
          </h1>
          <p className="mt-1 text-sm text-slate-500">Memuat order...</p>
        </div>
      }
    >
      <OrdersContent searchParams={searchParams} />
    </Suspense>
  );
}
