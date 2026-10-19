import {
    index,
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

export enum RequirementType {
    REQUIRED_SKILL = "required_skill",
    NICE_TO_HAVE = "nice_to_have",
    RESPONSIBILITY = "responsibility",
}

export const requirementTypeEnum = pgEnum("requirement_type", [
    RequirementType.REQUIRED_SKILL,
    RequirementType.NICE_TO_HAVE,
    RequirementType.RESPONSIBILITY,
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

    embedding: vector("embedding", { dimensions: EMBEDDING_DIMENSIONS }).notNull(),

    createdAt: timestamp("created_at")
        .defaultNow()
        .notNull(),
}, (table) => [
    index('job_requirements_embedding_index').using('hnsw', table.embedding.op('vector_cosine_ops')),
    index('job_requirements_job_id_index').on(table.jobId),
]);

export const jobRequirementsRelations = relations(jobRequirements, ({ one }) => ({
    job: one(jobs, {
        fields: [jobRequirements.jobId],
        references: [jobs.id],
    }),
}));

export type JobRequirement = typeof jobRequirements.$inferSelect;
export type NewJobRequirement = typeof jobRequirements.$inferInsert;
