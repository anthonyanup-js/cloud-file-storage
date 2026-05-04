import { useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";

import { useAuthStore } from "./store/useAuthStore";
import ProtectedRoute from "./components/ProtectedRoute";
import Toast from "./components/Toast";

import Hero from "./pages/Hero";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";

const App = () => {
    const { authUser, isCheckingAuth, checkAuth } = useAuthStore();

    useEffect(() => {
        checkAuth();
    }, [checkAuth]);

    // Show a full-screen loader while checking auth on initial load
    if (isCheckingAuth) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-950">
                <Loader2 className="w-10 h-10 animate-spin text-purple-600" />
            </div>
        );
    }

    return (
        <>
            <Routes>
                <Route path="/" element={authUser ? <Navigate to="/dashboard" /> : <Hero />} />
                <Route path="/login" element={authUser ? <Navigate to="/dashboard" /> : <Login />} />
                <Route path="/signup" element={authUser ? <Navigate to="/dashboard" /> : <Signup />} />
                <Route
                    path="/dashboard"
                    element={
                        <ProtectedRoute>
                            <Dashboard />
                        </ProtectedRoute>
                    }
                />
            </Routes>
            <Toast />
        </>
    );
};

export default App;