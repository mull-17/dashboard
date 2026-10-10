"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import { logout } from "../actions";
import NavLink from "./nav-link";
import SubmitButton from "../submit-button";

const I = {
  orders: "M3 5h18M3 12h18M3 19h12",
  dashboard: "M4 13h6V4H4zM14 20h6v-9h-6zM14 8h6V4h-6zM4 20h6v-3H4z",
  games: "M6 12h4M8 10v4M15 13h.01M18 11h.01M17.3 5H6.7a4 4 0 0 0-3.9 3.1l-1.2 5.6A3 3 0 0 0 7.5 16l.9-1.5h7.2l.9 1.5a3 3 0 0 0 5.9-2.3l-1.2-5.6A4 4 0 0 0 17.3 5z",
  reseller: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8",
  statistik: "M4 20V10M10 20V4M16 20v-7M22 20H2",
  voucher: "M3 9a2 2 0 0 0 0 4v3a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-3a2 2 0 0 1 0-4V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2zM13 5v14",
};

const NAV = [
  { href: "/admin/dashboard", label: "Dashboard", icon: I.dashboard },
  { href: "/admin/orders", label: "Orders", icon: I.orders },
  { href: "/admin/games", label: "Games", icon: I.games },
  { href: "/admin/reseller", label: "Reseller", icon: I.reseller },
  { href: "/admin/statistik", label: "Statistik", icon: I.statistik },
  { href: "/admin/voucher", label: "Voucher", icon: I.voucher },
];

function Icon({ d, className = "h-[18px] w-[18px]" }: { d: string; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-400 text-white shadow-sm shadow-indigo-300/50">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
          <path d="M6 3h12l4 6-10 12L2 9z" />
          <path d="M2 9h20" />
        </svg>
      </span>
      <div className="leading-tight">
        <p className="text-[15px] font-bold tracking-tight text-slate-900">Topup Admin</p>
        <p className="text-xs text-slate-400">Kelola toko kamu</p>
      </div>
    </div>
  );
}

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#f5f5fa] text-slate-800">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-200/70 bg-white/90 backdrop-blur transition-transform md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="px-5 pb-4 pt-6">
          <Brand />
        </div>

        <p className="px-6 pb-2 pt-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          Menu
        </p>
        <nav className="flex-1 space-y-1 px-3">
          {NAV.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <NavLink
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                ariaCurrent={active ? "page" : undefined}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
                  active
                    ? "bg-indigo-50 font-semibold text-indigo-700 shadow-sm ring-1 ring-indigo-100"
                    : "font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                }`}
              >
                <Icon d={item.icon} />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        <div className="space-y-2 border-t border-slate-200/70 p-4">
          <a
            href={process.env.NEXT_PUBLIC_STORE_URL ?? "/"}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-slate-50 py-2 text-sm font-medium text-slate-700 ring-1 ring-slate-200/70 transition hover:bg-slate-100"
          >
            Lihat toko
            <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
              <path d="M9 2h5v5M14 2 7.5 8.5M12 9.5V13a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h3.5" />
            </svg>
          </a>
          <form action={logout}>
            <SubmitButton
              pendingText="Keluar..."
              className="w-full rounded-xl py-2 text-sm font-medium text-rose-600 transition hover:bg-rose-50"
            >
              Keluar
            </SubmitButton>
          </form>
        </div>
      </aside>

      {open && (
        <button
          aria-label="Tutup menu"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-30 bg-slate-900/20 backdrop-blur-[2px] md:hidden"
        />
      )}

      {/* Konten */}
      <div className="md:pl-64">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-slate-200/70 bg-white/80 px-4 backdrop-blur md:hidden">
          <button
            onClick={() => setOpen(true)}
            aria-label="Buka menu"
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
          >
            <Icon d="M4 6h16M4 12h16M4 18h16" className="h-5 w-5" />
          </button>
          <span className="font-semibold text-slate-900">Topup Admin</span>
        </header>
        <main className="w-full px-4 pb-12 pt-6 sm:px-5 lg:px-6 lg:pt-8 2xl:px-10">
          {children}
        </main>
      </div>
    </div>
  );
}