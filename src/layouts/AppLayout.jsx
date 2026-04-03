import { useState } from "react";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";

const AppLayout = ({ title, children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => setSidebarOpen((s) => !s);

  return (
    <div className="flex">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} toggle={toggleSidebar} />

      {/* Main content */}
      <div className="flex-1 lg:ml-64 min-h-screen bg-gray-100">
        <Navbar title={title} toggleSidebar={toggleSidebar} />

        <main className="p-6">{children}</main>
      </div>
    </div>
  );
};

export default AppLayout;
