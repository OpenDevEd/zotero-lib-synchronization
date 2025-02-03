CREATE TYPE "public"."creatorType" AS ENUM('artist', 'contributor', 'performer', 'composer', 'wordsBy', 'sponsor', 'cosponsor', 'author', 'editor', 'bookAuthor', 'seriesEditor', 'translator', 'counsel', 'programmer', 'reviewedAuthor', 'recipient', 'cartographer', 'inventor', 'attorneyAgent', 'podcaster', 'guest', 'director', 'castMember', 'producer', 'scriptwriter', 'commenter', 'interviewee', 'interviewer', 'presenter');--> statement-breakpoint
CREATE TYPE "public"."itemType" AS ENUM('Artwork', 'Attachment', 'AudioRecording', 'Bill', 'BlogPost', 'Book', 'BookSection', 'Case', 'ComputerProgram', 'ConferencePaper', 'DictionaryEntry', 'Document', 'Email', 'EncyclopediaArticle', 'Film', 'ForumPost', 'Hearing', 'InstantMessage', 'Interview', 'JournalArticle', 'Letter', 'MagazineArticle', 'Manuscript', 'Map', 'NewspaperArticle', 'Note', 'Patent', 'Podcast', 'Presentation', 'RadioBroadcast', 'Report', 'Statute', 'TvBroadcast', 'Thesis', 'VideoRecording', 'Webpage');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "collection" (
	"id" uuid DEFAULT gen_random_uuid(),
	"key" varchar PRIMARY KEY NOT NULL,
	"version" integer DEFAULT 0,
	"numCollections" integer DEFAULT 0,
	"numItems" integer DEFAULT 0,
	"name" varchar,
	"deleted" integer DEFAULT 0,
	"parentCollection" varchar,
	"groupExternalId" integer,
	"relations" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "group" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"externalId" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"version" integer DEFAULT 0 NOT NULL,
	"type" varchar(255) NOT NULL,
	"description" varchar,
	"url" varchar(255),
	"numItems" integer DEFAULT 0,
	"itemsVersion" integer DEFAULT 0,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "group_externalId_unique" UNIQUE("externalId")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "item" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"itemType" "itemType" DEFAULT 'Artwork' NOT NULL,
	"version" integer DEFAULT 0,
	"key" varchar(255) NOT NULL,
	"title" varchar,
	"abstractNote" varchar,
	"creators" jsonb[],
	"artworkMedium" varchar,
	"artworkSize" varchar,
	"date" varchar,
	"shortTitle" varchar,
	"archive" varchar,
	"archiveLocation" varchar,
	"libraryCatalog" varchar,
	"callNumber" varchar,
	"url" varchar,
	"accessDate" varchar,
	"rights" varchar,
	"extra" varchar,
	"audioRecordingFormat" varchar,
	"seriesTitle" varchar,
	"numberOfVolumes" varchar,
	"volume" varchar,
	"place" varchar,
	"label" varchar,
	"runningTime" varchar,
	"ISBN" varchar,
	"billNumber" varchar,
	"code" varchar,
	"codeVolume" varchar,
	"section" varchar,
	"codePages" varchar,
	"legislativeBody" varchar,
	"session" varchar,
	"history" varchar,
	"blogTitle" varchar,
	"websiteType" varchar,
	"series" varchar,
	"seriesNumber" varchar,
	"edition" varchar,
	"publisher" varchar,
	"numPages" varchar,
	"bookTitle" varchar,
	"pages" varchar,
	"court" varchar,
	"dateDecided" varchar,
	"docketNumber" varchar,
	"reporter" varchar,
	"reporterVolume" varchar,
	"firstPage" varchar,
	"versionNumber" varchar,
	"system" varchar,
	"company" varchar,
	"programmingLanguage" varchar,
	"proceedingsTitle" varchar,
	"conferenceName" varchar,
	"DOI" varchar,
	"dictionaryTitle" varchar,
	"subject" varchar,
	"encyclopediaTitle" varchar,
	"distributor" varchar,
	"genre" varchar,
	"caseName" varchar,
	"videoRecordingFormat" varchar,
	"forumTitle" varchar,
	"postType" varchar,
	"committee" varchar,
	"documentNumber" varchar,
	"interviewMedium" varchar,
	"publicationTitle" varchar,
	"issue" varchar,
	"seriesText" varchar,
	"journalAbbreviation" varchar,
	"ISSN" varchar,
	"letterType" varchar,
	"manuscriptType" varchar,
	"mapType" varchar,
	"scale" varchar,
	"note" varchar,
	"country" varchar,
	"assignee" varchar,
	"issuingAuthority" varchar,
	"patentNumber" varchar,
	"filingDate" varchar,
	"applicationNumber" varchar,
	"priorityNumbers" varchar,
	"issueDate" varchar,
	"references" varchar,
	"legalStatus" varchar,
	"episodeNumber" varchar,
	"audioFileType" varchar,
	"presentationType" varchar,
	"meetingName" varchar,
	"programTitle" varchar,
	"network" varchar,
	"reportNumber" varchar,
	"reportType" varchar,
	"institution" varchar,
	"nameOfAct" varchar,
	"codeNumber" varchar,
	"publicLawNumber" varchar,
	"dateEnacted" varchar,
	"thesisType" varchar,
	"university" varchar,
	"studio" varchar,
	"websiteTitle" varchar,
	"linkMode" varchar,
	"contentType" varchar,
	"filename" varchar,
	"md5" varchar,
	"mtime" varchar,
	"charset" varchar,
	"citation" varchar,
	"dateAdded" timestamp,
	"dateModified" timestamp,
	"fullTextPDF" varchar,
	"PDFCoverPageImage" varchar,
	"PDFCoverPageWidth" integer,
	"PDFCoverPageHeight" integer,
	"deleted" integer DEFAULT 0,
	"languageName" varchar,
	"groupExternalId" integer,
	"parentItem" varchar,
	"tags" varchar[],
	"collections" varchar[],
	"relations" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "item_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "itemToCollection" (
	"itemKey" varchar(255) NOT NULL,
	"collectionKey" varchar(255) NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "itemToCollection_itemKey_collectionKey_pk" PRIMARY KEY("itemKey","collectionKey")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "itemToTag" (
	"itemKey" varchar(255) NOT NULL,
	"tagName" varchar(255) NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "itemToTag_itemKey_tagName_pk" PRIMARY KEY("itemKey","tagName")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "itemToUserCollection" (
	"id" uuid DEFAULT gen_random_uuid(),
	"itemKey" varchar NOT NULL,
	"userCollectionId" uuid NOT NULL,
	"userId" text NOT NULL,
	"deleted" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "itemToUserCollection_itemKey_userCollectionId_userId_pk" PRIMARY KEY("itemKey","userCollectionId","userId"),
	CONSTRAINT "itemToUserCollection_id_unique" UNIQUE("id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "language" (
	"id" uuid DEFAULT gen_random_uuid(),
	"name" varchar PRIMARY KEY NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "status" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"totalRecords" integer,
	"totalItems" integer,
	"databaseUpdatedAt" timestamp,
	"companyName" text,
	"companyLogo" text,
	"companyFooter" json,
	"links" json,
	"externalLinks" json,
	"docsLink" text,
	"style" text,
	"allRISURL" text,
	"allBibTeXURL" text,
	"createdAt" timestamp DEFAULT now(),
	"updatedAt" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tag" (
	"id" uuid DEFAULT gen_random_uuid(),
	"name" varchar PRIMARY KEY NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "account" (
	"userId" text NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"providerAccountId" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text,
	CONSTRAINT "account_provider_providerAccountId_pk" PRIMARY KEY("provider","providerAccountId")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "authenticator" (
	"credentialID" text NOT NULL,
	"userId" text NOT NULL,
	"providerAccountId" text NOT NULL,
	"credentialPublicKey" text NOT NULL,
	"counter" integer NOT NULL,
	"credentialDeviceType" text NOT NULL,
	"credentialBackedUp" boolean NOT NULL,
	"transports" text,
	CONSTRAINT "authenticator_userId_credentialID_pk" PRIMARY KEY("userId","credentialID"),
	CONSTRAINT "authenticator_credentialID_unique" UNIQUE("credentialID")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "session" (
	"sessionToken" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"expires" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"email" text,
	"emailVerified" timestamp,
	"image" text,
	"password" text,
	"description" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "verificationToken" (
	"identifier" text NOT NULL,
	"token" text NOT NULL,
	"expires" timestamp NOT NULL,
	CONSTRAINT "verificationToken_identifier_token_pk" PRIMARY KEY("identifier","token")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "userCollection" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" text NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" varchar(255),
	"private" boolean DEFAULT false,
	"numItems" integer DEFAULT 0,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "userToFollow" (
	"id" uuid DEFAULT gen_random_uuid(),
	"userId" text NOT NULL,
	"followingId" text NOT NULL,
	"deleted" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "userToFollow_userId_followingId_pk" PRIMARY KEY("userId","followingId"),
	CONSTRAINT "userToFollow_id_unique" UNIQUE("id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "userToLikes" (
	"userId" text NOT NULL,
	"itemKey" text NOT NULL,
	"deleted" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "userToLikes_userId_itemKey_pk" PRIMARY KEY("userId","itemKey")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "collection" ADD CONSTRAINT "collection_parentCollection_collection_key_fk" FOREIGN KEY ("parentCollection") REFERENCES "public"."collection"("key") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "collection" ADD CONSTRAINT "collection_groupExternalId_group_externalId_fk" FOREIGN KEY ("groupExternalId") REFERENCES "public"."group"("externalId") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "item" ADD CONSTRAINT "item_languageName_language_name_fk" FOREIGN KEY ("languageName") REFERENCES "public"."language"("name") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "item" ADD CONSTRAINT "item_groupExternalId_group_externalId_fk" FOREIGN KEY ("groupExternalId") REFERENCES "public"."group"("externalId") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "itemToCollection" ADD CONSTRAINT "itemToCollection_itemKey_item_key_fk" FOREIGN KEY ("itemKey") REFERENCES "public"."item"("key") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "itemToCollection" ADD CONSTRAINT "itemToCollection_collectionKey_collection_key_fk" FOREIGN KEY ("collectionKey") REFERENCES "public"."collection"("key") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "itemToTag" ADD CONSTRAINT "itemToTag_itemKey_item_key_fk" FOREIGN KEY ("itemKey") REFERENCES "public"."item"("key") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "itemToTag" ADD CONSTRAINT "itemToTag_tagName_tag_name_fk" FOREIGN KEY ("tagName") REFERENCES "public"."tag"("name") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "itemToUserCollection" ADD CONSTRAINT "itemToUserCollection_itemKey_item_key_fk" FOREIGN KEY ("itemKey") REFERENCES "public"."item"("key") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "itemToUserCollection" ADD CONSTRAINT "itemToUserCollection_userCollectionId_userCollection_id_fk" FOREIGN KEY ("userCollectionId") REFERENCES "public"."userCollection"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "itemToUserCollection" ADD CONSTRAINT "itemToUserCollection_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "account" ADD CONSTRAINT "account_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "authenticator" ADD CONSTRAINT "authenticator_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "session" ADD CONSTRAINT "session_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "userCollection" ADD CONSTRAINT "userCollection_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "userToFollow" ADD CONSTRAINT "userToFollow_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "userToFollow" ADD CONSTRAINT "userToFollow_followingId_user_id_fk" FOREIGN KEY ("followingId") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "userToLikes" ADD CONSTRAINT "userToLikes_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "userToLikes" ADD CONSTRAINT "userToLikes_itemKey_item_key_fk" FOREIGN KEY ("itemKey") REFERENCES "public"."item"("key") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
