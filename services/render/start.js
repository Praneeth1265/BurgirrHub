// Supervisor for the single-container Render deployment.
//
// Under docker-compose each service is its own container, and Compose sets
// PORT/DB_NAME per container. Here all six share one process table and one
// environment, so this script does that per-service injection instead:
// every child gets its own PORT and DB_NAME, and the Gateway additionally
// gets loopback URLs for its five siblings.
//
// This is why the services themselves needed no changes to run on Render.

import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(fileURLToPath(import.meta.url));

// Render injects PORT and routes external traffic to it. The Gateway is the
// only service that should be publicly reachable, so it gets that port; the
// other five stay on fixed loopback ports the Gateway already defaults to.
const GATEWAY_PORT = process.env.PORT || "8080";

// Gateway last: it proxies to the others, so let them bind first. Nothing
// depends on this ordering for correctness (http-proxy-middleware connects
// per-request, not at boot), but it avoids 502s in the first seconds.
const SERVICES = [
  { name: "auth-service", port: "4001", dbVar: "AUTH_DB_NAME", dbDefault: "auth_db" },
  { name: "reservation-service", port: "4002", dbVar: "RESERVATION_DB_NAME", dbDefault: "reservation_db" },
  { name: "order-service", port: "4003", dbVar: "ORDER_DB_NAME", dbDefault: "order_db" },
  { name: "payment-service", port: "4004", dbVar: "PAYMENT_DB_NAME", dbDefault: "payment_db" },
  { name: "notification-service", port: "4005", dbVar: "NOTIFICATION_DB_NAME", dbDefault: "notification_db" },
  { name: "gateway", port: GATEWAY_PORT },
];

const GATEWAY_ENV = {
  AUTH_SERVICE_URL: "http://localhost:4001",
  RESERVATION_SERVICE_URL: "http://localhost:4002",
  ORDER_SERVICE_URL: "http://localhost:4003",
  PAYMENT_SERVICE_URL: "http://localhost:4004",
  NOTIFICATION_SERVICE_URL: "http://localhost:4005",
};

// One Mongo cluster (Atlas free tier) with one logical database per
// service -- the same shape as the single Mongo container in compose.
// mongoose.connect(uri, { dbName }) keeps them separate.
const children = [];
let shuttingDown = false;

function log(name, stream, chunk) {
  for (const line of chunk.toString().split("\n")) {
    if (line.trim()) stream.write(`[${name}] ${line}\n`);
  }
}

function shutdown(code) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) {
    if (!child.killed) child.kill("SIGTERM");
  }
  // Don't hang forever if a child ignores SIGTERM.
  setTimeout(() => process.exit(code), 5000).unref();
}

for (const svc of SERVICES) {
  const env = { ...process.env, PORT: svc.port };

  if (svc.dbVar) {
    env.DB_NAME = process.env[svc.dbVar] || svc.dbDefault;
  }
  if (svc.name === "gateway") {
    Object.assign(env, GATEWAY_ENV);
  }

  const child = spawn("node", ["src/server.js"], {
    cwd: path.join(ROOT, svc.name),
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });

  child.stdout.on("data", (c) => log(svc.name, process.stdout, c));
  child.stderr.on("data", (c) => log(svc.name, process.stderr, c));

  // Any service dying means the deployment is degraded in a way that isn't
  // visible from outside -- the Gateway would keep answering /health while
  // proxying into a void. Take the whole container down instead and let
  // Render restart it, so a crash is loud rather than silent.
  child.on("exit", (code, signal) => {
    if (shuttingDown) return;
    console.error(`[supervisor] ${svc.name} exited (code=${code} signal=${signal}), stopping all`);
    shutdown(code === 0 ? 1 : code ?? 1);
  });

  child.on("error", (err) => {
    console.error(`[supervisor] failed to spawn ${svc.name}:`, err.message);
    shutdown(1);
  });

  children.push(child);
  console.log(`[supervisor] started ${svc.name} on port ${svc.port}`);
}

for (const signal of ["SIGTERM", "SIGINT"]) {
  process.on(signal, () => {
    console.log(`[supervisor] ${signal} received, shutting down`);
    shutdown(0);
  });
}
