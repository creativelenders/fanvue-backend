import { z } from "zod";

// ── Login ──
export const LoginRequestSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(6).max(128),
});

export type LoginRequest = z.infer<typeof LoginRequestSchema>;

export const LoginResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresIn: z.number(),
  user: z.object({
    id: z.string().uuid(),
    email: z.string().email(),
    displayName: z.string(),
    role: z.string(),
    tier: z.string(),
    avatarUrl: z.string().nullable(),
  }),
});

export type LoginResponse = z.infer<typeof LoginResponseSchema>;

// ── Register ──
export const RegisterRequestSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(128),
  displayName: z.string().min(2).max(128),
});

export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;

// ── Refresh Tokens ──
export const RefreshTokenRequestSchema = z.object({
  refreshToken: z.string().min(1),
});

export type RefreshTokenRequest = z.infer<typeof RefreshTokenRequestSchema>;

export const RefreshTokenResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresIn: z.number(),
});

export type RefreshTokenResponse = z.infer<typeof RefreshTokenResponseSchema>;

// ── 2FA ──
export const TwoFactorSetupResponseSchema = z.object({
  qrCodeUrl: z.string(),
  secret: z.string(),
});

export type TwoFactorSetupResponse = z.infer<typeof TwoFactorSetupResponseSchema>;

export const TwoFactorVerifyRequestSchema = z.object({
  token: z.string().length(6),
});

export type TwoFactorVerifyRequest = z.infer<typeof TwoFactorVerifyRequestSchema>;

// ── Logout ──
export const LogoutRequestSchema = z.object({
  refreshToken: z.string().min(1).optional(),
});

export type LogoutRequest = z.infer<typeof LogoutRequestSchema>;

// ── Change Password ──
export const ChangePasswordRequestSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(128),
});

export type ChangePasswordRequest = z.infer<typeof ChangePasswordRequestSchema>;

// ── Forgot Password ──
export const ForgotPasswordRequestSchema = z.object({
  email: z.string().email(),
});

export type ForgotPasswordRequest = z.infer<typeof ForgotPasswordRequestSchema>;

// ── Reset Password ──
export const ResetPasswordRequestSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(8).max(128),
});

export type ResetPasswordRequest = z.infer<typeof ResetPasswordRequestSchema>;
