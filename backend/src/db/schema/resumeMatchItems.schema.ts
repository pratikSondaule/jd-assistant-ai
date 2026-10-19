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

export enum MatchStatus {
    MATCHED = "matched",
    PARTIAL = "partial",
    MISSING = "missing",
}

export enum GapType {
    WORDING_GAP = "wording_gap",
    SKILL_GAP = "skill_gap",
}

export const matchStatusEnum = pgEnum("match_status", [
    MatchStatus.MATCHED,
    MatchStatus.PARTIAL,
    MatchStatus.MISSING
]);

export const gapTypeEnum = pgEnum("gap_type", [
    GapType.WORDING_GAP,
    GapType.SKILL_GAP
]);

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
