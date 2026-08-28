import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const COOKIE_NAME = "hexcent_session";
const ALG = "HS256";

const FALLBACK_SECRET = "32_character_minimum_random_secret_string_here";
const FALLBACK_ADMIN_PASSWORD = "password";

export function getAdminPassword(): string {
  const v = process.env.ADMIN_PASSWORD;
  if (!v || v.trim() === "") return FALLBACK_ADMIN_PASSWORD;
  return v;
}

function getSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET || FALLBACK_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "SESSION_SECRET must be at least 32 characters. Check .env"
    );
  }
  return new TextEncoder().encode(secret);
}

export type SessionRole = "ADMIN" | "GUEST";

export interface SessionPayload {
  role: SessionRole;
  userId?: string;
  iat?: number;
  exp?: number;
}

export async function encrypt(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecret());
}

export async function decrypt(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      algorithms: [ALG],
    });
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function createSession(
  role: SessionRole,
  res: NextResponse,
  opts?: { userId?: string }
): Promise<void> {
  const token = await encrypt({ role, userId: opts?.userId });
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}

/** Server-component / route-handler helper: reads cookie via next/headers */
export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return decrypt(token);
}

/** Clears session via next/headers (used in server actions) — also export helper for route handlers */
export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export function clearSessionCookie(res: NextResponse): void {
  res.cookies.set(COOKIE_NAME, "", {
    httpOnly: true,
    path: "/",
    maxAge: 0,
  });
}

export const SESSION_COOKIE = COOKIE_NAME;
