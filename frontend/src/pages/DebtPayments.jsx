import { useEffect, useState } from "react";
import { Plus, Search } from "lucide-react";
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

function DebtPayments() {
  const [payments, setPayments] = useState([]);
  const [debts, setDebts] = useState([]);
  const [search, setSearch] = useState("");
  const [recordedBy, setRecordedBy] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [customDate, setCustomDate] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [methodFilter, setMethodFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [debtId, setDebtId] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [note, setNote] = useState("");
  const [formError, setFormError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(function () {
    loadPayments();
    loadDebts();
  }, []);

  async function loadPayments() {
    setLoading(true);
    setError("");

    try {
      const result = await apiRequest("/debt-payments");

      if (result.ok === false) {
        setError(result.data.message || "Unable to load debt payments.");
        setPayments([]);
        setLoading(false);
        return;
      }

      setPayments(result.data.payments || []);
    } catch (err) {
      setError("Unable to load debt payments.");
      setPayments([]);
    }

    setLoading(false);
  }

  async function loadDebts() {
    const result = await apiRequest("/debts");

    if (result.ok) {
      setDebts(result.data.debts || []);
    }
  }

  const openDebts = debts.filter(function (debt) {
    return Number(debt.remainingAmount || 0) > 0;
  });

  async function handleCreatePayment(event) {
    event.preventDefault();
    setFormError("");

    const paymentAmount = Number(amount);

    if (!debtId) {
      setFormError("Please select a debt.");
      return;
    }

    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      setFormError("Payment amount must be greater than 0.");
      return;
    }

    setIsSaving(true);

    try {
      const result = await apiRequest("/debt-payments", {
        method: "POST",
        body: {
          debt: debtId,
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

      setIsFormOpen(false);
      setDebtId("");
      setAmount("");
      setNote("");
      await loadPayments();
      await loadDebts();
    } catch (err) {
      setFormError("Could not connect to the server.");
    }

    setIsSaving(false);
  }

  const recordedByOptions = uniqueRecordedBy(payments);
  const visiblePayments = payments.filter(function (payment) {
    const person = payment.debt && payment.debt.name ? payment.debt.name : "";
    const matchesSearch = person.toLowerCase().includes(search.toLowerCase());
    const matchesUser = recordedBy === "all" || recordedById(payment) === recordedBy;
    const matchesDate = matchesDateFilter(payment.createdAt, dateFilter, customDate, customDate);
    const matchesType = typeFilter === "all" || (payment.debt && payment.debt.type === typeFilter);
    const matchesMethod = methodFilter === "all" || payment.paymentMethod === methodFilter;

    return matchesSearch && matchesUser && matchesDate && matchesType && matchesMethod;
  });
  const pageItems = paginate(visiblePayments, page, PAGE_SIZE);

  const selectClass =
    "w-full min-w-0 rounded-md border border-slate-200 bg-white px-3 py-3 text-base text-[#07111F] outline-none focus:border-[#1B4F72] focus:ring-2 focus:ring-[#1B4F72]/20";
  const inputClass =
    "w-full min-w-0 rounded-md border border-slate-200 px-3 py-3 text-base text-[#07111F] outline-none focus:border-[#1B4F72] focus:ring-2 focus:ring-[#1B4F72]/20";

  return (
    <div className="w-full min-w-0 max-w-full space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-3">
        <div className="relative min-w-0 sm:col-span-2">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={function (event) {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Search person name..."
            className="w-full min-w-0 rounded-md border border-slate-200 bg-white pl-10 pr-3 py-3 text-base text-[#07111F] outline-none focus:border-[#1B4F72] focus:ring-2 focus:ring-[#1B4F72]/20"
          />
        </div>
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
        <select value={typeFilter} onChange={function (event) { setTypeFilter(event.target.value); setPage(1); }} className={selectClass}>
          <option value="all">All Types</option>
          <option value="customer">Customer</option>
          <option value="supplier">Supplier</option>
        </select>
        <select value={methodFilter} onChange={function (event) { setMethodFilter(event.target.value); setPage(1); }} className={selectClass}>
          <option value="all">All Methods</option>
          <option value="cash">Cash</option>
          <option value="evc">EVC</option>
          <option value="edahab">Edahab</option>
          <option value="bank">Bank</option>
        </select>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        {dateFilter === "custom" ? (
          <input type="date" value={customDate} onChange={function (event) { setCustomDate(event.target.value); setPage(1); }} className={inputClass + " max-w-xs"} />
        ) : null}
        <button
          type="button"
          onClick={function () {
            setIsFormOpen(true);
            setFormError("");
            setDebtId("");
            setAmount("");
            setNote("");
            setPaymentMethod("cash");
          }}
          className="inline-flex items-center justify-center gap-2 rounded-md bg-[#1B4F72] text-white px-4 py-3 text-sm shrink-0 min-h-11 sm:ml-auto"
        >
          <Plus size={18} />
          Record Payment
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg shadow-sm min-w-0">
        {loading ? <p className="px-5 py-10 text-center text-slate-500">Loading debt payments...</p> : null}
        {loading === false && error ? (
          <div className="px-5 py-10 text-center">
            <p className="text-red-600">{error}</p>
            <button type="button" onClick={loadPayments} className="mt-3 min-h-11 rounded-md bg-[#1B4F72] px-4 text-sm text-white">Try Again</button>
          </div>
        ) : null}
        {loading === false && !error && payments.length === 0 ? (
          <p className="px-5 py-10 text-center text-slate-500">No debt payments found.</p>
        ) : null}
        {loading === false && !error && payments.length > 0 && visiblePayments.length === 0 ? (
          <p className="px-5 py-10 text-center text-slate-500">No records match your filters.</p>
        ) : null}
        {loading === false && !error && pageItems.length > 0 ? (
          <>
            <div className="w-full min-w-0 overflow-x-auto">
              <table className="w-full min-w-[960px] text-left">
                <thead className="bg-[#F4F7FA] text-sm text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Debt Person</th>
                    <th className="px-4 py-3 font-medium">Debt Type</th>
                    <th className="px-4 py-3 font-medium">Payment Amount</th>
                    <th className="px-4 py-3 font-medium">Payment Method</th>
                    <th className="px-4 py-3 font-medium">Note</th>
                    <th className="px-4 py-3 font-medium">Recorded By</th>
                    <th className="px-4 py-3 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody className="text-[15px] text-[#07111F]">
                  {pageItems.map(function (payment) {
                    return (
                      <tr key={payment._id} className="border-t border-slate-100 hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium">{payment.debt && payment.debt.name ? payment.debt.name : "—"}</td>
                        <td className="px-4 py-3">{payment.debt ? <StatusBadge status={payment.debt.type} /> : "—"}</td>
                        <td className="px-4 py-3">{formatMoney(payment.amount)}</td>
                        <td className="px-4 py-3">{paymentMethodLabel(payment.paymentMethod)}</td>
                        <td className="px-4 py-3">{payment.note || "—"}</td>
                        <td className="px-4 py-3">{recordedByName(payment)}</td>
                        <td className="px-4 py-3">{formatDate(payment.createdAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Pagination page={page} pageSize={PAGE_SIZE} total={visiblePayments.length} onPageChange={setPage} label="payments" />
          </>
        ) : null}
      </div>

      {isFormOpen ? (
        <Modal title="Record Payment" onClose={function () { setIsFormOpen(false); }}>
          <form className="px-5 py-5 space-y-4" onSubmit={handleCreatePayment}>
            <div>
              <label className="block text-sm text-slate-600 mb-1.5">Debt</label>
              <select className={selectClass} value={debtId} onChange={function (event) { setDebtId(event.target.value); }}>
                <option value="">Select an open debt</option>
                {openDebts.map(function (debt) {
                  return (
                    <option key={debt._id} value={debt._id}>
                      {debt.name} · {debt.type} · remaining {formatMoney(debt.remainingAmount)}
                    </option>
                  );
                })}
              </select>
            </div>
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
              <button type="button" onClick={function () { setIsFormOpen(false); }} className="min-h-11 rounded-md border border-slate-200 px-4 py-2.5 text-sm">Cancel</button>
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

export default DebtPayments;
