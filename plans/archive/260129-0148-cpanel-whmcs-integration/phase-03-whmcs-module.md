---
phase: "03"
title: "WHMCS Provisioning Module"
status: pending
priority: P1
effort: 1.5 weeks
---

# Phase 03: WHMCS Provisioning Module

## Context Links
- [Plan Overview](plan.md)
- [Phase 01: Provider API](phase-01-hosting-provider-api.md)
- [WHMCS Module Development](https://developers.whmcs.com/provisioning-modules/)
- [PolarisMail WHMCS Example](https://www.polarismail.com)

## Overview

Xây dựng WHMCS provisioning module cho phép hosting providers tự động hóa việc bán và quản lý email hosting packages.

## Key Insights

1. **Provisioning Module** - Tự động create/suspend/terminate accounts
2. **Client Area** - Cho end-user quản lý mailboxes
3. **Admin Area** - Cho admin view/manage từ WHMCS
4. **Configurable Options** - Plans, quotas, features

**Nguồn**: [WHMCS Developers](https://developers.whmcs.com), [GitHub Sample Module](https://github.com/WHMCS/sample-provisioning-module)

## File Structure

```
modules/servers/ephemera/
├── ephemera.php              # Main module file
├── lib/
│   ├── EphemeraAPI.php       # API wrapper class
│   └── EphemeraHelper.php    # Helper functions
├── templates/
│   ├── clientarea.tpl        # Client area template
│   └── overview.tpl          # Service overview
├── hooks.php                 # WHMCS hooks
└── logo.png                  # Module logo
```

## Implementation

### Step 1: Main Module File (Day 1-3)

```php
<?php
// modules/servers/ephemera/ephemera.php

if (!defined("WHMCS")) {
    die("This file cannot be accessed directly");
}

use WHMCS\Database\Capsule;

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
        $api = new EphemeraAPI($params['serverusername'], $params['serverpassword'], $params['serverhostname']);

        // Create tenant
        $tenant = $api->createTenant([
            'externalId' => (string) $params['serviceid'],
            'customerEmail' => $params['clientsdetails']['email'],
            'customerName' => $params['clientsdetails']['firstname'] . ' ' . $params['clientsdetails']['lastname'],
            'plan' => $params['configoption1'], // plan
        ]);

        if (!$tenant['success']) {
            return $tenant['error'];
        }

        $tenantId = $tenant['data']['tenant']['id'];

        // Add domain
        $domain = $params['domain'];
        if ($domain) {
            $api->addDomain($tenantId, $domain);
        }

        // Store tenant ID in service custom field
        Capsule::table('tblhosting')
            ->where('id', $params['serviceid'])
            ->update(['customfields' => json_encode(['tenant_id' => $tenantId])]);

        // Store credentials
        $params['model']->serviceProperties->save([
            'Tenant ID' => $tenantId,
            'Domain' => $domain,
        ]);

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
        $api = new EphemeraAPI($params['serverusername'], $params['serverpassword'], $params['serverhostname']);

        $tenantId = ephemera_getTenantId($params);
        if (!$tenantId) {
            return 'Tenant ID not found';
        }

        $result = $api->suspendTenant($tenantId);

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
        $api = new EphemeraAPI($params['serverusername'], $params['serverpassword'], $params['serverhostname']);

        $tenantId = ephemera_getTenantId($params);
        if (!$tenantId) {
            return 'Tenant ID not found';
        }

        $result = $api->unsuspendTenant($tenantId);

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
        $api = new EphemeraAPI($params['serverusername'], $params['serverpassword'], $params['serverhostname']);

        $tenantId = ephemera_getTenantId($params);
        if (!$tenantId) {
            return 'Tenant ID not found';
        }

        $result = $api->terminateTenant($tenantId);

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
        $api = new EphemeraAPI($params['serverusername'], $params['serverpassword'], $params['serverhostname']);

        $tenantId = ephemera_getTenantId($params);
        if (!$tenantId) {
            return 'Tenant ID not found';
        }

        $result = $api->updateTenant($tenantId, [
            'plan' => $params['configoption1'],
            'maxMailboxes' => (int) $params['configoption2'],
            'maxStorageGb' => (int) $params['configoption3'],
        ]);

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
        $api = new EphemeraAPI($params['serverusername'], $params['serverpassword'], $params['serverhostname']);

        $result = $api->testConnection();

        if ($result['success']) {
            return ['success' => true, 'message' => 'Connection successful'];
        } else {
            return ['success' => false, 'message' => $result['error']];
        }

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
        $api = new EphemeraAPI($params['serverusername'], $params['serverpassword'], $params['serverhostname']);

        $tenantId = ephemera_getTenantId($params);

        // Get mailboxes
        $mailboxes = $api->listMailboxes($tenantId);

        // Get usage
        $usage = $api->getUsage($tenantId);

        // Get domains
        $domains = $api->listDomains($tenantId);

        return [
            'tabOverviewReplacementTemplate' => 'templates/overview.tpl',
            'templateVariables' => [
                'tenantId' => $tenantId,
                'mailboxes' => $mailboxes['data'] ?? [],
                'usage' => $usage['data'] ?? [],
                'domains' => $domains['data'] ?? [],
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
        $api = new EphemeraAPI($params['serverusername'], $params['serverpassword'], $params['serverhostname']);

        $tenantId = ephemera_getTenantId($params);
        $tenant = $api->getTenant($tenantId);

        return $tenant['success'] ? 'success' : $tenant['error'];

    } catch (Exception $e) {
        return $e->getMessage();
    }
}

function ephemera_adminSyncUsage(array $params)
{
    try {
        $api = new EphemeraAPI($params['serverusername'], $params['serverpassword'], $params['serverhostname']);

        $tenantId = ephemera_getTenantId($params);
        $usage = $api->getUsage($tenantId);

        if ($usage['success']) {
            // Update WHMCS with usage data
            Capsule::table('tblhosting')
                ->where('id', $params['serviceid'])
                ->update([
                    'diskusage' => $usage['data']['storageBytes'] / (1024 * 1024), // Convert to MB
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
 * Client area actions
 */
function ephemera_ClientAreaCustomButtonArray()
{
    return [
        'Create Mailbox' => 'clientCreateMailbox',
        'Login to Webmail' => 'clientWebmailSSO',
    ];
}

function ephemera_clientCreateMailbox(array $params)
{
    // Handle via AJAX in client area template
    return 'success';
}

function ephemera_clientWebmailSSO(array $params)
{
    try {
        $api = new EphemeraAPI($params['serverusername'], $params['serverpassword'], $params['serverhostname']);

        $tenantId = ephemera_getTenantId($params);

        // Get SSO URL
        $sso = $api->getWebmailSSO($tenantId, $params['username']);

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
        $api = new EphemeraAPI($params['serverusername'], $params['serverpassword'], $params['serverhostname']);

        $tenantId = ephemera_getTenantId($params);
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

/**
 * Helper: Get tenant ID from service
 */
function ephemera_getTenantId(array $params)
{
    $customFields = $params['model']->serviceProperties->get('Tenant ID');
    if ($customFields) {
        return $customFields;
    }

    // Fallback to database
    $service = Capsule::table('tblhosting')
        ->where('id', $params['serviceid'])
        ->first();

    if ($service && $service->customfields) {
        $data = json_decode($service->customfields, true);
        return $data['tenant_id'] ?? null;
    }

    return null;
}
```

### Step 2: API Wrapper Class (Day 3-4)

```php
<?php
// modules/servers/ephemera/lib/EphemeraAPI.php

class EphemeraAPI
{
    private $apiKey;
    private $baseUrl;
    private $timeout = 30;

    public function __construct($apiKey, $password, $hostname)
    {
        $this->apiKey = $apiKey;
        $this->baseUrl = "https://{$hostname}";
    }

    public function testConnection()
    {
        return $this->request('GET', '/v1/provider/me');
    }

    // Tenant operations
    public function createTenant(array $data)
    {
        return $this->request('POST', '/v1/provider/tenants', $data);
    }

    public function getTenant($tenantId)
    {
        return $this->request('GET', "/v1/provider/tenants/{$tenantId}");
    }

    public function updateTenant($tenantId, array $data)
    {
        return $this->request('PATCH', "/v1/provider/tenants/{$tenantId}", $data);
    }

    public function suspendTenant($tenantId)
    {
        return $this->request('POST', "/v1/provider/tenants/{$tenantId}/suspend");
    }

    public function unsuspendTenant($tenantId)
    {
        return $this->request('POST', "/v1/provider/tenants/{$tenantId}/unsuspend");
    }

    public function terminateTenant($tenantId)
    {
        return $this->request('DELETE', "/v1/provider/tenants/{$tenantId}");
    }

    // Domain operations
    public function listDomains($tenantId)
    {
        return $this->request('GET', "/v1/provider/tenants/{$tenantId}/domains");
    }

    public function addDomain($tenantId, $domain)
    {
        return $this->request('POST', "/v1/provider/tenants/{$tenantId}/domains", [
            'domain' => $domain,
        ]);
    }

    public function getDnsRecords($tenantId, $domain)
    {
        return $this->request('GET', "/v1/provider/tenants/{$tenantId}/domains/{$domain}/dns");
    }

    // Mailbox operations
    public function listMailboxes($tenantId)
    {
        return $this->request('GET', "/v1/provider/tenants/{$tenantId}/mailboxes");
    }

    public function createMailbox($tenantId, array $data)
    {
        return $this->request('POST', "/v1/provider/tenants/{$tenantId}/mailboxes", $data);
    }

    public function deleteMailbox($tenantId, $email)
    {
        return $this->request('DELETE', "/v1/provider/tenants/{$tenantId}/mailboxes/{$email}");
    }

    public function updateMailboxPassword($tenantId, $email, $password)
    {
        return $this->request('POST', "/v1/provider/tenants/{$tenantId}/mailboxes/{$email}/password", [
            'password' => $password,
        ]);
    }

    // Usage
    public function getUsage($tenantId)
    {
        return $this->request('GET', "/v1/provider/tenants/{$tenantId}/usage");
    }

    // SSO
    public function getWebmailSSO($tenantId, $email = null)
    {
        $path = "/v1/provider/tenants/{$tenantId}/sso";
        if ($email) {
            $path .= "?email=" . urlencode($email);
        }
        return $this->request('POST', $path);
    }

    private function request($method, $path, $body = null)
    {
        $url = $this->baseUrl . $path;

        $ch = curl_init();

        curl_setopt_array($ch, [
            CURLOPT_URL => $url,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => $this->timeout,
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/json',
                'X-Provider-Key: ' . $this->apiKey,
            ],
        ]);

        switch ($method) {
            case 'POST':
                curl_setopt($ch, CURLOPT_POST, true);
                if ($body) {
                    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body));
                }
                break;
            case 'PATCH':
                curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'PATCH');
                if ($body) {
                    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body));
                }
                break;
            case 'DELETE':
                curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'DELETE');
                break;
        }

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);

        curl_close($ch);

        if ($error) {
            return ['success' => false, 'error' => $error];
        }

        $data = json_decode($response, true);

        if ($httpCode >= 200 && $httpCode < 300) {
            return ['success' => true, 'data' => $data];
        }

        return [
            'success' => false,
            'error' => $data['error'] ?? "HTTP {$httpCode}",
            'data' => $data,
        ];
    }
}
```

### Step 3: Client Area Template (Day 4-5)

```smarty
{* modules/servers/ephemera/templates/overview.tpl *}

<div class="ephemera-client-area">

    {if $error}
        <div class="alert alert-danger">{$error}</div>
    {/if}

    <!-- Usage Summary -->
    <div class="row">
        <div class="col-md-4">
            <div class="panel panel-default">
                <div class="panel-heading">
                    <h3 class="panel-title">Mailboxes</h3>
                </div>
                <div class="panel-body text-center">
                    <h2>{$mailboxes|count} / {if $maxMailboxes == 0}∞{else}{$maxMailboxes}{/if}</h2>
                </div>
            </div>
        </div>
        <div class="col-md-4">
            <div class="panel panel-default">
                <div class="panel-heading">
                    <h3 class="panel-title">Storage Used</h3>
                </div>
                <div class="panel-body text-center">
                    <h2>{$usage.storageUsedMb|default:0} MB</h2>
                </div>
            </div>
        </div>
        <div class="col-md-4">
            <div class="panel panel-default">
                <div class="panel-heading">
                    <h3 class="panel-title">Plan</h3>
                </div>
                <div class="panel-body text-center">
                    <h2>{$plan}</h2>
                </div>
            </div>
        </div>
    </div>

    <!-- Domains -->
    <div class="panel panel-default">
        <div class="panel-heading">
            <h3 class="panel-title">Domains</h3>
        </div>
        <div class="panel-body">
            <table class="table table-striped">
                <thead>
                    <tr>
                        <th>Domain</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {foreach $domains as $domain}
                    <tr>
                        <td>{$domain.domainName}</td>
                        <td>
                            {if $domain.verified}
                                <span class="label label-success">Verified</span>
                            {else}
                                <span class="label label-warning">Pending</span>
                            {/if}
                        </td>
                        <td>
                            {if !$domain.verified}
                                <button class="btn btn-xs btn-info" onclick="showDnsRecords('{$domain.domainName}')">
                                    View DNS Records
                                </button>
                            {/if}
                        </td>
                    </tr>
                    {foreachelse}
                    <tr>
                        <td colspan="3" class="text-center">No domains configured</td>
                    </tr>
                    {/foreach}
                </tbody>
            </table>
        </div>
    </div>

    <!-- Mailboxes -->
    <div class="panel panel-default">
        <div class="panel-heading">
            <h3 class="panel-title">
                Email Accounts
                <button class="btn btn-sm btn-primary pull-right" onclick="showCreateMailbox()">
                    <i class="fa fa-plus"></i> Create Mailbox
                </button>
            </h3>
        </div>
        <div class="panel-body">
            <table class="table table-striped" id="mailbox-table">
                <thead>
                    <tr>
                        <th>Email</th>
                        <th>Display Name</th>
                        <th>Quota</th>
                        <th>Used</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {foreach $mailboxes as $mailbox}
                    <tr>
                        <td>{$mailbox.email}</td>
                        <td>{$mailbox.displayName|default:'-'}</td>
                        <td>{$mailbox.quotaMb} MB</td>
                        <td>{$mailbox.usedMb|default:0} MB</td>
                        <td>
                            <a href="?action=productdetails&id={$serviceid}&modop=custom&a=clientWebmailSSO&email={$mailbox.email|urlencode}"
                               class="btn btn-xs btn-info" target="_blank">
                                <i class="fa fa-envelope"></i> Webmail
                            </a>
                            <button class="btn btn-xs btn-warning" onclick="changePassword('{$mailbox.email}')">
                                <i class="fa fa-key"></i>
                            </button>
                            <button class="btn btn-xs btn-danger" onclick="deleteMailbox('{$mailbox.email}')">
                                <i class="fa fa-trash"></i>
                            </button>
                        </td>
                    </tr>
                    {foreachelse}
                    <tr>
                        <td colspan="5" class="text-center">No mailboxes created yet</td>
                    </tr>
                    {/foreach}
                </tbody>
            </table>
        </div>
    </div>

</div>

<!-- Create Mailbox Modal -->
<div class="modal fade" id="createMailboxModal">
    <div class="modal-dialog">
        <div class="modal-content">
            <div class="modal-header">
                <button type="button" class="close" data-dismiss="modal">&times;</button>
                <h4 class="modal-title">Create Email Account</h4>
            </div>
            <div class="modal-body">
                <form id="createMailboxForm">
                    <div class="form-group">
                        <label>Email Address</label>
                        <div class="input-group">
                            <input type="text" name="localPart" class="form-control" required>
                            <span class="input-group-addon">@</span>
                            <select name="domain" class="form-control">
                                {foreach $domains as $domain}
                                    {if $domain.verified}
                                    <option value="{$domain.domainName}">{$domain.domainName}</option>
                                    {/if}
                                {/foreach}
                            </select>
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Password</label>
                        <input type="password" name="password" class="form-control" required minlength="8">
                    </div>
                    <div class="form-group">
                        <label>Display Name</label>
                        <input type="text" name="displayName" class="form-control">
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-default" data-dismiss="modal">Cancel</button>
                <button type="button" class="btn btn-primary" onclick="submitCreateMailbox()">Create</button>
            </div>
        </div>
    </div>
</div>

<script>
var serviceId = {$serviceid};
var tenantId = '{$tenantId}';

function showCreateMailbox() {
    $('#createMailboxModal').modal('show');
}

function submitCreateMailbox() {
    var form = $('#createMailboxForm');
    var data = {
        serviceid: serviceId,
        action: 'createMailbox',
        localPart: form.find('[name="localPart"]').val(),
        domain: form.find('[name="domain"]').val(),
        password: form.find('[name="password"]').val(),
        displayName: form.find('[name="displayName"]').val()
    };

    $.post('clientarea.php?action=productdetails&id=' + serviceId + '&modop=custom&a=createMailbox', data)
        .done(function(response) {
            if (response.success) {
                location.reload();
            } else {
                alert('Error: ' + response.message);
            }
        })
        .fail(function() {
            alert('Request failed');
        });
}

function changePassword(email) {
    var password = prompt('Enter new password for ' + email + ':');
    if (password && password.length >= 8) {
        $.post('clientarea.php?action=productdetails&id=' + serviceId + '&modop=custom&a=changePassword', {
            serviceid: serviceId,
            email: email,
            password: password
        }).done(function(response) {
            alert(response.success ? 'Password changed successfully' : 'Error: ' + response.message);
        });
    } else if (password) {
        alert('Password must be at least 8 characters');
    }
}

function deleteMailbox(email) {
    if (confirm('Are you sure you want to delete ' + email + '? This cannot be undone.')) {
        $.post('clientarea.php?action=productdetails&id=' + serviceId + '&modop=custom&a=deleteMailbox', {
            serviceid: serviceId,
            email: email
        }).done(function(response) {
            if (response.success) {
                location.reload();
            } else {
                alert('Error: ' + response.message);
            }
        });
    }
}

function showDnsRecords(domain) {
    $.get('clientarea.php?action=productdetails&id=' + serviceId + '&modop=custom&a=getDnsRecords&domain=' + domain)
        .done(function(response) {
            if (response.success) {
                var html = '<table class="table table-condensed"><thead><tr><th>Type</th><th>Name</th><th>Value</th></tr></thead><tbody>';
                response.records.forEach(function(r) {
                    html += '<tr><td>' + r.type + '</td><td>' + r.name + '</td><td><code>' + r.value + '</code></td></tr>';
                });
                html += '</tbody></table>';

                // Show in modal or alert
                alert('Please add these DNS records to verify your domain:\n\n' + JSON.stringify(response.records, null, 2));
            }
        });
}
</script>
```

### Step 4: WHMCS Hooks (Day 5-6)

```php
<?php
// modules/servers/ephemera/hooks.php

use WHMCS\Database\Capsule;

/**
 * Sync usage data daily
 */
add_hook('DailyCronJob', 1, function($vars) {
    // Get all active Ephemera services
    $services = Capsule::table('tblhosting')
        ->join('tblproducts', 'tblhosting.packageid', '=', 'tblproducts.id')
        ->where('tblproducts.servertype', 'ephemera')
        ->where('tblhosting.domainstatus', 'Active')
        ->get();

    foreach ($services as $service) {
        try {
            // Get server details
            $server = Capsule::table('tblservers')
                ->where('id', $service->server)
                ->first();

            if (!$server) continue;

            $api = new EphemeraAPI(
                $server->username,
                decrypt($server->password),
                $server->hostname
            );

            $customFields = json_decode($service->customfields, true);
            $tenantId = $customFields['tenant_id'] ?? null;

            if (!$tenantId) continue;

            $usage = $api->getUsage($tenantId);

            if ($usage['success']) {
                Capsule::table('tblhosting')
                    ->where('id', $service->id)
                    ->update([
                        'diskusage' => round($usage['data']['storageBytes'] / (1024 * 1024)),
                        'lastupdate' => date('Y-m-d H:i:s'),
                    ]);
            }

        } catch (Exception $e) {
            logActivity("Ephemera usage sync failed for service {$service->id}: " . $e->getMessage());
        }
    }
});

/**
 * Handle domain change
 */
add_hook('ServiceEdit', 1, function($vars) {
    $serviceId = $vars['serviceid'];

    $service = Capsule::table('tblhosting')
        ->join('tblproducts', 'tblhosting.packageid', '=', 'tblproducts.id')
        ->where('tblhosting.id', $serviceId)
        ->where('tblproducts.servertype', 'ephemera')
        ->first();

    if (!$service) return;

    // Check if domain changed
    $oldDomain = $vars['params']['model']->domain ?? '';
    $newDomain = $vars['params']['domain'] ?? '';

    if ($oldDomain !== $newDomain && $newDomain) {
        // Add new domain via API
        try {
            $server = Capsule::table('tblservers')
                ->where('id', $service->server)
                ->first();

            $api = new EphemeraAPI(
                $server->username,
                decrypt($server->password),
                $server->hostname
            );

            $customFields = json_decode($service->customfields, true);
            $tenantId = $customFields['tenant_id'] ?? null;

            if ($tenantId) {
                $api->addDomain($tenantId, $newDomain);
                logActivity("Ephemera: Added domain {$newDomain} to tenant {$tenantId}");
            }

        } catch (Exception $e) {
            logActivity("Ephemera domain add failed: " . $e->getMessage());
        }
    }
});
```

## Todo List

- [ ] Create main module file (ephemera.php)
- [ ] Implement EphemeraAPI wrapper class
- [ ] Create client area templates
- [ ] Implement WHMCS hooks (usage sync, domain change)
- [ ] Add Webmail SSO functionality
- [ ] Create module installer script
- [ ] Test all provisioning functions
- [ ] Write user documentation
- [ ] Submit to WHMCS Marketplace

## Success Criteria

- [ ] Create/Suspend/Terminate/Unsuspend all working
- [ ] Client area shows mailboxes and usage
- [ ] Webmail SSO working
- [ ] Usage sync running on cron
- [ ] Module installs without errors

## Security Considerations

1. **API Key Storage**: Use WHMCS encryption for server password field
2. **CSRF Protection**: All forms use WHMCS CSRF tokens
3. **Input Validation**: Sanitize all user inputs
4. **Logging**: Log all API calls for debugging

## Next Steps

After completing Phase 03:
→ [Phase 04: DirectAdmin & Plesk](phase-04-directadmin-plesk.md)
