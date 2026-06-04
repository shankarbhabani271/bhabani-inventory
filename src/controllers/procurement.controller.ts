import { Request, Response } from "express";
import ProcurementWorkflow from "../models/procurementWorkflow.model.js";
import PurchaseRequest from "../models/purchaseRequest.model.js";
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
// GET PROCUREMENT WORKFLOW BY PR ID
// ======================
export const getWorkflowByPR = async (req: Request, res: Response) => {
  try {
    const { prId } = req.params;
    const workflow = await ProcurementWorkflow.findOne({ prId });
    if (!workflow) {
      return res.status(404).json({ success: false, message: "No procurement workflow found for this PR." });
    }
    return res.status(200).json({ success: true, data: workflow });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ======================
// GET FULL PROCUREMENT TRACEABILITY
// Returns complete chain: PR -> RFQ -> Quotations -> Selected Vendor -> PO
// ======================
export const getProcurementTraceability = async (req: Request, res: Response) => {
  try {
    const { materialRequestId } = req.params;

    const workflow = await ProcurementWorkflow.findOne({ materialRequestId });
    if (!workflow) {
      return res.status(404).json({ success: false, message: "No procurement workflow found." });
    }

    // Fetch linked PurchaseRequest if prId is stored
    let purchaseRequest = null;
    if (workflow.prId) {
      purchaseRequest = await PurchaseRequest.findOne({ requestId: workflow.prId });
    }

    const traceability = {
      materialRequestId,
      materialReferenceId: workflow.materialReferenceId,
      prId: workflow.prId || "N/A",
      prStatus: workflow.prStatus,
      rfqId: workflow.rfqId || "N/A",
      rfqStatus: workflow.rfqStatus,
      rfqVendors: workflow.rfqVendors,
      quotations: workflow.quotations,
      vendorQuotationNumber: workflow.vendorQuotationNumber || "N/A",
      selectedVendor: workflow.selectedVendor,
      procurementOfficer: workflow.procurementOfficer || "N/A",
      approvalDate: workflow.approvalDate || null,
      poId: workflow.poId || "N/A",
      poStatus: workflow.poStatus,
      poAmount: workflow.poAmount,
      poCreationDate: workflow.poCreationDate || null,
      workflowStatus: workflow.workflowStatus,
      vendorQuotations: purchaseRequest?.vendorQuotations || [],
      chain: {
        step1: { label: "Purchase Requisition", id: workflow.prId || "N/A", status: workflow.prStatus },
        step2: { label: "RFQ", id: workflow.rfqId || "N/A", status: workflow.rfqStatus },
        step3: { label: "Vendor Quotations", count: workflow.quotations.length, vendors: workflow.quotations.map((q: any) => q.vendorName) },
        step4: { label: "Selected Vendor", name: workflow.selectedVendor?.vendorName || "N/A" },
        step5: { label: "Purchase Order", id: workflow.poId || "N/A", status: workflow.poStatus, amount: workflow.poAmount },
      },
    };

    return res.status(200).json({ success: true, data: traceability });
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
    workflow.procurementOfficer = userName;
    workflow.workflowStatus = "RFQ Created";
    await workflow.save();

    // Update Material status
    const prevStatus = mr.status;
    await Material.findByIdAndUpdate(materialRequestId, {
      status: "RFQ Created",
      linkedRfqId: rfqId,
    });

    // ── Sync rfqNumber back to linked PurchaseRequest ──
    if (workflow.prId) {
      await PurchaseRequest.findOneAndUpdate(
        { requestId: workflow.prId },
        {
          rfqNumber: rfqId,
          procurementOfficer: userName,
          procurementStage: "RFQ Created",
        }
      );
    }

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

    // Generate quotation ID
    const quotationId = await generateSerialId("QT");

    const totalAmount = unitPrice * workflow.requestedQty;
    const quotation = {
      quotationId,
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
      vendorStatus: "Active",
      selectionStatus: "Pending",
    };

    workflow.quotations.push(quotation);
    workflow.rfqStatus = "Closed";
    workflow.workflowStatus = "Quotations Received";
    await workflow.save();

    // Update MR status
    const mr = await Material.findByIdAndUpdate(materialRequestId, { status: "Quotations Received" }, { new: true });

    // ── Sync quotation to linked PurchaseRequest's vendorQuotations[] ──
    if (workflow.prId) {
      await PurchaseRequest.findOneAndUpdate(
        { requestId: workflow.prId },
        {
          $push: {
            vendorQuotations: {
              vendorName,
              quotationAmount: totalAmount,
              quotationDate: new Date().toISOString().split("T")[0],
              vendorStatus: "Active",
              selectionStatus: "Pending",
            },
          },
          procurementStage: "Quotations Received",
        }
      );
    }

    // Audit Log
    await writeAudit({
      userId,
      userName,
      transactionId: workflow.rfqId || materialRequestId,
      moduleName: "Quotation",
      actionPerformed: `Quotation ${quotationId} submitted by ${vendorName}: ₹${unitPrice}/unit, Total: ₹${totalAmount}`,
      previousStatus: mr?.status || "RFQ Created",
      newStatus: "Quotations Received",
      materialRequestId,
      metadata: { vendorName, unitPrice, totalAmount, deliveryDays, quotationId },
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
      quotationId,
      userName = "Procurement Manager",
      userId = "system",
    } = req.body;

    if (!materialRequestId || !vendorName) {
      return res.status(400).json({ success: false, message: "materialRequestId and vendorName are required." });
    }

    const workflow = await ProcurementWorkflow.findOne({ materialRequestId });
    if (!workflow) return res.status(404).json({ success: false, message: "Procurement workflow not found." });

    const approvalDate = new Date();

    workflow.selectedVendor = {
      vendorName,
      vendorContact: vendorContact || "",
      vendorAddress: vendorAddress || "",
      unitPrice: Number(unitPrice) || 0,
      paymentTerms: paymentTerms || "Net 30",
      deliveryDays: Number(deliveryDays) || 7,
    };
    workflow.approvalDate = approvalDate;
    workflow.vendorQuotationNumber = quotationId || "";
    // Mark selected vendor's selectionStatus in quotations array (forEach for Mongoose DocumentArray)
    workflow.quotations.forEach((q: any) => {
      if (q.vendorName === vendorName) {
        q.selectionStatus = "Selected";
      } else if (q.selectionStatus === "Pending") {
        q.selectionStatus = "Rejected";
      }
    });
    workflow.workflowStatus = "Vendor Selected";
    await workflow.save();

    const mr = await Material.findByIdAndUpdate(materialRequestId, { status: "Vendor Selected" }, { new: true });

    // ── Sync vendor selection back to linked PurchaseRequest ──
    if (workflow.prId) {
      await PurchaseRequest.findOneAndUpdate(
        { requestId: workflow.prId },
        {
          approvedVendorName: vendorName,
          approvedVendorAmount: Number(unitPrice) * workflow.requestedQty,
          approvedVendorDate: approvalDate,
          vendorQuotationNumber: quotationId || "",
          procurementStage: "Vendor Selected",
          // Update selectionStatus in vendorQuotations array
          $set: {
            "vendorQuotations.$[selected].selectionStatus": "Selected",
          },
        },
        {
          arrayFilters: [{ "selected.vendorName": vendorName }],
        }
      );
      // Mark others as Rejected
      await PurchaseRequest.findOneAndUpdate(
        { requestId: workflow.prId },
        {
          $set: {
            "vendorQuotations.$[others].selectionStatus": "Rejected",
          },
        },
        {
          arrayFilters: [{ "others.vendorName": { $ne: vendorName }, "others.selectionStatus": "Pending" }],
        }
      );
    }

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

    // Enforce: only approved vendor can generate PO
    if (workflow.workflowStatus !== "Vendor Selected" && workflow.workflowStatus !== "PO Created") {
      return res.status(400).json({
        success: false,
        message: "PO can only be created after a vendor has been selected. Please complete vendor selection first.",
      });
    }

    const poId = await generateSerialId("PO");
    const poCreationDate = new Date();

    workflow.poId = poId;
    workflow.poStatus = "Approved";
    workflow.poAmount = Number(poAmount) || ((workflow.selectedVendor?.unitPrice ?? 0) * workflow.requestedQty);
    workflow.poExpectedDelivery = poExpectedDelivery || "";
    workflow.poApprovedBy = approvedBy || userName;
    workflow.poCreationDate = poCreationDate;
    workflow.workflowStatus = "PO Approved";
    await workflow.save();

    await Material.findByIdAndUpdate(materialRequestId, { status: "PO Approved", linkedPoId: poId });

    // ── Auto-sync PO Number back to linked PurchaseRequest ──
    if (workflow.prId) {
      await PurchaseRequest.findOneAndUpdate(
        { requestId: workflow.prId },
        {
          poNumber: poId,
          procurementStage: "PO Created",
          approvalDate: poCreationDate,
        }
      );
    }

    await writeAudit({
      userId,
      userName,
      transactionId: poId,
      moduleName: "Purchase Order",
      actionPerformed: `Purchase Order ${poId} created and approved. Vendor: ${workflow.selectedVendor?.vendorName ?? "N/A"}. Amount: ₹${workflow.poAmount}. PR: ${workflow.prId || "N/A"}, RFQ: ${workflow.rfqId || "N/A"}`,
      previousStatus: "Vendor Selected",
      newStatus: "PO Approved",
      materialRequestId,
      metadata: {
        poId,
        poAmount: workflow.poAmount,
        vendor: workflow.selectedVendor?.vendorName ?? "N/A",
        prId: workflow.prId,
        rfqId: workflow.rfqId,
      },
    });

    return res.status(201).json({
      success: true,
      message: `Purchase Order ${poId} created.`,
      data: {
        poId,
        prId: workflow.prId,
        rfqId: workflow.rfqId,
        vendorName: workflow.selectedVendor?.vendorName ?? "",
        vendorQuotationNumber: workflow.vendorQuotationNumber,
        poCreationDate,
        workflow,
      },
    });
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

    // ── Sync GRN stage back to linked PurchaseRequest ──
    if (workflow.prId) {
      await PurchaseRequest.findOneAndUpdate(
        { requestId: workflow.prId },
        { procurementStage: "GRN Created" }
      );
    }

    // Audit: GRN Created
    await writeAudit({
      userId,
      userName,
      transactionId: grnId,
      moduleName: "GRN",
      actionPerformed: `GRN ${grnId} created. Received ${receivedQty} units of "${mr.productDetails}" from vendor ${workflow.selectedVendor?.vendorName ?? "N/A"}`,
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

    // ── Sync Completed stage to linked PurchaseRequest ──
    if (workflow.prId) {
      await PurchaseRequest.findOneAndUpdate(
        { requestId: workflow.prId },
        { procurementStage: "Completed" }
      );
    }

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
