import "server-only";

import { redirect } from "next/navigation";
import { auth } from "./server";

export type SessionUser = { id: string; name: string; email: string };

/** The signed-in user, or null. Route handlers use this and answer 401 themselves. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const { data } = await auth.getSession();
  return data?.user ? { id: data.user.id, name: data.user.name, email: data.user.email } : null;
}

/** Returns the signed-in user or redirects to sign-in. Use in every page and Server Action. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/auth/sign-in");
  return user;
}
