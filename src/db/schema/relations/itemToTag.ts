import { relations } from "drizzle-orm";
import { itemToTag } from "../tables/itemToTag";
import { tag } from "../tables/tag";
import { item } from "../tables/item";

export const itemToTagRelations = relations(itemToTag, ({ one }) => ({
    item: one(item, {
        fields: [itemToTag.itemKey],
        references: [item.key],
    }),
    tag: one(tag, {
        fields: [itemToTag.tagName],
        references: [tag.name],
    }),
}));