import { relations } from "drizzle-orm";
import { item } from "../tables/item";
import { language } from "../tables/language";

export const languageRelations = relations(language, ({ many }) => ({
    items: many(item),
}));
