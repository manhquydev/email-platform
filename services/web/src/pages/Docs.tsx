import { Link } from "react-router-dom";
import { GlassCard } from "../components/ui/GlassCard";

export function Docs() {
    return (
        <div className="min-h-screen pt-24 pb-20 neo-mesh-bg text-white flex flex-col items-center px-4">
            <div className="max-w-4xl w-full">
                <div className="text-center mb-16 animate-fade-in-up">
                    <span className="inline-block px-3 py-1 rounded bg-blue-500/20 text-blue-300 text-sm font-bold mb-4 border border-blue-500/30">DEVELOPER HUB</span>
                    <h1 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-blue-200 via-white to-blue-200 bg-clip-text text-transparent">
                        Tài Liệu
                    </h1>
                    <p className="text-[#9090cb] text-lg max-w-2xl mx-auto">
                        Hướng dẫn tích hợp, API reference, và các ví dụ code để bạn bắt đầu xây dựng với Ephemera.
                    </p>
                </div>

                <div className="grid md:grid-cols-2 gap-6 animate-fade-in-up delay-100">
                    <GlassCard className="p-8 hover:bg-white/5 transition-colors group cursor-pointer border-l-4 border-l-blue-500">
                        <h2 className="text-2xl font-bold mb-3 group-hover:text-blue-300 transition-colors">Bắt đầu nhanh</h2>
                        <p className="text-gray-400 mb-4">
                            Tạo inbox đầu tiên của bạn và nhận email đầu tiên trong vòng dưới 2 phút.
                        </p>
                        <div className="flex items-center text-blue-400 font-mono text-sm">
                            <span className="mr-2">Checking prerequisites...</span>
                        </div>
                    </GlassCard>

                    <GlassCard className="p-8 hover:bg-white/5 transition-colors group cursor-pointer border-l-4 border-l-purple-500">
                        <h2 className="text-2xl font-bold mb-3 group-hover:text-purple-300 transition-colors">API Reference</h2>
                        <p className="text-gray-400 mb-4">
                            Tài liệu đầy đủ về các endpoints REST API: Inbox, Messages, Domains.
                        </p>
                        <div className="flex items-center text-purple-400 font-mono text-sm">
                            <span className="mr-2">GET /v1/inbox</span>
                        </div>
                    </GlassCard>

                    <GlassCard className="p-8 hover:bg-white/5 transition-colors group cursor-pointer border-l-4 border-l-green-500">
                        <h2 className="text-2xl font-bold mb-3 group-hover:text-green-300 transition-colors">Webhooks</h2>
                        <p className="text-gray-400 mb-4">
                            Nhận thông báo thời gian thực khi có email mới đến inbox của bạn.
                        </p>
                        <div className="flex items-center text-green-400 font-mono text-sm">
                            <span className="mr-2">Payload verification</span>
                        </div>
                    </GlassCard>

                    <GlassCard className="p-8 hover:bg-white/5 transition-colors group cursor-pointer border-l-4 border-l-orange-500">
                        <h2 className="text-2xl font-bold mb-3 group-hover:text-orange-300 transition-colors">SDKs</h2>
                        <p className="text-gray-400 mb-4">
                            Thư viện chính thức cho Node.js, Python, và Go.
                        </p>
                        <div className="flex items-center text-orange-400 font-mono text-sm">
                            <span className="mr-2">npm install ephemera</span>
                        </div>
                    </GlassCard>
                </div>

                <div className="mt-12 text-center animate-fade-in-up delay-200">
                    <p className="text-gray-500 text-sm">
                        Đang tìm kiếm thêm? <Link to="/support" className="text-blue-400 hover:underline">Liên hệ hỗ trợ kỹ thuật</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
