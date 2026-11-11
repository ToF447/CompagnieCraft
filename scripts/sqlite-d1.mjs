// Development/test adapter only. Production uses the D1 binding provisioned by Sites.
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
export function localCollectiveDatabase(filename = ':memory:') {
  const sqlite = new DatabaseSync(filename);
  sqlite.exec('PRAGMA foreign_keys=ON');
  const exists = sqlite
    .prepare("SELECT name FROM sqlite_master WHERE name='collective_places'")
    .get();
  if (!exists)
    sqlite.exec(readFileSync(new URL('../drizzle/0000_collective.sql', import.meta.url), 'utf8'));
  if (!sqlite.prepare("SELECT name FROM sqlite_master WHERE name='user_preferences'").get())
    sqlite.exec(
      readFileSync(new URL('../drizzle/0001_user_preferences.sql', import.meta.url), 'utf8'),
    );
  if (!sqlite.prepare("SELECT name FROM sqlite_master WHERE name='community_feedback'").get())
    sqlite.exec(readFileSync(new URL('../drizzle/0002_feedback.sql', import.meta.url), 'utf8'));
  if (
    !sqlite.prepare("SELECT name FROM sqlite_master WHERE name='user_interface_preferences'").get()
  )
    sqlite.exec(
      readFileSync(new URL('../drizzle/0003_interface_preferences.sql', import.meta.url), 'utf8'),
    );
  if (!sqlite.prepare("SELECT name FROM sqlite_master WHERE name='private_teams'").get())
    sqlite.exec(readFileSync(new URL('../drizzle/0004_private_team.sql', import.meta.url), 'utf8'));
  if (!sqlite.prepare("SELECT name FROM sqlite_master WHERE name='opportunity_sources'").get())
    sqlite.exec(
      readFileSync(new URL('../drizzle/0005_opportunities.sql', import.meta.url), 'utf8'),
    );
  if (
    !sqlite
      .prepare('PRAGMA table_info(opportunity_sources)')
      .all()
      .some((c) => c.name === 'parser_version')
  )
    sqlite.exec(
      readFileSync(new URL('../drizzle/0006_opportunity_parser.sql', import.meta.url), 'utf8'),
    );
  const prepare = (sql, values = []) => ({
    bind(...args) {
      return prepare(sql, args);
    },
    async first() {
      return sqlite.prepare(sql).get(...values) || null;
    },
    async all() {
      return { results: sqlite.prepare(sql).all(...values) };
    },
    async run() {
      const r = sqlite.prepare(sql).run(...values);
      return { meta: { changes: Number(r.changes) } };
    },
  });
  return {
    prepare,
    async batch(statements) {
      sqlite.exec('BEGIN');
      try {
        const result = [];
        for (const statement of statements) result.push(await statement.run());
        sqlite.exec('COMMIT');
        return result;
      } catch (e) {
        sqlite.exec('ROLLBACK');
        throw e;
      }
    },
    close: () => sqlite.close(),
  };
}
