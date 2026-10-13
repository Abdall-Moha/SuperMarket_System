import { useEffect, useState } from "react";
import {
  ShoppingBag,
  Wallet,
  TrendingUp,
  ArrowDownCircle,
  ArrowUpCircle,
  Users,
  Truck,
  Boxes,
  AlertTriangle,
  PackageX,
} from "lucide-react";
import { apiRequest } from "../api/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import {
  formatMoney,
  formatDate,
  recordedByName,
} from "../utils/format.js";
import StatusBadge from "../components/StatusBadge.jsx";

function Dashboard() {
  const { user } = useAuth();
  const isCashier = user.role === "cashier";

  const [summary, setSummary] = useState(null);
  const [sales, setSales] = useState([]);
  const [products, setProducts] = useState([]);
  const [debts, setDebts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(function () {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    setLoading(true);
    setError("");

    try {
      const summaryResult = await apiRequest("/reports/dashboard");
      const salesResult = await apiRequest("/sales");
      const productsResult = await apiRequest("/products");
      const debtsResult = await apiRequest("/debts");

      if (summaryResult.ok === false) {
        setError(summaryResult.data.message || "Unable to load the dashboard.");
        setLoading(false);
        return;
      }

      setSummary(summaryResult.data);

      if (salesResult.ok) {
        setSales(salesResult.data.sales || []);
      }

      if (productsResult.ok) {
        setProducts(productsResult.data.products || []);
      }

      if (debtsResult.ok) {
        setDebts(debtsResult.data.debts || []);
      }
    } catch (err) {
      setError("Unable to load the dashboard.");
    }

    setLoading(false);
  }

  const recentSales = sales.slice(0, 6);
  const lowStockProducts = products.filter(function (product) {
    return Number(product.quantity || 0) > 0 && Number(product.quantity || 0) <= 5;
  });
  const outOfStockProducts = products.filter(function (product) {
    return Number(product.quantity || 0) === 0;
  });
  const totalStockQty = products.reduce(function (sum, product) {
    return sum + Number(product.quantity || 0);
  }, 0);

  let customerDebt = summary && summary.outstandingCustomerDebt !== undefined
    ? summary.outstandingCustomerDebt
    : 0;
  let supplierDebt = summary && summary.outstandingSupplierDebt !== undefined
    ? summary.outstandingSupplierDebt
    : 0;

  // Cashier dashboard API does not include debts, so use the debts list.
  if (isCashier) {
    customerDebt = 0;
    supplierDebt = 0;

    for (let i = 0; i < debts.length; i++) {
      if (debts[i].type === "customer") {
        customerDebt = customerDebt + Number(debts[i].remainingAmount || 0);
      }

      if (debts[i].type === "supplier") {
        supplierDebt = supplierDebt + Number(debts[i].remainingAmount || 0);
      }
    }
  }

  const cards = [
    {
      title: "Total Sales",
      value: formatMoney(summary ? summary.totalSales : 0),
      icon: ShoppingBag,
      show: true,
    },
    {
      title: "Cash In",
      value: formatMoney(summary ? summary.totalCashIn || summary.cashInFromSales : 0),
      icon: ArrowDownCircle,
      show: true,
    },
    {
      title: "Cash Out",
      value: formatMoney(summary ? summary.totalCashOut : 0),
      icon: ArrowUpCircle,
      show: !isCashier,
    },
    {
      title: "Current Stock",
      value: formatMoney(summary ? summary.currentStockValue : 0),
      icon: Boxes,
      show: !isCashier,
    },
    {
      title: "Total Profit",
      value: formatMoney(summary ? summary.totalProfit : 0),
      icon: TrendingUp,
      show: true,
    },
    {
      title: "Outstanding Customer Debt",
      value: formatMoney(customerDebt),
      icon: Users,
      show: true,
    },
    {
      title: "Outstanding Supplier Debt",
      value: formatMoney(supplierDebt),
      icon: Truck,
      show: !isCashier,
    },
  ].filter(function (card) {
    return card.show;
  });

  if (isCashier) {
    cards.splice(2, 0, {
      title: "Remaining Sales",
      value: formatMoney(summary ? summary.totalRemaining : 0),
      icon: Wallet,
      show: true,
    });
  }

  return (
    <div className="w-full min-w-0 max-w-full space-y-6">
      {loading ? (
        <p className="px-5 py-10 text-center text-slate-500">Loading dashboard...</p>
      ) : null}

      {loading === false && error ? (
        <div className="bg-white border border-slate-200 rounded-lg p-6 text-center">
          <p className="text-red-600">{error}</p>
          <button
            type="button"
            onClick={loadDashboard}
            className="mt-3 min-h-11 rounded-md bg-[#1B4F72] px-4 text-sm text-white"
          >
            Try Again
          </button>
        </div>
      ) : null}

      {loading === false && !error ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {cards.map(function (card) {
              const Icon = card.icon;

              return (
                <div
                  key={card.title}
                  className="min-w-0 bg-white border border-slate-200 rounded-lg p-5 shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-md bg-[#102A43] text-white flex items-center justify-center shrink-0">
                      <Icon size={20} />
                    </div>
                    <p className="text-sm text-slate-500">{card.title}</p>
                  </div>
                  <p className="text-2xl font-semibold text-[#07111F] mt-4 break-words">
                    {card.value}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 min-w-0">
            <div className="xl:col-span-2 min-w-0 bg-white border border-slate-200 rounded-lg shadow-sm">
              <div className="px-5 py-4 border-b border-slate-200">
                <h2 className="text-lg font-semibold text-[#07111F]">Recent Sales</h2>
                <p className="text-sm text-slate-500 mt-1">Latest recorded sales</p>
              </div>

              {recentSales.length === 0 ? (
                <p className="px-5 py-10 text-center text-slate-500">No sales found.</p>
              ) : (
                <div className="w-full min-w-0 overflow-x-auto">
                  <table className="w-full min-w-[720px] text-left">
                    <thead className="bg-[#F4F7FA] text-sm text-slate-500">
                      <tr>
                        <th className="px-4 py-3 font-medium">Customer</th>
                        <th className="px-4 py-3 font-medium">Amount</th>
                        <th className="px-4 py-3 font-medium">Paid</th>
                        <th className="px-4 py-3 font-medium">Remaining</th>
                        <th className="px-4 py-3 font-medium">Status</th>
                        <th className="px-4 py-3 font-medium">Recorded By</th>
                        <th className="px-4 py-3 font-medium">Date</th>
                      </tr>
                    </thead>
                    <tbody className="text-[15px] text-[#07111F]">
                      {recentSales.map(function (sale) {
                        return (
                          <tr key={sale._id} className="border-t border-slate-100 hover:bg-slate-50">
                            <td className="px-4 py-3 font-medium">
                              {sale.customer && sale.customer.name ? sale.customer.name : "Walk-in"}
                            </td>
                            <td className="px-4 py-3">{formatMoney(sale.totalAmount)}</td>
                            <td className="px-4 py-3">{formatMoney(sale.paidAmount)}</td>
                            <td className="px-4 py-3">{formatMoney(sale.remainingAmount)}</td>
                            <td className="px-4 py-3">
                              <StatusBadge status={sale.paymentStatus} />
                            </td>
                            <td className="px-4 py-3">{recordedByName(sale)}</td>
                            <td className="px-4 py-3">{formatDate(sale.createdAt)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="min-w-0 bg-white border border-slate-200 rounded-lg shadow-sm p-5">
              <h2 className="text-lg font-semibold text-[#07111F]">Stock Overview</h2>
              <p className="text-sm text-slate-500 mt-1">Current inventory status</p>

              <div className="mt-5 space-y-4">
                <div className="flex items-center justify-between gap-3 rounded-md bg-[#F4F7FA] px-4 py-4 min-w-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-md bg-[#102A43] text-white flex items-center justify-center shrink-0">
                      <Boxes size={20} />
                    </div>
                    <p className="text-sm text-slate-600">Total stock quantity</p>
                  </div>
                  <p className="text-xl font-semibold text-[#07111F] shrink-0">{totalStockQty}</p>
                </div>

                <div className="flex items-center justify-between gap-3 rounded-md bg-[#F4F7FA] px-4 py-4 min-w-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-md bg-[#1B4F72] text-white flex items-center justify-center shrink-0">
                      <AlertTriangle size={20} />
                    </div>
                    <p className="text-sm text-slate-600">Low stock</p>
                  </div>
                  <p className="text-xl font-semibold text-[#07111F] shrink-0">
                    {lowStockProducts.length}
                  </p>
                </div>

                <div className="flex items-center justify-between gap-3 rounded-md bg-[#F4F7FA] px-4 py-4 min-w-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-md bg-[#07111F] text-white flex items-center justify-center shrink-0">
                      <PackageX size={20} />
                    </div>
                    <p className="text-sm text-slate-600">Out of stock</p>
                  </div>
                  <p className="text-xl font-semibold text-[#07111F] shrink-0">
                    {outOfStockProducts.length}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg shadow-sm min-w-0">
            <div className="px-5 py-4 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-[#07111F]">Low Stock</h2>
              <p className="text-sm text-slate-500 mt-1">Products with quantity 5 or less</p>
            </div>

            {lowStockProducts.length === 0 && outOfStockProducts.length === 0 ? (
              <p className="px-5 py-8 text-center text-slate-500">All products are in stock.</p>
            ) : (
              <div className="w-full min-w-0 overflow-x-auto">
                <table className="w-full min-w-[560px] text-left">
                  <thead className="bg-[#F4F7FA] text-sm text-slate-500">
                    <tr>
                      <th className="px-4 py-3 font-medium">Product</th>
                      <th className="px-4 py-3 font-medium">Quantity</th>
                      <th className="px-4 py-3 font-medium">Unit</th>
                      <th className="px-4 py-3 font-medium">Selling Price</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="text-[15px] text-[#07111F]">
                    {outOfStockProducts.concat(lowStockProducts).map(function (product) {
                      const quantity = Number(product.quantity || 0);

                      return (
                        <tr key={product._id} className="border-t border-slate-100">
                          <td className="px-4 py-3 font-medium">{product.name}</td>
                          <td className="px-4 py-3">{quantity}</td>
                          <td className="px-4 py-3">{product.unit}</td>
                          <td className="px-4 py-3">{formatMoney(product.sellingPrice)}</td>
                          <td className="px-4 py-3">
                            {quantity === 0 ? (
                              <span className="text-red-600">Out of Stock</span>
                            ) : (
                              <span className="text-amber-600">Low Stock</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}

export default Dashboard;
