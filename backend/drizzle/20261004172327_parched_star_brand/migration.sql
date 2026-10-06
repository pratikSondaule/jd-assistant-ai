CREATE TABLE "job_analysis" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"job_description" text NOT NULL,
	"job_title" varchar NOT NULL,
	"company" varchar NOT NULL,
	"location" varchar NOT NULL,
	"experience" varchar NOT NULL,
	"salary_range" varchar NOT NULL,
	"employment_type" varchar NOT NULL,
	"responsibilities" text[] NOT NULL,
	"required_skills" varchar[] NOT NULL,
	"nice_to_have_skills" varchar[] NOT NULL,
	"education" varchar NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
