import { integer, pgTable, uuid, varchar, timestamp } from 'drizzle-orm/pg-core';

export const collection = pgTable('collection', {
  id: uuid().defaultRandom(),
  key: varchar('key').primaryKey(),

  version: integer('version').default(0),
  numCollections: integer('numCollections').default(0),
  numItems: integer('numItems').default(0),
  parentKey: varchar().references(() => collection.key),

  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
});
