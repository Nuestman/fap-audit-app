import { isEmailAllowed } from "@/lib/auth/allow-list";
import { auth } from "@/lib/auth/server";

const handlers = auth.handler();

export const GET = handlers.GET;

export async function POST(request: Request, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  if (path.join("/") === "sign-up/email") {
    const body = await request
      .clone()
      .json()
      .catch(() => null);
    if (!isEmailAllowed(body?.email)) {
      return Response.json(
        { message: "This email address is not allowed to create an account." },
        { status: 403 },
      );
    }
  }
  return handlers.POST(request, context);
}
