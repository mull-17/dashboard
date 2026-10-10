"use server";

import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { sendMail } from "@/lib/mailer";

const TTL_MS = 30 * 60 * 1000; // token berlaku 30 menit
const COOLDOWN_MS = 60 * 1000; // minimal 1 menit antar permintaan

const sha256 = (v: string) =>
  crypto.createHash("sha256").update(v).digest("hex");

export type ForgotState = { done?: boolean; error?: string };
export type ResetState = { error?: string };

export async function requestPasswordReset(
  _prev: ForgotState,
  formData: FormData,
): Promise<ForgotState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) return { error: "Isi email." };

  const admin = await prisma.admin.findUnique({ where: { email } });

  if (admin) {
    const recent = await prisma.passwordReset.findFirst({
      where: {
        adminId: admin.id,
        createdAt: { gt: new Date(Date.now() - COOLDOWN_MS) },
      },
    });

    if (!recent) {
      const token = crypto.randomBytes(32).toString("hex");
      await prisma.passwordReset.create({
        data: {
          adminId: admin.id,
          tokenHash: sha256(token),
          expiresAt: new Date(Date.now() + TTL_MS),
        },
      });

      const base = process.env.ADMIN_URL ?? "http://localhost:3001";
      const link = `${base}/admin/login/reset?token=${token}`;

      try {
        await sendMail(
          admin.email,
          "Reset password admin",
          `Klik link berikut untuk membuat password baru (berlaku 30 menit):\n\n${link}\n\nAbaikan email ini kalau kamu tidak memintanya.`,
        );
      } catch (e) {
        console.error("[forgot] gagal kirim email:", e);
      }
    }
  }

  // Jawaban sama baik email terdaftar maupun tidak,
  // supaya orang luar tidak bisa menebak email admin.
  return { done: true };
}

export async function resetPassword(
  _prev: ResetState,
  formData: FormData,
): Promise<ResetState> {
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (password.length < 8) return { error: "Password minimal 8 karakter." };
  if (password !== confirm) return { error: "Konfirmasi password tidak sama." };

  const record = await prisma.passwordReset.findUnique({
    where: { tokenHash: sha256(token) },
  });

  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return { error: "Link tidak valid atau sudah kedaluwarsa. Minta link baru." };
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.$transaction([
    prisma.admin.update({
      where: { id: record.adminId },
      data: { passwordHash },
    }),
    prisma.passwordReset.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
    // hapus token lain milik admin yang sama
    prisma.passwordReset.deleteMany({
      where: { adminId: record.adminId, id: { not: record.id } },
    }),
  ]);

  redirect("/admin/login");
}