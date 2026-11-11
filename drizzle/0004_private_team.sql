CREATE TABLE private_teams (id TEXT PRIMARY KEY,name TEXT NOT NULL,owner_id TEXT NOT NULL,created_at INTEGER NOT NULL);
--> statement-breakpoint
CREATE TABLE private_team_members (id TEXT PRIMARY KEY,team_id TEXT NOT NULL REFERENCES private_teams(id),user_id TEXT NOT NULL,alias TEXT NOT NULL,role TEXT NOT NULL CHECK(role IN ('owner','editor','viewer')),active INTEGER NOT NULL DEFAULT 1,created_at INTEGER NOT NULL,UNIQUE(team_id,user_id));
--> statement-breakpoint
CREATE INDEX private_members_user ON private_team_members(user_id,active);
--> statement-breakpoint
CREATE TABLE private_team_invites (id TEXT PRIMARY KEY,team_id TEXT NOT NULL REFERENCES private_teams(id),token_hash TEXT NOT NULL UNIQUE,role TEXT NOT NULL CHECK(role IN ('editor','viewer')),expires_at INTEGER NOT NULL,used_by TEXT,revoked INTEGER NOT NULL DEFAULT 0,created_at INTEGER NOT NULL);
--> statement-breakpoint
CREATE TABLE private_team_documents (id TEXT PRIMARY KEY,team_id TEXT NOT NULL REFERENCES private_teams(id),title TEXT NOT NULL,author TEXT NOT NULL,source TEXT NOT NULL,content TEXT NOT NULL,revision INTEGER NOT NULL,editor_id TEXT NOT NULL REFERENCES private_team_members(id),editor_name TEXT NOT NULL,updated_at INTEGER NOT NULL,archived INTEGER NOT NULL DEFAULT 0,mutation TEXT NOT NULL);
--> statement-breakpoint
CREATE INDEX private_documents_team ON private_team_documents(team_id,updated_at);
--> statement-breakpoint
CREATE TABLE private_team_versions (document_id TEXT NOT NULL REFERENCES private_team_documents(id),revision INTEGER NOT NULL,title TEXT NOT NULL,author TEXT NOT NULL,source TEXT NOT NULL,content TEXT NOT NULL,editor_name TEXT NOT NULL,updated_at INTEGER NOT NULL,PRIMARY KEY(document_id,revision));
--> statement-breakpoint
CREATE TABLE private_team_availability (id TEXT PRIMARY KEY,team_id TEXT NOT NULL REFERENCES private_teams(id),member_id TEXT NOT NULL REFERENCES private_team_members(id),date_from TEXT NOT NULL,date_to TEXT NOT NULL,period TEXT NOT NULL CHECK(period IN ('day','morning','afternoon','evening')),status TEXT NOT NULL CHECK(status IN ('yes','maybe','no')),note TEXT NOT NULL,revision INTEGER NOT NULL,archived INTEGER NOT NULL DEFAULT 0,updated_at INTEGER NOT NULL);
--> statement-breakpoint
CREATE INDEX private_availability_team ON private_team_availability(team_id,date_from,date_to);
