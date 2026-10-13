import { useEffect, useState } from "react";
import { Banknote, Search } from "lucide-react";
import { apiRequest } from "../api/api.js";
import { formatMoney, formatDate, PAGE_SIZE } from "../utils/format.js";
import { matchesDateFilter, paginate } from "../utils/filters.js";
import StatusBadge from "../components/StatusBadge.jsx";
import Pagination from "../components/Pagination.jsx";
import Modal from "../components/Modal.jsx";

function Debts() {
  const [debts, setDebts] = useState([]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [customDate, setCustomDate] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [payingDebt, setPayingDebt] = useState(null);
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [note, setNote] = useState("");
  const [formError, setFormError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(function () {
    loadDebts();
  }, []);

  async function loadDebts() {
    setLoading(true);
    setError("");

    try {
      const result = await apiRequest("/debts");

      if (result.ok === false) {
        setError(result.data.message || "Unable to load debts.");
        setDebts([]);
        setLoading(false);
        return;
      }

      setDebts(result.data.debts || []);
    } catch (err) {
      setError("Unable to load debts.");
      setDebts([]);
    }

    setLoading(false);
  }

  async function handleRecordPayment(event) {
    event.preventDefault();
    setFormError("");

    const paymentAmount = Number(amount);

    if (!payingDebt) {
      return;
    }

    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      setFormError("Payment amount must be greater than 0.");
      return;
    }

    if (paymentAmount > Number(payingDebt.remainingAmount || 0)) {
      setFormError("Payment cannot be more than the remaining amount.");
      return;
    }

    setIsSaving(true);

    try {
      const result = await apiRequest("/debt-payments", {
        method: "POST",
        body: {
          debt: payingDebt._id,
          amount: paymentAmount,
          paymentMethod: paymentMethod,
          note: note,
        },
      });

      if (result.ok === false) {
        setFormError(result.data.message || "Unable to record this payment.");
        setIsSaving(false);
        return;
      }

      setPayingDebt(null);
      setAmount("");
      setNote("");
      await loadDebts();
    } catch (err) {
      setFormError("Could not connect to the server.");
    }

    setIsSaving(false);
  }

  const visibleDebts = debts.filter(function (debt) {
    const text = search.toLowerCase();
    const matchesSearch =
      (debt.name || "").toLowerCase().includes(text) ||
      (debt.phone || "").toLowerCase().includes(text);
    const matchesType = typeFilter === "all" || debt.type === typeFilter;
    const matchesStatus = statusFilter === "all" || debt.status === statusFilter;
    const matchesDate = matchesDateFilter(debt.createdAt, dateFilter, customDate, customDate);

    return matchesSearch && matchesType && matchesStatus && matchesDate;
  });
  const pageItems = paginate(visibleDebts, page, PAGE_SIZE);

  const selectClass =
    "w-full min-w-0 rounded-md border border-slate-200 bg-white px-3 py-3 text-base text-[#07111F] outline-none focus:border-[#1B4F72] focus:ring-2 focus:ring-[#1B4F72]/20";
  const inputClass =
    "w-full min-w-0 rounded-md border border-slate-200 px-3 py-3 text-base text-[#07111F] outline-none focus:border-[#1B4F72] focus:ring-2 focus:ring-[#1B4F72]/20";

  return (
    <div className="w-full min-w-0 max-w-full space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
        <div className="relative min-w-0 sm:col-span-2 xl:col-span-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={function (event) {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Search name or phone..."
            className="w-full min-w-0 rounded-md border border-slate-200 bg-white pl-10 pr-3 py-3 text-base text-[#07111F] outline-none focus:border-[#1B4F72] focus:ring-2 focus:ring-[#1B4F72]/20"
          />
        </div>
        <select value={typeFilter} onChange={function (event) { setTypeFilter(event.target.value); setPage(1); }} className={selectClass}>
          <option value="all">All Types</option>
          <option value="customer">Customer</option>
          <option value="supplier">Supplier</option>
        </select>
        <select value={statusFilter} onChange={function (event) { setStatusFilter(event.target.value); setPage(1); }} className={selectClass}>
          <option value="all">All Status</option>
          <option value="unpaid">Unpaid</option>
          <option value="partial">Partial</option>
          <option value="paid">Paid</option>
        </select>
        <select value={dateFilter} onChange={function (event) { setDateFilter(event.target.value); setPage(1); }} className={selectClass}>
          <option value="all">All Dates</option>
          <option value="today">Today</option>
          <option value="yesterday">Yesterday</option>
          <option value="week">This Week</option>
          <option value="month">This Month</option>
          <option value="custom">Custom Date</option>
        </select>
        {dateFilter === "custom" ? (
          <input type="date" value={customDate} onChange={function (event) { setCustomDate(event.target.value); setPage(1); }} className={inputClass} />
        ) : (
          <div className="hidden xl:block"></div>
        )}
      </div>

      <div className="bg-white border border-slate-200 rounded-lg shadow-sm min-w-0">
        {loading ? <p className="px-5 py-10 text-center text-slate-500">Loading debts...</p> : null}
        {loading === false && error ? (
          <div className="px-5 py-10 text-center">
            <p className="text-red-600">{error}</p>
            <button type="button" onClick={loadDebts} className="mt-3 min-h-11 rounded-md bg-[#1B4F72] px-4 text-sm text-white">Try Again</button>
          </div>
        ) : null}
        {loading === false && !error && debts.length === 0 ? (
          <p className="px-5 py-10 text-center text-slate-500">No debts found.</p>
        ) : null}
        {loading === false && !error && debts.length > 0 && visibleDebts.length === 0 ? (
          <p className="px-5 py-10 text-center text-slate-500">No records match your filters.</p>
        ) : null}
        {loading === false && !error && pageItems.length > 0 ? (
          <>
            <div className="w-full min-w-0 overflow-x-auto">
              <table className="w-full min-w-[960px] text-left">
                <thead className="bg-[#F4F7FA] text-sm text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Type</th>
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Phone</th>
                    <th className="px-4 py-3 font-medium">Total Amount</th>
                    <th className="px-4 py-3 font-medium">Paid Amount</th>
                    <th className="px-4 py-3 font-medium">Remaining Amount</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="text-[15px] text-[#07111F]">
                  {pageItems.map(function (debt) {
                    return (
                      <tr key={debt._id} className="border-t border-slate-100 hover:bg-slate-50">
                        <td className="px-4 py-3"><StatusBadge status={debt.type} /></td>
                        <td className="px-4 py-3 font-medium">{debt.name}</td>
                        <td className="px-4 py-3">{debt.phone || "—"}</td>
                        <td className="px-4 py-3">{formatMoney(debt.totalAmount)}</td>
                        <td className="px-4 py-3">{formatMoney(debt.paidAmount)}</td>
                        <td className="px-4 py-3">{formatMoney(debt.remainingAmount)}</td>
                        <td className="px-4 py-3"><StatusBadge status={debt.status} /></td>
                        <td className="px-4 py-3">{formatDate(debt.createdAt)}</td>
                        <td className="px-4 py-3">
                          {Number(debt.remainingAmount || 0) > 0 ? (
                            <button
                              type="button"
                              onClick={function () {
                                setPayingDebt(debt);
                                setAmount("");
                                setNote("");
                                setPaymentMethod("cash");
                                setFormError("");
                              }}
                              className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-2.5 py-1.5 text-sm text-[#1B4F72] hover:bg-slate-50"
                            >
                              <Banknote size={15} />
                              Record Payment
                            </button>
                          ) : (
                            <span className="text-sm text-slate-400">Paid</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Pagination page={page} pageSize={PAGE_SIZE} total={visibleDebts.length} onPageChange={setPage} label="debts" />
          </>
        ) : null}
      </div>

      {payingDebt ? (
        <Modal title="Record Payment" onClose={function () { setPayingDebt(null); }}>
          <form className="px-5 py-5 space-y-4" onSubmit={handleRecordPayment}>
            <p className="text-sm text-slate-500">
              {payingDebt.name} · Remaining {formatMoney(payingDebt.remainingAmount)}
            </p>
            <div>
              <label className="block text-sm text-slate-600 mb-1.5">Payment Amount</label>
              <input type="number" min="0.01" step="0.01" className={inputClass} value={amount} onChange={function (event) { setAmount(event.target.value); }} />
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1.5">Payment Method</label>
              <select className={selectClass} value={paymentMethod} onChange={function (event) { setPaymentMethod(event.target.value); }}>
                <option value="cash">Cash</option>
                <option value="evc">EVC</option>
                <option value="edahab">Edahab</option>
                <option value="bank">Bank</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1.5">Note</label>
              <input className={inputClass} value={note} onChange={function (event) { setNote(event.target.value); }} />
            </div>
            {formError ? <p className="text-sm text-red-600">{formError}</p> : null}
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
              <button type="button" onClick={function () { setPayingDebt(null); }} className="min-h-11 rounded-md border border-slate-200 px-4 py-2.5 text-sm">Cancel</button>
              <button type="submit" disabled={isSaving} className="min-h-11 rounded-md bg-[#1B4F72] text-white px-4 py-2.5 text-sm disabled:opacity-70">
                {isSaving ? "Saving..." : "Record Payment"}
              </button>
            </div>
          </form>
        </Modal>
      ) : null}
    </div>
  );
}

export default Debts;
