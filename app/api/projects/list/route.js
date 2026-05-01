import { getSessionFromCookies } from "@/lib/auth";
import { ensureDatabaseSchema, getSqlClient } from "@/lib/database";

function mapProjectRecord(row) {
  return {
    id: row.id,
    name: row.name,
    totalBlocks: row.total_blocks,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function GET() {
  try {
    const session = await getSessionFromCookies();
    if (!session) {
      return Response.json(
        { error: "Please log in to view saved builds." },
        { status: 401 },
      );
    }

    await ensureDatabaseSchema();
    const sql = getSqlClient();
    const rows = await sql`
      SELECT id, name, total_blocks, created_at, updated_at
      FROM saved_projects
      WHERE user_id = ${session.userId}
      ORDER BY updated_at DESC
      LIMIT 100
    `;

    return Response.json({
      projects: rows.map(mapProjectRecord),
    });
  } catch (error) {
    console.error("Project list failed:", error);
    return Response.json(
      { error: "Unable to load saved builds right now." },
      { status: 500 },
    );
  }
}
