import { createContext, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../api/api.js";

const AuthContext = createContext(null);

function formatUser(user) {
  return {
    id: user.id || user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    isActive: user.isActive,
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(function () {
    checkSavedToken();
  }, []);

  // Check the saved token when the app starts
  async function checkSavedToken() {
    const token = localStorage.getItem("token");

    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const result = await apiRequest("/users/me");

      if (result.ok && result.data.user) {
        setUser(formatUser(result.data.user));
        setLoading(false);
        return;
      }

      localStorage.removeItem("token");
      setUser(null);
      setLoading(false);
    } catch (error) {
      setUser(null);
      setLoading(false);
    }
  }

  async function login(email, password) {
    const loginResult = await apiRequest("/users/login", {
      method: "POST",
      body: {
        email: email,
        password: password,
      },
    });

    if (loginResult.ok === false) {
      return {
        ok: false,
        message: loginResult.data.message || "Invalid email or password.",
      };
    }

    localStorage.setItem("token", loginResult.data.token);

    const meResult = await apiRequest("/users/me");

    if (meResult.ok === false || !meResult.data.user) {
      localStorage.removeItem("token");
      return {
        ok: false,
        message: "Could not verify your session.",
      };
    }

    setUser(formatUser(meResult.data.user));

    return {
      ok: true,
    };
  }

  // Remove the token and send the user back to login
  function logout() {
    localStorage.removeItem("token");
    setUser(null);
    navigate("/login");
  }

  return (
    <AuthContext.Provider
      value={{
        user: user,
        loading: loading,
        login: login,
        logout: logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
