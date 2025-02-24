import {
	boolean,
	timestamp,
	pgTable,
	text,
	primaryKey
} from "drizzle-orm/pg-core";
import { users } from "./user";
import { item } from "./item";

export const usersToLikes = pgTable("userToLikes", {
	userId: text("userId")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	itemKey: text("itemKey")
		.notNull()
		.references(() => item.key, { onDelete: "cascade" }),
	deleted: boolean("deleted").notNull().default(false),
	createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
	updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
}, (table) => ({
	pk: primaryKey({ columns: [table.userId, table.itemKey] }),
}));
