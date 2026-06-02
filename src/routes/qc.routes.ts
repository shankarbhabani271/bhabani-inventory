import express from "express";
import {
  getQCInspections,
  createQCInspectionShell,
  completeQCInspection,
  getRtvRecords,
  updateRtvStatus,
  getBarcodes,
  getBarcodeByCode,
  assignAsset,
  returnAsset,
  runStockAudit,
} from "../controllers/qc.controller.js";

const router = express.Router();

// QC Inspections Routing
router.get("/inspections", getQCInspections);
router.post("/inspections/shell", createQCInspectionShell);
router.post("/inspections/complete", completeQCInspection);

// RTV (Return to Vendor) Routing
router.get("/rtv", getRtvRecords);
router.put("/rtv/:id", updateRtvStatus);

// Barcode & Asset Tracking Routing
router.get("/barcodes", getBarcodes);
router.get("/barcodes/:code", getBarcodeByCode);
router.post("/assets/assign", assignAsset);
router.post("/assets/return", returnAsset);

// Audit Routing
router.post("/audit", runStockAudit);

export default router;
