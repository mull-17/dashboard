import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { OrderStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { markRefunded } from "@/app/admin/actions";
import { TRANSITIONS, REFUND_FLAG } from "@/lib/order-flow";
import { updateOrderStatus } from "../actions";

const LABELS: Record<OrderStatus, string> = {
  PENDING: "Menunggu bayar",
  PAID: "Dibayar",
  PROCESSING: "Diproses",
  SUCCESS: "Berhasil",
  FAILED: "Gagal",
  REFUNDED: "Direfund",
};

const BADGE: Record<OrderStatus, string> = {
  PENDING: "bg-amber-50 text-amber-800 ring-amber-600/20",
  PAID: "bg-sky-50 text-sky-800 ring-sky-600/20",
  PROCESSING: "bg-indigo-50 text-indigo-800 ring-indigo-600/20",
  SUCCESS: "bg-emerald-50 text-emerald-800 ring-emerald-600/20",
  FAILED: "bg-red-50 text-red-800 ring-red-600/20",
  REFUNDED: "bg-slate-100 text-slate-700 ring-slate-500/20",
};

const dateFmt = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Jakarta",
});

const rupiah = (n: number) => `Rp ${n.toLocaleString("id-ID")}`;

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 py-3 sm:flex-row sm:gap-4">
      <dt className="w-44 shrink-0 text-sm text-slate-500">{label}</dt>
      <dd className="break-words text-sm font-medium text-slate-900">{children}</dd>
    </div>
  );
}

async function OrderDetail({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  await requireAdmin();
  const { orderNumber } = await params;

  const order = await prisma.order.findUnique({
    where: { orderNumber },
    include: { game: true, product: true, reseller: true },
  });
  if (!order) notFound();

  const nextStatuses = TRANSITIONS[order.status];
  const canRefund =
    order.status === "FAILED" && !!order.note?.includes(REFUND_FLAG);
  const inputs = Object.entries(
    (order.playerInputs ?? {}) as Record<string, unknown>
  );

  return (
    <div className="max-w-3xl space-y-6">
      <Link
        href="/admin/orders"
        className="text-sm font-semibold text-indigo-700 hover:underline"
      >
        ← Kembali ke daftar order
      </Link>

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-mono text-2xl font-bold tracking-tight text-slate-900">
          {order.orderNumber}
        </h1>
        <span
          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${BADGE[order.status]}`}
        >
          {LABELS[order.status]}
        </span>
      </div>

      <section className="rounded-xl bg-white px-5 shadow-sm ring-1 ring-slate-200">
        <dl className="divide-y divide-slate-100">
          <Row label="Game">{order.game.name}</Row>
          <Row label="Produk">{order.product.name}</Row>
          <Row label="Total">{rupiah(Number(order.price))}</Row>
          <Row label="Email">{order.customerEmail ?? "-"}</Row>
          <Row label="No. HP">{order.customerPhone ?? "-"}</Row>
          <Row label="Reseller">{order.reseller?.name ?? "-"}</Row>
          <Row label="Metode bayar">{order.paymentMethod ?? "-"}</Row>
          <Row label="Ref pembayaran">
            <span className="font-mono">{order.paymentRef ?? "-"}</span>
          </Row>
          <Row label="Dibuat">{dateFmt.format(order.createdAt)}</Row>
          <Row label="Diperbarui">{dateFmt.format(order.updatedAt)}</Row>
        </dl>
      </section>

      <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <h2 className="font-semibold text-slate-900">Data akun pemain</h2>
        {inputs.length === 0 ? (
          <p className="mt-2 text-sm text-slate-400">Tidak ada data.</p>
        ) : (
          <ul className="mt-3 flex flex-wrap gap-2">
            {inputs.map(([k, v]) => (
              <li
                key={k}
                className="rounded-md bg-slate-100 px-2 py-1 font-mono text-sm text-slate-700"
              >
                {k}: {String(v)}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <h2 className="font-semibold text-slate-900">Catatan / riwayat</h2>
        <pre className="mt-3 whitespace-pre-wrap break-words font-mono text-xs text-slate-600">
          {order.note ?? "-"}
        </pre>
      </section>

      {(nextStatuses.length > 0 || canRefund) && (
        <section className="space-y-4 rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <h2 className="font-semibold text-slate-900">Tindakan</h2>

          {nextStatuses.length > 0 && (
            <form action={updateOrderStatus} className="space-y-3">
              <input type="hidden" name="orderNumber" value={order.orderNumber} />
              <input
                name="memo"
                maxLength={300}
                placeholder="Catatan (opsional)"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              <div className="flex flex-wrap gap-2">
                {nextStatuses.map((s) => (
                  <button
                    key={s}
                    name="status"
                    value={s}
                    className={`rounded-lg px-3 py-2 text-sm font-semibold ${
                      s === "FAILED"
                        ? "bg-red-600 text-white hover:bg-red-700"
                        : "bg-indigo-950 text-white hover:bg-indigo-900"
                    }`}
                  >
                    Tandai {LABELS[s].toLowerCase()}
                  </button>
                ))}
              </div>
            </form>
          )}

          {canRefund && (
            <form action={markRefunded}>
              <input type="hidden" name="id" value={order.id} />
              <button className="rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700">
                Tandai refund selesai
              </button>
              <p className="mt-2 text-xs text-slate-500">
                Kembalikan dulu uang pelanggan lewat dashboard Midtrans, baru
                tekan tombol ini. Tombol ini hanya mengubah status di database.
              </p>
            </form>
          )}
        </section>
      )}
    </div>
  );
}

export default function OrderDetailPage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  return (
    <Suspense
      fallback={<p className="text-sm text-slate-500">Memuat detail order...</p>}
    >
      <OrderDetail params={params} />
    </Suspense>
  );
}