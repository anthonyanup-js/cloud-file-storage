import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Cloud, ArrowRight, Loader2 } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { toast } from "../components/Toast";

const Signup = () => {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const navigate = useNavigate();
    const { signup, isSigningUp, error, clearError } = useAuthStore();

    const handleSubmit = async (e) => {
        e.preventDefault();
        clearError();

        try {
            await signup({ name, email, password });
            toast.success("Account created successfully!");
            navigate("/dashboard");
        } catch {
            // error is already set in the store
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-4 text-gray-900 dark:text-gray-100">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <Link
                        to="/"
                        className="inline-flex items-center gap-2 mb-6 hover:opacity-80 transition-opacity"
                    >
                        <Cloud className="w-10 h-10 text-purple-600" />
                        <span className="text-2xl font-bold tracking-tight">CloudDrive</span>
                    </Link>
                    <h1 className="text-3xl font-bold mb-2">Create an account</h1>
                    <p className="text-gray-500 dark:text-gray-400">
                        Start storing your files securely today.
                    </p>
                </div>

                <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl shadow-gray-200/50 dark:shadow-none border border-gray-100 dark:border-gray-800 p-8">
                    {error && (
                        <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 text-sm font-medium border border-red-100 dark:border-red-500/20">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-sm font-medium mb-2">Full name</label>
                            <input
                                type="text"
                                required
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                                placeholder="John Doe"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2">
                                Email address
                            </label>
                            <input
                                type="email"
                                required
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                                placeholder="you@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2">Password</label>
                            <input
                                type="password"
                                required
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isSigningUp}
                            className="w-full py-3 px-4 flex items-center justify-center gap-2 font-medium bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-all shadow-lg shadow-purple-500/30 disabled:opacity-70"
                        >
                            {isSigningUp ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                "Create account"
                            )}
                            {!isSigningUp && <ArrowRight className="w-5 h-5" />}
                        </button>
                    </form>

                    <p className="mt-6 text-center text-gray-500 dark:text-gray-400">
                        Already have an account?{" "}
                        <Link
                            to="/login"
                            className="text-purple-600 hover:text-purple-700 font-medium"
                        >
                            Sign in
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Signup;
