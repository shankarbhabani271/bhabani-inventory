import { Request, Response } from "express";
import ProcurementWorkflow from "../models/procurementWorkflow.model.js";
import Material from "../models/material.model.js";
import AuditLog from "../models/auditLog.model.js";
import Inventory from "../models/inventory.model.js";
import { ProductMenu } from "../models/productmenu.model.js";
import { generateSerialId } from "../models/counter.model.js";

// ─────────────────────────────────────────────
// HELPER: write audit log
// ─────────────────────────────────────────────
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
    console.warn("[AuditLog] Failed to write audit log:", err);
  }
};

// ======================
// GET PROCUREMENT WORKFLOW BY MATERIAL REQUEST ID
// ======================
export const getWorkflowByMR = async (req: Request, res: Response) => {
  try {
    const { mrId } = req.params;
    const workflow = await ProcurementWorkflow.findOne({ materialRequestId: mrId });
    if (!workflow) {
      return res.status(404).json({ success: false, message: "No procurement workflow found for this MR." });
    }
    return res.status(200).json({ success: true, data: workflow });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ======================
// GET ALL PROCUREMENT WORKFLOWS
// ======================
export const getAllWorkflows = async (_req: Request, res: Response) => {
  try {
    const workflows = await ProcurementWorkflow.find().sort({ createdAt: -1 });
    return res.status(200).json({ success: true, count: workflows.length, data: workflows });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ======================
// CREATE RFQ
// Called from Procurement module when team creates an RFQ
// ======================
export const createRFQ = async (req: Request, res: Response) => {
  try {
    const {
      materialRequestId,
      rfqVendors,
      rfqResponseDeadline,
      userName = "Procurement Officer",
      userId = "system",
    } = req.body;

    if (!materialRequestId || !rfqVendors || !Array.isArray(rfqVendors) || rfqVendors.length === 0) {
      return res.status(400).json({ success: false, message: "materialRequestId and rfqVendors[] are required." });
    }

    const mr = await Material.findById(materialRequestId);
    if (!mr) return res.status(404).json({ success: false, message: "Material Request not found." });

    // Find or create workflow
    let workflow = await ProcurementWorkflow.findOne({ materialRequestId });
    if (!workflow) {
      return res.status(404).json({ success: false, message: "Procurement workflow not found. Approve the MR first." });
    }

    const rfqId = await generateSerialId("RFQ");
    const responseDeadline = rfqResponseDeadline ? new Date(rfqResponseDeadline) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    workflow.rfqId = rfqId;
    workflow.rfqStatus = "Sent to Vendors";
    workflow.rfqVendors = rfqVendors;
    workflow.rfqCreatedAt = new Date();
    workflow.rfqResponseDeadline = responseDeadline;
    workflow.workflowStatus = "RFQ Created";
    await workflow.save();

    // Update Material status
    const prevStatus = mr.status;
    await Material.findByIdAndUpdate(materialRequestId, {
      status: "RFQ Created",
      linkedRfqId: rfqId,
    });

    // Audit Log
    await writeAudit({
      userId,
      userName,
      transactionId: rfqId,
      moduleName: "RFQ",
      actionPerformed: `RFQ ${rfqId} created and sent to ${rfqVendors.length} vendor(s): ${rfqVendors.join(", ")}`,
      previousStatus: prevStatus,
      newStatus: "RFQ Created",
      materialRequestId,
      metadata: { rfqVendors, responseDeadline },
    });

    return res.status(201).json({
      success: true,
      message: `RFQ ${rfqId} created successfully`,
      data: { rfqId, workflow },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ======================
// SUBMIT QUOTATION
// Vendors submit their quotations against an RFQ
// ======================
export const submitQuotation = async (req: Request, res: Response) => {
  try {
    const {
      materialRequestId,
      vendorName,
      vendorContact,
      vendorAddress,
      unitPrice,
      deliveryDays,
      warranty,
      paymentTerms,
      notes,
      userName = "Vendor",
      userId = "system",
    } = req.body;

    if (!materialRequestId || !vendorName || !unitPrice) {
      return res.status(400).json({ success: false, message: "materialRequestId, vendorName, and unitPrice are required." });
    }

    const workflow = await ProcurementWorkflow.findOne({ materialRequestId });
    if (!workflow) return res.status(404).json({ success: false, message: "Procurement workflow not found." });

    const totalAmount = unitPrice * workflow.requestedQty;
    const quotation = {
      vendorName,
      vendorContact: vendorContact || "",
      vendorAddress: vendorAddress || "",
      unitPrice: Number(unitPrice),
      totalAmount,
      deliveryDays: Number(deliveryDays) || 7,
      warranty: warranty || "",
      paymentTerms: paymentTerms || "Net 30",
      notes: notes || "",
      submittedAt: new Date(),
    };

    workflow.quotations.push(quotation);
    workflow.rfqStatus = "Closed";
    workflow.workflowStatus = "Quotations Received";
    await workflow.save();

    // Update MR status
    const mr = await Material.findByIdAndUpdate(materialRequestId, { status: "Quotations Received" }, { new: true });

    // Audit Log
    await writeAudit({
      userId,
      userName,
      transactionId: workflow.rfqId || materialRequestId,
      moduleName: "Quotation",
      actionPerformed: `Quotation submitted by ${vendorName}: ₹${unitPrice}/unit, Total: ₹${totalAmount}`,
      previousStatus: mr?.status || "RFQ Created",
      newStatus: "Quotations Received",
      materialRequestId,
      metadata: { vendorName, unitPrice, totalAmount, deliveryDays },
    });

    return res.status(201).json({ success: true, message: "Quotation submitted successfully.", data: workflow });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ======================
// SELECT VENDOR
// Procurement team selects best quotation
// ======================
export const selectVendor = async (req: Request, res: Response) => {
  try {
    const {
      materialRequestId,
      vendorName,
      vendorContact,
      vendorAddress,
      unitPrice,
      paymentTerms,
      deliveryDays,
      userName = "Procurement Manager",
      userId = "system",
    } = req.body;

    if (!materialRequestId || !vendorName) {
      return res.status(400).json({ success: false, message: "materialRequestId and vendorName are required." });
    }

    const workflow = await ProcurementWorkflow.findOne({ materialRequestId });
    if (!workflow) return res.status(404).json({ success: false, message: "Procurement workflow not found." });

    workflow.selectedVendor = {
      vendorName,
      vendorContact: vendorContact || "",
      vendorAddress: vendorAddress || "",
      unitPrice: Number(unitPrice) || 0,
      paymentTerms: paymentTerms || "Net 30",
      deliveryDays: Number(deliveryDays) || 7,
    };
    workflow.workflowStatus = "Vendor Selected";
    await workflow.save();

    const mr = await Material.findByIdAndUpdate(materialRequestId, { status: "Vendor Selected" }, { new: true });

    // Audit Log
    await writeAudit({
      userId,
      userName,
      transactionId: materialRequestId,
      moduleName: "Procurement",
      actionPerformed: `Vendor ${vendorName} selected for Material Request ${workflow.materialReferenceId}. Unit Price: ₹${unitPrice}`,
      previousStatus: "Quotations Received",
      newStatus: "Vendor Selected",
      materialRequestId,
      metadata: { vendorName, unitPrice, paymentTerms },
    });

    return res.status(200).json({ success: true, message: `Vendor ${vendorName} selected.`, data: { workflow, mr } });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ======================
// CREATE PURCHASE ORDER
// ======================
export const createPO = async (req: Request, res: Response) => {
  try {
    const {
      materialRequestId,
      poAmount,
      poExpectedDelivery,
      approvedBy,
      userName = "Procurement Manager",
      userId = "system",
    } = req.body;

    if (!materialRequestId) {
      return res.status(400).json({ success: false, message: "materialRequestId is required." });
    }

    const workflow = await ProcurementWorkflow.findOne({ materialRequestId });
    if (!workflow) return res.status(404).json({ success: false, message: "Procurement workflow not found." });

    const poId = await generateSerialId("PO");
    workflow.poId = poId;
    workflow.poStatus = "Approved";
    workflow.poAmount = Number(poAmount) || (workflow.selectedVendor.unitPrice * workflow.requestedQty);
    workflow.poExpectedDelivery = poExpectedDelivery || "";
    workflow.poApprovedBy = approvedBy || userName;
    workflow.workflowStatus = "PO Approved";
    await workflow.save();

    await Material.findByIdAndUpdate(materialRequestId, { status: "PO Approved", linkedPoId: poId });

    await writeAudit({
      userId,
      userName,
      transactionId: poId,
      moduleName: "Purchase Order",
      actionPerformed: `Purchase Order ${poId} created and approved. Vendor: ${workflow.selectedVendor.vendorName}. Amount: ₹${workflow.poAmount}`,
      previousStatus: "Vendor Selected",
      newStatus: "PO Approved",
      materialRequestId,
      metadata: { poId, poAmount: workflow.poAmount, vendor: workflow.selectedVendor.vendorName },
    });

    return res.status(201).json({ success: true, message: `Purchase Order ${poId} created.`, data: { poId, workflow } });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ======================
// CREATE GRN (Goods Receipt Note)
// Vendor delivers material — inventory is updated here
// ======================
export const createGRN = async (req: Request, res: Response) => {
  try {
    const {
      materialRequestId,
      receivedQty,
      receivedBy,
      conditionNotes,
      userName = "Warehouse Officer",
      userId = "system",
    } = req.body;

    if (!materialRequestId || !receivedQty) {
      return res.status(400).json({ success: false, message: "materialRequestId and receivedQty are required." });
    }

    const workflow = await ProcurementWorkflow.findOne({ materialRequestId });
    if (!workflow) return res.status(404).json({ success: false, message: "Procurement workflow not found." });

    const mr = await Material.findById(materialRequestId);
    if (!mr) return res.status(404).json({ success: false, message: "Material Request not found." });

    const grnId = await generateSerialId("GRN");
    const today = new Date().toISOString().split("T")[0];

    workflow.grnId = grnId;
    workflow.grnStatus = "Pending QC";
    workflow.grnReceivedQty = Number(receivedQty);
    workflow.grnReceivedBy = receivedBy || userName;
    workflow.grnReceivedDate = today;
    workflow.grnConditionNotes = conditionNotes || "Received in good condition";
    workflow.workflowStatus = "GRN Completed";
    await workflow.save();

    await Material.findByIdAndUpdate(materialRequestId, { status: "GRN Created", linkedGrnId: grnId });

    // Audit: GRN Created
    await writeAudit({
      userId,
      userName,
      transactionId: grnId,
      moduleName: "GRN",
      actionPerformed: `GRN ${grnId} created. Received ${receivedQty} units of "${mr.productDetails}" from vendor ${workflow.selectedVendor.vendorName}`,
      previousStatus: "PO Approved",
      newStatus: "GRN Created",
      materialRequestId,
      metadata: { grnId, receivedQty, productDetails: mr.productDetails },
    });

    return res.status(201).json({
      success: true,
      message: `GRN ${grnId} created successfully. Awaiting QC inspection verification before stock update.`,
      data: { grnId, inventoryUpdated: false, workflow },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ======================
// COMPLETE STOCK ISSUE (final step after GRN)
// Re-validates inventory, deducts stock, marks MR Completed
// ======================
export const completeStockIssue = async (req: Request, res: Response) => {
  try {
    const {
      materialRequestId,
      issuedBy,
      userName = "Warehouse Officer",
      userId = "system",
    } = req.body;

    if (!materialRequestId) {
      return res.status(400).json({ success: false, message: "materialRequestId is required." });
    }

    const mr = await Material.findById(materialRequestId);
    if (!mr) return res.status(404).json({ success: false, message: "Material Request not found." });

    const workflow = await ProcurementWorkflow.findOne({ materialRequestId });
    if (!workflow) return res.status(404).json({ success: false, message: "Procurement workflow not found." });

    const productName = mr.productDetails.trim();
    const requestedQty = mr.quantity;

    // Re-validate stock is now sufficient
    let currentStock = 0;
    let stockItemId = "";
    let stockSource = "";

    const productItem = await ProductMenu.findOne({
      name: { $regex: new RegExp(`^\\s*${productName}\\s*$`, "i") },
    });

    if (productItem) {
      currentStock = productItem.stock ?? 0;
      stockItemId = String(productItem._id);
      stockSource = "ProductMenu";
    } else {
      const invItem = await Inventory.findOne({
        itemName: { $regex: new RegExp(`^\\s*${productName}\\s*$`, "i") },
      });
      if (invItem) {
        currentStock = invItem.stockQuantity;
        stockItemId = String(invItem._id);
        stockSource = "Inventory";
      }
    }

    if (currentStock < requestedQty) {
      return res.status(400).json({
        success: false,
        message: `Insufficient stock to issue. Available: ${currentStock}, Required: ${requestedQty}`,
        currentStock,
        requestedQty,
      });
    }

    // Deduct stock
    if (stockSource === "ProductMenu") {
      await ProductMenu.findByIdAndUpdate(stockItemId, { $inc: { stock: -requestedQty } });
    } else {
      const invItem = await Inventory.findById(stockItemId);
      if (invItem) {
        invItem.stockQuantity -= requestedQty;
        if (invItem.stockQuantity <= 0) invItem.status = "Out of Stock";
        else if (invItem.stockQuantity < 10) invItem.status = "Low Stock";
        else invItem.status = "In Stock";
        await invItem.save();
      }
    }

    // Update MR to Completed
    await Material.findByIdAndUpdate(materialRequestId, {
      status: "Completed",
      issuedQty: requestedQty,
    });

    // Update workflow
    workflow.stockIssued = true;
    workflow.issuedQty = requestedQty;
    workflow.issuedBy = issuedBy || userName;
    workflow.issuedAt = new Date();
    workflow.workflowStatus = "Completed";
    await workflow.save();

    // Audit: Material Issue
    await writeAudit({
      userId,
      userName,
      transactionId: mr.referenceId,
      moduleName: "Material Issue",
      actionPerformed: `${requestedQty} units of "${mr.productDetails}" issued to ${mr.requester} (Dept: ${mr.department}). Stock deducted from inventory.`,
      previousStatus: "Inventory Updated",
      newStatus: "Stock Issued",
      materialRequestId,
      metadata: { issuedQty: requestedQty, productDetails: mr.productDetails, requester: mr.requester },
    });

    // Audit: Request Completed
    await writeAudit({
      userId,
      userName,
      transactionId: mr.referenceId,
      moduleName: "Material Request",
      actionPerformed: `Material Request ${mr.referenceId} completed via procurement workflow. All ${requestedQty} units issued successfully.`,
      previousStatus: "Stock Issued",
      newStatus: "Completed",
      materialRequestId,
      metadata: { workflow: "procurement", completedAt: new Date() },
    });

    return res.status(200).json({
      success: true,
      message: `Stock issued successfully. Material Request ${mr.referenceId} marked as Completed.`,
      data: { issuedQty: requestedQty, remainingStock: currentStock - requestedQty, workflow },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
