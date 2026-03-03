ALTER TABLE "images" ADD COLUMN "is_preview" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "images" ADD COLUMN "preview_image_type" text;