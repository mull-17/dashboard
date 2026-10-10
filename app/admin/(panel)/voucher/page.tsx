import { connection } from "next/server";
import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { createVoucher, toggleVoucher } from "@/app/admin/manage-actions";
import { requireAdmin } from "@/lib/admin-auth";
import SubmitButton from "@/app/admin/submit-button";

type SearchParams = Promise<{
  error?: string | string[];
  added?: string | string[];
}>;

const rupiah = (n: number) => `Rp ${n.toLocaleString("id-ID")}`;
const dateFmt = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "medium",
  timeZone: "Asia/Jakarta",
});

const card =
  "rounded-2xl bg-white shadow-[0_1px_2px_rgba(30,27,75,0.04),0_8px_24px_-12px_rgba(30,27,75,0.08)] ring-1 ring-slate-200/60";
const input =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100";

function first(value: string | string[] | undefined) {
  return typeof value === "string" ? value : "";
}

function statusOf(
  v: { active: boolean; used: number; quota: number; expiresAt: Date },
  now: number,
) {
  if (v.expiresAt.getTime() < now)
    return { label: "Kedaluwarsa", pill: "bg-slate-100 text-slate-500", dot: "bg-slate-400" };
  if (v.used >= v.quota)
    return { label: "Kuota habis", pill: "bg-amber-50 text-amber-700", dot: "bg-amber-400" };
  if (!v.active)
    return { label: "Nonaktif", pill: "bg-slate-100 text-slate-500", dot: "bg-slate-400" };
  return { label: "Aktif", pill: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-400" };
}

async function VoucherContent({ searchParams }: { searchParams: SearchParams }) {
  await requireAdmin();
  await connection(); // harus sebelum Date.now()

  const sp = await searchParams;
  const error = first(sp.error);
  const added = first(sp.added);
  const now = Date.now();

  const vouchers = await prisma.voucher.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Voucher &amp; promo
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          {vouchers.length} voucher dibuat
        </p>
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700 ring-1 ring-inset ring-rose-200"
        >
          {error}
        </p>
      )}
      {added && (
        <p
          role="status"
          className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700 ring-1 ring-inset ring-emerald-200"
        >
          Voucher &quot;{added}&quot; berhasil dibuat.
        </p>
      )}

      <section>
        <h2 className="text-lg font-bold tracking-tight text-slate-900">
          Buat voucher baru
        </h2>
        <form
          action={createVoucher}
          className={`${card} mt-3 grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-6`}
        >
          <input
            name="code"
            required
            maxLength={20}
            placeholder="Kode, mis. MERDEKA10"
            aria-label="Kode voucher"
            className={`${input} uppercase`}
          />
          <select
            name="type"
            aria-label="Jenis potongan"
            defaultValue="PERCENT"
            className={input}
          >
            <option value="PERCENT">Persen (%)</option>
            <option value="FIXED">Nominal (Rp)</option>
          </select>
          <input
            name="value"
            type="number"
            min={1}
            required
            placeholder="Nilai potongan"
            aria-label="Nilai potongan"
            className={input}
          />
          <input
            name="quota"
            type="number"
            min={1}
            required
            placeholder="Kuota"
            aria-label="Kuota"
            className={input}
          />
          <input
            name="expiresAt"
            type="date"
            required
            aria-label="Berlaku sampai"
            className={input}
          />
          <SubmitButton
            pendingText="Membuat..."
            className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-indigo-200 transition hover:bg-indigo-500"
          >
            Buat voucher
          </SubmitButton>
        </form>
      </section>

      <div className={`${card} overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[44rem] text-left text-sm">
            <thead className="bg-slate-50/70 text-xs font-medium text-slate-400">
              <tr>
                <th className="px-5 py-3">Kode</th>
                <th className="px-5 py-3">Potongan</th>
                <th className="px-5 py-3 text-right">Terpakai</th>
                <th className="px-5 py-3">Berlaku sampai</th>
                <th className="px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {vouchers.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-14 text-center">
                    <p className="font-medium text-slate-700">Belum ada voucher</p>
                    <p className="mt-1 text-sm text-slate-400">
                      Buat voucher pertama lewat formulir di atas.
                    </p>
                  </td>
                </tr>
              )}
              {vouchers.map((v) => {
                const st = statusOf(v, now);
                return (
                  <tr key={v.id} className="transition hover:bg-slate-50/60">
                    <td className="px-5 py-3.5 font-mono text-[13px] font-semibold text-slate-800">
                      {v.code}
                    </td>
                    <td className="px-5 py-3.5 text-slate-700">
                      {v.type === "PERCENT" ? `${v.value}%` : rupiah(v.value)}
                    </td>
                    <td className="px-5 py-3.5 text-right tabular-nums text-slate-700">
                      {v.used}/{v.quota}
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">
                      {dateFmt.format(v.expiresAt)}
                    </td>
                    <td className="px-5 py-3.5">
                      <form
                        action={toggleVoucher}
                        className="flex items-center gap-3"
                      >
                        <input type="hidden" name="id" value={v.id} />
                        <span
                          className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${st.pill}`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />
                          {st.label}
                        </span>
                        <SubmitButton
                          pendingText="..."
                          className="rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100"
                        >
                          {v.active ? "Matikan" : "Nyalakan"}
                        </SubmitButton>
                      </form>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function VoucherPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  return (
    <Suspense
      fallback={<p className="text-sm text-slate-400">Memuat voucher...</p>}
    >
      <VoucherContent searchParams={searchParams} />
    </Suspense>
  );
}