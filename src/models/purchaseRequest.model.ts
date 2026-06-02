import mongoose from "mongoose";

const purchaseRequestSchema = new mongoose.Schema(
  {
    // ERP-style serial ID: PR-2026-001, PR-2026-002, ...
    requestId: {
      type: String,
      unique: true,
      sparse: true, // allows existing docs without this field
      index: true,
      trim: true,
    },
    department: {
      type: String,
      required: true,
    },
    vendor: {
      type: String,
      required: true,
    },
    products: [
      {
        name: { type: String, required: true },
        quantity: { type: Number, required: true, default: 1 },
        price: { type: Number, required: true, default: 0 },
      }
    ],
    totalAmount: {
      type: Number,
      required: true,
      default: 0,
    },
    status: {
      type: String,
      required: true,
      enum: ["Pending", "Approved", "Rejected", "Completed"],
      default: "Pending",
    },
    requestedBy: {
      type: String,
      required: true,
      default: "Admin",
    },
    approvedBy: {
      type: String,
      default: "",
    },
    deliveryAddress: {
      type: String,
      default: "",
    },
    notes: {
      type: String,
      default: "",
    },
    materialRequestId: {
      type: String,
      default: "",
    },
    priority: {
      type: String,
      enum: ["Low", "Medium", "High"],
      default: "Medium",
    },
    deliveryStatus: {
      type: String,
      enum: ["Pending", "Processing", "Delivered"],
      default: "Pending",
    }
  },
  { timestamps: true }
);

export default mongoose.model("PurchaseRequest", purchaseRequestSchema);
