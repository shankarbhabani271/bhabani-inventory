import express from "express";
import { 
  createPurchaseRequest, 
  getAllPurchaseRequests, 
  updatePurchaseRequestStatus, 
  deletePurchaseRequest 
} from "../controllers/purchaseRequest.controller.js";

const router = express.Router();

// ✅ Purchase Requests Routing Endpoints
router.post("/create", createPurchaseRequest);
router.get("/get", getAllPurchaseRequests);
router.put("/status/:id", updatePurchaseRequestStatus);
router.delete("/:id", deletePurchaseRequest);

export default router;
