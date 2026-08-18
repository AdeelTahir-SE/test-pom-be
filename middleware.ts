import { NextResponse, type NextRequest } from "next/server";
import { getAuthContext } from "@/lib/auth/context";

function destinationFor(auth: Awaited<ReturnType<typeof getAuthContext>>): string | null {
  if (!auth) return null;
  if (auth.kind === "platform_admin") return "/admin";
  return auth.role === "worker" ? "/dashboard/worker" : "/dashboard/office";
}

// Sends already-authenticated users away from the auth pages, straight to
// their dashboard. Fails open on any verification error/miss: a stale
// access_token cookie is never cleared on a failed refresh (see
// api/auth/refresh/route.ts), so treating "cookie present" as "logged in"
// here would infinite-loop between /login and the dashboard's own 401 bounce.
export async function middleware(request: NextRequest) {
  try {
    const auth = await getAuthContext(request);
    const destination = destinationFor(auth);
    if (destination) {
      return NextResponse.redirect(new URL(destination, request.url));
    }
  } catch (err) {
    console.error(
      "[middleware_auth_check_failed]",
      err instanceof Error ? err.message : String(err)
    );
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/login", "/register", "/forgot-password"],
};
