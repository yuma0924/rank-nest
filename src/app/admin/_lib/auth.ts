import { SignJWT, jwtVerify, type JWTPayload } from "jose";

const ADMIN_TOKEN_COOKIE = "admin_token";
const TOKEN_EXPIRY = "24h";

function getJwtSecret(): Uint8Array {
  const secret = process.env.ADMIN_JWT_SECRET;
  if (!secret) {
    throw new Error("ADMIN_JWT_SECRET is not set");
  }
  return new TextEncoder().encode(secret);
}

/** JWT トークンを生成する（有効期限: 24時間） */
export async function createAdminToken(): Promise<string> {
  return new SignJWT({ role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(TOKEN_EXPIRY)
    .sign(getJwtSecret());
}

/** JWT トークンを検証する */
export async function verifyAdminToken(
  token: string
): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    if (payload.role !== "admin") return null;
    return payload;
  } catch {
    return null;
  }
}

/** Cookie 名定数 */
export { ADMIN_TOKEN_COOKIE };
