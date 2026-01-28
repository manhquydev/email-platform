<?php
/**
 * Ephemera Email Hosting - WHMCS Hooks
 *
 * Handles automated tasks like usage sync and domain changes
 */

use WHMCS\Database\Capsule;

require_once __DIR__ . '/lib/EphemeraAPI.php';
require_once __DIR__ . '/lib/EphemeraHelper.php';

/**
 * Sync usage data daily via cron
 */
add_hook('DailyCronJob', 1, function ($vars) {
    // Get all active Ephemera services
    $services = Capsule::table('tblhosting')
        ->join('tblproducts', 'tblhosting.packageid', '=', 'tblproducts.id')
        ->join('tblservers', 'tblhosting.server', '=', 'tblservers.id')
        ->where('tblproducts.servertype', 'ephemera')
        ->where('tblhosting.domainstatus', 'Active')
        ->select('tblhosting.*', 'tblservers.hostname', 'tblservers.username', 'tblservers.password')
        ->get();

    $syncCount = 0;
    $errorCount = 0;

    foreach ($services as $service) {
        try {
            $api = new EphemeraAPI(
                $service->username,
                $service->hostname
            );

            $tenantId = EphemeraHelper::getTenantId($service->id);

            if (!$tenantId) {
                continue;
            }

            $usage = $api->getUsage($tenantId);

            if ($usage['success']) {
                $storageBytes = $usage['data']['usage']['summary']['storageBytes'] ?? 0;

                Capsule::table('tblhosting')
                    ->where('id', $service->id)
                    ->update([
                        'diskusage' => round($storageBytes / (1024 * 1024)),
                        'lastupdate' => date('Y-m-d H:i:s'),
                    ]);

                $syncCount++;
            } else {
                $errorCount++;
                logActivity("Ephemera: Usage sync failed for service #{$service->id}: " . $usage['error']);
            }

        } catch (Exception $e) {
            $errorCount++;
            logActivity("Ephemera: Usage sync exception for service #{$service->id}: " . $e->getMessage());
        }
    }

    if ($syncCount > 0 || $errorCount > 0) {
        logActivity("Ephemera: Daily usage sync completed - {$syncCount} synced, {$errorCount} errors");
    }
});

/**
 * Handle service domain change
 */
add_hook('ServiceEdit', 1, function ($vars) {
    $serviceId = $vars['serviceid'];

    // Check if this is an Ephemera service
    $service = Capsule::table('tblhosting')
        ->join('tblproducts', 'tblhosting.packageid', '=', 'tblproducts.id')
        ->join('tblservers', 'tblhosting.server', '=', 'tblservers.id')
        ->where('tblhosting.id', $serviceId)
        ->where('tblproducts.servertype', 'ephemera')
        ->select('tblhosting.*', 'tblservers.hostname', 'tblservers.username')
        ->first();

    if (!$service) {
        return;
    }

    // Get the new domain from POST data
    $newDomain = $_POST['domain'] ?? '';
    $oldDomain = $service->domain ?? '';

    // If domain changed, add new domain to tenant
    if ($newDomain && $newDomain !== $oldDomain) {
        try {
            $api = new EphemeraAPI(
                $service->username,
                $service->hostname
            );

            $tenantId = EphemeraHelper::getTenantId($serviceId);

            if ($tenantId) {
                $result = $api->addDomain($tenantId, $newDomain);

                if ($result['success']) {
                    logActivity("Ephemera: Added domain {$newDomain} to tenant {$tenantId} for service #{$serviceId}");
                } else {
                    logActivity("Ephemera: Failed to add domain {$newDomain}: " . $result['error']);
                }
            }

        } catch (Exception $e) {
            logActivity("Ephemera: Domain add exception for service #{$serviceId}: " . $e->getMessage());
        }
    }
});

/**
 * Log when service is created
 */
add_hook('AfterModuleCreate', 1, function ($vars) {
    if ($vars['params']['moduletype'] !== 'ephemera') {
        return;
    }

    if ($vars['params']['status'] === 'success') {
        logActivity("Ephemera: Service #{$vars['params']['serviceid']} created successfully");
    }
});

/**
 * Log when service is suspended
 */
add_hook('AfterModuleSuspend', 1, function ($vars) {
    if ($vars['params']['moduletype'] !== 'ephemera') {
        return;
    }

    if ($vars['params']['status'] === 'success') {
        logActivity("Ephemera: Service #{$vars['params']['serviceid']} suspended");
    }
});

/**
 * Log when service is terminated
 */
add_hook('AfterModuleTerminate', 1, function ($vars) {
    if ($vars['params']['moduletype'] !== 'ephemera') {
        return;
    }

    if ($vars['params']['status'] === 'success') {
        logActivity("Ephemera: Service #{$vars['params']['serviceid']} terminated");
    }
});

/**
 * Add custom admin area widget
 */
add_hook('AdminHomeWidgets', 1, function () {
    return new class {
        public function getId()
        {
            return 'EphemeraStats';
        }

        public function getName()
        {
            return 'Ephemera Email Stats';
        }

        public function getWidget()
        {
            $activeServices = Capsule::table('tblhosting')
                ->join('tblproducts', 'tblhosting.packageid', '=', 'tblproducts.id')
                ->where('tblproducts.servertype', 'ephemera')
                ->where('tblhosting.domainstatus', 'Active')
                ->count();

            $suspendedServices = Capsule::table('tblhosting')
                ->join('tblproducts', 'tblhosting.packageid', '=', 'tblproducts.id')
                ->where('tblproducts.servertype', 'ephemera')
                ->where('tblhosting.domainstatus', 'Suspended')
                ->count();

            $totalStorage = Capsule::table('tblhosting')
                ->join('tblproducts', 'tblhosting.packageid', '=', 'tblproducts.id')
                ->where('tblproducts.servertype', 'ephemera')
                ->where('tblhosting.domainstatus', 'Active')
                ->sum('diskusage');

            return <<<HTML
<div class="widget-content-padded">
    <div class="row">
        <div class="col-sm-4 text-center">
            <h3>{$activeServices}</h3>
            <p>Active Services</p>
        </div>
        <div class="col-sm-4 text-center">
            <h3>{$suspendedServices}</h3>
            <p>Suspended</p>
        </div>
        <div class="col-sm-4 text-center">
            <h3>{$totalStorage} MB</h3>
            <p>Total Storage</p>
        </div>
    </div>
</div>
HTML;
        }
    };
});
