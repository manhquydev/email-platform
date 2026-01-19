/**
 * QuickGenerateCard - Quick email generation widget
 * Modules extracted to quick-generate-card-modules/
 * Following Vercel React Best Practices: bundle-barrel-imports, rerender-memo
 */
import {
    type QuickGenerateCardProps,
    useQuickGenerate,
    NoDomainState,
    GeneratedEmailDisplay,
    DomainSelector,
    TtlSelector,
    GenerateButton
} from "./quick-generate-card-modules";

export function QuickGenerateCard({ domains, token, onInboxCreated }: QuickGenerateCardProps) {
    const {
        loading,
        generatedEmail,
        ttlMs,
        setTtlMs,
        copied,
        verifiedDomains,
        activeDomainId,
        activeDomain,
        setSelectedDomainId,
        handleGenerate,
        handleCopy,
    } = useQuickGenerate({ domains, token, onInboxCreated });

    if (verifiedDomains.length === 0) {
        return <NoDomainState />;
    }

    return (
        <div className="bg-surface-glass border border-white/10 rounded-2xl p-5 shadow-xl backdrop-blur-md relative overflow-hidden group">
            {/* Glow Effect */}
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/20 rounded-full blur-3xl group-hover:bg-primary/30 transition-colors" />

            <div className="flex items-center gap-2 mb-4 relative z-10">
                <span className="text-xl">⚡</span>
                <span className="font-bold text-white tracking-wide">Tạo email nhanh</span>
            </div>

            {generatedEmail ? (
                <GeneratedEmailDisplay
                    email={generatedEmail}
                    copied={copied}
                    onCopy={handleCopy}
                    onRegenerate={handleGenerate}
                    loading={loading}
                />
            ) : (
                <div className="space-y-4 relative z-10">
                    <DomainSelector
                        domains={verifiedDomains}
                        value={activeDomainId}
                        onChange={setSelectedDomainId}
                    />
                    <TtlSelector value={ttlMs} onChange={setTtlMs} />
                    <GenerateButton
                        onClick={handleGenerate}
                        disabled={loading || !activeDomain}
                        loading={loading}
                    />
                </div>
            )}
        </div>
    );
}
