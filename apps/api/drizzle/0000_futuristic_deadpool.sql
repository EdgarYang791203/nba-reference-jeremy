CREATE TABLE "banlist" (
	"player_id" integer PRIMARY KEY NOT NULL,
	"reason" text,
	"banned_by" text,
	"banned_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "config" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "materials" (
	"id" serial PRIMARY KEY NOT NULL,
	"player_id" integer NOT NULL,
	"date" date NOT NULL,
	"source_url" text NOT NULL,
	"source_name" text,
	"published_at" timestamp,
	"title_zh" text NOT NULL,
	"summary_zh" text NOT NULL,
	"key_quotes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"image_url" text,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"score" integer,
	"status" text DEFAULT 'published' NOT NULL,
	"tokens_in" integer,
	"tokens_out" integer,
	"batch_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "players" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"team" text NOT NULL,
	"birth_date" date NOT NULL,
	"season" integer NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"source" text DEFAULT 'seed' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "run_candidates" (
	"id" serial PRIMARY KEY NOT NULL,
	"run_date" date NOT NULL,
	"player_id" integer NOT NULL,
	"source_url" text NOT NULL,
	"source_name" text,
	"title" text NOT NULL,
	"snippet" text,
	"published_at" timestamp,
	"article_text" text,
	"image_url" text,
	"score" integer,
	"selected" boolean DEFAULT false NOT NULL,
	"custom_id" text,
	"status" text DEFAULT 'candidate' NOT NULL,
	"reject_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "runs" (
	"date" date PRIMARY KEY NOT NULL,
	"status" text NOT NULL,
	"candidate_count" integer,
	"generated_count" integer,
	"batch_id" text,
	"error" text,
	"started_at" timestamp,
	"finished_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "usage_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" date NOT NULL,
	"actor" text NOT NULL,
	"model" text NOT NULL,
	"tokens_in" integer DEFAULT 0 NOT NULL,
	"tokens_out" integer DEFAULT 0 NOT NULL,
	"cache_read" integer DEFAULT 0 NOT NULL,
	"cache_write" integer DEFAULT 0 NOT NULL,
	"cost_usd" real DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "banlist" ADD CONSTRAINT "banlist_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "materials" ADD CONSTRAINT "materials_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "run_candidates" ADD CONSTRAINT "run_candidates_run_date_runs_date_fk" FOREIGN KEY ("run_date") REFERENCES "public"."runs"("date") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "run_candidates" ADD CONSTRAINT "run_candidates_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "materials_player_created_idx" ON "materials" USING btree ("player_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "materials_date_idx" ON "materials" USING btree ("date");--> statement-breakpoint
CREATE UNIQUE INDEX "materials_source_url_idx" ON "materials" USING btree ("source_url");--> statement-breakpoint
CREATE UNIQUE INDEX "players_name_team_idx" ON "players" USING btree ("name","team");--> statement-breakpoint
CREATE INDEX "run_candidates_run_date_idx" ON "run_candidates" USING btree ("run_date");--> statement-breakpoint
CREATE UNIQUE INDEX "run_candidates_custom_id_idx" ON "run_candidates" USING btree ("custom_id");