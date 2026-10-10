import { Suspense } from "react";
import { requireAdmin } from "@/lib/admin-auth";
import AdminShell from "./admin-shell";

// Pembacaan cookie (di dalam requireAdmin) harus berada di dalam <Suspense>
// karena Cache Components aktif.
async function ShellWithAuth({ children }: { children: React.ReactNode }) {
  await requireAdmin();

  return <AdminShell>{children}</AdminShell>;
}

export default function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<p className="p-6 text-sm text-zinc-500">Memuat...</p>}>
      <ShellWithAuth>{children}</ShellWithAuth>
    </Suspense>
  );
}