// Read-only inspection of the database: tables in public schema, RLS flags and policies.
// Usage: node --env-file=.env scripts/db-inspect.mjs
import postgres from "postgres";

const databaseUrl = process.env.SUPABASE_DB_URL;
if (!databaseUrl) {
  console.error("SUPABASE_DB_URL is not set");
  process.exit(1);
}

const sql = postgres(databaseUrl, { prepare: false, max: 1 });

try {
  const tables = await sql`
    select c.relname as table_name, c.relrowsecurity as rls_enabled,
      (select count(*) from pg_policies p where p.schemaname = 'public' and p.tablename = c.relname)::int as policies
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r'
    order by c.relname`;
  console.table(tables);
  const migrations = await sql`
    select to_regclass('supabase_migrations.schema_migrations') is not null as has_migrations_table`;
  console.log("migrations table:", migrations[0].has_migrations_table);
} finally {
  await sql.end();
}
