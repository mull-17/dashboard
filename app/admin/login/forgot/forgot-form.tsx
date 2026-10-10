"use client";

import { useActionState } from "react";
import {
  requestPasswordReset,
  type ForgotState,
} from "../reset-actions";

export default function ForgotForm() {
  const [state, action, pending] = useActionState<ForgotState, FormData>(
    requestPasswordReset,
    {},
  );

  if (state.done) {
    return (
      <p className="mt-5 rounded-lg bg-emerald-50 px-3.5 py-3 text-sm text-emerald-800 ring-1 ring-inset ring-emerald-600/20">
        Kalau email itu terdaftar, link reset sudah dikirim. Cek inbox (dan
        folder spam). Link berlaku 30 menit.
      </p>
    );
  }

  return (
    <form action={action} className="mt-5 space-y-4">
      {state.error && (
        <p
          role="alert"
          className="rounded-lg bg-red-50 px-3.5 py-2.5 text-sm text-red-800 ring-1 ring-inset ring-red-600/20"
        >
          {state.error}
        </p>
      )}
      <input
        name="email"
        type="email"
        required
        autoComplete="username"
        placeholder="Email admin"
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600"
      />
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-indigo-950 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-900 disabled:opacity-60"
      >
        {pending ? "Mengirim..." : "Kirim link reset"}
      </button>
    </form>
  );
}