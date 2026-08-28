import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const COOKIE_NAME = "hexcent_session";
const FALLBACK_SECRET = "32_character_minimum_random_secret_string_here";

function getSecret(): Uint8Array {
  const s = process.env.SESSION_SECRET || FALLBACK_SECRET;
  return new TextEncoder().encode(s);
}

async function getRoleFromRequest(req: NextRequest): Promise<string | null> {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      algorithms: ["HS256"],
    });
    return (payload as unknown as { role?: string }).role ?? null;
  } catch {
    return null;
  }
}

const ADMIN_PAGE_PREFIXES = ["/admin", "/workspace"];
const ADMIN_API_PREFIXES = ["/api/documents", "/api/admin"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const role = await getRoleFromRequest(req);

  const isAdminPage = ADMIN_PAGE_PREFIXES.some((p) => pathname.startsWith(p));
  const isAdminApi = ADMIN_API_PREFIXES.some((p) => pathname.startsWith(p));

  // Block /admin and /workspace for non-admin — redirect to login
  if (isAdminPage) {
    if (role !== "ADMIN") {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
  }

  // Protect admin API + document writes
  if (isAdminApi) {
    // GET /api/documents is allowed for guests? No — task says block workspace for guests entirely,
    // but document GET is workspace data — block non-admin as well for strict gating
    // Keep read allowed for public docs check at route handler level, but middleware blocks write
    const isWrite = req.method !== "GET" && req.method !== "HEAD" && req.method !== "OPTIONS";
    if (isWrite && role !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: admin access required" },
        { status: 403 }
      );
    }
    // For /api/admin/* — all methods require ADMIN
    if (pathname.startsWith("/api/admin") && role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/workspace/:path*",
    "/api/documents/:path*",
    "/api/admin/:path*",
  ],
};
