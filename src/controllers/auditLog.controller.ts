import { Request, Response } from "express";
import AuditLog from "../models/auditLog.model.js";

// ======================
// CREATE AUDIT LOG
// ======================
export const createAuditLog = async (req: Request, res: Response) => {
  try {
    const {
      userId,
      userName,
      transactionId,
      moduleName,
      actionPerformed,
      previousStatus,
      newStatus,
      materialRequestId,
      metadata,
    } = req.body;

    if (!transactionId || !moduleName || !actionPerformed || !userName) {
      return res.status(400).json({
        success: false,
        message: "transactionId, moduleName, actionPerformed, and userName are required.",
      });
    }

    const log = await AuditLog.create({
      userId: userId || "system",
      userName,
      transactionId,
      moduleName,
      actionPerformed,
      previousStatus: previousStatus || "",
      newStatus: newStatus || "",
      materialRequestId: materialRequestId || "",
      metadata: metadata || {},
    });

    return res.status(201).json({ success: true, data: log });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ======================
// GET ALL AUDIT LOGS (with optional filters)
// ======================
export const getAuditLogs = async (req: Request, res: Response) => {
  try {
    const { moduleName, transactionId, limit = 200 } = req.query;
    const filter: any = {};
    if (moduleName) filter.moduleName = moduleName;
    if (transactionId) filter.transactionId = transactionId;

    const logs = await AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .limit(Number(limit));

    return res.status(200).json({ success: true, count: logs.length, data: logs });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ======================
// GET LOGS BY MATERIAL REQUEST ID
// ======================
export const getAuditLogsByMR = async (req: Request, res: Response) => {
  try {
    const { mrId } = req.params;
    const logs = await AuditLog.find({ materialRequestId: mrId }).sort({ createdAt: -1 });
    return res.status(200).json({ success: true, count: logs.length, data: logs });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ======================
// DELETE ALL LOGS (admin utility)
// ======================
export const clearAuditLogs = async (_req: Request, res: Response) => {
  try {
    await AuditLog.deleteMany({});
    return res.status(200).json({ success: true, message: "All audit logs cleared." });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
