import { getSessionFromCookies } from "@/lib/auth";
import { ensureDatabaseSchema, getSqlClient } from "@/lib/database";

function sanitizeProjectName(value) {
  const next = String(value || "").trim();
  if (!next) return "";
  return next.slice(0, 80);
}

export async function POST(request) {
  try {
    const session = await getSessionFromCookies();
    if (!session) {
      return Response.json({ error: "Please log in to save builds." }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return Response.json({ error: "Invalid request body." }, { status: 400 });
    }

    const name = sanitizeProjectName(body.name);
    if (!name) {
      return Response.json({ error: "Project name is required." }, { status: 400 });
    }

    const builderState = body.builderState;
    if (!builderState || typeof builderState !== "object") {
      return Response.json(
        { error: "Missing builder state payload." },
        { status: 400 },
      );
    }

    const serialized = JSON.stringify(builderState);
    if (serialized.length > 2_000_000) {
      return Response.json(
        { error: "Build payload is too large to save." },
        { status: 413 },
      );
    }

    const totalBlocks =
      typeof body.totalBlocks === "number" && Number.isFinite(body.totalBlocks)
        ? Math.max(0, Math.floor(body.totalBlocks))
        : 0;

    await ensureDatabaseSchema();
    const sql = getSqlClient();

    const projectId = crypto.randomUUID();
    const rows = await sql`
      INSERT INTO saved_projects (
        id,
        user_id,
        name,
        builder_state,
        total_blocks,
        created_at,
        updated_at
      )
      VALUES (
        ${projectId},
        ${session.userId},
        ${name},
        ${serialized}::jsonb,
        ${totalBlocks},
        NOW(),
        NOW()
      )
      RETURNING id, name, created_at, updated_at, total_blocks
    `;

    const saved = rows[0];
    return Response.json({
      ok: true,
      project: {
        id: saved.id,
        name: saved.name,
        totalBlocks: saved.total_blocks,
        createdAt: saved.created_at,
        updatedAt: saved.updated_at,
      },
    });
  } catch (error) {
    console.error("Project save failed:", error);
    return Response.json({ error: "Unable to save this build right now." }, { status: 500 });
  }
}
