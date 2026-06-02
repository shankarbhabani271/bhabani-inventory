import { Request, Response } from "express";
import QcInspection from "../models/qcInspection.model.js";
import Rtv from "../models/rtv.model.js";
import Barcode from "../models/barcode.model.js";
import AuditLog from "../models/auditLog.model.js";
import Material from "../models/material.model.js";
import ProcurementWorkflow from "../models/procurementWorkflow.model.js";
import { ProductMenu } from "../models/productmenu.model.js";
import Inventory from "../models/inventory.model.js";

// Helper: write audit log
const writeAudit = async (params: {
  userId?: string;
  userName: string;
  transactionId: string;
  moduleName: string;
  actionPerformed: string;
  previousStatus?: string;
  newStatus?: string;
  materialRequestId?: string;
  metadata?: Record<string, any>;
}) => {
  try {
    await AuditLog.create({
      userId: params.userId || "system",
      userName: params.userName,
      transactionId: params.transactionId,
      moduleName: params.moduleName,
      actionPerformed: params.actionPerformed,
      previousStatus: params.previousStatus || "",
      newStatus: params.newStatus || "",
      materialRequestId: params.materialRequestId || "",
      metadata: params.metadata || {},
    });
  } catch (err) {
    console.warn("[AuditLog] Failed to write audit log in QC:", err);
  }
};

// ======================
// QC INSPECTION MODULE
// ======================

// Get all inspections
export const getQCInspections = async (req: Request, res: Response) => {
  try {
    const inspections = await QcInspection.find().sort({ createdAt: -1 });
    return res.status(200).json({ success: true, count: inspections.length, data: inspections });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Create a new inspection shell (usually triggered when GRN is created, if not already completed)
export const createQCInspectionShell = async (req: Request, res: Response) => {
  try {
    const { grnId, poId, vendorName, itemName, receivedQty, materialRequestId } = req.body;
    const qcId = "QC-" + Date.now();
    const shell = await QcInspection.create({
      qcId,
      grnId,
      poId: poId || "",
      vendorName,
      itemName,
      receivedQty: Number(receivedQty),
      passedQty: 0,
      failedQty: 0,
      status: "Pending",
    });

    return res.status(201).json({ success: true, data: shell });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Complete QC Inspection & dynamic stocking & RTV creation
export const completeQCInspection = async (req: Request, res: Response) => {
  try {
    const {
      grnId,
      passedQty,
      failedQty,
      inspector,
      notes,
      userName = "QC Inspector",
      userId = "system",
      materialRequestId,
    } = req.body;

    if (!grnId || passedQty === undefined || failedQty === undefined) {
      return res.status(400).json({ success: false, message: "grnId, passedQty, and failedQty are required." });
    }

    // Find the procurement workflow
    let workflow = await ProcurementWorkflow.findOne({ grnId });
    let mrReferenceId = "MR-REF";
    let actualMrId = materialRequestId;

    if (workflow) {
      mrReferenceId = workflow.materialReferenceId;
      actualMrId = workflow.materialRequestId;
    }

    const mr = await Material.findById(actualMrId);

    const totalQty = Number(passedQty) + Number(failedQty);
    const qcId = "QC-2026-" + Math.floor(1000 + Math.random() * 9000);
    const today = new Date().toISOString().split("T")[0];

    let resultVal: "Pass" | "Fail" | "Partial" = "Pass";
    if (passedQty === 0) resultVal = "Fail";
    else if (failedQty > 0) resultVal = "Partial";

    // 1. Create completed inspection record
    const inspection = await QcInspection.create({
      qcId,
      grnId,
      poId: workflow?.poId || mr?.linkedPoId || "",
      vendorName: workflow?.selectedVendor?.vendorName || mr?.requester || "Vendor",
      itemName: mr?.productDetails || "Product",
      receivedQty: totalQty,
      passedQty: Number(passedQty),
      failedQty: Number(failedQty),
      status: "Completed",
      result: resultVal,
      inspector: inspector || userName,
      notes: notes || "QC Verification audit passed.",
      inspectedDate: today,
    });

    // Write Audit for QC Inspection and QC Approval
    await writeAudit({
      userId,
      userName,
      transactionId: qcId,
      moduleName: "RFQ", // we will use general/audit mapping
      actionPerformed: `QC Inspection ${qcId} performed for GRN ${grnId}. Status: ${resultVal}. Passed: ${passedQty}, Failed: ${failedQty}.`,
      previousStatus: "Pending QC Inspection",
      newStatus: resultVal === "Pass" ? "Passed" : resultVal === "Partial" ? "Partial" : "Failed",
      materialRequestId: actualMrId,
    });

    // 2. Add Passed Quantity to Stock (automated inventory update)
    let inventoryUpdated = false;
    if (passedQty > 0) {
      const productName = (mr?.productDetails || workflow?.productDetails || "Product").trim();
      
      // Try ProductMenu first
      let productItem = await ProductMenu.findOne({
        name: { $regex: new RegExp(`^\\s*${productName}\\s*$`, "i") },
      });

      if (productItem) {
        productItem.stock = (productItem.stock ?? 0) + Number(passedQty);
        await productItem.save();
        inventoryUpdated = true;
      } else {
        // Try Inventory model
        let invItem = await Inventory.findOne({
          itemName: { $regex: new RegExp(`^\\s*${productName}\\s*$`, "i") },
        });
        if (invItem) {
          invItem.stockQuantity += Number(passedQty);
          if (invItem.stockQuantity <= 0) invItem.status = "Out of Stock";
          else if (invItem.stockQuantity < 10) invItem.status = "Low Stock";
          else invItem.status = "In Stock";
          await invItem.save();
          inventoryUpdated = true;
        } else {
          // Create product menu entry
          await ProductMenu.create({
            name: productName,
            category: "Hardware",
            unit: "pcs",
            price: 45000,
            stock: Number(passedQty),
          });
          inventoryUpdated = true;
        }
      }

      // Write Audit for Inventory Update
      await writeAudit({
        userId,
        userName,
        transactionId: qcId,
        moduleName: "Inventory",
        actionPerformed: `Inventory stock updated: +${passedQty} units of "${productName}" added to system stock after QC verification.`,
        previousStatus: "GRN Created",
        newStatus: "Inventory Updated",
        materialRequestId: actualMrId,
      });

      // ────────────────────────────────────────────────────────
      // BARCODE MODULE: Generate barcodes for each passed item
      // ────────────────────────────────────────────────────────
      const prefix = productName.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, "ITM");
      const generatedBarcodes = [];
      for (let i = 1; i <= Number(passedQty); i++) {
        const barcodeNum = `${prefix}-2026-${String(Math.floor(1000 + Math.random() * 9000))}-${String(i).padStart(3, "0")}`;
        const bRecord = await Barcode.create({
          barcodeNumber: barcodeNum,
          productCode: prefix + "-CODE",
          productName: productName,
          category: "Hardware",
          grnId: grnId,
          vendorName: workflow?.selectedVendor?.vendorName || "Vendor",
          storageLocation: "Warehouse A - Shelf " + Math.floor(1 + Math.random() * 5),
          status: "QC Approved",
          movementHistory: [
            {
              action: "Initial Barcode Generation & Reception after QC Approval",
              user: inspector || userName,
              previousStatus: "Received",
              newStatus: "QC Approved",
            },
          ],
        });
        generatedBarcodes.push(barcodeNum);
      }
    }

    // 3. Create RTV Record if Failed Qty > 0
    let rtvRecord = null;
    if (failedQty > 0) {
      const rtvNumber = "RTV-2026-" + Math.floor(1000 + Math.random() * 9000);
      rtvRecord = await Rtv.create({
        rtvNumber,
        qcId,
        grnId,
        poNumber: workflow?.poId || mr?.linkedPoId || "",
        vendorName: workflow?.selectedVendor?.vendorName || "Vendor",
        itemName: mr?.productDetails || "Product",
        rejectedQuantity: Number(failedQty),
        reason: notes || "Transit packaging damage or physical checklist discrepancy",
        createdDate: today,
        status: "Pending Approval",
      });

      // Write Audit for RTV Creation
      await writeAudit({
        userId,
        userName,
        transactionId: rtvNumber,
        moduleName: "Procurement",
        actionPerformed: `RTV record ${rtvNumber} auto-created for return of ${failedQty} rejected units to ${workflow?.selectedVendor?.vendorName || "Vendor"}.`,
        previousStatus: "QC Failed",
        newStatus: "Pending Approval",
        materialRequestId: actualMrId,
      });
    }

    // 4. Update the Procurement Workflow & Material Request status
    if (workflow) {
      workflow.grnStatus = "QC Completed";
      workflow.inventoryUpdated = true;
      workflow.workflowStatus = "Inventory Updated";
      await workflow.save();
    }

    if (mr) {
      mr.status = "Inventory Updated";
      mr.linkedGrnId = grnId;
      await mr.save();
    }

    return res.status(200).json({
      success: true,
      message: "QC Inspection finalized successfully.",
      data: {
        inspection,
        rtvRecord,
        inventoryUpdated,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ======================
// RTV MODULE
// ======================

// Get all RTV records
export const getRtvRecords = async (req: Request, res: Response) => {
  try {
    const records = await Rtv.find().sort({ createdAt: -1 });
    return res.status(200).json({ success: true, count: records.length, data: records });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Update RTV status
export const updateRtvStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, remarks, userName = "Procurement Manager", userId = "system" } = req.body;

    const rtv = await Rtv.findById(id);
    if (!rtv) return res.status(404).json({ success: false, message: "RTV record not found." });

    const prevStatus = rtv.status;
    rtv.status = status;
    if (remarks) rtv.remarks = remarks;
    await rtv.save();

    await writeAudit({
      userId,
      userName,
      transactionId: rtv.rtvNumber,
      moduleName: "Procurement",
      actionPerformed: `RTV ${rtv.rtvNumber} status changed from "${prevStatus}" to "${status}". Remarks: ${remarks || "None"}`,
      previousStatus: prevStatus,
      newStatus: status,
    });

    return res.status(200).json({ success: true, message: "RTV record updated successfully.", data: rtv });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ======================
// BARCODE & ASSET TRACKING MODULE
// ======================

// Get all barcodes
export const getBarcodes = async (req: Request, res: Response) => {
  try {
    const barcodes = await Barcode.find().sort({ createdAt: -1 });
    return res.status(200).json({ success: true, count: barcodes.length, data: barcodes });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Get single barcode by barcodeNumber
export const getBarcodeByCode = async (req: Request, res: Response) => {
  try {
    const { code } = req.params;
    const barcode = await Barcode.findOne({ barcodeNumber: code });
    if (!barcode) return res.status(404).json({ success: false, message: "Barcode not found." });
    return res.status(200).json({ success: true, data: barcode });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Assign asset to employee
export const assignAsset = async (req: Request, res: Response) => {
  try {
    const { barcodeNumber, employeeName, department, userName = "Admin", userId = "system" } = req.body;

    const barcode = await Barcode.findOne({ barcodeNumber });
    if (!barcode) return res.status(404).json({ success: false, message: "Asset barcode not found." });

    const prevStatus = barcode.status;
    const today = new Date().toISOString().split("T")[0];

    barcode.status = "Assigned";
    barcode.employeeName = employeeName;
    barcode.department = department;
    barcode.issueDate = today;
    barcode.returnDate = "";
    barcode.movementHistory.push({
      action: `Assigned to ${employeeName} (Dept: ${department})`,
      user: userName,
      previousStatus: prevStatus,
      newStatus: "Assigned",
    });

    await barcode.save();

    await writeAudit({
      userId,
      userName,
      transactionId: barcodeNumber,
      moduleName: "Material Issue",
      actionPerformed: `Asset serialization barcode ${barcodeNumber} assigned to employee "${employeeName}" (Dept: ${department})`,
      previousStatus: prevStatus,
      newStatus: "Assigned",
    });

    return res.status(200).json({ success: true, message: `Asset ${barcodeNumber} successfully assigned to ${employeeName}.`, data: barcode });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Return asset
export const returnAsset = async (req: Request, res: Response) => {
  try {
    const { barcodeNumber, userName = "Admin", userId = "system" } = req.body;

    const barcode = await Barcode.findOne({ barcodeNumber });
    if (!barcode) return res.status(404).json({ success: false, message: "Asset barcode not found." });

    const prevStatus = barcode.status;
    const today = new Date().toISOString().split("T")[0];

    barcode.status = "Available";
    barcode.returnDate = today;
    barcode.movementHistory.push({
      action: `Returned by ${barcode.employeeName}`,
      user: userName,
      previousStatus: prevStatus,
      newStatus: "Available",
    });

    // Clear assignment details but keep history
    const oldEmployeeName = barcode.employeeName;
    barcode.employeeName = "";
    barcode.department = "";

    await barcode.save();

    await writeAudit({
      userId,
      userName,
      transactionId: barcodeNumber,
      moduleName: "Material Request",
      actionPerformed: `Asset serialization barcode ${barcodeNumber} returned by "${oldEmployeeName}". Returned back to stock.`,
      previousStatus: prevStatus,
      newStatus: "Available",
    });

    return res.status(200).json({ success: true, message: `Asset ${barcodeNumber} returned successfully.`, data: barcode });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ======================
// STOCK AUDIT MODULE
// ======================

// Perform stock audit
export const runStockAudit = async (req: Request, res: Response) => {
  try {
    const { scannedBarcodes } = req.body; // Array of barcode numbers scanned physically

    if (!scannedBarcodes || !Array.isArray(scannedBarcodes)) {
      return res.status(400).json({ success: false, message: "scannedBarcodes array is required." });
    }

    const allBarcodes = await Barcode.find();
    
    const physicalStock = scannedBarcodes.length;
    const systemStock = allBarcodes.length;

    const missingItems = allBarcodes.filter(b => !scannedBarcodes.includes(b.barcodeNumber));
    const extraItems = scannedBarcodes.filter(code => !allBarcodes.some(b => b.barcodeNumber === code));

    return res.status(200).json({
      success: true,
      summary: {
        physicalStock,
        systemStock,
        missingCount: missingItems.length,
        extraCount: extraItems.length,
      },
      missingItems,
      extraItems,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
