import mongoose from "mongoose";

const movementHistorySchema = new mongoose.Schema(
  {
    action: { type: String, required: true },
    user: { type: String, required: true },
    previousStatus: { type: String, default: "" },
    newStatus: { type: String, default: "" },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const barcodeSchema = new mongoose.Schema(
  {
    barcodeNumber: { type: String, required: true, unique: true },
    productCode: { type: String, default: "" },
    productName: { type: String, required: true },
    category: { type: String, default: "General" },
    grnId: { type: String, default: "" },
    vendorName: { type: String, default: "" },
    storageLocation: { type: String, default: "Main Warehouse - Rack 1" },
    status: {
      type: String,
      enum: ["Generated", "Received", "QC Approved", "Stored", "Issued", "Assigned", "Returned", "Available"],
      default: "Generated",
    },
    // Asset assignment properties
    employeeName: { type: String, default: "" },
    department: { type: String, default: "" },
    issueDate: { type: String, default: "" },
    returnDate: { type: String, default: "" },
    movementHistory: [movementHistorySchema],
  },
  { timestamps: true }
);

export default mongoose.model("Barcode", barcodeSchema);
