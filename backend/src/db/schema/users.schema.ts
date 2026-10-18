import { relations } from "drizzle-orm/_relations";
import {
    pgEnum,
    pgTable,
    timestamp,
    uuid,
    varchar,
} from "drizzle-orm/pg-core";
import { jobs } from "./jobs.schema";
import { userResumes } from "./userResumes.schema";

export const userRoleEnum = pgEnum("user_role", ["COMPANY", "CANDIDATE"]);

export const users = pgTable('users', {
    id: uuid("id")
        .defaultRandom()
        .primaryKey(),

    name: varchar("name")
        .notNull(),

    email: varchar("email")
        .unique()
        .notNull(),

    password: varchar("password"),

    googleId: varchar("google_id"),

    profileImage: varchar("profile_image"),

    role: userRoleEnum("role")
        .notNull()
        .default("CANDIDATE"),

    createdAt: timestamp("created_at")
        .defaultNow()
        .notNull(),

    updatedAt: timestamp("updated_at")
        .defaultNow()
        .$onUpdate(() => new Date())
        .notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
    jobs: many(jobs),            // jobs posted (company role)
    userResumes: many(userResumes), // resumes uploaded (candidate role)
}));

export type Users = typeof users.$inferSelect;
export type NewUsers = typeof users.$inferInsert;
