import { index, integer, pgTable, text, uuid, varchar, vector } from 'drizzle-orm/pg-core';
import { item } from './item';

export const embeddings = pgTable(
  'embeddings',
  {
    id: uuid().primaryKey().defaultRandom(),
    itemKey: varchar('itemKey').references(() => item.key),
    content: text('content').notNull(),
    page: integer('page').notNull(),
    embedding: vector('embedding', { dimensions: 1536 }).notNull(),
  },
  table => ({
    embeddingIndex: index('embeddingIndex').using(
      'hnsw',
      table.embedding.op('vector_cosine_ops'),
    ),
  }),
);