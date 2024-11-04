import { pgTable, primaryKey, timestamp, varchar } from 'drizzle-orm/pg-core';
import { item } from './item';
import { collection } from './collection';

export const itemToCollection = pgTable(
  'itemToCollection',
  {
    itemKey: varchar({ length: 255 })
      .notNull()
      .references(() => item.key),
    collectionKey: varchar({ length: 255 })
      .notNull()
      .references(() => collection.key),

    createdAt: timestamp().notNull().defaultNow(),
    updatedAt: timestamp().notNull().defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.itemKey, table.collectionKey] }),
  }),
);
