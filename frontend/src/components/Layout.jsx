import { Outlet } from "react-router-dom";
import { useState } from "react";
import Sidebar from "./Sidebar.jsx";
import Header from "./Header.jsx";
import { useAuth } from "../context/AuthContext.jsx";

function Layout() {
  const { user } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  function openSidebar() {
    setIsSidebarOpen(true);
  }

  function closeSidebar() {
    setIsSidebarOpen(false);
  }

  return (
    <div className="min-h-screen w-full max-w-full bg-[#E8EEF4]">
      <Sidebar
        currentUser={user}
        isSidebarOpen={isSidebarOpen}
        onClose={closeSidebar}
      />

      {isSidebarOpen ? (
        <div
          className="fixed inset-0 z-30 bg-[#07111F]/40 lg:hidden"
          onClick={closeSidebar}
        ></div>
      ) : null}

      {/* Padding leaves space for the fixed sidebar instead of adding extra width */}
      <div className="w-full min-w-0 max-w-full lg:pl-[280px]">
        <Header currentUser={user} onOpenSidebar={openSidebar} />

        <main className="p-4 sm:p-6 min-w-0 max-w-full">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default Layout;
