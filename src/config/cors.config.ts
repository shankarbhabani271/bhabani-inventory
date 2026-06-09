import { AppType } from "$/server.js";
import cors from "cors";

export const applyCores = ({ app }: { app: AppType }) => {
  const allowedOrigins = [
    "http://localhost:4173",
    "http://localhost:4550",
    "http://localhost:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
    "https://bagforinveo.onrender.com"
  ];

  if (process.env.CLIENT_URL) {
    allowedOrigins.push(process.env.CLIENT_URL);
    // Also push a version without trailing slash if present, for safety
    allowedOrigins.push(process.env.CLIENT_URL.replace(/\/$/, ""));
  }

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);

        if (origin.endsWith(".loca.lt") || origin.endsWith(".lhr.life") || origin.endsWith(".serveousercontent.com") || allowedOrigins.includes(origin)) {
          return callback(null, true);
        }

        return callback(new Error("Not allowed by CORS"));
      },
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    }),
  );

  app.options(/.*/, cors());
};
