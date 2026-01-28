<?php
/**
 * Ephemera Email Hosting - WHMCS Provisioning Module
 *
 * @package    WHMCS
 * @author     Ephemera Email Platform
 * @copyright  2026 Ephemera
 * @version    1.0.0
 */

if (!defined("WHMCS")) {
    die("This file cannot be accessed directly");
}

use WHMCS\Database\Capsule;

require_once __DIR__ . '/lib/EphemeraAPI.php';
require_once __DIR__ . '/lib/EphemeraHelper.php';

/**
 * Module metadata
 */
function ephemera_MetaData()
{
    return [
        'DisplayName' => 'Ephemera Email Hosting',
        'APIVersion' => '1.1',
        'RequiresServer' => true,
        'DefaultNonSSLPort' => '443',
        'DefaultSSLPort' => '443',
        'ServiceSingleSignOnLabel' => 'Login to Webmail',
        'AdminSingleSignOnLabel' => 'Login to Admin Panel',
    ];
}

/**
 * Module configuration options
 */
function ephemera_ConfigOptions()
{
    return [
        'plan' => [
            'FriendlyName' => 'Email Plan',
            'Type' => 'dropdown',
            'Options' => [
                'LITE' => 'Lite (5 mailboxes, 1GB each)',
                'PRO' => 'Pro (Unlimited, 10GB each)',
                'BUSINESS' => 'Business (Unlimited, 50GB each, LDAP)',
            ],
            'Default' => 'LITE',
            'Description' => 'Select the email hosting plan',
        ],
        'max_mailboxes' => [
            'FriendlyName' => 'Max Mailboxes',
            'Type' => 'text',
            'Size' => '10',
            'Default' => '5',
            'Description' => 'Maximum number of mailboxes (0 = unlimited)',
        ],
        'storage_per_mailbox' => [
            'FriendlyName' => 'Storage per Mailbox (GB)',
            'Type' => 'text',
            'Size' => '10',
            'Default' => '1',
            'Description' => 'Storage quota per mailbox in GB',
        ],
        'enable_caldav' => [
            'FriendlyName' => 'Enable CalDAV',
            'Type' => 'yesno',
            'Default' => 'no',
            'Description' => 'Enable calendar sync feature',
        ],
        'enable_carddav' => [
            'FriendlyName' => 'Enable CardDAV',
            'Type' => 'yesno',
            'Default' => 'no',
            'Description' => 'Enable contacts sync feature',
        ],
    ];
}

/**
 * Create new account
 */
function ephemera_CreateAccount(array $params)
{
    try {
        $api = EphemeraHelper::getApi($params);

        $tenant = $api->createTenant([
            'externalId' => 'whmcs-' . $params['serviceid'],
            'customerEmail' => $params['clientsdetails']['email'],
            'customerName' => trim($params['clientsdetails']['firstname'] . ' ' . $params['clientsdetails']['lastname']),
            'plan' => $params['configoption1'],
        ]);

        if (!$tenant['success']) {
            return $tenant['error'];
        }

        $tenantId = $tenant['data']['tenant']['id'];

        // Add domain if provided
        $domain = $params['domain'];
        if ($domain) {
            $api->addDomain($tenantId, $domain);
        }

        // Store tenant ID
        EphemeraHelper::saveTenantId($params['serviceid'], $tenantId);

        logModuleCall('ephemera', __FUNCTION__, $params, $tenant, 'success');
        return 'success';

    } catch (Exception $e) {
        logModuleCall('ephemera', __FUNCTION__, $params, $e->getMessage(), $e->getTraceAsString());
        return $e->getMessage();
    }
}

/**
 * Suspend account
 */
function ephemera_SuspendAccount(array $params)
{
    try {
        $api = EphemeraHelper::getApi($params);
        $tenantId = EphemeraHelper::getTenantId($params['serviceid']);

        if (!$tenantId) {
            return 'Tenant ID not found';
        }

        $result = $api->suspendTenant($tenantId);
        logModuleCall('ephemera', __FUNCTION__, $params, $result, $result['success'] ? 'success' : $result['error']);

        return $result['success'] ? 'success' : $result['error'];

    } catch (Exception $e) {
        logModuleCall('ephemera', __FUNCTION__, $params, $e->getMessage(), $e->getTraceAsString());
        return $e->getMessage();
    }
}

/**
 * Unsuspend account
 */
function ephemera_UnsuspendAccount(array $params)
{
    try {
        $api = EphemeraHelper::getApi($params);
        $tenantId = EphemeraHelper::getTenantId($params['serviceid']);

        if (!$tenantId) {
            return 'Tenant ID not found';
        }

        $result = $api->unsuspendTenant($tenantId);
        logModuleCall('ephemera', __FUNCTION__, $params, $result, $result['success'] ? 'success' : $result['error']);

        return $result['success'] ? 'success' : $result['error'];

    } catch (Exception $e) {
        logModuleCall('ephemera', __FUNCTION__, $params, $e->getMessage(), $e->getTraceAsString());
        return $e->getMessage();
    }
}

/**
 * Terminate account
 */
function ephemera_TerminateAccount(array $params)
{
    try {
        $api = EphemeraHelper::getApi($params);
        $tenantId = EphemeraHelper::getTenantId($params['serviceid']);

        if (!$tenantId) {
            return 'Tenant ID not found';
        }

        $result = $api->terminateTenant($tenantId);

        if ($result['success']) {
            EphemeraHelper::deleteTenantId($params['serviceid']);
        }

        logModuleCall('ephemera', __FUNCTION__, $params, $result, $result['success'] ? 'success' : $result['error']);
        return $result['success'] ? 'success' : $result['error'];

    } catch (Exception $e) {
        logModuleCall('ephemera', __FUNCTION__, $params, $e->getMessage(), $e->getTraceAsString());
        return $e->getMessage();
    }
}

/**
 * Change package/plan
 */
function ephemera_ChangePackage(array $params)
{
    try {
        $api = EphemeraHelper::getApi($params);
        $tenantId = EphemeraHelper::getTenantId($params['serviceid']);

        if (!$tenantId) {
            return 'Tenant ID not found';
        }

        $result = $api->updateTenant($tenantId, [
            'plan' => $params['configoption1'],
            'maxMailboxes' => (int) $params['configoption2'],
            'maxStorageGb' => (int) $params['configoption3'],
        ]);

        logModuleCall('ephemera', __FUNCTION__, $params, $result, $result['success'] ? 'success' : $result['error']);
        return $result['success'] ? 'success' : $result['error'];

    } catch (Exception $e) {
        logModuleCall('ephemera', __FUNCTION__, $params, $e->getMessage(), $e->getTraceAsString());
        return $e->getMessage();
    }
}

/**
 * Test connection to server
 */
function ephemera_TestConnection(array $params)
{
    try {
        $api = EphemeraHelper::getApi($params);
        $result = $api->testConnection();

        if ($result['success']) {
            return ['success' => true, 'message' => 'Connection successful'];
        }

        return ['success' => false, 'message' => $result['error']];

    } catch (Exception $e) {
        logModuleCall('ephemera', __FUNCTION__, $params, $e->getMessage(), $e->getTraceAsString());
        return ['success' => false, 'message' => $e->getMessage()];
    }
}

/**
 * Client area output
 */
function ephemera_ClientArea(array $params)
{
    try {
        $api = EphemeraHelper::getApi($params);
        $tenantId = EphemeraHelper::getTenantId($params['serviceid']);

        if (!$tenantId) {
            return [
                'templateVariables' => [
                    'error' => 'Email service not provisioned yet.',
                ],
            ];
        }

        $mailboxes = $api->listMailboxes($tenantId);
        $usage = $api->getUsage($tenantId);
        $domains = $api->listDomains($tenantId);

        return [
            'tabOverviewReplacementTemplate' => 'templates/overview.tpl',
            'templateVariables' => [
                'tenantId' => $tenantId,
                'serviceid' => $params['serviceid'],
                'mailboxes' => $mailboxes['data']['mailboxes'] ?? [],
                'usage' => $usage['data']['usage']['summary'] ?? [],
                'domains' => $domains['data']['domains'] ?? [],
                'plan' => $params['configoption1'],
                'maxMailboxes' => $params['configoption2'],
                'storagePerMailbox' => $params['configoption3'],
            ],
        ];

    } catch (Exception $e) {
        return [
            'templateVariables' => [
                'error' => $e->getMessage(),
            ],
        ];
    }
}

/**
 * Admin area custom actions
 */
function ephemera_AdminCustomButtonArray()
{
    return [
        'View Details' => 'adminViewDetails',
        'Sync Usage' => 'adminSyncUsage',
    ];
}

function ephemera_adminViewDetails(array $params)
{
    try {
        $api = EphemeraHelper::getApi($params);
        $tenantId = EphemeraHelper::getTenantId($params['serviceid']);

        if (!$tenantId) {
            return 'Tenant ID not found';
        }

        $tenant = $api->getTenant($tenantId);
        return $tenant['success'] ? 'success' : $tenant['error'];

    } catch (Exception $e) {
        return $e->getMessage();
    }
}

function ephemera_adminSyncUsage(array $params)
{
    try {
        $api = EphemeraHelper::getApi($params);
        $tenantId = EphemeraHelper::getTenantId($params['serviceid']);

        if (!$tenantId) {
            return 'Tenant ID not found';
        }

        $usage = $api->getUsage($tenantId);

        if ($usage['success']) {
            $storageBytes = $usage['data']['usage']['summary']['storageBytes'] ?? 0;
            Capsule::table('tblhosting')
                ->where('id', $params['serviceid'])
                ->update([
                    'diskusage' => round($storageBytes / (1024 * 1024)),
                    'lastupdate' => date('Y-m-d H:i:s'),
                ]);

            return 'success';
        }

        return $usage['error'];

    } catch (Exception $e) {
        return $e->getMessage();
    }
}

/**
 * Client area custom actions
 */
function ephemera_ClientAreaCustomButtonArray()
{
    return [
        'Create Mailbox' => 'clientCreateMailbox',
        'Change Password' => 'clientChangePassword',
        'Delete Mailbox' => 'clientDeleteMailbox',
        'Get DNS Records' => 'clientGetDnsRecords',
        'Login to Webmail' => 'clientWebmailSSO',
    ];
}

function ephemera_clientCreateMailbox(array $params)
{
    try {
        $api = EphemeraHelper::getApi($params);
        $tenantId = EphemeraHelper::getTenantId($params['serviceid']);

        if (!$tenantId) {
            header('Content-Type: application/json');
            echo json_encode(['success' => false, 'message' => 'Tenant ID not found']);
            exit;
        }

        $localPart = preg_replace('/[^a-zA-Z0-9._-]/', '', $_POST['localPart'] ?? '');
        $domain = preg_replace('/[^a-zA-Z0-9.-]/', '', $_POST['domain'] ?? '');
        $password = $_POST['password'] ?? '';
        $displayName = htmlspecialchars($_POST['displayName'] ?? '', ENT_QUOTES, 'UTF-8');

        if (!$localPart || !$domain || !$password) {
            header('Content-Type: application/json');
            echo json_encode(['success' => false, 'message' => 'Missing required fields']);
            exit;
        }

        // Validate password strength
        $passwordCheck = EphemeraHelper::validatePassword($password);
        if (!$passwordCheck['valid']) {
            header('Content-Type: application/json');
            echo json_encode(['success' => false, 'message' => $passwordCheck['message']]);
            exit;
        }

        $result = $api->createMailbox($tenantId, [
            'localPart' => $localPart,
            'domain' => $domain,
            'password' => $password,
            'displayName' => $displayName,
            'quotaMb' => (int) $params['configoption3'] * 1024,
        ]);

        header('Content-Type: application/json');
        echo json_encode($result);
        exit;

    } catch (Exception $e) {
        header('Content-Type: application/json');
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        exit;
    }
}

/**
 * Change mailbox password
 */
function ephemera_clientChangePassword(array $params)
{
    try {
        $api = EphemeraHelper::getApi($params);
        $tenantId = EphemeraHelper::getTenantId($params['serviceid']);

        if (!$tenantId) {
            header('Content-Type: application/json');
            echo json_encode(['success' => false, 'message' => 'Tenant ID not found']);
            exit;
        }

        $email = filter_var($_POST['email'] ?? '', FILTER_SANITIZE_EMAIL);
        $password = $_POST['password'] ?? '';

        if (!$email || !$password) {
            header('Content-Type: application/json');
            echo json_encode(['success' => false, 'message' => 'Missing required fields']);
            exit;
        }

        // Validate password strength
        $passwordCheck = EphemeraHelper::validatePassword($password);
        if (!$passwordCheck['valid']) {
            header('Content-Type: application/json');
            echo json_encode(['success' => false, 'message' => $passwordCheck['message']]);
            exit;
        }

        $result = $api->updateMailboxPassword($tenantId, $email, $password);

        header('Content-Type: application/json');
        echo json_encode($result);
        exit;

    } catch (Exception $e) {
        header('Content-Type: application/json');
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        exit;
    }
}

/**
 * Delete mailbox
 */
function ephemera_clientDeleteMailbox(array $params)
{
    try {
        $api = EphemeraHelper::getApi($params);
        $tenantId = EphemeraHelper::getTenantId($params['serviceid']);

        if (!$tenantId) {
            header('Content-Type: application/json');
            echo json_encode(['success' => false, 'message' => 'Tenant ID not found']);
            exit;
        }

        $email = filter_var($_POST['email'] ?? '', FILTER_SANITIZE_EMAIL);

        if (!$email) {
            header('Content-Type: application/json');
            echo json_encode(['success' => false, 'message' => 'Email address required']);
            exit;
        }

        $result = $api->deleteMailbox($tenantId, $email);

        header('Content-Type: application/json');
        echo json_encode($result);
        exit;

    } catch (Exception $e) {
        header('Content-Type: application/json');
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        exit;
    }
}

/**
 * Get DNS records for domain verification
 */
function ephemera_clientGetDnsRecords(array $params)
{
    try {
        $api = EphemeraHelper::getApi($params);
        $tenantId = EphemeraHelper::getTenantId($params['serviceid']);

        if (!$tenantId) {
            header('Content-Type: application/json');
            echo json_encode(['success' => false, 'message' => 'Tenant ID not found']);
            exit;
        }

        $domain = preg_replace('/[^a-zA-Z0-9.-]/', '', $_GET['domain'] ?? '');

        if (!$domain) {
            header('Content-Type: application/json');
            echo json_encode(['success' => false, 'message' => 'Domain required']);
            exit;
        }

        $result = $api->getDnsRecords($tenantId, $domain);

        header('Content-Type: application/json');
        echo json_encode($result);
        exit;

    } catch (Exception $e) {
        header('Content-Type: application/json');
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        exit;
    }
}

function ephemera_clientWebmailSSO(array $params)
{
    try {
        $api = EphemeraHelper::getApi($params);
        $tenantId = EphemeraHelper::getTenantId($params['serviceid']);

        if (!$tenantId) {
            return 'Tenant ID not found';
        }

        $email = $_GET['email'] ?? null;
        $sso = $api->getWebmailSSO($tenantId, $email);

        if ($sso['success']) {
            header('Location: ' . $sso['data']['url']);
            exit;
        }

        return $sso['error'];

    } catch (Exception $e) {
        return $e->getMessage();
    }
}

/**
 * Single Sign-On
 */
function ephemera_ServiceSingleSignOn(array $params)
{
    try {
        $api = EphemeraHelper::getApi($params);
        $tenantId = EphemeraHelper::getTenantId($params['serviceid']);

        if (!$tenantId) {
            return ['success' => false, 'errorMsg' => 'Tenant ID not found'];
        }

        $sso = $api->getWebmailSSO($tenantId);

        if ($sso['success']) {
            return [
                'success' => true,
                'redirectTo' => $sso['data']['url'],
            ];
        }

        return ['success' => false, 'errorMsg' => $sso['error']];

    } catch (Exception $e) {
        return ['success' => false, 'errorMsg' => $e->getMessage()];
    }
}
