import { clearSessionCookie } from "@/lib/auth";

export async function POST() {
  try {
    await clearSessionCookie();
    return Response.json({ ok: true });
  } catch (error) {
    console.error("Auth logout failed:", error);
    return Response.json({ error: "Unable to log out right now." }, { status: 500 });
  }
}
