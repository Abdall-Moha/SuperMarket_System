import { useEffect, useState } from "react";
import { Pencil, UserPlus, UserCheck, UserX, Search, X } from "lucide-react";
import { apiRequest } from "../api/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { PAGE_SIZE } from "../utils/format.js";
import { paginate } from "../utils/filters.js";
import Pagination from "../components/Pagination.jsx";

function roleLabel(role) {
  if (role === "admin") {
    return "Admin";
  }

  if (role === "cashier") {
    return "Cashier";
  }

  if (role === "storekeeper") {
    return "Storekeeper";
  }

  return role;
}

function Users() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formNewPassword, setFormNewPassword] = useState("");
  const [formConfirmPassword, setFormConfirmPassword] = useState("");
  const [formRole, setFormRole] = useState("cashier");
  const [formIsActive, setFormIsActive] = useState(true);
  const [formError, setFormError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(function () {
    loadUsers();
  }, []);

  async function loadUsers() {
    setLoading(true);
    setError("");

    try {
      const result = await apiRequest("/users");

      if (result.ok === false) {
        console.error("Users request failed:", result);
        setError(result.data.message || "Unable to load users.");
        setUsers([]);
        setLoading(false);
        return;
      }

      setUsers(result.data.users || []);
      setLoading(false);
    } catch (err) {
      console.error("Users request failed:", err);
      setError("Could not connect to the server.");
      setUsers([]);
      setLoading(false);
    }
  }

  function openAddModal() {
    setEditingUser(null);
    setFormName("");
    setFormEmail("");
    setFormPhone("");
    setFormPassword("");
    setFormNewPassword("");
    setFormConfirmPassword("");
    setFormRole("cashier");
    setFormIsActive(true);
    setFormError("");
    setIsModalOpen(true);
  }

  function openEditModal(user) {
    setEditingUser(user);
    setFormName(user.name);
    setFormEmail(user.email);
    setFormPhone(user.phone);
    setFormPassword("");
    setFormNewPassword("");
    setFormConfirmPassword("");
    setFormRole(user.role);
    setFormIsActive(user.isActive !== false);
    setFormError("");
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setEditingUser(null);
    setFormNewPassword("");
    setFormConfirmPassword("");
    setFormError("");
  }

  function isOwnAccount(user) {
    return String(user._id || user.id) === String(currentUser.id);
  }

  async function handleSaveUser(event) {
    event.preventDefault();
    setFormError("");

    if (!formName || !formEmail || !formPhone || !formRole) {
      setFormError("Please fill in all required fields.");
      return;
    }

    if (!editingUser && !formPassword) {
      setFormError("Please enter a password for the new user.");
      return;
    }

    const editingOwnAccount = editingUser ? isOwnAccount(editingUser) : false;

    if (editingUser && editingOwnAccount === false) {
      if ((formNewPassword && !formConfirmPassword) || (!formNewPassword && formConfirmPassword)) {
        setFormError("Please enter and confirm the new password.");
        return;
      }

      if (formNewPassword && formConfirmPassword && formNewPassword !== formConfirmPassword) {
        setFormError("Passwords do not match.");
        return;
      }
    }

    setIsSaving(true);

    try {
      if (editingUser) {
        const updateBody = {
          name: formName,
          email: formEmail,
          phone: formPhone,
          role: formRole,
          isActive: formIsActive,
        };

        if (editingOwnAccount === false && formNewPassword) {
          updateBody.password = formNewPassword;
        }

        const result = await apiRequest("/users/" + (editingUser._id || editingUser.id), {
          method: "PUT",
          body: updateBody,
        });

        if (result.ok === false) {
          setFormError(result.data.message || "Unable to update this user.");
          setIsSaving(false);
          return;
        }
      } else {
        const result = await apiRequest("/users", {
          method: "POST",
          body: {
            name: formName,
            email: formEmail,
            phone: formPhone,
            password: formPassword,
            role: formRole,
          },
        });

        if (result.ok === false) {
          setFormError(result.data.message || "Unable to create this user.");
          setIsSaving(false);
          return;
        }
      }

      closeModal();
      await loadUsers();
    } catch (err) {
      console.error("Users request failed:", err);
      setFormError("Could not connect to the server.");
    }

    setIsSaving(false);
  }

  async function toggleUserStatus(user) {
    const userId = user._id || user.id;

    if (String(userId) === String(currentUser.id)) {
      return;
    }

    const result = await apiRequest("/users/" + userId, {
      method: "PUT",
      body: {
        isActive: user.isActive === false,
      },
    });

    if (result.ok) {
      await loadUsers();
    }
  }

  const visibleUsers = users.filter(function (user) {
    const text = search.toLowerCase();
    const name = (user.name || "").toLowerCase();
    const email = (user.email || "").toLowerCase();
    const phone = (user.phone || "").toLowerCase();

    return name.includes(text) || email.includes(text) || phone.includes(text);
  });
  const pageItems = paginate(visibleUsers, page, PAGE_SIZE);

  return (
    <div className="w-full min-w-0 max-w-full space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1 min-w-0">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={function (event) {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Search users..."
            className="w-full min-w-0 rounded-md border border-slate-200 bg-white pl-10 pr-3 py-3 text-base text-[#07111F] outline-none focus:border-[#1B4F72] focus:ring-2 focus:ring-[#1B4F72]/20"
          />
        </div>
        <button
          type="button"
          onClick={openAddModal}
          className="inline-flex items-center justify-center gap-2 rounded-md bg-[#1B4F72] text-white px-4 py-3 text-sm shrink-0"
        >
          <UserPlus size={18} />
          Add User
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg shadow-sm min-w-0">
        {loading ? (
          <p className="px-5 py-10 text-center text-slate-500">Loading users...</p>
        ) : null}

        {loading === false && error ? (
          <p className="px-5 py-10 text-center text-red-600">{error}</p>
        ) : null}

        {loading === false && !error && users.length === 0 ? (
          <p className="px-5 py-10 text-center text-slate-500">No users found.</p>
        ) : null}

        {loading === false && !error && users.length > 0 && visibleUsers.length === 0 ? (
          <p className="px-5 py-10 text-center text-slate-500">No records match your filters.</p>
        ) : null}

        {loading === false && !error && visibleUsers.length > 0 ? (
          <>
          <div className="w-full min-w-0 overflow-x-auto">
            <table className="w-full min-w-[720px] text-left">
              <thead className="bg-[#F4F7FA] text-sm text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Phone</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="text-[15px] text-[#07111F]">
                {pageItems.map(function (user) {
                  const userId = user._id || user.id;
                  const isCurrentUser = String(userId) === String(currentUser.id);

                  return (
                    <tr key={userId} className="border-t border-slate-100">
                      <td className="px-4 py-3 font-medium">{user.name}</td>
                      <td className="px-4 py-3">{user.email}</td>
                      <td className="px-4 py-3">{user.phone}</td>
                      <td className="px-4 py-3">{roleLabel(user.role)}</td>
                      <td className="px-4 py-3">
                        <span
                          className={
                            user.isActive === false
                              ? "inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600"
                              : "inline-flex rounded-full bg-green-50 px-2.5 py-1 text-xs text-green-700"
                          }
                        >
                          {user.isActive === false ? "Inactive" : "Active"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={function () {
                              openEditModal(user);
                            }}
                            className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-2.5 py-1.5 text-sm text-[#1B4F72] hover:bg-slate-50"
                          >
                            <Pencil size={15} />
                            Edit
                          </button>
                          <button
                            type="button"
                            disabled={isCurrentUser}
                            onClick={function () {
                              toggleUserStatus(user);
                            }}
                            className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-2.5 py-1.5 text-sm text-[#07111F] hover:bg-slate-50 disabled:opacity-40"
                          >
                            {user.isActive === false ? <UserCheck size={15} /> : <UserX size={15} />}
                            {user.isActive === false ? "Activate" : "Deactivate"}
                          </button>
                        </div>
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
            total={visibleUsers.length}
            onPageChange={setPage}
            label="users"
          />
          </>
        ) : null}
      </div>

      {isModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#07111F]/50">
          <div className="w-full max-w-lg min-w-0 max-h-[90vh] overflow-y-auto bg-white rounded-lg shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-[#07111F]">
                {editingUser ? "Edit User" : "Add User"}
              </h2>
              <button type="button" onClick={closeModal} className="text-slate-500 hover:text-[#07111F]">
                <X size={20} />
              </button>
            </div>

            <form className="px-5 py-5 space-y-4" onSubmit={handleSaveUser}>
              <div>
                <label className="block text-sm text-slate-600 mb-1.5" htmlFor="userName">
                  Name
                </label>
                <input
                  id="userName"
                  type="text"
                  value={formName}
                  onChange={function (event) {
                    setFormName(event.target.value);
                  }}
                  className="w-full rounded-md border border-slate-200 px-3 py-3 text-base text-[#07111F] outline-none focus:border-[#1B4F72] focus:ring-2 focus:ring-[#1B4F72]/20"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-600 mb-1.5" htmlFor="userEmail">
                  Email
                </label>
                <input
                  id="userEmail"
                  type="email"
                  value={formEmail}
                  onChange={function (event) {
                    setFormEmail(event.target.value);
                  }}
                  className="w-full rounded-md border border-slate-200 px-3 py-3 text-base text-[#07111F] outline-none focus:border-[#1B4F72] focus:ring-2 focus:ring-[#1B4F72]/20"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-600 mb-1.5" htmlFor="userPhone">
                  Phone
                </label>
                <input
                  id="userPhone"
                  type="text"
                  value={formPhone}
                  onChange={function (event) {
                    setFormPhone(event.target.value);
                  }}
                  className="w-full rounded-md border border-slate-200 px-3 py-3 text-base text-[#07111F] outline-none focus:border-[#1B4F72] focus:ring-2 focus:ring-[#1B4F72]/20"
                />
              </div>

              {editingUser ? null : (
                <div>
                  <label className="block text-sm text-slate-600 mb-1.5" htmlFor="userPassword">
                    Password
                  </label>
                  <input
                    id="userPassword"
                    type="password"
                    value={formPassword}
                    onChange={function (event) {
                      setFormPassword(event.target.value);
                    }}
                    className="w-full rounded-md border border-slate-200 px-3 py-3 text-base text-[#07111F] outline-none focus:border-[#1B4F72] focus:ring-2 focus:ring-[#1B4F72]/20"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm text-slate-600 mb-1.5" htmlFor="userRole">
                  Role
                </label>
                <select
                  id="userRole"
                  value={formRole}
                  onChange={function (event) {
                    setFormRole(event.target.value);
                  }}
                  className="w-full rounded-md border border-slate-200 px-3 py-3 text-base text-[#07111F] outline-none focus:border-[#1B4F72] focus:ring-2 focus:ring-[#1B4F72]/20"
                >
                  <option value="admin">Admin</option>
                  <option value="cashier">Cashier</option>
                  <option value="storekeeper">Storekeeper</option>
                </select>
              </div>

              {editingUser ? (
                <div>
                  <label className="block text-sm text-slate-600 mb-1.5" htmlFor="userStatus">
                    Status
                  </label>
                  <select
                    id="userStatus"
                    value={formIsActive ? "active" : "inactive"}
                    onChange={function (event) {
                      setFormIsActive(event.target.value === "active");
                    }}
                    className="w-full rounded-md border border-slate-200 px-3 py-3 text-base text-[#07111F] outline-none focus:border-[#1B4F72] focus:ring-2 focus:ring-[#1B4F72]/20"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              ) : null}

              {editingUser && isOwnAccount(editingUser) === false ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-slate-600 mb-1.5" htmlFor="editNewPassword">
                      New Password
                    </label>
                    <input
                      id="editNewPassword"
                      type="password"
                      value={formNewPassword}
                      onChange={function (event) {
                        setFormNewPassword(event.target.value);
                      }}
                      className="w-full rounded-md border border-slate-200 px-3 py-3 text-base text-[#07111F] outline-none focus:border-[#1B4F72] focus:ring-2 focus:ring-[#1B4F72]/20"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-600 mb-1.5" htmlFor="editConfirmPassword">
                      Confirm New Password
                    </label>
                    <input
                      id="editConfirmPassword"
                      type="password"
                      value={formConfirmPassword}
                      onChange={function (event) {
                        setFormConfirmPassword(event.target.value);
                      }}
                      className="w-full rounded-md border border-slate-200 px-3 py-3 text-base text-[#07111F] outline-none focus:border-[#1B4F72] focus:ring-2 focus:ring-[#1B4F72]/20"
                    />
                    <p className="text-sm text-slate-500 mt-1.5">
                      Leave both fields empty to keep the current password.
                    </p>
                  </div>
                </div>
              ) : null}

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
                  {isSaving ? "Saving..." : editingUser ? "Save Changes" : "Create User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default Users;
