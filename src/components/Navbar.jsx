import { useAuth } from "../context/AuthContext";

const Navbar = ({ title, toggleSidebar }) => {
  const { currentUser, userRole } = useAuth();

  return (
    <header className="bg-white shadow px-4 py-3 flex items-center justify-between sticky top-0 z-20">
      {/* Mobile hamburger */}
      <button
        className="lg:hidden text-gray-700"
        onClick={toggleSidebar}
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Page title */}
      <h2 className="text-xl font-semibold">{title}</h2>

      {/* User info */}
      <div className="flex items-center gap-3">
        <span className="font-medium">{currentUser?.email}</span>
        <span
          className={`px-2 py-1 text-xs rounded ${
            userRole === "admin"
              ? "bg-red-100 text-red-700"
              : userRole === "committee"
              ? "bg-yellow-100 text-yellow-700"
              : "bg-green-100 text-green-700"
          }`}
        >
          {userRole}
        </span>

        {/* Notification bell (optional) */}
        <button className="text-gray-600 hover:text-gray-800">
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeWidth="2"
              d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2c0 .5-.2 1-.6 1.4L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
        </button>
      </div>
    </header>
  );
};

export default Navbar;
