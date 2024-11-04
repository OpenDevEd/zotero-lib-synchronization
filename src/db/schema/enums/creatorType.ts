import { pgEnum } from "drizzle-orm/pg-core";

export const creatorType = pgEnum("creatorType", [
    'artist',
    'contributor',
    'performer',
    'composer',
    'wordsBy',
    'sponsor',
    'cosponsor',
    'author',
    'editor',
    'bookAuthor',
    'seriesEditor',
    'translator',
    'counsel',
    'programmer',
    'reviewedAuthor',
    'recipient',
    'cartographer',
    'inventor',
    'attorneyAgent',
    'podcaster',
    'guest',
    'director',
    'castMember',
    'producer',
    'scriptwriter',
    'commenter',
    'interviewee',
    'interviewer',
    'presenter'
   ]);

