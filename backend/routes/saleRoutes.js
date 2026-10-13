import express from "express";
import Sale from "../models/Sale.js";
import Product from "../models/Product.js";
import Debt from "../models/Debt.js";
import authMiddleware from "../middleware/authMiddleware.js";
import roleMiddleware from "../middleware/roleMiddleware.js";

const router = express.Router();

// Create a new sale and reduce stock
// Access: Admin, Cashier, Storekeeper
router.post(
  "/",
  authMiddleware,
  roleMiddleware("admin", "cashier", "storekeeper"),
  async (req, res) => {
    try {
      const customer = req.body.customer;
      const items = req.body.items;
      const paymentMethod = req.body.paymentMethod;
      let paidAmount = req.body.paidAmount;

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

      const saleItems = [];
      let totalAmount = 0;
      const neededStock = {};

      // Check all products and stock before changing anything
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

        const productId = product._id.toString();

        if (!neededStock[productId]) {
          neededStock[productId] = 0;
        }

        neededStock[productId] = neededStock[productId] + quantity;

        // Check that enough stock is available
        if (neededStock[productId] > product.quantity) {
          return res.status(400).json({
            message: "Not enough stock for " + product.name,
          });
        }

        const purchasePrice = product.purchasePrice;
        const sellingPrice = product.sellingPrice;
        const subtotal = sellingPrice * quantity;

        // Calculate profit for this item
        let profit = (sellingPrice - purchasePrice) * quantity;

        if (profit < 0) {
          profit = 0;
        }

        // Snapshot name and prices so old sales stay correct if the product changes later
        saleItems.push({
          product: product._id,
          productName: product.name,
          quantity: quantity,
          purchasePrice: purchasePrice,
          sellingPrice: sellingPrice,
          subtotal: subtotal,
          profit: profit,
        });

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

      let customerName = "";
      let customerPhone = "";

      if (customer && customer.name) {
        customerName = customer.name;
      }

      if (customer && customer.phone) {
        customerPhone = customer.phone;
      }

      if (remainingAmount > 0 && !customerName) {
        return res.status(400).json({
          message: "Customer name is required when the sale is not fully paid",
        });
      }

      // Create the sale record
      const newSale = await Sale.create({
        customer: {
          name: customerName,
          phone: customerPhone,
        },
        items: saleItems,
        totalAmount: totalAmount,
        paidAmount: paidAmount,
        remainingAmount: remainingAmount,
        paymentStatus: paymentStatus,
        paymentMethod: paymentMethod,
        createdBy: req.user.id,
        updatedBy: req.user.id,
      });

      // Decrease the product stock
      for (let i = 0; i < saleItems.length; i++) {
        const saleItem = saleItems[i];
        const product = await Product.findById(saleItem.product);

        if (product) {
          product.quantity = product.quantity - saleItem.quantity;
          product.updatedBy = req.user.id;
          await product.save();
        }
      }

      let customerDebt = null;

      // Create customer debt if the sale is not fully paid
      if (remainingAmount > 0) {
        customerDebt = await Debt.create({
          type: "customer",
          name: customerName,
          phone: customerPhone,
          totalAmount: remainingAmount,
          paidAmount: 0,
          remainingAmount: remainingAmount,
          status: "unpaid",
          sale: newSale._id,
          createdBy: req.user.id,
          updatedBy: req.user.id,
        });
      }

      return res.status(201).json({
        message: "Sale created successfully",
        sale: newSale,
        debt: customerDebt,
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        message: "Something went wrong",
      });
    }
  }
);

// Get sales. Cashiers only receive their own sales.
// Access: Admin and Storekeeper see all. Cashier sees only their own.
router.get(
  "/",
  authMiddleware,
  roleMiddleware("admin", "cashier", "storekeeper"),
  async (req, res) => {
    try {
      const filter = {};

      // Cashier can only see sales they created
      if (req.user.role === "cashier") {
        filter.createdBy = req.user.id;
      }

      const sales = await Sale.find(filter)
        .populate("createdBy", "name")
        .sort({ createdAt: -1 });

      return res.status(200).json({
        sales: sales,
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        message: "Something went wrong",
      });
    }
  }
);

// Get one sale by ID. Cashiers can only open their own sale.
// Access: Admin, Cashier, Storekeeper
router.get(
  "/:id",
  authMiddleware,
  roleMiddleware("admin", "cashier", "storekeeper"),
  async (req, res) => {
    try {
      // Check if the sale exists
      const sale = await Sale.findById(req.params.id).populate("createdBy", "name");

      if (!sale) {
        return res.status(404).json({
          message: "Sale not found",
        });
      }

      // Block cashiers from viewing another user's sale
      if (req.user.role === "cashier") {
        const createdById = sale.createdBy && sale.createdBy._id ? sale.createdBy._id : sale.createdBy;

        if (String(createdById) !== String(req.user.id)) {
          return res.status(403).json({
            message: "You can only view your own sales",
          });
        }
      }

      return res.status(200).json({
        sale: sale,
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
