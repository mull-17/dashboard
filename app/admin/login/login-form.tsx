"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginAction, type LoginState } from "@/app/admin/actions";
import PasswordField from "./password-field";

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600";

export default function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(
    loginAction,
    {},
  );

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
        defaultValue={state.email}
        placeholder="Email"
        className={inputClass}
      />
      <PasswordField />

      <div className="text-right">
        <Link
          href="/admin/login/forgot"
          className="text-sm font-semibold text-indigo-700 hover:underline"
        >
          Lupa password?
        </Link>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-indigo-950 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-900 disabled:opacity-60"
      >
        {pending ? "Memeriksa..." : "Masuk"}
      </button>
    </form>
  );
}