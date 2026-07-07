import type { FastifyRequest, FastifyReply } from "fastify";
import { AuthService } from "../services/auth.service";
import {
  LoginRequestSchema,
  RegisterRequestSchema,
  RefreshTokenRequestSchema,
  ChangePasswordRequestSchema,
  TwoFactorVerifyRequestSchema,
  ForgotPasswordRequestSchema,
  ResetPasswordRequestSchema,
} from "../schemas/auth.schema";
import { ZodError } from "zod";
import { BadRequestError } from "../utils/errors";

const authService = new AuthService();

export class AuthController {
  async login(request: FastifyRequest, reply: FastifyReply) {
    const parseResult = LoginRequestSchema.safeParse(request.body);
    if (!parseResult.success) {
      throw new BadRequestError("Invalid login data", parseResult.error.flatten());
    }

    const result = await authService.login(
      parseResult.data,
      request.ip,
      request.headers["user-agent"]
    );

    return reply.status(200).send({ success: true, data: result });
  }

  async register(request: FastifyRequest, reply: FastifyReply) {
    const parseResult = RegisterRequestSchema.safeParse(request.body);
    if (!parseResult.success) {
      throw new BadRequestError("Invalid registration data", parseResult.error.flatten());
    }

    const result = await authService.register(parseResult.data);
    return reply.status(201).send({ success: true, data: result });
  }

  async refresh(request: FastifyRequest, reply: FastifyReply) {
    const parseResult = RefreshTokenRequestSchema.safeParse(request.body);
    if (!parseResult.success) {
      throw new BadRequestError("Invalid refresh token", parseResult.error.flatten());
    }

    const result = await authService.refreshToken(parseResult.data.refreshToken);
    return reply.status(200).send({ success: true, data: result });
  }

  async logout(request: FastifyRequest, reply: FastifyReply) {
    const refreshToken = (request.body as any)?.refreshToken;
    await authService.logout(refreshToken);
    return reply.status(200).send({ success: true, data: null });
  }

  async me(request: FastifyRequest, reply: FastifyReply) {
    const user = await authService.getUserById(request.user!.sub);
    return reply.status(200).send({ success: true, data: user });
  }

  async changePassword(request: FastifyRequest, reply: FastifyReply) {
    const parseResult = ChangePasswordRequestSchema.safeParse(request.body);
    if (!parseResult.success) {
      throw new BadRequestError("Invalid password data", parseResult.error.flatten());
    }

    await authService.changePassword(
      request.user!.sub,
      parseResult.data.currentPassword,
      parseResult.data.newPassword
    );

    return reply.status(200).send({ success: true, data: null });
  }

  async setup2FA(request: FastifyRequest, reply: FastifyReply) {
    const result = await authService.setup2FA(request.user!.sub);
    return reply.status(200).send({ success: true, data: result });
  }

  async verify2FA(request: FastifyRequest, reply: FastifyReply) {
    const parseResult = TwoFactorVerifyRequestSchema.safeParse(request.body);
    if (!parseResult.success) {
      throw new BadRequestError("Invalid 2FA token", parseResult.error.flatten());
    }

    const isValid = await authService.verify2FA(request.user!.sub, parseResult.data.token);
    return reply.status(200).send({ success: true, data: { verified: isValid } });
  }

  async forgotPassword(request: FastifyRequest, reply: FastifyReply) {
    const parseResult = ForgotPasswordRequestSchema.safeParse(request.body);
    if (!parseResult.success) {
      throw new BadRequestError("Invalid email", parseResult.error.flatten());
    }

    await authService.forgotPassword(parseResult.data.email);
    return reply.status(200).send({ success: true, data: null });
  }

  async resetPassword(request: FastifyRequest, reply: FastifyReply) {
    const parseResult = ResetPasswordRequestSchema.safeParse(request.body);
    if (!parseResult.success) {
      throw new BadRequestError("Invalid password reset data", parseResult.error.flatten());
    }

    await authService.resetPassword(parseResult.data.token, parseResult.data.newPassword);
    return reply.status(200).send({ success: true, data: null });
  }
}

