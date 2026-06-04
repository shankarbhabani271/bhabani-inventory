import { Request, Response } from "express";
import { SettingsModel } from "../models/settings.model.js";
import multer from "multer";
import path from "node:path";
import fs from "node:fs";

// ─── Ensure uploads directory exists ───────────────────────────────────────
const uploadDir = path.join(process.cwd(), "public/uploads/logos");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB

// ─── Multer storage ─────────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `org-logo-${Date.now()}${ext}`);
  },
});

export const logoUpload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("INVALID_FILE_TYPE"));
    }
  },
}).single("logo");

// ─── GET settings ───────────────────────────────────────────────────────────
export const getSettings = async (_req: Request, res: Response) => {
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
        currency: "INR (₹)",
        dateFormat: "DD/MM/YYYY",
        logoUrl: "",
      });
    }
    return res.status(200).json({
      success: true,
      data: settings,
    });
  } catch (error: any) {
    console.error("GET SETTINGS ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve settings.",
      error: error.message,
    });
  }
};

// ─── PUT / UPDATE settings ──────────────────────────────────────────────────
export const updateSettings = async (req: Request, res: Response) => {
  try {
    const { orgName, contactEmail, industryType, phone, address, timezone, currency, dateFormat } =
      req.body;

    // 1. Organization Name
    if (!orgName || typeof orgName !== "string" || orgName.trim().length < 3) {
      return res.status(400).json({
        success: false,
        message: "Failed to save settings. Organization Name must be at least 3 characters.",
      });
    }

    // 2. Contact Email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!contactEmail || typeof contactEmail !== "string" || !emailRegex.test(contactEmail.trim())) {
      return res.status(400).json({
        success: false,
        message: "Failed to save settings. Please provide a valid Contact Email.",
      });
    }

    // 3. Phone Number
    const phoneRegex = /^\+?[0-9\s\-()]{7,20}$/;
    if (!phone || typeof phone !== "string" || !phoneRegex.test(phone.trim())) {
      return res.status(400).json({
        success: false,
        message: "Failed to save settings. Please provide a valid Phone Number containing digits.",
      });
    }

    // 4. Address
    if (!address || typeof address !== "string" || address.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Failed to save settings. Address is required.",
      });
    }

    // 5. Time Zone
    if (!timezone || typeof timezone !== "string" || timezone.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Failed to save settings. Time Zone is required.",
      });
    }

    // 6. Currency
    if (!currency || typeof currency !== "string" || currency.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Failed to save settings. Currency is required.",
      });
    }

    // 7. Date Format
    if (!dateFormat || typeof dateFormat !== "string" || dateFormat.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Failed to save settings. Date Format is required.",
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
      data: settings,
    });
  } catch (error: any) {
    console.error("UPDATE SETTINGS ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to save settings. Please try again.",
      error: error.message,
    });
  }
};

// ─── POST /upload-logo ───────────────────────────────────────────────────────
export const uploadLogo = async (req: Request, res: Response) => {
  logoUpload(req, res, async (err: any) => {
    // Multer-level errors (size / type)
    if (err) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ success: false, message: "Maximum file size allowed is 2 MB." });
      }
      if (err.message === "INVALID_FILE_TYPE") {
        return res.status(400).json({ success: false, message: "Only PNG, JPG, JPEG and SVG image files are allowed." });
      }
      return res.status(400).json({ success: false, message: err.message || "Upload failed." });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file provided." });
    }

    try {
      // Build the public URL for the stored file
      const logoUrl = `/uploads/logos/${req.file.filename}`;

      // Find settings doc (or create)
      let settings = await SettingsModel.findOne();
      if (!settings) {
        settings = new SettingsModel();
      }

      // Remove old logo file from disk (if any)
      if (settings.logoUrl) {
        const oldPath = path.join(process.cwd(), "public", settings.logoUrl);
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }

      settings.logoUrl = logoUrl;
      settings.logoVersion = Date.now();
      await settings.save();

      return res.status(200).json({
        success: true,
        message: "Logo uploaded successfully.",
        logoUrl: settings.logoUrl,
        logoVersion: settings.logoVersion,
        updatedAt: settings.updatedAt,
        data: {
          logoUrl: settings.logoUrl,
          logoVersion: settings.logoVersion,
          updatedAt: settings.updatedAt,
        },
      });
    } catch (error: any) {
      console.error("UPLOAD LOGO ERROR:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to save logo. Please try again.",
        error: error.message,
      });
    }
  });
};

// ─── DELETE /remove-logo ─────────────────────────────────────────────────────
export const removeLogo = async (_req: Request, res: Response) => {
  try {
    const settings = await SettingsModel.findOne();
    if (!settings) {
      return res.status(404).json({ success: false, message: "Settings not found." });
    }

    // Delete file from disk
    if (settings.logoUrl) {
      const filePath = path.join(process.cwd(), "public", settings.logoUrl);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    settings.logoUrl = "";
    settings.logoVersion = 0;
    await settings.save();

    return res.status(200).json({
      success: true,
      message: "Logo removed successfully.",
      logoUrl: "",
      logoVersion: 0,
      updatedAt: settings.updatedAt,
      data: { logoUrl: "", logoVersion: 0, updatedAt: settings.updatedAt },
    });
  } catch (error: any) {
    console.error("REMOVE LOGO ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to remove logo.",
      error: error.message,
    });
  }
};
