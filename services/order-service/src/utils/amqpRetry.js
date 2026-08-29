// RabbitMQ takes appreciably longer to accept connections than these Node
// services take to boot, so a consumer that connects exactly once at
// startup loses the race on every `docker compose up` and then stays dead
// silently -- the process never exits, so `restart: unless-stopped` never
// rescues it. Publishing already self-heals (see publisher.js, which drops
// its cached channel on failure and reconnects on the next publish); this
// gives consumers the same property.
const INITIAL_DELAY_MS = 2000;
const MAX_DELAY_MS = 30000;

export async function startWithRetry(label, start) {
  let delay = INITIAL_DELAY_MS;

  for (;;) {
    try {
      await start();
      console.log(`${label} started`);
      return;
    } catch (err) {
      console.error(
        `Failed to start ${label}, retrying in ${delay / 1000}s:`,
        err.message
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay = Math.min(delay * 2, MAX_DELAY_MS);
    }
  }
}
