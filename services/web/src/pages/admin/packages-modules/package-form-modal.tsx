/**
 * Package Form Modal component
 * Handles create and edit package forms
 */
import { PremiumToggle } from "../../../components/admin/AdminUIComponents";
import type { PackageFormData, PlanFeature } from "./types";

export interface PackageFormModalProps {
    isOpen: boolean;
    editingId: string | null;
    formData: PackageFormData;
    setFormData: React.Dispatch<React.SetStateAction<PackageFormData>>;
    newFeatureText: string;
    setNewFeatureText: (text: string) => void;
    newFeatureIncluded: boolean;
    setNewFeatureIncluded: (included: boolean) => void;
    onClose: () => void;
    onSubmit: () => void;
    onAddFeature: () => void;
    onRemoveFeature: (index: number) => void;
}

export function PackageFormModal({
    isOpen,
    editingId,
    formData,
    setFormData,
    newFeatureText,
    setNewFeatureText,
    newFeatureIncluded,
    setNewFeatureIncluded,
    onClose,
    onSubmit,
    onAddFeature,
    onRemoveFeature
}: PackageFormModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200 dark:border-slate-800 my-8">
                {/* Header */}
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                    <h3 className="font-semibold">{editingId ? "Cập nhật gói dịch vụ" : "Tạo gói dịch vụ mới"}</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                {/* Form Content */}
                <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                    <BasicInfoSection formData={formData} setFormData={setFormData} />
                    <PricingSection formData={formData} setFormData={setFormData} />
                    <TimeBasedSection formData={formData} setFormData={setFormData} />
                    <DisplayConfigSection
                        formData={formData}
                        setFormData={setFormData}
                        newFeatureText={newFeatureText}
                        setNewFeatureText={setNewFeatureText}
                        newFeatureIncluded={newFeatureIncluded}
                        setNewFeatureIncluded={setNewFeatureIncluded}
                        onAddFeature={onAddFeature}
                        onRemoveFeature={onRemoveFeature}
                    />
                    <StripeConfigSection formData={formData} setFormData={setFormData} />
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                    <button onClick={onClose} className="btn btn-secondary px-4">Hủy</button>
                    <button onClick={onSubmit} className="btn btn-primary px-4">{editingId ? "Cập nhật" : "Tạo gói"}</button>
                </div>
            </div>
        </div>
    );
}

// Sub-components for form sections
interface FormSectionProps {
    formData: PackageFormData;
    setFormData: React.Dispatch<React.SetStateAction<PackageFormData>>;
}

function BasicInfoSection({ formData, setFormData }: FormSectionProps) {
    return (
        <>
            <div className="flex justify-between items-start gap-4">
                <div className="flex-1">
                    <label className="block text-sm font-medium mb-1">Tên gói</label>
                    <input
                        className="input-nebula w-full"
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Ví dụ: Gói Premium 1 Tháng"
                    />
                </div>
                <div className="mt-6">
                    <PremiumToggle
                        label="Kích hoạt"
                        checked={formData.isActive}
                        onChange={checked => setFormData({ ...formData, isActive: checked })}
                    />
                </div>
            </div>
            <div>
                <label className="block text-sm font-medium mb-1">Mô tả</label>
                <textarea
                    className="input-nebula w-full h-20"
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                />
            </div>
        </>
    );
}

function PricingSection({ formData, setFormData }: FormSectionProps) {
    return (
        <div className="grid grid-cols-2 gap-4">
            <div>
                <label className="block text-sm font-medium mb-1">Giá (VND)</label>
                <input
                    type="number"
                    className="input-nebula w-full"
                    value={formData.price}
                    onChange={e => setFormData({ ...formData, price: Number(e.target.value) })}
                />
            </div>
            <div>
                <label className="block text-sm font-medium mb-1">Loại gói</label>
                <input
                    className="input-nebula w-full bg-slate-100 dark:bg-slate-800"
                    value="Theo thời gian"
                    disabled
                />
                <input type="hidden" value="TIME_BASED" />
            </div>
        </div>
    );
}

function TimeBasedSection({ formData, setFormData }: FormSectionProps) {
    return (
        <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg">
            <div>
                <label className="block text-xs font-medium mb-1 text-muted">Thời hạn (ngày)</label>
                <input
                    type="number"
                    className="input-nebula w-full"
                    value={formData.durationDays}
                    onChange={e => setFormData({ ...formData, durationDays: Number(e.target.value) })}
                />
                <p className="text-[10px] text-muted mt-1">≤45 ngày = Hàng tháng, &gt;45 = Hàng năm</p>
            </div>
            <div>
                <label className="block text-xs font-medium mb-1 text-muted">Cấp độ mục tiêu</label>
                <select
                    className="input-nebula w-full"
                    value={formData.targetTier}
                    onChange={e => setFormData({ ...formData, targetTier: e.target.value })}
                >
                    <option value="FREE">FREE</option>
                    <option value="STARTER">STARTER</option>
                    <option value="PROFESSIONAL">PROFESSIONAL</option>
                    <option value="BUSINESS">BUSINESS</option>
                    <option value="ENTERPRISE">ENTERPRISE</option>
                </select>
            </div>
        </div>
    );
}

interface DisplayConfigSectionProps extends FormSectionProps {
    newFeatureText: string;
    setNewFeatureText: (text: string) => void;
    newFeatureIncluded: boolean;
    setNewFeatureIncluded: (included: boolean) => void;
    onAddFeature: () => void;
    onRemoveFeature: (index: number) => void;
}

function DisplayConfigSection({
    formData, setFormData, newFeatureText, setNewFeatureText,
    newFeatureIncluded, setNewFeatureIncluded, onAddFeature, onRemoveFeature
}: DisplayConfigSectionProps) {
    return (
        <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-lg">palette</span>
                Cấu hình hiển thị
            </h4>

            <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                    <label className="block text-xs font-medium mb-1 text-muted">Thứ tự hiển thị</label>
                    <input
                        type="number"
                        className="input-nebula w-full"
                        value={formData.displayOrder}
                        onChange={e => setFormData({ ...formData, displayOrder: Number(e.target.value) })}
                        placeholder="0"
                    />
                </div>
                <div>
                    <label className="block text-xs font-medium mb-1 text-muted">Badge (nhãn)</label>
                    <input
                        className="input-nebula w-full"
                        value={formData.badge}
                        onChange={e => setFormData({ ...formData, badge: e.target.value })}
                        placeholder="KHUYÊN DÙNG"
                    />
                </div>
                <div className="flex items-end pb-1">
                    <PremiumToggle
                        label="Khuyên dùng (★)"
                        checked={formData.recommended}
                        onChange={checked => setFormData({ ...formData, recommended: checked })}
                    />
                </div>
            </div>

            {/* Features List */}
            <FeaturesEditor
                features={formData.features}
                newFeatureText={newFeatureText}
                setNewFeatureText={setNewFeatureText}
                newFeatureIncluded={newFeatureIncluded}
                setNewFeatureIncluded={setNewFeatureIncluded}
                onAddFeature={onAddFeature}
                onRemoveFeature={onRemoveFeature}
            />
        </div>
    );
}

interface FeaturesEditorProps {
    features: PlanFeature[];
    newFeatureText: string;
    setNewFeatureText: (text: string) => void;
    newFeatureIncluded: boolean;
    setNewFeatureIncluded: (included: boolean) => void;
    onAddFeature: () => void;
    onRemoveFeature: (index: number) => void;
}

function FeaturesEditor({
    features, newFeatureText, setNewFeatureText,
    newFeatureIncluded, setNewFeatureIncluded, onAddFeature, onRemoveFeature
}: FeaturesEditorProps) {
    return (
        <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg">
            <label className="block text-xs font-medium mb-2 text-muted">Danh sách tính năng</label>
            <div className="space-y-2 mb-3">
                {features.map((feature, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm">
                        <span className={`w-5 h-5 flex items-center justify-center rounded ${feature.included ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                            {feature.included ? '✓' : '✕'}
                        </span>
                        <span className="flex-1">{feature.text}</span>
                        <button onClick={() => onRemoveFeature(idx)} className="text-red-500 hover:text-red-700">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                ))}
            </div>
            <div className="flex gap-2">
                <input
                    className="input-nebula flex-1 text-sm"
                    value={newFeatureText}
                    onChange={e => setNewFeatureText(e.target.value)}
                    placeholder="Thêm tính năng..."
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), onAddFeature())}
                />
                <select
                    className="input-nebula w-24 text-sm"
                    value={newFeatureIncluded ? 'yes' : 'no'}
                    onChange={e => setNewFeatureIncluded(e.target.value === 'yes')}
                >
                    <option value="yes">Có ✓</option>
                    <option value="no">Không ✕</option>
                </select>
                <button onClick={onAddFeature} className="btn btn-secondary px-3 text-sm">Thêm</button>
            </div>
            <p className="text-[10px] text-muted mt-2">Nếu không thêm tính năng, hệ thống sẽ dùng mặc định theo tier</p>
        </div>
    );
}

function StripeConfigSection({ formData, setFormData }: FormSectionProps) {
    return (
        <div className="grid grid-cols-2 gap-4 border-t border-slate-100 dark:border-slate-800 pt-4">
            <div className="col-span-2">
                <label className="block text-sm font-medium mb-1 flex items-center gap-1">
                    Stripe Price ID
                    <span className="text-[10px] bg-blue-100 text-blue-600 px-1 rounded">Required for Stripe</span>
                </label>
                <input
                    className="input-nebula w-full font-mono text-xs"
                    value={formData.stripePriceId}
                    onChange={e => setFormData({ ...formData, stripePriceId: e.target.value })}
                    placeholder="price_..."
                />
            </div>
            <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Stripe Product ID (Optional)</label>
                <input
                    className="input-nebula w-full font-mono text-xs"
                    value={formData.stripeProductId}
                    onChange={e => setFormData({ ...formData, stripeProductId: e.target.value })}
                    placeholder="prod_..."
                />
            </div>
        </div>
    );
}
