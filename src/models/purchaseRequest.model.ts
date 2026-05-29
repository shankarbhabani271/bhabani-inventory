import mongoose from "mongoose";

const purchaseRequestSchema = new mongoose.Schema(
  {
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
