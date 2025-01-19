import { config } from "dotenv";

config({ path: ".env" });

import { drizzle } from 'drizzle-orm/node-postgres';

import * as itemTable from "./schema/tables/item";
import * as collectionTable from "./schema/tables/collection";
import * as groupTable from "./schema/tables/group";
import * as itemToCollectionTable from "./schema/tables/itemToCollection";
import * as itemToTagTable from "./schema/tables/itemToTag";
import * as languageTable from "./schema/tables/language";
import * as tagTable from "./schema/tables/tag";

import * as itemRelations from './schema/relations/item';
import * as collectionRelations from './schema/relations/collection';
import * as itemToCollectionRelations from './schema/relations/itemToCollection';

import * as userTable from './schema/tables/user';
import * as userToLikesTable from './schema/tables/userToLikes';
import * as userRelations from './schema/relations/user';
import * as userToLikesRelations from './schema/relations/userToLikes';

import * as userToFollowTable from './schema/tables/userToFollow';
import * as userToFollowRelations from './schema/relations/userToFollow';
import * as userCollectionTable from './schema/tables/userCollection';
import * as userCollectionRelations from './schema/relations/userCollection';
import * as itemToUserCollectionTable from './schema/tables/itemToUserCollection';
import * as itemToUserCollectionRelations from './schema/relations/itemToUserCollection';


export const schema = {
    ...itemTable,
    ...collectionTable,
    ...groupTable,
    ...itemToCollectionTable,
    ...itemToTagTable,
    ...languageTable,
    ...tagTable,
    ...collectionRelations,
    ...itemRelations,
    ...itemToCollectionRelations,
    ...userTable,
    ...userToLikesTable,
    ...userRelations,
    ...userToLikesRelations,
    ...userToFollowTable,
    ...userToFollowRelations,
    ...userCollectionTable,
    ...userCollectionRelations,
    ...itemToUserCollectionTable,
    ...itemToUserCollectionRelations,
}

export const db = drizzle(process.env.DATABASE_URL_POST!, { schema });