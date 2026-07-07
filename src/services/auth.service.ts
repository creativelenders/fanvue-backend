// @ts-nocheck
import { db } from "../db/client";
import { users, sessions, auditLogs, userPreferences, workspaces, workspaceMembers } from "../db/schema";
import { eq, and, lt, gte, sql } from "drizzle-orm";
import bcrypt from "bcrypt";
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
  UnauthorizedError,
} from "../utils/errors";
import { TokenService } from "../utils/tokens";
import type {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RefreshTokenResponse,
} from "../schemas/auth.schema";

export class AuthService {
  private tokenService: TokenService;

  constructor() {
    this.tokenService = new TokenService();
  }

  async login(params: LoginRequest, ipAddress?: string, userAgent?: string): Promise<LoginResponse> {
    const user = await db.query.users.findFirst({
      where: eq(users.email, params.email.toLowerCase()),
    });

    if (!user) {
      throw new UnauthorizedError("Invalid email or password");
    }

    // Check if account is locked
    if (user.accountLocked) {
      if (user.lockedUntil && new Date() < user.lockedUntil) {
        throw new UnauthorizedError(
          `Account locked until ${user.lockedUntil.toISOString()}`
        );
      }
      // Reset lock if expired
      await db
        .update(users)
        .set({ accountLocked: false, failedLoginAttempts: 0, lockedUntil: null })
        .where(eq(users.id, user.id));
    }

    // Verify password
    const isValid = await bcrypt.compare(params.password, user.passwordHash);
    if (!isValid) {
      const newAttempts = user.failedLoginAttempts + 1;
      const updates: Partial<typeof users.$inferInsert> = {
        failedLoginAttempts: newAttempts,
      };

      // Lock after 5 failed attempts
      if (newAttempts >= 5) {
        updates.accountLocked = true;
        updates.lockedUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 min
      }

      await db.update(users).set(updates).where(eq(users.id, user.id));

      // Audit log
      await this.recordAudit(user.id, user.defaultWorkspaceId, "login_failed", "auth", undefined, {
        reason: "invalid_password",
        attempt: newAttempts,
        ipAddress,
      });

      throw new UnauthorizedError("Invalid email or password");
    }

    // Reset failed attempts on successful login
    await db
      .update(users)
      .set({ failedLoginAttempts: 0 })
      .where(eq(users.id, user.id));

    // Generate tokens
    const { accessToken, refreshToken } = await this.tokenService.generateTokens({
      sub: user.id,
      email: user.email,
      role: user.role,
      tier: user.tier,
    });

    // Store session
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    await db.insert(sessions).values({
      userId: user.id,
      refreshToken,
      userAgent: userAgent || null,
      ipAddress: ipAddress || null,
      expiresAt,
    });

    // Audit log
    await this.recordAudit(user.id, user.defaultWorkspaceId, "login", "auth", undefined, { ipAddress });

    return {
      accessToken,
      refreshToken,
      expiresIn: 3600, // 1 hour
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        tier: user.tier,
        avatarUrl: user.avatarUrl,
      },
    };
  }

  async register(params: RegisterRequest): Promise<LoginResponse> {
    const existing = await db.query.users.findFirst({
      where: eq(users.email, params.email.toLowerCase()),
    });

    if (existing) {
      throw new ConflictError("Email already registered");
    }

    const passwordHash = await bcrypt.hash(params.password, 12);

    let assignedRole = "user";
    let assignedTier = "standard";
    const emailLower = params.email.toLowerCase();

    // Hardcoded security checks for roles
    if (emailLower === "creativelendersllc@gmail.com") {
      assignedRole = "admin";
      assignedTier = "elite";
    }

    const [user] = await db
      .insert(users)
      .values({
        email: emailLower,
        displayName: params.displayName,
        passwordHash,
        role: assignedRole,
        tier: assignedTier,
      })
      .returning();

    // Create default preferences
    await db.insert(userPreferences).values({ userId: user.id });

    // Auto-create a default workspace for new user
    const [workspace] = await db.insert(workspaces).values({
      name: "My First Workspace",
      slug: "workspace-" + Date.now() + "-" + Math.random().toString(36).substring(7),
    }).returning();

    await db.insert(workspaceMembers).values({
      workspaceId: workspace.id,
      userId: user.id,
      role: "owner"
    });

    await db.update(users).set({ defaultWorkspaceId: workspace.id }).where(eq(users.id, user.id));

    // Auto-login after registration
    const { accessToken, refreshToken } = await this.tokenService.generateTokens({
      sub: user.id,
      email: user.email,
      role: user.role,
      tier: user.tier,
    });

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await db.insert(sessions).values({
      userId: user.id,
      refreshToken,
      expiresAt,
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: 3600,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        tier: user.tier,
        avatarUrl: null,
      },
    };
  }

  async refreshToken(token: string): Promise<RefreshTokenResponse> {
    const session = await db.query.sessions.findFirst({
      where: and(eq(sessions.refreshToken, token), eq(sessions.revokedAt, null as any)),
      with: { user: true },
    });

    if (!session || session.expiresAt < new Date()) {
      throw new UnauthorizedError("Invalid or expired refresh token");
    }

    // Revoke old session
    await db
      .update(sessions)
      .set({ revokedAt: new Date() })
      .where(eq(sessions.id, session.id));

    // Generate new tokens
    const tokens = await this.tokenService.generateTokens({
      sub: session.user.id,
      email: session.user.email,
      role: session.user.role,
      tier: session.user.tier,
    });

    // Create new session
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await db.insert(sessions).values({
      userId: session.user.id,
      refreshToken: tokens.refreshToken,
      userAgent: session.userAgent,
      ipAddress: session.ipAddress,
      expiresAt,
    });

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: 3600,
    };
  }

  async logout(refreshToken?: string): Promise<void> {
    if (refreshToken) {
      await db
        .update(sessions)
        .set({ revokedAt: new Date() })
        .where(eq(sessions.refreshToken, refreshToken));
    }
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) throw new NotFoundError("User");

    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) {
      throw new BadRequestError("Current password is incorrect");
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await db
      .update(users)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(users.id, userId));
  }

  async setup2FA(userId: string): Promise<{ qrCodeUrl: string; secret: string }> {
    // In production, use otplib or speakeasy
    const secret = "MOCK_SECRET_" + crypto.randomUUID();
    const qrCodeUrl = `otpauth://totp/FanVue:${userId}?secret=${secret}&issuer=FanVue`;

    await db
      .update(users)
      .set({ twoFactorSecret: secret })
      .where(eq(users.id, userId));

    return { qrCodeUrl, secret };
  }

  async verify2FA(userId: string, token: string): Promise<boolean> {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user?.twoFactorSecret) {
      throw new BadRequestError("2FA not set up");
    }

    // Mock verification — in production use otplib.authenticator.check()
    const isValid = token.length === 6 && !isNaN(Number(token));
    if (isValid) {
      await db
        .update(users)
        .set({ twoFactorEnabled: true })
        .where(eq(users.id, userId));
    }

    return isValid;
  }

  async getUserById(userId: string) {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: {
        passwordHash: false,
        twoFactorSecret: false,
        refreshToken: false,
      },
    });

    if (!user) throw new NotFoundError("User");
    return user;
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase()),
    });

    if (!user) {
      // Don't throw error to prevent email enumeration
      return;
    }

    // Mock implementation for development
    // In production, generate a token, save to DB, and send an email
    const resetToken = crypto.randomUUID();
    console.log(`[DEV ONLY] Password reset requested for ${email}. Token: ${resetToken}`);
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    // Mock implementation
    // In production, verify the token in the database, then update the password
    console.log(`[DEV ONLY] Password reset used with token: ${token}`);
    
    // As a mock, we won't actually update the password since we don't store the mock token,
    // but we would do this:
    // const passwordHash = await bcrypt.hash(newPassword, 12);
    // await db.update(users).set({ passwordHash }).where(eq(users.id, userId));
  }

  private async recordAudit(
    userId: string,
    workspaceId: string | null,
    action: string,
    resourceType?: string,
    resourceId?: string,
    details?: Record<string, unknown>
  ): Promise<void> {
    await db.insert(auditLogs).values({
      userId,
      workspaceId,
      action,
      resourceType,
      resourceId,
      details: details || {},
      severity: action.includes("fail") ? "warning" : "info",
    });
  }
}
