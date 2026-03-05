CREATE TABLE "edit_history" (
	"id" uuid PRIMARY KEY NOT NULL,
	"image_id" uuid NOT NULL,
	"action" text NOT NULL,
	"previous_edit_id" uuid,
	"new_edit_id" uuid,
	"undone" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "image_edits" (
	"id" uuid PRIMARY KEY NOT NULL,
	"image_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"style_id" uuid,
	"intensity" numeric(5, 2) DEFAULT '0.70',
	"adjustments" jsonb,
	"is_current" boolean DEFAULT false NOT NULL,
	"processed_image_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "role" text DEFAULT 'user' NOT NULL;--> statement-breakpoint
ALTER TABLE "edit_history" ADD CONSTRAINT "edit_history_image_id_images_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."images"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "edit_history" ADD CONSTRAINT "edit_history_previous_edit_id_image_edits_id_fk" FOREIGN KEY ("previous_edit_id") REFERENCES "public"."image_edits"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "edit_history" ADD CONSTRAINT "edit_history_new_edit_id_image_edits_id_fk" FOREIGN KEY ("new_edit_id") REFERENCES "public"."image_edits"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "image_edits" ADD CONSTRAINT "image_edits_image_id_images_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."images"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "image_edits" ADD CONSTRAINT "image_edits_style_id_system_styles_id_fk" FOREIGN KEY ("style_id") REFERENCES "public"."system_styles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "image_edits" ADD CONSTRAINT "image_edits_processed_image_id_images_id_fk" FOREIGN KEY ("processed_image_id") REFERENCES "public"."images"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "image_edits" ADD CONSTRAINT "image_edits_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;