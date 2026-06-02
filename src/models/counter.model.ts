import mongoose from "mongoose";

/**
 * Counter model for auto-generating serial IDs.
 * Tracks the last used sequence number per prefix (PR, PO, GRN, RFQ) and year.
 *
 * Usage:
 *   const counter = await Counter.findOneAndUpdate(
 *     { prefix: "PR", year: 2026 },
 *     { $inc: { seq: 1 } },
 *     { upsert: true, new: true }
 *   );
 *   const id = `PR-2026-${String(counter.seq).padStart(3, "0")}`;  // "PR-2026-001"
 */
const counterSchema = new mongoose.Schema(
  {
    prefix: {
      type: String,
      required: true,
      trim: true,
    },
    year: {
      type: Number,
      required: true,
    },
    seq: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// Ensure each prefix+year combination is unique
counterSchema.index({ prefix: 1, year: 1 }, { unique: true });

export const Counter = mongoose.model("Counter", counterSchema);

/**
 * Helper function to generate the next serial ID for a given prefix.
 * IDs are year-wise sequential and never reused after deletion.
 *
 * @param prefix  "PR" | "PO" | "GRN" | "RFQ"
 * @returns       e.g. "PR-2026-001", "PO-2026-042"
 */
export const generateSerialId = async (prefix: string): Promise<string> => {
  const year = new Date().getFullYear();
  const counter = await Counter.findOneAndUpdate(
    { prefix, year },
    { $inc: { seq: 1 } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  const seq = counter?.seq ?? 1;
  return `${prefix}-${year}-${String(seq).padStart(3, "0")}`;
};
