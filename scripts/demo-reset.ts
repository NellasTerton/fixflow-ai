import { demoDatabase } from "./lib/demo-database";
import {
  createDrizzleDemoSeedStore,
  resetDemoSeed,
} from "../src/server/demo/seed";

async function main() {
  const counts = await resetDemoSeed(
    createDrizzleDemoSeedStore(demoDatabase),
  );

  console.log(
    [
      "FixFlow Service demo seed reset:",
      `${counts.services} services`,
      `${counts.customers} customers`,
      `${counts.leads} leads`,
      `${counts.availabilitySlots} availability slots`,
      `${counts.tasks} tasks`,
    ].join(" "),
  );
}

main().catch((error: unknown) => {
  const message =
    error instanceof Error ? error.message : "Unknown demo reset error";
  console.error(`FixFlow Service demo reset failed: ${message}`);
  process.exitCode = 1;
});
