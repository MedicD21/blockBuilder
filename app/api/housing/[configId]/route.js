import { getSessionFromCookies } from "@/lib/auth";
import { ensureDatabaseSchema, getSqlClient } from "@/lib/database";

function sanitizeConfigId(value) {
  const next = String(value || "").trim();
  if (!next || next.length > 120) return "";
  return next;
}

function parseConfigPayload(value) {
  if (!value) return null;
  if (typeof value === "object") return value;

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object" ? parsed : null;
    } catch {
      return null;
    }
  }

  return null;
}

function mapRecord(row) {
  return {
    id: row.id,
    name: row.name,
    happinessScore: Number(row.happiness_score),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    config: parseConfigPayload(row.config),
  };
}

export async function GET(_request, { params }) {
  try {
    const session = await getSessionFromCookies();
    if (!session) {
      return Response.json(
        { error: "Please log in to load housing configurations." },
        { status: 401 },
      );
    }

    const configId = sanitizeConfigId(params?.configId);
    if (!configId) {
      return Response.json({ error: "Invalid configuration id." }, { status: 400 });
    }

    await ensureDatabaseSchema();
    const sql = getSqlClient();

    const rows = await sql`
      SELECT id, name, config, happiness_score, created_at, updated_at
      FROM housing_configs
      WHERE id = ${configId}
        AND user_id = ${session.userId}
      LIMIT 1
    `;

    const row = rows[0];
    if (!row) {
      return Response.json(
        { error: "Housing configuration not found." },
        { status: 404 },
      );
    }

    return Response.json({ config: mapRecord(row) });
  } catch (error) {
    console.error("Housing config load failed:", error);
    return Response.json(
      { error: "Unable to load this housing configuration right now." },
      { status: 500 },
    );
  }
}

export async function DELETE(_request, { params }) {
  try {
    const session = await getSessionFromCookies();
    if (!session) {
      return Response.json(
        { error: "Please log in to delete housing configurations." },
        { status: 401 },
      );
    }

    const configId = sanitizeConfigId(params?.configId);
    if (!configId) {
      return Response.json({ error: "Invalid configuration id." }, { status: 400 });
    }

    await ensureDatabaseSchema();
    const sql = getSqlClient();

    const deletedRows = await sql`
      DELETE FROM housing_configs
      WHERE id = ${configId}
        AND user_id = ${session.userId}
      RETURNING id
    `;

    if (deletedRows.length === 0) {
      return Response.json(
        { error: "Housing configuration not found." },
        { status: 404 },
      );
    }

    return Response.json({ ok: true, configId });
  } catch (error) {
    console.error("Housing config delete failed:", error);
    return Response.json(
      { error: "Unable to delete this housing configuration right now." },
      { status: 500 },
    );
  }
}
