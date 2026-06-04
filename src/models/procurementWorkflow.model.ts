import mongoose from "mongoose";

const quotationSchema = new mongoose.Schema({
  quotationId: { type: String, default: "" },      // e.g. QT-2026-001
  vendorName: { type: String, required: true },
  vendorContact: { type: String, default: "" },
  vendorAddress: { type: String, default: "" },
  unitPrice: { type: Number, required: true },
  totalAmount: { type: Number, required: true },
  deliveryDays: { type: Number, default: 7 },
  warranty: { type: String, default: "" },
  paymentTerms: { type: String, default: "Net 30" },
  notes: { type: String, default: "" },
  submittedAt: { type: Date, default: Date.now },
  vendorStatus: {
    type: String,
    enum: ["Active", "Inactive", "Blacklisted"],
    default: "Active",
  },
  selectionStatus: {
    type: String,
    enum: ["Pending", "Selected", "Rejected"],
    default: "Pending",
  },
}, { _id: false });

const procurementWorkflowSchema = new mongoose.Schema(
  {
    // ── Source Reference ──
    materialRequestId: {
      type: String,
      required: true,
      index: true,
    },
    materialReferenceId: {
      type: String,
      required: true, // e.g. "MR-2026-005"
    },
    productDetails: { type: String, required: true },
    requestedQty: { type: Number, required: true },
    stockAtApproval: { type: Number, default: 0 },
    shortageQty: { type: Number, default: 0 }, // = requestedQty - stockAtApproval

    // ── Purchase Requisition ──
    prId: { type: String, default: "" },        // PR-2026-XXX
    prStatus: {
      type: String,
      enum: ["Auto-Generated", "Approved", "Rejected"],
      default: "Auto-Generated",
    },

    // ── RFQ ──
    rfqId: { type: String, default: "" },
    rfqStatus: {
      type: String,
      enum: ["Not Created", "Draft", "Sent to Vendors", "Closed"],
      default: "Not Created",
    },
    rfqVendors: [{ type: String }],
    rfqCreatedAt: { type: Date },
    rfqResponseDeadline: { type: Date },

    // ── Quotations ──
    quotations: [quotationSchema],
    vendorQuotationNumber: { type: String, default: "" }, // last/selected quotation ref

    // ── Vendor Selection ──
    selectedVendor: {
      vendorName: { type: String, default: "" },
      vendorContact: { type: String, default: "" },
      vendorAddress: { type: String, default: "" },
      unitPrice: { type: Number, default: 0 },
      paymentTerms: { type: String, default: "" },
      deliveryDays: { type: Number, default: 7 },
    },

    // ── Purchase Order ──
    poId: { type: String, default: "" },
    poStatus: {
      type: String,
      enum: ["Not Created", "Draft", "Approved", "Sent to Vendor", "Closed"],
      default: "Not Created",
    },
    poAmount: { type: Number, default: 0 },
    poExpectedDelivery: { type: String, default: "" },
    poApprovedBy: { type: String, default: "" },
    poCreationDate: { type: Date },             // ← NEW: when PO was created

    // ── Procurement Metadata ──
    procurementOfficer: { type: String, default: "" },  // ← NEW: officer name
    approvalDate: { type: Date },                        // ← NEW: when vendor was selected/approved

    // ── GRN ──
    grnId: { type: String, default: "" },
    grnStatus: {
      type: String,
      enum: ["Not Created", "Pending QC", "QC Completed", "Inventory Updated"],
      default: "Not Created",
    },
    grnReceivedQty: { type: Number, default: 0 },
    grnReceivedBy: { type: String, default: "" },
    grnReceivedDate: { type: String, default: "" },
    grnConditionNotes: { type: String, default: "" },
    inventoryUpdated: { type: Boolean, default: false },

    // ── Stock Issue (final step) ──
    stockIssued: { type: Boolean, default: false },
    issuedQty: { type: Number, default: 0 },
    issuedBy: { type: String, default: "" },
    issuedAt: { type: Date },

    // ── Overall workflow status ──
    workflowStatus: {
      type: String,
      enum: [
        "Procurement Required",
        "PR Created",
        "RFQ Created",
        "Quotations Received",
        "Vendor Selected",
        "PO Created",
        "PO Approved",
        "Material Received",
        "GRN Completed",
        "Inventory Updated",
        "Ready For Issue",
        "Stock Issued",
        "Completed",
      ],
      default: "Procurement Required",
    },
  },
  { timestamps: true }
);

export default mongoose.model("ProcurementWorkflow", procurementWorkflowSchema);
