import { demoDatabase } from "./lib/demo-database";
import {
  applyDemoSeed,
  createDrizzleDemoSeedStore,
} from "../src/server/demo/seed";

async function main() {
  const counts = await applyDemoSeed(
    createDrizzleDemoSeedStore(demoDatabase),
  );

  console.log(
    [
      "FixFlow Service demo seed applied:",
      `${counts.services} services`,
      `${counts.customers} customers`,
      `${counts.leads} leads`,
      `${counts.availabilitySlots} availability slots`,
      `${counts.tasks} tasks`,
    ].join(" "),
  );
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown seed error";
  console.error(`FixFlow Service demo seed failed: ${message}`);
  process.exitCode = 1;
});
