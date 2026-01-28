<?php
/**
 * Ephemera API Library for Plesk Extension
 */

class Modules_Ephemera_EphemeraAPI
{
    private $apiKey;
    private $baseUrl;
    private $timeout = 30;

    public function __construct()
    {
        $this->apiKey = pm_Settings::get('api_key', '');
        $this->baseUrl = pm_Settings::get('api_url', 'https://api.ephemera.email');
    }

    public function getTenantIdForDomain($domain)
    {
        return pm_Settings::get("tenant_{$domain}", null);
    }

    public function saveTenantIdForDomain($domain, $tenantId)
    {
        pm_Settings::set("tenant_{$domain}", $tenantId);
    }

    public function deleteTenantIdForDomain($domain)
    {
        pm_Settings::set("tenant_{$domain}", null);
    }

    public function createTenant(array $data)
    {
        return $this->request('POST', '/v1/provider/tenants', $data);
    }

    public function getTenant($tenantId)
    {
        return $this->request('GET', "/v1/provider/tenants/{$tenantId}");
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

    public function addDomain($tenantId, $domain)
    {
        return $this->request('POST', "/v1/provider/tenants/{$tenantId}/domains", [
            'domain' => $domain,
        ]);
    }

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
        $encoded = rawurlencode($email);
        return $this->request('DELETE', "/v1/provider/tenants/{$tenantId}/mailboxes/{$encoded}");
    }

    public function updatePassword($tenantId, $email, $password)
    {
        $encoded = rawurlencode($email);
        return $this->request('POST', "/v1/provider/tenants/{$tenantId}/mailboxes/{$encoded}/password", [
            'password' => $password,
        ]);
    }

    public function getUsage($tenantId)
    {
        return $this->request('GET', "/v1/provider/tenants/{$tenantId}/usage");
    }

    public function testConnection()
    {
        return $this->request('GET', '/v1/provider/me');
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
                'Accept: application/json',
                'X-Provider-Key: ' . $this->apiKey,
            ],
            CURLOPT_SSL_VERIFYPEER => true,
        ]);

        switch ($method) {
            case 'POST':
                curl_setopt($ch, CURLOPT_POST, true);
                if ($body) {
                    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body));
                }
                break;
            case 'DELETE':
                curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'DELETE');
                break;
            case 'PATCH':
                curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'PATCH');
                if ($body) {
                    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body));
                }
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
