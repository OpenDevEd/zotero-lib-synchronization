import { integer, timestamp, uuid, text, json } from "drizzle-orm/pg-core";

import { pgTable } from "drizzle-orm/pg-core";

export type LinkObject = {
	label: string;
	href: string;
	icon?: string;
	dropdown?: LinkObject[];
	navExclude?: boolean;
	footerExclude?: boolean;
};

export type LinksList = Record<string, LinkObject[]>;

export type CompanyFooter = Record<string, string>;

export type ExternalLinks = Record<string, string>;

export const status = pgTable("status", {
	id: uuid("id").primaryKey().defaultRandom(),
    totalRecords: integer("totalRecords"),
    totalItems: integer("totalItems"),
    databaseUpdatedAt: timestamp("databaseUpdatedAt"),
    companyName: text("companyName"),
    companyLogo: text("companyLogo"),
    companyFooter: json("companyFooter").$type<CompanyFooter>(),
    links: json("links").$type<LinksList>(),
    externalLinks: json("externalLinks").$type<ExternalLinks>(),
    docsLink: text("docsLink"),
    style: text("style"),
    allRISURL: text("allRISURL"),
    allBibTeXURL: text("allBibTeXURL"),
    createdAt: timestamp("createdAt").defaultNow(),
	updatedAt: timestamp("updatedAt").defaultNow(),
});
