import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Refresh after the typical committee handover period. Dashboard editors can
// still run an immediate refresh or make a manual correction at any time.
crons.cron(
  "annual Students' Union committee refresh",
  "0 5 1 9 *",
  internal.committee.refreshOfficersFromUnion
);

export default crons;
