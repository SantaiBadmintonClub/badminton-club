/**
 * src/context/AuthContext.jsx
 *
 * Responsibilities:
 * - Provide auth state: currentUser, userRole (admin | committee | member), loading
 * - Provide actions: login(email, password), logout()
 * - Read user's role from Firestore at /members/{uid} and persist it to localStorage
 * - Only render children after initial auth state has finished loading
 *
 * Firestore structure expected:
 * Collection: members
 * Document id: <uid>
 * Document fields: { role: "admin" | "committee" | "member", ... }
 */

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { auth, db } from "../firebase/config";
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null); // "admin" | "committee" | "member" | null
  const [loading, setLoading] = useState(true);

  const persistRole = useCallback((role) => {
    setUserRole(role);
    try {
      if (role) {
        localStorage.setItem("userRole", JSON.stringify(role));
      } else {
        localStorage.removeItem("userRole");
      }
    } catch (e) {
      // ignore localStorage errors (e.g., private mode)
    }
  }, []);

  // Helper: fetch role from Firestore for a given uid
  const fetchRoleForUid = useCallback(async (uid) => {
    if (!uid) return null;
    try {
      const docRef = doc(db, "members", uid);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const role = snap.data()?.role || "member";
        return role;
      }
      return "member";
    } catch (err) {
      // If Firestore read fails, default to member
      return "member";
    }
  }, []);

  // Login: sign in, fetch role, persist role
  const login = async (email, password) => {
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;
      const role = await fetchRoleForUid(uid);
      persistRole(role);
      setCurrentUser(userCredential.user);
      setLoading(false);
      return userCredential;
    } catch (err) {
      setLoading(false);
      throw err;
    }
  };

  // Logout: sign out and clear role
  const logout = async () => {
    setLoading(true);
    try {
      await signOut(auth);
      setCurrentUser(null);
      persistRole(null);
    } finally {
      setLoading(false);
    }
  };

  // Listen for auth state changes and keep role in sync
  useEffect(() => {
    let mounted = true;
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!mounted) return;
      setCurrentUser(user);

      if (user) {
        // Try to read role from Firestore and persist it
        const role = await fetchRoleForUid(user.uid);
        persistRole(role);
      } else {
        persistRole(null);
      }

      setLoading(false);
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [fetchRoleForUid, persistRole]);

  const value = {
    currentUser,
    userRole,
    loading,
    login,
    logout,
  };

  // Only render children once initial loading is finished
  if (loading) return null;

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
