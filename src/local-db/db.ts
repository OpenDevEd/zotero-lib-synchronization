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
import { ZoteroTypes } from './../zotero-interface';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import pdf from "pdf-parse";
import { fromBuffer } from "pdf2pic"; // requires graphicsmagick and ghostscript
import { v4 as uuidv4 } from 'uuid';

const BATCH_SIZE = 500;
const RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 3000;
const PROCESS_BATCH_SIZE = 20;

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

type Zotero = any;

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
    md5?: string;
    filename?: string;
    mtime?: number;
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

const itemColumns = Object.values(getTableColumns(item)).map((col: any) => col.name);

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
      obj.tags = item.data.tags.map(tag => tag.tag);
    }
    else if (column === 'dateAdded' || column === 'dateModified') {
      obj[column] = new Date(item.data[column]);
    }
    else if (column in item.data) {
      obj[column] = item.data[column];
    }
  });
  if (item.data.language && item.data.language.length > 0)
    obj.languageName = item.data.language;
  obj.parentItemKey = item.data.parentItem;
  return obj as ItemTableRead;
}

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
 * Retries an asynchronous operation multiple times with a delay between attempts
 * @param {() => Promise<T>} operation - The async operation to retry
 * @param {number} maxAttempts - Maximum number of retry attempts (default: RETRY_ATTEMPTS)
 * @param {number} delay - Delay in milliseconds between attempts (default: RETRY_DELAY)
 * @returns {Promise<T | null>} The operation result or null if all attempts fail
 */
async function retryOperation<T>(
  operation: () => Promise<T>,
  maxAttempts: number = RETRY_ATTEMPTS,
  delay: number = RETRY_DELAY,
): Promise<T | null> {
  let attempts = 0;

  while (attempts < maxAttempts) {
    try {
      return await operation();
    } catch (e) {
      attempts++;
    }
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  return null;
}

/**
 * Downloads a file attachment from Zotero
 * @param {ZoteroItem} item - The Zotero item containing the attachment
 * @param {string} groupId - The group ID the item belongs to
 * @param {Zotero} zoteroLib - The Zotero library instance
 * @returns {Promise<boolean>} True if download successful, false otherwise
 */
async function downloadFile(item: ZoteroItem, groupId: string, zoteroLib: Zotero): Promise<boolean> {
  if (fs.existsSync(`temp/${item.key}.pdf`)) {
    fs.unlinkSync(`temp/${item.key}.pdf`);
  }

  return await retryOperation(() =>
    zoteroLib.download_attachment({
      key: item.key,
      filename: `temp/${item.key}.pdf`,
      group_id: groupId,
    })
  ) === null;
}

/**
 * Validates if an item meets the criteria for PDF processing
 * @param {ZoteroItem} item - The item to check
 * @returns {boolean} True if item meets all criteria, false otherwise
 */
function itemChecks(item: ZoteroItem): boolean {
  if (item.data.itemType != "Attachment") {
    return false;
  }
  if (!item.data.parentItem || item.data.parentItem == "") {
    return false;
  }
  // if (!item.data.tags || !item.data.tags.find((tag) => tag.tag == "_publish")) {
  //   return false;
  // }
  if (!item.data.contentType || item.data.contentType != "application/pdf") {
    return false;
  }
  if (!item.data.md5) {
    return false;
  }

  return true;
}

/**
 * Removes non-ASCII characters from a string
 * @param {string} input - The string to clean
 * @returns {string} The cleaned string containing only ASCII characters
 */
function cleanString(input: string): string {
  let output = "";

  for (let i = 0; i < input.length; i++) {
    if (input.charCodeAt(i) < 127 && input.charCodeAt(i) >= 32) {
      output += input.charAt(i);
    }
  }
  return output;
}

/**
 * Checks if a file needs to be processed based on existing database entry
 * @param {ZoteroItem} item - The Zotero item to check
 * @param {any} dbItem - The existing database item
 * @param {ItemTableWrite} itemObj - The item object to update
 * @param {string} groupId - The group ID
 * @param {SupabaseClient} supabaseClient - The Supabase client instance
 * @returns {Promise<boolean>} True if file needs processing, false otherwise
 */
async function checkExistingFile(item: ZoteroItem, dbItem: any, itemObj: ItemTableWrite, groupId: string, supabaseClient: SupabaseClient): Promise<boolean> {
  if (!dbItem) return true;

  if (dbItem.md5 == item.data.md5 && dbItem.mtime == item.data.mtime && dbItem.filename == item.data.filename) {
    console.log(`• ERROR [${item.data.parentItem} / ${item.key}] File already exists in database`);
    return false;
  }

  if (dbItem.filename != item.data.filename && dbItem.url) {
    console.log(`• [${item.data.parentItem} / ${item.key}] File name changed, deleting old file`);
    const fileName = dbItem.url.split('/').pop();
    const deleteResult = await retryOperation(() =>
      supabaseClient.storage.from(process.env.SUPABASE_STORAGE_BUCKET!).remove([`${groupId}/${item.data.parentItem}/${item.key}/${fileName}`])
    );
    if (!deleteResult || deleteResult.error) {
      console.log(`• ERROR [${item.data.parentItem} / ${item.key}] Failed to delete old file (${JSON.stringify(deleteResult, null, 2)})`);
      return false;
    }
    itemObj.url = null;
    itemObj.fullTextPDF = null;
  }
  return true;
}

/**
 * Extracts text content and generates a cover image from a PDF file
 * @param {Buffer} PDFData - Buffer of the PDF file
 * @returns {Promise<{text: string; coverData: Buffer, ratio: number}>} Extracted text and cover image data
 */
async function extractPDFContent(PDFData: Buffer): Promise<{ text: string; coverData: Buffer; ratio: number }> {
  let ratio: number | undefined = undefined;

  function renderPage(pageData: any) {
    const viewPort = pageData.getViewport(1);

    const render_options = {
      normalizeWhitespace: false,
      disableCombineTextItems: false,
    }

    if (ratio == undefined && viewPort.width && viewPort.height) {
      ratio = viewPort.width / viewPort.height;
    }

    return pageData.getTextContent(render_options)
      .then(function (textContent: { items: Array<{ str: string; transform: number[] }> }) {
        let lastY: number | undefined, text = '';
        for (let item of textContent.items) {
          if (lastY == item.transform[5] || !lastY) {
            text += item.str;
          }
          else {
            text += '\n' + item.str;
          }
          lastY = item.transform[5];
        }
        return text;
      });
  }

  const { text } = await pdf(PDFData, {
    pagerender: renderPage,
  })

  const convert = fromBuffer(PDFData, {
    width: 2550,
    height: 2550 / (ratio || 1),
    density: 330,
  });

  const { base64 } = await convert(1, { responseType: "base64" });
  const coverData = Buffer.from(base64!, 'base64');

  return { text, coverData, ratio: ratio === undefined ? 0 : ratio };
}

/**
 * Uploads PDF and cover image files to Supabase storage
 * @param {ZoteroItem} item - The Zotero item
 * @param {string} groupId - The group ID
 * @param {Buffer} PDFData - The PDF file data
 * @param {Buffer} coverData - The cover image data
 * @param {'update' | 'upload'} action - Whether to update or upload new files
 * @param {SupabaseClient} supabaseClient - The Supabase client instance
 * @returns {Promise<{pdfUrl: string; coverUrl: string} | null>} Public URLs for uploaded files or null if upload fails
 */
async function uploadToSupabase(
  item: ZoteroItem,
  groupId: string,
  PDFData: Buffer,
  coverData: Buffer,
  supabaseClient: SupabaseClient
): Promise<{ pdfUrl: string; coverUrl: string } | null> {
  const randomUUID = uuidv4();
  const pdfPath = `${groupId}/${item.data.parentItem}/${item.key}/${randomUUID}.pdf`;
  const coverPath = `${groupId}/${item.data.parentItem}/${item.key}/cover.png`;

  const uploadResult = await retryOperation(() =>
    supabaseClient.storage.from(process.env.SUPABASE_STORAGE_BUCKET!).upload(pdfPath, PDFData, {
      upsert: true,
      contentType: "application/pdf",
    })
  );

  if (!uploadResult || uploadResult.error) {
    console.log(`• ERROR [${item.data.parentItem} / ${item.key}] Failed to upload to Supabase (${JSON.stringify(uploadResult, null, 2) })`);
    return null;
  }

  const uploadCoverResult = await retryOperation(() =>
    supabaseClient.storage.from(process.env.SUPABASE_STORAGE_BUCKET!).upload(coverPath, coverData, {
      upsert: true,
      contentType: "image/png",
    })
  );

  if (!uploadCoverResult || uploadCoverResult.error) {
    console.log(`• ERROR [${item.data.parentItem} / ${item.key}] Failed to upload cover to Supabase (${JSON.stringify(uploadCoverResult, null, 2)})`);
    return null;
  }

  const publicUrl = supabaseClient.storage.from(process.env.SUPABASE_STORAGE_BUCKET!).getPublicUrl(pdfPath);
  const publicCoverUrl = supabaseClient.storage.from(process.env.SUPABASE_STORAGE_BUCKET!).getPublicUrl(coverPath);

  return {
    pdfUrl: publicUrl.data.publicUrl,
    coverUrl: publicCoverUrl.data.publicUrl
  };
}

/**
 * Processes a PDF file attachment: downloads, extracts content, and uploads to storage
 * @param {ZoteroItem} item - The Zotero item with PDF attachment
 * @param {ItemTableWrite} itemObj - The item object to update with file information
 * @param {string} groupId - The group ID
 * @param {Zotero} zoteroLib - The Zotero library instance
 * @param {any[]} items - Existing database items
 * @param {SupabaseClient} supabaseClient - The Supabase client instance
 */
async function processFile(item: ZoteroItem, itemObj: ItemTableWrite, groupId: string, zoteroLib: Zotero, items: any[], supabaseClient: SupabaseClient) {
  // if (item.key != "C8LXSEUU")
  //   return;

  const dbItem = items.find((i) => i.key == item.key);

  if (!(await checkExistingFile(item, dbItem, itemObj, groupId, supabaseClient))) {
    return;
  }

  if (!(await downloadFile(item, groupId, zoteroLib))) {
    console.log(`• ERROR [${item.data.parentItem} / ${item.key}] Failed to download file`);
    return;
  }

  const filePath = `temp/${item.key}.pdf`;
  const PDFData = fs.readFileSync(filePath);
  const { text, coverData, ratio } = await extractPDFContent(PDFData);
  
  fs.unlinkSync(filePath);
  
  if (ratio == 0) {
    console.log(`• ERROR [${item.data.parentItem} / ${item.key}] Failed to extract image dimensions`);
    return;
  }

  const urls = await uploadToSupabase(item, groupId, PDFData, coverData, supabaseClient);
  if (!urls) return;

  itemObj.url = cleanString(urls.pdfUrl);
  itemObj.fullTextPDF = cleanString(text);
  itemObj.PDFCoverPageImage = cleanString(urls.coverUrl);
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
  zoteroLib: Zotero,
  config: ZoteroTypes.ISyncToLocalDBArgs,
): Promise<void> {
  const supabaseClient = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE!);

  const items = [] as ItemTableWrite[];
  const collections = [] as CollectionTableWrite[];
  const languages = [] as LanguageTableWrite[];
  const tags = [] as TagTableWrite[];

  const itemToCollections = [] as ItemToCollectionTableWrite[];
  const itemToTags = [] as ItemToTagTableWrite[];

  const allItems = await db.query.item.findMany();

  fs.writeFileSync('lastModifiedVersion.json', JSON.stringify(lastModifiedVersion, null, 2));
  fs.writeFileSync('allFetchedItems.json', JSON.stringify(allFetchedItems, null, 2));

  let uploadPromises: Promise<void>[] = [];

  for (const chunk of allFetchedItems) {
    if (!Array.isArray(chunk)) {
      console.error('Invalid chunk structure:', chunk);
      continue;
    }
    for (const item of chunk) {
      if (matchItemType(item)) {
        const itemObj = createItem(item);
        items.push(itemObj);

        if (itemChecks(item)) {
          uploadPromises.push(processFile(item, itemObj, groupId, zoteroLib, allItems, supabaseClient));
        }

        if (uploadPromises.length >= PROCESS_BATCH_SIZE) {
          await Promise.all(uploadPromises);
          uploadPromises = [];
        }

        processLanguage(item, languages);
      }
    }
  }

  await Promise.all(uploadPromises);

  if (languages.length > 0)
    await db
      .insert(language)
      .values(languages)
      .onConflictDoNothing()

  if (items.length > 0) {
    console.log(`Adding ${items.length} items`);
    items.sort((a, b) => (a.parentItemKey ? 1 : -1) - (b.parentItemKey ? 1 : -1));

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
    console.log(`Adding ${collections.length} collections`);
    await db
      .insert(collection)
      .values(collections)
      .onConflictDoUpdate({
        target: [collection.key],
        set: onConflictDoUpdateExcept(collection),
      });
  }

  if (itemToCollections.length > 0) {
    console.log(`Adding ${itemToCollections.length} itemToCollections`);
    await db
      .insert(itemToCollection)
      .values(itemToCollections)
      .onConflictDoUpdate({
        target: [itemToCollection.itemKey, itemToCollection.collectionKey],
        set: onConflictDoUpdateExcept(itemToCollection),
      });
  }

  if (tags.length > 0) {
    console.log(`Adding ${tags.length} tags`);
    await db
      .insert(tag)
      .values(tags)
      .onConflictDoUpdate({
        target: [tag.name],
        set: onConflictDoUpdateExcept(tag, ['id', 'createdAt', 'name']),
      });
  }

  if (itemToTags.length > 0) {
    console.log(`Adding ${itemToTags.length} itemToTags`);
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

  return items as ItemTableRead[];
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
