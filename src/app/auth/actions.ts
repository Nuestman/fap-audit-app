"use server";

import { redirect } from "next/navigation";
import { isEmailAllowed } from "@/lib/auth/allow-list";
import { APP_HOME } from "@/lib/auth/session";
import { auth } from "@/lib/auth/server";

type FormState = { error: string } | null;

export async function signInWithEmail(_prev: FormState, formData: FormData): Promise<FormState> {
  const { error } = await auth.signIn.email({
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  });
  if (error) return { error: error.message || "Sign-in failed. Check your email and password." };
  redirect(APP_HOME);
}

export async function signUpWithEmail(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!isEmailAllowed(email)) {
    return { error: "This email address is not allowed to create an account." };
  }
  const { error } = await auth.signUp.email({
    email,
    name: String(formData.get("name") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
  });
  if (error) return { error: error.message || "Could not create the account." };
  redirect(APP_HOME);
}

export async function signOut() {
  await auth.signOut();
  redirect("/");
}
