import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { projects, images } from "@/db/schema";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { eq, and } from "drizzle-orm";
import {
  exportProcessedImage,
  type ExportMode,
  type ExportOptions,
  type ExportFormat,
  type ColorSpace,
  type ResizeOptions,
  type WatermarkOptions,
  applyExportPreset,
} from "@/lib/hybrid-export";
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
      mode = "full-quality",
      // Advanced export options
      preset,
      watermark,
      resize,
      colorSpace,
      preserveMetadata,
      sharpen,
      filenameTemplate
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

    // Build export options
    let exportOptions: ExportOptions;
    
    // If export preset specified, use preset with overrides
    if (preset) {
      exportOptions = applyExportPreset(preset, {
        mode: mode as ExportMode,
        styleId: presetId || undefined,
        intensity: intensity / 100,
        format: format as ExportFormat,
        quality,
        colorSpace: colorSpace as ColorSpace,
        resize: resize as ResizeOptions,
        watermark: watermark as WatermarkOptions,
        preserveMetadata: preserveMetadata as boolean,
        sharpen: sharpen as { amount: number; radius: number; threshold: number },
      });
    } else {
      // Use individual options
      exportOptions = {
        mode: mode as ExportMode,
        styleId: presetId || undefined,
        intensity: intensity / 100,
        format: format as ExportFormat,
        quality,
        colorSpace: colorSpace as ColorSpace,
        resize: resize as ResizeOptions,
        watermark: watermark as WatermarkOptions,
        preserveMetadata: preserveMetadata as boolean,
        sharpen: sharpen as { amount: number; radius: number; threshold: number },
      };
    }

    // Perform export
    const result = await exportProcessedImage(id, exportOptions);

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
      dimensions: result.dimensions,
      fileSize: result.fileSize,
      format: result.format,
      message: result.mode === "preview" 
        ? "Quick preview export ready" 
        : "Full quality export ready",
    });
  } catch (error) {
    console.error("[PROJECT_EXPORT]", error);
    return new NextResponse(
      error instanceof Error ? error.message : "Internal Error",
      { status: 500 }
    );
  }
}
