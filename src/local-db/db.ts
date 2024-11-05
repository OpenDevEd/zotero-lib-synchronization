import * as fs from 'fs';

import { Item } from '../types/item';
import { db } from '../db/index';
import { eq, getTableColumns, inArray, InferInsertModel, InferSelectModel, sql } from 'drizzle-orm';
import { group } from '../db/schema/tables/group';
import { item } from '../db/schema/tables/item';
import { collection } from '../db/schema/tables/collection';
import { itemToCollection } from '../db/schema/tables/itemToCollection';
import { columns } from '../db/schema/views/columns';
import { tag } from '../db/schema/tables/tag';
import { itemToTag } from '../db/schema/tables/itemToTag';
import { PgTable } from 'drizzle-orm/pg-core';
import { language } from '../db/schema/tables/language';
import * as ZoteroTypes from '../types/config';
const BATCH_SIZE = 500;

export type GroupTableWrite = InferInsertModel<typeof group>;
export type ItemTableWrite = InferInsertModel<typeof item>;
export type CollectionTableWrite = InferInsertModel<typeof collection>;
export type ItemToCollectionTableWrite = InferInsertModel<typeof itemToCollection>;
export type TagTableWrite = InferInsertModel<typeof tag>;
export type ItemToTagTableWrite = InferInsertModel<typeof itemToTag>;
export type LanguageTableWrite = InferInsertModel<typeof language>;

export type GroupTableRead = InferSelectModel<typeof group>;
export type ItemTableRead = InferSelectModel<typeof item>;
export type CollectionTableRead = InferSelectModel<typeof collection>;
export type ItemToCollectionTableRead = InferSelectModel<typeof itemToCollection>;
export type TagTableRead = InferSelectModel<typeof tag>;
export type ItemToTagTableRead = InferSelectModel<typeof itemToTag>;
export type LanguageTableRead = InferSelectModel<typeof language>;

/**
 * Type definition for a Zotero item with all its properties
 */
export type ZoteroItem = {
  key: string;
  version: number;
  library: {
    type: string;
    id: number;
    name: string;
    links: {
      alternate: {
        href: string;
        type: string;
      };
    };
  };
  links: {
    self: {
      href: string;
      type: string;
    };
    alternate: {
      href: string;
      type: string;
    };
    up?: {
      href: string;
      type: string;
    };
  };
  meta: {
    createdByUser: {
      id: number;
      username: string;
      name: string;
      links: {
        alternate: {
          href: string;
          type: string;
        };
      };
    };
    creatorSummary?: string;
    parsedDate?: string;
    numChildren?: number;
  };
  data: {
    key: string;
    version: number;
    itemType: string;
    title?: string;
    parentItem?: string;
    creators?: Array<{
      creatorType: string;
      firstName: string;
      lastName: string;
    }>;
    abstractNote?: string;
    deleted?: number;
    reportNumber?: string;
    reportType?: string;
    seriesTitle?: string;
    place?: string;
    institution?: string;
    date?: string;
    pages?: string;
    language?: string;
    shortTitle?: string;
    url?: string;
    accessDate?: string;
    archive?: string;
    archiveLocation?: string;
    libraryCatalog?: string;
    callNumber?: string;
    rights?: string;
    extra?: string;
    tags: Array<{
      tag: string;
    }>;
    collections: string[];
    relations?: {};
    dateAdded: string;
    dateModified: string;
    note?: string;
    linkMode?: string;
    contentType?: string;
    charset?: string;
  };
};

/**
 * Type definition for a Zotero group data structure
 */
export type ZoteroGroup = {
  id: number;
  version: number;
  links: {
    self: {
      href: string;
      type: string;
    };
    alternate: {
      href: string;
      type: string;
    };
  };
  meta: {
    created: string;
    lastModified: string;
    numItems: number;
  };
  data: {
    id: number;
    version: number;
    name: string;
    owner: number;
    type: string;
    description: string;
    url: string;
    libraryEditing: string;
    libraryReading: string;
    fileEditing: string;
    members: number[];
  };
};

const itemColumns = Object.values(getTableColumns(item)).map((col) => col.name);

/**
 * Retrieves all groups from the database.
 * @returns {Promise<GroupTableRead[]>} A promise that resolves to an array of groups.
 */
export async function getAllGroups(): Promise<GroupTableRead[]> {
  const groups = await db.query.group.findMany();

  return groups;
}

/**
 * Creates a group object from a Zotero group
 * @param {ZoteroGroup} group - The ZoteroGroup to create a group from
 * @returns {GroupTableWrite} The created group object
 */
function createGroup(group: ZoteroGroup): GroupTableWrite {
  const obj = {} as GroupTableWrite;
  obj.externalId = Number(group.id);
  obj.version = group.version;
  obj.numItems = group.meta.numItems || 0;
  obj.description = group.data.description;
  obj.itemsVersion = group.data.version;
  obj.name = group.data.name;
  obj.type = group.data.type;
  obj.url = group.data.url;
  return obj;
}

/**
 * Saves the group data to the database.
 * If a group with the same ID already exists, it updates the group's version and updatedAt fields.
 * Otherwise, it creates a new group with the provided data.
 * @param {Array<Object>} groupData - The group data to be saved.
 * @returns {Promise<void>} - A promise that resolves when the group data is saved.
 */
export async function saveGroup(groupData: any): Promise<void> {
  fs.writeFileSync('groupData.json', JSON.stringify(groupData, null, 2));

  const groupTable = groupData.map(createGroup);

  await db
    .insert(group)
    .values(groupTable)
    .onConflictDoUpdate({
      target: [group.externalId],
      set: onConflictDoUpdateExcept(group, ['id', 'createdAt', 'externalId', 'itemsVersion']),
    });
}

/**
 * Matches and normalizes an item's type with the available column types
 * @param {ZoteroItem} item - The item to match type for
 * @returns {boolean} True if a matching type was found and set, false otherwise
 */
function matchItemType(item: ZoteroItem): boolean {
  const itemType = Object.keys(columns).find(
    (itemType) => itemType.toLowerCase() === item.data.itemType.toLowerCase(),
  ) as string;
  if (!itemType) return false;
  item.data.itemType = itemType;
  return true;
}

/**
 * Creates an item object from a Zotero item
 * @param {ZoteroItem} item - The Zotero item to create from
 * @returns {ItemTableRead} The created item object
 */
function createItem(item: ZoteroItem): ItemTableRead {
  const obj = {} as ItemTableWrite;
  obj.key = item.key;
  obj.version = item.version;
  obj.groupExternalId = Number(item.library.id);
  itemColumns.forEach((column) => {
    if (column == "relations") {
      if (item.data.relations && Object.keys(item.data.relations).length > 0) {
        obj.relations = JSON.stringify(item.data.relations);
      }
    }
    else if (column === 'tags') {
      // convert tags to string array 
      obj.tags = item.data.tags.map(tag => tag.tag);
    }
    else if (column in item.data) {
      obj[column] = item.data[column];
    }
    });  
  if (item.data.language && item.data.language.length > 0)
    obj.languageName = item.data.language;
  return obj as ItemTableRead;
}

// /**
//  * Creates a collection object from a collection key
//  * @param {string} collection - The collection key
//  * @returns {CollectionTableRead} The created collection object
//  */
// function createCollection(collection: ZoteroItem['data']['collections'][number]): CollectionTableRead {
//   const obj = {} as CollectionTableWrite;
//   obj.key = collection;
//   return obj as CollectionTableRead;
// }

// /**
//  * Creates an item-to-collection mapping object
//  * @param {ItemTableRead} item - The item to map
//  * @param {CollectionTableRead} collection - The collection to map to
//  * @returns {ItemToCollectionTableRead} The created mapping object
//  */
// function createItemToCollection(item: ItemTableRead, collection: CollectionTableRead): ItemToCollectionTableWrite {
//   const obj = {} as ItemToCollectionTableWrite;
//   obj.itemKey = item.key;
//   obj.collectionKey = collection.key;
//   return obj as ItemToCollectionTableRead;
// }

/**
 * Creates an update object for handling conflicts during database operations
 * @param {PgTable} pgTable - The table to create update object for
 * @param {string[]} except - Column names to exclude from updates
 * @returns {Object} The update object with SQL expressions
 */
function onConflictDoUpdateExcept(pgTable: PgTable = item, except: string[] = ['id', 'createdAt']): Record<string, any> {
  const columnNames: string[] = Object.values(getTableColumns(pgTable)).map((col) => col.name);

  const obj = {
    ...columnNames.reduce((acc, key) => {
      if (!except.includes(key)) {
        acc[key] = sql.raw(`excluded."${key}"`);
      }
      return acc;
    }, {}),
    ...(except.includes('updatedAt')
      ? {}
      : { updatedAt: sql`now()` }),
  };

  return obj;
}

// /**
//  * Creates a tag object from a Zotero tag
//  * @param {Object} tag - The tag object from Zotero
//  * @returns {TagTableRead} The created tag object
//  */
// function createTag(tag: ZoteroItem['data']['tags'][number]): TagTableRead {
//   const obj = {} as TagTableWrite;
//   obj.name = tag.tag;
//   return obj as TagTableRead;
// }

// /**
//  * Creates an item-to-tag mapping object
//  * @param {ItemTableRead} item - The item to map
//  * @param {TagTableRead} tag - The tag to map to
//  * @returns {ItemToTagTableRead} The created mapping object
//  */
// function createItemToTag(item: ItemTableRead, tag: TagTableRead): ItemToTagTableWrite {
//   const obj = {} as ItemToTagTableWrite;
//   obj.itemKey = item.key;
//   obj.tagName = tag.name;
//   return obj as ItemToTagTableRead;
// }

// /**
//  * Processes collections for an item, creating necessary objects and tracking deletions
//  * @param {ZoteroItem} item - The item containing collections
//  * @param {ItemTableRead} itemObj - The database item object
//  * @param {CollectionTableWrite[]} collections - Array to store new collections
//  * @param {ItemToCollectionTableWrite[]} itemToCollections - Array to store new mappings
//  * @param {ItemToCollectionTableWrite[]} itemToCollectionsToDelete - Array to store mappings to delete
//  * @param {ItemToCollectionTableRead[]} allItemToCollections - Existing mappings
//  */
// function processCollections(
//   item: ZoteroItem,
//   itemObj: ItemTableRead,
//   collections: CollectionTableWrite[],
//   itemToCollections: ItemToCollectionTableWrite[],
//   itemToCollectionsToDelete: ItemToCollectionTableWrite[],
//   allItemToCollections: ItemToCollectionTableRead[],
// ) {
//   if (item.data.collections) {
//     item.data.collections.forEach((collection) => {
//       let collectionObj = collections.find((c) => c.key === collection);
//       if (!collectionObj) {
//         collectionObj = createCollection(collection);
//         collections.push(collectionObj);
//       }
//       itemToCollections.push(createItemToCollection(itemObj, collectionObj as CollectionTableRead));
//     });
//     itemToCollectionsToDelete.push(
//       ...allItemToCollections.filter(
//         (i) => i.itemKey === itemObj.key && !item.data.collections.includes(i.collectionKey),
//       ),
//     );
//   }
// }

// /**
//  * Processes tags for an item, creating necessary objects and tracking deletions
//  * @param {ZoteroItem} item - The item containing tags
//  * @param {ItemTableRead} itemObj - The database item object
//  * @param {TagTableWrite[]} tags - Array to store new tags
//  * @param {ItemToTagTableWrite[]} itemToTags - Array to store new mappings
//  * @param {ItemToTagTableWrite[]} itemToTagsToDelete - Array to store mappings to delete
//  * @param {ItemToTagTableRead[]} allItemToTags - Existing mappings
//  */
// function processTags(
//   item: ZoteroItem,
//   itemObj: ItemTableRead,
//   tags: TagTableWrite[],
//   itemToTags: ItemToTagTableWrite[],
//   itemToTagsToDelete: ItemToTagTableWrite[],
//   allItemToTags: ItemToTagTableRead[],
// ) {
//   if (item.data.tags) {
//     item.data.tags.forEach((tag) => {
//       let tagObj = tags.find((t) => t.name === tag.tag);
//       if (!tagObj) {
//         tagObj = createTag(tag);
//         tags.push(tagObj);
//       }
//       itemToTags.push(createItemToTag(itemObj, tagObj as TagTableRead));
//     });
//     itemToTagsToDelete.push(
//       ...allItemToTags.filter(
//         (i) => i.itemKey === itemObj.key && !item.data.tags.map((t) => t.tag).includes(i.tagName),
//       ),
//     );
//   }
// }

/**
 * Processes language information for an item
 * @param {ZoteroItem} item - The item containing language information
 * @param {LanguageTableWrite[]} languages - Array to store new languages
 */
function processLanguage(
  item: ZoteroItem,
  languages: LanguageTableWrite[],
) {
  if (item.data.language && item.data.language.length > 0) {
    if (!languages.find((language) => language.name == item.data.language))
      languages.push({
        name: item.data.language,
      });
  }
}

/**
 * Saves Zotero items to the database.
 *
 * @param allFetchedItems - An array of fetched items.
 * @param lastModifiedVersion - The last modified version of the items.
 * @param groupId - The ID of the group.
 * @returns {Promise<void>}
 */
export async function saveZoteroItems(
  allFetchedItems: ZoteroItem[][],
  lastModifiedVersion,
  groupId: string,
  zoteroLib: any,
  config: ZoteroTypes.ZoteroConfigOptions,
): Promise<void> {
  const items = [] as ItemTableWrite[];
  const collections = [] as CollectionTableWrite[];
  const languages = [] as LanguageTableWrite[];
  const tags = [] as TagTableWrite[];

  const itemToCollections = [] as ItemToCollectionTableWrite[];
  const itemToTags = [] as ItemToTagTableWrite[];

  // const itemToCollectionsToDelete = [] as ItemToCollectionTableWrite[];
  // const itemToTagsToDelete = [] as ItemToTagTableWrite[];

  // const allItemToTags = await db.query.itemToTag.findMany();
  // const allItemToCollections = await db.query.itemToCollection.findMany();

  fs.writeFileSync('lastModifiedVersion.json', JSON.stringify(lastModifiedVersion, null, 2));
  fs.writeFileSync('allFetchedItems.json', JSON.stringify(allFetchedItems, null, 2));

  for (const chunk of allFetchedItems) {
    if (!Array.isArray(chunk)) {
      console.error('Invalid chunk structure:', chunk);
      continue;
    }
    for (const item of chunk) {
      if (matchItemType(item)) {
        const itemObj = createItem(item);
        items.push(itemObj);

        // processCollections(
        //   item,
        //   itemObj,
        //   collections,
        //   itemToCollections,
        //   itemToCollectionsToDelete,
        //   allItemToCollections,
        // );

        // processTags(
        //   item,
        //   itemObj,
        //   tags,
        //   itemToTags,
        //   itemToTagsToDelete,
        //   allItemToTags,
        // );

        processLanguage(item, languages);
      }
    }
  }

  // await db.delete(itemToCollection).where(
  //   inArray(
  //     itemToCollection.itemKey,
  //     itemToCollectionsToDelete.map((i) => i.itemKey),
  //   ),
  // );

  // await db.delete(itemToTag).where(
  //   inArray(
  //     itemToTag.itemKey,
  //     itemToTagsToDelete.map((i) => i.itemKey),
  //   ),
  // );

  if (languages.length > 0)
    await db
      .insert(language)
      .values(languages)
      .onConflictDoNothing()

  if (items.length > 0) {
    console.log(`adding ${items.length} items`);

    for (let i = 0; i < items.length; i += BATCH_SIZE) {
      const batch = items.slice(i, i + BATCH_SIZE);
      await db
        .insert(item)
        .values(batch)
        .onConflictDoUpdate({
          target: [item.key],
          set: onConflictDoUpdateExcept(item),
        });
    }
  }

  if (collections.length > 0) {
    console.log(`adding ${collections.length} collections`);
    await db
      .insert(collection)
      .values(collections)
      .onConflictDoUpdate({
        target: [collection.key],
        set: onConflictDoUpdateExcept(collection),
      });
  }

  if (itemToCollections.length > 0) {
    console.log(`adding ${itemToCollections.length} itemToCollections`);
    await db
      .insert(itemToCollection)
      .values(itemToCollections)
      .onConflictDoUpdate({
        target: [itemToCollection.itemKey, itemToCollection.collectionKey],
        set: onConflictDoUpdateExcept(itemToCollection),
      });
  }

  if (tags.length > 0) {
    console.log(`adding ${tags.length} tags`);
    await db
      .insert(tag)
      .values(tags)
      .onConflictDoUpdate({
        target: [tag.name],
        set: onConflictDoUpdateExcept(tag, ['id', 'createdAt', 'name']),
      });
  }

  if (itemToTags.length > 0) {
    console.log(`adding ${itemToTags.length} itemToTags`);
    await db
      .insert(itemToTag)
      .values(itemToTags)
      .onConflictDoUpdate({
        target: [itemToTag.itemKey, itemToTag.tagName],
        set: onConflictDoUpdateExcept(itemToTag),
      });
  }

  await Promise.all(
    Object.entries(lastModifiedVersion).map(async ([externalId, version]) => {
      return db
        .update(group)
        .set({ itemsVersion: Number(version) })
        .where(eq(group.externalId, parseInt(externalId)));
    }),
  );
}

/**
 * Looks up items in the database based on the provided keys.
 * @param keys - The keys to lookup items for.
 * @returns A promise that resolves to an array of items matching the provided keys.
 */
export async function lookupItems(keys: { keys: string[] }): Promise<ItemTableRead[]> {
  const items = await db.query.item.findMany({
    where: inArray(item.key, keys.keys),
  });

  return items;
}

/**
 * Finds empty items from the database for a given group ID.
 * @param group_id - The ID of the group to search for empty items.
 * @returns A promise that resolves to an array of empty items.
 */
export async function FindEmptyItemsFromDatabase(group_id: string): Promise<Item[]> {
  fs.writeFileSync('group_id.json', JSON.stringify(group_id, null, 2));

  return [];
}
