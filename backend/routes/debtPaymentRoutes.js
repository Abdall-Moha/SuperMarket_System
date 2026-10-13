import express from "express";
import DebtPayment from "../models/DebtPayment.js";
import Debt from "../models/Debt.js";
import Sale from "../models/Sale.js";
import Purchase from "../models/Purchase.js";
import authMiddleware from "../middleware/authMiddleware.js";
import roleMiddleware from "../middleware/roleMiddleware.js";

const router = express.Router();

// Record a payment against a debt
// Access: Admin, Cashier, Storekeeper
router.post(
  "/",
  authMiddleware,
  roleMiddleware("admin", "cashier", "storekeeper"),
  async (req, res) => {
    try {
      const debtId = req.body.debt;
      const amount = Number(req.body.amount);
      const paymentMethod = req.body.paymentMethod;
      const note = req.body.note;

      if (!debtId) {
        return res.status(400).json({
          message: "Debt id is required",
        });
      }

      if (isNaN(amount) || amount <= 0) {
        return res.status(400).json({
          message: "Payment amount must be greater than 0",
        });
      }

      if (
        paymentMethod !== "cash" &&
        paymentMethod !== "evc" &&
        paymentMethod !== "edahab" &&
        paymentMethod !== "bank"
      ) {
        return res.status(400).json({
          message: "Payment method must be cash, evc, edahab, or bank",
        });
      }

      // Check if the debt exists
      const debt = await Debt.findById(debtId);

      if (!debt) {
        return res.status(404).json({
          message: "Debt not found",
        });
      }

      if (amount > debt.remainingAmount) {
        return res.status(400).json({
          message: "Payment amount cannot be more than the remaining debt",
        });
      }

      // Save this payment as its own record
      const newPayment = await DebtPayment.create({
        debt: debt._id,
        amount: amount,
        paymentMethod: paymentMethod,
        note: note,
        createdBy: req.user.id,
      });

      // Update the remaining amount on the debt
      debt.paidAmount = debt.paidAmount + amount;
      debt.remainingAmount = debt.remainingAmount - amount;

      if (debt.remainingAmount === 0) {
        debt.status = "paid";
      } else if (debt.paidAmount > 0 && debt.remainingAmount > 0) {
        debt.status = "partial";
      } else {
        debt.status = "unpaid";
      }

      debt.updatedBy = req.user.id;
      await debt.save();

      // Keep the related sale or purchase in sync with this payment
      if (debt.sale) {
        const sale = await Sale.findById(debt.sale);

        if (sale) {
          sale.paidAmount = sale.paidAmount + amount;
          sale.remainingAmount = sale.totalAmount - sale.paidAmount;

          if (sale.remainingAmount < 0) {
            sale.remainingAmount = 0;
          }

          if (sale.paidAmount >= sale.totalAmount) {
            sale.paidAmount = sale.totalAmount;
            sale.remainingAmount = 0;
            sale.paymentStatus = "paid";
          } else if (sale.paidAmount === 0) {
            sale.paymentStatus = "unpaid";
          } else {
            sale.paymentStatus = "partial";
          }

          sale.updatedBy = req.user.id;
          await sale.save();
        }
      }

      if (debt.purchase) {
        const purchase = await Purchase.findById(debt.purchase);

        if (purchase) {
          purchase.paidAmount = purchase.paidAmount + amount;
          purchase.remainingAmount = purchase.totalAmount - purchase.paidAmount;

          if (purchase.remainingAmount < 0) {
            purchase.remainingAmount = 0;
          }

          if (purchase.paidAmount >= purchase.totalAmount) {
            purchase.paidAmount = purchase.totalAmount;
            purchase.remainingAmount = 0;
            purchase.paymentStatus = "paid";
          } else if (purchase.paidAmount === 0) {
            purchase.paymentStatus = "unpaid";
          } else {
            purchase.paymentStatus = "partial";
          }

          purchase.updatedBy = req.user.id;
          await purchase.save();
        }
      }

      return res.status(201).json({
        message: "Debt payment recorded successfully",
        payment: newPayment,
        debt: debt,
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        message: "Something went wrong",
      });
    }
  }
);

// Get all debt payments
// Access: Admin, Cashier, Storekeeper
router.get(
  "/",
  authMiddleware,
  roleMiddleware("admin", "cashier", "storekeeper"),
  async (req, res) => {
    try {
      const payments = await DebtPayment.find()
        .populate("debt")
        .populate("createdBy", "name")
        .sort({ createdAt: -1 });

      return res.status(200).json({
        payments: payments,
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
