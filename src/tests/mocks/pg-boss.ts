// Mock pg-boss — it ships ESM which Jest can't parse in CJS mode.
// Tests that need job queue functionality should mock @/jobs/queue directly.
export default class PgBoss {
  constructor() {}
  async start() {}
  async stop() {}
  async send() {
    return "mock-job-id";
  }
  async fetch() {
    return null;
  }
  async complete() {}
  async fail() {}
  async getQueueSize() {
    return 0;
  }
  async deleteQueue() {}
  async createQueue() {}
}
