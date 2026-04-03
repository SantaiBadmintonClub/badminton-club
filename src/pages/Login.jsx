import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../firebase/config";
import { useNavigate } from "react-router-dom";

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [resetMessage, setResetMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setResetMessage("");

    try {
      const userCredential = await login(email, password);

      // Role-based redirect
      const role = userCredential?._tokenResponse?.role; // fallback if needed
      // But AuthContext already sets userRole, so we rely on Firestore role

      // Fetch role from Firestore via AuthContext listener
      // Delay slightly to allow context to update
      setTimeout(() => {
        const storedRole = JSON.parse(localStorage.getItem("userRole"));
        const finalRole = storedRole || "member";

        if (finalRole === "admin" || finalRole === "committee") {
          navigate("/dashboard");
        } else {
          navigate("/member");
        }
      }, 300);
    } catch (err) {
      setError("Invalid email or password.");
    }
  };

  const handleForgotPassword = async () => {
    setError("");
    setResetMessage("");

    if (!email) {
      setError("Please enter your email to reset password.");
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      setResetMessage("Password reset email sent. Please check your inbox.");
    } catch (err) {
      setError("Unable to send reset email. Please check your email address.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="bg-white shadow-lg rounded-lg p-8 w-full max-w-md">
        
        {/* Logo + Title */}
        <div className="text-center mb-6">
          <img
            src="/shuttlecock.png"
            alt="Shuttlecock Logo"
            className="w-16 h-16 mx-auto mb-3"
          />
          <h1 className="text-2xl font-bold text-gray-800">
            Santai Badminton Club
          </h1>
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-red-100 text-red-700 p-3 rounded mb-4 text-sm">
            {error}
          </div>
        )}

        {/* Reset message */}
        {resetMessage && (
          <div className="bg-green-100 text-green-700 p-3 rounded mb-4 text-sm">
            {resetMessage}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-700 text-sm mb-1">Email</label>
            <input
              type="email"
              className="w-full border rounded px-3 py-2 focus:ring focus:ring-blue-200"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-gray-700 text-sm mb-1">Password</label>
            <input
              type="password"
              className="w-full border rounded px-3 py-2 focus:ring focus:ring-blue-200"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition"
          >
            Login
          </button>
        </form>

        {/* Forgot Password */}
        <div className="text-center mt-4">
          <button
            onClick={handleForgotPassword}
            className="text-blue-600 hover:underline text-sm"
          >
            Forgot password
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;

