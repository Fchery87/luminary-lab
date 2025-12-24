ALTER TABLE "users" ALTER COLUMN "email_verified" SET DATA TYPE boolean;--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "password_hash";