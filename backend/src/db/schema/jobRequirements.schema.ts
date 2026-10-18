// One row per requirement extracted from the JD (replaces the
// requiredSkills / niceToHaveSkills / responsibilities arrays).
// Embedded ONCE when the job is created, reused for every candidate.
import {
    integer,
    pgEnum,
    pgTable,
    text,
    timestamp,
    uuid,
    vector,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm/_relations";
import { jobs } from "./jobs.schema";
import { EMBEDDING_DIMENSIONS } from "../../constants/embedding.constants";

export const requirementTypeEnum = pgEnum("requirement_type", [
    "required_skill",
    "nice_to_have",
    "responsibility",
]);

export const jobRequirements = pgTable('job_requirements', {
    id: uuid("id")
        .defaultRandom()
        .primaryKey(),

    jobId: uuid("job_id")
        .notNull()
        .references(() => jobs.id, { onDelete: "cascade" }),

    text: text("text").notNull(),

    type: requirementTypeEnum("type").notNull(),

    position: integer("position").notNull().default(0),

    // Used as the QUERY vector against resume chunks, so it needs no
    // vector index of its own.
    embedding: vector("embedding", { dimensions: EMBEDDING_DIMENSIONS }).notNull(),

    createdAt: timestamp("created_at")
        .defaultNow()
        .notNull(),
});

export const jobRequirementsRelations = relations(jobRequirements, ({ one }) => ({
    job: one(jobs, {
        fields: [jobRequirements.jobId],
        references: [jobs.id],
    }),
}));

export type JobRequirement = typeof jobRequirements.$inferSelect;
export type NewJobRequirement = typeof jobRequirements.$inferInsert;
