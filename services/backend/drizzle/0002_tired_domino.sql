CREATE TYPE "public"."day_of_week" AS ENUM('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday');--> statement-breakpoint
CREATE TABLE "opening_hours" (
	"day" "day_of_week" PRIMARY KEY NOT NULL,
	"opens_at" text,
	"closes_at" text,
	CONSTRAINT "opening_hours_pair_check" CHECK (("opening_hours"."opens_at" is null) = ("opening_hours"."closes_at" is null)),
	CONSTRAINT "opening_hours_opens_format_check" CHECK ("opening_hours"."opens_at" is null or "opening_hours"."opens_at" ~ '^[0-2][0-9]:[0-5][0-9]$'),
	CONSTRAINT "opening_hours_closes_format_check" CHECK ("opening_hours"."closes_at" is null or "opening_hours"."closes_at" ~ '^[0-2][0-9]:[0-5][0-9]$'),
	CONSTRAINT "opening_hours_order_check" CHECK ("opening_hours"."opens_at" is null or "opening_hours"."opens_at" < "opening_hours"."closes_at")
);
