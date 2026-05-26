import { Request, Response } from "express";
import Vendor from "../models/vendor.model.js";

// CREATE
export const createVendor = async (req: Request, res: Response) => {
  try {
    const { name, phone, secondphone, email, primaryaddress, contactPerson, gst, productType, category, status } = req.body;

    const existingVendor = await Vendor.findOne({ email });

    if (existingVendor) {
      return res.status(400).json({
        success: false,
        message: "Vendor already exists with this email",
      });
    }

    const vendor = await Vendor.create({
      name,
      phone,
      secondphone: secondphone || phone,
      email,
      primaryaddress,
      contactPerson,
      gst,
      productType,
      category,
      status: status || "Active"
    });

    res.status(201).json({
      success: true,
      message: "Vendor created successfully",
      data: vendor,
    });

  } catch (error: any) {
    console.log("CREATE ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Error creating vendor",
      error: error.message,
    });
  }
};

// GET ALL
export const getVendor = async (req: Request, res: Response) => {
  try {
    const vendors = await Vendor.find().sort({ createdAt: -1 });
    res.status(200).json(vendors);
  } catch (error: any) {
    console.log("GET ERROR:", error);

    res.status(500).json({
      message: "Error fetching vendors",
    });
  }
};

// GET BY ID
export const getVendorById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const vendor = await Vendor.findById(id);

    if (!vendor) {
      return res.status(404).json({ success: false, message: "Vendor not found." });
    }

    res.status(200).json(vendor);
  } catch (error: any) {
    console.log("GET BY ID ERROR:", error);
    res.status(500).json({ success: false, message: "Error fetching vendor details." });
  }
};

// UPDATE
export const updateVendor = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, phone, secondphone, email, primaryaddress, contactPerson, gst, productType, category, status } = req.body;

    const updatedVendor = await Vendor.findByIdAndUpdate(
      id,
      { name, phone, secondphone: secondphone || phone, email, primaryaddress, contactPerson, gst, productType, category, status },
      { new: true }
    );

    if (!updatedVendor) {
      return res.status(404).json({ success: false, message: "Vendor not found." });
    }

    res.status(200).json({
      success: true,
      message: "Vendor updated successfully.",
      data: updatedVendor,
    });
  } catch (error: any) {
    console.log("UPDATE ERROR:", error);
    res.status(500).json({ success: false, message: "Error updating vendor." });
  }
};

// DELETE
export const deleteVendor = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deletedVendor = await Vendor.findByIdAndDelete(id);

    if (!deletedVendor) {
      return res.status(404).json({ success: false, message: "Vendor not found." });
    }

    res.status(200).json({
      success: true,
      message: "Vendor deleted successfully.",
    });
  } catch (error: any) {
    console.log("DELETE ERROR:", error);
    res.status(500).json({ success: false, message: "Error deleting vendor." });
  }
};