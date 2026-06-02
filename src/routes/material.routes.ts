import express from "express";
import {
  createMaterial,
  getMaterials,
  approveMaterial,
  rejectMaterial,
  completeMaterial,
  procurementRequired,
  poCreated,
  updateStatus,
  deleteMaterial,
} from "../controllers/material.controller.js";

const router = express.Router();

router.post("/", createMaterial);
router.get("/", getMaterials);
router.put("/:id/approve", approveMaterial);
router.put("/:id/reject", rejectMaterial);
router.put("/:id/complete", completeMaterial);
router.put("/:id/procurement-required", procurementRequired);
router.put("/:id/po-created", poCreated);
router.put("/:id/status", updateStatus);
router.delete("/:id", deleteMaterial);

export default router;