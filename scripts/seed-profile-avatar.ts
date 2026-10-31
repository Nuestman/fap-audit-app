/**
 * One-off: upsert a profile avatar for the local DATABASE_URL user.
 * Usage: npx tsx --env-file=.env.local scripts/seed-profile-avatar.ts [path-to-image]
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { neon } from "@neondatabase/serverless";

const imagePath = resolve(
  process.argv[2] ?? "tmp-profile-test.jpg",
);
const email = process.argv[3] ?? "nusman@agahealthfoundation.org";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required");
  const sql = neon(url);
  const users = await sql`
    SELECT id::text AS id, email FROM neon_auth."user" WHERE email = ${email} LIMIT 1
  `;
  const user = users[0] as { id: string; email: string } | undefined;
  if (!user) throw new Error(`No neon_auth user for ${email}`);

  const data = readFileSync(imagePath);
  const mime = imagePath.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg";

  await sql`
    INSERT INTO user_profile (user_id, avatar_data, avatar_mime_type, updated_at)
    VALUES (${user.id}, ${data}, ${mime}, now())
    ON CONFLICT (user_id) DO UPDATE SET
      avatar_data = EXCLUDED.avatar_data,
      avatar_mime_type = EXCLUDED.avatar_mime_type,
      updated_at = now()
  `;
  await sql`
    UPDATE neon_auth."user"
    SET image = '/api/profile/avatar', "updatedAt" = now()
    WHERE id = ${user.id}::uuid
  `;

  const check = await sql`
    SELECT user_id, avatar_mime_type, length(avatar_data) AS bytes
    FROM user_profile WHERE user_id = ${user.id}
  `;
  console.log("Seeded avatar for", user.email, check[0]);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
