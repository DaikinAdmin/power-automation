CREATE TABLE "warehouse_visibility" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"warehouseId" text NOT NULL,
	"domain" text NOT NULL,
	"visible" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "warehouse_visibility" ADD CONSTRAINT "warehouse_visibility_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "public"."warehouse"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE UNIQUE INDEX "warehouse_visibility_warehouseId_domain_idx" ON "warehouse_visibility" USING btree ("warehouseId","domain");--> statement-breakpoint
CREATE INDEX "warehouse_visibility_domain_visible_idx" ON "warehouse_visibility" USING btree ("domain","visible");

--> statement-breakpoint
INSERT INTO "warehouse_visibility" ("warehouseId", "domain", "visible", "updatedAt")
SELECT w."id", d."domain", COALESCE(w."isVisible", true), CURRENT_TIMESTAMP
FROM "warehouse" w
CROSS JOIN (VALUES ('ua'), ('pl')) AS d("domain")
ON CONFLICT ("warehouseId", "domain") DO NOTHING;
