<?php
/**
 * Ephemera API Wrapper Class
 *
 * Handles all communication with the Ephemera Provider API
 */

class EphemeraAPI
{
    private $apiKey;
    private $baseUrl;
    private $timeout = 30;

    public function __construct($apiKey, $hostname)
    {
        $this->apiKey = $apiKey;
        $this->baseUrl = "https://{$hostname}";
    }

    /**
     * Test API connection
     */
    public function testConnection()
    {
        return $this->request('GET', '/v1/provider/me');
    }

    // ========== Tenant Operations ==========

    public function createTenant(array $data)
    {
        return $this->request('POST', '/v1/provider/tenants', $data);
    }

    public function getTenant($tenantId)
    {
        return $this->request('GET', "/v1/provider/tenants/{$tenantId}");
    }

    public function listTenants($page = 1, $limit = 50)
    {
        return $this->request('GET', "/v1/provider/tenants?page={$page}&limit={$limit}");
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

    // ========== Domain Operations ==========

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
        $encodedDomain = rawurlencode($domain);
        return $this->request('GET', "/v1/provider/tenants/{$tenantId}/domains/{$encodedDomain}/dns");
    }

    public function verifyDomain($tenantId, $domain)
    {
        $encodedDomain = rawurlencode($domain);
        return $this->request('POST', "/v1/provider/tenants/{$tenantId}/domains/{$encodedDomain}/verify");
    }

    public function removeDomain($tenantId, $domain)
    {
        $encodedDomain = rawurlencode($domain);
        return $this->request('DELETE', "/v1/provider/tenants/{$tenantId}/domains/{$encodedDomain}");
    }

    // ========== Mailbox Operations ==========

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
        $encodedEmail = rawurlencode($email);
        return $this->request('DELETE', "/v1/provider/tenants/{$tenantId}/mailboxes/{$encodedEmail}");
    }

    public function updateMailboxPassword($tenantId, $email, $password)
    {
        $encodedEmail = rawurlencode($email);
        return $this->request('POST', "/v1/provider/tenants/{$tenantId}/mailboxes/{$encodedEmail}/password", [
            'password' => $password,
        ]);
    }

    // ========== Usage ==========

    public function getUsage($tenantId)
    {
        return $this->request('GET', "/v1/provider/tenants/{$tenantId}/usage");
    }

    // ========== SSO ==========

    public function getWebmailSSO($tenantId, $email = null)
    {
        $path = "/v1/provider/tenants/{$tenantId}/sso";
        if ($email) {
            $path .= "?email=" . rawurlencode($email);
        }
        return $this->request('POST', $path);
    }

    // ========== HTTP Request Handler ==========

    private function request($method, $path, $body = null)
    {
        $url = $this->baseUrl . $path;

        $ch = curl_init();

        $headers = [
            'Content-Type: application/json',
            'Accept: application/json',
            'X-Provider-Key: ' . $this->apiKey,
        ];

        curl_setopt_array($ch, [
            CURLOPT_URL => $url,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => $this->timeout,
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_SSL_VERIFYPEER => true,
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
            case 'PUT':
                curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'PUT');
                if ($body) {
                    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body));
                }
                break;
        }

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        $errno = curl_errno($ch);

        curl_close($ch);

        // Handle cURL errors
        if ($errno) {
            return [
                'success' => false,
                'error' => "Connection error: {$error}",
                'curlError' => $errno,
            ];
        }

        // Parse response
        $data = json_decode($response, true);

        // Check for successful response
        if ($httpCode >= 200 && $httpCode < 300) {
            return [
                'success' => true,
                'data' => $data,
                'httpCode' => $httpCode,
            ];
        }

        // Handle error response
        return [
            'success' => false,
            'error' => $data['error'] ?? $data['message'] ?? "HTTP Error {$httpCode}",
            'data' => $data,
            'httpCode' => $httpCode,
        ];
    }

    /**
     * Set custom timeout
     */
    public function setTimeout($seconds)
    {
        $this->timeout = (int) $seconds;
        return $this;
    }
}
