import { integer, pgTable, uuid, varchar, timestamp, json } from 'drizzle-orm/pg-core';
import { group } from './group';

export const collection = pgTable('collection', {
  id: uuid().defaultRandom(),
  key: varchar('key').primaryKey(),

  version: integer('version').default(0),
  numCollections: integer('numCollections').default(0),
  numItems: integer('numItems').default(0),
  name: varchar('name'),
  deleted: integer('deleted').default(0),
  
  parentCollection: varchar().references(() => collection.key),
  groupExternalId: integer('groupExternalId').references(() => group.externalId),

  relations: json(),

  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
});
