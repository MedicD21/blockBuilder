import { getSessionFromCookies } from "@/lib/auth";
import { ensureDatabaseSchema, getSqlClient } from "@/lib/database";

function sanitizeProjectId(value) {
  const next = String(value || "").trim();
  if (!next || next.length > 120) return "";
  return next;
}

function parseBuilderState(value) {
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

function mapProjectRecord(row) {
  return {
    id: row.id,
    name: row.name,
    totalBlocks: row.total_blocks,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    builderState: parseBuilderState(row.builder_state),
  };
}

export async function GET(_request, { params }) {
  try {
    const session = await getSessionFromCookies();
    if (!session) {
      return Response.json(
        { error: "Please log in to load saved builds." },
        { status: 401 },
      );
    }

    const projectId = sanitizeProjectId(params?.projectId);
    if (!projectId) {
      return Response.json({ error: "Invalid project id." }, { status: 400 });
    }

    await ensureDatabaseSchema();
    const sql = getSqlClient();
    const rows = await sql`
      SELECT id, name, total_blocks, created_at, updated_at, builder_state
      FROM saved_projects
      WHERE id = ${projectId}
        AND user_id = ${session.userId}
      LIMIT 1
    `;

    const row = rows[0];
    if (!row) {
      return Response.json({ error: "Saved build not found." }, { status: 404 });
    }

    return Response.json({
      project: mapProjectRecord(row),
    });
  } catch (error) {
    console.error("Project load failed:", error);
    return Response.json(
      { error: "Unable to load this saved build right now." },
      { status: 500 },
    );
  }
}

export async function DELETE(_request, { params }) {
  try {
    const session = await getSessionFromCookies();
    if (!session) {
      return Response.json(
        { error: "Please log in to delete saved builds." },
        { status: 401 },
      );
    }

    const projectId = sanitizeProjectId(params?.projectId);
    if (!projectId) {
      return Response.json({ error: "Invalid project id." }, { status: 400 });
    }

    await ensureDatabaseSchema();
    const sql = getSqlClient();
    const deletedRows = await sql`
      DELETE FROM saved_projects
      WHERE id = ${projectId}
        AND user_id = ${session.userId}
      RETURNING id
    `;

    if (deletedRows.length === 0) {
      return Response.json({ error: "Saved build not found." }, { status: 404 });
    }

    return Response.json({ ok: true, projectId });
  } catch (error) {
    console.error("Project delete failed:", error);
    return Response.json(
      { error: "Unable to delete this saved build right now." },
      { status: 500 },
    );
  }
}
