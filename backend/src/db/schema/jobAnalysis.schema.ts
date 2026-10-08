import {
    pgTable,
    text,
    timestamp,
    uuid,
    varchar,
} from "drizzle-orm/pg-core";
import { users } from "./users.schema";
import { relations } from "drizzle-orm/_relations";

export const jobAnalysis = pgTable('job_analysis', {
    id: uuid("id")
        .defaultRandom()
        .primaryKey(),

    userId: uuid("user_id")
        .notNull()
        .references(() => users.id),

    jobDescription: text("job_description")
        .notNull(),

    jobTitle: varchar("job_title")
        .notNull(),

    company: varchar("company")
        .notNull(),

    location: varchar("location")
        .notNull(),

    experience: varchar("experience")
        .notNull(),

    salaryRange: varchar("salary_range")
        .notNull(),

    employmentType: varchar("employment_type")
        .notNull(),

    responsibilities: text("responsibilities")
        .array()
        .notNull(),

    requiredSkills: varchar("required_skills")
        .array()
        .notNull(),

    niceToHaveSkills: varchar("nice_to_have_skills")
        .array()
        .notNull(),

    education: varchar("education")
        .notNull(),

    createdAt: timestamp("created_at")
        .defaultNow()
        .notNull(),

    updatedAt: timestamp("updated_at")
        .defaultNow()
        .notNull(),
});


export const jobAnalysisRelations = relations(jobAnalysis, ({ one }) => ({
    user: one(users, {
        fields: [jobAnalysis.userId],
        references: [users.id],
    }),
}));

export type JobAnalysis = typeof jobAnalysis.$inferSelect;
export type NewJobAnalysis = typeof jobAnalysis.$inferInsert;