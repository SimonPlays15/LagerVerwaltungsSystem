CREATE TABLE "customers"
(
    "id"               varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "name"             varchar(100)                                  NOT NULL,
    "cost_centers_ids" jsonb,
    "is_active"        boolean             DEFAULT true              NOT NULL,
    "description"      text,
    "created_at"       timestamp           DEFAULT now(),
    "updated_at"       timestamp           DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "cost_centers"
    ADD COLUMN "customer_id" varchar;--> statement-breakpoint
ALTER TABLE "cost_centers"
    ADD CONSTRAINT "cost_centers_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers" ("id") ON DELETE no action ON UPDATE no action;