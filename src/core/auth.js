// core/auth.js
// Utilitas JWT: sign, verify, dan helper getUserFromToken

import jwt from "jsonwebtoken";

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || "fallback_access_secret";
const REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET || "fallback_refresh_secret";

/**
 * Buat access token JWT (expire 1 hari).
 * Payload: { id, role }
 * @param {{ id: string, role: "ADMIN"|"MODERATOR"|"MEMBER" }} payload
 * @returns {string}
 */
export function signAccessToken(payload) {
  return jwt.sign({ id: payload.id, role: payload.role }, ACCESS_SECRET, {
    expiresIn: "1d",
  });
}

/**
 * Buat refresh token JWT (expire 7 hari).
 * @param {{ id: string, role: string }} payload
 * @returns {string}
 */
export function signRefreshToken(payload) {
  return jwt.sign({ id: payload.id, role: payload.role }, REFRESH_SECRET, {
    expiresIn: "7d",
  });
}

/**
 * Verifikasi dan decode token JWT.
 * @param {string} token
 * @param {"access"|"refresh"} type
 * @returns {{ id: string, role: string, iat: number, exp: number }}
 * @throws {JsonWebTokenError | TokenExpiredError}
 */
export function verifyToken(token, type = "access") {
  const secret = type === "refresh" ? REFRESH_SECRET : ACCESS_SECRET;
  return jwt.verify(token, secret);
}

/**
 * Helper: ekstrak user dari Authorization header.
 * Tidak melempar error — return null jika gagal.
 * @param {Request} request
 * @returns {{ id: string, role: string } | null}
 */
export function getUserFromToken(request) {
  try {
    const auth = request.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) return null;
    const token = auth.split(" ")[1];
    return verifyToken(token, "access");
  } catch {
    return null;
  }
}
