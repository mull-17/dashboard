import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import ResetForm from "./reset-form";

async function ResetContent({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  await connection(); // dipakai untuk membandingkan dengan waktu sekarang
  const { token } = await searchParams;

  const record = token
    ? await prisma.passwordReset.findUnique({
        where: {
          tokenHash: crypto.createHash("sha256").update(token).digest("hex"),
        },
      })
    : null;

  const valid = !!record && !record.usedAt && record.expiresAt > new Date();

  if (!valid) {
    return (
      <>
        <p className="mt-5 rounded-lg bg-red-50 px-3.5 py-3 text-sm text-red-800 ring-1 ring-inset ring-red-600/20">
          Link tidak valid atau sudah kedaluwarsa.
        </p>
        <Link
          href="/admin/login/forgot"
          className="mt-4 inline-block text-sm font-semibold text-indigo-700 hover:underline"
        >
          Minta link baru
        </Link>
      </>
    );
  }

  return <ResetForm token={token!} />;
}

export default function ResetPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-6 py-12">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Buat password baru
        </h1>
        <Suspense
          fallback={<p className="mt-5 text-sm text-slate-500">Memeriksa link...</p>}
        >
          <ResetContent searchParams={searchParams} />
        </Suspense>
      </div>
    </main>
  );
}