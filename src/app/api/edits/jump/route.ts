import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { editManager } from "@/lib/edit-manager";
import { auth } from "@/lib/auth";

const jumpSchema = z.object({
  imageId: z.string().uuid(),
  version: z.number().int().min(1),
});

// POST /api/edits/jump - Jump to a specific version
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validated = jumpSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validated.error.format() },
        { status: 400 }
      );
    }

    const { imageId, version } = validated.data;

    const edit = await editManager.jumpToVersion(imageId, version);

    if (!edit) {
      return NextResponse.json(
        { error: "Version not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ edit, message: `Jumped to version ${version}` });
  } catch (error) {
    console.error("Error jumping to version:", error);
    return NextResponse.json(
      { error: "Failed to jump to version" },
      { status: 500 }
    );
  }
}
