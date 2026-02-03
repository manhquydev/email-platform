/**
 * Docs - API documentation page with sidebar navigation
 * Redesigned with Glassmorphism + Search-first UX pattern
 */
import { Link, useSearchParams } from "react-router-dom";
import { useState, useEffect } from "react";
import {
    type DocSection,
    DOC_SECTIONS,
    QuickstartSection,
    ApiReferenceSection,
    WebhooksSection,
    SdksSection,
    DocsSearchBar,
    DocsSidebar
} from "./docs-modules";

export function Docs() {
    const [searchParams, setSearchParams] = useSearchParams();
    const initialSection = (searchParams.get("section") as DocSection) || "quickstart";
    const [activeSection, setActiveSection] = useState<DocSection>(initialSection);
    const [searchQuery, setSearchQuery] = useState("");
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // Sync URL params with active section
    useEffect(() => {
        const section = searchParams.get("section") as DocSection;
        if (section && ["quickstart", "api", "webhooks", "sdks"].includes(section)) {
            setActiveSection(section);
        }
    }, [searchParams]);

    const handleSectionChange = (section: DocSection) => {
        setActiveSection(section);
        setSearchParams({ section });
        setSidebarOpen(false);
    };

    return (
        <div className="min-h-screen bg-[#0F172A] relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-purple-500/10 rounded-full blur-[100px] pointer-events-none" />

            {/* Header */}
            <div className="pt-28 pb-8 relative z-10">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-8">
                        <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-400 border border-blue-500/30 mb-6">
                            <span className="material-symbols-outlined text-sm">menu_book</span>
                            Developer Hub
                        </span>
                        <h1 className="text-4xl md:text-5xl font-bold text-[#F1F5F9] mb-4 tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                            Tài Liệu API
                        </h1>
                        <p className="text-lg text-slate-400 max-w-2xl mx-auto" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                            Hướng dẫn tích hợp, API reference, và các ví dụ code để bắt đầu xây dựng với Ephemera.
                        </p>
                    </div>

                    {/* Search Bar */}
                    <DocsSearchBar value={searchQuery} onChange={setSearchQuery} />
                </div>
            </div>

            {/* Main Content with Sidebar */}
            <div className="max-w-7xl mx-auto px-6 pb-20 relative z-10">
                <div className="flex gap-8">
                    {/* Mobile menu toggle */}
                    <button
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="lg:hidden fixed bottom-6 right-6 z-50 w-14 h-14 bg-[#3B82F6] rounded-full flex items-center justify-center shadow-lg cursor-pointer"
                    >
                        <span className="material-symbols-outlined text-white">
                            {sidebarOpen ? "close" : "menu"}
                        </span>
                    </button>

                    {/* Sidebar */}
                    <DocsSidebar
                        activeSection={activeSection}
                        onSectionChange={handleSectionChange}
                        isOpen={sidebarOpen}
                    />

                    {/* Content Area */}
                    <div className="flex-1 min-w-0">
                        {/* Breadcrumb */}
                        <div className="flex items-center gap-2 text-sm text-slate-500 mb-6">
                            <Link to="/api" className="hover:text-slate-300 transition-colors">API</Link>
                            <span className="material-symbols-outlined text-xs">chevron_right</span>
                            <span className="text-slate-300">
                                {DOC_SECTIONS.find(s => s.id === activeSection)?.label}
                            </span>
                        </div>

                        {/* Section Content */}
                        <div className="animate-fade-in">
                            {activeSection === "quickstart" && <QuickstartSection />}
                            {activeSection === "api" && <ApiReferenceSection />}
                            {activeSection === "webhooks" && <WebhooksSection />}
                            {activeSection === "sdks" && <SdksSection />}
                        </div>

                        {/* Footer CTA */}
                        <div className="mt-16 p-6 bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl">
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                <div>
                                    <h3 className="text-lg font-semibold text-[#F1F5F9] mb-1">Cần hỗ trợ thêm?</h3>
                                    <p className="text-sm text-slate-400">Liên hệ với đội ngũ hỗ trợ hoặc xem thêm trên GitHub.</p>
                                </div>
                                <div className="flex gap-3">
                                    <Link
                                        to="/support"
                                        className="flex items-center gap-2 px-4 py-2 bg-white/10 text-[#F1F5F9] rounded-xl hover:bg-white/20 transition-colors cursor-pointer"
                                    >
                                        <span className="material-symbols-outlined text-lg">support_agent</span>
                                        Hỗ trợ
                                    </Link>
                                    <a
                                        href="https://github.com"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 px-4 py-2 bg-white/10 text-[#F1F5F9] rounded-xl hover:bg-white/20 transition-colors cursor-pointer"
                                    >
                                        <span className="material-symbols-outlined text-lg">code</span>
                                        GitHub
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
