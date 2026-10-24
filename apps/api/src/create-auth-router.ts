import type { Database } from "bun:sqlite";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import {
  API_PATHS,
  LoginRequestSchema,
  OnboardingRequestSchema,
  SignupRequestSchema,
  type LoginRequest,
  type SignupRequest,
} from "shared";
import {
  createSessionToken,
  hashPassword,
  readSessionUser,
  setSessionCookie,
  toSessionUser,
  verifyPassword,
  clearSessionCookie,
} from "./auth";
import { logger } from "./logger";
import { findUserByEmail, insertUser, findUserById, type UserRow } from "./users";
import { updateConnection } from "./connections";

const AUTH_LOG_MESSAGE = "auth_request" as const;
const ONBOARDING_LOG_MESSAGE = "onboarding_request" as const;
const DUPLICATE_EMAIL_MESSAGE = "email_already_registered" as const;
const INVALID_CREDENTIALS_MESSAGE = "invalid_credentials" as const;
const LOGOUT_OK = "ok" as const;
const CREATED_STATUS = 201 as const;
const UNAUTHORIZED_STATUS = 401 as const;
const CONFLICT_STATUS = 409 as const;

async function registerUser(
  db: Database,
  body: SignupRequest,
): Promise<{ id: string; email: string; passwordHash: string; createdAt: string }> {
  if (findUserByEmail(db, body.email) !== undefined) {
    throw new HTTPException(CONFLICT_STATUS, { message: DUPLICATE_EMAIL_MESSAGE });
  }
  const id: string = crypto.randomUUID();
  const passwordHash: string = await hashPassword(body.password);
  const createdAt: string = new Date().toISOString();
  insertUser(db, {
    id,
    email: body.email,
    passwordHash,
    erpHost: null,
    profileId: null,
    createdAt,
  });
  return { id, email: body.email, passwordHash, createdAt };
}

async function authenticateUser(db: Database, body: LoginRequest): Promise<UserRow> {
  const user = findUserByEmail(db, body.email);
  if (user === undefined) {
    throw new HTTPException(UNAUTHORIZED_STATUS, { message: INVALID_CREDENTIALS_MESSAGE });
  }
  const passwordOk: boolean = await verifyPassword(body.password, user.password_hash);
  if (!passwordOk) {
    throw new HTTPException(UNAUTHORIZED_STATUS, { message: INVALID_CREDENTIALS_MESSAGE });
  }
  return user;
}

export function createAuthRouter(db: Database) {
  return new Hono()
    .post(API_PATHS.authSignup, zValidator("json", SignupRequestSchema), async (c) => {
      logger.info({ route: API_PATHS.authSignup }, AUTH_LOG_MESSAGE);
      const registered = await registerUser(db, c.req.valid("json"));
      setSessionCookie(c, await createSessionToken({ id: registered.id, email: registered.email }));
      return c.json(
        {
          user: toSessionUser({
            id: registered.id,
            email: registered.email,
            password_hash: registered.passwordHash,
            erp_host: null,
            profile_id: null,
            created_at: registered.createdAt,
          }),
        },
        CREATED_STATUS,
      );
    })
    .post(API_PATHS.authLogin, zValidator("json", LoginRequestSchema), async (c) => {
      logger.info({ route: API_PATHS.authLogin }, AUTH_LOG_MESSAGE);
      const user = await authenticateUser(db, c.req.valid("json"));
      setSessionCookie(c, await createSessionToken({ id: user.id, email: user.email }));
      return c.json({ user: toSessionUser(user) });
    })
    .post(API_PATHS.authLogout, (c) => {
      logger.info({ route: API_PATHS.authLogout }, AUTH_LOG_MESSAGE);
      clearSessionCookie(c);
      return c.json({ status: LOGOUT_OK });
    })
    .get(API_PATHS.authMe, async (c) => {
      const user = await readSessionUser(c, db);
      return c.json(toSessionUser(user));
    })
    .post(API_PATHS.onboarding, zValidator("json", OnboardingRequestSchema), async (c) => {
      logger.info({ route: API_PATHS.onboarding }, ONBOARDING_LOG_MESSAGE);
      const user = await readSessionUser(c, db);
      const body = c.req.valid("json");
      updateConnection(db, { user, erpHost: body.erp_host });
      return c.json(toSessionUser(findUserById(db, user.id) ?? user));
    });
}
