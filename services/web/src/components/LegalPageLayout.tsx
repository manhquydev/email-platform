import { useEffect } from 'react';
import type { ReactNode } from 'react';

interface TOCItem {
    id: string;
    label: string;
}

interface LegalPageLayoutProps {
    title: string;
    description?: string;
    lastUpdated: string;
    tocItems: TOCItem[];
    children: ReactNode;
}

export function LegalPageLayout({ title, description, lastUpdated, tocItems, children }: LegalPageLayoutProps) {

    // Handle scroll spy for active TOC item
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        const id = entry.target.getAttribute('id');
                        if (id) {
                            document.querySelectorAll('.toc-link').forEach((link) => {
                                link.classList.remove('text-primary', 'font-semibold');
                                link.classList.add('text-slate-400');
                            });
                            const activeLink = document.querySelector(`.toc-link[href="#${id}"]`);
                            if (activeLink) {
                                activeLink.classList.remove('text-slate-400');
                                activeLink.classList.add('text-primary', 'font-semibold');
                            }
                        }
                    }
                });
            },
            { rootMargin: '-100px 0px -60% 0px' }
        );

        tocItems.forEach((item) => {
            const element = document.getElementById(item.id);
            if (element) observer.observe(element);
        });

        return () => observer.disconnect();
    }, [tocItems]);

    return (
        <div className="relative min-h-screen pt-24 pb-20">
            {/* Nebula Background Effects (Localized to this page if needed, or rely on global) */}
            {/* We'll rely on PublicLayout for the main bg, but we can add specific blobs if needed */}

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="text-center mb-16 animate-fade-in-up">
                    <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white via-blue-100 to-blue-200 bg-clip-text text-transparent">
                        {title}
                    </h1>
                    {description && (
                        <p className="text-[#9090cb] text-lg max-w-2xl mx-auto">
                            {description}
                        </p>
                    )}
                    <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-sm text-slate-400">
                        <span>Last Updated: {lastUpdated}</span>
                    </div>
                </div>

                <div className="flex flex-col lg:flex-row gap-8 lg:gap-16">
                    {/* Sticky Sidebar (TOC) */}
                    <aside className="hidden lg:block w-64 flex-shrink-0 animate-fade-in-left">
                        <div className="sticky top-32">
                            <h3 className="text-white font-semibold mb-4 text-lg">Nội dung</h3>
                            <nav className="flex flex-col gap-3 relative border-l border-white/10 pl-4">
                                {tocItems.map((item) => (
                                    <a
                                        key={item.id}
                                        href={`#${item.id}`}
                                        className="toc-link text-slate-400 hover:text-white transition-colors text-sm py-1 block"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth' });
                                        }}
                                    >
                                        {item.label}
                                    </a>
                                ))}
                            </nav>
                        </div>
                    </aside>

                    {/* Main Content Content */}
                    <div className="flex-1 min-w-0 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                        <div className="glass-card p-8 md:p-12 relative overflow-hidden rounded-2xl border border-white/10 bg-black/20 backdrop-blur-xl">
                            {/* Top Gradient Line */}
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50"></div>

                            <div className="prose prose-invert prose-lg max-w-none prose-headings:scroll-mt-32 prose-headings:font-display prose-headings:font-bold prose-headings:text-white prose-p:text-slate-300 prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-strong:text-white prose-ul:text-slate-300 prose-li:marker:text-primary">
                                {children}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Add CSS module or style tag if needed for specific table styling etc, but prose covers most.
