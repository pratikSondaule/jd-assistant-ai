import { relations } from "drizzle-orm/_relations";
import {
    pgTable,
    timestamp,
    uuid,
    varchar,
} from "drizzle-orm/pg-core";
import { users } from "./users.schema";

export const authRefreshToken = pgTable('auth_refresh_tokens', {
    id: uuid("id")
        .defaultRandom()
        .primaryKey(),

    userId: uuid("user_id")
        .notNull(),

    refreshToken: varchar("refresh_token")
        .notNull(),

    expiresAt: timestamp("expires_at")
        .notNull(),

    createdAt: timestamp("created_at")
        .defaultNow()
        .notNull(),

    updatedAt: timestamp("updated_at")
        .defaultNow()
        .notNull(),
});

export const authRefreshTokenRelations = relations(authRefreshToken, ({ one }) => ({
    user: one(users, {
        fields: [authRefreshToken.userId],
        references: [users.id],
    }),
}));

export type AuthRefreshToken = typeof authRefreshToken.$inferSelect;
export type NewAuthRefreshToken = typeof authRefreshToken.$inferInsert;