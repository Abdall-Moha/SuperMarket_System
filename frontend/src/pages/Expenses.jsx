import { useEffect, useState } from "react";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
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
import Pagination from "../components/Pagination.jsx";
import Modal from "../components/Modal.jsx";

function Expenses() {
  const [expenses, setExpenses] = useState([]);
  const [search, setSearch] = useState("");
  const [recordedBy, setRecordedBy] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [customDate, setCustomDate] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [formTitle, setFormTitle] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formReason, setFormReason] = useState("");
  const [formMethod, setFormMethod] = useState("cash");
  const [formError, setFormError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState(null);
  const [deleteError, setDeleteError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(function () {
    loadExpenses();
  }, []);

  async function loadExpenses() {
    setLoading(true);
    setError("");

    try {
      const result = await apiRequest("/expenses");

      if (result.ok === false) {
        setError(result.data.message || "Unable to load expenses.");
        setExpenses([]);
        setLoading(false);
        return;
      }

      setExpenses(result.data.expenses || []);
    } catch (err) {
      setError("Unable to load expenses.");
      setExpenses([]);
    }

    setLoading(false);
  }

  function openAddModal() {
    setEditingExpense(null);
    setFormTitle("");
    setFormAmount("");
    setFormReason("");
    setFormMethod("cash");
    setFormError("");
    setIsModalOpen(true);
  }

  function openEditModal(expense) {
    setEditingExpense(expense);
    setFormTitle(expense.title);
    setFormAmount(String(expense.amount));
    setFormReason(expense.reason);
    setFormMethod(expense.paymentMethod);
    setFormError("");
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setEditingExpense(null);
    setFormError("");
  }

  async function handleSaveExpense(event) {
    event.preventDefault();
    setFormError("");

    if (!formTitle || !formReason || formAmount === "") {
      setFormError("Please fill in title, amount, and reason.");
      return;
    }

    const amount = Number(formAmount);

    if (isNaN(amount) || amount < 0) {
      setFormError("Amount must be 0 or more.");
      return;
    }

    setIsSaving(true);

    try {
      const body = {
        title: formTitle,
        amount: amount,
        reason: formReason,
        paymentMethod: formMethod,
      };

      const result = editingExpense
        ? await apiRequest("/expenses/" + editingExpense._id, { method: "PUT", body: body })
        : await apiRequest("/expenses", { method: "POST", body: body });

      if (result.ok === false) {
        setFormError(result.data.message || "Unable to save this expense.");
        setIsSaving(false);
        return;
      }

      closeModal();
      await loadExpenses();
    } catch (err) {
      setFormError("Could not connect to the server.");
    }

    setIsSaving(false);
  }

  async function handleDeleteExpense() {
    if (!expenseToDelete) {
      return;
    }

    setIsDeleting(true);
    setDeleteError("");

    try {
      const result = await apiRequest("/expenses/" + expenseToDelete._id, {
        method: "DELETE",
      });

      if (result.ok === false) {
        setDeleteError(result.data.message || "Unable to delete this expense.");
        setIsDeleting(false);
        return;
      }

      setExpenseToDelete(null);
      await loadExpenses();
    } catch (err) {
      setDeleteError("Unable to delete this expense.");
    }

    setIsDeleting(false);
  }

  const recordedByOptions = uniqueRecordedBy(expenses);
  const visibleExpenses = expenses.filter(function (expense) {
    const text = search.toLowerCase();
    const matchesSearch =
      (expense.title || "").toLowerCase().includes(text) ||
      (expense.reason || "").toLowerCase().includes(text);
    const matchesUser = recordedBy === "all" || recordedById(expense) === recordedBy;
    const matchesDate = matchesDateFilter(expense.createdAt, dateFilter, customDate, customDate);

    return matchesSearch && matchesUser && matchesDate;
  });
  const pageItems = paginate(visibleExpenses, page, PAGE_SIZE);

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
              setPage(1);
            }}
            placeholder="Search title or reason..."
            className="w-full min-w-0 rounded-md border border-slate-200 bg-white pl-10 pr-3 py-3 text-base text-[#07111F] outline-none focus:border-[#1B4F72] focus:ring-2 focus:ring-[#1B4F72]/20"
          />
        </div>
        <select value={recordedBy} onChange={function (event) { setRecordedBy(event.target.value); setPage(1); }} className={selectClass + " xl:max-w-[180px]"}>
          <option value="all">All Users</option>
          {recordedByOptions.map(function (option) {
            return <option key={option.id} value={option.id}>{option.name}</option>;
          })}
        </select>
        <select value={dateFilter} onChange={function (event) { setDateFilter(event.target.value); setPage(1); }} className={selectClass + " xl:max-w-[180px]"}>
          <option value="all">All Dates</option>
          <option value="today">Today</option>
          <option value="yesterday">Yesterday</option>
          <option value="week">This Week</option>
          <option value="month">This Month</option>
          <option value="custom">Custom Date</option>
        </select>
        <button type="button" onClick={openAddModal} className="inline-flex items-center justify-center gap-2 rounded-md bg-[#1B4F72] text-white px-4 py-3 text-sm shrink-0 min-h-11">
          <Plus size={18} />
          Add Expense
        </button>
      </div>

      {dateFilter === "custom" ? (
        <input type="date" value={customDate} onChange={function (event) { setCustomDate(event.target.value); setPage(1); }} className={inputClass + " max-w-xs"} />
      ) : null}

      <div className="bg-white border border-slate-200 rounded-lg shadow-sm min-w-0">
        {loading ? <p className="px-5 py-10 text-center text-slate-500">Loading expenses...</p> : null}
        {loading === false && error ? (
          <div className="px-5 py-10 text-center">
            <p className="text-red-600">{error}</p>
            <button type="button" onClick={loadExpenses} className="mt-3 min-h-11 rounded-md bg-[#1B4F72] px-4 text-sm text-white">Try Again</button>
          </div>
        ) : null}
        {loading === false && !error && expenses.length === 0 ? (
          <p className="px-5 py-10 text-center text-slate-500">No expenses found.</p>
        ) : null}
        {loading === false && !error && expenses.length > 0 && visibleExpenses.length === 0 ? (
          <p className="px-5 py-10 text-center text-slate-500">No records match your filters.</p>
        ) : null}
        {loading === false && !error && pageItems.length > 0 ? (
          <>
            <div className="w-full min-w-0 overflow-x-auto">
              <table className="w-full min-w-[860px] text-left">
                <thead className="bg-[#F4F7FA] text-sm text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Title</th>
                    <th className="px-4 py-3 font-medium">Amount</th>
                    <th className="px-4 py-3 font-medium">Reason</th>
                    <th className="px-4 py-3 font-medium">Payment Method</th>
                    <th className="px-4 py-3 font-medium">Recorded By</th>
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="text-[15px] text-[#07111F]">
                  {pageItems.map(function (expense) {
                    return (
                      <tr key={expense._id} className="border-t border-slate-100 hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium">{expense.title}</td>
                        <td className="px-4 py-3">{formatMoney(expense.amount)}</td>
                        <td className="px-4 py-3">{expense.reason}</td>
                        <td className="px-4 py-3">{paymentMethodLabel(expense.paymentMethod)}</td>
                        <td className="px-4 py-3">{recordedByName(expense)}</td>
                        <td className="px-4 py-3">{formatDate(expense.createdAt)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button type="button" onClick={function () { openEditModal(expense); }} className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-2.5 py-1.5 text-sm text-[#1B4F72] hover:bg-slate-50">
                              <Pencil size={15} />
                              Edit
                            </button>
                            <button type="button" onClick={function () { setExpenseToDelete(expense); setDeleteError(""); }} className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-2.5 py-1.5 text-sm text-red-600 hover:bg-red-50">
                              <Trash2 size={15} />
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Pagination page={page} pageSize={PAGE_SIZE} total={visibleExpenses.length} onPageChange={setPage} label="expenses" />
          </>
        ) : null}
      </div>

      {isModalOpen ? (
        <Modal title={editingExpense ? "Edit Expense" : "Add Expense"} onClose={closeModal}>
          <form className="px-5 py-5 space-y-4" onSubmit={handleSaveExpense}>
            <div>
              <label className="block text-sm text-slate-600 mb-1.5">Title</label>
              <input className={inputClass} value={formTitle} onChange={function (event) { setFormTitle(event.target.value); }} />
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1.5">Amount</label>
              <input type="number" min="0" step="0.01" className={inputClass} value={formAmount} onChange={function (event) { setFormAmount(event.target.value); }} />
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1.5">Reason</label>
              <input className={inputClass} value={formReason} onChange={function (event) { setFormReason(event.target.value); }} />
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1.5">Payment Method</label>
              <select className={selectClass} value={formMethod} onChange={function (event) { setFormMethod(event.target.value); }}>
                <option value="cash">Cash</option>
                <option value="evc">EVC</option>
                <option value="edahab">Edahab</option>
                <option value="bank">Bank</option>
              </select>
            </div>
            {formError ? <p className="text-sm text-red-600">{formError}</p> : null}
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
              <button type="button" onClick={closeModal} className="min-h-11 rounded-md border border-slate-200 px-4 py-2.5 text-sm">Cancel</button>
              <button type="submit" disabled={isSaving} className="min-h-11 rounded-md bg-[#1B4F72] text-white px-4 py-2.5 text-sm disabled:opacity-70">
                {isSaving ? "Saving..." : editingExpense ? "Save Changes" : "Create Expense"}
              </button>
            </div>
          </form>
        </Modal>
      ) : null}

      {expenseToDelete ? (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <h2 className="text-xl font-semibold text-white text-center">Delete Expense?</h2>
            <p className="mt-3 text-sm leading-6 text-slate-300 text-center">
              Are you sure you want to permanently delete "{expenseToDelete.title}"?
            </p>
            {deleteError ? <p className="mt-2 text-sm text-red-400 text-center">{deleteError}</p> : null}
            <div className="mt-6 flex w-full gap-3">
              <button type="button" onClick={function () { setExpenseToDelete(null); }} className="min-h-11 flex-1 rounded-lg border border-slate-700 bg-slate-800 px-4 text-sm text-slate-200">
                Cancel
              </button>
              <button type="button" disabled={isDeleting} onClick={handleDeleteExpense} className="min-h-11 flex-1 rounded-lg bg-red-600 px-4 text-sm text-white disabled:opacity-70">
                Delete
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default Expenses;
