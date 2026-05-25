import express from "express";
import { 
  createVendor, 
  getVendor, 
  getVendorById, 
  updateVendor, 
  deleteVendor 
} from "../controllers/vendor.controllers.js";

const router = express.Router();

// ✅ Vendor API Endpoints
router.post("/create", createVendor);
router.get("/get", getVendor);
router.get("/:id", getVendorById);
router.put("/:id", updateVendor);
router.delete("/:id", deleteVendor);

export default router;