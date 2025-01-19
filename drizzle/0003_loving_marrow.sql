ALTER TABLE "collection" ALTER COLUMN "relations" SET DATA TYPE jsonb;--> statement-breakpoint
ALTER TABLE "item" ALTER COLUMN "relations" SET DATA TYPE jsonb;--> statement-breakpoint
ALTER TABLE "item" ADD COLUMN "creators" jsonb;