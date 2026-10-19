import { integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { users } from "./users.schema";
import { userResumes } from "./userResumes.schema";
import { jobs } from "./jobs.schema";
import { resumeMatchItems } from "./resumeMatchItems.schema";
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

    jobId: uuid('job_id')
        .notNull()
        .references(() => jobs.id),

    matchScore: integer('match_score')
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
        .$onUpdate(() => new Date())
        .notNull(),
})

export const resumeMatchesRelations = relations(resumeMatches, ({ one, many }) => ({
    user: one(users, {
        fields: [resumeMatches.userId],
        references: [users.id],
    }),
    resume: one(userResumes, {
        fields: [resumeMatches.resumeId],
        references: [userResumes.id],
    }),
    job: one(jobs, {
        fields: [resumeMatches.jobId],
        references: [jobs.id],
    }),
    items: many(resumeMatchItems),
}));

export type ResumeMatches = typeof resumeMatches.$inferSelect;
export type NewResumeMatches = typeof resumeMatches.$inferInsert;
