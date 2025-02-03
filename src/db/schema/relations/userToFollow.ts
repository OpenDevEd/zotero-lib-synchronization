import { relations } from "drizzle-orm";
import { userToFollow } from "../tables/userToFollow";
import { users } from "../tables/user";

export const userToFollowRelations = relations(userToFollow, ({ one }) => ({
	user: one(users, {
		fields: [userToFollow.userId],
		references: [users.id],
		relationName: "userToFollowing"
	}),
	following: one(users, {
		fields: [userToFollow.followingId],
		references: [users.id],
		relationName: "userToFollowers"
	}),
}));
