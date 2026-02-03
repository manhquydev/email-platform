/**
 * API - Developer API documentation landing page
 * Redesigned with Glassmorphism + Search-first UX pattern
 */
import { useState } from "react";
import { Link } from "react-router-dom";
import {
    ENDPOINTS,
    CodeExample,
    APIFeatures,
    EndpointCard,
    AuthenticationSection,
    WebhookSection,
    SearchBar,
    QuickActionCards
} from "./api-modules";

export function API() {
    const [searchQuery, setSearchQuery] = useState("");

    // Filter endpoints based on search
    const filteredEndpoints = ENDPOINTS.filter(ep =>
        ep.method.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ep.path.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ep.description.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-[#0F172A] relative overflow-hidden">
            {/* Background Effects - Glassmorphism */}
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-purple-500/10 rounded-full blur-[100px] pointer-events-none" />

            {/* Hero Section with Search */}
            <div className="pt-28 pb-16 relative z-10">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-12">
                        <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-400 border border-blue-500/30 mb-6">
                            <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                            Developer First
                        </span>
                        <h1 className="text-4xl md:text-6xl font-bold text-[#F1F5F9] mb-6 tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                            REST API cho Tự Động Hóa
                        </h1>
                        <p className="text-lg text-slate-400 max-w-2xl mx-auto font-light leading-relaxed" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                            Tích hợp Ephemera vào CI/CD pipeline, test suite, hoặc ứng dụng của bạn với REST API đầy đủ tính năng.
                        </p>
                    </div>

                    {/* Search Bar - Prominent */}
                    <SearchBar value={searchQuery} onChange={setSearchQuery} />

                    {/* Quick Actions */}
                    <QuickActionCards />
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-6 pb-20 relative z-10">
                {/* Code Example + Features Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start mb-24">
                    <div className="order-2 lg:order-1">
                        <CodeExample />
                    </div>
                    <div className="order-1 lg:order-2">
                        <APIFeatures />
                    </div>
                </div>

                {/* Endpoints Section */}
                <div className="mb-20">
                    <div className="flex items-center justify-between mb-8">
                        <h2 className="text-2xl font-bold text-[#F1F5F9]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                            Các Endpoint Chính
                        </h2>
                        {searchQuery && (
                            <span className="text-sm text-slate-500">
                                {filteredEndpoints.length} kết quả
                            </span>
                        )}
                    </div>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredEndpoints.map((endpoint, index) => (
                            <EndpointCard key={index} endpoint={endpoint} />
                        ))}
                    </div>
                    {filteredEndpoints.length === 0 && (
                        <div className="text-center py-12 text-slate-500">
                            Không tìm thấy endpoint nào phù hợp với "{searchQuery}"
                        </div>
                    )}
                </div>

                <AuthenticationSection />
                <WebhookSection />

                {/* CTA Section */}
                <div className="text-center pt-8">
                    <div className="inline-flex items-center gap-4 p-1 bg-white/5 rounded-2xl backdrop-blur-sm border border-white/10">
                        <Link
                            to="/docs"
                            className="flex items-center gap-2 px-6 py-3 bg-[#3B82F6] text-white rounded-xl font-semibold hover:bg-[#2563EB] transition-colors cursor-pointer"
                        >
                            <span className="material-symbols-outlined text-lg">description</span>
                            Xem Tài Liệu Đầy Đủ
                        </Link>
                        <Link
                            to="/app/settings?tab=developer"
                            className="flex items-center gap-2 px-6 py-3 text-slate-300 hover:text-white transition-colors cursor-pointer"
                        >
                            <span className="material-symbols-outlined text-lg">key</span>
                            Lấy API Key
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
