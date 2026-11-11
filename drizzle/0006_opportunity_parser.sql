-- A new parser gets one fresh validation even if the previous attempt was recent.
ALTER TABLE opportunity_sources ADD COLUMN parser_version INTEGER NOT NULL DEFAULT 0;
