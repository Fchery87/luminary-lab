import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { editManager, ImageAdjustments } from "@/lib/edit-manager";
import { auth } from "@/lib/auth";

const adjustmentsSchema = z.object({
  exposure: z.number().min(-5).max(5).optional(),
  contrast: z.number().min(-100).max(100).optional(),
  highlights: z.number().min(-100).max(100).optional(),
  shadows: z.number().min(-100).max(100).optional(),
  whites: z.number().min(-100).max(100).optional(),
  blacks: z.number().min(-100).max(100).optional(),
  clarity: z.number().min(-100).max(100).optional(),
  texture: z.number().min(-100).max(100).optional(),
  dehaze: z.number().min(-100).max(100).optional(),
  saturation: z.number().min(-100).max(100).optional(),
  vibrance: z.number().min(-100).max(100).optional(),
  temperature: z.number().min(-100).max(100).optional(),
  tint: z.number().min(-100).max(100).optional(),
});

const createEditSchema = z.object({
  imageId: z.string().uuid(),
  adjustments: adjustmentsSchema,
  styleId: z.string().uuid().optional(),
  intensity: z.number().min(0).max(1).optional(),
});

// POST /api/edits - Create a new edit
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validated = createEditSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validated.error.format() },
        { status: 400 }
      );
    }

    const { imageId, adjustments, styleId, intensity } = validated.data;

    const edit = await editManager.createEdit({
      imageId,
      adjustments: adjustments as ImageAdjustments,
      styleId,
      intensity,
      userId: session.user.id,
    });

    return NextResponse.json({ edit }, { status: 201 });
  } catch (error) {
    console.error("Error creating edit:", error);
    return NextResponse.json(
      { error: "Failed to create edit" },
      { status: 500 }
    );
  }
}

// GET /api/edits?imageId=xxx - Get edits for an image
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const imageId = searchParams.get("imageId");

    if (!imageId) {
      return NextResponse.json(
        { error: "imageId is required" },
        { status: 400 }
      );
    }

    const edits = await editManager.getAllEdits(imageId);
    const currentEdit = await editManager.getCurrentEdit(imageId);
    const history = await editManager.getEditHistory(imageId);

    return NextResponse.json({
      edits,
      currentEdit,
      history,
    });
  } catch (error) {
    console.error("Error fetching edits:", error);
    return NextResponse.json(
      { error: "Failed to fetch edits" },
      { status: 500 }
    );
  }
}
