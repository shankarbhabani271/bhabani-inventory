import cookieParser from "cookie-parser";
import express, { Request, Response as ExpressResponse } from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { accessLoggerMiddleware } from "$/middlewares/accessLogger.middleware.js";
import userDetailsRoutes from "./routes/userdetails.routes.js";

// import RootRouter from "./routes/Routes";
import { createServer } from "node:http";
import productRoutes from "$/routes/product.routes.js";
import vendorRoutes from "./routes/vendor.routes.js";
import { errorHandler, notFoundMiddleware } from "./middlewares/error.middleware.js";
import initializeServer from "$/config/server.config.js";
import { requestContextMiddleware } from "$/middlewares/requestContext.middleware.js";
import responseHandler from "$/middlewares/response.middleware.js";
import { applyCores } from "$/config/cors.config.js";
import connectDB from "./config/db.config.js";
import RootRouter from "$/routes/routes.js";
import materialRoutes from "./routes/material.routes.js"
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import productMenuRoutes from "./routes/productmenu.routes.js";
export const app = express();
//
import authRoutes from "./routes/authRoutes.js";
import employeeRoutes from "./routes/employeeRoutes.js";
import purchaseRequestRoutes from "./routes/purchaseRequest.routes.js";
import inventoryRoutes from "./routes/inventory.routes.js";
import settingsRoutes from "./routes/settings.routes.js";
import auditLogRoutes from "./routes/auditLog.routes.js";
import procurementRoutes from "./routes/procurement.routes.js";
import qcRoutes from "./routes/qc.routes.js";

const publicDir = path.join(process.cwd(), "public");
app.use(express.static(publicDir));
app.use("/uploads", express.static(path.join(process.cwd(), "public/uploads")));
app.use(express.static(path.join(process.cwd(), "../inventry/dist")));
export type AppType = typeof app; export const server = createServer(app);
app.use(responseHandler);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
applyCores({ app });


// db connection
const initialize = () => {
 connectDB();
};
initialize();

initializeServer({ server });

app.get("/", (_: Request, res: ExpressResponse) => {
  res.sendFile(path.join(process.cwd(), "../inventry/dist/index.html"));
});


app.set("trust proxy", true);

app.use(requestContextMiddleware);
app.use(accessLoggerMiddleware);

app.use("/api", RootRouter);

app.use("/api", userDetailsRoutes);
app.use("/api/products", productRoutes);
app.use("/api/material",materialRoutes)
app.use("/api/vendor",vendorRoutes)
app.use("/api/purchase-request", purchaseRequestRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/productmenu", productMenuRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/audit-log", auditLogRoutes);
app.use("/api/procurement", procurementRoutes);
app.use("/api/qc", qcRoutes);



app.use("/api/employees", employeeRoutes);

app.get("*", (req: Request, res: ExpressResponse, next) => {
  if (req.path.startsWith("/api")) {
    return next();
  }
  res.sendFile(path.join(process.cwd(), "../inventry/dist/index.html"));
});

app.use(notFoundMiddleware);

app.use(errorHandler);
