ALTER TABLE "monitor" ALTER COLUMN "locations" SET DATA TYPE jsonb USING "locations"::jsonb;--> statement-breakpoint
ALTER TABLE "monitor" ALTER COLUMN "worker_ids" SET DATA TYPE jsonb USING "worker_ids"::jsonb;--> statement-breakpoint
CREATE INDEX "monitor_worker_ids_gin_idx" ON "monitor" USING gin ("worker_ids");--> statement-breakpoint
CREATE INDEX "monitor_locations_gin_idx" ON "monitor" USING gin ("locations");