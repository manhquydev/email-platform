<?php
/**
 * Ephemera Helper Class
 *
 * Utility functions for the Ephemera WHMCS module
 */

use WHMCS\Database\Capsule;

class EphemeraHelper
{
    /**
     * Get API instance from params
     */
    public static function getApi(array $params)
    {
        $apiKey = $params['serverusername'];
        $hostname = $params['serverhostname'];

        return new EphemeraAPI($apiKey, $hostname);
    }

    /**
     * Get tenant ID for a service
     */
    public static function getTenantId($serviceId)
    {
        // Try custom fields table first
        $customField = Capsule::table('tblcustomfieldsvalues')
            ->join('tblcustomfields', 'tblcustomfieldsvalues.fieldid', '=', 'tblcustomfields.id')
            ->where('tblcustomfields.fieldname', 'Tenant ID')
            ->where('tblcustomfieldsvalues.relid', $serviceId)
            ->first();

        if ($customField && $customField->value) {
            return $customField->value;
        }

        // Fallback to notes field
        $service = Capsule::table('tblhosting')
            ->where('id', $serviceId)
            ->first();

        if ($service && $service->notes) {
            $notes = json_decode($service->notes, true);
            if (isset($notes['ephemera_tenant_id'])) {
                return $notes['ephemera_tenant_id'];
            }
        }

        return null;
    }

    /**
     * Save tenant ID for a service
     */
    public static function saveTenantId($serviceId, $tenantId)
    {
        // Try to save in custom field
        $customField = Capsule::table('tblcustomfields')
            ->where('fieldname', 'Tenant ID')
            ->where('type', 'product')
            ->first();

        if ($customField) {
            Capsule::table('tblcustomfieldsvalues')->updateOrInsert(
                [
                    'fieldid' => $customField->id,
                    'relid' => $serviceId,
                ],
                ['value' => $tenantId]
            );
            return;
        }

        // Fallback to notes field
        $service = Capsule::table('tblhosting')
            ->where('id', $serviceId)
            ->first();

        $notes = [];
        if ($service && $service->notes) {
            $notes = json_decode($service->notes, true) ?: [];
        }

        $notes['ephemera_tenant_id'] = $tenantId;

        Capsule::table('tblhosting')
            ->where('id', $serviceId)
            ->update(['notes' => json_encode($notes)]);
    }

    /**
     * Delete tenant ID for a service
     */
    public static function deleteTenantId($serviceId)
    {
        // Remove from custom field
        $customField = Capsule::table('tblcustomfields')
            ->where('fieldname', 'Tenant ID')
            ->where('type', 'product')
            ->first();

        if ($customField) {
            Capsule::table('tblcustomfieldsvalues')
                ->where('fieldid', $customField->id)
                ->where('relid', $serviceId)
                ->delete();
        }

        // Remove from notes
        $service = Capsule::table('tblhosting')
            ->where('id', $serviceId)
            ->first();

        if ($service && $service->notes) {
            $notes = json_decode($service->notes, true) ?: [];
            unset($notes['ephemera_tenant_id']);

            Capsule::table('tblhosting')
                ->where('id', $serviceId)
                ->update(['notes' => empty($notes) ? null : json_encode($notes)]);
        }
    }

    /**
     * Format storage size for display
     */
    public static function formatStorage($bytes)
    {
        $units = ['B', 'KB', 'MB', 'GB', 'TB'];
        $bytes = max($bytes, 0);
        $pow = floor(($bytes ? log($bytes) : 0) / log(1024));
        $pow = min($pow, count($units) - 1);
        $bytes /= pow(1024, $pow);

        return round($bytes, 2) . ' ' . $units[$pow];
    }

    /**
     * Validate email address
     */
    public static function validateEmail($email)
    {
        return filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
    }

    /**
     * Validate password strength
     */
    public static function validatePassword($password)
    {
        if (strlen($password) < 8) {
            return ['valid' => false, 'message' => 'Password must be at least 8 characters'];
        }

        if (!preg_match('/[A-Z]/', $password)) {
            return ['valid' => false, 'message' => 'Password must contain at least one uppercase letter'];
        }

        if (!preg_match('/[a-z]/', $password)) {
            return ['valid' => false, 'message' => 'Password must contain at least one lowercase letter'];
        }

        if (!preg_match('/[0-9]/', $password)) {
            return ['valid' => false, 'message' => 'Password must contain at least one number'];
        }

        return ['valid' => true, 'message' => 'Password is valid'];
    }

    /**
     * Log activity with module prefix
     */
    public static function log($message, $serviceId = null)
    {
        $prefix = 'Ephemera';
        if ($serviceId) {
            $prefix .= " [Service #{$serviceId}]";
        }
        logActivity("{$prefix}: {$message}");
    }
}
