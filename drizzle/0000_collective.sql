CREATE TABLE collective_places (
 id TEXT PRIMARY KEY NOT NULL,
 owner_id TEXT NOT NULL,
 author_label TEXT NOT NULL,
 identity_key TEXT NOT NULL UNIQUE,
 data TEXT NOT NULL,
 revision INTEGER NOT NULL DEFAULT 1,
 status TEXT NOT NULL DEFAULT 'published',
 created_at INTEGER NOT NULL,
 updated_at INTEGER NOT NULL
);
--> statement-breakpoint
CREATE INDEX collective_places_updated ON collective_places(status,updated_at);
--> statement-breakpoint
CREATE INDEX collective_places_owner ON collective_places(owner_id,created_at);
--> statement-breakpoint
CREATE TABLE collective_reviews (
 id TEXT PRIMARY KEY NOT NULL,
 place_id TEXT NOT NULL REFERENCES collective_places(id),
 owner_id TEXT NOT NULL,
 author_label TEXT NOT NULL,
 identity_key TEXT NOT NULL UNIQUE,
 data TEXT NOT NULL,
 revision INTEGER NOT NULL DEFAULT 1,
 status TEXT NOT NULL DEFAULT 'published',
 created_at INTEGER NOT NULL,
 updated_at INTEGER NOT NULL
);
--> statement-breakpoint
CREATE INDEX collective_reviews_place ON collective_reviews(place_id,status,created_at);
--> statement-breakpoint
CREATE INDEX collective_reviews_owner ON collective_reviews(owner_id,created_at);
--> statement-breakpoint
CREATE TABLE collective_events (
 seq INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
 place_id TEXT NOT NULL REFERENCES collective_places(id),
 kind TEXT NOT NULL,
 created_at INTEGER NOT NULL
);
