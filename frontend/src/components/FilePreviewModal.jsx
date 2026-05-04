import { useState, useEffect } from "react";
import { X, Loader2, Download } from "lucide-react";
import { useS3Store } from "../store/useS3Store";

const FilePreviewModal = ({ file, onClose }) => {
    const [url, setUrl] = useState(null);
    const [loading, setLoading] = useState(true);
    const { getViewUrl } = useS3Store();

    useEffect(() => {
        const fetchUrl = async () => {
            try {
                const signedUrl = await getViewUrl(file._id);
                setUrl(signedUrl);
            } catch {
                setUrl(null);
            } finally {
                setLoading(false);
            }
        };
        fetchUrl();
    }, [file._id, getViewUrl]);

    const isImage = file.mimeType?.startsWith("image/");
    const isPdf = file.mimeType === "application/pdf";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate pr-4">
                        {file.fileName}
                    </h3>
                    <div className="flex items-center gap-2">
                        {url && (
                            <a
                                href={url}
                                download={file.fileName}
                                target="_blank"
                                rel="noreferrer"
                                className="p-2 text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                                title="Download"
                            >
                                <Download className="w-5 h-5" />
                            </a>
                        )}
                        <button
                            onClick={onClose}
                            className="p-2 text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto p-4 flex items-center justify-center min-h-[300px]">
                    {loading ? (
                        <Loader2 className="w-10 h-10 animate-spin text-purple-600" />
                    ) : !url ? (
                        <p className="text-gray-500">Failed to load preview</p>
                    ) : isImage ? (
                        <img
                            src={url}
                            alt={file.fileName}
                            className="max-w-full max-h-[70vh] object-contain rounded-lg"
                        />
                    ) : isPdf ? (
                        <iframe
                            src={url}
                            title={file.fileName}
                            className="w-full h-[70vh] rounded-lg border border-gray-200 dark:border-gray-700"
                        />
                    ) : (
                        <div className="text-center">
                            <p className="text-gray-500 dark:text-gray-400 mb-4">
                                Preview not available for this file type.
                            </p>
                            <a
                                href={url}
                                download={file.fileName}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-2 px-5 py-2.5 bg-purple-600 text-white font-medium rounded-xl hover:bg-purple-700 transition-colors"
                            >
                                <Download className="w-5 h-5" />
                                Download File
                            </a>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default FilePreviewModal;
