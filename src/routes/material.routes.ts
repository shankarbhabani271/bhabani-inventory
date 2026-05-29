import express from "express";
import {
  createMaterial,
  getMaterials,
  approveMaterial,
  rejectMaterial,
  completeMaterial,
  procurementRequired,
} from "../controllers/material.controller.js";

const router = express.Router();

router.post("/", createMaterial);
router.get("/", getMaterials);
router.put("/:id/approve", approveMaterial);
router.put("/:id/reject", rejectMaterial);
router.put("/:id/complete", completeMaterial);
router.put("/:id/procurement-required", procurementRequired);

export default router;