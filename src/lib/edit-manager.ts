import { eq, and, desc } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { db, schema } from "@/db";
import { imageProcessingQueue } from "./queue";

const { imageEdits, editHistory, images, systemStyles } = schema;

export interface ImageAdjustments {
  exposure?: number; // -5 to +5 stops
  contrast?: number; // -100 to +100
  highlights?: number; // -100 to +100
  shadows?: number; // -100 to +100
  whites?: number; // -100 to +100
  blacks?: number; // -100 to +100
  clarity?: number; // -100 to +100
  texture?: number; // -100 to +100
  dehaze?: number; // -100 to +100
  saturation?: number; // -100 to +100
  vibrance?: number; // -100 to +100
  temperature?: number; // -100 to +100
  tint?: number; // -100 to +100
}

export interface CreateEditInput {
  imageId: string;
  adjustments: ImageAdjustments;
  styleId?: string;
  intensity?: number;
  userId: string;
}

export interface ImageEdit {
  id: string;
  imageId: string;
  version: number;
  styleId: string | null;
  intensity: number;
  adjustments: ImageAdjustments | null;
  isCurrent: boolean;
  processedImageId: string | null;
  createdAt: Date;
  createdBy: string;
}

export interface EditHistoryEntry {
  id: string;
  imageId: string;
  action: string;
  previousEditId: string | null;
  newEditId: string | null;
  undone: boolean;
  createdAt: Date;
}

export class EditManager {
  /**
   * Create a new edit version for an image
   */
  async createEdit(input: CreateEditInput): Promise<ImageEdit> {
    const { imageId, adjustments, styleId, intensity = 0.7, userId } = input;

    // Get next version number
    const version = await this.getNextVersion(imageId);

    // Mark previous edit as not current
    await db
      .update(imageEdits)
      .set({ isCurrent: false })
      .where(eq(imageEdits.imageId, imageId));

    // Create new edit
    const [edit] = await db
      .insert(imageEdits)
      .values({
        id: uuidv7(),
        imageId,
        version,
        styleId: styleId || null,
        intensity: intensity.toString(),
        adjustments: adjustments as Record<string, unknown>,
        isCurrent: true,
        createdBy: userId,
      })
      .returning();

    // Record in history
    await db.insert(editHistory).values({
      id: uuidv7(),
      imageId,
      action: "adjust",
      newEditId: edit.id,
      undone: false,
    });

    // Queue processing job
    await imageProcessingQueue.add("apply-edit", {
      editId: edit.id,
      imageId,
      adjustments,
      styleId,
      intensity,
    });

    return this.mapEditFromDb(edit);
  }

  /**
   * Apply a style preset to an image
   */
  async applyStyle(
    imageId: string,
    styleId: string,
    intensity: number,
    userId: string
  ): Promise<ImageEdit> {
    // Get the style
    const style = await db.query.systemStyles.findFirst({
      where: eq(systemStyles.id, styleId),
    });

    if (!style) {
      throw new Error(`Style not found: ${styleId}`);
    }

    // Convert style params to adjustments
    const blendingParams = (style.blendingParams as Record<string, number>) || {};
    const adjustments: ImageAdjustments = {
      exposure: blendingParams.exposure || 0,
      contrast: blendingParams.contrast ? (blendingParams.contrast - 100) : 0,
      saturation: blendingParams.saturation ? (blendingParams.saturation - 100) : 0,
    };

    // Create edit with style
    const edit = await this.createEdit({
      imageId,
      adjustments,
      styleId,
      intensity,
      userId,
    });

    // Update history action to 'apply_style'
    await db
      .update(editHistory)
      .set({ action: "apply_style" })
      .where(eq(editHistory.newEditId, edit.id));

    return edit;
  }

  /**
   * Undo the last edit
   */
  async undo(imageId: string): Promise<ImageEdit | null> {
    const current = await this.getCurrentEdit(imageId);
    if (!current) return null;

    const previous = await db.query.imageEdits.findFirst({
      where: and(
        eq(imageEdits.imageId, imageId),
        eq(imageEdits.version, current.version - 1)
      ),
    });

    if (!previous) return null;

    await db.transaction(async (trx) => {
      // Mark current as not current
      await trx
        .update(imageEdits)
        .set({ isCurrent: false })
        .where(eq(imageEdits.id, current.id));

      // Mark previous as current
      await trx
        .update(imageEdits)
        .set({ isCurrent: true })
        .where(eq(imageEdits.id, previous.id));

      // Record undo in history
      await trx.insert(editHistory).values({
        id: uuidv7(),
        imageId,
        action: "undo",
        previousEditId: current.id,
        newEditId: previous.id,
        undone: false,
      });
    });

    // Queue reprocessing with previous settings
    await imageProcessingQueue.add("apply-edit", {
      editId: previous.id,
      imageId,
      adjustments: previous.adjustments as ImageAdjustments,
      styleId: previous.styleId,
      intensity: previous.intensity ? parseFloat(previous.intensity.toString()) : 0.7,
    });

    return this.mapEditFromDb(previous);
  }

  /**
   * Redo the last undone edit
   */
  async redo(imageId: string): Promise<ImageEdit | null> {
    const current = await this.getCurrentEdit(imageId);
    if (!current) return null;

    const next = await db.query.imageEdits.findFirst({
      where: and(
        eq(imageEdits.imageId, imageId),
        eq(imageEdits.version, current.version + 1)
      ),
    });

    if (!next) return null;

    await db.transaction(async (trx) => {
      // Mark current as not current
      await trx
        .update(imageEdits)
        .set({ isCurrent: false })
        .where(eq(imageEdits.id, current.id));

      // Mark next as current
      await trx
        .update(imageEdits)
        .set({ isCurrent: true })
        .where(eq(imageEdits.id, next.id));

      // Record redo in history
      await trx.insert(editHistory).values({
        id: uuidv7(),
        imageId,
        action: "redo",
        previousEditId: current.id,
        newEditId: next.id,
        undone: false,
      });
    });

    // Queue reprocessing with next settings
    await imageProcessingQueue.add("apply-edit", {
      editId: next.id,
      imageId,
      adjustments: next.adjustments as ImageAdjustments,
      styleId: next.styleId,
      intensity: next.intensity ? parseFloat(next.intensity.toString()) : 0.7,
    });

    return this.mapEditFromDb(next);
  }

  /**
   * Reset image to original (remove all edits)
   */
  async reset(imageId: string, userId: string): Promise<void> {
    const current = await this.getCurrentEdit(imageId);
    if (!current) return;

    await db.transaction(async (trx) => {
      // Mark all edits as not current
      await trx
        .update(imageEdits)
        .set({ isCurrent: false })
        .where(eq(imageEdits.imageId, imageId));

      // Record reset in history
      await trx.insert(editHistory).values({
        id: uuidv7(),
        imageId,
        action: "reset",
        previousEditId: current.id,
        undone: false,
      });
    });

    // Queue reset job
    await imageProcessingQueue.add("reset-image", {
      imageId,
      userId,
    });
  }

  /**
   * Jump to a specific version
   */
  async jumpToVersion(
    imageId: string,
    version: number
  ): Promise<ImageEdit | null> {
    const target = await db.query.imageEdits.findFirst({
      where: and(eq(imageEdits.imageId, imageId), eq(imageEdits.version, version)),
    });

    if (!target) return null;

    const current = await this.getCurrentEdit(imageId);

    await db.transaction(async (trx) => {
      // Mark current as not current
      if (current) {
        await trx
          .update(imageEdits)
          .set({ isCurrent: false })
          .where(eq(imageEdits.id, current.id));
      }

      // Mark target as current
      await trx
        .update(imageEdits)
        .set({ isCurrent: true })
        .where(eq(imageEdits.id, target.id));

      // Record jump in history
      await trx.insert(editHistory).values({
        id: uuidv7(),
        imageId,
        action: "jump",
        previousEditId: current?.id || null,
        newEditId: target.id,
        undone: false,
      });
    });

    // Queue reprocessing
    await imageProcessingQueue.add("apply-edit", {
      editId: target.id,
      imageId,
      adjustments: target.adjustments as ImageAdjustments,
      styleId: target.styleId,
      intensity: target.intensity ? parseFloat(target.intensity.toString()) : 0.7,
    });

    return this.mapEditFromDb(target);
  }

  /**
   * Get the current edit for an image
   */
  async getCurrentEdit(imageId: string): Promise<ImageEdit | null> {
    const edit = await db.query.imageEdits.findFirst({
      where: and(eq(imageEdits.imageId, imageId), eq(imageEdits.isCurrent, true)),
    });

    return edit ? this.mapEditFromDb(edit) : null;
  }

  /**
   * Get edit history for an image
   */
  async getEditHistory(imageId: string): Promise<EditHistoryEntry[]> {
    const history = await db.query.editHistory.findMany({
      where: eq(editHistory.imageId, imageId),
      orderBy: desc(editHistory.createdAt),
      limit: 50,
    });

    return history.map((h) => ({
      id: h.id,
      imageId: h.imageId,
      action: h.action,
      previousEditId: h.previousEditId,
      newEditId: h.newEditId,
      undone: h.undone,
      createdAt: h.createdAt,
    }));
  }

  /**
   * Get all edits for an image
   */
  async getAllEdits(imageId: string): Promise<ImageEdit[]> {
    const edits = await db.query.imageEdits.findMany({
      where: eq(imageEdits.imageId, imageId),
      orderBy: desc(imageEdits.version),
    });

    return edits.map((e) => this.mapEditFromDb(e));
  }

  /**
   * Get the next version number for an image
   */
  private async getNextVersion(imageId: string): Promise<number> {
    const result = await db.query.imageEdits.findMany({
      where: eq(imageEdits.imageId, imageId),
      orderBy: desc(imageEdits.version),
      limit: 1,
    });

    return result.length > 0 ? result[0].version + 1 : 1;
  }

  /**
   * Map database edit to ImageEdit interface
   */
  private mapEditFromDb(edit: typeof imageEdits.$inferSelect): ImageEdit {
    return {
      id: edit.id,
      imageId: edit.imageId,
      version: edit.version,
      styleId: edit.styleId,
      intensity: edit.intensity ? parseFloat(edit.intensity.toString()) : 0.7,
      adjustments: edit.adjustments as ImageAdjustments | null,
      isCurrent: edit.isCurrent,
      processedImageId: edit.processedImageId,
      createdAt: edit.createdAt,
      createdBy: edit.createdBy,
    };
  }
}

// Singleton instance
export const editManager = new EditManager();
