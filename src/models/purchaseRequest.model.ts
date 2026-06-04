import mongoose from "mongoose";

const vendorQuotationSummarySchema = new mongoose.Schema({
  vendorName: { type: String, default: "" },
  quotationAmount: { type: Number, default: 0 },
  quotationDate: { type: String, default: "" },
  vendorStatus: { type: String, default: "Active" },
  selectionStatus: {
    type: String,
    enum: ["Pending", "Selected", "Rejected"],
    default: "Pending",
  },
}, { _id: false });

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
    },

    // ── Procurement Traceability Fields (NEW) ──
    rfqNumber: {
      type: String,
      default: "",           // e.g. "RFQ-2026-001"
    },
    poNumber: {
      type: String,
      default: "",           // e.g. "PO-2026-001" — auto-filled when PO is created
    },
    vendorQuotationNumber: {
      type: String,
      default: "",           // e.g. "QT-2026-001"
    },
    procurementOfficer: {
      type: String,
      default: "",
    },
    approvalDate: {
      type: Date,
    },
    procurementStage: {
      type: String,
      enum: [
        "PR Created",
        "RFQ Created",
        "Quotations Received",
        "Vendor Selected",
        "PO Created",
        "GRN Created",
        "Completed",
        "",
      ],
      default: "",
    },
    // All vendor quotations for this PR (populated as quotations are submitted)
    vendorQuotations: [vendorQuotationSummarySchema],

    // Approved vendor details (populated when vendor is selected)
    approvedVendorName: { type: String, default: "" },
    approvedVendorAmount: { type: Number, default: 0 },
    approvedVendorDate: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.model("PurchaseRequest", purchaseRequestSchema);
