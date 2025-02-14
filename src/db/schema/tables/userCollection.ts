import { integer, pgTable, text, timestamp, uuid, varchar, boolean } from "drizzle-orm/pg-core";
import { users } from "./user";

export const userCollection = pgTable("userCollection", {
	id: uuid("id").primaryKey().defaultRandom(),
	userId: text("userId").notNull().references(() => users.id),
    name: varchar("name", { length: 255 }).notNull(),
    description: varchar("description", { length: 255 }),
    private: boolean("private").default(false),
    numItems: integer("numItems").default(0),
    deleted: boolean("deleted").default(false),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
});