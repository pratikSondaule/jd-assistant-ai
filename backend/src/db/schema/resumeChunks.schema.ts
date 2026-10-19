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
import { userResumes } from "./userResumes.schema";
import { EMBEDDING_DIMENSIONS } from "../../constants/embedding.constants";

export const resumeSectionEnum = pgEnum("resume_section", [
    "summary",
    "experience",
    "projects",
    "skills",
    "education",
    "certificates",
]);

export const resumeChunks = pgTable('resume_chunks', {
    id: uuid("id")
        .defaultRandom()
        .primaryKey(),

    resumeId: uuid("resume_id")
        .notNull()
        .references(() => userResumes.id, { onDelete: "cascade" }),

    section: resumeSectionEnum("section").notNull(),

    content: text("content").notNull(),

    position: integer("position").notNull().default(0),

    embedding: vector("embedding", { dimensions: EMBEDDING_DIMENSIONS }).notNull(),

    createdAt: timestamp("created_at")
        .defaultNow()
        .notNull(),
}, (table) => [
    index("resume_chunks_embedding_idx").using("hnsw", table.embedding.op("vector_cosine_ops")),
    index("resume_chunks_resume_id_idx").on(table.resumeId),
]);

export const resumeChunksRelations = relations(resumeChunks, ({ one }) => ({
    resume: one(userResumes, {
        fields: [resumeChunks.resumeId],
        references: [userResumes.id],
    }),
}));

export type ResumeChunk = typeof resumeChunks.$inferSelect;
export type NewResumeChunk = typeof resumeChunks.$inferInsert;
