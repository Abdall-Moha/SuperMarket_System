import express from "express";
import Sale from "../models/Sale.js";
import Purchase from "../models/Purchase.js";
import Expense from "../models/Expense.js";
import Product from "../models/Product.js";
import Debt from "../models/Debt.js";
import DebtPayment from "../models/DebtPayment.js";
import authMiddleware from "../middleware/authMiddleware.js";
import roleMiddleware from "../middleware/roleMiddleware.js";

const router = express.Router();

// Supports period=today|yesterday|week|month, or startDate/endDate (YYYY-MM-DD).
function getDateFilter(query) {
  const period = query.period;
  const startInput = query.startDate;
  const endInput = query.endDate;

  if (startInput || endInput) {
    const createdAt = {};

    if (startInput) {
      createdAt.$gte = new Date(startInput + "T00:00:00");
    }

    if (endInput) {
      createdAt.$lte = new Date(endInput + "T23:59:59.999");
    }

    return {
      createdAt: createdAt,
    };
  }

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let startDate = null;
  let endDate = null;

  if (period === "today") {
    startDate = startOfToday;
  }

  if (period === "yesterday") {
    startDate = new Date(startOfToday);
    startDate.setDate(startDate.getDate() - 1);
    endDate = startOfToday;
  }

  if (period === "week") {
    const day = now.getDay();
    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day);
  }

  if (period === "month") {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  }

  if (!startDate) {
    return {};
  }

  const createdAt = {
    $gte: startDate,
  };

  if (endDate) {
    createdAt.$lt = endDate;
  }

  return {
    createdAt: createdAt,
  };
}

// Get the dashboard summary
// Access: Admin and Storekeeper see the full shop. Cashier sees only their own sales.
router.get(
  "/dashboard",
  authMiddleware,
  roleMiddleware("admin", "storekeeper", "cashier"),
  async (req, res) => {
  try {
    const dateFilter = getDateFilter(req.query);

    // Cashier dashboard: only this cashier's own sales
    if (req.user.role === "cashier") {
      dateFilter.createdBy = req.user.id;
      const sales = await Sale.find(dateFilter);

      let totalSales = 0;
      let totalProfit = 0;
      let cashInFromSales = 0;
      let totalRemaining = 0;

      for (let i = 0; i < sales.length; i++) {
        const sale = sales[i];
        totalSales = totalSales + sale.totalAmount;
        totalRemaining = totalRemaining + sale.remainingAmount;

        const relatedDebt = await Debt.findOne({ sale: sale._id });

        if (relatedDebt) {
          cashInFromSales = cashInFromSales + (sale.totalAmount - relatedDebt.totalAmount);
        } else {
          cashInFromSales = cashInFromSales + sale.paidAmount;
        }

        for (let j = 0; j < sale.items.length; j++) {
          const itemProfit = sale.items[j].profit || 0;
          totalProfit = totalProfit + itemProfit;
        }
      }

      return res.status(200).json({
        period: req.query.period || "all",
        totalSales: totalSales,
        totalProfit: totalProfit,
        cashInFromSales: cashInFromSales,
        totalRemaining: totalRemaining,
      });
    }

    // Full shop dashboard for admin and storekeeper
    const sales = await Sale.find(dateFilter);
    const purchases = await Purchase.find(dateFilter);
    const expenses = await Expense.find(dateFilter);
    const products = await Product.find();
    const debts = await Debt.find();
    const debtPayments = await DebtPayment.find(dateFilter).populate("debt");

    let totalSales = 0;
    let totalProfit = 0;
    let cashInFromSales = 0;

    for (let i = 0; i < sales.length; i++) {
      const sale = sales[i];
      totalSales = totalSales + sale.totalAmount;

      // Money paid at the sale, not later debt payments
      const relatedDebt = await Debt.findOne({ sale: sale._id });

      if (relatedDebt) {
        cashInFromSales = cashInFromSales + (sale.totalAmount - relatedDebt.totalAmount);
      } else {
        cashInFromSales = cashInFromSales + sale.paidAmount;
      }

      for (let j = 0; j < sale.items.length; j++) {
        const itemProfit = sale.items[j].profit || 0;
        totalProfit = totalProfit + itemProfit;
      }
    }

    let totalPurchases = 0;
    let cashOutFromPurchases = 0;

    for (let i = 0; i < purchases.length; i++) {
      const purchase = purchases[i];
      totalPurchases = totalPurchases + purchase.totalAmount;

      const relatedDebt = await Debt.findOne({ purchase: purchase._id });

      if (relatedDebt) {
        cashOutFromPurchases = cashOutFromPurchases + (purchase.totalAmount - relatedDebt.totalAmount);
      } else {
        cashOutFromPurchases = cashOutFromPurchases + purchase.paidAmount;
      }
    }

    let totalExpenses = 0;

    for (let i = 0; i < expenses.length; i++) {
      totalExpenses = totalExpenses + expenses[i].amount;
    }

    let cashInFromCustomerDebts = 0;
    let cashOutFromSupplierDebts = 0;

    for (let i = 0; i < debtPayments.length; i++) {
      const payment = debtPayments[i];

      if (payment.debt && payment.debt.type === "customer") {
        cashInFromCustomerDebts = cashInFromCustomerDebts + payment.amount;
      }

      if (payment.debt && payment.debt.type === "supplier") {
        cashOutFromSupplierDebts = cashOutFromSupplierDebts + payment.amount;
      }
    }

    // Cash in = money received at sale time + later customer debt payments
    const totalCashIn = cashInFromSales + cashInFromCustomerDebts;
    const totalCashOut = cashOutFromPurchases + totalExpenses + cashOutFromSupplierDebts;

    // Current stock value is always now, not filtered by date
    let currentStockValue = 0;

    for (let i = 0; i < products.length; i++) {
      currentStockValue = currentStockValue + products[i].quantity * products[i].purchasePrice;
    }

    let outstandingCustomerDebt = 0;
    let outstandingSupplierDebt = 0;

    for (let i = 0; i < debts.length; i++) {
      const debt = debts[i];

      if (debt.type === "customer") {
        outstandingCustomerDebt = outstandingCustomerDebt + debt.remainingAmount;
      }

      if (debt.type === "supplier") {
        outstandingSupplierDebt = outstandingSupplierDebt + debt.remainingAmount;
      }
    }

    return res.status(200).json({
      period: req.query.period || "all",
      totalSales: totalSales,
      totalPurchases: totalPurchases,
      totalExpenses: totalExpenses,
      totalProfit: totalProfit,
      totalCashIn: totalCashIn,
      totalCashOut: totalCashOut,
      currentStockValue: currentStockValue,
      outstandingCustomerDebt: outstandingCustomerDebt,
      outstandingSupplierDebt: outstandingSupplierDebt,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Something went wrong",
    });
  }
});

// Get the sales report. Cashiers only receive their own sales.
// Access: Admin, Storekeeper, Cashier
router.get(
  "/sales",
  authMiddleware,
  roleMiddleware("admin", "storekeeper", "cashier"),
  async (req, res) => {
    try {
      const dateFilter = getDateFilter(req.query);

      // Limit the cashier report to sales they created
      if (req.user.role === "cashier") {
        dateFilter.createdBy = req.user.id;
      }

      const sales = await Sale.find(dateFilter).sort({ createdAt: -1 });

      let totalSales = 0;
      let totalPaid = 0;
      let totalRemaining = 0;
      let totalProfit = 0;

      for (let i = 0; i < sales.length; i++) {
        const sale = sales[i];
        totalSales = totalSales + sale.totalAmount;
        totalPaid = totalPaid + sale.paidAmount;
        totalRemaining = totalRemaining + sale.remainingAmount;

        for (let j = 0; j < sale.items.length; j++) {
          totalProfit = totalProfit + (sale.items[j].profit || 0);
        }
      }

      return res.status(200).json({
        period: req.query.period || "all",
        count: sales.length,
        totalSales: totalSales,
        totalPaid: totalPaid,
        totalRemaining: totalRemaining,
        totalProfit: totalProfit,
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

// Get the purchases report
// Access: Admin, Storekeeper
router.get(
  "/purchases",
  authMiddleware,
  roleMiddleware("admin", "storekeeper"),
  async (req, res) => {
    try {
      const dateFilter = getDateFilter(req.query);
      const purchases = await Purchase.find(dateFilter).sort({ createdAt: -1 });

      let totalPurchases = 0;
      let totalPaid = 0;
      let totalRemaining = 0;

      for (let i = 0; i < purchases.length; i++) {
        totalPurchases = totalPurchases + purchases[i].totalAmount;
        totalPaid = totalPaid + purchases[i].paidAmount;
        totalRemaining = totalRemaining + purchases[i].remainingAmount;
      }

      return res.status(200).json({
        period: req.query.period || "all",
        count: purchases.length,
        totalPurchases: totalPurchases,
        totalPaid: totalPaid,
        totalRemaining: totalRemaining,
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

// Get the expenses report
// Access: Admin, Storekeeper
router.get("/expenses", authMiddleware, roleMiddleware("admin", "storekeeper"), async (req, res) => {
  try {
    const dateFilter = getDateFilter(req.query);
    const expenses = await Expense.find(dateFilter).sort({ createdAt: -1 });

    let totalExpenses = 0;

    for (let i = 0; i < expenses.length; i++) {
      totalExpenses = totalExpenses + expenses[i].amount;
    }

    return res.status(200).json({
      period: req.query.period || "all",
      count: expenses.length,
      totalExpenses: totalExpenses,
      expenses: expenses,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Something went wrong",
    });
  }
});

// Get the profit report from sale item snapshots
// Access: Admin, Storekeeper
router.get("/profit", authMiddleware, roleMiddleware("admin", "storekeeper"), async (req, res) => {
  try {
    const dateFilter = getDateFilter(req.query);
    const sales = await Sale.find(dateFilter).sort({ createdAt: -1 });

    let totalProfit = 0;
    let totalSales = 0;
    const profitBySale = [];

    for (let i = 0; i < sales.length; i++) {
      const sale = sales[i];
      let saleProfit = 0;

      for (let j = 0; j < sale.items.length; j++) {
        saleProfit = saleProfit + (sale.items[j].profit || 0);
      }

      totalProfit = totalProfit + saleProfit;
      totalSales = totalSales + sale.totalAmount;

      profitBySale.push({
        saleId: sale._id,
        createdAt: sale.createdAt,
        totalAmount: sale.totalAmount,
        profit: saleProfit,
      });
    }

    return res.status(200).json({
      period: req.query.period || "all",
      totalSales: totalSales,
      totalProfit: totalProfit,
      sales: profitBySale,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Something went wrong",
    });
  }
});

// Get cash in and cash out
// Access: Admin, Storekeeper
router.get("/cash-flow", authMiddleware, roleMiddleware("admin", "storekeeper"), async (req, res) => {
  try {
    const dateFilter = getDateFilter(req.query);

    const sales = await Sale.find(dateFilter);
    const purchases = await Purchase.find(dateFilter);
    const expenses = await Expense.find(dateFilter);
    const debtPayments = await DebtPayment.find(dateFilter).populate("debt");

    let cashInFromSales = 0;

    for (let i = 0; i < sales.length; i++) {
      const sale = sales[i];
      const relatedDebt = await Debt.findOne({ sale: sale._id });

      if (relatedDebt) {
        cashInFromSales = cashInFromSales + (sale.totalAmount - relatedDebt.totalAmount);
      } else {
        cashInFromSales = cashInFromSales + sale.paidAmount;
      }
    }

    let cashOutFromPurchases = 0;

    for (let i = 0; i < purchases.length; i++) {
      const purchase = purchases[i];
      const relatedDebt = await Debt.findOne({ purchase: purchase._id });

      if (relatedDebt) {
        cashOutFromPurchases = cashOutFromPurchases + (purchase.totalAmount - relatedDebt.totalAmount);
      } else {
        cashOutFromPurchases = cashOutFromPurchases + purchase.paidAmount;
      }
    }

    let cashOutFromExpenses = 0;

    for (let i = 0; i < expenses.length; i++) {
      cashOutFromExpenses = cashOutFromExpenses + expenses[i].amount;
    }

    let cashInFromCustomerDebts = 0;
    let cashOutFromSupplierDebts = 0;

    for (let i = 0; i < debtPayments.length; i++) {
      const payment = debtPayments[i];

      if (payment.debt && payment.debt.type === "customer") {
        cashInFromCustomerDebts = cashInFromCustomerDebts + payment.amount;
      }

      if (payment.debt && payment.debt.type === "supplier") {
        cashOutFromSupplierDebts = cashOutFromSupplierDebts + payment.amount;
      }
    }

    // Net cash is cash in minus cash out
    const totalCashIn = cashInFromSales + cashInFromCustomerDebts;
    const totalCashOut = cashOutFromPurchases + cashOutFromExpenses + cashOutFromSupplierDebts;

    return res.status(200).json({
      period: req.query.period || "all",
      cashIn: {
        fromSales: cashInFromSales,
        fromCustomerDebtPayments: cashInFromCustomerDebts,
        total: totalCashIn,
      },
      cashOut: {
        fromPurchases: cashOutFromPurchases,
        fromExpenses: cashOutFromExpenses,
        fromSupplierDebtPayments: cashOutFromSupplierDebts,
        total: totalCashOut,
      },
      netCash: totalCashIn - totalCashOut,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Something went wrong",
    });
  }
});

export default router;
