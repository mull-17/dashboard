import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

const WINDOW_MS = 15 * 60 * 1000; // jendela 15 menit
const MAX_PER_IP = 5; // gagal maksimal per IP
const MAX_GLOBAL = 30; // gagal maksimal dari semua IP (cadangan)

export async function getClientIp() {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return h.get("x-real-ip") ?? "unknown";
}

export async function isLoginBlocked(ip: string) {
  const since = new Date(Date.now() - WINDOW_MS);

  const [perIp, global] = await Promise.all([
    prisma.loginAttempt.count({ where: { ip, createdAt: { gte: since } } }),
    prisma.loginAttempt.count({ where: { createdAt: { gte: since } } }),
  ]);

  return perIp >= MAX_PER_IP || global >= MAX_GLOBAL;
}

export async function recordFailedLogin(ip: string) {
  await prisma.loginAttempt.create({ data: { ip } });

  // Bersihkan catatan lama supaya tabel tidak menumpuk
  await prisma.loginAttempt.deleteMany({
    where: { createdAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
  });
}

export async function clearFailedLogins(ip: string) {
  await prisma.loginAttempt.deleteMany({ where: { ip } });
}