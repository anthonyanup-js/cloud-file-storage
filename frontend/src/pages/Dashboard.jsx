import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
    Cloud, LogOut, Upload, File as FileIcon, MoreVertical,
    Trash2, Edit2, Download, Image as ImageIcon, FileText,
    Loader2, Music, Video, Archive, Code, Eye,
} from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { useS3Store } from "../store/useS3Store";
import { toast } from "../components/Toast";
import FilePreviewModal from "../components/FilePreviewModal";

// ── Utilities ──────────────────────────────────────────────
const formatSize = (bytes) => {
    if (!bytes || bytes === 0) return "0 B";
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
};

const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

const getFileIcon = (mimeType) => {
    if (!mimeType) return <FileIcon className="w-8 h-8 text-gray-400" />;
    if (mimeType.startsWith("image/")) return <ImageIcon className="w-8 h-8 text-blue-500" />;
    if (mimeType === "application/pdf") return <FileText className="w-8 h-8 text-red-500" />;
    if (mimeType.startsWith("video/")) return <Video className="w-8 h-8 text-purple-500" />;
    if (mimeType.startsWith("audio/")) return <Music className="w-8 h-8 text-pink-500" />;
    if (mimeType.includes("zip") || mimeType.includes("rar") || mimeType.includes("tar"))
        return <Archive className="w-8 h-8 text-yellow-600" />;
    if (mimeType.includes("javascript") || mimeType.includes("json") || mimeType.includes("html") || mimeType.includes("css") || mimeType.includes("xml"))
        return <Code className="w-8 h-8 text-emerald-500" />;
    return <FileIcon className="w-8 h-8 text-gray-500" />;
};

// ── Dashboard ──────────────────────────────────────────────
const Dashboard = () => {
    const navigate = useNavigate();
    const fileInputRef = useRef(null);
    const [isDragging, setIsDragging] = useState(false);
    const [previewFile, setPreviewFile] = useState(null);

    const { authUser, logout } = useAuthStore();
    const { files, isUploading, uploadProgress, isLoading, getAllFiles, uploadFile, deleteFile, renameFile, getViewUrl } = useS3Store();

    // Load files on mount
    useEffect(() => {
        getAllFiles();
    }, [getAllFiles]);

    // ── Upload handler ──
    const handleUpload = useCallback(async (fileList) => {
        if (!fileList || fileList.length === 0) return;

        for (const file of fileList) {
            try {
                await uploadFile(file);
                toast.success(`"${file.name}" uploaded successfully`);
            } catch {
                toast.error(`Failed to upload "${file.name}"`);
            }
        }
    }, [uploadFile]);

    const handleFileChange = (e) => {
        handleUpload(e.target.files);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    // ── Drag & Drop ──
    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };
    const handleDragLeave = (e) => {
        e.preventDefault();
        setIsDragging(false);
    };
    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        handleUpload(e.dataTransfer.files);
    };

    // ── File actions ──
    const handleDelete = async (fileId, fileName) => {
        if (!window.confirm(`Delete "${fileName}"? This cannot be undone.`)) return;
        try {
            await deleteFile(fileId);
            toast.success(`"${fileName}" deleted`);
        } catch {
            toast.error("Failed to delete file");
        }
    };

    const handleRename = async (fileId, currentName) => {
        const newName = window.prompt("Enter new file name:", currentName);
        if (!newName || newName === currentName) return;
        try {
            await renameFile(fileId, newName);
            toast.success(`Renamed to "${newName}"`);
        } catch {
            toast.error("Failed to rename file");
        }
    };

    const handleDownload = async (file) => {
        try {
            const url = await getViewUrl(file._id);
            const a = document.createElement("a");
            a.href = url;
            a.download = file.fileName;
            a.target = "_blank";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        } catch {
            toast.error("Failed to download file");
        }
    };

    const handleLogout = async () => {
        await logout();
        navigate("/");
    };

    return (
        <div
            className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 flex flex-col"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            {/* ── Header ── */}
            <header className="border-b border-gray-100 dark:border-gray-800 bg-white/80 dark:bg-gray-950/80 backdrop-blur-md sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Cloud className="w-8 h-8 text-purple-600" />
                        <span className="text-xl font-bold tracking-tight hidden sm:block">CloudDrive</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="hidden sm:block text-sm text-gray-500 dark:text-gray-400">
                            Welcome, <span className="font-medium text-gray-900 dark:text-gray-100">{authUser?.name}</span>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="p-2 text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                            title="Log out"
                        >
                            <LogOut className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </header>

            {/* ── Main Content ── */}
            <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8 flex flex-col gap-8">

                {/* Actions Bar */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <h1 className="text-2xl font-bold">My Files</h1>
                    <div className="flex items-center gap-4 w-full sm:w-auto">
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            multiple
                            onChange={handleFileChange}
                        />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploading}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-purple-600 text-white font-medium rounded-xl hover:bg-purple-700 transition-colors shadow-lg shadow-purple-500/30 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                            {isUploading ? "Uploading..." : "Upload Files"}
                        </button>
                    </div>
                </div>

                {/* Upload Progress */}
                {isUploading && (
                    <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2.5 overflow-hidden">
                        <div
                            className="bg-purple-600 h-2.5 rounded-full transition-all duration-300 ease-out"
                            style={{ width: `${uploadProgress}%` }}
                        />
                    </div>
                )}

                {/* Drag overlay */}
                {isDragging && (
                    <div className="fixed inset-0 z-40 bg-purple-600/10 backdrop-blur-sm flex items-center justify-center pointer-events-none">
                        <div className="p-8 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border-2 border-dashed border-purple-500 text-center">
                            <Upload className="w-12 h-12 text-purple-600 mx-auto mb-4" />
                            <p className="text-lg font-semibold text-purple-600">Drop files here to upload</p>
                        </div>
                    </div>
                )}

                {/* Files Grid */}
                {isLoading ? (
                    <div className="flex-1 flex items-center justify-center">
                        <Loader2 className="w-10 h-10 animate-spin text-purple-600" />
                    </div>
                ) : files.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-12 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-2xl">
                        <div className="w-16 h-16 bg-gray-50 dark:bg-gray-900 rounded-2xl flex items-center justify-center mb-4 text-gray-400">
                            <Cloud className="w-8 h-8" />
                        </div>
                        <h3 className="text-xl font-bold mb-2">No files yet</h3>
                        <p className="text-gray-500 dark:text-gray-400 max-w-sm mb-6">
                            Upload your first file to get started with CloudDrive.
                        </p>
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="px-6 py-2.5 font-medium bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl hover:scale-105 transition-transform"
                        >
                            Upload File
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {files.map((file) => (
                            <FileCard
                                key={file._id}
                                file={file}
                                onDelete={handleDelete}
                                onRename={handleRename}
                                onDownload={handleDownload}
                                onPreview={setPreviewFile}
                            />
                        ))}
                    </div>
                )}
            </main>

            {/* Preview Modal */}
            {previewFile && (
                <FilePreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />
            )}
        </div>
    );
};

// ── File Card ──────────────────────────────────────────────
const FileCard = ({ file, onDelete, onRename, onDownload, onPreview }) => {
    const [showMenu, setShowMenu] = useState(false);

    return (
        <div className="relative group p-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 hover:border-purple-500/30 dark:hover:border-purple-500/30 transition-all hover:shadow-lg">
            <div className="flex items-start justify-between mb-4">
                <button
                    onClick={() => onPreview(file)}
                    className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                    title="Preview file"
                >
                    {getFileIcon(file.mimeType)}
                </button>

                <div className="relative">
                    <button
                        onClick={() => setShowMenu(!showMenu)}
                        onBlur={() => setTimeout(() => setShowMenu(false), 200)}
                        className="p-1.5 text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                        <MoreVertical className="w-5 h-5" />
                    </button>

                    {showMenu && (
                        <div className="absolute right-0 top-full mt-1 w-40 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden z-20 py-1">
                            <button
                                onClick={() => onPreview(file)}
                                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-left hover:bg-gray-50 dark:hover:bg-gray-700"
                            >
                                <Eye className="w-4 h-4" /> Preview
                            </button>
                            <button
                                onClick={() => onDownload(file)}
                                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-left hover:bg-gray-50 dark:hover:bg-gray-700"
                            >
                                <Download className="w-4 h-4" /> Download
                            </button>
                            <button
                                onClick={() => onRename(file._id, file.fileName)}
                                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-left hover:bg-gray-50 dark:hover:bg-gray-700"
                            >
                                <Edit2 className="w-4 h-4" /> Rename
                            </button>
                            <div className="h-px bg-gray-100 dark:bg-gray-700 my-1" />
                            <button
                                onClick={() => onDelete(file._id, file.fileName)}
                                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-left text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10"
                            >
                                <Trash2 className="w-4 h-4" /> Delete
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div>
                <h4 className="font-semibold text-sm truncate mb-1" title={file.fileName}>
                    {file.fileName}
                </h4>
                <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                    <span>{formatSize(file.size)}</span>
                    <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-700" />
                    <span>{formatDate(file.createdAt)}</span>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
