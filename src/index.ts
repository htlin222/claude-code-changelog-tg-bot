import cron from "node-cron";
import { checkAndNotify } from "./changelog.js";

console.log(`[${new Date().toISOString()}] Starting changelog bot...`);

checkAndNotify().catch(console.error);

cron.schedule("0 * * * *", () => {
  checkAndNotify().catch(console.error);
});

console.log(`[${new Date().toISOString()}] Hourly cron job scheduled.`);
