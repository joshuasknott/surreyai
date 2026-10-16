import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// London changes between UTC and UTC+1. An hourly sweep covers local midnight
// in both seasons, and catches up after downtime without a browser being open.
crons.cron("archive past AI planner events", "5 * * * *", internal.planner.archivePastEvents, {});

// Refresh after the typical committee handover period. Dashboard editors can
// still run an immediate refresh or make a manual correction at any time.
crons.cron(
  "annual Students' Union committee refresh",
  "0 5 1 9 *",
  internal.committee.refreshOfficersFromUnion
);

export default crons;
