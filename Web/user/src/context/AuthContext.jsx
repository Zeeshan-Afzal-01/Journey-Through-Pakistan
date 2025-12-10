import React, { createContext, useState, useEffect, useContext } from "react";
import { getMe, signup as apiSignup, login as apiLogin, logout as apiLogout } from "../api/authApi.jsx";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [Login, setLogin] = useState(false);

  const fetchUser = async () => {
    try {
      const res = await getMe();
      // getMe returns the user object directly
      if (res.data) {
        setUser(res.data);
        setLogin(true); // Set login state to true if user is authenticated
      } else {
        setUser(null);
        setLogin(false);
      }
    } catch {
      setUser(null);
      setLogin(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
    
    // Check if user just came from OAuth callback - retry after redirect
    // This handles the case where OAuth redirects to /dashboard but cookie hasn't been read yet
    const timeoutId = setTimeout(() => {
      fetchUser(); // Retry once after 1 second to catch OAuth callback
    }, 1500);
    
    // Also check on focus (when user returns from OAuth redirect)
    const handleFocus = () => {
      fetchUser();
    };
    window.addEventListener('focus', handleFocus);
    
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  const handleSignup = async (formData) => {
    setLoading(true);
    try {
      const payload = {
        name: formData.fullName,
        email: formData.email,
        password: formData.password,
        role: formData.role,
        city: formData.region,
        profilePicture: formData.profilePicture,
      };
      const res = await apiSignup(payload);
      return res;
    } finally {
      setLoading(false);
    }
  };
  const handleLogout = async () => {
    setLoading(true);
    try {
      await apiLogout();
      setUser(null);
      setLogin(false);
    } finally {
      setLoading(false);
    }
  };
  const handleLogin = async (credentials) => {
    setLoading(true);
    try {
      await apiLogin(credentials);
      const res = await getMe();
      setUser(res.data);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, setUser,handleLogout, loading, isAuthenticated: Boolean(user), handleSignup, handleLogin }}>
      {children}
    </AuthContext.Provider>
  );
};
export const useAuth = () => useContext(AuthContext);
