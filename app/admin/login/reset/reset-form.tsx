"use client";

import { useActionState } from "react";
import { resetPassword, type ResetState } from "../reset-actions";
import PasswordField from "../password-field";

export default function ResetForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState<ResetState, FormData>(
    resetPassword,
    {},
  );

  return (
    <form action={action} className="mt-5 space-y-4">
      <input type="hidden" name="token" value={token} />
      {state.error && (
        <p
          role="alert"
          className="rounded-lg bg-red-50 px-3.5 py-2.5 text-sm text-red-800 ring-1 ring-inset ring-red-600/20"
        >
          {state.error}
        </p>
      )}
      <PasswordField
        name="password"
        placeholder="Password baru (min. 8 karakter)"
        autoComplete="new-password"
        minLength={8}
      />
      <PasswordField
        name="confirm"
        placeholder="Ulangi password baru"
        autoComplete="new-password"
        minLength={8}
      />
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-indigo-950 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-900 disabled:opacity-60"
      >
        {pending ? "Menyimpan..." : "Simpan password baru"}
      </button>
    </form>
  );
}