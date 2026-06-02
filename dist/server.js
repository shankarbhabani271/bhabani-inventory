import { purchaseRequest_model_default } from './chunk-3XMI2BOX.js';
import cookieParser from 'cookie-parser';
import express12, { Router } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import morgan from 'morgan';
import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import fs from 'fs';
import mongoose2, { Schema } from 'mongoose';
import { createServer } from 'http';
import { z, ZodError } from 'zod';
import dotenv from 'dotenv';
import os from 'os';
import { v4 } from 'uuid';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import crypto from 'crypto';

var LOG_DIR = path.resolve(process.cwd(), "logs");
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}
var baseFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);
var logger = winston.createLogger({
  level: process.env.LOG_LEVEL ?? "info",
  format: baseFormat,
  transports: [
    new DailyRotateFile({
      filename: path.join(LOG_DIR, "app-%DATE%.log"),
      datePattern: "YYYY-MM-DD",
      maxSize: "20m",
      maxFiles: "14d",
      zippedArchive: true
    }),
    new DailyRotateFile({
      filename: path.join(LOG_DIR, "error-%DATE%.log"),
      datePattern: "YYYY-MM-DD",
      level: "error",
      maxSize: "20m",
      maxFiles: "30d",
      zippedArchive: true
    })
  ],
  exitOnError: false
});
if (process.env.NODE_ENV !== "production") {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  );
}

// src/middlewares/accessLogger.middleware.ts
var accessLoggerMiddleware = morgan(
  (tokens, req, res) => {
    const payload = {
      requestId: req.requestId,
      method: tokens.method(req, res) ?? "",
      url: tokens.url(req, res) ?? "",
      status: Number(tokens.status(req, res)),
      responseTimeMs: Number(tokens["response-time"](req, res)),
      ip: tokens["remote-addr"](req, res) ?? "",
      userAgent: tokens["user-agent"](req, res)
    };
    return JSON.stringify(payload);
  },
  {
    stream: {
      write: (message) => {
        logger.info(JSON.parse(message));
      }
    }
  }
);
var userDetailsSchema = new mongoose2.Schema(
  {
    name: {
      type: String,
      // fixed typo (tyep → type)
      required: true
    },
    phone: {
      type: String,
      unique: true,
      required: true
    },
    email: {
      type: String,
      unique: true,
      required: true
    },
    company: {
      type: String
    },
    description: {
      type: String
    }
  },
  { timestamps: true }
  // moved outside properly
);
var userdetails_model_default = mongoose2.model("UserDetails", userDetailsSchema);

// src/controllers/userdetails.controller.ts
var createUserDetails = async (req, res) => {
  try {
    const user = new userdetails_model_default(req.body);
    await user.save();
    res.status(201).json({
      message: "Saved successfully"
    });
  } catch (error) {
    console.log(error);
    if (error.code === 11e3) {
      return res.status(400).json({
        message: "Email or phone already exists"
      });
    }
    res.status(500).json({
      message: "Error saving user details"
    });
  }
};
var getUserDetails = async (req, res) => {
  try {
    const users = await userdetails_model_default.find().sort({ createdAt: -1 });
    res.status(200).json(users);
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "Error fetching users"
    });
  }
};

// src/routes/userdetails.routes.ts
var router = express12.Router();
router.post("/userdetails", createUserDetails);
router.get("/userdetails", getUserDetails);
var userdetails_routes_default = router;
var variantSchema = new mongoose2.Schema(
  {
    product: {
      type: mongoose2.Schema.Types.ObjectId,
      ref: "Product",
      required: true
    },
    attributes: {
      type: mongoose2.Schema.Types.Mixed,
      default: {}
    },
    attributesKey: {
      type: String,
      required: true
    },
    sku: {
      type: String,
      required: true,
      unique: true
    },
    price: {
      salePrice: {
        type: Number,
        required: true
      },
      mrp: {
        type: Number,
        required: true
      }
    }
  },
  { timestamps: true }
);
var VariantModel = mongoose2.model("Variant", variantSchema);

// src/controller/product.controller.ts
var createProduct = async (req, res, next) => {
  try {
    const {
      variants = [],
      prodDetails
    } = req.body;
    const product = await ProductModel.create({ ...prodDetails });
    const preparedVariants = variants.map((item) => {
      const sku = `${prodDetails.name.substring(0, 3).toUpperCase()}-${Math.floor(Math.random() * 1e4)}`;
      return {
        ...item,
        sku,
        product: product._id
      };
    });
    await Promise.all(
      preparedVariants.map((variant) => VariantModel.create(variant))
    );
    res.success({
      message: "Product created successfully",
      data: product
    });
  } catch (error) {
    next(error);
  }
};
var getAllProducts = async (_req, res) => {
  try {
    const products = await ProductModel.find().lean();
    const productIds = products.map((p) => p._id);
    const variants = await VariantModel.find({
      product: { $in: productIds }
    }).lean();
    const result = products.map((product) => ({
      product,
      variants: variants.filter((v) => v.product.toString() === product._id.toString())
    }));
    res.success({
      message: "Products retrieved successfully",
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
var getSingleProduct = async (req, res) => {
  try {
    const product = await ProductModel.findById(req.params.id).populate("variants").lean();
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }
    return res.status(200).json({
      success: true,
      message: "Product retrieved successfully",
      data: product
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
var updateProduct = async (req, res) => {
  try {
    const product = await ProductModel.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }
    if (req.body.variants) {
      await VariantModel.deleteMany({ product: req.params.id });
      const newVariants = req.body.variants.map((v) => ({
        ...v,
        product: req.params.id
      }));
      await VariantModel.insertMany(newVariants);
    }
    return res.status(200).json({
      success: true,
      message: "Product updated successfully",
      data: product
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
var deleteProduct = async (req, res) => {
  try {
    const product = await ProductModel.findByIdAndDelete(req.params.id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }
    await VariantModel.deleteMany({ product: req.params.id });
    return res.status(200).json({
      success: true,
      message: "Product deleted successfully"
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// src/middlewares/validate.middleware.ts
var validateRequest = (schemas) => {
  return async (req, _res, next) => {
    try {
      if (schemas.body) {
        await schemas.body.parseAsync(req.body);
      }
      next();
    } catch (error) {
      next(error);
    }
  };
};

// src/middlewares/createzodschema.ts
var CreateZodSchema = ({
  body,
  params,
  query
}) => {
  return {
    body,
    params,
    query
  };
};

// src/validations/product.validation.ts
var createProductSchema = CreateZodSchema(
  {
    body: z.object({
      prodDetails: z.object({
        name: z.string({ message: "Name is required" }).min(3, "Name must be at least 3 characters long").nonempty("Name is required"),
        description: z.string({ message: "Description is required" }).min(30, "Description must be at least 30 characters long").nonempty("Description is required"),
        brand: z.string({ message: "Brand is required" }).min(3, "Brand must be at least 3 characters long").nonempty("Brand is required"),
        category: z.string({ message: "Category is required" }).nonempty("Category is required")
      }),
      variants: z.array(
        z.object({
          attribute: z.string({ message: "Attribute is required" }).nonempty("Attribute is required"),
          attributeKey: z.string({ message: "Attribute Key is required" }).nonempty("Attribute Key is required"),
          price: z.object({
            salePrice: z.number({ message: "Sale Price is required" }).positive("Sale Price must be a positive number"),
            mrp: z.number({ message: "MRP is required" }).positive("MRP must be a positive number")
          })
        })
      )
    })
  }
);

// src/routes/product.routes.ts
var productRoutes = Router();
productRoutes.post("/", validateRequest(createProductSchema), createProduct);
productRoutes.get("/", getAllProducts);
productRoutes.get("/:id", getSingleProduct);
productRoutes.put("/:id", updateProduct);
productRoutes.delete("/:id", deleteProduct);
var product_routes_default = productRoutes;
var uservendorschema = new mongoose2.Schema(
  {
    name: {
      type: String,
      required: true
    },
    phone: {
      type: String,
      required: true
    },
    secondphone: {
      type: String,
      required: true
    },
    email: {
      type: String,
      unique: true,
      required: true
    },
    primaryaddress: {
      type: String,
      required: true
    },
    contactPerson: {
      type: String,
      required: false
    },
    gst: {
      type: String,
      required: false
    },
    productType: {
      type: String,
      required: false
    },
    category: {
      type: String,
      required: false
    },
    status: {
      type: String,
      default: "Active"
    }
  },
  { timestamps: true }
);
var vendor_model_default = mongoose2.model("Vendor", uservendorschema);

// src/controllers/vendor.controllers.ts
var createVendor = async (req, res) => {
  try {
    const { name, phone, secondphone, email, primaryaddress, contactPerson, gst, productType, category, status } = req.body;
    const existingVendor = await vendor_model_default.findOne({ email });
    if (existingVendor) {
      return res.status(400).json({
        success: false,
        message: "Vendor already exists with this email"
      });
    }
    const vendor = await vendor_model_default.create({
      name,
      phone,
      secondphone: secondphone || phone,
      email,
      primaryaddress,
      contactPerson,
      gst,
      productType,
      category,
      status: status || "Active"
    });
    res.status(201).json({
      success: true,
      message: "Vendor created successfully",
      data: vendor
    });
  } catch (error) {
    console.log("CREATE ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Error creating vendor",
      error: error.message
    });
  }
};
var getVendor = async (req, res) => {
  try {
    const vendors = await vendor_model_default.find().sort({ createdAt: -1 });
    res.status(200).json(vendors);
  } catch (error) {
    console.log("GET ERROR:", error);
    res.status(500).json({
      message: "Error fetching vendors"
    });
  }
};
var getVendorById = async (req, res) => {
  try {
    const { id } = req.params;
    const vendor = await vendor_model_default.findById(id);
    if (!vendor) {
      return res.status(404).json({ success: false, message: "Vendor not found." });
    }
    res.status(200).json(vendor);
  } catch (error) {
    console.log("GET BY ID ERROR:", error);
    res.status(500).json({ success: false, message: "Error fetching vendor details." });
  }
};
var updateVendor = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, secondphone, email, primaryaddress, contactPerson, gst, productType, category, status } = req.body;
    const updatedVendor = await vendor_model_default.findByIdAndUpdate(
      id,
      { name, phone, secondphone: secondphone || phone, email, primaryaddress, contactPerson, gst, productType, category, status },
      { new: true }
    );
    if (!updatedVendor) {
      return res.status(404).json({ success: false, message: "Vendor not found." });
    }
    res.status(200).json({
      success: true,
      message: "Vendor updated successfully.",
      data: updatedVendor
    });
  } catch (error) {
    console.log("UPDATE ERROR:", error);
    res.status(500).json({ success: false, message: "Error updating vendor." });
  }
};
var deleteVendor = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedVendor = await vendor_model_default.findByIdAndDelete(id);
    if (!deletedVendor) {
      return res.status(404).json({ success: false, message: "Vendor not found." });
    }
    res.status(200).json({
      success: true,
      message: "Vendor deleted successfully."
    });
  } catch (error) {
    console.log("DELETE ERROR:", error);
    res.status(500).json({ success: false, message: "Error deleting vendor." });
  }
};

// src/routes/vendor.routes.ts
var router2 = express12.Router();
router2.post("/create", createVendor);
router2.get("/get", getVendor);
router2.get("/:id", getVendorById);
router2.put("/:id", updateVendor);
router2.delete("/:id", deleteVendor);
var vendor_routes_default = router2;
dotenv.config();
var envConfig = {
  DB_URI: process.env.DB_URI || "",
  PORT: process.env.PORT || 4500,
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
  SUPER_ADMIN_EMAIL: process.env.SUPER_ADMIN_EMAIL,
  SUPER_ADMIN_PASSWORD: process.env.SUPER_ADMIN_PASSWORD,
  SUPER_ADMIN_PHONE: process.env.SUPER_ADMIN_PHONE,
  RAZOR_KEY_ID: process.env.RAZOR_KEY_ID,
  RAZOR_KEY_SECRET: process.env.RAZOR_KEY_SECRET,
  RAZOR_WEBHOOK_SECRET: process.env.RAZOR_WEBHOOK_SECRET,
  NODE_ENV: process.env.NODE_ENV,
  IS_PROD: process.env.NODE_ENV !== "dev",
  NODE_MAILER_EMAIL: process.env.NODE_MAILER_EMAIL || "",
  NODE_MAILER_PASS: process.env.NODE_MAILER_PASS || "",
  SMTP_HOST: process.env.SMTP_HOST || "",
  SMTP_PORT: Number.parseInt(process.env.SMTP_PORT || "465", 10),
  // AWS
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY || "",
  AWS_REGION: process.env.AWS_REGION,
  AWS_S3_BUCKET: process.env.AWS_S3_BUCKET,
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
  FRONTEND_URL: process.env.FRONTEND_URL || "http://localhost:3000",
  LOG_FILE_VALIDITY: process.env.LOG_FILE_VALIDITY || "1d",
  ENCRYPTION_KEY: process.env.ENCRYPTION_KEY || ""
};
var env_config_default = envConfig;

// src/types/error.ts
var ERROR_TYPES = {
  VALIDATION_ERROR: {
    defaultMessage: "Validation Error",
    statusCode: 400,
    errorType: "ValidationError",
    errorCode: "VALIDATION_ERROR"
  },
  NOT_FOUND_ERROR: {
    defaultMessage: "Resource Not Found",
    statusCode: 404,
    errorType: "NotFoundError",
    errorCode: "NOT_FOUND_ERROR"
  },
  UNAUTHORIZED_ERROR: {
    defaultMessage: "Unauthorized Access",
    statusCode: 401,
    errorType: "UnauthorizedError",
    errorCode: "UNAUTHORIZED_ERROR"
  },
  FORBIDDEN_ERROR: {
    defaultMessage: "Forbidden Access",
    statusCode: 403,
    errorType: "ForbiddenError",
    errorCode: "FORBIDDEN_ERROR"
  },
  INTERNAL_SERVER_ERROR: {
    defaultMessage: "Internal Server Error",
    statusCode: 500,
    errorType: "InternalServerError",
    errorCode: "INTERNAL_SERVER_ERROR"
  },
  RATE_LIMITER_ERROR: {
    defaultMessage: "Too Many Requests",
    statusCode: 429,
    errorType: "RateLimiterError",
    errorCode: "RATE_LIMITER_ERROR"
  },
  CAST_ERROR: {
    defaultMessage: "Invalid resource identifier",
    statusCode: 400,
    errorType: "CastError",
    errorCode: "CAST_ERROR"
  },
  JWT_EXPIRED_ERROR: {
    defaultMessage: "Token has expired. Please log in again.",
    statusCode: 401,
    errorType: "TokenExpiredError",
    errorCode: "JWT_EXPIRED_ERROR"
  },
  JWT_INVALID_ERROR: {
    defaultMessage: "Invalid token. Please log in again.",
    statusCode: 401,
    errorType: "JsonWebTokenError",
    errorCode: "JWT_INVALID_ERROR"
  },
  DUPLICATE_FIELD_ERROR: {
    defaultMessage: "Duplicate field value. Please use another value!",
    statusCode: 400,
    errorType: "DuplicateFieldError",
    errorCode: "DUPLICATE_FIELD_ERROR"
  },
  BAD_REQUEST_ERROR: {
    defaultMessage: "Bad Request",
    statusCode: 400,
    errorType: "BadRequestError",
    errorCode: "BAD_REQUEST_ERROR"
  },
  CORS_ERROR: {
    defaultMessage: "Not allowed by CORS",
    statusCode: 403,
    errorType: "CorsError",
    errorCode: "CORS_ERROR"
  }
};

// src/utils/appError.ts
var AppError = class extends Error {
  statusCode;
  errorType;
  errorCode;
  isOperational;
  data;
  constructor(errorKey, message, data) {
    const { defaultMessage, statusCode, errorType, errorCode } = ERROR_TYPES[errorKey];
    super(message || defaultMessage);
    this.statusCode = statusCode;
    this.errorType = errorType;
    this.errorCode = errorCode;
    this.isOperational = true;
    this.data = data;
  }
};
var ValidationError = class extends AppError {
  validationMessages;
  constructor(validationMessages) {
    const primary = validationMessages[0] ?? "Invalid request data";
    super("VALIDATION_ERROR", primary);
    this.validationMessages = validationMessages;
  }
  toJSON() {
    return {
      success: false,
      error: {
        code: 400,
        message: this.message,
        // primary
        details: this.validationMessages
        // all messages
      }
    };
  }
};
var notFoundMiddleware = (req, res) => {
  logger.warn({
    event: "route_not_found",
    requestId: req.requestId,
    method: req.method,
    url: req.originalUrl
  });
  res.status(404).json({
    success: false,
    message: "Route not found",
    requestId: req.requestId
  });
};
var errorHandler = (err, req, res, _next) => {
  const statusCode = err.statusCode ?? 500;
  const message = err.message;
  logger.error({
    event: "application_error",
    requestId: req.requestId,
    message: err.message,
    stack: err.stack,
    method: req.method,
    url: req.originalUrl
  });
  if (err instanceof ZodError) {
    res.badRequest({
      statusCode: 400,
      message: err.issues[0].message,
      errors: err.issues.map((issue) => ({
        path: issue.path.join("."),
        // ex: "email", "user.address.zip"
        message: issue.message
      }))
    });
    return;
  }
  if (err instanceof ValidationError) {
    res.badRequest({
      statusCode: 400,
      message
    });
    return;
  }
  res.status(statusCode).json({
    success: false,
    message: env_config_default.NODE_ENV === "production" ? "Internal Server Error" : err.message,
    errorCode: err.errorCode ?? "UNKNOWN_ERROR",
    requestId: req.requestId
  });
};
var getLocalIP = () => {
  const interfaces = os.networkInterfaces();
  for (const name in interfaces) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === "IPv4" && !iface.internal) {
        return iface.address;
      }
    }
  }
  return "localhost";
};
var initializeServer = ({ server: server2 }) => {
  server2.listen(env_config_default.PORT, () => {
    console.log(`\u2192 Localhost: http://localhost:${env_config_default.PORT}/`);
    try {
      const localIP = getLocalIP();
      console.log(`\u2192 Local IP : http://${localIP}:${env_config_default.PORT}/`);
    } catch (error) {
      console.log(error);
    }
  }).on("error", (err) => {
    console.log(err);
    process.exit(1);
  });
  process.on("SIGTERM", () => {
    server2.close(() => {
      console.log("HTTP server closed.");
      process.exit(0);
    });
  });
  process.on("SIGINT", () => {
    server2.close(() => {
      console.log("the server stopped with (Ctrl+C).");
      process.exit(0);
    });
  });
};
var server_config_default = initializeServer;
var requestContextMiddleware = (req, res, next) => {
  const requestId = req.header("x-request-id") ?? v4();
  req.requestId = requestId;
  res.setHeader("x-request-id", requestId);
  next();
};

// src/middlewares/response.middleware.ts
var successResponse = (res, {
  data = {},
  message = "Operation Successful",
  statusCode = 200
}) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data
  });
};
var createdResponse = (res, {
  data = {},
  message = "Resource Created Successfully",
  statusCode = 201
}) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data
  });
};
var badRequest = (res, params) => {
  const { message = "Bad Request", statusCode = 400, errors } = params;
  return res.status(statusCode).json({
    success: false,
    message,
    errors
  });
};
var unauthorized = (res, { message = "Unauthorized" }) => {
  return res.status(401).json({
    success: false,
    message
  });
};
var forbidden = (res, { message = "Forbidden" }) => {
  return res.status(403).json({
    message
  });
};
var responseHandler = (_req, res, next) => {
  res.success = ({ data = {}, message = "Operation Successful", statusCode }) => successResponse(res, { data, message, statusCode });
  res.created = ({ data = {}, message = "Resource Created Successfully" }) => createdResponse(res, { data, message });
  res.unauthorized = ({ message = "Unauthorized" }) => unauthorized(res, { message});
  res.forbidden = ({ message = "Forbidden" }) => forbidden(res, { message});
  res.badRequest = ({ message = "Bad Request", statusCode = 400, errors }) => badRequest(res, { message, statusCode, errors });
  next();
};
var response_middleware_default = responseHandler;
var applyCores = ({ app: app2 }) => {
  const allowedOrigins = [
    "http://localhost:4173",
    "http://localhost:4550",
    "http://localhost:5173",
    "http://localhost:5174",
    "https://bagforinveo.onrender.com"
  ];
  if (process.env.CLIENT_URL) {
    allowedOrigins.push(process.env.CLIENT_URL);
    allowedOrigins.push(process.env.CLIENT_URL.replace(/\/$/, ""));
  }
  app2.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) {
          return callback(null, true);
        }
        return callback(new Error("Not allowed by CORS"));
      },
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"]
    })
  );
  app2.options(/.*/, cors());
};
var connectDB = async () => {
  if (mongoose2.connection.readyState === 1) {
    console.info("MongoDB is already connected.");
    return;
  }
  try {
    await mongoose2.connect(env_config_default.DB_URI);
    console.log("Connected to MongoDB");
    console.info("Connected to MongoDB");
    mongoose2.connection.on("disconnected", () => {
      console.log("Lost MongoDB connection");
      console.warn("Lost MongoDB connection");
    });
    mongoose2.connection.on("reconnected", () => {
      console.log("Reconnected to MongoDB");
      console.info("Reconnected to MongoDB");
    });
  } catch (error) {
    console.error("MongoDB connection error:", error.message);
    console.log(env_config_default.DB_URI, "iiiii");
    process.exit(1);
  }
};
var db_config_default = connectDB;
var userSchema = new mongoose2.Schema({
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true,
    default: "admin@123"
  },
  role: {
    type: String,
    enum: ["admin", "employee"],
    default: "employee"
  }
});
var User_default = mongoose2.model("User", userSchema);
var employeeSchema = new mongoose2.Schema(
  {
    employeeId: {
      type: String,
      unique: true,
      required: true
    },
    name: {
      type: String,
      required: true
    },
    mobile: {
      type: String,
      required: true
    },
    blood: {
      type: String,
      required: true
    },
    email: {
      type: String,
      required: true,
      unique: true
    },
    department: {
      type: String,
      required: true
    },
    role: {
      type: String,
      required: true
    },
    password: {
      type: String,
      required: true
    },
    isVerified: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);
var employee_model_default = mongoose2.model("Employee", employeeSchema);
var loginController = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required"
      });
    }
    let user = await User_default.findOne({ email });
    let role = "";
    let name = "";
    let hashedPassword = "";
    let userId = "";
    let department = "";
    if (user && user.role === "admin") {
      role = "admin";
      name = "Admin User";
      hashedPassword = user.password;
      userId = user._id.toString();
      department = "Administration";
    } else {
      const employee = await employee_model_default.findOne({ email });
      if (employee) {
        if (!employee.isVerified) {
          return res.status(400).json({
            message: "Employee account is not activated. Please set your password first."
          });
        }
        role = employee.role || "employee";
        name = employee.name || "Employee";
        hashedPassword = employee.password;
        userId = employee._id.toString();
        department = employee.department || "Operations";
      } else if (user) {
        role = user.role || "employee";
        name = "User";
        hashedPassword = user.password;
        userId = user._id.toString();
        department = "Operations";
      } else {
        return res.status(400).json({
          message: "User not found"
        });
      }
    }
    const isMatch = await bcrypt.compare(password, hashedPassword);
    if (!isMatch) {
      return res.status(400).json({
        message: "Invalid login credentials"
      });
    }
    const token = jwt.sign(
      {
        id: userId,
        role
      },
      process.env.JWT_SECRET || "mySuperSecretKey123",
      {
        expiresIn: "1d"
      }
    );
    res.status(200).json({
      message: "Login Success",
      token,
      user: {
        name,
        email,
        role,
        department
      }
    });
  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};

// src/routes/auth.route.ts
var authRouter = Router();
authRouter.post("/login", loginController);
var auth_route_default = authRouter;
var RootRouter = Router();
RootRouter.use("/auth", auth_route_default);
RootRouter.use("/product", product_routes_default);
var routes_default = RootRouter;
var materialSchema = new mongoose2.Schema(
  {
    referenceId: {
      type: String,
      required: true,
      trim: true
    },
    date: {
      type: String,
      required: true
    },
    requester: {
      type: String,
      required: true,
      trim: true
    },
    department: {
      type: String,
      required: true
    },
    productDetails: {
      type: String,
      required: true
    },
    quantity: {
      type: Number,
      required: true
    },
    priority: {
      type: String,
      enum: ["Low", "Medium", "High", "Urgent"],
      default: "Low"
    },
    // ✅ FULL PROCUREMENT LIFECYCLE STATUS ENUM
    status: {
      type: String,
      enum: [
        "Pending",
        "Approved",
        "Ready For Issue",
        "Rejected",
        "Completed",
        "Procurement Required",
        "RFQ Created",
        "Quotations Received",
        "Vendor Selected",
        "PO Created",
        "PO Approved",
        "GRN Created",
        "Inventory Updated",
        "Stock Issued",
        "Procurement Completed"
      ],
      default: "Pending"
    },
    // ✅ Procurement Reference Links
    linkedPrId: { type: String, default: "" },
    linkedRfqId: { type: String, default: "" },
    linkedPoId: { type: String, default: "" },
    linkedGrnId: { type: String, default: "" },
    issuedQty: { type: Number, default: 0 },
    stockAvailableAtApproval: { type: Number, default: 0 }
  },
  { timestamps: true }
);
var material_model_default = mongoose2.model("Material", materialSchema);

// src/controllers/material.controller.ts
var createMaterial = async (req, res) => {
  try {
    const {
      referenceId,
      date,
      requester,
      department,
      productDetails,
      quantity,
      priority
    } = req.body;
    if (!referenceId || !date || !requester || !department || !productDetails || !quantity) {
      return res.status(400).json({
        success: false,
        message: "All required fields must be filled"
      });
    }
    const qty = Number(quantity);
    if (isNaN(qty) || qty <= 0) {
      return res.status(400).json({
        success: false,
        message: "Quantity must be a valid number"
      });
    }
    const existing = await material_model_default.findOne({ referenceId });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Reference ID already exists"
      });
    }
    const material = new material_model_default({
      referenceId,
      date,
      requester,
      department,
      productDetails,
      quantity: qty,
      priority: priority || "Medium",
      status: "Pending"
    });
    const saved = await material.save();
    return res.status(201).json({
      success: true,
      message: "Material created successfully",
      data: saved
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
var getMaterials = async (req, res) => {
  try {
    const { status, search } = req.query;
    let filter = {};
    if (status) {
      filter.status = status;
    }
    if (search) {
      filter.$or = [
        { referenceId: { $regex: search, $options: "i" } },
        { requester: { $regex: search, $options: "i" } }
      ];
    }
    const materials = await material_model_default.find(filter).sort({ createdAt: -1 });
    return res.status(200).json({
      success: true,
      count: materials.length,
      data: materials
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
var approveMaterial = async (req, res) => {
  try {
    const updated = await material_model_default.findByIdAndUpdate(
      req.params.id,
      { status: "Approved" },
      { new: true }
    );
    if (!updated) {
      return res.status(404).json({ success: false, message: "Material not found" });
    }
    res.status(200).json({ success: true, message: "Material Approved", data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
var rejectMaterial = async (req, res) => {
  try {
    const updated = await material_model_default.findByIdAndUpdate(
      req.params.id,
      { status: "Rejected" },
      { new: true }
    );
    if (!updated) {
      return res.status(404).json({ success: false, message: "Material not found" });
    }
    res.status(200).json({ success: true, message: "Material Rejected", data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
var completeMaterial = async (req, res) => {
  try {
    const updated = await material_model_default.findByIdAndUpdate(
      req.params.id,
      { status: "Completed" },
      { new: true }
    );
    if (!updated) {
      return res.status(404).json({ success: false, message: "Material not found" });
    }
    res.status(200).json({ success: true, message: "Material marked as Completed", data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
var procurementRequired = async (req, res) => {
  try {
    const updated = await material_model_default.findByIdAndUpdate(
      req.params.id,
      { status: "Procurement Required" },
      { new: true }
    );
    if (!updated) {
      return res.status(404).json({ success: false, message: "Material not found" });
    }
    res.status(200).json({
      success: true,
      message: "Status updated to Procurement Required",
      data: updated
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
var poCreated = async (req, res) => {
  try {
    const updated = await material_model_default.findByIdAndUpdate(
      req.params.id,
      { status: "PO Created" },
      { new: true }
    );
    if (!updated) {
      return res.status(404).json({ success: false, message: "Material not found" });
    }
    res.status(200).json({
      success: true,
      message: "Status updated to PO Created",
      data: updated
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
var updateStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const updated = await material_model_default.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    if (!updated) {
      return res.status(404).json({ success: false, message: "Material not found" });
    }
    res.status(200).json({
      success: true,
      message: `Status updated to ${status}`,
      data: updated
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
var deleteMaterial = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await material_model_default.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: "Material request not found" });
    }
    try {
      const PurchaseRequest = (await import('./purchaseRequest.model-X7GWMKTQ.js')).default;
      await PurchaseRequest.deleteMany({ materialRequestId: id });
    } catch (prErr) {
      console.warn("Failed to delete associated purchase requests:", prErr.message);
    }
    res.status(200).json({ success: true, message: "Material request and associated procurement records permanently deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// src/routes/material.routes.ts
var router3 = express12.Router();
router3.post("/", createMaterial);
router3.get("/", getMaterials);
router3.put("/:id/approve", approveMaterial);
router3.put("/:id/reject", rejectMaterial);
router3.put("/:id/complete", completeMaterial);
router3.put("/:id/procurement-required", procurementRequired);
router3.put("/:id/po-created", poCreated);
router3.put("/:id/status", updateStatus);
router3.delete("/:id", deleteMaterial);
var material_routes_default = router3;
var productMenuSchema = new Schema(
  {
    name: { type: String, required: true },
    optionalName: { type: String },
    details: { type: String, required: true },
    category: { type: String, required: true },
    unit: { type: String, required: true },
    stock: {
      type: Number,
      default: 0
    },
    price: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    sizes: [{ type: String }],
    colors: [{ type: String }],
    image: { type: String },
    description: { type: String }
  },
  { timestamps: true }
);
var ProductMenu = mongoose2.model(
  "ProductMenu",
  productMenuSchema
);

// src/controller/productmenu.controller.ts
var createProductMenu = async (req, res) => {
  try {
    const product = await ProductMenu.create(req.body);
    res.status(201).json(product);
  } catch (err) {
    res.status(500).json({ message: "Create failed", error: err });
  }
};
var getAllProductMenu = async (req, res) => {
  try {
    const products = await ProductMenu.find();
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: "Fetch failed" });
  }
};
var getSingleProductMenu = async (req, res) => {
  try {
    const product = await ProductMenu.findById(req.params.id);
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: "Fetch failed" });
  }
};
var updateProductMenu = async (req, res) => {
  try {
    const product = await ProductMenu.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: "Update failed" });
  }
};
var deleteProductMenu = async (req, res) => {
  try {
    await ProductMenu.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Delete failed" });
  }
};

// src/routes/productmenu.routes.ts
var router4 = Router();
router4.post("/", createProductMenu);
router4.get("/", getAllProductMenu);
router4.get("/:id", getSingleProductMenu);
router4.put("/:id", updateProductMenu);
router4.delete("/:id", deleteProductMenu);
var productmenu_routes_default = router4;
var router5 = express12.Router();
router5.post("/login", loginController);
var authRoutes_default = router5;
dotenv.config();
var sendOtpEmail = async (email, otp) => {
  try {
    const transporter2 = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.NODE_MAILER_EMAIL,
        pass: process.env.NODE_MAILER_PASS
      }
    });
    const mailOptions = {
      from: process.env.NODE_MAILER_EMAIL,
      to: email,
      subject: "Employee Verification OTP",
      text: `Your OTP is: ${otp}`
    };
    const info = await transporter2.sendMail(mailOptions);
    console.log("OTP Email Sent Successfully");
    console.log(info.response);
  } catch (error) {
    console.log("Email Error:", error);
  }
};
var sendOtp_default = sendOtpEmail;
var createEmployee = async (req, res) => {
  try {
    const {
      employeeId,
      name,
      mobile,
      blood,
      email,
      department,
      role
    } = req.body;
    const existingEmployee = await employee_model_default.findOne({ email });
    if (existingEmployee) {
      return res.status(400).json({
        success: false,
        message: "Employee already exists"
      });
    }
    const otp = String(
      Math.floor(1e5 + Math.random() * 9e5)
    );
    const hashedPassword = await bcrypt.hash("admin@123", 12);
    const newEmployee = new employee_model_default({
      employeeId,
      name,
      mobile,
      blood,
      email,
      department,
      role,
      otp,
      password: hashedPassword,
      // hashed password
      isVerified: false
    });
    await newEmployee.save();
    await sendOtp_default(email, otp);
    res.status(201).json({
      success: true,
      message: "Employee created successfully",
      employee: newEmployee
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// src/controllers/verifyOtp.controller.ts
var verifyEmployeeOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    console.log("User entered OTP:", otp);
    const employee = await employee_model_default.findOne({ email });
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found"
      });
    }
    console.log("Database OTP:", employee.otp);
    if (employee.otp != otp) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP"
      });
    }
    employee.isVerified = true;
    employee.otp = null;
    await employee.save();
    res.status(200).json({
      success: true,
      message: "OTP verified successfully"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
var invitationSchema = new mongoose2.Schema({
  email: {
    type: String,
    required: true
  },
  token: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  department: {
    type: String,
    required: true
  },
  role: {
    type: String,
    required: true
  },
  expiresAt: {
    type: Date,
    required: true
  }
}, {
  timestamps: true
});
var invitation_model_default = mongoose2.model("Invitation", invitationSchema);
dotenv.config();
var getMailerPass = () => {
  const pass = process.env.NODE_MAILER_PASS || process.env.EMAIL_PASS || "";
  return pass.replace(/^["']|["']$/g, "");
};
var mailerEmail = process.env.NODE_MAILER_EMAIL || process.env.EMAIL_USER || "test@example.com";
var transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: mailerEmail,
    pass: getMailerPass() || "password"
  }
});
var sendInvite = async (req, res) => {
  try {
    const { email, department, role } = req.body;
    if (!email || !department || !role) {
      return res.status(400).json({ success: false, message: "Email, department, and role are required." });
    }
    const existingEmployee = await employee_model_default.findOne({ email });
    if (existingEmployee) {
      return res.status(400).json({ success: false, message: "Employee already exists with this email." });
    }
    const existingUser = await User_default.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: "Admin User already exists with this email." });
    }
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1e3);
    await invitation_model_default.findOneAndDelete({ email });
    const newInvitation = new invitation_model_default({
      email,
      token,
      department,
      role,
      expiresAt
    });
    await newInvitation.save();
    const frontendUrl = process.env.CLIENT_URL || process.env.FRONTEND_URL || "http://localhost:5173";
    const inviteLink = `${frontendUrl}/set-password/${token}`;
    const mailOptions = {
      from: mailerEmail,
      to: email,
      subject: "Complete Your Account Setup",
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 32px; border: 1px solid #e2e8f0; border-radius: 20px; background-color: #ffffff; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
          <div style="text-align: center; margin-bottom: 24px;">
            <div style="width: 48px; height: 48px; line-height: 48px; background-color: #ecfdf5; color: #10b981; border-radius: 12px; display: inline-block; font-size: 24px; font-weight: bold; margin-bottom: 12px;">\u2713</div>
          </div>
          <h2 style="color: #0f172a; font-size: 22px; font-weight: 700; text-align: center; margin: 0 0 12px 0;">Welcome to Our Company</h2>
          <p style="color: #475569; font-size: 15px; line-height: 1.6; text-align: center; margin: 0 0 24px 0;">
            Your employee account has been created successfully.
          </p>
          <p style="color: #475569; font-size: 15px; line-height: 1.6; text-align: center; margin: 0 0 32px 0;">
            Please click the button below to set your password and activate your account.
          </p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${inviteLink}" style="background-color: #10b981; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 15px; display: inline-block; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25); transition: all 0.2s ease-in-out;">
              Set Password
            </a>
          </div>
          <p style="color: #94a3b8; font-size: 13px; text-align: center; margin: 32px 0 16px 0; border-top: 1px solid #f1f5f9; padding-top: 24px;">
            This link will expire in 24 hours.
          </p>
          <p style="color: #475569; font-size: 14px; text-align: center; font-weight: 500; margin: 0;">
            Thank You
          </p>
        </div>
      `
    };
    try {
      await transporter.sendMail(mailOptions);
    } catch (mailError) {
      console.warn("Failed to send email (check NodeMailer config):", mailError);
    }
    console.log("\n=======================================================");
    console.log("INVITATION LINK GENERATED (Sent via Email):");
    console.log(inviteLink);
    console.log("=======================================================\n");
    res.status(200).json({
      success: true,
      message: "Employee registration successful. Password setup email has been sent."
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
var verifyToken = async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) {
      return res.status(400).json({ success: false, message: "Token is required." });
    }
    const invitation = await invitation_model_default.findOne({ token });
    if (!invitation) {
      return res.status(400).json({ success: false, message: "Invalid token." });
    }
    if (invitation.expiresAt < /* @__PURE__ */ new Date()) {
      return res.status(400).json({ success: false, message: "Token has expired. Please request a new link." });
    }
    res.status(200).json({ success: true, message: "Token is valid.", email: invitation.email });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
var setPassword = async (req, res) => {
  try {
    const { token, password, name, mobile, blood } = req.body;
    if (!token || !password) {
      return res.status(400).json({ success: false, message: "Token and password are required." });
    }
    const invitation = await invitation_model_default.findOne({ token });
    if (!invitation) {
      return res.status(400).json({ success: false, message: "Invalid or expired token." });
    }
    if (invitation.expiresAt < /* @__PURE__ */ new Date()) {
      return res.status(400).json({ success: false, message: "Token has expired." });
    }
    const hashedPassword = await bcrypt.hash(password, 12);
    const employeeId = "EMP-" + Date.now().toString().slice(-6);
    const newEmployee = new employee_model_default({
      employeeId,
      email: invitation.email,
      department: invitation.department,
      role: invitation.role,
      password: hashedPassword,
      name: name || "Unknown",
      mobile: mobile || "0000000000",
      blood: blood || "O+",
      isVerified: true
    });
    await newEmployee.save();
    await invitation_model_default.findByIdAndDelete(invitation._id);
    res.status(200).json({ success: true, message: "Password set successfully. You can now login." });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// src/routes/employeeRoutes.ts
var router6 = express12.Router();
router6.post("/register", createEmployee);
router6.post("/verify-otp", verifyEmployeeOtp);
router6.post("/send-invite", sendInvite);
router6.get("/verify-token", verifyToken);
router6.post("/set-password", setPassword);
router6.post("/set-password/:token", setPassword);
var employeeRoutes_default = router6;
var counterSchema = new mongoose2.Schema(
  {
    prefix: {
      type: String,
      required: true,
      trim: true
    },
    year: {
      type: Number,
      required: true
    },
    seq: {
      type: Number,
      default: 0
    }
  },
  { timestamps: true }
);
counterSchema.index({ prefix: 1, year: 1 }, { unique: true });
var Counter = mongoose2.model("Counter", counterSchema);
var generateSerialId = async (prefix) => {
  const year = (/* @__PURE__ */ new Date()).getFullYear();
  const counter = await Counter.findOneAndUpdate(
    { prefix, year },
    { $inc: { seq: 1 } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  const seq = counter?.seq ?? 1;
  return `${prefix}-${year}-${String(seq).padStart(3, "0")}`;
};

// src/controllers/purchaseRequest.controller.ts
var createPurchaseRequest = async (req, res) => {
  try {
    const { department, vendor, products, requestedBy, deliveryAddress, notes, priority } = req.body;
    if (!department || !vendor || !products || !Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ success: false, message: "Department, vendor, and products are required." });
    }
    const requestId = await generateSerialId("PR");
    const totalAmount = products.reduce((acc, prod) => {
      const qty = Number(prod.quantity) || 0;
      const prc = Number(prod.price) || 0;
      return acc + qty * prc;
    }, 0);
    const newRequest = await purchaseRequest_model_default.create({
      requestId,
      department,
      vendor,
      products,
      totalAmount,
      requestedBy: requestedBy || "Admin",
      status: "Pending",
      deliveryAddress: deliveryAddress || "",
      notes: notes || "",
      priority: priority || "Medium",
      deliveryStatus: "Pending",
      materialRequestId: req.body.materialRequestId || ""
    });
    return res.status(201).json({
      success: true,
      message: "Purchase request created successfully",
      data: newRequest
    });
  } catch (error) {
    console.error("CREATE PURCHASE REQUEST ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Error creating purchase request",
      error: error.message
    });
  }
};
var getAllPurchaseRequests = async (_req, res) => {
  try {
    const requests = await purchaseRequest_model_default.find().sort({ createdAt: -1 });
    return res.status(200).json(requests);
  } catch (error) {
    console.error("GET PURCHASE REQUESTS ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching purchase requests",
      error: error.message
    });
  }
};
var updatePurchaseRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { vendor, products, totalAmount, priority, deliveryAddress, notes, status, deliveryStatus, approvedBy } = req.body;
    const updateData = {};
    if (vendor !== void 0) updateData.vendor = vendor;
    if (products !== void 0) updateData.products = products;
    if (totalAmount !== void 0) updateData.totalAmount = totalAmount;
    if (priority !== void 0) updateData.priority = priority;
    if (deliveryAddress !== void 0) updateData.deliveryAddress = deliveryAddress;
    if (notes !== void 0) updateData.notes = notes;
    if (status !== void 0) updateData.status = status;
    if (deliveryStatus !== void 0) updateData.deliveryStatus = deliveryStatus;
    if (approvedBy !== void 0) updateData.approvedBy = approvedBy;
    const updated = await purchaseRequest_model_default.findByIdAndUpdate(id, updateData, { new: true });
    if (!updated) {
      return res.status(404).json({ success: false, message: "Purchase request not found." });
    }
    return res.status(200).json({
      success: true,
      message: "Purchase request updated successfully.",
      data: updated
    });
  } catch (error) {
    console.error("UPDATE PURCHASE REQUEST ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Error updating purchase request",
      error: error.message
    });
  }
};
var updatePurchaseRequestStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, approvedBy, deliveryStatus } = req.body;
    if (!status && !deliveryStatus) {
      return res.status(400).json({ success: false, message: "Status or Delivery Status is required." });
    }
    const updateData = {};
    if (status !== void 0) {
      updateData.status = status;
      updateData.approvedBy = approvedBy || "Admin";
    }
    if (deliveryStatus !== void 0) {
      updateData.deliveryStatus = deliveryStatus;
    }
    const updatedRequest = await purchaseRequest_model_default.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    );
    if (!updatedRequest) {
      return res.status(404).json({ success: false, message: "Purchase request not found." });
    }
    if (updatedRequest && updatedRequest.status === "Approved" && updatedRequest.materialRequestId) {
      try {
        await material_model_default.findByIdAndUpdate(
          updatedRequest.materialRequestId,
          { status: "Procurement Completed" }
        );
      } catch (err) {
        console.error("Failed to update Material Request status upon PO creation", err);
      }
    }
    return res.status(200).json({
      success: true,
      message: `Purchase request status updated successfully.`,
      data: updatedRequest
    });
  } catch (error) {
    console.error("UPDATE PURCHASE REQUEST STATUS ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Error updating purchase request status",
      error: error.message
    });
  }
};
var deletePurchaseRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedRequest = await purchaseRequest_model_default.findByIdAndDelete(id);
    if (!deletedRequest) {
      return res.status(404).json({ success: false, message: "Purchase request not found." });
    }
    return res.status(200).json({
      success: true,
      message: "Purchase request deleted successfully."
    });
  } catch (error) {
    console.error("DELETE PURCHASE REQUEST ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Error deleting purchase request",
      error: error.message
    });
  }
};

// src/routes/purchaseRequest.routes.ts
var router7 = express12.Router();
router7.post("/create", createPurchaseRequest);
router7.get("/get", getAllPurchaseRequests);
router7.put("/:id", updatePurchaseRequest);
router7.put("/status/:id", updatePurchaseRequestStatus);
router7.delete("/:id", deletePurchaseRequest);
var purchaseRequest_routes_default = router7;
var inventorySchema = new mongoose2.Schema(
  {
    itemName: {
      type: String,
      required: true
    },
    category: {
      type: String,
      required: true,
      default: "General"
    },
    stockQuantity: {
      type: Number,
      required: true,
      default: 0
    },
    price: {
      type: Number,
      required: true,
      default: 0
    },
    warehouse: {
      type: String,
      required: true,
      default: "Main Warehouse"
    },
    supplier: {
      type: String,
      required: true
    },
    status: {
      type: String,
      required: true,
      enum: ["In Stock", "Out of Stock", "Low Stock"],
      default: "In Stock"
    }
  },
  { timestamps: true }
);
var inventory_model_default = mongoose2.model("Inventory", inventorySchema);

// src/controllers/inventory.controller.ts
var getStockStatus = (quantity) => {
  if (quantity <= 0) return "Out of Stock";
  if (quantity < 10) return "Low Stock";
  return "In Stock";
};
var createInventoryItem = async (req, res) => {
  try {
    const { itemName, category, stockQuantity, price, warehouse, supplier } = req.body;
    if (!itemName || !supplier) {
      return res.status(400).json({ success: false, message: "Item name and supplier are required." });
    }
    const qty = Number(stockQuantity) || 0;
    const itemStatus = getStockStatus(qty);
    const newItem = await inventory_model_default.create({
      itemName,
      category: category || "General",
      stockQuantity: qty,
      price: Number(price) || 0,
      warehouse: warehouse || "Main Warehouse",
      supplier,
      status: itemStatus
    });
    res.status(201).json({
      success: true,
      message: "Inventory item added successfully",
      data: newItem
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error adding inventory item", error: error.message });
  }
};
var getAllInventoryItems = async (req, res) => {
  try {
    const items = await inventory_model_default.find().sort({ createdAt: -1 });
    res.status(200).json(items);
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching inventory items", error: error.message });
  }
};
var checkStock = async (req, res) => {
  try {
    const { itemName } = req.params;
    const trimmedName = (itemName || "").trim();
    let item = await ProductMenu.findOne({
      name: { $regex: new RegExp(`^\\s*${trimmedName}\\s*$`, "i") }
    });
    if (item) {
      return res.status(200).json({
        success: true,
        found: true,
        stock: item.stock ?? 0,
        itemName: item.name,
        status: (item.stock ?? 0) > 0 ? "In Stock" : "Out of Stock",
        data: item,
        source: "ProductMenu"
      });
    }
    const invItem = await inventory_model_default.findOne({
      itemName: { $regex: new RegExp(`^\\s*${trimmedName}\\s*$`, "i") }
    });
    if (!invItem) {
      return res.status(200).json({
        success: true,
        found: false,
        stock: 0,
        message: "Item not found in inventory",
        data: null
      });
    }
    return res.status(200).json({
      success: true,
      found: true,
      stock: invItem.stockQuantity,
      itemName: invItem.itemName,
      status: invItem.status,
      data: invItem,
      source: "Inventory"
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error checking stock", error: error.message });
  }
};
var deductStock = async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity } = req.body;
    const deductQty = Number(quantity);
    if (!deductQty || deductQty <= 0) {
      return res.status(400).json({ success: false, message: "Valid quantity required for deduction" });
    }
    let productItem = await ProductMenu.findById(id);
    if (productItem) {
      if ((productItem.stock ?? 0) < deductQty) {
        return res.status(400).json({
          success: false,
          message: "Insufficient stock to deduct",
          available: productItem.stock ?? 0
        });
      }
      productItem.stock = (productItem.stock ?? 0) - deductQty;
      await productItem.save();
      return res.status(200).json({
        success: true,
        message: `Stock deducted by ${deductQty}. Remaining: ${productItem.stock}`,
        data: productItem
      });
    }
    const invItem = await inventory_model_default.findById(id);
    if (!invItem) {
      return res.status(404).json({ success: false, message: "Inventory item not found" });
    }
    if (invItem.stockQuantity < deductQty) {
      return res.status(400).json({
        success: false,
        message: "Insufficient stock to deduct",
        available: invItem.stockQuantity
      });
    }
    invItem.stockQuantity -= deductQty;
    invItem.status = getStockStatus(invItem.stockQuantity);
    await invItem.save();
    res.status(200).json({
      success: true,
      message: `Stock deducted by ${deductQty}. Remaining: ${invItem.stockQuantity}`,
      data: invItem
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error deducting stock", error: error.message });
  }
};
var updateInventoryItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { itemName, category, stockQuantity, price, warehouse, supplier } = req.body;
    const item = await inventory_model_default.findById(id);
    if (!item) {
      return res.status(404).json({ success: false, message: "Inventory item not found." });
    }
    if (itemName !== void 0) item.itemName = itemName;
    if (category !== void 0) item.category = category;
    if (price !== void 0) item.price = Number(price) || 0;
    if (warehouse !== void 0) item.warehouse = warehouse;
    if (supplier !== void 0) item.supplier = supplier;
    if (stockQuantity !== void 0) {
      const qty = Number(stockQuantity) || 0;
      item.stockQuantity = qty;
      item.status = getStockStatus(qty);
    }
    await item.save();
    res.status(200).json({ success: true, message: "Inventory item updated successfully", data: item });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error updating inventory item", error: error.message });
  }
};
var deleteInventoryItem = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedItem = await inventory_model_default.findByIdAndDelete(id);
    if (!deletedItem) {
      return res.status(404).json({ success: false, message: "Inventory item not found." });
    }
    res.status(200).json({ success: true, message: "Inventory item deleted successfully." });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error deleting inventory item", error: error.message });
  }
};

// src/routes/inventory.routes.ts
var router8 = express12.Router();
router8.post("/create", createInventoryItem);
router8.get("/get", getAllInventoryItems);
router8.get("/check-stock/:itemName", checkStock);
router8.put("/deduct-stock/:id", deductStock);
router8.put("/:id", updateInventoryItem);
router8.delete("/:id", deleteInventoryItem);
var inventory_routes_default = router8;
var settingsSchema = new Schema(
  {
    orgName: {
      type: String,
      required: true,
      default: "InvenPro Pvt Ltd"
    },
    contactEmail: {
      type: String,
      required: true,
      default: "admin@invenpro.com"
    },
    industryType: {
      type: String,
      required: true,
      default: "Inventory Management"
    },
    phone: {
      type: String,
      required: true,
      default: "+91 98765 43210"
    },
    address: {
      type: String,
      required: true,
      default: "123 Industrial Area, Mumbai, Maharashtra - 400001"
    },
    timezone: {
      type: String,
      required: true,
      default: "Asia/Kolkata (IST)"
    },
    currency: {
      type: String,
      required: true,
      default: "INR (\u20B9)"
    },
    dateFormat: {
      type: String,
      required: true,
      default: "DD/MM/YYYY"
    }
  },
  {
    timestamps: true
  }
);
var SettingsModel = mongoose2.model("Settings", settingsSchema);

// src/controllers/settings.controller.ts
var getSettings = async (req, res) => {
  try {
    let settings = await SettingsModel.findOne();
    if (!settings) {
      settings = await SettingsModel.create({
        orgName: "InvenPro Pvt Ltd",
        contactEmail: "admin@invenpro.com",
        industryType: "Inventory Management",
        phone: "+91 98765 43210",
        address: "123 Industrial Area, Mumbai, Maharashtra - 400001",
        timezone: "Asia/Kolkata (IST)",
        currency: "INR (\u20B9)",
        dateFormat: "DD/MM/YYYY"
      });
    }
    return res.status(200).json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error("GET SETTINGS ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve settings.",
      error: error.message
    });
  }
};
var updateSettings = async (req, res) => {
  try {
    const {
      orgName,
      contactEmail,
      industryType,
      phone,
      address,
      timezone,
      currency,
      dateFormat
    } = req.body;
    if (!orgName || typeof orgName !== "string" || orgName.trim().length < 3) {
      return res.status(400).json({
        success: false,
        message: "Failed to save settings. Organization Name must be at least 3 characters."
      });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!contactEmail || typeof contactEmail !== "string" || !emailRegex.test(contactEmail.trim())) {
      return res.status(400).json({
        success: false,
        message: "Failed to save settings. Please provide a valid Contact Email."
      });
    }
    const phoneRegex = /^\+?[0-9\s\-()]{7,20}$/;
    if (!phone || typeof phone !== "string" || !phoneRegex.test(phone.trim())) {
      return res.status(400).json({
        success: false,
        message: "Failed to save settings. Please provide a valid Phone Number containing digits."
      });
    }
    if (!address || typeof address !== "string" || address.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Failed to save settings. Address is required."
      });
    }
    if (!timezone || typeof timezone !== "string" || timezone.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Failed to save settings. Time Zone is required."
      });
    }
    if (!currency || typeof currency !== "string" || currency.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Failed to save settings. Currency is required."
      });
    }
    if (!dateFormat || typeof dateFormat !== "string" || dateFormat.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Failed to save settings. Date Format is required."
      });
    }
    let settings = await SettingsModel.findOne();
    if (!settings) {
      settings = new SettingsModel();
    }
    settings.orgName = orgName.trim();
    settings.contactEmail = contactEmail.trim();
    settings.industryType = industryType.trim();
    settings.phone = phone.trim();
    settings.address = address.trim();
    settings.timezone = timezone.trim();
    settings.currency = currency.trim();
    settings.dateFormat = dateFormat.trim();
    await settings.save();
    return res.status(200).json({
      success: true,
      message: "Organization settings updated successfully.",
      data: settings
    });
  } catch (error) {
    console.error("UPDATE SETTINGS ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to save settings. Please try again.",
      error: error.message
    });
  }
};

// src/routes/settings.routes.ts
var router9 = express12.Router();
router9.get("/get", getSettings);
router9.put("/update", updateSettings);
var settings_routes_default = router9;
var auditLogSchema = new mongoose2.Schema(
  {
    userId: {
      type: String,
      default: "system"
    },
    userName: {
      type: String,
      required: true,
      default: "System"
    },
    transactionId: {
      type: String,
      required: true
      // MR ref, PR id, PO id, GRN id, etc.
    },
    moduleName: {
      type: String,
      required: true,
      enum: [
        "Material Request",
        "Purchase Requisition",
        "Inventory",
        "RFQ",
        "Quotation",
        "Purchase Order",
        "GRN",
        "Material Issue",
        "Procurement",
        "System"
      ]
    },
    actionPerformed: {
      type: String,
      required: true
    },
    previousStatus: {
      type: String,
      default: ""
    },
    newStatus: {
      type: String,
      default: ""
    },
    // Optional reference to the source Material Request for quick filtering
    materialRequestId: {
      type: String,
      default: ""
    },
    metadata: {
      type: mongoose2.Schema.Types.Mixed,
      default: {}
    }
  },
  { timestamps: true }
);
auditLogSchema.index({ transactionId: 1 });
auditLogSchema.index({ materialRequestId: 1 });
auditLogSchema.index({ moduleName: 1 });
var auditLog_model_default = mongoose2.model("AuditLog", auditLogSchema);

// src/controllers/auditLog.controller.ts
var createAuditLog = async (req, res) => {
  try {
    const {
      userId,
      userName,
      transactionId,
      moduleName,
      actionPerformed,
      previousStatus,
      newStatus,
      materialRequestId,
      metadata
    } = req.body;
    if (!transactionId || !moduleName || !actionPerformed || !userName) {
      return res.status(400).json({
        success: false,
        message: "transactionId, moduleName, actionPerformed, and userName are required."
      });
    }
    const log = await auditLog_model_default.create({
      userId: userId || "system",
      userName,
      transactionId,
      moduleName,
      actionPerformed,
      previousStatus: previousStatus || "",
      newStatus: newStatus || "",
      materialRequestId: materialRequestId || "",
      metadata: metadata || {}
    });
    return res.status(201).json({ success: true, data: log });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
var getAuditLogs = async (req, res) => {
  try {
    const { moduleName, transactionId, limit = 200 } = req.query;
    const filter = {};
    if (moduleName) filter.moduleName = moduleName;
    if (transactionId) filter.transactionId = transactionId;
    const logs = await auditLog_model_default.find(filter).sort({ createdAt: -1 }).limit(Number(limit));
    return res.status(200).json({ success: true, count: logs.length, data: logs });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
var getAuditLogsByMR = async (req, res) => {
  try {
    const { mrId } = req.params;
    const logs = await auditLog_model_default.find({ materialRequestId: mrId }).sort({ createdAt: -1 });
    return res.status(200).json({ success: true, count: logs.length, data: logs });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
var clearAuditLogs = async (_req, res) => {
  try {
    await auditLog_model_default.deleteMany({});
    return res.status(200).json({ success: true, message: "All audit logs cleared." });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// src/routes/auditLog.routes.ts
var router10 = express12.Router();
router10.post("/", createAuditLog);
router10.get("/", getAuditLogs);
router10.get("/mr/:mrId", getAuditLogsByMR);
router10.delete("/clear", clearAuditLogs);
var auditLog_routes_default = router10;
var quotationSchema = new mongoose2.Schema({
  vendorName: { type: String, required: true },
  vendorContact: { type: String, default: "" },
  vendorAddress: { type: String, default: "" },
  unitPrice: { type: Number, required: true },
  totalAmount: { type: Number, required: true },
  deliveryDays: { type: Number, default: 7 },
  warranty: { type: String, default: "" },
  paymentTerms: { type: String, default: "Net 30" },
  notes: { type: String, default: "" },
  submittedAt: { type: Date, default: Date.now }
}, { _id: false });
var procurementWorkflowSchema = new mongoose2.Schema(
  {
    // ── Source Reference ──
    materialRequestId: {
      type: String,
      required: true,
      index: true
    },
    materialReferenceId: {
      type: String,
      required: true
      // e.g. "MR-2026-005"
    },
    productDetails: { type: String, required: true },
    requestedQty: { type: Number, required: true },
    stockAtApproval: { type: Number, default: 0 },
    shortageQty: { type: Number, default: 0 },
    // = requestedQty - stockAtApproval
    // ── Purchase Requisition ──
    prId: { type: String, default: "" },
    // PR-2026-XXX
    prStatus: {
      type: String,
      enum: ["Auto-Generated", "Approved", "Rejected"],
      default: "Auto-Generated"
    },
    // ── RFQ ──
    rfqId: { type: String, default: "" },
    rfqStatus: {
      type: String,
      enum: ["Not Created", "Draft", "Sent to Vendors", "Closed"],
      default: "Not Created"
    },
    rfqVendors: [{ type: String }],
    rfqCreatedAt: { type: Date },
    rfqResponseDeadline: { type: Date },
    // ── Quotations ──
    quotations: [quotationSchema],
    // ── Vendor Selection ──
    selectedVendor: {
      vendorName: { type: String, default: "" },
      vendorContact: { type: String, default: "" },
      vendorAddress: { type: String, default: "" },
      unitPrice: { type: Number, default: 0 },
      paymentTerms: { type: String, default: "" },
      deliveryDays: { type: Number, default: 7 }
    },
    // ── Purchase Order ──
    poId: { type: String, default: "" },
    poStatus: {
      type: String,
      enum: ["Not Created", "Draft", "Approved", "Sent to Vendor", "Closed"],
      default: "Not Created"
    },
    poAmount: { type: Number, default: 0 },
    poExpectedDelivery: { type: String, default: "" },
    poApprovedBy: { type: String, default: "" },
    // ── GRN ──
    grnId: { type: String, default: "" },
    grnStatus: {
      type: String,
      enum: ["Not Created", "Pending QC", "QC Completed", "Inventory Updated"],
      default: "Not Created"
    },
    grnReceivedQty: { type: Number, default: 0 },
    grnReceivedBy: { type: String, default: "" },
    grnReceivedDate: { type: String, default: "" },
    grnConditionNotes: { type: String, default: "" },
    inventoryUpdated: { type: Boolean, default: false },
    // ── Stock Issue (final step) ──
    stockIssued: { type: Boolean, default: false },
    issuedQty: { type: Number, default: 0 },
    issuedBy: { type: String, default: "" },
    issuedAt: { type: Date },
    // ── Overall workflow status ──
    workflowStatus: {
      type: String,
      enum: [
        "Procurement Required",
        "PR Created",
        "RFQ Created",
        "Quotations Received",
        "Vendor Selected",
        "PO Created",
        "PO Approved",
        "Material Received",
        "GRN Completed",
        "Inventory Updated",
        "Ready For Issue",
        "Stock Issued",
        "Completed"
      ],
      default: "Procurement Required"
    }
  },
  { timestamps: true }
);
var procurementWorkflow_model_default = mongoose2.model("ProcurementWorkflow", procurementWorkflowSchema);

// src/controllers/procurement.controller.ts
var writeAudit = async (params) => {
  try {
    await auditLog_model_default.create({
      userId: params.userId || "system",
      userName: params.userName,
      transactionId: params.transactionId,
      moduleName: params.moduleName,
      actionPerformed: params.actionPerformed,
      previousStatus: params.previousStatus || "",
      newStatus: params.newStatus || "",
      materialRequestId: params.materialRequestId || "",
      metadata: params.metadata || {}
    });
  } catch (err) {
    console.warn("[AuditLog] Failed to write audit log:", err);
  }
};
var getWorkflowByMR = async (req, res) => {
  try {
    const { mrId } = req.params;
    const workflow = await procurementWorkflow_model_default.findOne({ materialRequestId: mrId });
    if (!workflow) {
      return res.status(404).json({ success: false, message: "No procurement workflow found for this MR." });
    }
    return res.status(200).json({ success: true, data: workflow });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
var getAllWorkflows = async (_req, res) => {
  try {
    const workflows = await procurementWorkflow_model_default.find().sort({ createdAt: -1 });
    return res.status(200).json({ success: true, count: workflows.length, data: workflows });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
var createRFQ = async (req, res) => {
  try {
    const {
      materialRequestId,
      rfqVendors,
      rfqResponseDeadline,
      userName = "Procurement Officer",
      userId = "system"
    } = req.body;
    if (!materialRequestId || !rfqVendors || !Array.isArray(rfqVendors) || rfqVendors.length === 0) {
      return res.status(400).json({ success: false, message: "materialRequestId and rfqVendors[] are required." });
    }
    const mr = await material_model_default.findById(materialRequestId);
    if (!mr) return res.status(404).json({ success: false, message: "Material Request not found." });
    let workflow = await procurementWorkflow_model_default.findOne({ materialRequestId });
    if (!workflow) {
      return res.status(404).json({ success: false, message: "Procurement workflow not found. Approve the MR first." });
    }
    const rfqId = await generateSerialId("RFQ");
    const responseDeadline = rfqResponseDeadline ? new Date(rfqResponseDeadline) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1e3);
    workflow.rfqId = rfqId;
    workflow.rfqStatus = "Sent to Vendors";
    workflow.rfqVendors = rfqVendors;
    workflow.rfqCreatedAt = /* @__PURE__ */ new Date();
    workflow.rfqResponseDeadline = responseDeadline;
    workflow.workflowStatus = "RFQ Created";
    await workflow.save();
    const prevStatus = mr.status;
    await material_model_default.findByIdAndUpdate(materialRequestId, {
      status: "RFQ Created",
      linkedRfqId: rfqId
    });
    await writeAudit({
      userId,
      userName,
      transactionId: rfqId,
      moduleName: "RFQ",
      actionPerformed: `RFQ ${rfqId} created and sent to ${rfqVendors.length} vendor(s): ${rfqVendors.join(", ")}`,
      previousStatus: prevStatus,
      newStatus: "RFQ Created",
      materialRequestId,
      metadata: { rfqVendors, responseDeadline }
    });
    return res.status(201).json({
      success: true,
      message: `RFQ ${rfqId} created successfully`,
      data: { rfqId, workflow }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
var submitQuotation = async (req, res) => {
  try {
    const {
      materialRequestId,
      vendorName,
      vendorContact,
      vendorAddress,
      unitPrice,
      deliveryDays,
      warranty,
      paymentTerms,
      notes,
      userName = "Vendor",
      userId = "system"
    } = req.body;
    if (!materialRequestId || !vendorName || !unitPrice) {
      return res.status(400).json({ success: false, message: "materialRequestId, vendorName, and unitPrice are required." });
    }
    const workflow = await procurementWorkflow_model_default.findOne({ materialRequestId });
    if (!workflow) return res.status(404).json({ success: false, message: "Procurement workflow not found." });
    const totalAmount = unitPrice * workflow.requestedQty;
    const quotation = {
      vendorName,
      vendorContact: vendorContact || "",
      vendorAddress: vendorAddress || "",
      unitPrice: Number(unitPrice),
      totalAmount,
      deliveryDays: Number(deliveryDays) || 7,
      warranty: warranty || "",
      paymentTerms: paymentTerms || "Net 30",
      notes: notes || "",
      submittedAt: /* @__PURE__ */ new Date()
    };
    workflow.quotations.push(quotation);
    workflow.rfqStatus = "Closed";
    workflow.workflowStatus = "Quotations Received";
    await workflow.save();
    const mr = await material_model_default.findByIdAndUpdate(materialRequestId, { status: "Quotations Received" }, { new: true });
    await writeAudit({
      userId,
      userName,
      transactionId: workflow.rfqId || materialRequestId,
      moduleName: "Quotation",
      actionPerformed: `Quotation submitted by ${vendorName}: \u20B9${unitPrice}/unit, Total: \u20B9${totalAmount}`,
      previousStatus: mr?.status || "RFQ Created",
      newStatus: "Quotations Received",
      materialRequestId,
      metadata: { vendorName, unitPrice, totalAmount, deliveryDays }
    });
    return res.status(201).json({ success: true, message: "Quotation submitted successfully.", data: workflow });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
var selectVendor = async (req, res) => {
  try {
    const {
      materialRequestId,
      vendorName,
      vendorContact,
      vendorAddress,
      unitPrice,
      paymentTerms,
      deliveryDays,
      userName = "Procurement Manager",
      userId = "system"
    } = req.body;
    if (!materialRequestId || !vendorName) {
      return res.status(400).json({ success: false, message: "materialRequestId and vendorName are required." });
    }
    const workflow = await procurementWorkflow_model_default.findOne({ materialRequestId });
    if (!workflow) return res.status(404).json({ success: false, message: "Procurement workflow not found." });
    workflow.selectedVendor = {
      vendorName,
      vendorContact: vendorContact || "",
      vendorAddress: vendorAddress || "",
      unitPrice: Number(unitPrice) || 0,
      paymentTerms: paymentTerms || "Net 30",
      deliveryDays: Number(deliveryDays) || 7
    };
    workflow.workflowStatus = "Vendor Selected";
    await workflow.save();
    const mr = await material_model_default.findByIdAndUpdate(materialRequestId, { status: "Vendor Selected" }, { new: true });
    await writeAudit({
      userId,
      userName,
      transactionId: materialRequestId,
      moduleName: "Procurement",
      actionPerformed: `Vendor ${vendorName} selected for Material Request ${workflow.materialReferenceId}. Unit Price: \u20B9${unitPrice}`,
      previousStatus: "Quotations Received",
      newStatus: "Vendor Selected",
      materialRequestId,
      metadata: { vendorName, unitPrice, paymentTerms }
    });
    return res.status(200).json({ success: true, message: `Vendor ${vendorName} selected.`, data: { workflow, mr } });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
var createPO = async (req, res) => {
  try {
    const {
      materialRequestId,
      poAmount,
      poExpectedDelivery,
      approvedBy,
      userName = "Procurement Manager",
      userId = "system"
    } = req.body;
    if (!materialRequestId) {
      return res.status(400).json({ success: false, message: "materialRequestId is required." });
    }
    const workflow = await procurementWorkflow_model_default.findOne({ materialRequestId });
    if (!workflow) return res.status(404).json({ success: false, message: "Procurement workflow not found." });
    const poId = await generateSerialId("PO");
    workflow.poId = poId;
    workflow.poStatus = "Approved";
    workflow.poAmount = Number(poAmount) || workflow.selectedVendor.unitPrice * workflow.requestedQty;
    workflow.poExpectedDelivery = poExpectedDelivery || "";
    workflow.poApprovedBy = approvedBy || userName;
    workflow.workflowStatus = "PO Approved";
    await workflow.save();
    await material_model_default.findByIdAndUpdate(materialRequestId, { status: "PO Approved", linkedPoId: poId });
    await writeAudit({
      userId,
      userName,
      transactionId: poId,
      moduleName: "Purchase Order",
      actionPerformed: `Purchase Order ${poId} created and approved. Vendor: ${workflow.selectedVendor.vendorName}. Amount: \u20B9${workflow.poAmount}`,
      previousStatus: "Vendor Selected",
      newStatus: "PO Approved",
      materialRequestId,
      metadata: { poId, poAmount: workflow.poAmount, vendor: workflow.selectedVendor.vendorName }
    });
    return res.status(201).json({ success: true, message: `Purchase Order ${poId} created.`, data: { poId, workflow } });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
var createGRN = async (req, res) => {
  try {
    const {
      materialRequestId,
      receivedQty,
      receivedBy,
      conditionNotes,
      userName = "Warehouse Officer",
      userId = "system"
    } = req.body;
    if (!materialRequestId || !receivedQty) {
      return res.status(400).json({ success: false, message: "materialRequestId and receivedQty are required." });
    }
    const workflow = await procurementWorkflow_model_default.findOne({ materialRequestId });
    if (!workflow) return res.status(404).json({ success: false, message: "Procurement workflow not found." });
    const mr = await material_model_default.findById(materialRequestId);
    if (!mr) return res.status(404).json({ success: false, message: "Material Request not found." });
    const grnId = await generateSerialId("GRN");
    const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    workflow.grnId = grnId;
    workflow.grnStatus = "Pending QC";
    workflow.grnReceivedQty = Number(receivedQty);
    workflow.grnReceivedBy = receivedBy || userName;
    workflow.grnReceivedDate = today;
    workflow.grnConditionNotes = conditionNotes || "Received in good condition";
    workflow.workflowStatus = "GRN Completed";
    await workflow.save();
    await material_model_default.findByIdAndUpdate(materialRequestId, { status: "GRN Created", linkedGrnId: grnId });
    await writeAudit({
      userId,
      userName,
      transactionId: grnId,
      moduleName: "GRN",
      actionPerformed: `GRN ${grnId} created. Received ${receivedQty} units of "${mr.productDetails}" from vendor ${workflow.selectedVendor.vendorName}`,
      previousStatus: "PO Approved",
      newStatus: "GRN Created",
      materialRequestId,
      metadata: { grnId, receivedQty, productDetails: mr.productDetails }
    });
    return res.status(201).json({
      success: true,
      message: `GRN ${grnId} created successfully. Awaiting QC inspection verification before stock update.`,
      data: { grnId, inventoryUpdated: false, workflow }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
var completeStockIssue = async (req, res) => {
  try {
    const {
      materialRequestId,
      issuedBy,
      userName = "Warehouse Officer",
      userId = "system"
    } = req.body;
    if (!materialRequestId) {
      return res.status(400).json({ success: false, message: "materialRequestId is required." });
    }
    const mr = await material_model_default.findById(materialRequestId);
    if (!mr) return res.status(404).json({ success: false, message: "Material Request not found." });
    const workflow = await procurementWorkflow_model_default.findOne({ materialRequestId });
    if (!workflow) return res.status(404).json({ success: false, message: "Procurement workflow not found." });
    const productName = mr.productDetails.trim();
    const requestedQty = mr.quantity;
    let currentStock = 0;
    let stockItemId = "";
    let stockSource = "";
    const productItem = await ProductMenu.findOne({
      name: { $regex: new RegExp(`^\\s*${productName}\\s*$`, "i") }
    });
    if (productItem) {
      currentStock = productItem.stock ?? 0;
      stockItemId = String(productItem._id);
      stockSource = "ProductMenu";
    } else {
      const invItem = await inventory_model_default.findOne({
        itemName: { $regex: new RegExp(`^\\s*${productName}\\s*$`, "i") }
      });
      if (invItem) {
        currentStock = invItem.stockQuantity;
        stockItemId = String(invItem._id);
        stockSource = "Inventory";
      }
    }
    if (currentStock < requestedQty) {
      return res.status(400).json({
        success: false,
        message: `Insufficient stock to issue. Available: ${currentStock}, Required: ${requestedQty}`,
        currentStock,
        requestedQty
      });
    }
    if (stockSource === "ProductMenu") {
      await ProductMenu.findByIdAndUpdate(stockItemId, { $inc: { stock: -requestedQty } });
    } else {
      const invItem = await inventory_model_default.findById(stockItemId);
      if (invItem) {
        invItem.stockQuantity -= requestedQty;
        if (invItem.stockQuantity <= 0) invItem.status = "Out of Stock";
        else if (invItem.stockQuantity < 10) invItem.status = "Low Stock";
        else invItem.status = "In Stock";
        await invItem.save();
      }
    }
    await material_model_default.findByIdAndUpdate(materialRequestId, {
      status: "Completed",
      issuedQty: requestedQty
    });
    workflow.stockIssued = true;
    workflow.issuedQty = requestedQty;
    workflow.issuedBy = issuedBy || userName;
    workflow.issuedAt = /* @__PURE__ */ new Date();
    workflow.workflowStatus = "Completed";
    await workflow.save();
    await writeAudit({
      userId,
      userName,
      transactionId: mr.referenceId,
      moduleName: "Material Issue",
      actionPerformed: `${requestedQty} units of "${mr.productDetails}" issued to ${mr.requester} (Dept: ${mr.department}). Stock deducted from inventory.`,
      previousStatus: "Inventory Updated",
      newStatus: "Stock Issued",
      materialRequestId,
      metadata: { issuedQty: requestedQty, productDetails: mr.productDetails, requester: mr.requester }
    });
    await writeAudit({
      userId,
      userName,
      transactionId: mr.referenceId,
      moduleName: "Material Request",
      actionPerformed: `Material Request ${mr.referenceId} completed via procurement workflow. All ${requestedQty} units issued successfully.`,
      previousStatus: "Stock Issued",
      newStatus: "Completed",
      materialRequestId,
      metadata: { workflow: "procurement", completedAt: /* @__PURE__ */ new Date() }
    });
    return res.status(200).json({
      success: true,
      message: `Stock issued successfully. Material Request ${mr.referenceId} marked as Completed.`,
      data: { issuedQty: requestedQty, remainingStock: currentStock - requestedQty, workflow }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// src/routes/procurement.routes.ts
var router11 = express12.Router();
router11.get("/workflows", getAllWorkflows);
router11.get("/workflow/:mrId", getWorkflowByMR);
router11.post("/rfq", createRFQ);
router11.post("/quotation", submitQuotation);
router11.put("/select-vendor", selectVendor);
router11.post("/po", createPO);
router11.post("/grn", createGRN);
router11.put("/issue", completeStockIssue);
var procurement_routes_default = router11;
var qcInspectionSchema = new mongoose2.Schema(
  {
    qcId: { type: String, required: true, unique: true },
    grnId: { type: String, required: true },
    poId: { type: String, default: "" },
    vendorName: { type: String, required: true },
    itemName: { type: String, required: true },
    receivedQty: { type: Number, required: true },
    passedQty: { type: Number, required: true },
    failedQty: { type: Number, required: true },
    status: { type: String, enum: ["Pending", "Completed"], default: "Pending" },
    result: { type: String, enum: ["Pass", "Fail", "Partial", "-"], default: "-" },
    inspector: { type: String, default: "" },
    notes: { type: String, default: "" },
    inspectedDate: { type: String, default: "" }
  },
  { timestamps: true }
);
var qcInspection_model_default = mongoose2.model("QcInspection", qcInspectionSchema);
var rtvSchema = new mongoose2.Schema(
  {
    rtvNumber: { type: String, required: true, unique: true },
    qcId: { type: String, required: true },
    grnId: { type: String, required: true },
    poNumber: { type: String, default: "" },
    vendorName: { type: String, required: true },
    itemName: { type: String, required: true },
    rejectedQuantity: { type: Number, required: true },
    reason: { type: String, required: true },
    createdDate: { type: String, required: true },
    status: {
      type: String,
      enum: ["Pending Approval", "Vendor Notified", "Material Returned", "Replacement Received / Refund Processed", "Completed"],
      default: "Pending Approval"
    },
    remarks: { type: String, default: "" }
  },
  { timestamps: true }
);
var rtv_model_default = mongoose2.model("Rtv", rtvSchema);
var movementHistorySchema = new mongoose2.Schema(
  {
    action: { type: String, required: true },
    user: { type: String, required: true },
    previousStatus: { type: String, default: "" },
    newStatus: { type: String, default: "" },
    timestamp: { type: Date, default: Date.now }
  },
  { _id: false }
);
var barcodeSchema = new mongoose2.Schema(
  {
    barcodeNumber: { type: String, required: true, unique: true },
    productCode: { type: String, default: "" },
    productName: { type: String, required: true },
    category: { type: String, default: "General" },
    grnId: { type: String, default: "" },
    vendorName: { type: String, default: "" },
    storageLocation: { type: String, default: "Main Warehouse - Rack 1" },
    status: {
      type: String,
      enum: ["Generated", "Received", "QC Approved", "Stored", "Issued", "Assigned", "Returned", "Available"],
      default: "Generated"
    },
    // Asset assignment properties
    employeeName: { type: String, default: "" },
    department: { type: String, default: "" },
    issueDate: { type: String, default: "" },
    returnDate: { type: String, default: "" },
    movementHistory: [movementHistorySchema]
  },
  { timestamps: true }
);
var barcode_model_default = mongoose2.model("Barcode", barcodeSchema);

// src/controllers/qc.controller.ts
var writeAudit2 = async (params) => {
  try {
    await auditLog_model_default.create({
      userId: params.userId || "system",
      userName: params.userName,
      transactionId: params.transactionId,
      moduleName: params.moduleName,
      actionPerformed: params.actionPerformed,
      previousStatus: params.previousStatus || "",
      newStatus: params.newStatus || "",
      materialRequestId: params.materialRequestId || "",
      metadata: params.metadata || {}
    });
  } catch (err) {
    console.warn("[AuditLog] Failed to write audit log in QC:", err);
  }
};
var getQCInspections = async (req, res) => {
  try {
    const inspections = await qcInspection_model_default.find().sort({ createdAt: -1 });
    return res.status(200).json({ success: true, count: inspections.length, data: inspections });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
var createQCInspectionShell = async (req, res) => {
  try {
    const { grnId, poId, vendorName, itemName, receivedQty, materialRequestId } = req.body;
    const qcId = "QC-" + Date.now();
    const shell = await qcInspection_model_default.create({
      qcId,
      grnId,
      poId: poId || "",
      vendorName,
      itemName,
      receivedQty: Number(receivedQty),
      passedQty: 0,
      failedQty: 0,
      status: "Pending"
    });
    return res.status(201).json({ success: true, data: shell });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
var completeQCInspection = async (req, res) => {
  try {
    const {
      grnId,
      passedQty,
      failedQty,
      inspector,
      notes,
      userName = "QC Inspector",
      userId = "system",
      materialRequestId
    } = req.body;
    if (!grnId || passedQty === void 0 || failedQty === void 0) {
      return res.status(400).json({ success: false, message: "grnId, passedQty, and failedQty are required." });
    }
    let workflow = await procurementWorkflow_model_default.findOne({ grnId });
    let mrReferenceId = "MR-REF";
    let actualMrId = materialRequestId;
    if (workflow) {
      mrReferenceId = workflow.materialReferenceId;
      actualMrId = workflow.materialRequestId;
    }
    const mr = await material_model_default.findById(actualMrId);
    const totalQty = Number(passedQty) + Number(failedQty);
    const qcId = "QC-2026-" + Math.floor(1e3 + Math.random() * 9e3);
    const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    let resultVal = "Pass";
    if (passedQty === 0) resultVal = "Fail";
    else if (failedQty > 0) resultVal = "Partial";
    const inspection = await qcInspection_model_default.create({
      qcId,
      grnId,
      poId: workflow?.poId || mr?.linkedPoId || "",
      vendorName: workflow?.selectedVendor?.vendorName || mr?.requester || "Vendor",
      itemName: mr?.productDetails || "Product",
      receivedQty: totalQty,
      passedQty: Number(passedQty),
      failedQty: Number(failedQty),
      status: "Completed",
      result: resultVal,
      inspector: inspector || userName,
      notes: notes || "QC Verification audit passed.",
      inspectedDate: today
    });
    await writeAudit2({
      userId,
      userName,
      transactionId: qcId,
      moduleName: "RFQ",
      // we will use general/audit mapping
      actionPerformed: `QC Inspection ${qcId} performed for GRN ${grnId}. Status: ${resultVal}. Passed: ${passedQty}, Failed: ${failedQty}.`,
      previousStatus: "Pending QC Inspection",
      newStatus: resultVal === "Pass" ? "Passed" : resultVal === "Partial" ? "Partial" : "Failed",
      materialRequestId: actualMrId
    });
    let inventoryUpdated = false;
    if (passedQty > 0) {
      const productName = (mr?.productDetails || workflow?.productDetails || "Product").trim();
      let productItem = await ProductMenu.findOne({
        name: { $regex: new RegExp(`^\\s*${productName}\\s*$`, "i") }
      });
      if (productItem) {
        productItem.stock = (productItem.stock ?? 0) + Number(passedQty);
        await productItem.save();
        inventoryUpdated = true;
      } else {
        let invItem = await inventory_model_default.findOne({
          itemName: { $regex: new RegExp(`^\\s*${productName}\\s*$`, "i") }
        });
        if (invItem) {
          invItem.stockQuantity += Number(passedQty);
          if (invItem.stockQuantity <= 0) invItem.status = "Out of Stock";
          else if (invItem.stockQuantity < 10) invItem.status = "Low Stock";
          else invItem.status = "In Stock";
          await invItem.save();
          inventoryUpdated = true;
        } else {
          await ProductMenu.create({
            name: productName,
            category: "Hardware",
            unit: "pcs",
            price: 45e3,
            stock: Number(passedQty)
          });
          inventoryUpdated = true;
        }
      }
      await writeAudit2({
        userId,
        userName,
        transactionId: qcId,
        moduleName: "Inventory",
        actionPerformed: `Inventory stock updated: +${passedQty} units of "${productName}" added to system stock after QC verification.`,
        previousStatus: "GRN Created",
        newStatus: "Inventory Updated",
        materialRequestId: actualMrId
      });
      const prefix = productName.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, "ITM");
      const generatedBarcodes = [];
      for (let i = 1; i <= Number(passedQty); i++) {
        const barcodeNum = `${prefix}-2026-${String(Math.floor(1e3 + Math.random() * 9e3))}-${String(i).padStart(3, "0")}`;
        const bRecord = await barcode_model_default.create({
          barcodeNumber: barcodeNum,
          productCode: prefix + "-CODE",
          productName,
          category: "Hardware",
          grnId,
          vendorName: workflow?.selectedVendor?.vendorName || "Vendor",
          storageLocation: "Warehouse A - Shelf " + Math.floor(1 + Math.random() * 5),
          status: "QC Approved",
          movementHistory: [
            {
              action: "Initial Barcode Generation & Reception after QC Approval",
              user: inspector || userName,
              previousStatus: "Received",
              newStatus: "QC Approved"
            }
          ]
        });
        generatedBarcodes.push(barcodeNum);
      }
    }
    let rtvRecord = null;
    if (failedQty > 0) {
      const rtvNumber = "RTV-2026-" + Math.floor(1e3 + Math.random() * 9e3);
      rtvRecord = await rtv_model_default.create({
        rtvNumber,
        qcId,
        grnId,
        poNumber: workflow?.poId || mr?.linkedPoId || "",
        vendorName: workflow?.selectedVendor?.vendorName || "Vendor",
        itemName: mr?.productDetails || "Product",
        rejectedQuantity: Number(failedQty),
        reason: notes || "Transit packaging damage or physical checklist discrepancy",
        createdDate: today,
        status: "Pending Approval"
      });
      await writeAudit2({
        userId,
        userName,
        transactionId: rtvNumber,
        moduleName: "Procurement",
        actionPerformed: `RTV record ${rtvNumber} auto-created for return of ${failedQty} rejected units to ${workflow?.selectedVendor?.vendorName || "Vendor"}.`,
        previousStatus: "QC Failed",
        newStatus: "Pending Approval",
        materialRequestId: actualMrId
      });
    }
    if (workflow) {
      workflow.grnStatus = "QC Completed";
      workflow.inventoryUpdated = true;
      workflow.workflowStatus = "Inventory Updated";
      await workflow.save();
    }
    if (mr) {
      mr.status = "Inventory Updated";
      mr.linkedGrnId = grnId;
      await mr.save();
    }
    return res.status(200).json({
      success: true,
      message: "QC Inspection finalized successfully.",
      data: {
        inspection,
        rtvRecord,
        inventoryUpdated
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
var getRtvRecords = async (req, res) => {
  try {
    const records = await rtv_model_default.find().sort({ createdAt: -1 });
    return res.status(200).json({ success: true, count: records.length, data: records });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
var updateRtvStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, remarks, userName = "Procurement Manager", userId = "system" } = req.body;
    const rtv = await rtv_model_default.findById(id);
    if (!rtv) return res.status(404).json({ success: false, message: "RTV record not found." });
    const prevStatus = rtv.status;
    rtv.status = status;
    if (remarks) rtv.remarks = remarks;
    await rtv.save();
    await writeAudit2({
      userId,
      userName,
      transactionId: rtv.rtvNumber,
      moduleName: "Procurement",
      actionPerformed: `RTV ${rtv.rtvNumber} status changed from "${prevStatus}" to "${status}". Remarks: ${remarks || "None"}`,
      previousStatus: prevStatus,
      newStatus: status
    });
    return res.status(200).json({ success: true, message: "RTV record updated successfully.", data: rtv });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
var getBarcodes = async (req, res) => {
  try {
    const barcodes = await barcode_model_default.find().sort({ createdAt: -1 });
    return res.status(200).json({ success: true, count: barcodes.length, data: barcodes });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
var getBarcodeByCode = async (req, res) => {
  try {
    const { code } = req.params;
    const barcode = await barcode_model_default.findOne({ barcodeNumber: code });
    if (!barcode) return res.status(404).json({ success: false, message: "Barcode not found." });
    return res.status(200).json({ success: true, data: barcode });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
var assignAsset = async (req, res) => {
  try {
    const { barcodeNumber, employeeName, department, userName = "Admin", userId = "system" } = req.body;
    const barcode = await barcode_model_default.findOne({ barcodeNumber });
    if (!barcode) return res.status(404).json({ success: false, message: "Asset barcode not found." });
    const prevStatus = barcode.status;
    const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    barcode.status = "Assigned";
    barcode.employeeName = employeeName;
    barcode.department = department;
    barcode.issueDate = today;
    barcode.returnDate = "";
    barcode.movementHistory.push({
      action: `Assigned to ${employeeName} (Dept: ${department})`,
      user: userName,
      previousStatus: prevStatus,
      newStatus: "Assigned"
    });
    await barcode.save();
    await writeAudit2({
      userId,
      userName,
      transactionId: barcodeNumber,
      moduleName: "Material Issue",
      actionPerformed: `Asset serialization barcode ${barcodeNumber} assigned to employee "${employeeName}" (Dept: ${department})`,
      previousStatus: prevStatus,
      newStatus: "Assigned"
    });
    return res.status(200).json({ success: true, message: `Asset ${barcodeNumber} successfully assigned to ${employeeName}.`, data: barcode });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
var returnAsset = async (req, res) => {
  try {
    const { barcodeNumber, userName = "Admin", userId = "system" } = req.body;
    const barcode = await barcode_model_default.findOne({ barcodeNumber });
    if (!barcode) return res.status(404).json({ success: false, message: "Asset barcode not found." });
    const prevStatus = barcode.status;
    const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    barcode.status = "Available";
    barcode.returnDate = today;
    barcode.movementHistory.push({
      action: `Returned by ${barcode.employeeName}`,
      user: userName,
      previousStatus: prevStatus,
      newStatus: "Available"
    });
    const oldEmployeeName = barcode.employeeName;
    barcode.employeeName = "";
    barcode.department = "";
    await barcode.save();
    await writeAudit2({
      userId,
      userName,
      transactionId: barcodeNumber,
      moduleName: "Material Request",
      actionPerformed: `Asset serialization barcode ${barcodeNumber} returned by "${oldEmployeeName}". Returned back to stock.`,
      previousStatus: prevStatus,
      newStatus: "Available"
    });
    return res.status(200).json({ success: true, message: `Asset ${barcodeNumber} returned successfully.`, data: barcode });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
var runStockAudit = async (req, res) => {
  try {
    const { scannedBarcodes } = req.body;
    if (!scannedBarcodes || !Array.isArray(scannedBarcodes)) {
      return res.status(400).json({ success: false, message: "scannedBarcodes array is required." });
    }
    const allBarcodes = await barcode_model_default.find();
    const physicalStock = scannedBarcodes.length;
    const systemStock = allBarcodes.length;
    const missingItems = allBarcodes.filter((b) => !scannedBarcodes.includes(b.barcodeNumber));
    const extraItems = scannedBarcodes.filter((code) => !allBarcodes.some((b) => b.barcodeNumber === code));
    return res.status(200).json({
      success: true,
      summary: {
        physicalStock,
        systemStock,
        missingCount: missingItems.length,
        extraCount: extraItems.length
      },
      missingItems,
      extraItems
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// src/routes/qc.routes.ts
var router12 = express12.Router();
router12.get("/inspections", getQCInspections);
router12.post("/inspections/shell", createQCInspectionShell);
router12.post("/inspections/complete", completeQCInspection);
router12.get("/rtv", getRtvRecords);
router12.put("/rtv/:id", updateRtvStatus);
router12.get("/barcodes", getBarcodes);
router12.get("/barcodes/:code", getBarcodeByCode);
router12.post("/assets/assign", assignAsset);
router12.post("/assets/return", returnAsset);
router12.post("/audit", runStockAudit);
var qc_routes_default = router12;

// src/server.ts
var __filename$1 = fileURLToPath(import.meta.url);
var __dirname$1 = path.dirname(__filename$1);
var app = express12();
var publicDir = path.join(__dirname$1, "..", "public");
app.use(express12.static(publicDir));
var server = createServer(app);
app.use(response_middleware_default);
app.use(express12.json());
app.use(express12.urlencoded({ extended: true }));
app.use(cookieParser());
applyCores({ app });
var initialize = () => {
  db_config_default();
};
initialize();
server_config_default({ server });
app.get("/", (_, res) => {
  res.sendFile(path.join(__dirname$1, "../public/starter.html"));
});
app.set("trust proxy", true);
app.use(requestContextMiddleware);
app.use(accessLoggerMiddleware);
app.use("/api", routes_default);
app.use("/api", userdetails_routes_default);
app.use("/api/products", product_routes_default);
app.use("/api/material", material_routes_default);
app.use("/api/vendor", vendor_routes_default);
app.use("/api/purchase-request", purchaseRequest_routes_default);
app.use("/api/inventory", inventory_routes_default);
app.use("/api/productmenu", productmenu_routes_default);
app.use("/api/auth", authRoutes_default);
app.use("/api/settings", settings_routes_default);
app.use("/api/audit-log", auditLog_routes_default);
app.use("/api/procurement", procurement_routes_default);
app.use("/api/qc", qc_routes_default);
app.use("/api/employees", employeeRoutes_default);
app.use(notFoundMiddleware);
app.use(errorHandler);

export { app, server };
