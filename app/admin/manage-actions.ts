"use server";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

/* ---------- helper ---------- */

const BACK = "/admin/games";
const MAX_INT = 2_000_000_000; // batas aman kolom Int di Postgres (maks 2.147.483.647)

function str(fd: FormData, key: string) {
  return String(fd.get(key) ?? "").trim();
}

function fail(message: string): never {
  redirect(`${BACK}?error=${encodeURIComponent(message)}`);
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function validUrl(v: string) {
  return v === "" || v.startsWith("/") || /^https?:\/\//i.test(v);
}

// Format per baris: key|Label  (contoh: zoneId|Zone ID). Semua field wajib diisi pelanggan.
function parseInputFields(raw: string) {
  const lines = raw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return [{ key: "userId", label: "User ID", required: true }];
  }
  if (lines.length > 5) return null;

  const seen = new Set<string>();
  const out: { key: string; label: string; required: boolean }[] = [];

  for (const line of lines) {
    const [keyRaw, ...rest] = line.split("|");
    const key = keyRaw.trim();
    const label = rest.join("|").trim();

    if (!/^[a-zA-Z][a-zA-Z0-9]{0,29}$/.test(key)) return null;
    if (!label || label.length > 40 || seen.has(key)) return null;

    seen.add(key);
    out.push({ key, label, required: true });
  }
  return out;
}

function prismaCode(e: unknown) {
  return e instanceof Prisma.PrismaClientKnownRequestError ? e.code : null;
}

/* ---------- tambah game ---------- */

export async function createGame(formData: FormData) {
  await requireAdmin();

  const name = str(formData, "name");
  const slug = slugify(str(formData, "slug") || name);
  const category = str(formData, "category");
  const publisher = str(formData, "publisher") || null;
  const imageUrl = str(formData, "imageUrl");
  const bannerUrl = str(formData, "bannerUrl");

  if (!name || !slug || !category) {
    fail("Nama, slug, dan kategori wajib diisi");
  }
  if (name.length > 80) fail("Nama game maksimal 80 karakter");
  if (slug.length > 80) fail("Slug maksimal 80 karakter");
  if (category.length > 40) fail("Kategori maksimal 40 karakter");
  if (publisher && publisher.length > 80) fail("Publisher maksimal 80 karakter");
  if (imageUrl.length > 500 || bannerUrl.length > 500) {
    fail("URL gambar terlalu panjang");
  }
  if (!validUrl(imageUrl) || !validUrl(bannerUrl)) {
    fail("URL gambar harus diawali http://, https://, atau /");
  }

  const inputFields = parseInputFields(str(formData, "inputFields"));
  if (!inputFields) {
    fail(
      "Format field pemain salah. Pakai satu baris per field: key|Label (maks 5, key tanpa spasi)"
    );
  }

  try {
    await prisma.game.create({
      data: {
        name,
        slug,
        category,
        publisher,
        imageUrl: imageUrl || null,
        bannerUrl: bannerUrl || null,
        inputFields,
      },
    });
  } catch (e) {
    if (prismaCode(e) === "P2002") {
      fail(`Slug "${slug}" sudah dipakai game lain`);
    }
    throw e;
  }

  revalidatePath(BACK);
  redirect(`${BACK}?added=${encodeURIComponent(name)}`);
}

/* ---------- hapus game ---------- */

export async function deleteGame(formData: FormData) {
  await requireAdmin();

  const id = str(formData, "id");
  if (!id) fail("Game tidak ditemukan");

  const game = await prisma.game.findUnique({
    where: { id },
    include: { _count: { select: { orders: true } } },
  });
  if (!game) fail("Game tidak ditemukan");

  // Order tidak boleh kehilangan game/produknya, jadi game yang pernah dipesan tidak dihapus
  if (game._count.orders > 0) {
    fail(
      `"${game.name}" punya ${game._count.orders} order sehingga tidak bisa dihapus. Nonaktifkan saja agar tidak tampil di toko.`
    );
  }

  try {
    // Produk milik game ikut terhapus (onDelete: Cascade di schema)
    await prisma.game.delete({ where: { id } });
  } catch (e) {
    // P2003 = ada order baru yang masuk tepat saat penghapusan
    if (prismaCode(e) === "P2003") {
      fail(`"${game.name}" baru saja menerima order dan tidak bisa dihapus.`);
    }
    throw e;
  }

  revalidatePath(BACK);
  redirect(`${BACK}?deleted=${encodeURIComponent(game.name)}`);
}

/* ---------- reseller ---------- */

const RESELLER_BACK = "/admin/reseller";
const LEVELS = ["BRONZE", "SILVER", "GOLD"] as const;
type Level = (typeof LEVELS)[number];

function failReseller(message: string): never {
  redirect(`${RESELLER_BACK}?error=${encodeURIComponent(message)}`);
}

export async function createReseller(formData: FormData) {
  await requireAdmin();

  const name = str(formData, "name");
  const phone = str(formData, "phone");
  const email = str(formData, "email").toLowerCase();
  const level = str(formData, "level") || "BRONZE";

  if (!name) failReseller("Nama reseller wajib diisi");
  if (name.length > 80) failReseller("Nama reseller maksimal 80 karakter");

  if (phone && !/^\+?[0-9\s-]{8,20}$/.test(phone)) {
    failReseller("Nomor WhatsApp tidak valid");
  }
  if (email && email.length > 120) {
    failReseller("Email maksimal 120 karakter");
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    failReseller("Format email tidak valid");
  }
  if (!(LEVELS as readonly string[]).includes(level)) {
    failReseller("Level reseller tidak valid");
  }

  try {
    await prisma.reseller.create({
      data: {
        name,
        phone: phone || null,
        email: email || null,
        level: level as Level,
      },
    });
  } catch (e) {
    if (prismaCode(e) === "P2002") {
      failReseller("Email atau nomor WhatsApp sudah dipakai reseller lain");
    }
    throw e;
  }

  revalidatePath(RESELLER_BACK);
  redirect(`${RESELLER_BACK}?added=${encodeURIComponent(name)}`);
}

export async function toggleReseller(formData: FormData) {
  await requireAdmin();

  const id = str(formData, "id");
  if (!id) failReseller("Reseller tidak ditemukan");

  const reseller = await prisma.reseller.findUnique({
    where: { id },
    select: { active: true },
  });
  if (!reseller) failReseller("Reseller tidak ditemukan");

  await prisma.reseller.update({
    where: { id },
    data: { active: !reseller.active },
  });

  revalidatePath(RESELLER_BACK);
}

/* ---------- voucher ---------- */

const VOUCHER_BACK = "/admin/voucher";
const VOUCHER_TYPES = ["PERCENT", "FIXED"] as const;
type VoucherType = (typeof VOUCHER_TYPES)[number];

function failVoucher(message: string): never {
  redirect(`${VOUCHER_BACK}?error=${encodeURIComponent(message)}`);
}

export async function createVoucher(formData: FormData) {
  await requireAdmin();

  const code = str(formData, "code").toUpperCase();
  const type = str(formData, "type");
  const value = Number(str(formData, "value"));
  const quota = Number(str(formData, "quota"));
  const expiresRaw = str(formData, "expiresAt"); // format YYYY-MM-DD

  if (!/^[A-Z0-9_-]{3,20}$/.test(code)) {
    failVoucher("Kode voucher 3-20 karakter: huruf, angka, - atau _ (tanpa spasi)");
  }
  if (!(VOUCHER_TYPES as readonly string[]).includes(type)) {
    failVoucher("Jenis potongan tidak valid");
  }
  if (!Number.isInteger(value) || value < 1) {
    failVoucher("Nilai potongan harus bilangan bulat minimal 1");
  }
  if (value > MAX_INT) failVoucher("Nilai potongan terlalu besar");
  if (type === "PERCENT" && value > 100) {
    failVoucher("Potongan persen maksimal 100");
  }
  if (!Number.isInteger(quota) || quota < 1) {
    failVoucher("Kuota harus bilangan bulat minimal 1");
  }
  if (quota > MAX_INT) failVoucher("Kuota terlalu besar");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(expiresRaw)) {
    failVoucher("Tanggal berlaku tidak valid");
  }

  // Berlaku sampai akhir hari (WIB)
  const expiresAt = new Date(`${expiresRaw}T23:59:59+07:00`);
  if (Number.isNaN(expiresAt.getTime())) {
    failVoucher("Tanggal berlaku tidak valid");
  }
  if (expiresAt.getTime() < Date.now()) {
    failVoucher("Tanggal berlaku tidak boleh di masa lalu");
  }

  try {
    await prisma.voucher.create({
      data: { code, type: type as VoucherType, value, quota, expiresAt },
    });
  } catch (e) {
    if (prismaCode(e) === "P2002") {
      failVoucher(`Kode "${code}" sudah dipakai voucher lain`);
    }
    throw e;
  }

  revalidatePath(VOUCHER_BACK);
  redirect(`${VOUCHER_BACK}?added=${encodeURIComponent(code)}`);
}

export async function toggleVoucher(formData: FormData) {
  await requireAdmin();

  const id = str(formData, "id");
  if (!id) failVoucher("Voucher tidak ditemukan");

  const voucher = await prisma.voucher.findUnique({
    where: { id },
    select: { active: true },
  });
  if (!voucher) failVoucher("Voucher tidak ditemukan");

  await prisma.voucher.update({
    where: { id },
    data: { active: !voucher.active },
  });

  revalidatePath(VOUCHER_BACK);
}

/* ---------- detail game & produk ---------- */

function gamePath(id: string) {
  return `${BACK}/${id}`;
}

function failAt(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

// Angka opsional: kosong -> null, tidak valid -> undefined
function optInt(fd: FormData, key: string, min: number): number | null | undefined {
  const raw = str(fd, key);
  if (raw === "") return null;
  const n = Number(raw);
  return Number.isInteger(n) && n >= min && n <= MAX_INT ? n : undefined;
}

export async function updateGame(formData: FormData) {
  await requireAdmin();

  const id = str(formData, "id");
  if (!id) fail("Game tidak ditemukan");
  const path = gamePath(id);

  const name = str(formData, "name");
  const slug = slugify(str(formData, "slug") || name);
  const category = str(formData, "category");
  const publisher = str(formData, "publisher") || null;
  const imageUrl = str(formData, "imageUrl");
  const bannerUrl = str(formData, "bannerUrl");
  const isActive = formData.get("isActive") === "on";

  if (!name || !slug || !category) {
    failAt(path, "Nama, slug, dan kategori wajib diisi");
  }
  if (name.length > 80) failAt(path, "Nama game maksimal 80 karakter");
  if (slug.length > 80) failAt(path, "Slug maksimal 80 karakter");
  if (category.length > 40) failAt(path, "Kategori maksimal 40 karakter");
  if (publisher && publisher.length > 80) {
    failAt(path, "Publisher maksimal 80 karakter");
  }
  if (imageUrl.length > 500 || bannerUrl.length > 500) {
    failAt(path, "URL gambar terlalu panjang");
  }
  if (!validUrl(imageUrl) || !validUrl(bannerUrl)) {
    failAt(path, "URL gambar harus diawali http://, https://, atau /");
  }

  const inputFields = parseInputFields(str(formData, "inputFields"));
  if (!inputFields) {
    failAt(
      path,
      "Format field pemain salah. Pakai satu baris per field: key|Label (maks 5, key tanpa spasi)"
    );
  }

  try {
    await prisma.game.update({
      where: { id },
      data: {
        name,
        slug,
        category,
        publisher,
        imageUrl: imageUrl || null,
        bannerUrl: bannerUrl || null,
        inputFields,
        isActive,
      },
    });
  } catch (e) {
    const code = prismaCode(e);
    if (code === "P2002") failAt(path, `Slug "${slug}" sudah dipakai game lain`);
    if (code === "P2025") fail("Game tidak ditemukan");
    throw e;
  }

  revalidatePath(BACK);
  revalidatePath(path);
  redirect(`${path}?saved=1`);
}

function readProduct(formData: FormData, path: string) {
  const name = str(formData, "name");
  const price = Number(str(formData, "price"));
  const basePrice = optInt(formData, "basePrice", 0);
  const stock = optInt(formData, "stock", 0);
  const sortOrder = optInt(formData, "sortOrder", 0);
  const description = str(formData, "description") || null;

  if (!name) failAt(path, "Nama produk wajib diisi");
  if (name.length > 100) failAt(path, "Nama produk maksimal 100 karakter");
  if (description && description.length > 300) {
    failAt(path, "Deskripsi maksimal 300 karakter");
  }
  if (!Number.isInteger(price) || price < 1) {
    failAt(path, "Harga jual harus bilangan bulat minimal 1");
  }
  if (price > MAX_INT) failAt(path, "Harga terlalu besar");
  if (basePrice === undefined) failAt(path, "Modal harus bilangan bulat, minimal 0");
  if (stock === undefined) failAt(path, "Stok harus bilangan bulat, minimal 0");
  if (sortOrder === undefined) failAt(path, "Urutan harus bilangan bulat, minimal 0");

  // Hapus blok ini kalau kamu memang kadang menjual di bawah modal (promo)
  if (basePrice !== null && price < basePrice) {
    failAt(path, "Harga jual lebih kecil dari modal. Periksa lagi.");
  }

  return { name, price, basePrice, stock, sortOrder: sortOrder ?? 0, description };
}

export async function createProduct(formData: FormData) {
  await requireAdmin();

  const gameId = str(formData, "gameId");
  if (!gameId) fail("Game tidak ditemukan");
  const path = gamePath(gameId);

  const data = readProduct(formData, path);

  const game = await prisma.game.findUnique({
    where: { id: gameId },
    select: { id: true },
  });
  if (!game) fail("Game tidak ditemukan");

  await prisma.product.create({ data: { ...data, gameId } });

  revalidatePath(path);
  redirect(`${path}?saved=1`);
}

export async function updateProduct(formData: FormData) {
  await requireAdmin();

  const id = str(formData, "id");
  if (!id) fail("Produk tidak ditemukan");

  const product = await prisma.product.findUnique({
    where: { id },
    select: { gameId: true },
  });
  if (!product) fail("Produk tidak ditemukan");

  const path = gamePath(product.gameId);
  const data = readProduct(formData, path);
  const isActive = formData.get("isActive") === "on";

  await prisma.product.update({ where: { id }, data: { ...data, isActive } });

  revalidatePath(path);
  redirect(`${path}?saved=1`);
}