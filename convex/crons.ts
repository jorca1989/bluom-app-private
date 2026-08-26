import { cronJobs } from 'convex/server';
import { internal } from './_generated/api';

const crons = cronJobs();

// Daily check for expired Pro plans that need regeneration
crons.daily(
  'regenerate-expired-plans',
  { hourUTC: 3, minuteUTC: 0 },
  internal.plans.checkAndRegeneratePlans
);

export default crons;
