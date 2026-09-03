CREATE TABLE `run_passes` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`event_id` text NOT NULL,
	`runner_name` text NOT NULL,
	`email` text NOT NULL,
	`emergency_contact` text NOT NULL,
	`pace` text NOT NULL,
	`social_preference` text NOT NULL,
	`age_20_plus` integer NOT NULL,
	`transport_mode` text NOT NULL,
	`rules_accepted` integer NOT NULL,
	`privacy_accepted` integer NOT NULL,
	`status` text DEFAULT 'confirmed' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_run_passes_user_created` ON `run_passes` (`user_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `runner_profiles` (
	`user_id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`display_name` text NOT NULL,
	`home_city` text,
	`preferred_pace` text,
	`weekly_goal_km` integer DEFAULT 10 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `saved_run_plans` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`filter_city` text,
	`filter_distance_km` integer,
	`filter_pace` text,
	`filter_social` text,
	`event_ids_json` text NOT NULL,
	`total_distance_km` integer NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_saved_run_plans_user_created` ON `saved_run_plans` (`user_id`,`created_at`);--> statement-breakpoint
PRAGMA optimize;
