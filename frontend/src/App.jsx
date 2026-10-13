import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout.jsx";
import ProtectedRoute, { GuestRoute } from "./components/ProtectedRoute.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Products from "./pages/Products.jsx";
import Purchases from "./pages/Purchases.jsx";
import Sales from "./pages/Sales.jsx";
import Expenses from "./pages/Expenses.jsx";
import Debts from "./pages/Debts.jsx";
import DebtPayments from "./pages/DebtPayments.jsx";
import Reports from "./pages/Reports.jsx";
import Users from "./pages/Users.jsx";
import Profile from "./pages/Profile.jsx";
import Login from "./pages/Login.jsx";

function App() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <GuestRoute>
            <Login />
          </GuestRoute>
        }
      />

      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="products" element={<Products />} />
        <Route
          path="purchases"
          element={
            <ProtectedRoute allowedRoles={["admin", "storekeeper"]}>
              <Purchases />
            </ProtectedRoute>
          }
        />
        <Route path="sales" element={<Sales />} />
        <Route
          path="expenses"
          element={
            <ProtectedRoute allowedRoles={["admin", "storekeeper"]}>
              <Expenses />
            </ProtectedRoute>
          }
        />
        <Route path="debts" element={<Debts />} />
        <Route path="debt-payments" element={<DebtPayments />} />
        <Route
          path="reports"
          element={
            <ProtectedRoute allowedRoles={["admin", "storekeeper"]}>
              <Reports />
            </ProtectedRoute>
          }
        />
        <Route
          path="users"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <Users />
            </ProtectedRoute>
          }
        />
        <Route path="profile" element={<Profile />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
