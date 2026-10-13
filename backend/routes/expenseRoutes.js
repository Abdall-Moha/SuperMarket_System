import express from "express";
import Expense from "../models/Expense.js";
import authMiddleware from "../middleware/authMiddleware.js";
import roleMiddleware from "../middleware/roleMiddleware.js";

const router = express.Router();

// Create a new expense
// Access: Admin, Storekeeper
router.post("/", authMiddleware, roleMiddleware("admin", "storekeeper"), async (req, res) => {
  try {
    const title = req.body.title;
    const amount = Number(req.body.amount);
    const reason = req.body.reason;
    const paymentMethod = req.body.paymentMethod;

    if (!title || !reason) {
      return res.status(400).json({
        message: "Please provide title and reason",
      });
    }

    if (isNaN(amount) || amount < 0) {
      return res.status(400).json({
        message: "Amount must be 0 or more",
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

    // Create the expense record
    const newExpense = await Expense.create({
      title: title,
      amount: amount,
      reason: reason,
      paymentMethod: paymentMethod,
      createdBy: req.user.id,
      updatedBy: req.user.id,
    });

    return res.status(201).json({
      message: "Expense created successfully",
      expense: newExpense,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Something went wrong",
    });
  }
});

// Get all expenses
// Access: Admin, Storekeeper
router.get("/", authMiddleware, roleMiddleware("admin", "storekeeper"), async (req, res) => {
  try {
    const expenses = await Expense.find()
      .populate("createdBy", "name")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      expenses: expenses,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Something went wrong",
    });
  }
});

// Get one expense by ID
// Access: Admin, Storekeeper
router.get("/:id", authMiddleware, roleMiddleware("admin", "storekeeper"), async (req, res) => {
  try {
    // Check if the expense exists
    const expense = await Expense.findById(req.params.id).populate("createdBy", "name");

    if (!expense) {
      return res.status(404).json({
        message: "Expense not found",
      });
    }

    return res.status(200).json({
      expense: expense,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Something went wrong",
    });
  }
});

// Update an expense
// Access: Admin, Storekeeper
router.put("/:id", authMiddleware, roleMiddleware("admin", "storekeeper"), async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);

    if (!expense) {
      return res.status(404).json({
        message: "Expense not found",
      });
    }

    const title = req.body.title;
    const amount = req.body.amount;
    const reason = req.body.reason;
    const paymentMethod = req.body.paymentMethod;

    // Update the expense information
    if (title) {
      expense.title = title;
    }

    if (reason) {
      expense.reason = reason;
    }

    if (amount !== undefined && amount !== null && amount !== "") {
      const newAmount = Number(amount);

      if (isNaN(newAmount) || newAmount < 0) {
        return res.status(400).json({
          message: "Amount must be 0 or more",
        });
      }

      expense.amount = newAmount;
    }

    if (paymentMethod) {
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

      expense.paymentMethod = paymentMethod;
    }

    expense.updatedBy = req.user.id;
    await expense.save();

    return res.status(200).json({
      message: "Expense updated successfully",
      expense: expense,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Something went wrong",
    });
  }
});

// Permanently delete an expense
// Access: Admin, Storekeeper
router.delete("/:id", authMiddleware, roleMiddleware("admin", "storekeeper"), async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);

    if (!expense) {
      return res.status(404).json({
        message: "Expense not found",
      });
    }

    await expense.deleteOne();

    return res.status(200).json({
      message: "Expense deleted successfully",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Something went wrong",
    });
  }
});

export default router;
