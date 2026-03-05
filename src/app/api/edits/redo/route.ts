import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { editManager } from "@/lib/edit-manager";
import { auth } from "@/lib/auth";

const undoRedoSchema = z.object({
  imageId: z.string().uuid(),
});

// POST /api/edits/redo - Redo the last undone edit
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validated = undoRedoSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validated.error.format() },
        { status: 400 }
      );
    }

    const { imageId } = validated.data;

    const edit = await editManager.redo(imageId);

    if (!edit) {
      return NextResponse.json(
        { error: "No edit to redo" },
        { status: 400 }
      );
    }

    return NextResponse.json({ edit, message: "Edit redone successfully" });
  } catch (error) {
    console.error("Error redoing edit:", error);
    return NextResponse.json(
      { error: "Failed to redo edit" },
      { status: 500 }
    );
  }
}
