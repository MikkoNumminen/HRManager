// Mock for pg-boss (pure ESM package — incompatible with Jest CJS mode)
// Tests that need pg-boss behaviour should mock it inline; this stub prevents
// module-resolution errors for test files that import @/queries transitively.
class PgBoss {
  constructor() {}
  start() {
    return Promise.resolve(this);
  }
  stop() {
    return Promise.resolve();
  }
  on() {}
  work() {
    return Promise.resolve("worker-id");
  }
  send() {
    return Promise.resolve("job-id");
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
module.exports = { default: PgBoss, PgBoss };
