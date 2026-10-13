import express from "express";
import Debt from "../models/Debt.js";
import authMiddleware from "../middleware/authMiddleware.js";
import roleMiddleware from "../middleware/roleMiddleware.js";

const router = express.Router();

// Get all debts. Optional filters: type and status
// Access: Admin, Cashier, Storekeeper
router.get(
  "/",
  authMiddleware,
  roleMiddleware("admin", "cashier", "storekeeper"),
  async (req, res) => {
    try {
      const filter = {};
      const type = req.query.type;
      const status = req.query.status;

      if (type === "customer" || type === "supplier") {
        filter.type = type;
      }

      if (status === "unpaid" || status === "partial" || status === "paid") {
        filter.status = status;
      }

      const debts = await Debt.find(filter)
        .populate("createdBy", "name")
        .sort({ createdAt: -1 });

      return res.status(200).json({
        debts: debts,
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        message: "Something went wrong",
      });
    }
  }
);

// Get one debt by ID
// Access: Admin, Cashier, Storekeeper
router.get(
  "/:id",
  authMiddleware,
  roleMiddleware("admin", "cashier", "storekeeper"),
  async (req, res) => {
    try {
      // Check if the debt exists
      const debt = await Debt.findById(req.params.id);

      if (!debt) {
        return res.status(404).json({
          message: "Debt not found",
        });
      }

      return res.status(200).json({
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

export default router;
