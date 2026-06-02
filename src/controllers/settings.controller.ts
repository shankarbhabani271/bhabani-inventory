import { Request, Response } from "express";
import { SettingsModel } from "../models/settings.model.js";

// GET settings (auto-seed if not present)
export const getSettings = async (req: Request, res: Response) => {
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
        dateFormat: "DD/MM/YYYY"
      });
    }
    return res.status(200).json({
      success: true,
      data: settings
    });
  } catch (error: any) {
    console.error("GET SETTINGS ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve settings.",
      error: error.message
    });
  }
};

// PUT / UPDATE settings
export const updateSettings = async (req: Request, res: Response) => {
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

    // --- Validation Rules ---
    // 1. Organization Name: Required, min 3 characters
    if (!orgName || typeof orgName !== "string" || orgName.trim().length < 3) {
      return res.status(400).json({
        success: false,
        message: "Failed to save settings. Organization Name must be at least 3 characters."
      });
    }

    // 2. Contact Email: Required, valid email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!contactEmail || typeof contactEmail !== "string" || !emailRegex.test(contactEmail.trim())) {
      return res.status(400).json({
        success: false,
        message: "Failed to save settings. Please provide a valid Contact Email."
      });
    }

    // 3. Phone Number: Required, must contain valid digits
    const phoneRegex = /^\+?[0-9\s\-()]{7,20}$/;
    if (!phone || typeof phone !== "string" || !phoneRegex.test(phone.trim())) {
      return res.status(400).json({
        success: false,
        message: "Failed to save settings. Please provide a valid Phone Number containing digits."
      });
    }

    // 4. Address: Required
    if (!address || typeof address !== "string" || address.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Failed to save settings. Address is required."
      });
    }

    // 5. Time Zone: Required
    if (!timezone || typeof timezone !== "string" || timezone.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Failed to save settings. Time Zone is required."
      });
    }

    // 6. Currency: Required
    if (!currency || typeof currency !== "string" || currency.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Failed to save settings. Currency is required."
      });
    }

    // 7. Date Format: Required
    if (!dateFormat || typeof dateFormat !== "string" || dateFormat.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Failed to save settings. Date Format is required."
      });
    }

    // Find and update or create
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
  } catch (error: any) {
    console.error("UPDATE SETTINGS ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to save settings. Please try again.",
      error: error.message
    });
  }
};
