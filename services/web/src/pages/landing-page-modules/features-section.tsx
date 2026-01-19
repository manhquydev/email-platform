/**
 * Features Section - Security feature cards grid
 */
import { features, type Feature } from "./landing-page-data";

export function FeaturesSection() {
    return (
        <section id="features" className="relative py-24 bg-[#050510] z-10">
            <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-16">
                    <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Tính Năng Bảo Mật Cao Cấp</h2>
                    <p className="text-[var(--nebula-text-secondary)] max-w-2xl mx-auto">
                        Xây dựng cho bảo mật và ẩn danh với công nghệ hiện đại. Chúng tôi không chỉ ẩn dữ liệu của bạn; chúng tôi làm nó biến mất.
                    </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {features.map((feature, i) => (
                        <FeatureCard key={i} feature={feature} index={i} />
                    ))}
                </div>
            </div>
        </section>
    );
}

/** Individual feature card */
function FeatureCard({ feature, index }: { feature: Feature; index: number }) {
    const colorClasses = [
        'bg-blue-500/20 text-blue-400',
        'bg-purple-500/20 text-purple-400',
        'bg-green-500/20 text-green-400',
        'bg-pink-500/20 text-pink-400'
    ];

    return (
        <div className="group bg-[var(--nebula-surface)] backdrop-blur-md border border-[var(--nebula-border)] p-6 rounded-xl hover:bg-white/5 transition-all duration-300 hover:-translate-y-1">
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform ${colorClasses[index % 4]}`}>
                <span className="material-symbols-outlined">{feature.icon}</span>
            </div>
            <h3 className="text-lg font-bold text-white mb-2">{feature.title}</h3>
            <p className="text-sm text-[var(--nebula-text-secondary)] leading-relaxed">{feature.description}</p>
        </div>
    );
}
