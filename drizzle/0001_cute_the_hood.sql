ALTER TABLE "collection" ADD COLUMN "groupExternalId" integer;--> statement-breakpoint
ALTER TABLE "collection" ADD COLUMN "relations" json;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "collection" ADD CONSTRAINT "collection_groupExternalId_group_externalId_fk" FOREIGN KEY ("groupExternalId") REFERENCES "public"."group"("externalId") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
