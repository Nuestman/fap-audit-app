"use server";

import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { TrackedActionInput, updateAction } from "@/lib/audit/action-mutations";

export async function saveTrackedAction(id: number, input: TrackedActionInput) {
  const user = await requireUser();
  await updateAction(z.number().int().positive().parse(id), TrackedActionInput.parse(input), user.email);
}
