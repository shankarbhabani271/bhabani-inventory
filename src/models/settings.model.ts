import mongoose, { Schema } from "mongoose";

const settingsSchema = new Schema(
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
      default: "INR (₹)"
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

export const SettingsModel = mongoose.model("Settings", settingsSchema);
