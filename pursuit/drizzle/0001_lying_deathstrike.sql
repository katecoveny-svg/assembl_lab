CREATE TABLE `creative_generation_limits` (
	`owner` text PRIMARY KEY NOT NULL,
	`last_run` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `creative_media` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`name` text NOT NULL,
	`prompt` text NOT NULL,
	`data` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `creative_media_owner_idx` ON `creative_media` (`owner`,`created_at`);