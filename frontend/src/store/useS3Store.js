import { create } from "zustand";
import axiosInstance from "../config/axios";
import axios from "axios";

export const useS3Store = create((set, get) => ({
    files: [],
    isUploading: false,
    uploadProgress: 0,
    isLoading: false,
    isDeleting: false,
    error: null,
    pagination: null,

    // Upload a file via signed URL
    uploadFile: async (file) => {
        set({ isUploading: true, uploadProgress: 0, error: null });
        try {
            // 1. Get signed URL from backend
            const { data } = await axiosInstance.post("/files/upload-url", {
                fileName: file.name,
                contentType: file.type,
                size: file.size,
            });

            // 2. Upload directly to S3 using the signed URL
            await axios.put(data.signedUrl, file, {
                headers: { "Content-Type": file.type },
                onUploadProgress: (progressEvent) => {
                    const percent = Math.round(
                        (progressEvent.loaded * 100) / progressEvent.total
                    );
                    set({ uploadProgress: percent });
                },
            });

            // 3. Confirm upload with actual file size
            await axiosInstance.post("/files/confirm-upload", {
                fileId: data.file._id,
                size: file.size,
            });

            // 4. Add file to local state
            set((state) => ({
                files: [data.file, ...state.files],
                isUploading: false,
                uploadProgress: 100,
            }));

            return data.file;
        } catch (error) {
            console.error("Upload error:", error);
            set({
                error: error.response?.data?.message || "Upload failed",
                isUploading: false,
                uploadProgress: 0,
            });
            throw error;
        }
    },

    // Fetch all files for the current user
    getAllFiles: async (page = 1) => {
        set({ isLoading: true, error: null });
        try {
            const { data } = await axiosInstance.get(`/files?page=${page}&limit=20`);
            set({
                files: data.files,
                pagination: data.pagination,
                isLoading: false,
            });
        } catch (error) {
            console.error("getAllFiles error:", error);
            set({
                error: error.response?.data?.message || "Failed to load files",
                isLoading: false,
            });
        }
    },

    // Get a signed view/download URL
    getViewUrl: async (fileId) => {
        try {
            const { data } = await axiosInstance.get(`/files/view/${fileId}`);
            return data.signedUrl;
        } catch (error) {
            console.error("getViewUrl error:", error);
            throw error;
        }
    },

    // Delete a file
    deleteFile: async (fileId) => {
        set({ isDeleting: true, error: null });
        try {
            await axiosInstance.delete(`/files/${fileId}`);
            set((state) => ({
                files: state.files.filter((f) => f._id !== fileId),
                isDeleting: false,
            }));
        } catch (error) {
            console.error("deleteFile error:", error);
            set({
                error: error.response?.data?.message || "Failed to delete file",
                isDeleting: false,
            });
            throw error;
        }
    },

    // Rename a file (S3 copy + delete pattern handled by backend)
    renameFile: async (fileId, newName) => {
        set({ error: null });
        try {
            const { data } = await axiosInstance.put("/files/rename", {
                fileId,
                newName,
            });
            set((state) => ({
                files: state.files.map((f) => (f._id === fileId ? data : f)),
            }));
            return data;
        } catch (error) {
            console.error("renameFile error:", error);
            set({
                error: error.response?.data?.message || "Failed to rename file",
            });
            throw error;
        }
    },

    clearError: () => set({ error: null }),
}));