ALTER TABLE "user_resumes" RENAME COLUMN "ai_summary" TO "summary";--> statement-breakpoint
ALTER TABLE "user_resumes" ALTER COLUMN "embedding_status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "user_resumes" ALTER COLUMN "embedding_status" DROP DEFAULT;--> statement-breakpoint
DROP TYPE "embedding_status";--> statement-breakpoint
CREATE TYPE "embedding_status" AS ENUM('pending', 'ready', 'failed');--> statement-breakpoint
ALTER TABLE "user_resumes" ALTER COLUMN "embedding_status" SET DATA TYPE "embedding_status" USING "embedding_status"::"embedding_status";--> statement-breakpoint
ALTER TABLE "user_resumes" ALTER COLUMN "embedding_status" SET DEFAULT 'pending'::"embedding_status";