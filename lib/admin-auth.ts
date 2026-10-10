import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { prisma } from "@/lib/prisma";

const COOKIE = "admin_session";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 hari

function sign(adminId: string, expires: string, passwordHash: string) {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret || secret.length < 32)
    throw new Error("ADMIN_SESSION_SECRET harus diisi, minimal 32 karakter");
  return createHmac("sha256", secret)
    .update(`${adminId}.${expires}.${passwordHash}`)
    .digest("hex");
}

// Perbandingan aman (tidak bocor lewat selisih waktu)
function safeEqual(a: string, b: string) {
  const ha = createHmac("sha256", "cmp").update(a).digest();
  const hb = createHmac("sha256", "cmp").update(b).digest();
  return timingSafeEqual(ha, hb);
}

export async function createSession(adminId: string) {
  const admin = await prisma.admin.findUnique({
    where: { id: adminId },
    select: { passwordHash: true },
  });
  if (!admin) throw new Error("Admin tidak ditemukan");

  const expires = String(Date.now() + MAX_AGE * 1000);
  const value = `${adminId}.${expires}.${sign(adminId, expires, admin.passwordHash)}`;

  const store = await cookies();
  store.set(COOKIE, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function destroySession() {
  const store = await cookies();
  store.delete(COOKIE);
}

export async function isAdmin() {
  await connection();
  const store = await cookies();
  const value = store.get(COOKIE)?.value;
  if (!value) return false;

  const parts = value.split(".");
  if (parts.length !== 3) return false;
  const [adminId, expires, sig] = parts;

  const exp = Number(expires);
  if (!Number.isFinite(exp) || exp <= Date.now()) return false;

  // Admin harus masih ada. Hash password ikut menandatangani sesi,
  // jadi ganti/reset password otomatis mencabut sesi lama.
  const admin = await prisma.admin.findUnique({
    where: { id: adminId },
    select: { passwordHash: true },
  });
  if (!admin) return false;

  return safeEqual(sig, sign(adminId, expires, admin.passwordHash));
}

export async function requireAdmin() {
  if (!(await isAdmin())) redirect("/admin/login");
}