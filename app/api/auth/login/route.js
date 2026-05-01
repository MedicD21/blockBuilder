import {
  setSessionCookie,
  validateAuthInput,
  verifyPassword,
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
    const rows = await sql`
      SELECT id, email, password_hash
      FROM users
      WHERE email = ${validation.email}
      LIMIT 1
    `;

    const user = rows[0];
    if (!user) {
      return Response.json(
        { error: "Invalid email or password." },
        { status: 401 },
      );
    }

    const isValidPassword = await verifyPassword(
      validation.password,
      user.password_hash,
    );
    if (!isValidPassword) {
      return Response.json(
        { error: "Invalid email or password." },
        { status: 401 },
      );
    }

    await setSessionCookie({
      userId: user.id,
      email: user.email,
    });

    return Response.json({
      ok: true,
      user: {
        id: user.id,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Auth login failed:", error);
    return Response.json({ error: "Unable to log in right now." }, { status: 500 });
  }
}
