import { Cloud, Shield, Zap } from "lucide-react";
import { Link } from "react-router-dom";

const Hero = () => {
    return (
        <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 selection:bg-purple-500 selection:text-white">
            <nav className="flex items-center justify-between p-6 max-w-7xl mx-auto border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-2">
                    <Cloud className="w-8 h-8 text-purple-600" />
                    <span className="text-xl font-bold tracking-tight">CloudDrive</span>
                </div>
                <div className="flex gap-4">
                    <Link
                        to="/login"
                        className="px-4 py-2 font-medium hover:text-purple-600 transition-colors"
                    >
                        Log in
                    </Link>
                    <Link
                        to="/signup"
                        className="px-4 py-2 font-medium bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors shadow-lg shadow-purple-500/30"
                    >
                        Sign up
                    </Link>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto px-6 py-24 flex flex-col items-center text-center">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-50 dark:bg-purple-500/10 text-purple-600 font-medium text-sm mb-8 border border-purple-100 dark:border-purple-500/20">
                    <span className="flex w-2 h-2 rounded-full bg-purple-600 animate-pulse"></span>
                    Now supporting large file uploads
                </div>

                <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight max-w-4xl leading-tight mb-6">
                    Secure, fast, and simple{" "}
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-blue-600">
                        file storage
                    </span>
                </h1>

                <p className="text-xl text-gray-500 dark:text-gray-400 max-w-2xl mb-10 leading-relaxed">
                    Store, manage, and download your files from anywhere. Designed for
                    performance with direct-to-S3 streaming.
                </p>

                <div className="flex gap-4 mb-24">
                    <Link
                        to="/signup"
                        className="px-8 py-4 text-lg font-semibold bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl hover:scale-105 transition-transform shadow-xl"
                    >
                        Get Started for Free
                    </Link>
                </div>

                <div className="grid md:grid-cols-3 gap-8 text-left w-full max-w-5xl">
                    <FeatureCard
                        icon={<Zap className="w-6 h-6 text-yellow-500" />}
                        title="Lightning Fast"
                        description="Direct-to-S3 streaming ensures your files upload without server buffering delays."
                    />
                    <FeatureCard
                        icon={<Shield className="w-6 h-6 text-green-500" />}
                        title="Secure Storage"
                        description="Your files are stored securely in AWS S3 and accessed via signed URLs."
                    />
                    <FeatureCard
                        icon={<Cloud className="w-6 h-6 text-blue-500" />}
                        title="Access Anywhere"
                        description="Manage and download your personal files from any device, anywhere."
                    />
                </div>
            </main>
        </div>
    );
};

const FeatureCard = ({ icon, title, description }) => (
    <div className="p-6 rounded-2xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 hover:border-purple-500/50 transition-colors group">
        <div className="w-12 h-12 rounded-lg bg-white dark:bg-gray-800 flex items-center justify-center mb-4 shadow-sm group-hover:scale-110 transition-transform">
            {icon}
        </div>
        <h3 className="text-xl font-bold mb-2">{title}</h3>
        <p className="text-gray-500 dark:text-gray-400 leading-relaxed">{description}</p>
    </div>
);

export default Hero;
