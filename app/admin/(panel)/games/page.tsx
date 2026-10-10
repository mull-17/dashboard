import { Suspense } from "react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { createGame } from "@/app/admin/manage-actions";
import { requireAdmin } from "@/lib/admin-auth";
import SubmitButton from "@/app/admin/submit-button";
import DeleteGameButton from "./delete-game-button";

type SearchParams = Promise<{
  error?: string | string[];
  added?: string | string[];
  deleted?: string | string[];
}>;

const card =
  "rounded-2xl bg-white shadow-[0_1px_2px_rgba(30,27,75,0.04),0_8px_24px_-12px_rgba(30,27,75,0.08)] ring-1 ring-slate-200/60";
const input =
  "mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100";
const label = "text-sm font-medium text-slate-700";

function first(value: string | string[] | undefined) {
  return typeof value === "string" ? value : "";
}

// Dengan Cache Components, searchParams dan query database dibaca di dalam Suspense
export default function AdminGamesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  return (
    <Suspense
      fallback={<p className="text-sm text-slate-400">Memuat game...</p>}
    >
      <GamesContent searchParams={searchParams} />
    </Suspense>
  );
}

async function GamesContent({ searchParams }: { searchParams: SearchParams }) {
  await requireAdmin();

  const sp = await searchParams;
  const error = first(sp.error);
  const added = first(sp.added);
  const deleted = first(sp.deleted);

  const games = await prisma.game.findMany({
    include: { _count: { select: { products: true, orders: true } } },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Game
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          {games.length} game terdaftar
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
          Game &quot;{added}&quot; berhasil ditambahkan.
        </p>
      )}
      {deleted && (
        <p
          role="status"
          className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700 ring-1 ring-inset ring-emerald-200"
        >
          Game &quot;{deleted}&quot; berhasil dihapus.
        </p>
      )}

      <div className={`${card} overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[44rem] text-left text-sm">
            <thead className="bg-slate-50/70 text-xs font-medium text-slate-400">
              <tr>
                <th className="px-5 py-3">Nama</th>
                <th className="px-5 py-3">Kategori</th>
                <th className="px-5 py-3 text-right">Produk</th>
                <th className="px-5 py-3 text-right">Order</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {games.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-14 text-center">
                    <p className="font-medium text-slate-700">Belum ada game</p>
                    <p className="mt-1 text-sm text-slate-400">
                      Tambahkan game pertama lewat formulir di bawah.
                    </p>
                  </td>
                </tr>
              )}

              {games.map((game) => (
                <tr key={game.id} className="transition hover:bg-slate-50/60">
                  <td className="px-5 py-3.5">
                    <div className="font-semibold text-slate-800">
                      {game.name}
                    </div>
                    <div className="font-mono text-xs text-slate-400">
                      /games/{game.slug}
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-slate-600">
                    {game.category}
                  </td>
                  <td className="px-5 py-3.5 text-right tabular-nums text-slate-700">
                    {game._count.products}
                  </td>
                  <td className="px-5 py-3.5 text-right tabular-nums text-slate-700">
                    {game._count.orders}
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                        game.isActive
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          game.isActive ? "bg-emerald-400" : "bg-slate-400"
                        }`}
                      />
                      {game.isActive ? "Aktif" : "Nonaktif"}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-5 py-3.5 text-right">
                    <Link
                      href={`/admin/games/${game.id}`}
                      className="mr-4 rounded-lg bg-indigo-50 px-3 py-1.5 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100"
                    >
                      Kelola
                    </Link>

                    {game._count.orders > 0 ? (
                      <span
                        title="Game yang sudah punya order tidak bisa dihapus. Nonaktifkan saja."
                        className="cursor-not-allowed text-sm text-slate-300"
                      >
                        Hapus
                      </span>
                    ) : (
                      <DeleteGameButton
                        id={game.id}
                        name={game.name}
                        productCount={game._count.products}
                      />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <section>
        <h2 className="text-lg font-bold tracking-tight text-slate-900">
          Tambah game baru
        </h2>

        <form
          action={createGame}
          className={`${card} mt-3 grid gap-4 p-5 sm:grid-cols-2`}
        >
          <label className={label}>
            Nama *
            <input name="name" required maxLength={80} className={input} />
          </label>
          <label className={label}>
            Slug (URL)
            <input
              name="slug"
              maxLength={80}
              placeholder="otomatis dari nama"
              className={input}
            />
          </label>
          <label className={label}>
            Kategori *
            <input
              name="category"
              required
              maxLength={40}
              placeholder="MOBA, Battle Royale, Voucher, ..."
              className={input}
            />
          </label>
          <label className={label}>
            Publisher
            <input name="publisher" maxLength={80} className={input} />
          </label>
          <label className={label}>
            URL gambar (kartu)
            <input
              name="imageUrl"
              maxLength={500}
              placeholder="https://... atau /images/game.png"
              className={input}
            />
          </label>
          <label className={label}>
            URL banner
            <input name="bannerUrl" maxLength={500} className={input} />
          </label>
          <label className={`${label} sm:col-span-2`}>
            Data yang diisi pelanggan (satu baris per field, format{" "}
            <code className="rounded bg-slate-100 px-1 text-xs">key|Label</code>
            )
            <textarea
              name="inputFields"
              rows={3}
              placeholder={"userId|User ID\nzoneId|Zone ID"}
              className={`${input} font-mono`}
            />
            <span className="text-xs font-normal text-slate-400">
              Kosongkan untuk default: User ID saja.
            </span>
          </label>

          <SubmitButton
            pendingText="Menyimpan..."
            className="rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white shadow-sm shadow-indigo-200 transition hover:bg-indigo-500 sm:col-span-2"
          >
            Tambah game
          </SubmitButton>
        </form>
      </section>
    </div>
  );
}