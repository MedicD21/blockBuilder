import {
  hashPassword,
  setSessionCookie,
  validateAuthInput,
} from "@/lib/auth";
import { ensureDatabaseSchema, getSqlClient } from "@/lib/database";

export async function POST(request) {
  try {
    const body = await request.json().catch(() => null);
    if (!body) {
      return Response.json({ error: "Invalid request body." }, { status: 400 });
    }

    const validation = validateAuthInput(body.email, body.password);
    if (!validation.valid) {
      return Response.json({ error: validation.message }, { status: 400 });
    }

    await ensureDatabaseSchema();
    const sql = getSqlClient();

    const existing = await sql`
      SELECT id FROM users WHERE email = ${validation.email} LIMIT 1
    `;
    if (existing.length > 0) {
      return Response.json(
        { error: "An account with that email already exists." },
        { status: 409 },
      );
    }

    const userId = crypto.randomUUID();
    const passwordHash = await hashPassword(validation.password);
    await sql`
      INSERT INTO users (id, email, password_hash)
      VALUES (${userId}, ${validation.email}, ${passwordHash})
    `;

    await setSessionCookie({
      userId,
      email: validation.email,
    });

    return Response.json({
      ok: true,
      user: {
        id: userId,
        email: validation.email,
      },
    });
  } catch (error) {
    console.error("Auth register failed:", error);
    return Response.json({ error: "Unable to register right now." }, { status: 500 });
  }
}
