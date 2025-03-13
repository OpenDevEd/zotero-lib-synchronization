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
import { status as statusTable } from '../db/schema/tables/status';
import { PgTable } from 'drizzle-orm/pg-core';
import { language } from '../db/schema/tables/language';
import { ZoteroTypes } from './../zotero-interface';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import pdf from 'pdf-parse';
import { fromBuffer } from 'pdf2pic'; // requires graphicsmagick and ghostscript
import { mappingTable } from '../utils/formatAsBibTeX';
// import '@citation-js/plugin-bibtex';
// import '@citation-js/plugin-csl';
// import '@citation-js/plugin-ris';

const BATCH_SIZE = 500;
const RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 3000;
const PROCESS_BATCH_SIZE = 20;
const DELETE_BATCH_SIZE = 100;
const STATIC_STATUS_UUID = '00000000-0000-0000-0000-000000000000';

export type GroupTableWrite = InferInsertModel<typeof group>;
export type ItemTableWrite = InferInsertModel<typeof item>;
export type CollectionTableWrite = InferInsertModel<typeof collection>;
export type ItemToCollectionTableWrite = InferInsertModel<typeof itemToCollection>;
export type TagTableWrite = InferInsertModel<typeof tag>;
export type ItemToTagTableWrite = InferInsertModel<typeof itemToTag>;
export type LanguageTableWrite = InferInsertModel<typeof language>;
export type StatusTableWrite = InferInsertModel<typeof statusTable>;

export type GroupTableRead = InferSelectModel<typeof group>;
export type ItemTableRead = InferSelectModel<typeof item>;
export type CollectionTableRead = InferSelectModel<typeof collection>;
export type ItemToCollectionTableRead = InferSelectModel<typeof itemToCollection>;
export type TagTableRead = InferSelectModel<typeof tag>;
export type ItemToTagTableRead = InferSelectModel<typeof itemToTag>;
export type LanguageTableRead = InferSelectModel<typeof language>;
export type StatusTableRead = InferSelectModel<typeof statusTable>;
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

export type ZoteroCollection = {
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
    numCollections: number;
    numItems: number;
  };
  data: {
    key: string;
    version: number;
    name: string;
    parentCollection: string | boolean;
    relations: Record<string, unknown>;
    deleted?: boolean;
  };
};

const itemColumns = Object.values(getTableColumns(item)).map((col: any) => col.name);
const collectionColumns = Object.values(getTableColumns(collection)).map((col: any) => col.name);

/**
 * Retrieves all groups from the database.
 * @returns {Promise<GroupTableRead[]>} A promise that resolves to an array of groups.
 */
export async function getAllGroups(): Promise<GroupTableRead[]> {
  const groups = await db.query.group.findMany();

  // // find the group with the key "2129771" and change its version to 45409
  // const group = groups.find((group) => group.externalId == 2129771);
  // if (group) {
  //   group.itemsVersion = 45408;
  // }

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
async function createItem(item: ZoteroItem, allFetchedItems: ZoteroItem[][]): Promise<ItemTableRead> {
  const obj = {} as ItemTableWrite;
  obj.key = item.key;
  obj.version = item.version;
  obj.groupExternalId = Number(item.library.id);
  itemColumns.forEach((column) => {
    if (column == 'relations') {
      if (item.data.relations && Object.keys(item.data.relations).length > 0) {
        obj.relations = JSON.stringify(item.data.relations);
      }
    } else if (column === 'tags') {
      obj.tags = item.data.tags ? item.data.tags.map((tag) => tag.tag) : [];
    } else if (column === 'dateAdded' || column === 'dateModified') {
      obj[column] = new Date(item.data[column]);
    } else if (column == 'parentItem') {
      if (typeof item.data.parentItem == 'string' && item.data.parentItem.length > 0) {
        obj.parentItem = item.data.parentItem;
      }
    } else if (column in item.data) {
      obj[column] = item.data[column];
    }
  });

  // let bibtex;
  // let bibtexString;
  // let citation;
  // let citationString;

  // if (
  //   !(item.data.itemType == 'Attachment' || item.data.itemType == 'Note' || item.data.deleted || item.data.parentItem)
  // ) {
  //   try {
  //     // create a folder named `{item.key}` in `citationtest`
  //     // fs.mkdirSync(`citationtest/${item.key}`, { recursive: true });

  //     // write the item to a file named `{item.key}.json` in the folder
  //     // fs.writeFileSync(`citationtest/${item.key}/${item.key}.json`, JSON.stringify(item, null, 2));

  //     bibtex = new BibTeXExporter(
  //       {
  //         ...item.data,
  //         attachments: allFetchedItems
  //           .flat()
  //           .filter((i) => i.data.parentItem == item.key)
  //           .map((i) => ({
  //             title: i.data.title,
  //             localPath: i.data.url,
  //             mimeType: i.data.contentType,
  //           })),
  //       },
  //       {
  //         exportFileData: true,
  //         exportNotes: true,
  //       },
  //     );

  //     bibtexString = bibtex.format();

  //     // write the bibtex to a file named `{item.key}.bib` in the folder
  //     // fs.writeFileSync(`citationtest/${item.key}/${item.key}.bib`, bibtexString);

  //     citationString;
  //     try {
  //       citation = await Cite.async(bibtexString);
  //       citationString = citation.format('bibliography', {
  //         format: 'html',
  //         template: 'apa',
  //         lang: 'en-US',
  //       });
  //     } catch (e) {
  //       console.log('Error on ', item.key);
  //       console.log(e);
  //     }
  //     // write the citation to a file named `{item.key}.html` in the folder
  //     // fs.writeFileSync(`citationtest/${item.key}/${item.key}.html`, citationString);

  //     obj.citation = citationString;
  //   } catch (e) {
  //     fs.appendFileSync(
  //       'citationErrors.txt',
  //       `${item.key} - ${e}\n\nbitex: ${bibtexString}\n\ncitation: ${citationString}`,
  //     );
  //   }
  // }

  if (item.data.language && item.data.language.length > 0) obj.languageName = item.data.language;
  return obj as ItemTableRead;
}

/**
 * Creates an update object for handling conflicts during database operations
 * @param {PgTable} pgTable - The table to create update object for
 * @param {string[]} except - Column names to exclude from updates
 * @returns {Object} The update object with SQL expressions
 */
function onConflictDoUpdateExcept(
  pgTable: PgTable = item,
  except: string[] = ['id', 'createdAt'],
): Record<string, any> {
  const columnNames: string[] = Object.values(getTableColumns(pgTable)).map((col) => col.name);

  const obj = {
    ...columnNames.reduce((acc, key) => {
      if (!except.includes(key)) {
        acc[key] = sql.raw(`excluded."${key}"`);
      }
      return acc;
    }, {}),
    ...(except.includes('updatedAt') ? {} : { updatedAt: sql`now()` }),
  };

  return obj;
}

/**
 * Processes language information for an item
 * @param {ZoteroItem} item - The item containing language information
 * @param {LanguageTableWrite[]} languages - Array to store new languages
 */
function processLanguage(item: ZoteroItem, languages: LanguageTableWrite[]) {
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
    await new Promise((resolve) => setTimeout(resolve, delay));
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

  return (
    (await retryOperation(() =>
      zoteroLib.download_attachment({
        key: item.key,
        filename: `temp/${item.key}.pdf`,
        group_id: groupId,
      }),
    )) === null
  );
}

/**
 * Validates if an item meets the criteria for PDF processing
 * @param {ZoteroItem} item - The item to check
 * @returns {boolean} True if item meets all criteria, false otherwise
 */
function itemChecks(item: ZoteroItem, args: ZoteroTypes.ISyncToLocalDBArgs): boolean {
  if (item.data.itemType != 'Attachment') {
    return false;
  }
  if (!item.data.parentItem || item.data.parentItem == '') {
    return false;
  }
  if (!item.data.contentType || item.data.contentType != 'application/pdf') {
    return false;
  }
  if (!item.data.md5) {
    return false;
  }
  if (args.allfiles) {
    return true;
  }
  if (!item.data.tags || !item.data.tags.find((tag) => tag.tag == '_publish' || tag.tag == 'publishPDF')) {
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
  let output = '';

  for (let i = 0; i < input.length; i++) {
    if (mappingTable[input.charAt(i)]) {
      output += mappingTable[input.charAt(i)];
    } else if (input.charCodeAt(i) < 127 && input.charCodeAt(i) >= 1) {
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
async function checkExistingFile(
  item: ZoteroItem,
  dbItem: any,
  itemObj: ItemTableWrite,
  groupId: string,
  supabaseClient: SupabaseClient,
): Promise<boolean> {
  if (!dbItem) return true;

  if (dbItem.md5 == item.data.md5 && dbItem.mtime == item.data.mtime && dbItem.filename == item.data.filename && dbItem.PDFCoverPageImage != null) {
    console.log(`• ERROR [${item.data.parentItem} / ${item.key}] File already exists in database`);
    return false;
  }

  if (dbItem.filename != item.data.filename && dbItem.url) {
    console.log(`• [${item.data.parentItem} / ${item.key}] File name changed, deleting old file`);
    const fileName = dbItem.url.split('/').pop();
    const deleteResult = await retryOperation(() =>
      supabaseClient.storage
        .from(process.env.SUPABASE_STORAGE_BUCKET!)
        .remove([`${groupId}/${item.data.parentItem}/${item.key}/${fileName}`]),
    );
    if (!deleteResult || deleteResult.error) {
      console.log(
        `• ERROR [${item.data.parentItem} / ${item.key}] Failed to delete old file (${JSON.stringify(
          deleteResult,
          null,
          2,
        )})`,
      );
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
async function extractPDFContent(
  PDFData: Buffer,
  itemKey: string,
): Promise<{ text: string; coverData: Buffer; ratio: number }> {
  let ratio: number | undefined = undefined;

  function renderPage(pageData: any) {
    const viewPort = pageData.getViewport(1);
    const pageNumber = pageData.pageNumber;

    const render_options = {
      normalizeWhitespace: false,
      disableCombineTextItems: false,
    };

    if (ratio == undefined && viewPort.width && viewPort.height) {
      ratio = viewPort.width / viewPort.height;
    }

    return pageData
      .getTextContent(render_options)
      .then(function (textContent: { items: Array<{ str: string; transform: number[] }> }) {
        let lastY: number | undefined,
          text = '';
        for (let item of textContent.items) {
          if (lastY == item.transform[5] || !lastY) {
            text += item.str;
          } else {
            text += '\n' + item.str;
          }
          lastY = item.transform[5];
        }
        return `\n\n**|| PAGE ${pageNumber} ||**\n\n` + text;
      });
  }

  const { text } = await pdf(PDFData, {
    pagerender: renderPage,
  }).catch((e) => {
    console.log(`${itemKey} - ${e}`);
    return { text: '' };
  });

  const convert = fromBuffer(PDFData, {
    width: 2550,
    height: 2550 / (ratio || 1),
    density: 330,
  });

  const { base64 } = await convert(1, { responseType: 'base64' });
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
  supabaseClient: SupabaseClient,
): Promise<{ pdfUrl: string; coverUrl: string } | null> {
  const pdfPath = `${groupId}/${item.data.parentItem}/${item.key}/file.pdf`;
  const coverPath = `${groupId}/${item.data.parentItem}/${item.key}/cover.png`;

  const uploadResult = await retryOperation(() =>
    supabaseClient.storage.from(process.env.SUPABASE_STORAGE_BUCKET!).upload(pdfPath, PDFData, {
      upsert: true,
      contentType: 'application/pdf',
    }),
  );

  if (!uploadResult || uploadResult.error) {
    console.log(
      `• ERROR [${item.data.parentItem} / ${item.key}] Failed to upload to Supabase (${JSON.stringify(
        uploadResult,
        null,
        2,
      )})`,
    );
    return null;
  }

  const uploadCoverResult = await retryOperation(() =>
    supabaseClient.storage.from(process.env.SUPABASE_STORAGE_BUCKET!).upload(coverPath, coverData, {
      upsert: true,
      contentType: 'image/png',
    }),
  );

  if (!uploadCoverResult || uploadCoverResult.error) {
    console.log(
      `• ERROR [${item.data.parentItem} / ${item.key}] Failed to upload cover to Supabase (${JSON.stringify(
        uploadCoverResult,
        null,
        2,
      )})`,
    );
    return null;
  }

  const publicUrl = supabaseClient.storage.from(process.env.SUPABASE_STORAGE_BUCKET!).getPublicUrl(pdfPath);
  const publicCoverUrl = supabaseClient.storage.from(process.env.SUPABASE_STORAGE_BUCKET!).getPublicUrl(coverPath);

  return {
    pdfUrl: publicUrl.data.publicUrl,
    coverUrl: publicCoverUrl.data.publicUrl,
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
async function processFile(
  item: ZoteroItem,
  itemObj: ItemTableWrite,
  groupId: string,
  zoteroLib: Zotero,
  items: any[],
  supabaseClient: SupabaseClient,
) {
  const dbItem = items.find((i) => i.key == item.key);

  if (!(await checkExistingFile(item, dbItem, itemObj, groupId, supabaseClient))) {
    return;
  }

  if (!(await downloadFile(item, groupId, zoteroLib))) {
    console.log(`• ERROR [${item.data.parentItem} / ${item.key}] Failed to download file`);
    return;
  }

  const filePath = `temp/${item.key}.pdf`;
  let PDFData: Buffer;
  try {
    PDFData = fs.readFileSync(filePath);
  } catch (e) {
    console.log(`${item.key} - ${e}`);
    return;
  }
  const { text, coverData, ratio } = await extractPDFContent(PDFData, item.key);

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
  itemObj.PDFCoverPageWidth = 2550;
  itemObj.PDFCoverPageHeight = Math.round(2550 / ratio);
}

/**
 * Creates a collection object from a Zotero collection
 * @param {any} collection - The Zotero collection to create from
 * @returns {CollectionTableWrite} The created collection object
 */
function createCollection(collection: any): CollectionTableWrite {
  const obj = {} as CollectionTableWrite;
  obj.key = collection.key;
  obj.version = collection.version;
  obj.groupExternalId = Number(collection.library.id);
  obj.numCollections = collection.meta.numCollections;
  obj.numItems = collection.meta.numItems;
  collectionColumns.forEach((column) => {
    if (column == 'relations') {
      if (collection.relations && Object.keys(collection.relations).length > 0) {
        obj.relations = JSON.stringify(collection.data.relations);
      }
    } else if (column == 'parentCollection') {
      if (typeof collection.data.parentCollection == 'string' && collection.data.parentCollection.length > 0) {
        obj.parentCollection = collection.data.parentCollection;
      }
    } else if (column == 'deleted') {
      obj.deleted = collection.data.deleted ? 1 : 0;
    } else if (column in collection.data) {
      obj[column] = collection.data[column];
    }
  });

  return obj;
}

/**
 * Handles fetching and processing collections from Zotero
 * @param {string} groupId - The group ID to fetch collections for
 * @param {Zotero} zoteroLib - The Zotero library instance
 * @param {Record<string, number>} offlineItemsVersion - The offline items version map
 * @returns {Promise<CollectionTableWrite[]>} A promise that resolves to an array of sorted collections
 */
async function handleCollections(
  groupId: string,
  zoteroLib: Zotero,
  offlineItemsVersion: Record<string, number>,
): Promise<CollectionTableWrite[]> {
  const lastVersion = offlineItemsVersion[groupId] || 0;

  const originalGroupId = zoteroLib.config.group_id;
  zoteroLib.config.group_id = groupId;
  console.log(`lastVersion: ${lastVersion}`);
  const fetchedCollections = await zoteroLib.all(`/collections?since=${lastVersion}&includeTrashed=1`);

  // fs.writeFileSync(`fetchedCollections-${groupId}.json`, JSON.stringify(fetchedCollections, null, 2));

  zoteroLib.config.group_id = originalGroupId;

  const collectionMap = new Map<string, CollectionTableWrite>();

  for (const collection of fetchedCollections) {
    const collectionObj = createCollection(collection);
    collectionMap.set(collectionObj.key, collectionObj);
  }

  function topologicalSort() {
    const sortedCollections: CollectionTableWrite[] = [];
    const visited = new Set<string>();

    function visit(collectionKey: string) {
      if (visited.has(collectionKey)) return;
      visited.add(collectionKey);

      const collection = collectionMap.get(collectionKey);
      if (!collection) {
        console.log(`• ERROR [${collectionKey}] Collection not found`);
        return;
      }

      if (collection.parentCollection) {
        visit(collection.parentCollection);
      }

      sortedCollections.push(collection);
    }

    for (const collectionKey of collectionMap.keys()) {
      visit(collectionKey);
    }

    return sortedCollections;
  }

  const sortedCollections = topologicalSort();

  return sortedCollections;
}

export async function createStatus(supabaseClient: SupabaseClient, groupId: string) {

  const allItems = await db.query.item.findMany();

  // let allRIS = ``;
  // let allBibTeX = ``;

  // const promises: Promise<void>[] = [];
  // const errors: string[] = [];

  let totalRecords = allItems.filter((item) => item.itemType != 'Attachment' && item.itemType != 'Note' && !item.deleted).length;

  // for (const item of allItems) {
  //   promises.push(
  //     new Promise<void>(async (resolve, reject) => {
  //       try {
  //         if (item.itemType == 'Attachment' || item.itemType == 'Note' || item.deleted) return resolve();

  //         const bibtex = new BibTeXExporter(item);
  //         const bibtexText = bibtex.format();
  //         allBibTeX += bibtexText + '\n';

  //         const cite = await Cite.async(bibtexText);
  //         const ris = cite.format('ris');
  //         allRIS += ris + '\n';

  //         totalRecords++;
  //         resolve();
  //       } catch (e: any) {
  //         errors.push(`${item.key} - ${e.message}`);
  //         reject(e);
  //       }
  //     }),
  //   );
  // }

  // await Promise.allSettled(promises);

  // await supabaseClient.storage
  //   .from(process.env.SUPABASE_STORAGE_BUCKET!)
  //   .upload(`${groupId}/allRIS.ris`, Buffer.from(allRIS), {
  //     upsert: true,
  //     contentType: 'application/x-research-info-systems',
  //   });

  // await supabaseClient.storage
  //   .from(process.env.SUPABASE_STORAGE_BUCKET!)
  //   .upload(`${groupId}/allBibTeX.bib`, Buffer.from(allBibTeX), {
  //     upsert: true,
  //     contentType: 'application/x-bibtex',
  //   });

  // const risUrl = supabaseClient.storage.from(process.env.SUPABASE_STORAGE_BUCKET!).getPublicUrl(`${groupId}/allRIS.ris`)
  //   .data.publicUrl;

  // const bibtexUrl = supabaseClient.storage
  //   .from(process.env.SUPABASE_STORAGE_BUCKET!)
  //   .getPublicUrl(`${groupId}/allBibTeX.bib`).data.publicUrl;

  const fieldsToInsert: StatusTableWrite = {
    totalItems: allItems.length,
    totalRecords,
    databaseUpdatedAt: new Date(),
    updatedAt: new Date(),
    // allRISURL: risUrl,
    // allBibTeXURL: bibtexUrl,
  };

  const statusObj = await db
    .insert(statusTable)
    .values({
      id: STATIC_STATUS_UUID,
      ...fieldsToInsert,
    })
    .onConflictDoUpdate({
      target: [statusTable.id],
      set: fieldsToInsert,
    })
    .returning();

  return statusObj;
}

export async function updateLastSyncedAt() {
  await db.update(statusTable).set({ databaseUpdatedAt: new Date() }).where(eq(statusTable.id, STATIC_STATUS_UUID));
}

/**
 * Deletes files from Supabase storage in batches
 * @param {SupabaseClient} supabaseClient - The Supabase client
 * @param {string} groupId - The group ID whose files should be deleted
 * @param {string} bucketName - The storage bucket name
 * @returns {Promise<void>}
 */
async function deleteGroupFiles(supabaseClient: SupabaseClient, groupId: string, bucketName: string): Promise<void> {
  try {
    // List all files in the group folder
    const { data: fileList, error: listError } = await supabaseClient.storage.from(bucketName).list(groupId, {
      limit: 10000, // Adjust this limit if needed
    });

    if (listError) {
      console.error(`Error listing files for group ${groupId}:`, listError);
      return;
    }

    if (!fileList || fileList.length === 0) {
      console.log(`No files found for group ${groupId}`);
      return;
    }

    // Process deletions in batches
    for (let i = 0; i < fileList.length; i += DELETE_BATCH_SIZE) {
      const batch = fileList.slice(i, i + DELETE_BATCH_SIZE);
      const filesToDelete = batch.map((file) => `${groupId}/${file.name}`);

      const { error: deleteError } = await supabaseClient.storage.from(bucketName).remove(filesToDelete);

      if (deleteError) {
        console.error(`Error deleting batch for group ${groupId}:`, deleteError);
      } else {
        console.log(`Deleted ${filesToDelete.length} files for group ${groupId}`);
      }

      // Add a small delay between batches to prevent rate limiting
      if (i + DELETE_BATCH_SIZE < fileList.length) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }
  } catch (error) {
    console.error(`Unexpected error deleting files for group ${groupId}:`, error);
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
  lastModifiedVersion: Record<string, number>,
  groupId: string,
  zoteroLib: Zotero,
  config: ZoteroTypes.ISyncToLocalDBArgs,
  offlineItemsVersion: Record<string, number> | null,
): Promise<void> {
  console.log("all_files is ", config.allfiles);
  const supabaseClient = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE!);

  if (config.clearbucket) {
    await deleteGroupFiles(supabaseClient, groupId, process.env.SUPABASE_STORAGE_BUCKET!);
  }

  const items = [] as ItemTableWrite[];
  const languages = [] as LanguageTableWrite[];
  let collections = [] as CollectionTableWrite[];

  const allItems = await db.query.item.findMany();

  if (offlineItemsVersion) {
    collections = await handleCollections(groupId, zoteroLib, offlineItemsVersion);
  }

  // fs.writeFileSync('lastModifiedVersion.json', JSON.stringify(lastModifiedVersion, null, 2));
  // fs.writeFileSync('allFetchedItems.json', JSON.stringify(allFetchedItems, null, 2));

  let uploadPromises: Promise<void>[] = [];

  for (const chunk of allFetchedItems) {
    if (!Array.isArray(chunk)) {
      console.error('Invalid chunk structure:', chunk);
      continue;
    }
    for (const item of chunk) {
      if (matchItemType(item)) {
        const itemObj = await createItem(item, allFetchedItems);
        items.push(itemObj);

        // console.log(`${items.length} items processed`);

        if (itemChecks(item, config)) {
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

  if (languages.length > 0) await db.insert(language).values(languages).onConflictDoNothing();

  if (items.length > 0) {
    console.log(`Adding ${items.length} items`);
    items.sort((a, b) => (a.parentItem ? 1 : -1) - (b.parentItem ? 1 : -1));

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
    // fs.writeFileSync('collections.json', JSON.stringify(collections, null, 2));
    try {
      await db
        .insert(collection)
        .values(collections)
        .onConflictDoUpdate({
          target: [collection.key],
          set: onConflictDoUpdateExcept(collection),
        });
    } catch (e) {
      console.log(e);
    }
  }

  await createStatus(supabaseClient, groupId);

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
  // fs.writeFileSync('group_id.json', JSON.stringify(group_id, null, 2));

  return [];
}
