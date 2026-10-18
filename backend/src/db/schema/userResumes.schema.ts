import { pgEnum, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm/_relations";
import { users } from "./users.schema";
import { jsonb } from "drizzle-orm/pg-core";
import { resumeMatches } from "./resumeMatches.schema";
import { resumeChunks } from "./resumeChunks.schema";

export const embeddingStatusEnum = pgEnum("embedding_status", ["PENDING", "READY", "FAILED"]);

export const userResumes = pgTable('user_resumes', {
    id: uuid('id')
        .defaultRandom()
        .primaryKey(),

    userId: uuid('user_id')
        .notNull()
        .references(() => users.id),

    fileName: varchar('file_name')
        .notNull(),

    fileKey: varchar('file_key')
        .notNull(),

    resumeText: text('resume_text')
        .notNull(),

    aiSummary: text('ai_summary'),

    skills: jsonb('skills')
        .$type<string[]>()
        .default([]),

    experience: jsonb("experience")
        .$type<{
            company: string;
            role: string;
            duration: string;
            responsibilities: string[];
        }[]>()
        .default([]),

    projects: jsonb("projects")
        .$type<{
            name: string;
            description: string;
            techStack: string[];
        }[]>()
        .default([]),

    education: jsonb("education")
        .$type<{
            degree: string;
            institution: string;
            graduationYear: string;
        }[]>()
        .default([]),

    certificates: jsonb("certificates")
        .$type<string[]>()
        .default([]),

    embeddingStatus: embeddingStatusEnum("embedding_status")
        .notNull()
        .default("PENDING"),

    createdAt: timestamp('created_at')
        .defaultNow()
        .notNull(),

    updatedAt: timestamp('updated_at')
        .defaultNow()
        .$onUpdate(() => new Date())
        .notNull(),
})

export const userResumesRelations = relations(userResumes, ({ one, many }) => ({
    user: one(users, {
        fields: [userResumes.userId],
        references: [users.id]
    }),
    chunks: many(resumeChunks),
    resumeMatches: many(resumeMatches),
}))

export type UserResumes = typeof userResumes.$inferSelect;
export type NewUserResumes = typeof userResumes.$inferInsert;
