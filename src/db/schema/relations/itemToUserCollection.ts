import { relations } from "drizzle-orm";
import { itemToUserCollection } from "../tables/itemToUserCollection";
import { item } from "../tables/item";
import { userCollection } from "../tables/userCollection";

export const itemToUserCollectionRelations = relations(itemToUserCollection, ({ one }) => ({
	item: one(item, {
		fields: [itemToUserCollection.itemKey],
		references: [item.key],
	}),
	userCollection: one(userCollection, {
		fields: [itemToUserCollection.userCollectionId],
		references: [userCollection.id],
	}),
}));
