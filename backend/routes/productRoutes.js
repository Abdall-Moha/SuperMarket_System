import express from "express";
import Product from "../models/Product.js";
import authMiddleware from "../middleware/authMiddleware.js";
import roleMiddleware from "../middleware/roleMiddleware.js";

const router = express.Router();

// Create a new product
// Access: Admin, Cashier, Storekeeper
router.post(
  "/",
  authMiddleware,
  roleMiddleware("admin", "cashier", "storekeeper"),
  async (req, res) => {
    try {
      const name = req.body.name;
      const purchasePrice = Number(req.body.purchasePrice);
      const sellingPrice = Number(req.body.sellingPrice);
      const unit = req.body.unit;
      let quantity = req.body.quantity;

      if (!name || !unit) {
        return res.status(400).json({
          message: "Please provide name and unit",
        });
      }

      if (isNaN(purchasePrice) || purchasePrice < 0) {
        return res.status(400).json({
          message: "Purchase price must be 0 or more",
        });
      }

      if (isNaN(sellingPrice) || sellingPrice < 0) {
        return res.status(400).json({
          message: "Selling price must be 0 or more",
        });
      }

      // New products start at 0 stock unless an opening quantity is given
      if (quantity === undefined || quantity === null || quantity === "") {
        quantity = 0;
      } else {
        quantity = Number(quantity);
      }

      if (isNaN(quantity) || quantity < 0) {
        return res.status(400).json({
          message: "Quantity cannot be negative",
        });
      }

      // Create the new product
      const newProduct = await Product.create({
        name: name,
        quantity: quantity,
        purchasePrice: purchasePrice,
        sellingPrice: sellingPrice,
        unit: unit,
        createdBy: req.user.id,
        updatedBy: req.user.id,
      });

      return res.status(201).json({
        message: "Product created successfully",
        product: newProduct,
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        message: "Something went wrong",
      });
    }
  }
);

// Get all products
// Access: Admin, Cashier, Storekeeper
router.get(
  "/",
  authMiddleware,
  roleMiddleware("admin", "cashier", "storekeeper"),
  async (req, res) => {
    try {
      const products = await Product.find()
        .populate("createdBy", "name")
        .sort({ createdAt: -1 });

      return res.status(200).json({
        products: products,
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        message: "Something went wrong",
      });
    }
  }
);

// Get one product by ID
// Access: Admin, Cashier, Storekeeper
router.get(
  "/:id",
  authMiddleware,
  roleMiddleware("admin", "cashier", "storekeeper"),
  async (req, res) => {
    try {
      // Check if the product exists
      const product = await Product.findById(req.params.id).populate("createdBy", "name");

      if (!product) {
        return res.status(404).json({
          message: "Product not found",
        });
      }

      return res.status(200).json({
        product: product,
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        message: "Something went wrong",
      });
    }
  }
);

// Update a product
// Access: Admin, Storekeeper
router.put(
  "/:id",
  authMiddleware,
  roleMiddleware("admin", "storekeeper"),
  async (req, res) => {
    try {
      // Check if the product exists
      const product = await Product.findById(req.params.id);

      if (!product) {
        return res.status(404).json({
          message: "Product not found",
        });
      }

      const name = req.body.name;
      const purchasePrice = req.body.purchasePrice;
      const sellingPrice = req.body.sellingPrice;
      const unit = req.body.unit;

      // Update the product information
      if (name) {
        product.name = name;
      }

      if (unit) {
        product.unit = unit;
      }

      if (purchasePrice !== undefined && purchasePrice !== null && purchasePrice !== "") {
        const newPurchasePrice = Number(purchasePrice);

        if (isNaN(newPurchasePrice) || newPurchasePrice < 0) {
          return res.status(400).json({
            message: "Purchase price must be 0 or more",
          });
        }

        product.purchasePrice = newPurchasePrice;
      }

      if (sellingPrice !== undefined && sellingPrice !== null && sellingPrice !== "") {
        const newSellingPrice = Number(sellingPrice);

        if (isNaN(newSellingPrice) || newSellingPrice < 0) {
          return res.status(400).json({
            message: "Selling price must be 0 or more",
          });
        }

        product.sellingPrice = newSellingPrice;
      }

      // Quantity is not updated here. Stock only changes through purchases and sales.
      product.updatedBy = req.user.id;
      await product.save();

      return res.status(200).json({
        message: "Product updated successfully",
        product: product,
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        message: "Something went wrong",
      });
    }
  }
);

// Permanently delete a product
// Access: Admin
router.delete(
  "/:id",
  authMiddleware,
  roleMiddleware("admin"),
  async (req, res) => {
    try {
      const product = await Product.findById(req.params.id);

      if (!product) {
        return res.status(404).json({
          message: "Product not found",
        });
      }

      await product.deleteOne();

      return res.status(200).json({
        message: "Product deleted successfully",
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
