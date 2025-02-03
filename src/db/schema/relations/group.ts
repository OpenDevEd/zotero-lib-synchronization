import { relations } from "drizzle-orm";
import { group } from "../tables/group";
import { item } from "../tables/item";

export const groupRelations = relations(group, ({ many }) => ({
    items: many(item),
}));
