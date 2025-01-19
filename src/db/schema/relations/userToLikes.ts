import { relations } from "drizzle-orm";
import { usersToLikes } from "../tables/userToLikes";
import { users } from "../tables/user";
import { item } from "../tables/item";

export const userToLikesRelations = relations(usersToLikes, ({ one }) => ({
	user: one(users, {
		fields: [usersToLikes.userId],
		references: [users.id],
	}),
	item: one(item, {
		fields: [usersToLikes.itemKey],
		references: [item.key],
	}),
}));
