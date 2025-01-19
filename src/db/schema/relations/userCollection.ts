import { relations } from "drizzle-orm";
import { userCollection } from "../tables/userCollection";
import { itemToUserCollection } from "../tables/itemToUserCollection";
import { users } from "../tables/user";

export const userCollectionRelations = relations(userCollection, ({ one, many }) => ({
	items: many(itemToUserCollection),
	user: one(users, {
		fields: [userCollection.userId],
		references: [users.id],
	}),
}));
