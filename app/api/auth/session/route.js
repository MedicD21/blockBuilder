import { getSessionFromCookies } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getSessionFromCookies();
    if (!session) {
      return Response.json({ user: null }, { status: 401 });
    }

    return Response.json({
      user: {
        id: session.userId,
        email: session.email,
      },
    });
  } catch (error) {
    console.error("Auth session check failed:", error);
    return Response.json({ user: null }, { status: 401 });
  }
}
