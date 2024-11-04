'use strict';
import { integer, pgTable, uuid } from 'drizzle-orm/pg-core';
import { timestamp } from 'drizzle-orm/pg-core';
import { varchar } from 'drizzle-orm/pg-core';

export const group = pgTable('group', {
  id: uuid().primaryKey().defaultRandom(),
  externalId: integer('externalId').notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  version: integer('version').notNull().default(0),
  type: varchar('type', { length: 255 }).notNull(),
  description: varchar('description', { length: 255 }),
  url: varchar('url', { length: 255 }),
  numItems: integer('numItems').default(0),
  itemsVersion: integer('itemsVersion').default(0),

  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
});
