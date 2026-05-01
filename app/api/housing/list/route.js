import { getSessionFromCookies } from "@/lib/auth";
import { ensureDatabaseSchema, getSqlClient } from "@/lib/database";

function mapRecord(row) {
  return {
    id: row.id,
    name: row.name,
    happinessScore: Number(row.happiness_score),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function GET() {
  try {
    const session = await getSessionFromCookies();
    if (!session) {
      return Response.json(
        { error: "Please log in to view saved housing configurations." },
        { status: 401 },
      );
    }

    await ensureDatabaseSchema();
    const sql = getSqlClient();

    const rows = await sql`
      SELECT id, name, happiness_score, created_at, updated_at
      FROM housing_configs
      WHERE user_id = ${session.userId}
      ORDER BY updated_at DESC
      LIMIT 100
    `;

    return Response.json({ configs: rows.map(mapRecord) });
  } catch (error) {
    console.error("Housing config list failed:", error);
    return Response.json(
      { error: "Unable to load housing configurations right now." },
      { status: 500 },
    );
  }
}
