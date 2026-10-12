ALTER TABLE "user_resumes" ALTER COLUMN "ai_summary" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "user_resumes" ALTER COLUMN "skills" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "user_resumes" ALTER COLUMN "experience" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "user_resumes" ALTER COLUMN "education" DROP NOT NULL;