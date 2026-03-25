// Polyfill TextEncoder/TextDecoder for jsdom environment.
// Must run in setupFiles (before env) because Next.js modules reference
// TextEncoder at import time (e.g. next/cache → node-web-streams-helper).
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { TextEncoder, TextDecoder } = require("util");
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;
