import { relations } from "drizzle-orm";
import { tag } from "../tables/tag";
import { itemToTag } from "../tables/itemToTag";

export const tagRelations = relations(tag, ({ many }) => ({
    itemTags: many(itemToTag),
}));