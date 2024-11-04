import { relations } from "drizzle-orm";
import { itemToCollection } from "../tables/itemToCollection";
import { item } from "../tables/item";
import { collection } from "../tables/collection";

export const itemToCollectionRelations = relations(itemToCollection, ({ one }) => ({
    item: one(item, {
        fields: [itemToCollection.itemKey],
        references: [item.key]
    }),
    collection: one(collection, {
        fields: [itemToCollection.collectionKey],
        references: [collection.key]
    })
}))
