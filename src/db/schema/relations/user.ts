import { relations } from "drizzle-orm";
import { users } from "../tables/user";
import { usersToLikes } from "../tables/userToLikes";
import { userToFollow } from "../tables/userToFollow";
import { userCollection } from "../tables/userCollection";

export const userRelations = relations(users, ({ many }) => ({
	likes: many(usersToLikes),
	following: many(userToFollow),
	followers: many(userToFollow),
	collections: many(userCollection),
}));
