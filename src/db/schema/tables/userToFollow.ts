import { pgTable, primaryKey, text, timestamp, uuid, boolean } from "drizzle-orm/pg-core";
import { users } from "./user";

export const userToFollow = pgTable("userToFollow", {
	id: uuid("id").unique().defaultRandom(),
	userId: text("userId").notNull().references(() => users.id),
	followingId: text("followingId").notNull().references(() => users.id),
	deleted: boolean("deleted").notNull().default(false),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
}, (table) => ({
	pk: primaryKey({ columns: [table.userId, table.followingId] }),
}));
