<?php
/**
 * Ephemera DirectAdmin Provisioning Script
 * Handles auto-provisioning via hooks
 */

require_once __DIR__ . '/EphemeraAPI.php';

$action = $argv[1] ?? '';
$username = $argv[2] ?? '';
$domain = $argv[3] ?? '';
$email = $argv[4] ?? '';

$api = new EphemeraAPI();
$config = $api->loadConfig();

// Check if auto-provision is enabled
if (empty($config['auto_provision'])) {
    exit(0);
}

function logEvent($message) {
    $timestamp = date('Y-m-d H:i:s');
    file_put_contents('/var/log/ephemera.log', "[{$timestamp}] {$message}\n", FILE_APPEND);
}

if ($action === 'create' && $username && $domain) {
    logEvent("Provisioning email for user: {$username}, domain: {$domain}");

    $result = $api->createTenant([
        'externalId' => "da-{$username}",
        'customerEmail' => $email ?: "{$username}@{$domain}",
        'customerName' => $username,
        'plan' => $config['default_plan'] ?? 'LITE',
    ]);

    if ($result['success']) {
        $tenantId = $result['data']['tenant']['id'];
        $api->saveUserTenantId($username, $tenantId);

        // Add domain
        $api->addDomain($tenantId, $domain);

        logEvent("Created tenant {$tenantId} for {$username}");
    } else {
        logEvent("Failed to create tenant for {$username}: " . ($result['error'] ?? 'Unknown error'));
    }
}

if ($action === 'delete' && $username) {
    $tenantId = $api->getUserTenantId($username);

    if ($tenantId) {
        logEvent("Terminating tenant for user: {$username}");

        $result = $api->terminateTenant($tenantId);

        if ($result['success']) {
            $api->deleteUserTenantId($username);
            logEvent("Terminated tenant {$tenantId} for {$username}");
        } else {
            logEvent("Failed to terminate tenant for {$username}: " . ($result['error'] ?? 'Unknown error'));
        }
    }
}

if ($action === 'suspend' && $username) {
    $tenantId = $api->getUserTenantId($username);

    if ($tenantId) {
        $result = $api->suspendTenant($tenantId);
        logEvent($result['success'] ? "Suspended tenant {$tenantId}" : "Failed to suspend: " . $result['error']);
    }
}

if ($action === 'unsuspend' && $username) {
    $tenantId = $api->getUserTenantId($username);

    if ($tenantId) {
        $result = $api->unsuspendTenant($tenantId);
        logEvent($result['success'] ? "Unsuspended tenant {$tenantId}" : "Failed to unsuspend: " . $result['error']);
    }
}
