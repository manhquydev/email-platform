/**
 * DeveloperSettings - API Keys and Webhooks management
 * Modules extracted to developer-settings-modules/
 */
import { useAuth } from "../../context/AuthContext";
import { WebhookLogs } from "./WebhookLogs";
import {
    useDeveloperSettingsData,
    ApiKeysSection,
    WebhooksSection,
    WebhookModal
} from "./developer-settings-modules";

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface DeveloperSettingsProps {}

// eslint-disable-next-line no-empty-pattern
export function DeveloperSettings({}: DeveloperSettingsProps) {
    const { token } = useAuth();

    const {
        keys,
        keysLoading,
        creatingKey,
        newKey,
        handleCreateKey,
        handleDeleteKey,
        copyToClipboard,
        webhooks,
        webhooksLoading,
        isWebhookModalOpen,
        selectedWebhookForLogs,
        newWebhookName,
        setNewWebhookName,
        newWebhookUrl,
        setNewWebhookUrl,
        creatingWebhook,
        openWebhookModal,
        closeWebhookModal,
        handleCreateWebhook,
        handleDeleteWebhook,
        handleTestWebhook,
        setSelectedWebhookForLogs,
        closeWebhookLogs
    } = useDeveloperSettingsData(token);

    return (
        <div className="space-y-6 animate-fade-in-up">
            <div>
                <h2 className="text-3xl font-bold text-semantic-text-main mb-2 tracking-tight">Cài đặt cho nhà phát triển</h2>
                <p className="text-semantic-text-muted font-body">Quản lý API key và Webhook để tích hợp hệ thống.</p>
            </div>

            {/* API Keys Section */}
            <ApiKeysSection
                keys={keys}
                keysLoading={keysLoading}
                creatingKey={creatingKey}
                newKey={newKey}
                onCreateKey={handleCreateKey}
                onDeleteKey={handleDeleteKey}
                onCopy={copyToClipboard}
            />

            {/* Webhooks Section */}
            <WebhooksSection
                webhooks={webhooks}
                webhooksLoading={webhooksLoading}
                onAddWebhook={openWebhookModal}
                onDeleteWebhook={handleDeleteWebhook}
                onTestWebhook={handleTestWebhook}
                onViewLogs={setSelectedWebhookForLogs}
            />

            {/* Create Webhook Modal */}
            {isWebhookModalOpen && (
                <WebhookModal
                    name={newWebhookName}
                    url={newWebhookUrl}
                    creating={creatingWebhook}
                    onNameChange={setNewWebhookName}
                    onUrlChange={setNewWebhookUrl}
                    onSubmit={handleCreateWebhook}
                    onClose={closeWebhookModal}
                />
            )}

            {/* Webhook Logs Modal */}
            {selectedWebhookForLogs && (
                <WebhookLogs
                    webhookId={selectedWebhookForLogs.id}
                    webhookName={selectedWebhookForLogs.name}
                    onClose={closeWebhookLogs}
                />
            )}
        </div>
    );
}
