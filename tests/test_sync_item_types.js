const { test, beforeEach, afterEach, mock } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const { db } = require('../src/db');
const { item } = require('../src/db/schema/tables/item');
const { saveZoteroItems } = require('../src/local-db/db');

const cases = [
  ['dataset', 'Dataset', { identifier: 'survey-2026', repository: 'Research archive', format: 'CSV' }],
  ['standard', 'Standard', { organization: 'ISO', number: '27001', committee: 'JTC 1', status: 'Published' }],
];

let writtenItems;
let existingItems;
let savedEnvironment;

beforeEach(() => {
  writtenItems = [];
  existingItems = [];
  savedEnvironment = [process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE];
  process.env.SUPABASE_URL = 'https://example.invalid';
  process.env.SUPABASE_SERVICE_ROLE = 'unused-test-key';
  mock.method(fs, 'writeFileSync', () => {});
  mock.method(console, 'log', () => {});
  mock.method(db.query.item, 'findMany', async () => existingItems);
  mock.method(db, 'insert', (table) => ({
    values: (rows) => {
      if (table === item) writtenItems.push(...rows);
      return {
        onConflictDoUpdate: () => ({ returning: async () => [] }),
        onConflictDoNothing: async () => {},
      };
    },
  }));
  mock.method(db, 'update', () => ({ set: () => ({ where: async () => {} }) }));
});

afterEach(() => {
  mock.restoreAll();
  ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE'].forEach((key, index) => {
    if (savedEnvironment[index] === undefined) delete process.env[key];
    else process.env[key] = savedEnvironment[index];
  });
});

function record(type, fields) {
  return {
    key: 'G28WRGX9',
    version: 42,
    library: { id: 2405685 },
    data: {
      itemType: type,
      title: 'Imported reference',
      extra: 'KerkoCite.ItemAlsoKnownAs: 2339240:SE8GUM2L',
      dateAdded: '2026-10-02T12:34:33Z',
      dateModified: '2026-10-05T10:00:00Z',
      tags: [],
      collections: [],
      relations: {},
      ...fields,
    },
  };
}

async function sync(records) {
  await saveZoteroItems(
    [records],
    { 2405685: 42 },
    '2405685',
    { config: { group_id: '2405685' }, all: async () => [] },
    {},
    {},
  );
}

function checkImportedRow(row, databaseType, fields) {
  assert.equal(row.key, 'G28WRGX9');
  assert.equal(row.version, 42);
  assert.equal(row.itemType, databaseType);
  assert.equal(row.groupExternalId, 2405685);
  assert.equal(row.title, 'Imported reference');
  assert.equal(row.extra, 'KerkoCite.ItemAlsoKnownAs: 2339240:SE8GUM2L');
  assert.deepEqual(row.dateModified, new Date('2026-10-05T10:00:00Z'));
  for (const [field, value] of Object.entries(fields)) assert.equal(row[field], value);
}

for (const [zoteroType, databaseType, fields] of cases) {
  test(`imports ${zoteroType} with its metadata and redirect alias`, async () => {
    await sync([record(zoteroType, fields)]);

    assert.equal(writtenItems.length, 1);
    checkImportedRow(writtenItems[0], databaseType, fields);
  });

  test(`imports a cited ${zoteroType} as a complete row`, async () => {
    existingItems = [{ key: 'PARENT01', itemType: 'Document', relations: '{}', tags: [], collections: [] }];
    const note = record('note', {
      parentItem: 'PARENT01',
      tags: [{ tag: '_cites' }],
      note: 'https://www.zotero.org/groups/2405685/items/G28WRGX9',
    });
    note.key = 'NOTE0001';
    await sync([record(zoteroType, fields), note]);

    const imported = writtenItems.filter((row) => row.key === 'G28WRGX9');
    assert.equal(imported.length, 1);
    checkImportedRow(imported[0], databaseType, fields);
    assert.deepEqual(JSON.parse(imported[0].relations).citedBy, ['PARENT01']);
  });
}
