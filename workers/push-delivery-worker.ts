import { getAdminClient } from "@/lib/supabase/admin";
import { processPendingNotificationDeliveries } from "@/lib/push/server/processDelivery";

const POLL_INTERVAL_MS = Number.parseInt(process.env.PUSH_WORKER_INTERVAL_MS ?? "5000", 10);
const BATCH_SIZE = Number.parseInt(process.env.PUSH_WORKER_BATCH_SIZE ?? "25", 10);

async function loop() {
  const db = getAdminClient();
  console.log("[push_worker_started]", { interval_ms: POLL_INTERVAL_MS, batch_size: BATCH_SIZE });

  while (true) {
    try {
      const result = await processPendingNotificationDeliveries(db, BATCH_SIZE);
      if (result.claimed > 0) console.log("[push_worker_processed]", result);
    } catch (err) {
      console.error("[push_worker_error]", err instanceof Error ? err.message : String(err));
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
}

void loop();
