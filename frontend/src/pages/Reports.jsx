import { useEffect, useState } from "react";
import { Printer } from "lucide-react";
import { apiRequest } from "../api/api.js";
import { formatMoney } from "../utils/format.js";

function Reports() {
  const [period, setPeriod] = useState("month");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sales, setSales] = useState(null);
  const [purchases, setPurchases] = useState(null);
  const [expenses, setExpenses] = useState(null);
  const [cashFlow, setCashFlow] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(function () {
    loadReports();
  }, [period, startDate, endDate]);

  function reportQuery() {
    if (period === "custom") {
      const params = [];

      if (startDate) {
        params.push("startDate=" + startDate);
      }

      if (endDate) {
        params.push("endDate=" + endDate);
      }

      return params.length ? "?" + params.join("&") : "";
    }

    if (period === "all") {
      return "";
    }

    return "?period=" + period;
  }

  async function loadReports() {
    setLoading(true);
    setError("");

    const query = reportQuery();

    try {
      const salesResult = await apiRequest("/reports/sales" + query);
      const purchasesResult = await apiRequest("/reports/purchases" + query);
      const expensesResult = await apiRequest("/reports/expenses" + query);
      const cashResult = await apiRequest("/reports/cash-flow" + query);
      const dashboardResult = await apiRequest("/reports/dashboard" + query);
      const productsResult = await apiRequest("/products");

      if (
        salesResult.ok === false ||
        purchasesResult.ok === false ||
        expensesResult.ok === false ||
        cashResult.ok === false ||
        dashboardResult.ok === false
      ) {
        setError("Unable to load reports. Please try again.");
        setLoading(false);
        return;
      }

      setSales(salesResult.data);
      setPurchases(purchasesResult.data);
      setExpenses(expensesResult.data);
      setCashFlow(cashResult.data);
      setDashboard(dashboardResult.data);
      setProducts(productsResult.ok ? productsResult.data.products || [] : []);
    } catch (err) {
      setError("Unable to load reports. Please try again.");
    }

    setLoading(false);
  }

  const lowStock = products.filter(function (product) {
    return Number(product.quantity || 0) > 0 && Number(product.quantity || 0) <= 5;
  }).length;
  const outOfStock = products.filter(function (product) {
    return Number(product.quantity || 0) === 0;
  }).length;
  const totalStockQty = products.reduce(function (sum, product) {
    return sum + Number(product.quantity || 0);
  }, 0);

  const selectClass =
    "w-full min-w-0 rounded-md border border-slate-200 bg-white px-3 py-3 text-base text-[#07111F] outline-none focus:border-[#1B4F72] focus:ring-2 focus:ring-[#1B4F72]/20";

  return (
    <div className="w-full min-w-0 max-w-full space-y-4">
      <div className="no-print flex flex-col lg:flex-row lg:items-end gap-3">
        <select value={period} onChange={function (event) { setPeriod(event.target.value); }} className={selectClass + " lg:max-w-xs"}>
          <option value="today">Today</option>
          <option value="yesterday">Yesterday</option>
          <option value="week">This Week</option>
          <option value="month">This Month</option>
          <option value="custom">Custom Date Range</option>
          <option value="all">All Time</option>
        </select>
        {period === "custom" ? (
          <>
            <input type="date" value={startDate} onChange={function (event) { setStartDate(event.target.value); }} className={selectClass + " lg:max-w-[200px]"} />
            <input type="date" value={endDate} onChange={function (event) { setEndDate(event.target.value); }} className={selectClass + " lg:max-w-[200px]"} />
          </>
        ) : null}
        <button
          type="button"
          onClick={function () {
            window.print();
          }}
          className="inline-flex items-center justify-center gap-2 rounded-md bg-[#1B4F72] text-white px-4 py-3 text-sm min-h-11 lg:ml-auto"
        >
          <Printer size={18} />
          Print Report
        </button>
      </div>

      {loading ? <p className="px-5 py-10 text-center text-slate-500">Loading reports...</p> : null}

      {loading === false && error ? (
        <div className="bg-white border border-slate-200 rounded-lg p-6 text-center">
          <p className="text-red-600">{error}</p>
          <button type="button" onClick={loadReports} className="mt-3 min-h-11 rounded-md bg-[#1B4F72] px-4 text-sm text-white">
            Try Again
          </button>
        </div>
      ) : null}

      {loading === false && !error ? (
        <div className="space-y-4">
          <section className="bg-white border border-slate-200 rounded-lg shadow-sm p-5">
            <h2 className="text-lg font-semibold text-[#07111F]">Sales Summary</h2>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
              <SummaryBox label="Total Sales" value={formatMoney(sales.totalSales)} />
              <SummaryBox label="Total Paid" value={formatMoney(sales.totalPaid)} />
              <SummaryBox label="Total Remaining" value={formatMoney(sales.totalRemaining)} />
              <SummaryBox label="Total Profit" value={formatMoney(sales.totalProfit)} />
              <SummaryBox label="Number of Sales" value={sales.count} />
            </div>
          </section>

          <section className="bg-white border border-slate-200 rounded-lg shadow-sm p-5">
            <h2 className="text-lg font-semibold text-[#07111F]">Purchase Summary</h2>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
              <SummaryBox label="Total Purchases" value={formatMoney(purchases.totalPurchases)} />
              <SummaryBox label="Total Paid" value={formatMoney(purchases.totalPaid)} />
              <SummaryBox label="Total Remaining" value={formatMoney(purchases.totalRemaining)} />
              <SummaryBox label="Number of Purchases" value={purchases.count} />
            </div>
          </section>

          <section className="bg-white border border-slate-200 rounded-lg shadow-sm p-5">
            <h2 className="text-lg font-semibold text-[#07111F]">Cash Flow</h2>
            <p className="text-sm text-slate-500 mt-1">Profit is not the same as cash flow.</p>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <SummaryBox label="Cash In" value={formatMoney(cashFlow.cashIn && cashFlow.cashIn.total)} />
              <SummaryBox label="Cash Out" value={formatMoney(cashFlow.cashOut && cashFlow.cashOut.total)} />
              <SummaryBox label="Net Cash Flow" value={formatMoney(cashFlow.netCash)} />
            </div>
          </section>

          <section className="bg-white border border-slate-200 rounded-lg shadow-sm p-5">
            <h2 className="text-lg font-semibold text-[#07111F]">Expenses</h2>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <SummaryBox label="Total Expenses" value={formatMoney(expenses.totalExpenses)} />
              <SummaryBox label="Number of Expenses" value={expenses.count} />
            </div>
          </section>

          <section className="bg-white border border-slate-200 rounded-lg shadow-sm p-5">
            <h2 className="text-lg font-semibold text-[#07111F]">Debts</h2>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <SummaryBox label="Customer Debt" value={formatMoney(dashboard.outstandingCustomerDebt)} />
              <SummaryBox label="Supplier Debt" value={formatMoney(dashboard.outstandingSupplierDebt)} />
              <SummaryBox
                label="Total Outstanding Debt"
                value={formatMoney(
                  Number(dashboard.outstandingCustomerDebt || 0) + Number(dashboard.outstandingSupplierDebt || 0)
                )}
              />
            </div>
          </section>

          <section className="bg-white border border-slate-200 rounded-lg shadow-sm p-5">
            <h2 className="text-lg font-semibold text-[#07111F]">Stock</h2>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
              <SummaryBox label="Total Products" value={products.length} />
              <SummaryBox label="Total Stock Quantity" value={totalStockQty} />
              <SummaryBox label="Low Stock Products" value={lowStock} />
              <SummaryBox label="Out of Stock Products" value={outOfStock} />
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}

function SummaryBox({ label, value }) {
  return (
    <div className="rounded-md bg-[#F4F7FA] px-4 py-4 min-w-0">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="text-xl font-semibold text-[#07111F] mt-2 break-words">{value}</p>
    </div>
  );
}

export default Reports;
