import { useState, useEffect } from "react";
import { CheckCircle, XCircle, X } from "lucide-react";

let toastId = 0;
let addToastExternal = null;

// Call this from anywhere to show a toast
export const toast = {
    success: (message) => addToastExternal?.({ type: "success", message }),
    error: (message) => addToastExternal?.({ type: "error", message }),
};

const Toast = () => {
    const [toasts, setToasts] = useState([]);

    useEffect(() => {
        addToastExternal = ({ type, message }) => {
            const id = ++toastId;
            setToasts((prev) => [...prev, { id, type, message }]);
            setTimeout(() => {
                setToasts((prev) => prev.filter((t) => t.id !== id));
            }, 4000);
        };
        return () => {
            addToastExternal = null;
        };
    }, []);

    const dismiss = (id) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    };

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 pointer-events-none">
            {toasts.map((t) => (
                <div
                    key={t.id}
                    className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border backdrop-blur-md animate-slide-up
                        ${t.type === "success"
                            ? "bg-green-50/90 dark:bg-green-500/10 border-green-200 dark:border-green-500/20 text-green-800 dark:text-green-300"
                            : "bg-red-50/90 dark:bg-red-500/10 border-red-200 dark:border-red-500/20 text-red-800 dark:text-red-300"
                        }`}
                >
                    {t.type === "success" ? (
                        <CheckCircle className="w-5 h-5 flex-shrink-0" />
                    ) : (
                        <XCircle className="w-5 h-5 flex-shrink-0" />
                    )}
                    <span className="text-sm font-medium">{t.message}</span>
                    <button
                        onClick={() => dismiss(t.id)}
                        className="ml-2 p-0.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            ))}
        </div>
    );
};

export default Toast;
