import { useEffect, useRef, useState } from "react";
import { Pencil, PackagePlus, Search, X, Trash2 } from "lucide-react";
import { apiRequest } from "../api/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import {
  formatMoney,
  formatDate,
  recordedByName,
  recordedById,
  uniqueRecordedBy,
  PAGE_SIZE,
} from "../utils/format.js";
import { matchesDateFilter, paginate } from "../utils/filters.js";
import Pagination from "../components/Pagination.jsx";

function DeleteProductDialog({ product, error, isDeleting, onCancel, onDelete }) {
  const dialogRef = useRef(null);

  useEffect(function () {
    const dialog = dialogRef.current;

    if (!dialog) {
      return;
    }

    dialog.showModal();

    return function () {
      if (dialog.open) {
        dialog.close();
      }
    };
  }, []);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="delete-product-title"
      onCancel={function (event) {
        event.preventDefault();
        onCancel();
      }}
      className="fixed inset-0 z-[9999] m-0 flex h-full max-h-none w-full max-w-none items-center justify-center border-0 bg-black/70 p-4 open:flex"
      style={{
        position: "fixed",
        inset: 0,
        width: "100vw",
        height: "100vh",
        maxWidth: "none",
        maxHeight: "none",
        margin: 0,
        padding: "1rem",
        border: "none",
        backgroundColor: "rgba(0, 0, 0, 0.7)",
        zIndex: 9999,
      }}
    >
      <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10">
            <Trash2 className="h-7 w-7 text-red-400" />
          </div>

          <h2 id="delete-product-title" className="text-xl font-semibold text-white">
            Delete Product?
          </h2>

          <p className="mt-3 text-sm leading-6 text-slate-300">
            Are you sure you want to permanently delete{" "}
            <span className="font-semibold text-white">"{product.name}"</span>?
          </p>

          <p className="mt-2 text-sm text-slate-400">This action cannot be undone.</p>

          {error ? <p className="mt-2 text-sm text-red-400">{error}</p> : null}

          <div className="mt-6 flex w-full gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="min-h-11 flex-1 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isDeleting}
              onClick={onDelete}
              className="min-h-11 flex-1 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-70"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </dialog>
  );
}

function Products() {
  const { user } = useAuth();
  const canEditProducts = user.role === "admin" || user.role === "storekeeper";
  // Only Admin can permanently delete products.
  const canDeleteProducts = user.role === "admin";

  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [recordedBy, setRecordedBy] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [customDate, setCustomDate] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formName, setFormName] = useState("");
  const [formQuantity, setFormQuantity] = useState("");
  const [formPurchasePrice, setFormPurchasePrice] = useState("");
  const [formSellingPrice, setFormSellingPrice] = useState("");
  const [formUnit, setFormUnit] = useState("");
  const [formError, setFormError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);
  const [deleteError, setDeleteError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(function () {
    loadProducts();
  }, []);

  async function loadProducts() {
    setLoading(true);
    setError("");

    try {
      const result = await apiRequest("/products");

      if (result.ok === false) {
        console.error("Products request failed:", result);
        setError(result.data.message || "Unable to load products.");
        setProducts([]);
        setLoading(false);
        return;
      }

      setProducts(result.data.products || []);
      setLoading(false);
    } catch (err) {
      console.error("Products request failed:", err);
      setError("Unable to load products.");
      setProducts([]);
      setLoading(false);
    }
  }

  function openAddModal() {
    setEditingProduct(null);
    setFormName("");
    setFormQuantity("");
    setFormPurchasePrice("");
    setFormSellingPrice("");
    setFormUnit("");
    setFormError("");
    setIsModalOpen(true);
  }

  function openEditModal(product) {
    setEditingProduct(product);
    setFormName(product.name);
    setFormQuantity(String(product.quantity));
    setFormPurchasePrice(String(product.purchasePrice));
    setFormSellingPrice(String(product.sellingPrice));
    setFormUnit(product.unit);
    setFormError("");
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setEditingProduct(null);
    setFormError("");
  }

  function resetForm() {
    setFormName("");
    setFormQuantity("");
    setFormPurchasePrice("");
    setFormSellingPrice("");
    setFormUnit("");
  }

  async function handleSaveProduct(event) {
    event.preventDefault();
    setFormError("");

    if (!formName || !formUnit || formPurchasePrice === "" || formSellingPrice === "") {
      setFormError("Please fill in all required fields.");
      return;
    }

    const purchasePrice = Number(formPurchasePrice);
    const sellingPrice = Number(formSellingPrice);

    if (isNaN(purchasePrice) || purchasePrice < 0) {
      setFormError("Purchase price must be 0 or more.");
      return;
    }

    if (isNaN(sellingPrice) || sellingPrice < 0) {
      setFormError("Selling price must be 0 or more.");
      return;
    }

    if (!editingProduct) {
      const quantity = formQuantity === "" ? 0 : Number(formQuantity);

      if (isNaN(quantity) || quantity < 0) {
        setFormError("Quantity cannot be negative.");
        return;
      }
    }

    setIsSaving(true);

    try {
      if (editingProduct) {
        const result = await apiRequest("/products/" + editingProduct._id, {
          method: "PUT",
          body: {
            name: formName,
            purchasePrice: purchasePrice,
            sellingPrice: sellingPrice,
            unit: formUnit,
          },
        });

        if (result.ok === false) {
          setFormError(result.data.message || "Unable to update this product.");
          setIsSaving(false);
          return;
        }
      } else {
        const result = await apiRequest("/products", {
          method: "POST",
          body: {
            name: formName,
            quantity: formQuantity === "" ? 0 : Number(formQuantity),
            purchasePrice: purchasePrice,
            sellingPrice: sellingPrice,
            unit: formUnit,
          },
        });

        if (result.ok === false) {
          setFormError(result.data.message || "Unable to create this product.");
          setIsSaving(false);
          return;
        }
      }

      resetForm();
      closeModal();
      await loadProducts();
    } catch (err) {
      console.error("Products request failed:", err);
      setFormError("Could not connect to the server.");
    }

    setIsSaving(false);
  }

  function openDeleteModal(product) {
    setProductToDelete(product);
    setDeleteError("");
  }

  function closeDeleteModal() {
    setProductToDelete(null);
    setDeleteError("");
  }

  async function handleDeleteProduct() {
    if (!productToDelete) {
      return;
    }

    setIsDeleting(true);
    setDeleteError("");

    try {
      const result = await apiRequest("/products/" + productToDelete._id, {
        method: "DELETE",
      });

      if (result.ok === false) {
        setDeleteError(result.data.message || "Unable to delete this product.");
        setIsDeleting(false);
        return;
      }

      closeDeleteModal();
      await loadProducts();
    } catch (err) {
      console.error("Products request failed:", err);
      setDeleteError("Unable to delete this product.");
    }

    setIsDeleting(false);
  }

  const recordedByOptions = uniqueRecordedBy(products);
  const visibleProducts = products.filter(function (product) {
    const matchesSearch = (product.name || "").toLowerCase().includes(search.toLowerCase());
    const matchesUser = recordedBy === "all" || recordedById(product) === recordedBy;
    const matchesDate = matchesDateFilter(product.createdAt, dateFilter, customDate, customDate);

    return matchesSearch && matchesUser && matchesDate;
  });
  const pageItems = paginate(visibleProducts, page, PAGE_SIZE);

  return (
    <div className="w-full min-w-0 max-w-full">
      <div className="space-y-4">
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
            placeholder="Search products..."
            className="w-full min-w-0 rounded-md border border-slate-200 bg-white pl-10 pr-3 py-3 text-base text-[#07111F] outline-none focus:border-[#1B4F72] focus:ring-2 focus:ring-[#1B4F72]/20"
          />
        </div>
        <select
          value={recordedBy}
          onChange={function (event) {
            setRecordedBy(event.target.value);
            setPage(1);
          }}
          className="w-full min-w-0 xl:max-w-[180px] rounded-md border border-slate-200 bg-white px-3 py-3 text-base text-[#07111F] outline-none focus:border-[#1B4F72] focus:ring-2 focus:ring-[#1B4F72]/20"
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
            setPage(1);
          }}
          className="w-full min-w-0 xl:max-w-[180px] rounded-md border border-slate-200 bg-white px-3 py-3 text-base text-[#07111F] outline-none focus:border-[#1B4F72] focus:ring-2 focus:ring-[#1B4F72]/20"
        >
          <option value="all">All Dates</option>
          <option value="today">Today</option>
          <option value="yesterday">Yesterday</option>
          <option value="week">This Week</option>
          <option value="month">This Month</option>
          <option value="custom">Custom Date</option>
        </select>
        <button
          type="button"
          onClick={openAddModal}
          className="inline-flex items-center justify-center gap-2 rounded-md bg-[#1B4F72] text-white px-4 py-3 text-sm shrink-0"
        >
          <PackagePlus size={18} />
          Add Product
        </button>
      </div>

      {dateFilter === "custom" ? (
        <input
          type="date"
          value={customDate}
          onChange={function (event) {
            setCustomDate(event.target.value);
            setPage(1);
          }}
          className="w-full max-w-xs rounded-md border border-slate-200 px-3 py-3 text-base text-[#07111F] outline-none focus:border-[#1B4F72] focus:ring-2 focus:ring-[#1B4F72]/20"
        />
      ) : null}

      <div className="bg-white border border-slate-200 rounded-lg shadow-sm min-w-0">
        {loading ? (
          <p className="px-5 py-10 text-center text-slate-500">Loading products...</p>
        ) : null}

        {loading === false && error ? (
          <div className="px-5 py-10 text-center">
            <p className="text-red-600">{error}</p>
            <button
              type="button"
              onClick={loadProducts}
              className="mt-3 min-h-11 rounded-md bg-[#1B4F72] px-4 text-sm text-white"
            >
              Try Again
            </button>
          </div>
        ) : null}

        {loading === false && !error && products.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <p className="text-base font-medium text-[#07111F]">No products found</p>
            <p className="text-sm text-slate-500 mt-1">Start by adding your first product.</p>
          </div>
        ) : null}

        {loading === false && !error && products.length > 0 && visibleProducts.length === 0 ? (
          <p className="px-5 py-10 text-center text-slate-500">No records match your filters.</p>
        ) : null}

        {loading === false && !error && pageItems.length > 0 ? (
          <>
          <div className="w-full min-w-0 overflow-x-auto">
            <table className="w-full min-w-[960px] text-left">
              <thead className="bg-[#F4F7FA] text-sm text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Product</th>
                  <th className="px-4 py-3 font-medium">Quantity</th>
                  <th className="px-4 py-3 font-medium">Purchase Price</th>
                  <th className="px-4 py-3 font-medium">Selling Price</th>
                  <th className="px-4 py-3 font-medium">Unit</th>
                  <th className="px-4 py-3 font-medium">Recorded By</th>
                  <th className="px-4 py-3 font-medium">Created Date</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="text-[15px] text-[#07111F]">
                {pageItems.map(function (product) {
                  const quantity = Number(product.quantity || 0);
                  // Show low stock when quantity is 5 or less.
                  const isOutOfStock = quantity === 0;
                  const isLowStock = quantity > 0 && quantity <= 5;

                  return (
                    <tr key={product._id} className="border-t border-slate-100">
                      <td className="px-4 py-3 font-medium">{product.name}</td>
                      <td className="px-4 py-3">
                        {isOutOfStock ? (
                          <span className="text-red-600">Out of Stock</span>
                        ) : isLowStock ? (
                          <span className="text-amber-600">{quantity} (Low)</span>
                        ) : (
                          quantity
                        )}
                      </td>
                      <td className="px-4 py-3">{formatMoney(product.purchasePrice)}</td>
                      <td className="px-4 py-3">{formatMoney(product.sellingPrice)}</td>
                      <td className="px-4 py-3">{product.unit}</td>
                      <td className="px-4 py-3">{recordedByName(product)}</td>
                      <td className="px-4 py-3">{formatDate(product.createdAt)}</td>
                      <td className="px-4 py-3">
                        {canEditProducts || canDeleteProducts ? (
                          <div className="flex items-center gap-2">
                            {canEditProducts ? (
                              <button
                                type="button"
                                onClick={function () {
                                  openEditModal(product);
                                }}
                                className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-2.5 py-1.5 text-sm text-[#1B4F72] hover:bg-slate-50"
                              >
                                <Pencil size={15} />
                                Edit
                              </button>
                            ) : null}
                            {canDeleteProducts ? (
                              <button
                                type="button"
                                onClick={function () {
                                  openDeleteModal(product);
                                }}
                                className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-2.5 py-1.5 text-sm text-red-600 hover:bg-red-50"
                              >
                                <Trash2 size={15} />
                                Delete
                              </button>
                            ) : null}
                          </div>
                        ) : (
                          <span className="text-sm text-slate-400">—</span>
                        )}
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
            total={visibleProducts.length}
            onPageChange={setPage}
            label="products"
          />
          </>
        ) : null}
      </div>

      {isModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#07111F]/50">
          <div className="w-full max-w-lg min-w-0 max-h-[90vh] overflow-y-auto bg-white rounded-lg shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-[#07111F]">
                {editingProduct ? "Edit Product" : "Add Product"}
              </h2>
              <button type="button" onClick={closeModal} className="text-slate-500 hover:text-[#07111F]">
                <X size={20} />
              </button>
            </div>

            <form className="px-5 py-5 space-y-4" onSubmit={handleSaveProduct}>
              <div>
                <label className="block text-sm text-slate-600 mb-1.5" htmlFor="productName">
                  Product Name
                </label>
                <input
                  id="productName"
                  type="text"
                  value={formName}
                  onChange={function (event) {
                    setFormName(event.target.value);
                  }}
                  className="w-full rounded-md border border-slate-200 px-3 py-3 text-base text-[#07111F] outline-none focus:border-[#1B4F72] focus:ring-2 focus:ring-[#1B4F72]/20"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-600 mb-1.5" htmlFor="productQuantity">
                  Quantity
                </label>
                <input
                  id="productQuantity"
                  type="number"
                  min="0"
                  value={formQuantity}
                  disabled={editingProduct !== null}
                  onChange={function (event) {
                    setFormQuantity(event.target.value);
                  }}
                  className="w-full rounded-md border border-slate-200 px-3 py-3 text-base text-[#07111F] outline-none focus:border-[#1B4F72] focus:ring-2 focus:ring-[#1B4F72]/20 disabled:bg-[#F4F7FA] disabled:text-slate-500"
                />
                {editingProduct ? (
                  <p className="text-sm text-slate-500 mt-1.5">
                    Stock only changes through purchases and sales.
                  </p>
                ) : null}
              </div>

              <div>
                <label className="block text-sm text-slate-600 mb-1.5" htmlFor="productPurchasePrice">
                  Purchase Price
                </label>
                <input
                  id="productPurchasePrice"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formPurchasePrice}
                  onChange={function (event) {
                    setFormPurchasePrice(event.target.value);
                  }}
                  className="w-full rounded-md border border-slate-200 px-3 py-3 text-base text-[#07111F] outline-none focus:border-[#1B4F72] focus:ring-2 focus:ring-[#1B4F72]/20"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-600 mb-1.5" htmlFor="productSellingPrice">
                  Selling Price
                </label>
                <input
                  id="productSellingPrice"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formSellingPrice}
                  onChange={function (event) {
                    setFormSellingPrice(event.target.value);
                  }}
                  className="w-full rounded-md border border-slate-200 px-3 py-3 text-base text-[#07111F] outline-none focus:border-[#1B4F72] focus:ring-2 focus:ring-[#1B4F72]/20"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-600 mb-1.5" htmlFor="productUnit">
                  Unit
                </label>
                <input
                  id="productUnit"
                  type="text"
                  value={formUnit}
                  onChange={function (event) {
                    setFormUnit(event.target.value);
                  }}
                  placeholder="Bag, Bottle, Piece"
                  className="w-full rounded-md border border-slate-200 px-3 py-3 text-base text-[#07111F] outline-none focus:border-[#1B4F72] focus:ring-2 focus:ring-[#1B4F72]/20"
                />
              </div>

              {formError ? <p className="text-sm text-red-600">{formError}</p> : null}

              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-md border border-slate-200 px-4 py-2.5 text-sm text-[#07111F]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="rounded-md bg-[#1B4F72] text-white px-4 py-2.5 text-sm disabled:opacity-70"
                >
                  {isSaving ? "Saving..." : editingProduct ? "Save Changes" : "Create Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
      </div>

      {productToDelete ? (
        <DeleteProductDialog
          product={productToDelete}
          error={deleteError}
          isDeleting={isDeleting}
          onCancel={closeDeleteModal}
          onDelete={handleDeleteProduct}
        />
      ) : null}
    </div>
  );
}

export default Products;
