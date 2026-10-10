CREATE TABLE "user_resumes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid NOT NULL,
	"file_name" varchar NOT NULL,
	"file_key" varchar NOT NULL,
	"resume_text" text NOT NULL,
	"ai_summary" text NOT NULL,
	"skills" jsonb DEFAULT '[]' NOT NULL,
	"experience" jsonb DEFAULT '[]' NOT NULL,
	"education" jsonb DEFAULT '[]' NOT NULL,
	"certificates" jsonb DEFAULT '[]',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_resumes" ADD CONSTRAINT "user_resumes_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id");