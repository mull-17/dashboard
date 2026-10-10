import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { createReseller, toggleReseller } from "@/app/admin/manage-actions";
import { requireAdmin } from "@/lib/admin-auth";
import SubmitButton from "@/app/admin/submit-button";

type SearchParams = Promise<{
  error?: string | string[];
  added?: string | string[];
}>;

const LEVEL_LABEL = { BRONZE: "Bronze", SILVER: "Silver", GOLD: "Gold" } as const;
const LEVEL_PILL = {
  BRONZE: "bg-orange-50 text-orange-700",
  SILVER: "bg-slate-100 text-slate-600",
  GOLD: "bg-amber-50 text-amber-700",
} as const;

const rupiah = (n: number) => `Rp ${Math.round(n).toLocaleString("id-ID")}`;

const card =
  "rounded-2xl bg-white shadow-[0_1px_2px_rgba(30,27,75,0.04),0_8px_24px_-12px_rgba(30,27,75,0.08)] ring-1 ring-slate-200/60";
const input =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100";

function first(value: string | string[] | undefined) {
  return typeof value === "string" ? value : "";
}

async function ResellerContent({ searchParams }: { searchParams: SearchParams }) {
  await requireAdmin();

  const sp = await searchParams;
  const error = first(sp.error);
  const added = first(sp.added);

  const [resellers, sales] = await Promise.all([
    prisma.reseller.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.order.groupBy({
      by: ["resellerId"],
      where: { status: "SUCCESS", resellerId: { not: null } },
      _count: { _all: true },
      _sum: { price: true },
    }),
  ]);

  const stats = new Map(
    sales.map((s) => [
      s.resellerId,
      { count: s._count._all, total: Number(s._sum.price ?? 0) },
    ]),
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Reseller
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          {resellers.length} reseller terdaftar
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
          Reseller &quot;{added}&quot; berhasil ditambahkan.
        </p>
      )}

      <section>
        <h2 className="text-lg font-bold tracking-tight text-slate-900">
          Tambah reseller
        </h2>
        <form
          action={createReseller}
          className={`${card} mt-3 grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-5`}
        >
          <input
            name="name"
            required
            maxLength={80}
            placeholder="Nama reseller"
            aria-label="Nama reseller"
            className={input}
          />
          <input
            name="phone"
            maxLength={20}
            placeholder="No. WhatsApp"
            aria-label="No. WhatsApp"
            className={input}
          />
          <input
            name="email"
            type="email"
            maxLength={120}
            placeholder="Email"
            aria-label="Email"
            className={input}
          />
          <select
            name="level"
            aria-label="Level"
            defaultValue="BRONZE"
            className={input}
          >
            {Object.entries(LEVEL_LABEL).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
          <SubmitButton
            pendingText="Menyimpan..."
            className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-indigo-200 transition hover:bg-indigo-500"
          >
            Tambah reseller
          </SubmitButton>
        </form>
      </section>

      <div className={`${card} overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[44rem] text-left text-sm">
            <thead className="bg-slate-50/70 text-xs font-medium text-slate-400">
              <tr>
                <th className="px-5 py-3">Nama</th>
                <th className="px-5 py-3">Kontak</th>
                <th className="px-5 py-3">Level</th>
                <th className="px-5 py-3 text-right">Order berhasil</th>
                <th className="px-5 py-3 text-right">Total belanja</th>
                <th className="px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {resellers.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-14 text-center">
                    <p className="font-medium text-slate-700">
                      Belum ada reseller
                    </p>
                    <p className="mt-1 text-sm text-slate-400">
                      Tambahkan reseller pertama lewat formulir di atas.
                    </p>
                  </td>
                </tr>
              )}
              {resellers.map((r) => {
                const st = stats.get(r.id) ?? { count: 0, total: 0 };
                return (
                  <tr key={r.id} className="transition hover:bg-slate-50/60">
                    <td className="px-5 py-3.5 font-semibold text-slate-800">
                      {r.name}
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">
                      {r.phone ?? "-"}
                      <div className="text-xs text-slate-400">
                        {r.email ?? ""}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${LEVEL_PILL[r.level]}`}
                      >
                        {LEVEL_LABEL[r.level]}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right tabular-nums text-slate-700">
                      {st.count}
                    </td>
                    <td className="px-5 py-3.5 text-right tabular-nums text-slate-700">
                      {rupiah(st.total)}
                    </td>
                    <td className="px-5 py-3.5">
                      <form
                        action={toggleReseller}
                        className="flex items-center gap-3"
                      >
                        <input type="hidden" name="id" value={r.id} />
                        <span
                          className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${
                            r.active
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              r.active ? "bg-emerald-400" : "bg-slate-400"
                            }`}
                          />
                          {r.active ? "Aktif" : "Nonaktif"}
                        </span>
                        <SubmitButton
                          pendingText="..."
                          className="rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100"
                        >
                          {r.active ? "Nonaktifkan" : "Aktifkan"}
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

export default function ResellerPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  return (
    <Suspense
      fallback={<p className="text-sm text-slate-400">Memuat reseller...</p>}
    >
      <ResellerContent searchParams={searchParams} />
    </Suspense>
  );
}