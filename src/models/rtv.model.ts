import mongoose from "mongoose";

const rtvSchema = new mongoose.Schema(
  {
    rtvNumber: { type: String, required: true, unique: true },
    qcId: { type: String, required: true },
    grnId: { type: String, required: true },
    poNumber: { type: String, default: "" },
    vendorName: { type: String, required: true },
    itemName: { type: String, required: true },
    rejectedQuantity: { type: Number, required: true },
    reason: { type: String, required: true },
    createdDate: { type: String, required: true },
    status: {
      type: String,
      enum: ["Pending Approval", "Vendor Notified", "Material Returned", "Replacement Received / Refund Processed", "Completed"],
      default: "Pending Approval",
    },
    remarks: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.model("Rtv", rtvSchema);
