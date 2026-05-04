import { Navigate } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";

const ProtectedRoute = ({ children }) => {
    const { authUser, isCheckingAuth } = useAuthStore();

    if (isCheckingAuth) return null; // App.jsx shows the global loader
    if (!authUser) return <Navigate to="/login" replace />;

    return children;
};

export default ProtectedRoute;
