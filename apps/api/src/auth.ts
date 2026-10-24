import type { Database } from "bun:sqlite";
import type { Context } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { HTTPException } from "hono/http-exception";
import { sign, verify } from "hono/jwt";
import * as z from "zod";
import {
  MIN_TEXT_LENGTH,
  SessionUserSchema,
  VAULT_CONNECTED,
  VAULT_NOT_CONFIGURED,
  type SessionUser,
} from "shared";
import { findUserById, type UserRow } from "./users";
import { ENV_PRODUCTION, env } from "./env";
import { logger } from "./logger";

export const SESSION_COOKIE = "erp_fish_session" as const;

const JWT_ALGORITHM = "HS256" as const;
const UNAUTHORIZED_STATUS = 401 as const;
const MS_PER_SECOND = 1000 as const;
const COOKIE_PATH = "/" as const;
const COOKIE_SAME_SITE = "Lax" as const;
const INVALID_SESSION_MESSAGE = "invalid_session" as const;
const SESSION_VERIFY_MESSAGE = "session_verify_failed" as const;

const SessionClaimsSchema = z.object({
  sub: z.string().min(MIN_TEXT_LENGTH),
  email: z.email(),
});

export function currentVault(): SessionUser["vault"] {
  return env.TINYFISH_API_KEY === undefined ? VAULT_NOT_CONFIGURED : VAULT_CONNECTED;
}

export function toSessionUser(user: UserRow): SessionUser {
  return SessionUserSchema.parse({
    id: user.id,
    email: user.email,
    erp_host: user.erp_host,
    profile_id: user.profile_id,
    vault: currentVault(),
  });
}

export function hashPassword(password: string): Promise<string> {
  return Bun.password.hash(password);
}

export function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  return Bun.password.verify(password, passwordHash);
}

export function createSessionToken(user: { id: string; email: string }): Promise<string> {
  const issuedAt: number = Math.floor(Date.now() / MS_PER_SECOND);
  return sign(
    {
      sub: user.id,
      email: user.email,
      iat: issuedAt,
      exp: issuedAt + env.JWT_TTL_SECONDS,
    },
    env.JWT_SECRET,
    JWT_ALGORITHM,
  );
}

function cookieOptions(): { path: string; httpOnly: boolean; sameSite: "Lax"; secure: boolean } {
  return {
    path: COOKIE_PATH,
    httpOnly: true,
    sameSite: COOKIE_SAME_SITE,
    secure: env.NODE_ENV === ENV_PRODUCTION,
  };
}

export function setSessionCookie(c: Context, token: string): void {
  setCookie(c, SESSION_COOKIE, token, {
    ...cookieOptions(),
    maxAge: env.JWT_TTL_SECONDS,
  });
}

export function clearSessionCookie(c: Context): void {
  deleteCookie(c, SESSION_COOKIE, cookieOptions());
}

export async function readSessionUser(c: Context, db: Database): Promise<UserRow> {
  const token: string | undefined = getCookie(c, SESSION_COOKIE);
  if (token === undefined) {
    throw new HTTPException(UNAUTHORIZED_STATUS, { message: INVALID_SESSION_MESSAGE });
  }
  let claims: unknown;
  try {
    claims = await verify(token, env.JWT_SECRET, JWT_ALGORITHM);
  } catch {
    logger.warn({}, SESSION_VERIFY_MESSAGE);
    throw new HTTPException(UNAUTHORIZED_STATUS, { message: INVALID_SESSION_MESSAGE });
  }
  const parsed = SessionClaimsSchema.safeParse(claims);
  if (!parsed.success) {
    throw new HTTPException(UNAUTHORIZED_STATUS, { message: INVALID_SESSION_MESSAGE });
  }
  const user = findUserById(db, parsed.data.sub);
  if (user === undefined) {
    throw new HTTPException(UNAUTHORIZED_STATUS, { message: INVALID_SESSION_MESSAGE });
  }
  return user;
}
