import { HOME_DIR } from "#/util/constants";
import { SQL } from "bun";

export namespace Database {
  export let sql: SQL;

  export async function init(): Promise<void> {
    sql = new SQL({
      adapter: "sqlite",
      filename: `${HOME_DIR}/database.db`,
      strict: true,
    });

    await sql`PRAGMA journal_mode = WAL`;

    await migrate();
  }

  // TODO: Fetch existing migrations from database and only apply new ones.
  async function migrate(): Promise<void> {
    await ensureMigrationTableExists();

    await sql.begin(async (sql) => {
      for (const migration of MIGRATIONS) {
        const { name, query } = migration;
        const timestamp = new Date().toISOString();

        await sql.unsafe(query);
        await sql`
          INSERT INTO ${sql(MIGRATIONS_TABLE)} (name, timestamp) VALUES (${name}, ${timestamp});
        `;
      }
    });
  }

  async function ensureMigrationTableExists(): Promise<void> {
    await sql`
        CREATE TABLE IF NOT EXISTS ${sql(MIGRATIONS_TABLE)} (
          name TEXT PRIMARY KEY,
          timestamp TEXT NOT NULL
        )
     `;
  }
}

const MIGRATIONS_TABLE = "migrations";
const MIGRATIONS = [
  {
    name: "20251217052824_initial",
    query: `
    CREATE TABLE IF NOT EXISTS wallet_address (
      id TEXT PRIMARY KEY,
      url TEXT NOT NULL,
      keyId TEXT NOT NULL,
      privateKey TEXT NOT NULL,
      publicKey TEXT NOT NULL,
      token TEXT NOT NULL,
      manageUrl TEXT NOT NULL,
      continueToken TEXT NOT NULL,
      continueUri TEXT NOT NULL,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS flow (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      steps TEXT NOT NULL
    );`,
  },
];
