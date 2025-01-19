import { pgTable, primaryKey, timestamp, uuid, varchar, text, boolean } from "drizzle-orm/pg-core";
import { item } from "./item";
import { userCollection } from "./userCollection";
import { users } from "./user";

export const itemToUserCollection = pgTable("itemToUserCollection", {
	id: uuid("id").unique().defaultRandom(),
	itemKey: varchar("itemKey").notNull().references(() => item.key),
	userCollectionId: uuid("userCollectionId").notNull().references(() => userCollection.id),
	userId: text("userId").notNull().references(() => users.id),
	deleted: boolean("deleted").notNull().default(false),
	createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
	updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
}, (table) => ({
	pk: primaryKey({ columns: [table.itemKey, table.userCollectionId, table.userId] }),
}));
