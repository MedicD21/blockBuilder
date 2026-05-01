import { getSessionFromCookies } from "@/lib/auth";
import { ensureDatabaseSchema, getSqlClient } from "@/lib/database";

function sanitizeConfigName(value) {
  const next = String(value || "").trim();
  if (!next) return "";
  return next.slice(0, 100);
}

function normalizeScore(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.min(100, numeric));
}

export async function POST(request) {
  try {
    const session = await getSessionFromCookies();
    if (!session) {
      return Response.json(
        { error: "Please log in to save housing configurations." },
        { status: 401 },
      );
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return Response.json({ error: "Invalid request body." }, { status: 400 });
    }

    const name = sanitizeConfigName(body.name);
    if (!name) {
      return Response.json({ error: "Configuration name is required." }, { status: 400 });
    }

    const config = body.config;
    if (!config || typeof config !== "object") {
      return Response.json(
        { error: "Missing housing configuration payload." },
        { status: 400 },
      );
    }

    const serialized = JSON.stringify(config);
    if (serialized.length > 2_000_000) {
      return Response.json(
        { error: "Housing payload is too large to save." },
        { status: 413 },
      );
    }

    const happinessScore = normalizeScore(body.happinessScore);

    await ensureDatabaseSchema();
    const sql = getSqlClient();

    const configId = crypto.randomUUID();
    const rows = await sql`
      INSERT INTO housing_configs (
        id,
        user_id,
        name,
        config,
        happiness_score,
        created_at,
        updated_at
      )
      VALUES (
        ${configId},
        ${session.userId},
        ${name},
        ${serialized}::jsonb,
        ${happinessScore},
        NOW(),
        NOW()
      )
      RETURNING id, name, happiness_score, created_at, updated_at
    `;

    const saved = rows[0];
    return Response.json({
      ok: true,
      config: {
        id: saved.id,
        name: saved.name,
        happinessScore: Number(saved.happiness_score),
        createdAt: saved.created_at,
        updatedAt: saved.updated_at,
      },
    });
  } catch (error) {
    console.error("Housing config save failed:", error);
    return Response.json(
      { error: "Unable to save this housing configuration right now." },
      { status: 500 },
    );
  }
}
