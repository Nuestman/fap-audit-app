import type { Metadata } from "next";
import { AuthForm } from "../auth-form";

export const metadata: Metadata = { title: "Sign in" };

export default function SignInPage() {
  return (
    <>
      <h1 className="mb-4 text-lg font-semibold text-brand-accent">Sign in</h1>
      <AuthForm mode="sign-in" />
    </>
  );
}
