import { relations } from "drizzle-orm";
import { users } from "../tables/user";
import { usersToLikes } from "../tables/userToLikes";
import { userToFollow } from "../tables/userToFollow";
import { userCollection } from "../tables/userCollection";

export const userRelations = relations(users, ({ many }) => ({
	likes: many(usersToLikes),
	following: many(userToFollow, {
		relationName: "userToFollowing"
	}),
	followers: many(userToFollow, {
		relationName: "userToFollowers"
	}),
	collections: many(userCollection),
}));
