import express from "express";
import {
  getWorkflowByMR,
  getAllWorkflows,
  createRFQ,
  submitQuotation,
  selectVendor,
  createPO,
  createGRN,
  completeStockIssue,
} from "../controllers/procurement.controller.js";

const router = express.Router();

router.get("/workflows", getAllWorkflows);
router.get("/workflow/:mrId", getWorkflowByMR);
router.post("/rfq", createRFQ);
router.post("/quotation", submitQuotation);
router.put("/select-vendor", selectVendor);
router.post("/po", createPO);
router.post("/grn", createGRN);
router.put("/issue", completeStockIssue);

export default router;
