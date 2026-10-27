import {sqliteTable,text,integer,index} from "drizzle-orm/sqlite-core";
export const creativeDocuments=sqliteTable("creative_documents",{
 id:text("id").primaryKey(),owner:text("owner").notNull(),payload:text("payload").notNull(),revision:integer("revision").notNull().default(1),updatedAt:integer("updated_at").notNull(),
},t=>[index("creative_documents_owner_updated_idx").on(t.owner,t.updatedAt)]);

export const creativeMedia=sqliteTable("creative_media",{id:text("id").primaryKey(),owner:text("owner").notNull(),name:text("name").notNull(),prompt:text("prompt").notNull(),data:text("data").notNull(),createdAt:integer("created_at").notNull()},t=>[index("creative_media_owner_idx").on(t.owner,t.createdAt)]);
export const creativeGenerationLimits=sqliteTable("creative_generation_limits",{owner:text("owner").primaryKey(),lastRun:integer("last_run").notNull()});
