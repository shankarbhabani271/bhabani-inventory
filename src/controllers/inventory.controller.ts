import { Request, Response } from "express";
import Inventory from "../models/inventory.model.js";
import { ProductMenu } from "../models/productmenu.model.js";

// Helper to determine status based on quantity
const getStockStatus = (quantity: number): "In Stock" | "Low Stock" | "Out of Stock" => {
  if (quantity <= 0) return "Out of Stock";
  if (quantity < 10) return "Low Stock";
  return "In Stock";
};

// ======================
// CREATE
// ======================
export const createInventoryItem = async (req: Request, res: Response) => {
  try {
    const { itemName, category, stockQuantity, price, warehouse, supplier } = req.body;

    if (!itemName || !supplier) {
      return res.status(400).json({ success: false, message: "Item name and supplier are required." });
    }

    const qty = Number(stockQuantity) || 0;
    const itemStatus = getStockStatus(qty);

    const newItem = await Inventory.create({
      itemName,
      category: category || "General",
      stockQuantity: qty,
      price: Number(price) || 0,
      warehouse: warehouse || "Main Warehouse",
      supplier,
      status: itemStatus,
    });

    res.status(201).json({
      success: true,
      message: "Inventory item added successfully",
      data: newItem,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Error adding inventory item", error: error.message });
  }
};

// ======================
// GET ALL
// ======================
export const getAllInventoryItems = async (req: Request, res: Response) => {
  try {
    const items = await Inventory.find().sort({ createdAt: -1 });
    res.status(200).json(items);
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Error fetching inventory items", error: error.message });
  }
};

// ======================
// CHECK STOCK BY ITEM NAME
// Returns the matching inventory item for a given product name
// ======================
export const checkStock = async (req: Request, res: Response) => {
  try {
    const { itemName } = req.params;
    const trimmedName = (itemName || "").trim();

    // Case-insensitive search with whitespace tolerance in ProductMenu (Masters -> Products) first
    let item = await ProductMenu.findOne({
      name: { $regex: new RegExp(`^\\s*${trimmedName}\\s*$`, "i") },
    });

    if (item) {
      return res.status(200).json({
        success: true,
        found: true,
        stock: item.stock ?? 0,
        itemName: item.name,
        status: (item.stock ?? 0) > 0 ? "In Stock" : "Out of Stock",
        data: item,
        source: "ProductMenu"
      });
    }

    // Fallback: case-insensitive search with whitespace tolerance in Inventory model
    const invItem = await Inventory.findOne({
      itemName: { $regex: new RegExp(`^\\s*${trimmedName}\\s*$`, "i") },
    });

    if (!invItem) {
      return res.status(200).json({
        success: true,
        found: false,
        stock: 0,
        message: "Item not found in inventory",
        data: null,
      });
    }

    return res.status(200).json({
      success: true,
      found: true,
      stock: invItem.stockQuantity,
      itemName: invItem.itemName,
      status: invItem.status,
      data: invItem,
      source: "Inventory"
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Error checking stock", error: error.message });
  }
};

// ======================
// DEDUCT STOCK
// Reduces stockQuantity by the given quantity amount
// ======================
export const deductStock = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { quantity } = req.body;

    const deductQty = Number(quantity);
    if (!deductQty || deductQty <= 0) {
      return res.status(400).json({ success: false, message: "Valid quantity required for deduction" });
    }

    // First try to deduct from ProductMenu
    let productItem = await ProductMenu.findById(id);
    if (productItem) {
      if ((productItem.stock ?? 0) < deductQty) {
        return res.status(400).json({
          success: false,
          message: "Insufficient stock to deduct",
          available: productItem.stock ?? 0,
        });
      }
      productItem.stock = (productItem.stock ?? 0) - deductQty;
      await productItem.save();

      return res.status(200).json({
        success: true,
        message: `Stock deducted by ${deductQty}. Remaining: ${productItem.stock}`,
        data: productItem,
      });
    }

    // Fallback: try to deduct from Inventory
    const invItem = await Inventory.findById(id);
    if (!invItem) {
      return res.status(404).json({ success: false, message: "Inventory item not found" });
    }

    if (invItem.stockQuantity < deductQty) {
      return res.status(400).json({
        success: false,
        message: "Insufficient stock to deduct",
        available: invItem.stockQuantity,
      });
    }

    invItem.stockQuantity -= deductQty;
    invItem.status = getStockStatus(invItem.stockQuantity);
    await invItem.save();

    res.status(200).json({
      success: true,
      message: `Stock deducted by ${deductQty}. Remaining: ${invItem.stockQuantity}`,
      data: invItem,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Error deducting stock", error: error.message });
  }
};

// ======================
// UPDATE
// ======================
export const updateInventoryItem = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { itemName, category, stockQuantity, price, warehouse, supplier } = req.body;

    const item = await Inventory.findById(id);
    if (!item) {
      return res.status(404).json({ success: false, message: "Inventory item not found." });
    }

    if (itemName !== undefined) item.itemName = itemName;
    if (category !== undefined) item.category = category;
    if (price !== undefined) item.price = Number(price) || 0;
    if (warehouse !== undefined) item.warehouse = warehouse;
    if (supplier !== undefined) item.supplier = supplier;

    if (stockQuantity !== undefined) {
      const qty = Number(stockQuantity) || 0;
      item.stockQuantity = qty;
      item.status = getStockStatus(qty);
    }

    await item.save();

    res.status(200).json({ success: true, message: "Inventory item updated successfully", data: item });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Error updating inventory item", error: error.message });
  }
};

// ======================
// DELETE
// ======================
export const deleteInventoryItem = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deletedItem = await Inventory.findByIdAndDelete(id);

    if (!deletedItem) {
      return res.status(404).json({ success: false, message: "Inventory item not found." });
    }

    res.status(200).json({ success: true, message: "Inventory item deleted successfully." });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Error deleting inventory item", error: error.message });
  }
};
