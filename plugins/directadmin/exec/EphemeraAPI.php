<?php
/**
 * Ephemera API Client for DirectAdmin
 */

class EphemeraAPI
{
    private $configFile = '/usr/local/directadmin/plugins/ephemera/data/config.json';
    private $apiKey;
    private $baseUrl;
    private $timeout = 30;

    public function __construct()
    {
        $config = $this->loadConfig();
        $this->apiKey = $config['api_key'] ?? '';
        $this->baseUrl = $config['api_url'] ?? 'https://api.ephemera.email';
    }

    public function loadConfig()
    {
        if (!file_exists($this->configFile)) {
            return [
                'api_url' => 'https://api.ephemera.email',
                'api_key' => '',
                'default_plan' => 'LITE',
                'auto_provision' => true,
            ];
        }
        return json_decode(file_get_contents($this->configFile), true) ?: [];
    }

    public function saveConfig(array $config)
    {
        $dir = dirname($this->configFile);
        if (!is_dir($dir)) {
            mkdir($dir, 0700, true);
        }
        file_put_contents($this->configFile, json_encode($config, JSON_PRETTY_PRINT));
        chmod($this->configFile, 0600);
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

    // Tenant ID storage per user
    public function getUserTenantId($username)
    {
        $file = "/usr/local/directadmin/plugins/ephemera/data/users/{$username}.json";
        if (file_exists($file)) {
            $data = json_decode(file_get_contents($file), true);
            return $data['tenant_id'] ?? null;
        }
        return null;
    }

    public function saveUserTenantId($username, $tenantId)
    {
        $dir = '/usr/local/directadmin/plugins/ephemera/data/users';
        if (!is_dir($dir)) {
            mkdir($dir, 0700, true);
        }
        $file = "{$dir}/{$username}.json";
        file_put_contents($file, json_encode(['tenant_id' => $tenantId]));
        chmod($file, 0600);
    }

    public function deleteUserTenantId($username)
    {
        $file = "/usr/local/directadmin/plugins/ephemera/data/users/{$username}.json";
        if (file_exists($file)) {
            unlink($file);
        }
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
