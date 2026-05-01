import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const SESSION_COOKIE_NAME = "bb_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

function getAuthSecret() {
  const secret = process.env.AUTH_SECRET || "";
  if (!secret || secret.length < 16) {
    throw new Error(
      "Missing AUTH_SECRET. Set a long random AUTH_SECRET in your environment variables.",
    );
  }
  return secret;
}

function getSecretKey() {
  return new TextEncoder().encode(getAuthSecret());
}

export function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

export function validateAuthInput(email, password) {
  const normalizedEmail = normalizeEmail(email);
  const nextPassword = String(password || "");

  if (!normalizedEmail || !normalizedEmail.includes("@")) {
    return { valid: false, message: "Enter a valid email address." };
  }

  if (nextPassword.length < 6) {
    return { valid: false, message: "Password must be at least 6 characters." };
  }

  return { valid: true, email: normalizedEmail, password: nextPassword };
}

export async function hashPassword(password) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password, passwordHash) {
  if (!passwordHash) return false;
  return bcrypt.compare(password, passwordHash);
}

export async function createSessionToken({ userId, email }) {
  return new SignJWT({ email })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(getSecretKey());
}

export async function verifySessionToken(token) {
  try {
    const { payload } = await jwtVerify(token, getSecretKey(), {
      algorithms: ["HS256"],
    });
    if (typeof payload.sub !== "string") return null;
    if (typeof payload.email !== "string") return null;

    return {
      userId: payload.sub,
      email: payload.email,
    };
  } catch {
    return null;
  }
}

export async function setSessionCookie(session) {
  const token = await createSessionToken(session);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export async function getSessionFromCookies() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  return verifySessionToken(token);
}
