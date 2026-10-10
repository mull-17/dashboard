import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  updateGame,
  createProduct,
  updateProduct,
} from "@/app/admin/manage-actions";
import { requireAdmin } from "@/lib/admin-auth";
import SubmitButton from "@/app/admin/submit-button";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
};

type InputField = { key: string; label: string };

const card =
  "rounded-2xl bg-white shadow-[0_1px_2px_rgba(30,27,75,0.04),0_8px_24px_-12px_rgba(30,27,75,0.08)] ring-1 ring-slate-200/60";
const input =
  "mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100";
const label = "text-sm font-medium text-slate-700";
const labelSm = "text-xs font-medium text-slate-500";
const checkbox = "h-4 w-4 rounded accent-indigo-600";
const primaryBtn =
  "rounded-xl bg-indigo-600 text-sm font-semibold text-white shadow-sm shadow-indigo-200 transition hover:bg-indigo-500";

async function GameDetail({ params, searchParams }: PageProps) {
  await requireAdmin();

  const { id } = await params;
  const { error, saved } = await searchParams;

  const game = await prisma.game.findUnique({
    where: { id },
    include: {
      products: { orderBy: [{ sortOrder: "asc" }, { price: "asc" }] },
    },
  });
  if (!game) notFound();

  const fieldsText = (
    Array.isArray(game.inputFields) ? (game.inputFields as InputField[]) : []
  )
    .map((f) => `${f.key}|${f.label}`)
    .join("\n");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          {game.name}
        </h1>
        <p className="mt-1 font-mono text-xs text-slate-400">
          /games/{game.slug}
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
      {saved && !error && (
        <p
          role="status"
          className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700 ring-1 ring-inset ring-emerald-200"
        >
          Perubahan tersimpan.
        </p>
      )}

      {/* ---- Info game ---- */}
      <section>
        <h2 className="text-lg font-bold tracking-tight text-slate-900">
          Info game
        </h2>
        <form
          action={updateGame}
          className={`${card} mt-3 grid gap-4 p-5 sm:grid-cols-2`}
        >
          <input type="hidden" name="id" value={game.id} />

          <label className={label}>
            Nama *
            <input
              name="name"
              required
              maxLength={80}
              defaultValue={game.name}
              className={input}
            />
          </label>
          <label className={label}>
            Slug (URL) *
            <input
              name="slug"
              required
              maxLength={80}
              defaultValue={game.slug}
              className={input}
            />
          </label>
          <label className={label}>
            Kategori *
            <input
              name="category"
              required
              maxLength={40}
              defaultValue={game.category}
              className={input}
            />
          </label>
          <label className={label}>
            Publisher
            <input
              name="publisher"
              maxLength={80}
              defaultValue={game.publisher ?? ""}
              className={input}
            />
          </label>
          <label className={label}>
            URL gambar (kartu)
            <input
              name="imageUrl"
              maxLength={500}
              defaultValue={game.imageUrl ?? ""}
              className={input}
            />
          </label>
          <label className={label}>
            URL banner
            <input
              name="bannerUrl"
              maxLength={500}
              defaultValue={game.bannerUrl ?? ""}
              className={input}
            />
          </label>
          <label className={`${label} sm:col-span-2`}>
            Data yang diisi pelanggan (
            <code className="rounded bg-slate-100 px-1 text-xs">key|Label</code>{" "}
            per baris)
            <textarea
              name="inputFields"
              rows={3}
              defaultValue={fieldsText}
              className={`${input} font-mono`}
            />
          </label>
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              name="isActive"
              defaultChecked={game.isActive}
              className={checkbox}
            />
            Aktif (tampil di website)
          </label>

          <SubmitButton
            pendingText="Menyimpan..."
            className={`${primaryBtn} py-2.5 sm:col-span-2`}
          >
            Simpan info game
          </SubmitButton>
        </form>
      </section>

      {/* ---- Produk ---- */}
      <section>
        <h2 className="text-lg font-bold tracking-tight text-slate-900">
          Produk
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          Stok kosong berarti tak terbatas. Mengubah harga tidak memengaruhi
          order yang sudah dibuat. Produk tidak dihapus, cukup dinonaktifkan.
        </p>

        <div className="mt-3 space-y-3">
          {game.products.length === 0 && (
            <p className={`${card} px-4 py-8 text-center text-sm text-slate-400`}>
              Belum ada produk. Tambahkan lewat form di bawah.
            </p>
          )}

          {game.products.map((p) => {
            const margin = p.basePrice !== null ? p.price - p.basePrice : null;

            return (
              <form
                key={p.id}
                action={updateProduct}
                className={`${card} grid gap-3 p-4 sm:grid-cols-6`}
              >
                <input type="hidden" name="id" value={p.id} />

                <label className={`${labelSm} sm:col-span-2`}>
                  Nama
                  <input
                    name="name"
                    required
                    maxLength={100}
                    defaultValue={p.name}
                    className={input}
                  />
                </label>
                <label className={labelSm}>
                  Harga jual (Rp)
                  <input
                    type="number"
                    name="price"
                    min={1}
                    required
                    defaultValue={p.price}
                    className={input}
                  />
                </label>
                <label className={labelSm}>
                  Modal (Rp)
                  <input
                    type="number"
                    name="basePrice"
                    min={0}
                    defaultValue={p.basePrice ?? ""}
                    className={input}
                  />
                </label>
                <label className={labelSm}>
                  Stok
                  <input
                    type="number"
                    name="stock"
                    min={0}
                    defaultValue={p.stock ?? ""}
                    placeholder="∞"
                    className={input}
                  />
                </label>
                <label className={labelSm}>
                  Urutan
                  <input
                    type="number"
                    name="sortOrder"
                    min={0}
                    defaultValue={p.sortOrder}
                    className={input}
                  />
                </label>
                <label className={`${labelSm} sm:col-span-4`}>
                  Deskripsi
                  <input
                    name="description"
                    maxLength={300}
                    defaultValue={p.description ?? ""}
                    className={input}
                  />
                </label>

                <div className="flex items-end justify-between gap-3 sm:col-span-2">
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      name="isActive"
                      defaultChecked={p.isActive}
                      className={checkbox}
                    />
                    Aktif
                  </label>
                  <SubmitButton
                    pendingText="Menyimpan..."
                    className={`${primaryBtn} px-4 py-2.5`}
                  >
                    Simpan
                  </SubmitButton>
                </div>

                {margin !== null && (
                  <p
                    className={`text-xs sm:col-span-6 ${
                      margin < 0
                        ? "font-semibold text-rose-600"
                        : "text-slate-400"
                    }`}
                  >
                    Margin: Rp {margin.toLocaleString("id-ID")} per transaksi
                    {margin < 0 && " (rugi, harga jual di bawah modal)"}
                  </p>
                )}
              </form>
            );
          })}
        </div>

        {/* ---- Tambah produk ---- */}
        <h3 className="mt-8 font-semibold text-slate-900">Tambah produk</h3>
        <form
          action={createProduct}
          className="mt-3 grid gap-3 rounded-2xl border border-dashed border-indigo-200 bg-white/70 p-4 sm:grid-cols-6"
        >
          <input type="hidden" name="gameId" value={game.id} />

          <label className={`${labelSm} sm:col-span-2`}>
            Nama *
            <input
              name="name"
              required
              maxLength={100}
              placeholder="86 Diamonds"
              className={input}
            />
          </label>
          <label className={labelSm}>
            Harga jual (Rp) *
            <input
              type="number"
              name="price"
              min={1}
              required
              className={input}
            />
          </label>
          <label className={labelSm}>
            Modal (Rp)
            <input type="number" name="basePrice" min={0} className={input} />
          </label>
          <label className={labelSm}>
            Stok
            <input
              type="number"
              name="stock"
              min={0}
              placeholder="∞"
              className={input}
            />
          </label>
          <label className={labelSm}>
            Urutan
            <input
              type="number"
              name="sortOrder"
              min={0}
              defaultValue={0}
              className={input}
            />
          </label>
          <label className={`${labelSm} sm:col-span-4`}>
            Deskripsi
            <input name="description" maxLength={300} className={input} />
          </label>
          <div className="flex items-end sm:col-span-2">
            <SubmitButton
              pendingText="Menambah..."
              className={`${primaryBtn} w-full py-2.5`}
            >
              Tambah produk
            </SubmitButton>
          </div>
        </form>
      </section>
    </div>
  );
}

export default function AdminGameDetailPage({
  params,
  searchParams,
}: PageProps) {
  return (
    <div>
      <Link
        href="/admin/games"
        className="text-sm font-medium text-slate-500 hover:text-indigo-700"
      >
        ← Semua game
      </Link>

      <Suspense
        fallback={<p className="mt-4 text-sm text-slate-400">Memuat game...</p>}
      >
        <GameDetail params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}