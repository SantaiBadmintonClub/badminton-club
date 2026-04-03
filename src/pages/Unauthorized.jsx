const Unauthorized = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
      <h1 className="text-3xl font-bold text-red-600 mb-3">Access Denied</h1>
      <p className="text-gray-700">You do not have permission to view this page.</p>
    </div>
  );
};

export default Unauthorized;
