import { integer, pgTable, varchar, uuid, timestamp, json } from 'drizzle-orm/pg-core';
import { itemType } from '../enums/itemType';
import { creatorType } from '../enums/creatorType';
import { group } from './group';
import { language } from './language';

export type CreatorType = {
  [key in typeof creatorType.enumValues[number]]?: string[];
};

export const item = pgTable('item', {
  id: uuid().primaryKey().defaultRandom(),
  itemType: itemType().notNull().default('Artwork'),
  version: integer('version').default(0),
  key: varchar('key', { length: 255 }).notNull().unique(),
  title: varchar(),
  abstractNote: varchar(),
  artworkMedium: varchar(),
  artworkSize: varchar(),
  date: varchar(),
  shortTitle: varchar(),
  archive: varchar(),
  archiveLocation: varchar(),
  libraryCatalog: varchar(),
  callNumber: varchar(),
  url: varchar(),
  accessDate: varchar(),
  rights: varchar(),
  extra: varchar(),
  audioRecordingFormat: varchar(),
  seriesTitle: varchar(),
  numberOfVolumes: varchar(),
  volume: varchar(),
  place: varchar(),
  label: varchar(),
  runningTime: varchar(),
  ISBN: varchar(),
  billNumber: varchar(),
  code: varchar(),
  codeVolume: varchar(),
  section: varchar(),
  codePages: varchar(),
  legislativeBody: varchar(),
  session: varchar(),
  history: varchar(),
  blogTitle: varchar(),
  websiteType: varchar(),
  series: varchar(),
  seriesNumber: varchar(),
  edition: varchar(),
  publisher: varchar(),
  numPages: varchar(),
  bookTitle: varchar(),
  pages: varchar(),
  court: varchar(),
  dateDecided: varchar(),
  docketNumber: varchar(),
  reporter: varchar(),
  reporterVolume: varchar(),
  firstPage: varchar(),
  versionNumber: varchar(),
  system: varchar(),
  company: varchar(),
  programmingLanguage: varchar(),
  proceedingsTitle: varchar(),
  conferenceName: varchar(),
  DOI: varchar(),
  dictionaryTitle: varchar(),
  subject: varchar(),
  encyclopediaTitle: varchar(),
  distributor: varchar(),
  genre: varchar(),
  caseName: varchar(),
  videoRecordingFormat: varchar(),
  forumTitle: varchar(),
  postType: varchar(),
  committee: varchar(),
  documentNumber: varchar(),
  interviewMedium: varchar(),
  publicationTitle: varchar(),
  issue: varchar(),
  seriesText: varchar(),
  journalAbbreviation: varchar(),
  ISSN: varchar(),
  letterType: varchar(),
  manuscriptType: varchar(),
  mapType: varchar(),
  scale: varchar(),
  note: varchar(),
  country: varchar(),
  assignee: varchar(),
  issuingAuthority: varchar(),
  patentNumber: varchar(),
  filingDate: varchar(),
  applicationNumber: varchar(),
  priorityNumbers: varchar(),
  issueDate: varchar(),
  references: varchar(),
  legalStatus: varchar(),
  episodeNumber: varchar(),
  audioFileType: varchar(),
  presentationType: varchar(),
  meetingName: varchar(),
  programTitle: varchar(),
  network: varchar(),
  reportNumber: varchar(),
  reportType: varchar(),
  institution: varchar(),
  nameOfAct: varchar(),
  codeNumber: varchar(),
  publicLawNumber: varchar(),
  dateEnacted: varchar(),
  thesisType: varchar(),
  university: varchar(),
  studio: varchar(),
  websiteTitle: varchar(),
  linkMode: varchar(),
  contentType: varchar(),
  filename: varchar(),
  md5: varchar(),
  mtime: varchar(),
  charset: varchar(),
  dateAdded: timestamp('dateAdded'),
  dateModified: timestamp('dateModified'),

  fullTextPDF: varchar(),
  PDFCoverPageImage: varchar(),

  deleted: integer('deleted').default(0),

  languageName: varchar('languageName').references(() => language.name),
  groupExternalId: integer('groupExternalId').references(() => group.externalId),
  parentItem: varchar('parentItem').references((): any => item.key),

  tags: varchar().array(),
  collections: varchar().array(),
  
  relations: json(),

  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
});
