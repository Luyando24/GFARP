const dotenv = require("dotenv");
const pg = require("pg");

dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local", override: true });

const connectionString =
  process.env.DATABASE_URL ||
  process.env.SUPABASE_DB_URL ||
  process.env.SUPABASE_DATABASE_URL ||
  process.env.POSTGRES_URL;

if (!connectionString) {
  throw new Error("Database URL is not configured");
}

async function main() {
  const parsedConnectionString = new URL(connectionString);
  parsedConnectionString.searchParams.delete("sslmode");
  const client = new pg.Client({
    connectionString: parsedConnectionString.toString(),
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    const tables = await client.query(`
      SELECT table_schema, table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND lower(table_name) = 'players'
      ORDER BY table_name
    `);
    const academies = await client.query(`
      SELECT id, name, code
      FROM academies
      WHERE lower(name) LIKE '%saffa%'
         OR lower(name) = 'lu'
      ORDER BY name
    `);

    const report = [];
    for (const academy of academies.rows) {
      const current = await client.query(
        "SELECT COUNT(*)::int AS count FROM players WHERE academy_id = $1",
        [academy.id],
      );
      const selfRegistered = await client.query(
        "SELECT COUNT(*)::int AS count FROM individual_players WHERE academy_id = $1",
        [academy.id],
      );
      let legacy = null;
      if (tables.rows.some((table) => table.table_name === "Players")) {
        legacy = (
          await client.query(
            'SELECT COUNT(*)::int AS count FROM "Players" WHERE academy_id = $1',
            [academy.id],
          )
        ).rows[0].count;
      }

      report.push({
        id: academy.id,
        name: academy.name,
        code: academy.code,
        current: current.rows[0].count,
        selfRegistered: selfRegistered.rows[0].count,
        legacy,
      });
    }

    const profileColumns = await client.query(`
      SELECT column_name, data_type, udt_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'player_profiles'
        AND column_name IN ('age', 'height', 'weight', 'position', 'preferred_foot')
      ORDER BY column_name
    `);

    const affectedAcademyId = "84f3f26a-2dc2-40f3-bc5f-2d47e20163aa";
    let exactRosterQuery;
    try {
      const result = await client.query(
        `
          SELECT *
          FROM (
            SELECT id, player_card_id, first_name_cipher, last_name_cipher, dob_cipher,
                   position, email_cipher, phone_cipher, jersey_number, height_cm, weight_kg,
                   preferred_foot, created_at, updated_at, false AS is_self_registered
            FROM players
            WHERE academy_id = $1
            UNION ALL
            SELECT ip.id, NULL::text AS player_card_id,
                   ip.first_name::bytea AS first_name_cipher, ip.last_name::bytea AS last_name_cipher,
                   CASE WHEN pp.age IS NULL THEN NULL ELSE ((EXTRACT(YEAR FROM NOW()) - pp.age)::text || '-01-01')::bytea END AS dob_cipher,
                   pp.position, ip.email::bytea AS email_cipher, pp.whatsapp_number::bytea AS phone_cipher,
                   NULL::integer AS jersey_number, pp.height::integer AS height_cm, pp.weight AS weight_kg,
                   pp.preferred_foot, ip.created_at, ip.updated_at, true AS is_self_registered
            FROM individual_players ip
            LEFT JOIN player_profiles pp ON ip.id = pp.player_id
            WHERE ip.academy_id = $1
          ) combined_players
          ORDER BY created_at DESC, id DESC
          LIMIT $2 OFFSET $3
        `,
        [affectedAcademyId, 10, 0],
      );
      exactRosterQuery = { success: true, returned: result.rows.length };
    } catch (error) {
      exactRosterQuery = {
        success: false,
        code: error.code,
        message: error.message,
      };
    }

    console.log(
      JSON.stringify(
        {
          tables: tables.rows,
          academies: report,
          profileColumns: profileColumns.rows,
          exactRosterQuery,
        },
        null,
        2,
      ),
    );
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
