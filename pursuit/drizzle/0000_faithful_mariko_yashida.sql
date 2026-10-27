CREATE TABLE `creative_documents` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`payload` text NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `creative_documents_owner_updated_idx` ON `creative_documents` (`owner`,`updated_at`);