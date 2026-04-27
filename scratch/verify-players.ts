import { query } from "../server/lib/db.js";

async function main() {
  const agencyId = "71d7fa29-e4df-4e55-95cb-b2da2efe276a";
  
  const agencyRes = await query("SELECT COUNT(*) FROM players WHERE agency_id = $1", [agencyId]);
  console.log(`Players count for World Football Agency (${agencyId}):`, agencyRes.rows[0].count);

  const academyRes = await query("SELECT academy_id, COUNT(*) FROM players WHERE academy_id IS NOT NULL GROUP BY academy_id");
  console.log("\nPlayers count by academy_id:");
  console.table(academyRes.rows);

  const leakRes = await query("SELECT COUNT(*) FROM players WHERE agency_id IS NULL AND academy_id IS NULL");
  console.log("\nPlayers with NO agency and NO academy (potential leaks):", leakRes.rows[0].count);
}

main().catch(console.error);
