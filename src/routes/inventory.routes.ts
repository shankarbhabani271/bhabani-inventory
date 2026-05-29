import express from "express";
import {
  createInventoryItem,
  getAllInventoryItems,
  checkStock,
  deductStock,
  updateInventoryItem,
  deleteInventoryItem,
} from "../controllers/inventory.controller.js";

const router = express.Router();

// ✅ Inventory Management Routes
router.post("/create", createInventoryItem);
router.get("/get", getAllInventoryItems);

// ✅ Stock Check & Deduction (for Approval Workflow)
router.get("/check-stock/:itemName", checkStock);
router.put("/deduct-stock/:id", deductStock);

router.put("/:id", updateInventoryItem);
router.delete("/:id", deleteInventoryItem);

export default router;
