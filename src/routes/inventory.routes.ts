import express from "express";
import { 
  createInventoryItem, 
  getAllInventoryItems, 
  updateInventoryItem, 
  deleteInventoryItem 
} from "../controllers/inventory.controller.js";

const router = express.Router();

// ✅ Inventory Management Routing Endpoints
router.post("/create", createInventoryItem);
router.get("/get", getAllInventoryItems);
router.put("/:id", updateInventoryItem);
router.delete("/:id", deleteInventoryItem);

export default router;
