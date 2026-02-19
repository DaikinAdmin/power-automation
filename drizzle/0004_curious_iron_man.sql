CREATE TABLE "uploaded_image" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"file_name" text NOT NULL,
	"original_name" text NOT NULL,
	"path" text NOT NULL,
	"mime_type" text NOT NULL,
	"size" integer NOT NULL,
	"uploaded_by" text NOT NULL,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "uploaded_image" ADD CONSTRAINT "uploaded_image_uploaded_by_user_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "uploaded_image_path_idx" ON "uploaded_image" USING btree ("path");--> statement-breakpoint
CREATE INDEX "uploaded_image_uploadedBy_idx" ON "uploaded_image" USING btree ("uploaded_by");