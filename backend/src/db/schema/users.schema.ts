import {
    pgTable,
    timestamp,
    uuid,
    varchar,
} from "drizzle-orm/pg-core";

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

    createdAt: timestamp("created_at")
        .defaultNow()
        .notNull(),

    updatedAt: timestamp("updated_at")
        .defaultNow()
        .notNull(),
});

export type Users = typeof users.$inferSelect;
export type NewUsers = typeof users.$inferInsert;