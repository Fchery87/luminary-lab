import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { editManager } from "@/lib/edit-manager";
import { auth } from "@/lib/auth";

const resetSchema = z.object({
  imageId: z.string().uuid(),
});

// POST /api/edits/reset - Reset image to original
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validated = resetSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validated.error.format() },
        { status: 400 }
      );
    }

    const { imageId } = validated.data;

    await editManager.reset(imageId, session.user.id);

    return NextResponse.json({ message: "Image reset to original" });
  } catch (error) {
    console.error("Error resetting image:", error);
    return NextResponse.json(
      { error: "Failed to reset image" },
      { status: 500 }
    );
  }
}
