// One row per JD requirement, per analysis: verdict + evidence + suggestion.
import {
    index,
    jsonb,
    pgEnum,
    pgTable,
    real,
    text,
    timestamp,
    uuid,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm/_relations";
import { resumeMatches } from "./resumeMatches.schema";
import { jobRequirements } from "./jobRequirements.schema";

export const matchStatusEnum = pgEnum("match_status", ["matched", "partial", "missing"]);

// wording_gap  = candidate likely has it, resume doesn't say it well -> tailor wording
// skill_gap    = candidate genuinely lacks it -> learn it / add only if true
export const gapTypeEnum = pgEnum("gap_type", ["wording_gap", "skill_gap"]);

export const resumeMatchItems = pgTable('resume_match_items', {
    id: uuid('id')
        .defaultRandom()
        .primaryKey(),

    matchId: uuid('match_id')
        .notNull()
        .references(() => resumeMatches.id, { onDelete: "cascade" }),

    requirementId: uuid('requirement_id')
        .notNull()
        .references(() => jobRequirements.id, { onDelete: "cascade" }),

    status: matchStatusEnum('status').notNull(),

    // Best retrieval similarity found. Store it: you'll need these
    // numbers to calibrate your "missing" threshold.
    topSimilarity: real('top_similarity'),

    evidence: text('evidence'),

    evidenceChunkIds: jsonb('evidence_chunk_ids')
        .$type<string[]>()
        .default([]),

    gapType: gapTypeEnum('gap_type'),

    suggestion: text('suggestion'),

    createdAt: timestamp('created_at')
        .defaultNow()
        .notNull(),
}, (table) => [
    index("resume_match_items_match_id_idx").on(table.matchId),
]);

export const resumeMatchItemsRelations = relations(resumeMatchItems, ({ one }) => ({
    match: one(resumeMatches, {
        fields: [resumeMatchItems.matchId],
        references: [resumeMatches.id],
    }),
    requirement: one(jobRequirements, {
        fields: [resumeMatchItems.requirementId],
        references: [jobRequirements.id],
    }),
}));

export type ResumeMatchItem = typeof resumeMatchItems.$inferSelect;
export type NewResumeMatchItem = typeof resumeMatchItems.$inferInsert;
