import mongoose from "mongoose";

const qcInspectionSchema = new mongoose.Schema(
  {
    qcId: { type: String, required: true, unique: true },
    grnId: { type: String, required: true },
    poId: { type: String, default: "" },
    vendorName: { type: String, required: true },
    itemName: { type: String, required: true },
    receivedQty: { type: Number, required: true },
    passedQty: { type: Number, required: true },
    failedQty: { type: Number, required: true },
    status: { type: String, enum: ["Pending", "Completed"], default: "Pending" },
    result: { type: String, enum: ["Pass", "Fail", "Partial", "-"], default: "-" },
    inspector: { type: String, default: "" },
    notes: { type: String, default: "" },
    inspectedDate: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.model("QcInspection", qcInspectionSchema);
