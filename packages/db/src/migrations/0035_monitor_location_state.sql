CREATE TABLE "monitor_location_state" (
	"monitor_id" text NOT NULL,
	"location" text NOT NULL,
	"status" text NOT NULL,
	"timestamp" timestamp NOT NULL,
	CONSTRAINT "monitor_location_state_monitor_id_location_pk" PRIMARY KEY("monitor_id","location")
);
--> statement-breakpoint
ALTER TABLE "monitor_location_state" ADD CONSTRAINT "monitor_location_state_monitor_id_monitor_id_fk" FOREIGN KEY ("monitor_id") REFERENCES "public"."monitor"("id") ON DELETE cascade ON UPDATE no action;