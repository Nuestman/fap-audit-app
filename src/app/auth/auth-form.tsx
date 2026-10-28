"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button, Field, Input } from "@/components/ui";
import { signInWithEmail, signUpWithEmail } from "./actions";

export function AuthForm({ mode }: { mode: "sign-in" | "sign-up" }) {
  const action = mode === "sign-in" ? signInWithEmail : signUpWithEmail;
  const [state, formAction, pending] = useActionState(action, null);

  return (
    <form action={formAction} className="space-y-4">
      {mode === "sign-up" ? (
        <Field label="Full name">
          <Input name="name" required autoComplete="name" />
        </Field>
      ) : null}
      <Field label="Email">
        <Input name="email" type="email" required autoComplete="email" />
      </Field>
      <Field label="Password" hint={mode === "sign-up" ? "(at least 8 characters)" : undefined}>
        <Input
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
        />
      </Field>
      {state?.error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      ) : null}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Please wait…" : mode === "sign-in" ? "Sign in" : "Create account"}
      </Button>
      <p className="text-center text-sm text-slate-600">
        {mode === "sign-in" ? (
          <>
            No account yet?{" "}
            <Link href="/auth/sign-up" className="font-medium text-slate-900 underline">
              Create one
            </Link>
          </>
        ) : (
          <>
            Already registered?{" "}
            <Link href="/auth/sign-in" className="font-medium text-slate-900 underline">
              Sign in
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
