<?php
/**
 * Ephemera DirectAdmin Plugin - Admin Interface
 */

session_start();

require_once dirname(__DIR__) . '/exec/EphemeraAPI.php';

// CSRF token generation
if (empty($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}
$csrfToken = $_SESSION['csrf_token'];

$api = new EphemeraAPI();
$config = $api->loadConfig();
$message = '';
$messageType = 'info';

// Handle form submission with CSRF validation
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action'])) {
    // Validate CSRF token
    if (!isset($_POST['csrf_token']) || !hash_equals($csrfToken, $_POST['csrf_token'])) {
        $message = 'Invalid security token. Please try again.';
        $messageType = 'error';
    } else {
        $action = $_POST['action'];

    if ($action === 'save_settings') {
        $api->saveConfig([
            'api_url' => trim($_POST['api_url'] ?? ''),
            'api_key' => trim($_POST['api_key'] ?? ''),
            'default_plan' => $_POST['default_plan'] ?? 'LITE',
            'auto_provision' => isset($_POST['auto_provision']),
        ]);
        $config = $api->loadConfig();
        $message = 'Settings saved successfully!';
        $messageType = 'success';
    }

    if ($action === 'test_connection') {
        $result = $api->testConnection();
        if ($result['success']) {
            $message = 'Connection successful! Provider: ' . ($result['data']['provider']['name'] ?? 'Unknown');
            $messageType = 'success';
        } else {
            $message = 'Connection failed: ' . ($result['error'] ?? 'Unknown error');
            $messageType = 'error';
        }
    }
    } // End CSRF validation
}
?>
<!DOCTYPE html>
<html>
<head>
    <title>Ephemera Email Hosting - Admin</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 800px; margin: 0 auto; background: #fff; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        h1 { color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px; }
        .form-group { margin-bottom: 15px; }
        label { display: block; margin-bottom: 5px; font-weight: bold; color: #555; }
        input[type="text"], input[type="password"], select { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box; }
        button { background: #007bff; color: #fff; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; margin-right: 10px; }
        button:hover { background: #0056b3; }
        button.secondary { background: #6c757d; }
        button.secondary:hover { background: #545b62; }
        .message { padding: 10px; margin-bottom: 15px; border-radius: 4px; }
        .message.success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
        .message.error { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
        .message.info { background: #d1ecf1; color: #0c5460; border: 1px solid #bee5eb; }
        .checkbox-group { display: flex; align-items: center; gap: 10px; }
        .checkbox-group input { width: auto; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Ephemera Email Hosting</h1>

        <?php if ($message): ?>
            <div class="message <?= htmlspecialchars($messageType) ?>"><?= htmlspecialchars($message) ?></div>
        <?php endif; ?>

        <h2>Provider Settings</h2>
        <form method="post">
            <input type="hidden" name="action" value="save_settings">
            <input type="hidden" name="csrf_token" value="<?= htmlspecialchars($csrfToken) ?>">

            <div class="form-group">
                <label>API URL</label>
                <input type="text" name="api_url" value="<?= htmlspecialchars($config['api_url'] ?? '') ?>" placeholder="https://api.ephemera.email">
            </div>

            <div class="form-group">
                <label>API Key</label>
                <input type="password" name="api_key" value="<?= htmlspecialchars($config['api_key'] ?? '') ?>" placeholder="Your Provider API Key">
            </div>

            <div class="form-group">
                <label>Default Plan</label>
                <select name="default_plan">
                    <option value="LITE" <?= ($config['default_plan'] ?? '') === 'LITE' ? 'selected' : '' ?>>Lite (5 mailboxes, 1GB each)</option>
                    <option value="PRO" <?= ($config['default_plan'] ?? '') === 'PRO' ? 'selected' : '' ?>>Pro (Unlimited, 10GB each)</option>
                    <option value="BUSINESS" <?= ($config['default_plan'] ?? '') === 'BUSINESS' ? 'selected' : '' ?>>Business (Unlimited, 50GB each)</option>
                </select>
            </div>

            <div class="form-group">
                <div class="checkbox-group">
                    <input type="checkbox" name="auto_provision" id="auto_provision" <?= !empty($config['auto_provision']) ? 'checked' : '' ?>>
                    <label for="auto_provision" style="display: inline; font-weight: normal;">Auto-provision email on user creation</label>
                </div>
            </div>

            <button type="submit">Save Settings</button>
        </form>

        <hr style="margin: 30px 0;">

        <h2>Test Connection</h2>
        <form method="post">
            <input type="hidden" name="action" value="test_connection">
            <input type="hidden" name="csrf_token" value="<?= htmlspecialchars($csrfToken) ?>">
            <button type="submit" class="secondary">Test API Connection</button>
        </form>
    </div>
</body>
</html>
