CREATE TABLE user_preferences (
 user_id TEXT PRIMARY KEY NOT NULL,
 theme TEXT NOT NULL DEFAULT 'atelier',
 updated_at INTEGER NOT NULL
);
