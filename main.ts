// import { columns } from './src/db/schema/views/columns';
// import { InferSelectModel } from "drizzle-orm";
// import { collection } from './src/db/schema/tables/collection';
// import { item } from './src/db/schema/tables/item';
// import { itemToCollection } from './src/db/schema/tables/itemToCollection';
// import { db } from './src/db'
// import fs from 'fs';



// export type AllFetchedItemsType = Item[][];

// type DBItem = InferSelectModel<typeof item>;
// type DBCollection = InferSelectModel<typeof collection>;
// type DBCollectionRelation = InferSelectModel<typeof itemToCollection>;

// function matchItemType(item: Item) {
//     const itemType = Object.keys(columns).find((itemType) => itemType.toLowerCase() === item.data.itemType.toLowerCase()) as string;
//     if (!itemType)
//         return false;
//     item.data.itemType = itemType;
//     return true;
// }

// function createItem(item: Item) {
//     const obj = {} as DBItem;
//     obj.key = item.key;
//     obj.version = item.version;
//     Object.keys(columns[item.data.itemType]).forEach((column) => {
//         obj[column] = item.data[column];
//     });
//     return obj;
// }

// function createCollection(collection: Item['data']['collections'][number]) {
//     const obj = {} as DBCollection;
//     obj.key = collection;
//     return obj;
// }

// const allFetchedItems: AllFetchedItemsType = JSON.parse(
//     fs.readFileSync('./allFetchedItems.json', 'utf-8')
// );

// async function main() {
//     const items = [] as DBItem[];
//     const collections = [] as DBCollection[];
//     const relations = [] as DBCollectionRelation[];

//     // Debug the data structure
//     console.log('Data type:', typeof allFetchedItems);
//     console.log('Is array:', Array.isArray(allFetchedItems));
//     console.log('First few elements:', JSON.stringify(allFetchedItems?.slice?.(0, 2), null, 2));

//     // Ensure we have valid data before proceeding
//     if (!allFetchedItems || !Array.isArray(allFetchedItems)) {
//         console.error('Invalid data structure in allFetchedItems');
//         return;
//     }

//     for (const chunk of allFetchedItems) {
//         if (!Array.isArray(chunk)) {
//             console.error('Invalid chunk structure:', chunk);
//             continue;
//         }

//         for (const item of chunk) {
//             if (matchItemType(item)) {
//                 items.push(createItem(item));
//                 if (item.data.collections) {
//                     item.data.collections.forEach((collection) => {
//                         const collectionObj = createCollection(collection);
//                         collections.push(collectionObj);
//                     });
//                 } else {
//                     console.log('No collections for item:', item.key);
//                 }
//             }
//         }
//     }

//     await db.insert(itemToCollection).values(relations);

//     fs.writeFileSync('items.json', JSON.stringify(items, null, 2));
//     fs.writeFileSync('collections.json', JSON.stringify(collections, null, 2));
// }

// main();


import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

console.log(process.env.SUPABASE_URL);
console.log(process.env.SUPABASE_SERVICE_ROLE);

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE!);

async function uploadFile(filePath: string) {
    const { data, error } = await supabase.storage.from("sync").upload(filePath, fs.readFileSync(filePath));
    if (error) {
        console.error(error);
    } else {
        console.log(data);
    }
}

uploadFile('./allFetchedItems.json');
