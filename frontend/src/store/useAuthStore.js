import { create } from "zustand";
import axiosInstance from "../config/axios";

export const useAuthStore = create((set) => ({
    authUser: null,
    isCheckingAuth: true,
    isSigningUp: false,
    isLoggingIn: false,
    error: null,

    checkAuth: async () => {
        try {
            const response = await axiosInstance.get("/auth/check");
            set({ authUser: response.data, isCheckingAuth: false });
        } catch (error) {
            console.log("checkAuth: not authenticated");
            set({ authUser: null, isCheckingAuth: false });
        }
    },

    signup: async (signupData) => {
        set({ isSigningUp: true, error: null });
        try {
            const response = await axiosInstance.post("/auth/signup", signupData);
            set({ authUser: response.data, isSigningUp: false });
            return response.data;
        } catch (error) {
            const message = error.response?.data?.message || "Failed to sign up";
            set({ error: message, isSigningUp: false });
            throw error;
        }
    },

    login: async (loginData) => {
        set({ isLoggingIn: true, error: null });
        try {
            const response = await axiosInstance.post("/auth/login", loginData);
            set({ authUser: response.data, isLoggingIn: false });
            return response.data;
        } catch (error) {
            const message = error.response?.data?.message || "Failed to log in";
            set({ error: message, isLoggingIn: false });
            throw error;
        }
    },

    // Stateless logout — just clear the cookie
    logout: async () => {
        try {
            await axiosInstance.post("/auth/logout");
        } catch (error) {
            console.error("Logout error:", error);
        } finally {
            set({ authUser: null });
        }
    },

    clearError: () => set({ error: null }),
}));
