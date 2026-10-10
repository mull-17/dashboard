import { Suspense } from "react";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin-auth";
import LoginForm from "./login-form";

async function AlreadyLoggedIn() {
  if (await isAdmin()) redirect("/admin/dashboard");
  return null;
}

function Gem({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M6 3h12l4 6-10 12L2 9z" />
      <path d="M11 3 8 9l4 12 4-12-3-6" />
      <path d="M2 9h20" />
    </svg>
  );
}

export default function LoginPage() {
  return (
    <main className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <Suspense fallback={null}>
        <AlreadyLoggedIn />
      </Suspense>

      {/* Panel kiri: form */}
      <section className="flex items-center justify-center bg-white px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-950 text-amber-400">
              <Gem className="h-5 w-5" />
            </span>
            <span className="text-base font-bold tracking-tight">
              Topup Admin
            </span>
          </div>

          <h2 className="text-2xl font-bold tracking-tight">
            Masuk ke dashboard
          </h2>

          <LoginForm />
        </div>
      </section>

      {/* Panel kanan: hanya tampil di layar besar */}
      <section className="relative hidden overflow-hidden bg-indigo-950 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-400 text-indigo-950">
            <Gem className="h-5 w-5" />
          </span>
          <span className="text-base font-bold tracking-tight">
            Topup Admin
          </span>
        </div>

        <div className="relative z-10 max-w-md">
          <h1 className="text-4xl font-bold leading-tight tracking-tight">
            Pantau order top up dan atur harga produk dari satu tempat.
          </h1>
          <p className="mt-4 text-indigo-200">
            Khusus untuk pengelola toko. Masuk dengan email dan password admin.
          </p>
        </div>
        <Gem className="pointer-events-none absolute -bottom-16 -right-16 h-96 w-96 text-amber-400/15" />
      </section>
    </main>
  );
}