import { auth } from "@/lib/auth/server";

export default auth.middleware({ loginUrl: "/auth/sign-in" });

/** Protect app and data routes; leave `/`, `/auth/*`, and `/api/auth/*` public. */
export const config = {
  matcher: [
    "/audits/:path*",
    "/actions/:path*",
    "/settings/:path*",
    "/profile/:path*",
    "/changelog/:path*",
    "/api/attachments/:path*",
    "/api/audits/:path*",
    "/api/profile/:path*",
  ],
};
