import express from "express";
import cors from "cors";
import helmet from "helmet";
import { config } from "./config.js";
import proxyRouter from "./routes/proxy.js";

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: config.corsOrigin,
    credentials: true,
  })
);

// No express.json() here deliberately — http-proxy-middleware needs the
// raw request stream to forward POST bodies to downstream services, and a
// body parser would consume that stream first and break the proxy.

app.get("/health", (req, res) => res.json({ status: "ok", service: "gateway" }));

app.use("/", proxyRouter);

app.use((req, res) => {
  res.status(404).json({ success: false, message: "Not found" });
});

app.listen(config.port, () => {
  console.log(`API Gateway listening on port ${config.port}`);
});
