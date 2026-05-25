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
    }
  },
  { timestamps: true }
);

export default mongoose.model("PurchaseRequest", purchaseRequestSchema);
