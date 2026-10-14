import { integer, jsonb, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { users } from "./users.schema";
import { userResumes } from "./userResumes.schema";
import { jobAnalysis } from "./jobAnalysis.schema";
import { relations } from "drizzle-orm/_relations";

export const resumeMatches = pgTable('resume_matches', {
    id: uuid('id')
        .defaultRandom()
        .primaryKey(),

    userId: uuid('user_id')
        .notNull()
        .references(() => users.id),

    resumeId: uuid('resume_id')
        .notNull()
        .references(() => userResumes.id),

    jobAnalysisId: uuid('job_analysis_id')
        .notNull()
        .references(() => jobAnalysis.id),

    matchScore: integer('match_score')
        .notNull(),

    requiredSkills: jsonb('required_skills')
        .$type<{
            skill: string;
            status: 'matched' | 'partial' | 'missing';
            evidence: string;
        }[]>()
        .notNull(),

    matchingSkills: jsonb('matching_skills')
        .$type<string[]>()
        .default([]),

    missingSkills: jsonb('missing_skills')
        .$type<string[]>()
        .default([]),

    niceToHaveSkills: jsonb('nice_to_have_skills')
        .$type<string[]>()
        .notNull(),

    experienceAlignment: text('experience_alignment')
        .notNull(),

    educationAlignment: text('education_alignment')
        .notNull(),

    overallFeedback: jsonb('overall_feedback')
        .$type<string[]>()
        .default([]),

    createdAt: timestamp('created_at')
        .defaultNow()
        .notNull(),

    updatedAt: timestamp('updated_at')
        .defaultNow()
        .notNull(),
})

export const resumeMatchesRelations = relations(resumeMatches, ({ one }) => ({
    user: one(users, {
        fields: [resumeMatches.userId],
        references: [users.id],
    }),
    resume: one(userResumes, {
        fields: [resumeMatches.resumeId],
        references: [userResumes.id],
    }),
    jobAnalysis: one(jobAnalysis, {
        fields: [resumeMatches.jobAnalysisId],
        references: [jobAnalysis.id],
    }),
}));

export type ResumeMatches = typeof resumeMatches.$inferSelect;
export type NewResumeMatches = typeof resumeMatches.$inferInsert;
