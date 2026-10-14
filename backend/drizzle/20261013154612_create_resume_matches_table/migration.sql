CREATE TABLE "resume_matches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid NOT NULL,
	"resume_id" uuid NOT NULL,
	"job_description_id" uuid NOT NULL,
	"match_score" varchar NOT NULL,
	"matching_skills" jsonb DEFAULT '[]',
	"missing_skills" jsonb DEFAULT '[]',
	"experience_alignment" text NOT NULL,
	"education_alignment" text NOT NULL,
	"overall_feedback" jsonb DEFAULT '[]',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "resume_matches" ADD CONSTRAINT "resume_matches_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "resume_matches" ADD CONSTRAINT "resume_matches_resume_id_user_resumes_id_fkey" FOREIGN KEY ("resume_id") REFERENCES "user_resumes"("id");--> statement-breakpoint
ALTER TABLE "resume_matches" ADD CONSTRAINT "resume_matches_job_description_id_job_analysis_id_fkey" FOREIGN KEY ("job_description_id") REFERENCES "job_analysis"("id");