/**
 * Docs - API documentation page with tabbed sections
 * Modules extracted to docs-modules/
 */
import { Link } from "react-router-dom";
import { useState } from "react";
import {
    type DocSection,
    DOC_TABS,
    QuickstartSection,
    ApiReferenceSection,
    WebhooksSection,
    SdksSection
} from "./docs-modules";

export function Docs() {
    const [activeSection, setActiveSection] = useState<DocSection>("quickstart");

    return (
        <div className="min-h-screen pt-24 pb-20 neo-mesh-bg text-white">
            <div className="max-w-7xl mx-auto px-4 lg:px-6">
                {/* Header */}
                <div className="text-center mb-12 animate-fade-in-up">
                    <span className="inline-block px-3 py-1 rounded bg-blue-500/20 text-blue-300 text-sm font-bold mb-4 border border-blue-500/30">
                        DEVELOPER HUB
                    </span>
                    <h1 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-blue-200 via-white to-blue-200 bg-clip-text text-transparent">
                        Tài Liệu API
                    </h1>
                    <p className="text-nebula-text-muted text-lg max-w-2xl mx-auto">
                        Hướng dẫn tích hợp, API reference, và các ví dụ code để bạn bắt đầu xây dựng với Ephemera.
                    </p>
                </div>

                {/* Navigation Tabs */}
                <div className="flex flex-wrap justify-center gap-2 mb-12">
                    {DOC_TABS.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveSection(tab.id as DocSection)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                                activeSection === tab.id
                                    ? "bg-nebula-violet text-white"
                                    : "bg-white/5 text-nebula-text-muted hover:bg-white/10"
                            }`}
                        >
                            <span className="material-symbols-outlined text-sm">{tab.icon}</span>
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content Sections */}
                <div className="max-w-4xl mx-auto">
                    {activeSection === "quickstart" && <QuickstartSection />}
                    {activeSection === "api" && <ApiReferenceSection />}
                    {activeSection === "webhooks" && <WebhooksSection />}
                    {activeSection === "sdks" && <SdksSection />}
                </div>

                {/* Footer CTA */}
                <div className="mt-16 text-center">
                    <p className="text-nebula-text-muted mb-4">
                        Cần hỗ trợ thêm?
                    </p>
                    <div className="flex justify-center gap-4">
                        <Link to="/support" className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors">
                            <span className="material-symbols-outlined text-sm">support_agent</span>
                            Liên hệ hỗ trợ
                        </Link>
                        <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors">
                            <span className="material-symbols-outlined text-sm">code</span>
                            GitHub
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}
