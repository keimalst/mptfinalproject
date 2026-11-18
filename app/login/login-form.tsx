"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { signIn, type LoginState } from "./actions";
import { btn, cx, Field, inputCls } from "@/components/ui";

export function LoginForm() {
  const params = useSearchParams();
  const [state, action, pending] = useActionState<LoginState, FormData>(signIn, {});
  const notice = params.get("error") === "inactive" ? "Akun Anda dinonaktifkan. Hubungi Admin Sistem." : undefined;
  const error = state.error ?? notice;

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="next" value={params.get("next") ?? ""} />
      <Field label="Email" htmlFor="email">
        <input id="email" name="email" type="email" autoComplete="username" required className={inputCls} placeholder="nama@its.ac.id" />
      </Field>
      <Field label="Kata sandi" htmlFor="password">
        <input id="password" name="password" type="password" autoComplete="current-password" required className={inputCls} />
      </Field>
      {error && <p role="alert" className="rounded-md bg-signal-wash px-3 py-2 text-sm font-medium text-signal">{error}</p>}
      <button type="submit" disabled={pending} className={cx(btn.base, btn.primary, "w-full py-2.5")}>
        {pending ? "Memeriksa…" : "Masuk"}
      </button>
    </form>
  );
}
