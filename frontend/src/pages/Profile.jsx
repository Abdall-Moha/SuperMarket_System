import { useState } from "react";
import { UserRound } from "lucide-react";
import { apiRequest } from "../api/api.js";
import { useAuth } from "../context/AuthContext.jsx";

function Profile() {
  const { user: currentUser } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function handleChangePassword(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("Please fill in all password fields.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New password and confirm password do not match.");
      return;
    }

    setIsSaving(true);

    try {
      const result = await apiRequest("/users/change-password", {
        method: "PUT",
        body: {
          currentPassword: currentPassword,
          newPassword: newPassword,
        },
      });

      if (result.ok === false) {
        setError(result.data.message || "Could not change the password.");
        setIsSaving(false);
        return;
      }

      setSuccess(result.data.message || "Password changed successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError("Could not connect to the server.");
    }

    setIsSaving(false);
  }

  return (
    <div className="w-full min-w-0 max-w-xl space-y-4">
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-5 sm:p-6">
        <div className="flex flex-col items-center text-center">
          <div className="h-16 w-16 rounded-full bg-[#102A43] text-white flex items-center justify-center">
            <UserRound size={28} />
          </div>
          <h2 className="text-xl font-semibold text-[#07111F] mt-4">
            {currentUser.name}
          </h2>
          <p className="text-sm text-[#1B4F72] capitalize mt-1">{currentUser.role}</p>
        </div>

        <div className="mt-6 space-y-4">
          <div className="rounded-md bg-[#F4F7FA] px-4 py-3">
            <p className="text-sm text-slate-500">Email</p>
            <p className="text-base font-medium text-[#07111F] mt-1 break-words">
              {currentUser.email}
            </p>
          </div>
          <div className="rounded-md bg-[#F4F7FA] px-4 py-3">
            <p className="text-sm text-slate-500">Phone</p>
            <p className="text-base font-medium text-[#07111F] mt-1">
              {currentUser.phone}
            </p>
          </div>
          <div className="rounded-md bg-[#F4F7FA] px-4 py-3">
            <p className="text-sm text-slate-500">Role</p>
            <p className="text-base font-medium text-[#07111F] mt-1 capitalize">
              {currentUser.role}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-[#07111F]">Change Password</h2>
        <p className="text-sm text-slate-500 mt-1">
          Enter your current password, then choose a new one.
        </p>

        <form className="mt-5 space-y-4" onSubmit={handleChangePassword}>
          <div>
            <label className="block text-sm text-slate-600 mb-1.5" htmlFor="currentPassword">
              Current Password
            </label>
            <input
              id="currentPassword"
              type="password"
              value={currentPassword}
              onChange={function (event) {
                setCurrentPassword(event.target.value);
              }}
              className="w-full min-w-0 rounded-md border border-slate-200 bg-white px-3 py-3 text-base text-[#07111F] outline-none focus:border-[#1B4F72] focus:ring-2 focus:ring-[#1B4F72]/20"
            />
          </div>

          <div>
            <label className="block text-sm text-slate-600 mb-1.5" htmlFor="newPassword">
              New Password
            </label>
            <input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={function (event) {
                setNewPassword(event.target.value);
              }}
              className="w-full min-w-0 rounded-md border border-slate-200 bg-white px-3 py-3 text-base text-[#07111F] outline-none focus:border-[#1B4F72] focus:ring-2 focus:ring-[#1B4F72]/20"
            />
          </div>

          <div>
            <label className="block text-sm text-slate-600 mb-1.5" htmlFor="confirmPassword">
              Confirm New Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={function (event) {
                setConfirmPassword(event.target.value);
              }}
              className="w-full min-w-0 rounded-md border border-slate-200 bg-white px-3 py-3 text-base text-[#07111F] outline-none focus:border-[#1B4F72] focus:ring-2 focus:ring-[#1B4F72]/20"
            />
          </div>

          {error ? (
            <p className="text-sm text-red-600">{error}</p>
          ) : null}

          {success ? (
            <p className="text-sm text-green-700">{success}</p>
          ) : null}

          <button
            type="submit"
            disabled={isSaving}
            className="w-full sm:w-auto rounded-md bg-[#1B4F72] text-white px-5 py-3 text-sm disabled:opacity-70"
          >
            {isSaving ? "Changing..." : "Change Password"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Profile;
