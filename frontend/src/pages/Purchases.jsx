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
    purchasePrice: "",
  };
}

function Purchases() {
  const [purchases, setPurchases] = useState([]);
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [recordedBy, setRecordedBy] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [customDate, setCustomDate] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [viewPurchase, setViewPurchase] = useState(null);
  const [supplierName, setSupplierName] = useState("");
  const [supplierPhone, setSupplierPhone] = useState("");
  const [items, setItems] = useState([emptyItem()]);
  const [paidAmount, setPaidAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [formError, setFormError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(function () {
    loadPurchases();
    loadProducts();
  }, []);

  async function loadPurchases() {
    setLoading(true);
    setError("");

    try {
      const result = await apiRequest("/purchases");

      if (result.ok === false) {
        setError(result.data.message || "Unable to load purchases.");
        setPurchases([]);
        setLoading(false);
        return;
      }

      setPurchases(result.data.purchases || []);
    } catch (err) {
      setError("Unable to load purchases.");
      setPurchases([]);
    }

    setLoading(false);
  }

  async function loadProducts() {
    const result = await apiRequest("/products");

    if (result.ok) {
      setProducts(result.data.products || []);
    }
  }

  function resetFiltersPage() {
    setPage(1);
  }

  function openCreateModal() {
    setSupplierName("");
    setSupplierPhone("");
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

    if (field === "product") {
      const product = products.find(function (item) {
        return item._id === value;
      });

      if (product) {
        next[index].purchasePrice = String(product.purchasePrice);
      }
    }

    setItems(next);
  }

  function addItemRow() {
    setItems(items.concat([emptyItem()]));
  }

  function removeItemRow(index) {
    if (items.length === 1) {
      return;
    }

    setItems(items.filter(function (_item, itemIndex) {
      return itemIndex !== index;
    }));
  }

  function calculatedTotal() {
    let total = 0;

    for (let i = 0; i < items.length; i++) {
      const quantity = Number(items[i].quantity);
      const price = Number(items[i].purchasePrice);
      if (!isNaN(quantity) && !isNaN(price)) {
        total = total + quantity * price;
      }
    }

    return total;
  }

  async function handleCreatePurchase(event) {
    event.preventDefault();
    setFormError("");

    if (!supplierName) {
      setFormError("Supplier name is required.");
      return;
    }

    const purchaseItems = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const quantity = Number(item.quantity);
      const price = Number(item.purchasePrice);

      if (!item.product) {
        setFormError("Please select a product for every row.");
        return;
      }

      if (!quantity || quantity < 1) {
        setFormError("Quantity must be at least 1.");
        return;
      }

      if (isNaN(price) || price < 0) {
        setFormError("Purchase price cannot be negative.");
        return;
      }

      purchaseItems.push({
        product: item.product,
        quantity: quantity,
        purchasePrice: price,
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

    setIsSaving(true);

    try {
      const result = await apiRequest("/purchases", {
        method: "POST",
        body: {
          supplier: {
            name: supplierName,
            phone: supplierPhone,
          },
          items: purchaseItems,
          paidAmount: paid,
          paymentMethod: paymentMethod,
        },
      });

      if (result.ok === false) {
        setFormError(result.data.message || "Unable to create this purchase.");
        setIsSaving(false);
        return;
      }

      closeForm();
      await loadPurchases();
      await loadProducts();
    } catch (err) {
      setFormError("Could not connect to the server.");
    }

    setIsSaving(false);
  }

  const recordedByOptions = uniqueRecordedBy(purchases);
  const visiblePurchases = purchases.filter(function (purchase) {
    const supplier = ((purchase.supplier && purchase.supplier.name) || "").toLowerCase();
    const matchesSearch = supplier.includes(search.toLowerCase());
    const matchesUser = recordedBy === "all" || recordedById(purchase) === recordedBy;
    const matchesDate = matchesDateFilter(purchase.createdAt, dateFilter, customDate, customDate);
    const matchesStatus = statusFilter === "all" || purchase.paymentStatus === statusFilter;

    return matchesSearch && matchesUser && matchesDate && matchesStatus;
  });
  const pageItems = paginate(visiblePurchases, page, PAGE_SIZE);

  const selectClass =
    "w-full min-w-0 rounded-md border border-slate-200 bg-white px-3 py-3 text-base text-[#07111F] outline-none focus:border-[#1B4F72] focus:ring-2 focus:ring-[#1B4F72]/20";
  const inputClass =
    "w-full min-w-0 rounded-md border border-slate-200 px-3 py-3 text-base text-[#07111F] outline-none focus:border-[#1B4F72] focus:ring-2 focus:ring-[#1B4F72]/20";

  return (
    <div className="w-full min-w-0 max-w-full space-y-4">
      <div className="flex flex-col xl:flex-row xl:items-end gap-3">
        <div className="relative flex-1 min-w-0">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={function (event) {
              setSearch(event.target.value);
              resetFiltersPage();
            }}
            placeholder="Search supplier..."
            className="w-full min-w-0 rounded-md border border-slate-200 bg-white pl-10 pr-3 py-3 text-base text-[#07111F] outline-none focus:border-[#1B4F72] focus:ring-2 focus:ring-[#1B4F72]/20"
          />
        </div>
        <select
          value={recordedBy}
          onChange={function (event) {
            setRecordedBy(event.target.value);
            resetFiltersPage();
          }}
          className={selectClass + " xl:max-w-[180px]"}
        >
          <option value="all">All Users</option>
          {recordedByOptions.map(function (option) {
            return (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            );
          })}
        </select>
        <select
          value={dateFilter}
          onChange={function (event) {
            setDateFilter(event.target.value);
            resetFiltersPage();
          }}
          className={selectClass + " xl:max-w-[180px]"}
        >
          <option value="all">All Dates</option>
          <option value="today">Today</option>
          <option value="yesterday">Yesterday</option>
          <option value="week">This Week</option>
          <option value="month">This Month</option>
          <option value="custom">Custom Date</option>
        </select>
        <select
          value={statusFilter}
          onChange={function (event) {
            setStatusFilter(event.target.value);
            resetFiltersPage();
          }}
          className={selectClass + " xl:max-w-[160px]"}
        >
          <option value="all">All Status</option>
          <option value="paid">Paid</option>
          <option value="partial">Partial</option>
          <option value="unpaid">Unpaid</option>
        </select>
        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-2 rounded-md bg-[#1B4F72] text-white px-4 py-3 text-sm shrink-0 min-h-11"
        >
          <Plus size={18} />
          Add Purchase
        </button>
      </div>

      {dateFilter === "custom" ? (
        <input
          type="date"
          value={customDate}
          onChange={function (event) {
            setCustomDate(event.target.value);
            resetFiltersPage();
          }}
          className={inputClass + " max-w-xs"}
        />
      ) : null}

      <div className="bg-white border border-slate-200 rounded-lg shadow-sm min-w-0">
        {loading ? <p className="px-5 py-10 text-center text-slate-500">Loading purchases...</p> : null}

        {loading === false && error ? (
          <div className="px-5 py-10 text-center">
            <p className="text-red-600">{error}</p>
            <button type="button" onClick={loadPurchases} className="mt-3 min-h-11 rounded-md bg-[#1B4F72] px-4 text-sm text-white">
              Try Again
            </button>
          </div>
        ) : null}

        {loading === false && !error && purchases.length === 0 ? (
          <p className="px-5 py-10 text-center text-slate-500">No purchases found.</p>
        ) : null}

        {loading === false && !error && purchases.length > 0 && visiblePurchases.length === 0 ? (
          <p className="px-5 py-10 text-center text-slate-500">No records match your filters.</p>
        ) : null}

        {loading === false && !error && pageItems.length > 0 ? (
          <>
            <div className="w-full min-w-0 overflow-x-auto">
              <table className="w-full min-w-[980px] text-left">
                <thead className="bg-[#F4F7FA] text-sm text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Supplier</th>
                    <th className="px-4 py-3 font-medium">Total Amount</th>
                    <th className="px-4 py-3 font-medium">Paid Amount</th>
                    <th className="px-4 py-3 font-medium">Remaining</th>
                    <th className="px-4 py-3 font-medium">Payment Status</th>
                    <th className="px-4 py-3 font-medium">Payment Method</th>
                    <th className="px-4 py-3 font-medium">Recorded By</th>
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="text-[15px] text-[#07111F]">
                  {pageItems.map(function (purchase) {
                    return (
                      <tr key={purchase._id} className="border-t border-slate-100 hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium">
                          {purchase.supplier && purchase.supplier.name ? purchase.supplier.name : "—"}
                        </td>
                        <td className="px-4 py-3">{formatMoney(purchase.totalAmount)}</td>
                        <td className="px-4 py-3">{formatMoney(purchase.paidAmount)}</td>
                        <td className="px-4 py-3">{formatMoney(purchase.remainingAmount)}</td>
                        <td className="px-4 py-3">
                          <StatusBadge status={purchase.paymentStatus} />
                        </td>
                        <td className="px-4 py-3">{paymentMethodLabel(purchase.paymentMethod)}</td>
                        <td className="px-4 py-3">{recordedByName(purchase)}</td>
                        <td className="px-4 py-3">{formatDate(purchase.createdAt)}</td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={function () {
                              setViewPurchase(purchase);
                            }}
                            className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-2.5 py-1.5 text-sm text-[#1B4F72] hover:bg-slate-50"
                          >
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
            <Pagination
              page={page}
              pageSize={PAGE_SIZE}
              total={visiblePurchases.length}
              onPageChange={setPage}
              label="purchases"
            />
          </>
        ) : null}
      </div>

      {isFormOpen ? (
        <Modal title="Add Purchase" onClose={closeForm} wide={true}>
          <form className="px-5 py-5 space-y-4" onSubmit={handleCreatePurchase}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-600 mb-1.5">Supplier Name</label>
                <input className={inputClass} value={supplierName} onChange={function (event) { setSupplierName(event.target.value); }} />
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1.5">Supplier Phone</label>
                <input className={inputClass} value={supplierPhone} onChange={function (event) { setSupplierPhone(event.target.value); }} />
              </div>
            </div>

            {items.map(function (item, index) {
              return (
                <div key={index} className="grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-md bg-[#F4F7FA] p-3">
                  <div>
                    <label className="block text-sm text-slate-600 mb-1.5">Product</label>
                    <select className={selectClass} value={item.product} onChange={function (event) { updateItem(index, "product", event.target.value); }}>
                      <option value="">Select product</option>
                      {products.map(function (product) {
                        return (
                          <option key={product._id} value={product._id}>
                            {product.name}
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
                    <label className="block text-sm text-slate-600 mb-1.5">Purchase Price</label>
                    <input type="number" min="0" step="0.01" className={inputClass} value={item.purchasePrice} onChange={function (event) { updateItem(index, "purchasePrice", event.target.value); }} />
                  </div>
                  {items.length > 1 ? (
                    <button type="button" onClick={function () { removeItemRow(index); }} className="sm:col-span-3 text-sm text-red-600 text-left">
                      Remove item
                    </button>
                  ) : null}
                </div>
              );
            })}

            <button type="button" onClick={addItemRow} className="text-sm text-[#1B4F72]">
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
              <button type="button" onClick={closeForm} className="min-h-11 rounded-md border border-slate-200 px-4 py-2.5 text-sm">
                Cancel
              </button>
              <button type="submit" disabled={isSaving} className="min-h-11 rounded-md bg-[#1B4F72] text-white px-4 py-2.5 text-sm disabled:opacity-70">
                {isSaving ? "Saving..." : "Create Purchase"}
              </button>
            </div>
          </form>
        </Modal>
      ) : null}

      {viewPurchase ? (
        <Modal title="Purchase Details" onClose={function () { setViewPurchase(null); }} wide={true}>
          <div className="px-5 py-5 space-y-3 text-[15px]">
            <p><span className="text-slate-500">Supplier:</span> {viewPurchase.supplier && viewPurchase.supplier.name}</p>
            <p><span className="text-slate-500">Phone:</span> {viewPurchase.supplier && viewPurchase.supplier.phone ? viewPurchase.supplier.phone : "—"}</p>
            <p><span className="text-slate-500">Total:</span> {formatMoney(viewPurchase.totalAmount)}</p>
            <p><span className="text-slate-500">Paid:</span> {formatMoney(viewPurchase.paidAmount)}</p>
            <p><span className="text-slate-500">Remaining:</span> {formatMoney(viewPurchase.remainingAmount)}</p>
            <div className="w-full min-w-0 overflow-x-auto">
              <table className="w-full min-w-[480px] text-left">
                <thead className="bg-[#F4F7FA] text-sm text-slate-500">
                  <tr>
                    <th className="px-3 py-2 font-medium">Product</th>
                    <th className="px-3 py-2 font-medium">Qty</th>
                    <th className="px-3 py-2 font-medium">Price</th>
                    <th className="px-3 py-2 font-medium">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {(viewPurchase.items || []).map(function (item, index) {
                    return (
                      <tr key={index} className="border-t border-slate-100">
                        <td className="px-3 py-2">{item.productName}</td>
                        <td className="px-3 py-2">{item.quantity}</td>
                        <td className="px-3 py-2">{formatMoney(item.purchasePrice)}</td>
                        <td className="px-3 py-2">{formatMoney(item.subtotal)}</td>
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

export default Purchases;
