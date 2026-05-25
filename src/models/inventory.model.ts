import mongoose from "mongoose";

const inventorySchema = new mongoose.Schema(
  {
    itemName: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      required: true,
      default: "General",
    },
    stockQuantity: {
      type: Number,
      required: true,
      default: 0,
    },
    price: {
      type: Number,
      required: true,
      default: 0,
    },
    warehouse: {
      type: String,
      required: true,
      default: "Main Warehouse",
    },
    supplier: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      required: true,
      enum: ["In Stock", "Out of Stock", "Low Stock"],
      default: "In Stock",
    }
  },
  { timestamps: true }
);

export default mongoose.model("Inventory", inventorySchema);
