import { Link, useLocation } from "react-router-dom";
import { Menu, UserRound } from "lucide-react";

function Header({ currentUser, onOpenSidebar }) {
  const location = useLocation();

  const pageInfo = {
    "/dashboard": {
      title: "Dashboard",
      description: "Overview of your shop performance",
    },
    "/products": {
      title: "Products",
      description: "Manage your products and stock",
    },
    "/purchases": {
      title: "Purchases",
      description: "Stock coming into the shop",
    },
    "/sales": {
      title: "Sales",
      description: "Point of sale and receipts",
    },
    "/expenses": {
      title: "Expenses",
      description: "Business costs and spending",
    },
    "/debts": {
      title: "Debts",
      description: "Customer and supplier balances",
    },
    "/debt-payments": {
      title: "Debt Payments",
      description: "Payments toward outstanding debts",
    },
    "/reports": {
      title: "Reports",
      description: "Sales, profit, and cash flow",
    },
    "/users": {
      title: "Users",
      description: "Manage system users and access",
    },
    "/profile": {
      title: "Profile",
      description: "Your account and password",
    },
  };

  const currentPage = pageInfo[location.pathname] || {
    title: "SamoSoftware",
    description: "Shop Management System",
  };

  return (
    <header className="no-print w-full min-w-0 h-16 bg-white border-b border-slate-200 flex items-center justify-between gap-3 px-4 sm:px-6">
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onOpenSidebar}
          className="lg:hidden h-10 w-10 rounded-md border border-slate-200 text-[#07111F] flex items-center justify-center shrink-0"
        >
          <Menu size={22} />
        </button>

        <div className="min-w-0">
          <h1 className="text-lg sm:text-2xl font-semibold text-[#07111F] truncate">
            {currentPage.title}
          </h1>
          <p className="hidden sm:block text-sm text-slate-500 truncate">
            {currentPage.description}
          </p>
        </div>
      </div>

      <Link
        to="/profile"
        className="flex items-center gap-2 rounded-md px-1 py-1 hover:bg-slate-50 shrink-0 min-w-0"
      >
        <div className="h-10 w-10 rounded-full bg-[#102A43] text-white flex items-center justify-center shrink-0">
          <UserRound size={18} />
        </div>
        <div className="hidden md:block min-w-0">
          <p className="text-sm font-medium text-[#07111F] leading-tight truncate">
            {currentUser.name}
          </p>
          <p className="text-xs text-[#1B4F72] capitalize">{currentUser.role}</p>
        </div>
      </Link>
    </header>
  );
}

export default Header;
