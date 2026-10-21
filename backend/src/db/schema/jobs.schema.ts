import {
    pgEnum,
    pgTable,
    text,
    timestamp,
    uuid,
    varchar,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm/_relations";
import { users } from "./users.schema";
import { jobRequirements } from "./jobRequirements.schema";
import { resumeMatches } from "./resumeMatches.schema";
import { embeddingStatusEnum, EmbeddingStatus } from "./userResumes.schema";

export enum JobStatus {
    DRAFT = "draft",
    PUBLISHED = "published",
    CLOSED = "closed",
}

export const jobStatusEnum = pgEnum("job_status", [
    JobStatus.DRAFT,
    JobStatus.PUBLISHED,
    JobStatus.CLOSED
]);

export const jobs = pgTable('jobs', {
    id: uuid("id")
        .defaultRandom()
        .primaryKey(),

    createdBy: uuid("created_by")
        .notNull()
        .references(() => users.id),

    title: varchar("title").notNull(),
    company: varchar("company").notNull(),
    description: text("description").notNull(),
    location: varchar("location"),
    experience: varchar("experience"),
    salaryRange: varchar("salary_range"),
    employmentType: varchar("employment_type"),
    education: varchar("education"),

    status: jobStatusEnum("status")
        .notNull()
        .default(JobStatus.DRAFT),

    embeddingStatus: embeddingStatusEnum("embedding_status")
        .notNull()
        .default(EmbeddingStatus.PENDING),

    createdAt: timestamp("created_at")
        .defaultNow()
        .notNull(),

    updatedAt: timestamp("updated_at")
        .defaultNow()
        .$onUpdate(() => new Date())
        .notNull(),
});

export const jobsRelations = relations(jobs, ({ one, many }) => ({
    creator: one(users, {
        fields: [jobs.createdBy],
        references: [users.id],
    }),
    requirements: many(jobRequirements),
    resumeMatches: many(resumeMatches),
}));

export type Job = typeof jobs.$inferSelect;
export type NewJob = typeof jobs.$inferInsert;
