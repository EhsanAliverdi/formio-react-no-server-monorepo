import { corsHeaders, jsonResponse, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(req, ["admin", "editor", "viewer"]);
  if (!auth.ok) return auth.res;

  const { id } = await ctx.params;
  const notificationId = Number(id);
  if (!Number.isFinite(notificationId) || notificationId <= 0) {
    return jsonResponse({ error: "Invalid notification id" }, { status: 400 });
  }

  const result = await prisma.notificationRecipient.updateMany({
    where: {
      notificationId,
      userId: auth.user.id,
      readAt: null,
    },
    data: {
      readAt: new Date(),
    },
  });

  if (result.count === 0) {
    const exists = await prisma.notificationRecipient.findUnique({
      where: {
        notificationId_userId: {
          notificationId,
          userId: auth.user.id,
        },
      },
    });

    if (!exists) {
      return jsonResponse({ error: "Not found" }, { status: 404 });
    }
  }

  return jsonResponse({ success: true });
}
