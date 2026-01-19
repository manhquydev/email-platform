/**
 * API - Developer API documentation page
 * Modules extracted to api-modules/
 */
import {
    ENDPOINTS,
    CodeExample,
    APIFeatures,
    EndpointCard,
    AuthenticationSection,
    WebhookSection
} from "./api-modules";

export function API() {
    return (
        <div className="pt-24 min-h-screen bg-[#050510] relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute top-0 right-0 w-1/2 h-full bg-[var(--nebula-violet)]/5 blur-[100px] pointer-events-none"></div>

            <div className="max-w-7xl mx-auto px-6 py-12 z-10 relative">
                <div className="text-center mb-16">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded text-xs font-bold bg-[var(--nebula-violet)]/20 text-[var(--nebula-violet)] uppercase tracking-wider mb-6">
                        Developer First
                    </div>
                    <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
                        API Cho Tự Động Hóa
                    </h1>
                    <p className="text-xl text-[var(--nebula-text-secondary)] max-w-3xl mx-auto font-light">
                        Tích hợp Ephemera vào CI/CD pipeline, test suite, hoặc ứng dụng của bạn với REST API đầy đủ.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-24">
                    <div className="order-2 lg:order-1">
                        <CodeExample />
                    </div>
                    <div className="order-1 lg:order-2">
                        <APIFeatures />
                    </div>
                </div>

                {/* Endpoints Quick Look */}
                <div className="mb-20">
                    <h2 className="text-3xl font-bold text-white mb-8 text-center">Các Endpoint Chính</h2>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {ENDPOINTS.map((endpoint, index) => (
                            <EndpointCard key={index} endpoint={endpoint} />
                        ))}
                    </div>
                </div>

                <AuthenticationSection />
                <WebhookSection />
            </div>
        </div>
    );
}
