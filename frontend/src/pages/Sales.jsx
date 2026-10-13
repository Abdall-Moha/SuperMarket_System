import { useEffect, useState } from "react";
import { Plus, Search, Eye } from "lucide-react";
import { apiRequest } from "../api/api.js";
import {
  formatMoney,
  formatDate,
  recordedByName,
  recordedById,
  uniqueRecordedBy,
  paymentMethodLabel,
  saleProfit,
  PAGE_SIZE,
} from "../utils/format.js";
import { matchesDateFilter, paginate } from "../utils/filters.js";
import StatusBadge from "../components/StatusBadge.jsx";
import Pagination from "../components/Pagination.jsx";
import Modal from "../components/Modal.jsx";

function emptyItem() {
  return {
    product: "",
    quantity: "1",
  };
}

function Sales() {
  const [sales, setSales] = useState([]);
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [recordedBy, setRecordedBy] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [customDate, setCustomDate] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [viewSale, setViewSale] = useState(null);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [items, setItems] = useState([emptyItem()]);
  const [paidAmount, setPaidAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [formError, setFormError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(function () {
    loadSales();
    loadProducts();
  }, []);

  async function loadSales() {
    setLoading(true);
    setError("");

    try {
      const result = await apiRequest("/sales");

      if (result.ok === false) {
        setError(result.data.message || "Unable to load sales.");
        setSales([]);
        setLoading(false);
        return;
      }

      setSales(result.data.sales || []);
    } catch (err) {
      setError("Unable to load sales.");
      setSales([]);
    }

    setLoading(false);
  }

  async function loadProducts() {
    const result = await apiRequest("/products");

    if (result.ok) {
      setProducts(result.data.products || []);
    }
  }

  function selectedProduct(productId) {
    return products.find(function (product) {
      return product._id === productId;
    });
  }

  function calculatedTotal() {
    let total = 0;

    for (let i = 0; i < items.length; i++) {
      const product = selectedProduct(items[i].product);
      const quantity = Number(items[i].quantity);

      if (product && !isNaN(quantity)) {
        total = total + Number(product.sellingPrice || 0) * quantity;
      }
    }

    return total;
  }

  function openCreateModal() {
    setCustomerName("");
    setCustomerPhone("");
    setItems([emptyItem()]);
    setPaidAmount("");
    setPaymentMethod("cash");
    setFormError("");
    setIsFormOpen(true);
  }

  function closeForm() {
    setIsFormOpen(false);
    setFormError("");
  }

  function updateItem(index, field, value) {
    const next = items.slice();
    next[index] = Object.assign({}, next[index], { [field]: value });
    setItems(next);
  }

  async function handleCreateSale(event) {
    event.preventDefault();
    setFormError("");

    const saleItems = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const quantity = Number(item.quantity);
      const product = selectedProduct(item.product);

      if (!item.product || !product) {
        setFormError("Please select a product for every row.");
        return;
      }

      if (!quantity || quantity < 1) {
        setFormError("Quantity must be at least 1.");
        return;
      }

      if (quantity > Number(product.quantity || 0)) {
        setFormError("Not enough stock for " + product.name + ".");
        return;
      }

      saleItems.push({
        product: item.product,
        quantity: quantity,
      });
    }

    const total = calculatedTotal();
    const paid = paidAmount === "" ? 0 : Number(paidAmount);

    if (isNaN(paid) || paid < 0) {
      setFormError("Paid amount cannot be negative.");
      return;
    }

    if (paid > total) {
      setFormError("Paid amount cannot be more than the total.");
      return;
    }

    if (paid < total && !customerName) {
      setFormError("Customer name is required when the sale is not fully paid.");
      return;
    }

    setIsSaving(true);

    try {
      const result = await apiRequest("/sales", {
        method: "POST",
        body: {
          customer: {
            name: customerName,
            phone: customerPhone,
          },
          items: saleItems,
          paidAmount: paid,
          paymentMethod: paymentMethod,
        },
      });

      if (result.ok === false) {
        setFormError(result.data.message || "Unable to create this sale.");
        setIsSaving(false);
        return;
      }

      closeForm();
      await loadSales();
      await loadProducts();
    } catch (err) {
      setFormError("Could not connect to the server.");
    }

    setIsSaving(false);
  }

  const recordedByOptions = uniqueRecordedBy(sales);
  const visibleSales = sales.filter(function (sale) {
    const customer = ((sale.customer && sale.customer.name) || "").toLowerCase();
    const matchesCustomer = customer.includes(search.toLowerCase());
    const productText = productSearch.toLowerCase();
    const matchesProduct =
      productText === "" ||
      (sale.items || []).some(function (item) {
        return (item.productName || "").toLowerCase().includes(productText);
      });
    const matchesUser = recordedBy === "all" || recordedById(sale) === recordedBy;
    const matchesDate = matchesDateFilter(sale.createdAt, dateFilter, customDate, customDate);
    const matchesStatus = statusFilter === "all" || sale.paymentStatus === statusFilter;

    return matchesCustomer && matchesProduct && matchesUser && matchesDate && matchesStatus;
  });
  const pageItems = paginate(visibleSales, page, PAGE_SIZE);

  const selectClass =
    "w-full min-w-0 rounded-md border border-slate-200 bg-white px-3 py-3 text-base text-[#07111F] outline-none focus:border-[#1B4F72] focus:ring-2 focus:ring-[#1B4F72]/20";
  const inputClass =
    "w-full min-w-0 rounded-md border border-slate-200 px-3 py-3 text-base text-[#07111F] outline-none focus:border-[#1B4F72] focus:ring-2 focus:ring-[#1B4F72]/20";

  return (
    <div className="w-full min-w-0 max-w-full space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-3">
        <div className="relative min-w-0 xl:col-span-2">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={function (event) {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Search customer..."
            className="w-full min-w-0 rounded-md border border-slate-200 bg-white pl-10 pr-3 py-3 text-base text-[#07111F] outline-none focus:border-[#1B4F72] focus:ring-2 focus:ring-[#1B4F72]/20"
          />
        </div>
        <input
          type="text"
          value={productSearch}
          onChange={function (event) {
            setProductSearch(event.target.value);
            setPage(1);
          }}
          placeholder="Search product..."
          className={inputClass}
        />
        <select value={recordedBy} onChange={function (event) { setRecordedBy(event.target.value); setPage(1); }} className={selectClass}>
          <option value="all">All Users</option>
          {recordedByOptions.map(function (option) {
            return <option key={option.id} value={option.id}>{option.name}</option>;
          })}
        </select>
        <select value={dateFilter} onChange={function (event) { setDateFilter(event.target.value); setPage(1); }} className={selectClass}>
          <option value="all">All Dates</option>
          <option value="today">Today</option>
          <option value="yesterday">Yesterday</option>
          <option value="week">This Week</option>
          <option value="month">This Month</option>
          <option value="custom">Custom Date</option>
        </select>
        <select value={statusFilter} onChange={function (event) { setStatusFilter(event.target.value); setPage(1); }} className={selectClass}>
          <option value="all">All Status</option>
          <option value="paid">Paid</option>
          <option value="partial">Partial</option>
          <option value="unpaid">Unpaid</option>
        </select>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        {dateFilter === "custom" ? (
          <input type="date" value={customDate} onChange={function (event) { setCustomDate(event.target.value); setPage(1); }} className={inputClass + " max-w-xs"} />
        ) : null}
        <button type="button" onClick={openCreateModal} className="inline-flex items-center justify-center gap-2 rounded-md bg-[#1B4F72] text-white px-4 py-3 text-sm shrink-0 min-h-11 sm:ml-auto">
          <Plus size={18} />
          Add Sale
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg shadow-sm min-w-0">
        {loading ? <p className="px-5 py-10 text-center text-slate-500">Loading sales...</p> : null}

        {loading === false && error ? (
          <div className="px-5 py-10 text-center">
            <p className="text-red-600">{error}</p>
            <button type="button" onClick={loadSales} className="mt-3 min-h-11 rounded-md bg-[#1B4F72] px-4 text-sm text-white">Try Again</button>
          </div>
        ) : null}

        {loading === false && !error && sales.length === 0 ? (
          <p className="px-5 py-10 text-center text-slate-500">No sales found.</p>
        ) : null}

        {loading === false && !error && sales.length > 0 && visibleSales.length === 0 ? (
          <p className="px-5 py-10 text-center text-slate-500">No records match your filters.</p>
        ) : null}

        {loading === false && !error && pageItems.length > 0 ? (
          <>
            <div className="w-full min-w-0 overflow-x-auto">
              <table className="w-full min-w-[1080px] text-left">
                <thead className="bg-[#F4F7FA] text-sm text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Customer</th>
                    <th className="px-4 py-3 font-medium">Total Amount</th>
                    <th className="px-4 py-3 font-medium">Paid Amount</th>
                    <th className="px-4 py-3 font-medium">Remaining</th>
                    <th className="px-4 py-3 font-medium">Profit</th>
                    <th className="px-4 py-3 font-medium">Payment Status</th>
                    <th className="px-4 py-3 font-medium">Payment Method</th>
                    <th className="px-4 py-3 font-medium">Recorded By</th>
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="text-[15px] text-[#07111F]">
                  {pageItems.map(function (sale) {
                    return (
                      <tr key={sale._id} className="border-t border-slate-100 hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium">{sale.customer && sale.customer.name ? sale.customer.name : "Walk-in"}</td>
                        <td className="px-4 py-3">{formatMoney(sale.totalAmount)}</td>
                        <td className="px-4 py-3">{formatMoney(sale.paidAmount)}</td>
                        <td className="px-4 py-3">{formatMoney(sale.remainingAmount)}</td>
                        <td className="px-4 py-3">{formatMoney(saleProfit(sale))}</td>
                        <td className="px-4 py-3"><StatusBadge status={sale.paymentStatus} /></td>
                        <td className="px-4 py-3">{paymentMethodLabel(sale.paymentMethod)}</td>
                        <td className="px-4 py-3">{recordedByName(sale)}</td>
                        <td className="px-4 py-3">{formatDate(sale.createdAt)}</td>
                        <td className="px-4 py-3">
                          <button type="button" onClick={function () { setViewSale(sale); }} className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-2.5 py-1.5 text-sm text-[#1B4F72] hover:bg-slate-50">
                            <Eye size={15} />
                            View
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Pagination page={page} pageSize={PAGE_SIZE} total={visibleSales.length} onPageChange={setPage} label="sales" />
          </>
        ) : null}
      </div>

      {isFormOpen ? (
        <Modal title="Add Sale" onClose={closeForm} wide={true}>
          <form className="px-5 py-5 space-y-4" onSubmit={handleCreateSale}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-600 mb-1.5">Customer Name</label>
                <input className={inputClass} value={customerName} onChange={function (event) { setCustomerName(event.target.value); }} />
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1.5">Customer Phone</label>
                <input className={inputClass} value={customerPhone} onChange={function (event) { setCustomerPhone(event.target.value); }} />
              </div>
            </div>

            {items.map(function (item, index) {
              const product = selectedProduct(item.product);

              return (
                <div key={index} className="grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-md bg-[#F4F7FA] p-3">
                  <div>
                    <label className="block text-sm text-slate-600 mb-1.5">Product</label>
                    <select className={selectClass} value={item.product} onChange={function (event) { updateItem(index, "product", event.target.value); }}>
                      <option value="">Select product</option>
                      {products.map(function (option) {
                        return (
                          <option key={option._id} value={option._id}>
                            {option.name} ({option.quantity} {option.unit})
                          </option>
                        );
                      })}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-slate-600 mb-1.5">Quantity</label>
                    <input type="number" min="1" className={inputClass} value={item.quantity} onChange={function (event) { updateItem(index, "quantity", event.target.value); }} />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-600 mb-1.5">Selling Price</label>
                    <input className={inputClass + " bg-[#F4F7FA]"} value={product ? formatMoney(product.sellingPrice) : ""} readOnly />
                  </div>
                  {items.length > 1 ? (
                    <button type="button" onClick={function () { setItems(items.filter(function (_row, rowIndex) { return rowIndex !== index; })); }} className="sm:col-span-3 text-sm text-red-600 text-left">
                      Remove item
                    </button>
                  ) : null}
                </div>
              );
            })}

            <button type="button" onClick={function () { setItems(items.concat([emptyItem()])); }} className="text-sm text-[#1B4F72]">
              + Add another product
            </button>

            <p className="text-base font-medium text-[#07111F]">Total: {formatMoney(calculatedTotal())}</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-600 mb-1.5">Payment Amount</label>
                <input type="number" min="0" step="0.01" className={inputClass} value={paidAmount} onChange={function (event) { setPaidAmount(event.target.value); }} />
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1.5">Payment Method</label>
                <select className={selectClass} value={paymentMethod} onChange={function (event) { setPaymentMethod(event.target.value); }}>
                  <option value="cash">Cash</option>
                  <option value="evc">EVC</option>
                  <option value="edahab">Edahab</option>
                  <option value="bank">Bank</option>
                  <option value="credit">Credit</option>
                </select>
              </div>
            </div>

            {formError ? <p className="text-sm text-red-600">{formError}</p> : null}

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
              <button type="button" onClick={closeForm} className="min-h-11 rounded-md border border-slate-200 px-4 py-2.5 text-sm">Cancel</button>
              <button type="submit" disabled={isSaving} className="min-h-11 rounded-md bg-[#1B4F72] text-white px-4 py-2.5 text-sm disabled:opacity-70">
                {isSaving ? "Saving..." : "Create Sale"}
              </button>
            </div>
          </form>
        </Modal>
      ) : null}

      {viewSale ? (
        <Modal title="Sale Details" onClose={function () { setViewSale(null); }} wide={true}>
          <div className="px-5 py-5 space-y-3 text-[15px]">
            <p><span className="text-slate-500">Customer:</span> {viewSale.customer && viewSale.customer.name ? viewSale.customer.name : "Walk-in"}</p>
            <p><span className="text-slate-500">Phone:</span> {viewSale.customer && viewSale.customer.phone ? viewSale.customer.phone : "—"}</p>
            <p><span className="text-slate-500">Total:</span> {formatMoney(viewSale.totalAmount)}</p>
            <p><span className="text-slate-500">Profit:</span> {formatMoney(saleProfit(viewSale))}</p>
            <div className="w-full min-w-0 overflow-x-auto">
              <table className="w-full min-w-[480px] text-left">
                <thead className="bg-[#F4F7FA] text-sm text-slate-500">
                  <tr>
                    <th className="px-3 py-2 font-medium">Product</th>
                    <th className="px-3 py-2 font-medium">Qty</th>
                    <th className="px-3 py-2 font-medium">Price</th>
                    <th className="px-3 py-2 font-medium">Profit</th>
                  </tr>
                </thead>
                <tbody>
                  {(viewSale.items || []).map(function (item, index) {
                    return (
                      <tr key={index} className="border-t border-slate-100">
                        <td className="px-3 py-2">{item.productName}</td>
                        <td className="px-3 py-2">{item.quantity}</td>
                        <td className="px-3 py-2">{formatMoney(item.sellingPrice)}</td>
                        <td className="px-3 py-2">{formatMoney(item.profit)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}

export default Sales;
