import { useState } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Sidebar = ({ isOpen, toggle }) => {
  const { userRole, logout } = useAuth();

  const navItems = {
    admin: [
      { label: "Dashboard", path: "/dashboard" },
      { label: "Members", path: "/members" },
      { label: "Payments", path: "/payments" },
      { label: "Reports", path: "/reports" },
      { label: "Settings", path: "/settings" },
      { label: "My Account", path: "/member" },
    ],
    committee: [
      { label: "Dashboard", path: "/dashboard" },
      { label: "Reports", path: "/reports" },
      { label: "My Account", path: "/member" },
    ],
    member: [
      { label: "My Account", path: "/member" },
      { label: "Announcements", path: "/member#announcements" },
    ],
  };

  const links = navItems[userRole] || [];

  return (
    <>
      {/* Overlay for mobile */}
      <div
        className={`fixed inset-0 bg-black/40 z-30 lg:hidden ${
          isOpen ? "block" : "hidden"
        }`}
        onClick={toggle}
      />

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-white shadow-lg z-40 transform transition-transform
        ${isOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}
      >
        {/* Header */}
        <div className="p-4 border-b flex items-center gap-3">
          <img
            src="/shuttlecock.png"
            alt="Club Logo"
            className="w-10 h-10"
          />
          <h1 className="text-lg font-bold">Santai Badminton Club</h1>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-2">
          {links.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `block px-3 py-2 rounded ${
                  isActive
                    ? "bg-blue-600 text-white"
                    : "text-gray-700 hover:bg-gray-100"
                }`
              }
              onClick={toggle}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <div className="absolute bottom-4 w-full px-4">
          <button
            onClick={logout}
            className="w-full bg-red-600 text-white py-2 rounded hover:bg-red-700"
          >
            Logout
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
