import { pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

export const language = pgTable('language', {
  id: uuid().defaultRandom(),
  name: varchar('name').primaryKey(),

  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
});
