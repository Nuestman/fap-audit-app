import type { Metadata } from "next";
import { AuthForm } from "../auth-form";

export const metadata: Metadata = { title: "Create account" };

export default function SignUpPage() {
  return (
    <>
      <h1 className="mb-1 text-lg font-semibold">Create account</h1>
      <p className="mb-4 text-sm text-slate-500">Only approved email addresses can register.</p>
      <AuthForm mode="sign-up" />
    </>
  );
}
