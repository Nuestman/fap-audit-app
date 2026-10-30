import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

const cols = await sql`
  select table_name, column_name
  from information_schema.columns
  where table_name in ('auditor', 'fap_staff', 'app_config')
  order by 1, 2
`;
console.log(cols.map((c) => `${c.table_name}.${c.column_name}`).join("\n"));

const migs = await sql`
  select id, hash, created_at from drizzle.__drizzle_migrations order by created_at
`;
console.log("migrations:", migs.length, migs.map((m) => m.hash).join(", "));
