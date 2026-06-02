import express from "express";
import {
  createAuditLog,
  getAuditLogs,
  getAuditLogsByMR,
  clearAuditLogs,
} from "../controllers/auditLog.controller.js";

const router = express.Router();

router.post("/", createAuditLog);
router.get("/", getAuditLogs);
router.get("/mr/:mrId", getAuditLogsByMR);
router.delete("/clear", clearAuditLogs);

export default router;
