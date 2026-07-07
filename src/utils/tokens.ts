import jwt from "jsonwebtoken";
import crypto from "crypto";

export interface TokenPayload {
  sub: string;
  email: string;
  role: string;
  tier: string;
}

export class TokenService {
  private get accessSecret(): string {
    return process.env.JWT_ACCESS_SECRET || "dev-access-secret-min-32-chars!!";
  }

  private get refreshSecret(): string {
    return process.env.JWT_REFRESH_SECRET || "dev-refresh-secret-min-32-chars!";
  }

  async generateTokens(payload: TokenPayload): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    const accessToken = jwt.sign(payload, this.accessSecret, {
      expiresIn: "1h",
      issuer: "fanvue-platform",
    });

    const refreshToken = crypto.randomUUID() + "." + crypto.randomBytes(32).toString("hex");

    return { accessToken, refreshToken };
  }

  verifyAccessToken(token: string): TokenPayload {
    return jwt.verify(token, this.accessSecret) as TokenPayload;
  }
}
