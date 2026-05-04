import { create } from "zustand";
import axiosInstance from "../config/axios";
import axios from "axios";

const MULTIPART_THRESHOLD = 10 * 1024 * 1024; // 10 MB
const MAX_CONCURRENT = 5;

export const useS3Store = create((set, get) => ({
    files: [],
    isUploading: false,
    uploadProgress: 0,
    isLoading: false,
    isDeleting: false,
    error: null,
    pagination: null,

    // Upload a file — auto-selects single-PUT vs multipart based on size
    uploadFile: async (file) => {
        if (file.size >= MULTIPART_THRESHOLD) {
            return get()._multipartUpload(file);
        }
        return get()._singleUpload(file);
    },

    // ── Single PUT upload (files < 10 MB) ──
    _singleUpload: async (file) => {
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

    // ── Multipart upload (files ≥ 10 MB) ──
    _multipartUpload: async (file) => {
        set({ isUploading: true, uploadProgress: 0, error: null });

        let uploadId = null;
        let key = null;
        let fileId = null;

        try {
            // 1. Initiate multipart upload — get uploadId + presigned URLs
            const { data } = await axiosInstance.post("/files/initiate-multipart", {
                fileName: file.name,
                contentType: file.type,
                size: file.size,
            });

            uploadId = data.uploadId;
            key = data.key;
            fileId = data.fileId;
            const { partUrls, totalParts } = data;

            // 2. Slice file and upload parts in parallel (max 5 concurrent)
            const partProgress = new Array(totalParts).fill(0);
            const completedParts = [];

            const updateOverallProgress = () => {
                const totalLoaded = partProgress.reduce((sum, p) => sum + p, 0);
                const percent = Math.round((totalLoaded / file.size) * 100);
                set({ uploadProgress: Math.min(percent, 99) }); // cap at 99 until complete
            };

            const uploadPart = async ({ partNumber, signedUrl }) => {
                const start = (partNumber - 1) * (10 * 1024 * 1024); // PART_SIZE
                const end = Math.min(start + 10 * 1024 * 1024, file.size);
                const blob = file.slice(start, end);
                const partSize = end - start;

                const response = await axios.put(signedUrl, blob, {
                    headers: { "Content-Type": file.type },
                    onUploadProgress: (progressEvent) => {
                        partProgress[partNumber - 1] = Math.min(progressEvent.loaded, partSize);
                        updateOverallProgress();
                    },
                });

                // S3 returns ETag in the response headers
                const etag = response.headers.etag || response.headers.ETag;
                completedParts.push({ PartNumber: partNumber, ETag: etag });
            };

            // Concurrency pool — upload max 5 parts at a time
            const queue = [...partUrls];
            const workers = [];
            for (let i = 0; i < Math.min(MAX_CONCURRENT, queue.length); i++) {
                workers.push(
                    (async () => {
                        while (queue.length > 0) {
                            const part = queue.shift();
                            if (part) await uploadPart(part);
                        }
                    })()
                );
            }
            await Promise.all(workers);

            // 3. Complete the multipart upload
            await axiosInstance.post("/files/complete-multipart", {
                uploadId,
                key,
                fileId,
                parts: completedParts,
            });

            // 4. Build file object for local state
            const uploadedFile = {
                _id: fileId,
                fileName: file.name,
                originalName: file.name,
                key,
                size: file.size,
                mimeType: file.type,
                createdAt: new Date().toISOString(),
            };

            set((state) => ({
                files: [uploadedFile, ...state.files],
                isUploading: false,
                uploadProgress: 100,
            }));

            return uploadedFile;
        } catch (error) {
            console.error("Multipart upload error:", error);

            // Abort to clean up S3 parts + DB record
            if (uploadId && key) {
                try {
                    await axiosInstance.post("/files/abort-multipart", { uploadId, key, fileId });
                } catch (abortErr) {
                    console.error("Failed to abort multipart upload:", abortErr);
                }
            }

            set({
                error: error.response?.data?.message || "Multipart upload failed",
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