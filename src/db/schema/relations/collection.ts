import { relations } from "drizzle-orm";
import { collection } from "../tables/collection";
import { itemToCollection } from "../tables/itemToCollection";

export const collectionRelations = relations(collection, ({ one, many }) => ({
    parent: one(collection, {
        fields: [collection.parentCollection],
        references: [collection.key],
        relationName: "parentToChild"
    }),
    children: many(collection, {
        relationName: "parentToChild"
    }),
    items: many(itemToCollection),
}))
