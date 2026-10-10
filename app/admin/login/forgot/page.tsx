import Link from "next/link";
import ForgotForm from "./forgot-form";

export default function ForgotPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-6 py-12">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Lupa password
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Masukkan email admin. Kami kirim link untuk membuat password baru.
        </p>
        <ForgotForm />
        <Link
          href="/admin/login"
          className="mt-6 inline-block text-sm font-semibold text-indigo-700 hover:underline"
        >
          ← Kembali ke login
        </Link>
      </div>
    </main>
  );
}