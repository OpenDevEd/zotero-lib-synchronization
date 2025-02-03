import { pgTable, primaryKey, timestamp, varchar } from 'drizzle-orm/pg-core';
import { item } from './item';
import { tag } from './tag';

export const itemToTag = pgTable(
  'itemToTag',
  {
    itemKey: varchar('itemKey', { length: 255 })
      .notNull()
      .references(() => item.key),
    tagName: varchar('tagName', { length: 255 })
      .references(() => tag.name)
      .notNull(),

    createdAt: timestamp('createdAt').notNull().defaultNow(),
    updatedAt: timestamp('updatedAt').notNull().defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.itemKey, table.tagName] }),
  }),
);
