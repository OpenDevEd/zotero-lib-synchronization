import { relations } from "drizzle-orm";
import { item } from "../tables/item";
import { language } from "../tables/language";
import { itemToTag } from "../tables/itemToTag";
import { group } from "../tables/group";

export const itemRelations = relations(item, ({ many, one }) => ({
    itemTags: many(itemToTag),
    language: one(language, {
        fields: [item.languageName],
        references: [language.name]
    }),
    group: one(group, {
        fields: [item.groupExternalId],
        references: [group.externalId]
    }),
}));
