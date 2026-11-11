CREATE TABLE community_feedback (
 id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, author_label TEXT NOT NULL,
 kind TEXT NOT NULL, title TEXT NOT NULL, context TEXT NOT NULL,
 proposal TEXT NOT NULL, benefit TEXT NOT NULL,
 revision INTEGER NOT NULL DEFAULT 1, status TEXT NOT NULL DEFAULT 'published',
 created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
);
CREATE INDEX community_feedback_recent ON community_feedback(status,updated_at);
