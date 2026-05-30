import { purchaseRequest_model_default } from './chunk-VRZGGLIO.js';
import cookieParser from 'cookie-parser';
import express8, { Router } from 'express';
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
var router = express8.Router();
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
var router2 = express8.Router();
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
    // ✅ FINAL STATUS ENUM (includes approval workflow states)
    status: {
      type: String,
      enum: [
        "Pending",
        "Approved",
        "Rejected",
        "Completed",
        "Procurement Required",
        "PO Created",
        "Procurement Completed"
      ],
      default: "Pending"
    }
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
var deleteMaterial = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await material_model_default.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: "Material request not found" });
    }
    try {
      const PurchaseRequest = (await import('./purchaseRequest.model-CX7SN3Y4.js')).default;
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
var router3 = express8.Router();
router3.post("/", createMaterial);
router3.get("/", getMaterials);
router3.put("/:id/approve", approveMaterial);
router3.put("/:id/reject", rejectMaterial);
router3.put("/:id/complete", completeMaterial);
router3.put("/:id/procurement-required", procurementRequired);
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
var router5 = express8.Router();
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
var router6 = express8.Router();
router6.post("/register", createEmployee);
router6.post("/verify-otp", verifyEmployeeOtp);
router6.post("/send-invite", sendInvite);
router6.get("/verify-token", verifyToken);
router6.post("/set-password", setPassword);
router6.post("/set-password/:token", setPassword);
var employeeRoutes_default = router6;

// src/controllers/purchaseRequest.controller.ts
var createPurchaseRequest = async (req, res) => {
  try {
    const { department, vendor, products, requestedBy, deliveryAddress, notes, priority } = req.body;
    if (!department || !vendor || !products || !Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ success: false, message: "Department, vendor, and products are required." });
    }
    const totalAmount = products.reduce((acc, prod) => {
      const qty = Number(prod.quantity) || 0;
      const prc = Number(prod.price) || 0;
      return acc + qty * prc;
    }, 0);
    const newRequest = await purchaseRequest_model_default.create({
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
var router7 = express8.Router();
router7.post("/create", createPurchaseRequest);
router7.get("/get", getAllPurchaseRequests);
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
    const item = await inventory_model_default.findOne({
      itemName: { $regex: new RegExp(`^${itemName}$`, "i") }
    });
    if (!item) {
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
      stock: item.stockQuantity,
      itemName: item.itemName,
      status: item.status,
      data: item
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
    const item = await inventory_model_default.findById(id);
    if (!item) {
      return res.status(404).json({ success: false, message: "Inventory item not found" });
    }
    if (item.stockQuantity < deductQty) {
      return res.status(400).json({
        success: false,
        message: "Insufficient stock to deduct",
        available: item.stockQuantity
      });
    }
    item.stockQuantity -= deductQty;
    item.status = getStockStatus(item.stockQuantity);
    await item.save();
    res.status(200).json({
      success: true,
      message: `Stock deducted by ${deductQty}. Remaining: ${item.stockQuantity}`,
      data: item
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
var router8 = express8.Router();
router8.post("/create", createInventoryItem);
router8.get("/get", getAllInventoryItems);
router8.get("/check-stock/:itemName", checkStock);
router8.put("/deduct-stock/:id", deductStock);
router8.put("/:id", updateInventoryItem);
router8.delete("/:id", deleteInventoryItem);
var inventory_routes_default = router8;

// src/server.ts
var __filename$1 = fileURLToPath(import.meta.url);
var __dirname$1 = path.dirname(__filename$1);
var app = express8();
var publicDir = path.join(__dirname$1, "..", "public");
app.use(express8.static(publicDir));
var server = createServer(app);
app.use(response_middleware_default);
app.use(express8.json());
app.use(express8.urlencoded({ extended: true }));
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
app.use("/api/employees", employeeRoutes_default);
app.use(notFoundMiddleware);
app.use(errorHandler);

export { app, server };
