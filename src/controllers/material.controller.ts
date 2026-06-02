import Material from "../models/material.model.js";

// ======================
// CREATE MATERIAL
// ======================
export const createMaterial = async (req, res) => {
  try {
    const {
      referenceId,
      date,
      requester,
      department,
      productDetails,
      quantity,
      priority,
    } = req.body;

    if (!referenceId || !date || !requester || !department || !productDetails || !quantity) {
      return res.status(400).json({
        success: false,
        message: "All required fields must be filled",
      });
    }

    const qty = Number(quantity);
    if (isNaN(qty) || qty <= 0) {
      return res.status(400).json({
        success: false,
        message: "Quantity must be a valid number",
      });
    }

    const existing = await Material.findOne({ referenceId });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Reference ID already exists",
      });
    }

    const material = new Material({
      referenceId,
      date,
      requester,
      department,
      productDetails,
      quantity: qty,
      priority: priority || "Medium",
      status: "Pending",
    });

    const saved = await material.save();

    return res.status(201).json({
      success: true,
      message: "Material created successfully",
      data: saved,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ======================
// GET ALL MATERIALS
// ======================
export const getMaterials = async (req, res) => {
  try {
    const { status, search } = req.query;

    let filter: any = {};

    if (status) {
      filter.status = status;
    }

    if (search) {
      filter.$or = [
        { referenceId: { $regex: search, $options: "i" } },
        { requester: { $regex: search, $options: "i" } },
      ];
    }

    const materials = await Material.find(filter).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: materials.length,
      data: materials,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ======================
// APPROVE
// ======================
export const approveMaterial = async (req, res) => {
  try {
    const updated = await Material.findByIdAndUpdate(
      req.params.id,
      { status: "Approved" },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ success: false, message: "Material not found" });
    }

    res.status(200).json({ success: true, message: "Material Approved", data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ======================
// REJECT
// ======================
export const rejectMaterial = async (req, res) => {
  try {
    const updated = await Material.findByIdAndUpdate(
      req.params.id,
      { status: "Rejected" },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ success: false, message: "Material not found" });
    }

    res.status(200).json({ success: true, message: "Material Rejected", data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ======================
// COMPLETE (Stock was available, stock deducted)
// ======================
export const completeMaterial = async (req, res) => {
  try {
    const updated = await Material.findByIdAndUpdate(
      req.params.id,
      { status: "Completed" },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ success: false, message: "Material not found" });
    }

    res.status(200).json({ success: true, message: "Material marked as Completed", data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ======================
// PROCUREMENT REQUIRED (Stock not available)
// ======================
export const procurementRequired = async (req, res) => {
  try {
    const updated = await Material.findByIdAndUpdate(
      req.params.id,
      { status: "Procurement Required" },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ success: false, message: "Material not found" });
    }

    res.status(200).json({
      success: true,
      message: "Status updated to Procurement Required",
      data: updated,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ======================
// PO CREATED (Purchase Order generated for request)
// ======================
export const poCreated = async (req, res) => {
  try {
    const updated = await Material.findByIdAndUpdate(
      req.params.id,
      { status: "PO Created" },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ success: false, message: "Material not found" });
    }

    res.status(200).json({
      success: true,
      message: "Status updated to PO Created",
      data: updated,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ======================
// UPDATE STATUS (General status update endpoint)
// ======================
export const updateStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const updated = await Material.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ success: false, message: "Material not found" });
    }

    res.status(200).json({
      success: true,
      message: `Status updated to ${status}`,
      data: updated,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ======================
// DELETE
// ======================
export const deleteMaterial = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Material.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: "Material request not found" });
    }
    
    // Also delete any associated purchase request
    try {
      const PurchaseRequest = (await import("../models/purchaseRequest.model.js")).default;
      await PurchaseRequest.deleteMany({ materialRequestId: id });
    } catch (prErr: any) {
      console.warn("Failed to delete associated purchase requests:", prErr.message);
    }

    res.status(200).json({ success: true, message: "Material request and associated procurement records permanently deleted" });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};