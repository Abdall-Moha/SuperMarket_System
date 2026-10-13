import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import {
  X,
  Store,
  LayoutDashboard,
  Package,
  ShoppingCart,
  Receipt,
  Wallet,
  Handshake,
  Banknote,
  BarChart3,
  Users,
  LogOut,
} from "lucide-react";

function Sidebar({ currentUser, isSidebarOpen, onClose }) {
  const { logout } = useAuth();
  const allLinks = [
    {
      name: "Dashboard",
      path: "/dashboard",
      icon: LayoutDashboard,
      roles: ["admin", "cashier", "storekeeper"],
    },
    {
      name: "Products",
      path: "/products",
      icon: Package,
      roles: ["admin", "cashier", "storekeeper"],
    },
    {
      name: "Purchases",
      path: "/purchases",
      icon: ShoppingCart,
      roles: ["admin", "storekeeper"],
    },
    {
      name: "Sales",
      path: "/sales",
      icon: Receipt,
      roles: ["admin", "cashier", "storekeeper"],
    },
    {
      name: "Expenses",
      path: "/expenses",
      icon: Wallet,
      roles: ["admin", "storekeeper"],
    },
    {
      name: "Debts",
      path: "/debts",
      icon: Handshake,
      roles: ["admin", "cashier", "storekeeper"],
    },
    {
      name: "Debt Payments",
      path: "/debt-payments",
      icon: Banknote,
      roles: ["admin", "cashier", "storekeeper"],
    },
    {
      name: "Reports",
      path: "/reports",
      icon: BarChart3,
      roles: ["admin", "storekeeper"],
    },
    {
      name: "Users",
      path: "/users",
      icon: Users,
      roles: ["admin"],
    },
  ];

  const visibleLinks = allLinks.filter(function (link) {
    return link.roles.includes(currentUser.role);
  });

  function handleLogout() {
    onClose();
    logout();
  }

  return (
    <aside
      className={
        "no-print fixed top-0 left-0 z-40 h-screen w-[280px] max-w-[85vw] bg-[#07111F] text-white flex flex-col " +
        (isSidebarOpen ? "translate-x-0" : "-translate-x-full") +
        " lg:translate-x-0 transition-transform duration-300"
      }
    >
      <div className="h-[76px] px-5 flex items-center justify-between border-b border-white/10 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-10 w-10 rounded-md bg-[#1B4F72] flex items-center justify-center shrink-0">
            <Store size={20} />
          </div>
          <div className="min-w-0">
            <p className="text-base font-semibold tracking-[0.18em]">SamoSoftware</p>
            <p className="text-xs text-slate-400 mt-0.5">Shop Management System</p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="lg:hidden text-slate-300 hover:text-white"
        >
          <X size={22} />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 min-h-0">
        <p className="px-3 mb-2 text-[11px] uppercase tracking-[0.16em] text-slate-500">
          Menu
        </p>

        <div className="flex flex-col gap-1">
          {visibleLinks.map(function (link) {
            const Icon = link.icon;

            return (
              <NavLink
                key={link.path}
                to={link.path}
                onClick={onClose}
                className={function ({ isActive }) {
                  if (isActive) {
                    return "flex items-center gap-3 rounded-md px-3 py-2.5 text-[15px] bg-[#1B4F72] text-white";
                  }

                  return "flex items-center gap-3 rounded-md px-3 py-2.5 text-[15px] text-slate-300 hover:bg-[#12263F] hover:text-white";
                }}
              >
                <Icon size={20} />
                <span>{link.name}</span>
              </NavLink>
            );
          })}
        </div>
      </nav>

      <div className="px-3 py-4 border-t border-white/10 shrink-0">
        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center gap-3 rounded-md px-3 py-2.5 text-[15px] text-slate-300 hover:bg-red-500/10 hover:text-red-400"
        >
          <LogOut size={20} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
