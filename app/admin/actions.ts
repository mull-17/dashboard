"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { createSession, destroySession, requireAdmin } from "@/lib/admin-auth";
import {
  clearFailedLogins,
  getClientIp,
  isLoginBlocked,
  recordFailedLogin,
} from "@/lib/login-limit";

/* ---------- login / logout ---------- */
export type LoginState = { error?: string; email?: string };

export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Isi email dan password.", email };
  }

  const ip = await getClientIp();

  if (await isLoginBlocked(ip)) {
    return { error: "Terlalu banyak percobaan.", email };
  }

  const admin = await prisma.admin.findUnique({ where: { email } });
  const valid = admin ? await bcrypt.compare(password, admin.passwordHash) : false;

  if (!admin || !valid) {
    await recordFailedLogin(ip);
    return { error: "Email atau password salah.", email };
  }

  await clearFailedLogins(ip);
  await createSession(admin.id);
  redirect("/admin/dashboard");
}

export async function logout() {
  await destroySession();
  redirect("/admin/login");
}

/* ---------- order ---------- */

// Dipanggil dari <form action={markRefunded}> dengan <input type="hidden" name="id" value={order.id} />
export async function markRefunded(formData: FormData) {
  await requireAdmin();

  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id <= 0) return;

  // Hanya order FAILED yang boleh direfund
  const result = await prisma.order.updateMany({
    where: { id, status: "FAILED" },
    data: { status: "REFUNDED" },
  });
  if (result.count === 0) return;

  revalidatePath("/admin/orders");
  revalidatePath("/admin/dashboard"); // pendapatan dan hitungan status ikut berubah
}