CREATE TYPE "user_role" AS ENUM('COMPANY', 'CANDIDATE');--> statement-breakpoint
CREATE TYPE "embedding_status" AS ENUM('PENDING', 'READY', 'FAILED');--> statement-breakpoint
CREATE TYPE "job_status" AS ENUM('Draft', 'Published', 'Closed');--> statement-breakpoint
CREATE TYPE "requirement_type" AS ENUM('required_skill', 'nice_to_have', 'responsibility');--> statement-breakpoint
CREATE TYPE "resume_section" AS ENUM('summary', 'experience', 'projects', 'skills', 'education', 'certificates');--> statement-breakpoint
CREATE TYPE "gap_type" AS ENUM('wording_gap', 'skill_gap');--> statement-breakpoint
CREATE TYPE "match_status" AS ENUM('matched', 'partial', 'missing');--> statement-breakpoint
CREATE TABLE "job_requirements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"job_id" uuid NOT NULL,
	"text" text NOT NULL,
	"type" "requirement_type" NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"embedding" vector(768) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resume_chunks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"resume_id" uuid NOT NULL,
	"section" "resume_section" NOT NULL,
	"content" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"embedding" vector(768) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resume_match_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"match_id" uuid NOT NULL,
	"requirement_id" uuid NOT NULL,
	"status" "match_status" NOT NULL,
	"top_similarity" real,
	"evidence" text,
	"evidence_chunk_ids" jsonb DEFAULT '[]',
	"gap_type" "gap_type",
	"suggestion" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "job_analysis" RENAME TO "jobs";--> statement-breakpoint
ALTER TABLE "jobs" DROP CONSTRAINT "job_analysis_user_id_users_id_fkey";--> statement-breakpoint
ALTER TABLE "resume_matches" DROP CONSTRAINT "resume_matches_job_description_id_job_analysis_id_fkey";--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "role" "user_role" DEFAULT 'CANDIDATE'::"user_role" NOT NULL;--> statement-breakpoint
ALTER TABLE "user_resumes" ADD COLUMN "projects" jsonb DEFAULT '[]';--> statement-breakpoint
ALTER TABLE "user_resumes" ADD COLUMN "embedding_status" "embedding_status" DEFAULT 'PENDING'::"embedding_status" NOT NULL;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "created_by" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "title" varchar NOT NULL;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "description" text NOT NULL;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "status" "job_status" DEFAULT 'Published'::"job_status" NOT NULL;--> statement-breakpoint
ALTER TABLE "resume_matches" ADD COLUMN "job_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "jobs" DROP COLUMN "user_id";--> statement-breakpoint
ALTER TABLE "jobs" DROP COLUMN "job_description";--> statement-breakpoint
ALTER TABLE "jobs" DROP COLUMN "job_title";--> statement-breakpoint
ALTER TABLE "jobs" DROP COLUMN "responsibilities";--> statement-breakpoint
ALTER TABLE "jobs" DROP COLUMN "required_skills";--> statement-breakpoint
ALTER TABLE "jobs" DROP COLUMN "nice_to_have_skills";--> statement-breakpoint
ALTER TABLE "resume_matches" DROP COLUMN "job_analysis_id";--> statement-breakpoint
ALTER TABLE "resume_matches" DROP COLUMN "matching_skills";--> statement-breakpoint
ALTER TABLE "resume_matches" DROP COLUMN "missing_skills";--> statement-breakpoint
ALTER TABLE "jobs" ALTER COLUMN "location" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "jobs" ALTER COLUMN "experience" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "jobs" ALTER COLUMN "salary_range" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "jobs" ALTER COLUMN "employment_type" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "jobs" ALTER COLUMN "education" DROP NOT NULL;--> statement-breakpoint
CREATE INDEX "resume_chunks_resume_id_idx" ON "resume_chunks" ("resume_id");--> statement-breakpoint
CREATE INDEX "resume_match_items_match_id_idx" ON "resume_match_items" ("match_id");--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_created_by_users_id_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "job_requirements" ADD CONSTRAINT "job_requirements_job_id_jobs_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "resume_matches" ADD CONSTRAINT "resume_matches_job_id_jobs_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id");--> statement-breakpoint
ALTER TABLE "resume_chunks" ADD CONSTRAINT "resume_chunks_resume_id_user_resumes_id_fkey" FOREIGN KEY ("resume_id") REFERENCES "user_resumes"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "resume_match_items" ADD CONSTRAINT "resume_match_items_match_id_resume_matches_id_fkey" FOREIGN KEY ("match_id") REFERENCES "resume_matches"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "resume_match_items" ADD CONSTRAINT "resume_match_items_requirement_id_job_requirements_id_fkey" FOREIGN KEY ("requirement_id") REFERENCES "job_requirements"("id") ON DELETE CASCADE;