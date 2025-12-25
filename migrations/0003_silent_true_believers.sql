CREATE TABLE "user_preferences" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"last_used_preset_id" uuid,
	"preferred_intensity" numeric(5, 2) DEFAULT '0.70' NOT NULL,
	"preferred_view_mode" text DEFAULT 'split',
	"dismissed_what_next" boolean DEFAULT false NOT NULL,
	"preferences" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_preferences_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_last_used_preset_id_system_styles_id_fk" FOREIGN KEY ("last_used_preset_id") REFERENCES "public"."system_styles"("id") ON DELETE no action ON UPDATE no action;