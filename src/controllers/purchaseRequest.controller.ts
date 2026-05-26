import { Request, Response } from "express";
import PurchaseRequest from "../models/purchaseRequest.model.js";

// CREATE
export const createPurchaseRequest = async (req: Request, res: Response) => {
  try {
    const { department, vendor, products, requestedBy, deliveryAddress, notes, priority } = req.body;

    if (!department || !vendor || !products || !Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ success: false, message: "Department, vendor, and products are required." });
    }

    // Calculate total amount dynamically
    const totalAmount = products.reduce((acc: number, prod: any) => {
      const qty = Number(prod.quantity) || 0;
      const prc = Number(prod.price) || 0;
      return acc + (qty * prc);
    }, 0);

    const newRequest = await PurchaseRequest.create({
      department,
      vendor,
      products,
      totalAmount,
      requestedBy: requestedBy || "Admin",
      status: "Pending",
      deliveryAddress: deliveryAddress || "",
      notes: notes || "",
      priority: priority || "Medium",
      deliveryStatus: "Pending"
    });

    return res.status(201).json({
      success: true,
      message: "Purchase request created successfully",
      data: newRequest,
    });
  } catch (error: any) {
    console.error("CREATE PURCHASE REQUEST ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Error creating purchase request",
      error: error.message,
    });
  }
};

// GET ALL
export const getAllPurchaseRequests = async (_req: Request, res: Response) => {
  try {
    const requests = await PurchaseRequest.find().sort({ createdAt: -1 });
    return res.status(200).json(requests);
  } catch (error: any) {
    console.error("GET PURCHASE REQUESTS ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching purchase requests",
      error: error.message,
    });
  }
};

// UPDATE STATUS
export const updatePurchaseRequestStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, approvedBy, deliveryStatus } = req.body;

    if (!status && !deliveryStatus) {
      return res.status(400).json({ success: false, message: "Status or Delivery Status is required." });
    }

    const updateData: any = {};
    if (status !== undefined) {
      updateData.status = status;
      updateData.approvedBy = approvedBy || "Admin";
    }
    if (deliveryStatus !== undefined) {
      updateData.deliveryStatus = deliveryStatus;
    }

    const updatedRequest = await PurchaseRequest.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    );

    if (!updatedRequest) {
      return res.status(404).json({ success: false, message: "Purchase request not found." });
    }

    return res.status(200).json({
      success: true,
      message: `Purchase request status updated successfully.`,
      data: updatedRequest,
    });
  } catch (error: any) {
    console.error("UPDATE PURCHASE REQUEST STATUS ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Error updating purchase request status",
      error: error.message,
    });
  }
};

// DELETE
export const deletePurchaseRequest = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deletedRequest = await PurchaseRequest.findByIdAndDelete(id);

    if (!deletedRequest) {
      return res.status(404).json({ success: false, message: "Purchase request not found." });
    }

    return res.status(200).json({
      success: true,
      message: "Purchase request deleted successfully.",
    });
  } catch (error: any) {
    console.error("DELETE PURCHASE REQUEST ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Error deleting purchase request",
      error: error.message,
    });
  }
};
