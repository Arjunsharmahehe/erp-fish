import * as z from "zod";
import { MIN_TEXT_LENGTH, VAULT_CONNECTED, VAULT_NOT_CONFIGURED } from "./base";

export const MIN_PASSWORD_LENGTH = 8 as const;

export const SignupRequestSchema = z.object({
  email: z.email(),
  password: z.string().min(MIN_PASSWORD_LENGTH),
});

export type SignupRequest = z.infer<typeof SignupRequestSchema>;

export const LoginRequestSchema = z.object({
  email: z.email(),
  password: z.string().min(MIN_PASSWORD_LENGTH),
});

export type LoginRequest = z.infer<typeof LoginRequestSchema>;

export const OnboardingRequestSchema = z.object({
  erp_host: z.string().min(MIN_TEXT_LENGTH),
  erp_username: z.string().min(MIN_TEXT_LENGTH).optional(),
  erp_password: z.string().min(MIN_TEXT_LENGTH).optional(),
});

export type OnboardingRequest = z.infer<typeof OnboardingRequestSchema>;

export const SessionUserSchema = z.object({
  id: z.string().min(MIN_TEXT_LENGTH),
  email: z.email(),
  erp_host: z.string().min(MIN_TEXT_LENGTH).nullable(),
  profile_id: z.string().min(MIN_TEXT_LENGTH).nullable(),
  vault: z.enum([VAULT_CONNECTED, VAULT_NOT_CONFIGURED]),
});

export type SessionUser = z.infer<typeof SessionUserSchema>;

export const AuthResponseSchema = z.object({ user: SessionUserSchema });
