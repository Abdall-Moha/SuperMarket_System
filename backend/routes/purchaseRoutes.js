import express from "express";
import Purchase from "../models/Purchase.js";
import Product from "../models/Product.js";
import Debt from "../models/Debt.js";
import authMiddleware from "../middleware/authMiddleware.js";
import roleMiddleware from "../middleware/roleMiddleware.js";

const router = express.Router();

// Create a new purchase and add stock
// Access: Admin, Storekeeper
router.post(
  "/",
  authMiddleware,
  roleMiddleware("admin", "storekeeper"),
  async (req, res) => {
    try {
      const supplier = req.body.supplier;
      const items = req.body.items;
      const paymentMethod = req.body.paymentMethod;
      let paidAmount = req.body.paidAmount;

      if (!supplier || !supplier.name) {
        return res.status(400).json({
          message: "Supplier name is required",
        });
      }

      if (!items || items.length === 0) {
        return res.status(400).json({
          message: "Please add at least one product",
        });
      }

      if (
        paymentMethod !== "cash" &&
        paymentMethod !== "evc" &&
        paymentMethod !== "edahab" &&
        paymentMethod !== "bank" &&
        paymentMethod !== "credit"
      ) {
        return res.status(400).json({
          message: "Payment method must be cash, evc, edahab, bank, or credit",
        });
      }

      const purchaseItems = [];
      let totalAmount = 0;

      // Check every product first so we do not change stock if something is invalid
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const product = await Product.findById(item.product);

        if (!product) {
          return res.status(404).json({
            message: "Product not found",
          });
        }

        if (product.isActive === false) {
          return res.status(400).json({
            message: "This product is not active: " + product.name,
          });
        }

        const quantity = Number(item.quantity);

        if (!quantity || quantity < 1) {
          return res.status(400).json({
            message: "Item quantity must be at least 1",
          });
        }

        let purchasePrice = product.purchasePrice;

        if (item.purchasePrice !== undefined && item.purchasePrice !== null && item.purchasePrice !== "") {
          purchasePrice = Number(item.purchasePrice);
        }

        if (isNaN(purchasePrice) || purchasePrice < 0) {
          return res.status(400).json({
            message: "Purchase price cannot be negative",
          });
        }

        const subtotal = purchasePrice * quantity;

        // Save name and price inside the purchase so old records stay correct later
        purchaseItems.push({
          product: product._id,
          productName: product.name,
          quantity: quantity,
          purchasePrice: purchasePrice,
          subtotal: subtotal,
        });

        // Calculate the purchase total
        totalAmount = totalAmount + subtotal;
      }

      if (paidAmount === undefined || paidAmount === null || paidAmount === "") {
        paidAmount = 0;
      } else {
        paidAmount = Number(paidAmount);
      }

      if (isNaN(paidAmount) || paidAmount < 0) {
        return res.status(400).json({
          message: "Paid amount cannot be negative",
        });
      }

      if (paidAmount > totalAmount) {
        return res.status(400).json({
          message: "Paid amount cannot be more than the total amount",
        });
      }

      // Calculate how much money is still owed
      const remainingAmount = totalAmount - paidAmount;

      let paymentStatus = "unpaid";

      if (paidAmount === 0) {
        paymentStatus = "unpaid";
      } else if (paidAmount > 0 && paidAmount < totalAmount) {
        paymentStatus = "partial";
      } else if (paidAmount === totalAmount) {
        paymentStatus = "paid";
      }

      // Create the purchase record
      const newPurchase = await Purchase.create({
        supplier: {
          name: supplier.name,
          phone: supplier.phone,
        },
        items: purchaseItems,
        totalAmount: totalAmount,
        paidAmount: paidAmount,
        remainingAmount: remainingAmount,
        paymentStatus: paymentStatus,
        paymentMethod: paymentMethod,
        createdBy: req.user.id,
        updatedBy: req.user.id,
      });

      // Increase the product stock
      for (let i = 0; i < purchaseItems.length; i++) {
        const purchaseItem = purchaseItems[i];
        const product = await Product.findById(purchaseItem.product);

        if (product) {
          product.quantity = product.quantity + purchaseItem.quantity;
          product.updatedBy = req.user.id;
          await product.save();
        }
      }

      let supplierDebt = null;

      // Create supplier debt if the purchase is not fully paid
      if (remainingAmount > 0) {
        supplierDebt = await Debt.create({
          type: "supplier",
          name: supplier.name,
          phone: supplier.phone,
          totalAmount: remainingAmount,
          paidAmount: 0,
          remainingAmount: remainingAmount,
          status: "unpaid",
          purchase: newPurchase._id,
          createdBy: req.user.id,
          updatedBy: req.user.id,
        });
      }

      return res.status(201).json({
        message: "Purchase created successfully",
        purchase: newPurchase,
        debt: supplierDebt,
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        message: "Something went wrong",
      });
    }
  }
);

// Get all purchases
// Access: Admin, Storekeeper
router.get(
  "/",
  authMiddleware,
  roleMiddleware("admin", "storekeeper"),
  async (req, res) => {
    try {
      const purchases = await Purchase.find()
        .populate("createdBy", "name")
        .sort({ createdAt: -1 });

      return res.status(200).json({
        purchases: purchases,
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        message: "Something went wrong",
      });
    }
  }
);

// Get one purchase by ID
// Access: Admin, Storekeeper
router.get(
  "/:id",
  authMiddleware,
  roleMiddleware("admin", "storekeeper"),
  async (req, res) => {
    try {
      // Check if the purchase exists
      const purchase = await Purchase.findById(req.params.id).populate("createdBy", "name");

      if (!purchase) {
        return res.status(404).json({
          message: "Purchase not found",
        });
      }

      return res.status(200).json({
        purchase: purchase,
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        message: "Something went wrong",
      });
    }
  }
);

export default router;
