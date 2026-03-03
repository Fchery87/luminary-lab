import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { projects, images } from "@/db/schema";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { eq, and } from "drizzle-orm";
import { exportProcessedImage, type ExportMode } from "@/lib/hybrid-export";
import { uploadFile, generateDownloadUrl } from "@/lib/s3";

export async function POST(
  req: Request,
  props: { params: Promise<{ id: string }> },
) {
  const params = await props.params;

  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { id } = params;
    const body = await req.json();
    const { 
      format = "jpeg", 
      quality = 92,
      presetId,
      intensity = 70,
      mode = "full-quality" 
    } = body;

    const db = getDb();

    // Verify project ownership
    const [project] = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, id), eq(projects.userId, session.user.id)))
      .limit(1);

    if (!project) {
      return new NextResponse("Project not found", { status: 404 });
    }

    // If presetId provided, use hybrid export with style processing
    if (presetId) {
      const exportMode = mode as ExportMode;
      
      const result = await exportProcessedImage(id, {
        mode: exportMode,
        styleId: presetId,
        intensity: intensity / 100,
        format: format as "jpeg" | "png" | "webp",
        quality,
      });

      // Upload the exported file
      const exportKey = `users/${session.user.id}/projects/${id}/exports/${Date.now()}-${result.filename}`;
      await uploadFile(exportKey, result.buffer, result.contentType);

      // Generate signed download URL
      const downloadUrl = await generateDownloadUrl(exportKey, 3600);

      return NextResponse.json({
        success: true,
        downloadUrl,
        filename: result.filename,
        mode: result.mode,
        contentType: result.contentType,
        message: exportMode === "preview" 
          ? "Quick preview export ready" 
          : "Full quality export ready",
      });
    }

    // Legacy: If no presetId, return existing processed image
    const [processedImage] = await db
      .select()
      .from(images)
      .where(and(eq(images.projectId, id), eq(images.type, "processed")))
      .limit(1);

    if (!processedImage) {
      return NextResponse.json(
        { error: "No processed image found. Please process the image first." },
        { status: 404 }
      );
    }

    const downloadUrl = await generateDownloadUrl(processedImage.storageKey, 3600);

    return NextResponse.json({
      success: true,
      downloadUrl,
      message: "Export ready",
    });
  } catch (error) {
    console.error("[PROJECT_EXPORT]", error);
    return new NextResponse(
      error instanceof Error ? error.message : "Internal Error",
      { status: 500 }
    );
  }
}
