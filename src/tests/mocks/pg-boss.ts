// Mock for pg-boss (pure ESM package — incompatible with Jest CJS mode).
// Tests that need pg-boss behaviour should mock @/jobs/queue directly.
// This stub prevents module-resolution errors for test files that import
// @/queries transitively (which re-exports from features/jobs/queries.ts).

class PgBoss {
  constructor() {}
  start() {
    return Promise.resolve(this);
  }
  stop() {
    return Promise.resolve();
  }
  on() {
    return this;
  }
  work() {
    return Promise.resolve("worker-id");
  }
  send() {
    return Promise.resolve("job-id");
  }
  createQueue() {
    return Promise.resolve();
  }
  fetch() {
    return Promise.resolve([]);
  }
  complete() {
    return Promise.resolve({ affected: 0 });
  }
  fail() {
    return Promise.resolve({ affected: 0 });
  }
  retry() {
    return Promise.resolve({ affected: 0 });
  }
  supervise() {
    return Promise.resolve();
  }
  schedule() {
    return Promise.resolve();
  }
  unschedule() {
    return Promise.resolve();
  }
  getJobById() {
    return Promise.resolve(null);
  }
  getQueue() {
    return Promise.resolve(null);
  }
}

module.exports = PgBoss;
module.exports.default = PgBoss;
module.exports.PgBoss = PgBoss;
