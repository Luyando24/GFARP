import { query } from "../server/lib/db.js";

async function main() {
  const res = await query("SELECT id, name, email FROM agencies");
  console.log(JSON.stringify(res.rows, null, 2));
}

main().catch(console.error);
