import mongoose from "mongoose";

const materialSchema = new mongoose.Schema(
  {
    referenceId: {
      type: String,
      required: true,
      trim: true,
    },
    date: {
      type: String,
      required: true,
    },
    requester: {
      type: String,
      required: true,
      trim: true,
    },
    department: {
      type: String,
      required: true,
    },
    productDetails: {
      type: String,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
    },
    priority: {
      type: String,
      enum: ["Low", "Medium", "High", "Urgent"],
      default: "Low",
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
        "Procurement Completed",
      ],
      default: "Pending",
    },

    // ✅ Procurement Reference Links
    linkedPrId:  { type: String, default: "" },
    linkedRfqId: { type: String, default: "" },
    linkedPoId:  { type: String, default: "" },
    linkedGrnId: { type: String, default: "" },
    issuedQty:   { type: Number, default: 0 },
    stockAvailableAtApproval: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model("Material", materialSchema);