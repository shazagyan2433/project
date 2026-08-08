import express, { type Express } from "express";
import cors, { type CorsOptions } from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { mountPublicStatic } from "./lib/public-static";

const app: Express = express();

// CORS — allow specific origins via ALLOWED_ORIGINS env var (comma-separated).
// If not set, all origins are allowed (suitable for open APIs or initial deployment).
const allowedOriginsEnv = process.env["ALLOWED_ORIGINS"];
const corsOptions: CorsOptions = allowedOriginsEnv
  ? {
      origin: allowedOriginsEnv.split(",").map((o) => o.trim()),
      credentials: true,
    }
  : { origin: true, credentials: true };

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors(corsOptions));
app.use(express.json({ limit: "12mb" }));
app.use(express.urlencoded({ extended: true, limit: "12mb" }));

app.use("/api", router);
mountPublicStatic(app);

app.use((err: unknown, _req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err && typeof err === "object" && "type" in err && err.type === "entity.too.large") {
    res.status(413).json({ message: "فایلەکە زۆر گەورەیە. فایلی بچووکتر بەکاربهێنە." });
    return;
  }
  next(err);
});

export default app;
