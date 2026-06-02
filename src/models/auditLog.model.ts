import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      default: "system",
    },
    userName: {
      type: String,
      required: true,
      default: "System",
    },
    transactionId: {
      type: String,
      required: true, // MR ref, PR id, PO id, GRN id, etc.
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
        "System",
      ],
    },
    actionPerformed: {
      type: String,
      required: true,
    },
    previousStatus: {
      type: String,
      default: "",
    },
    newStatus: {
      type: String,
      default: "",
    },
    // Optional reference to the source Material Request for quick filtering
    materialRequestId: {
      type: String,
      default: "",
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

// Index for fast lookup by transactionId and materialRequestId
auditLogSchema.index({ transactionId: 1 });
auditLogSchema.index({ materialRequestId: 1 });
auditLogSchema.index({ moduleName: 1 });

export default mongoose.model("AuditLog", auditLogSchema);
