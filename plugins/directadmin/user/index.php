<?php
/**
 * Ephemera DirectAdmin Plugin - User Interface
 */

session_start();

require_once dirname(__DIR__) . '/exec/EphemeraAPI.php';

// CSRF token generation
if (empty($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}
$csrfToken = $_SESSION['csrf_token'];

// Get current user from DirectAdmin environment
$username = getenv('USERNAME') ?: ($_SERVER['REMOTE_USER'] ?? '');
$domain = getenv('DOMAIN') ?: '';

if (!$username) {
    die('Not authenticated');
}

$api = new EphemeraAPI();
$tenantId = $api->getUserTenantId($username);
$message = '';
$messageType = 'info';

// Handle AJAX requests
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action'])) {
    header('Content-Type: application/json');

    // Validate CSRF token
    if (!isset($_POST['csrf_token']) || !hash_equals($csrfToken, $_POST['csrf_token'])) {
        echo json_encode(['success' => false, 'error' => 'Invalid security token']);
        exit;
    }

    $action = $_POST['action'];

    if (!$tenantId) {
        echo json_encode(['success' => false, 'error' => 'Email service not provisioned']);
        exit;
    }

    if ($action === 'create_mailbox') {
        $localPart = preg_replace('/[^a-zA-Z0-9._-]/', '', $_POST['local_part'] ?? '');
        $mailDomain = preg_replace('/[^a-zA-Z0-9.-]/', '', $_POST['domain'] ?? '');
        $password = $_POST['password'] ?? '';
        $displayName = htmlspecialchars($_POST['display_name'] ?? '', ENT_QUOTES, 'UTF-8');

        if (!$localPart || !$mailDomain || !$password) {
            echo json_encode(['success' => false, 'error' => 'Missing required fields']);
            exit;
        }

        if (strlen($password) < 8) {
            echo json_encode(['success' => false, 'error' => 'Password must be at least 8 characters']);
            exit;
        }

        $result = $api->createMailbox($tenantId, [
            'localPart' => $localPart,
            'domain' => $mailDomain,
            'password' => $password,
            'displayName' => $displayName,
        ]);

        echo json_encode($result);
        exit;
    }

    if ($action === 'delete_mailbox') {
        $email = filter_var($_POST['email'] ?? '', FILTER_SANITIZE_EMAIL);
        if (!$email) {
            echo json_encode(['success' => false, 'error' => 'Email required']);
            exit;
        }
        $result = $api->deleteMailbox($tenantId, $email);
        echo json_encode($result);
        exit;
    }

    if ($action === 'change_password') {
        $email = filter_var($_POST['email'] ?? '', FILTER_SANITIZE_EMAIL);
        $password = $_POST['password'] ?? '';

        if (!$email || !$password) {
            echo json_encode(['success' => false, 'error' => 'Missing required fields']);
            exit;
        }

        if (strlen($password) < 8) {
            echo json_encode(['success' => false, 'error' => 'Password must be at least 8 characters']);
            exit;
        }

        $result = $api->updatePassword($tenantId, $email, $password);
        echo json_encode($result);
        exit;
    }

    echo json_encode(['success' => false, 'error' => 'Unknown action']);
    exit;
}

// Get data for display
$mailboxes = [];
$usage = [];
$domains = [];

if ($tenantId) {
    $mailboxResult = $api->listMailboxes($tenantId);
    $mailboxes = $mailboxResult['data']['mailboxes'] ?? [];

    $usageResult = $api->getUsage($tenantId);
    $usage = $usageResult['data']['usage']['summary'] ?? [];
}
?>
<!DOCTYPE html>
<html>
<head>
    <title>Ephemera Email Hosting</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 900px; margin: 0 auto; background: #fff; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        h1 { color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px; }
        .stats { display: flex; gap: 20px; margin-bottom: 20px; }
        .stat-card { flex: 1; background: #f8f9fa; padding: 15px; border-radius: 8px; text-align: center; }
        .stat-card h3 { margin: 0; color: #666; font-size: 14px; }
        .stat-card .value { font-size: 28px; font-weight: bold; color: #333; margin: 10px 0; }
        table { width: 100%; border-collapse: collapse; margin-top: 15px; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background: #f8f9fa; font-weight: bold; }
        .btn { padding: 6px 12px; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; }
        .btn-primary { background: #007bff; color: #fff; }
        .btn-danger { background: #dc3545; color: #fff; }
        .btn-warning { background: #ffc107; color: #000; }
        .btn:hover { opacity: 0.8; }
        .modal { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1000; }
        .modal-content { background: #fff; max-width: 400px; margin: 100px auto; padding: 20px; border-radius: 8px; }
        .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
        .modal-header h2 { margin: 0; }
        .close { font-size: 24px; cursor: pointer; color: #666; }
        .form-group { margin-bottom: 15px; }
        .form-group label { display: block; margin-bottom: 5px; font-weight: bold; }
        .form-group input, .form-group select { width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box; }
        .not-provisioned { text-align: center; padding: 40px; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Ephemera Email Hosting</h1>

        <?php if (!$tenantId): ?>
            <div class="not-provisioned">
                <h2>Email Service Not Provisioned</h2>
                <p>Please contact your administrator to enable email hosting for your account.</p>
            </div>
        <?php else: ?>
            <div class="stats">
                <div class="stat-card">
                    <h3>Mailboxes</h3>
                    <div class="value"><?= count($mailboxes) ?></div>
                </div>
                <div class="stat-card">
                    <h3>Storage Used</h3>
                    <div class="value"><?= round(($usage['storageBytes'] ?? 0) / (1024 * 1024)) ?> MB</div>
                </div>
                <div class="stat-card">
                    <h3>Messages</h3>
                    <div class="value"><?= $usage['messageCount'] ?? 0 ?></div>
                </div>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center;">
                <h2>Email Accounts</h2>
                <button class="btn btn-primary" onclick="showCreateModal()">+ Create Mailbox</button>
            </div>

            <table>
                <thead>
                    <tr>
                        <th>Email</th>
                        <th>Display Name</th>
                        <th>Quota</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach ($mailboxes as $mailbox): ?>
                    <tr>
                        <td><?= htmlspecialchars($mailbox['email']) ?></td>
                        <td><?= htmlspecialchars($mailbox['displayName'] ?? '-') ?></td>
                        <td><?= $mailbox['quotaMb'] ?? 0 ?> MB</td>
                        <td>
                            <button class="btn btn-warning" onclick="showPasswordModal('<?= htmlspecialchars($mailbox['email'], ENT_QUOTES) ?>')">Password</button>
                            <button class="btn btn-danger" onclick="deleteMailbox('<?= htmlspecialchars($mailbox['email'], ENT_QUOTES) ?>')">Delete</button>
                        </td>
                    </tr>
                    <?php endforeach; ?>
                    <?php if (empty($mailboxes)): ?>
                    <tr><td colspan="4" style="text-align: center; color: #666;">No mailboxes created yet</td></tr>
                    <?php endif; ?>
                </tbody>
            </table>
        <?php endif; ?>
    </div>

    <!-- Create Mailbox Modal -->
    <div id="createModal" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <h2>Create Mailbox</h2>
                <span class="close" onclick="closeModal('createModal')">&times;</span>
            </div>
            <form id="createForm">
                <div class="form-group">
                    <label>Email Address</label>
                    <input type="text" name="local_part" placeholder="username" required>
                </div>
                <div class="form-group">
                    <label>Domain</label>
                    <input type="text" name="domain" value="<?= htmlspecialchars($domain) ?>" required>
                </div>
                <div class="form-group">
                    <label>Password</label>
                    <input type="password" name="password" minlength="8" required>
                </div>
                <div class="form-group">
                    <label>Display Name</label>
                    <input type="text" name="display_name">
                </div>
                <button type="submit" class="btn btn-primary">Create</button>
            </form>
        </div>
    </div>

    <!-- Change Password Modal -->
    <div id="passwordModal" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <h2>Change Password</h2>
                <span class="close" onclick="closeModal('passwordModal')">&times;</span>
            </div>
            <form id="passwordForm">
                <input type="hidden" name="email" id="passwordEmail">
                <p>Changing password for: <strong id="passwordEmailDisplay"></strong></p>
                <div class="form-group">
                    <label>New Password</label>
                    <input type="password" name="password" minlength="8" required>
                </div>
                <button type="submit" class="btn btn-warning">Change Password</button>
            </form>
        </div>
    </div>

    <script>
    function showCreateModal() {
        document.getElementById('createModal').style.display = 'block';
    }

    function showPasswordModal(email) {
        document.getElementById('passwordEmail').value = email;
        document.getElementById('passwordEmailDisplay').textContent = email;
        document.getElementById('passwordModal').style.display = 'block';
    }

    function closeModal(id) {
        document.getElementById(id).style.display = 'none';
    }

    function deleteMailbox(email) {
        if (!confirm('Delete ' + email + '? This cannot be undone.')) return;

        fetch(window.location.href, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: 'action=delete_mailbox&email=' + encodeURIComponent(email)
        })
        .then(r => r.json())
        .then(data => {
            if (data.success) location.reload();
            else alert('Error: ' + (data.error || 'Unknown error'));
        });
    }

    document.getElementById('createForm').onsubmit = function(e) {
        e.preventDefault();
        var form = new FormData(this);
        form.append('action', 'create_mailbox');

        fetch(window.location.href, {
            method: 'POST',
            body: new URLSearchParams(form)
        })
        .then(r => r.json())
        .then(data => {
            if (data.success) location.reload();
            else alert('Error: ' + (data.error || 'Unknown error'));
        });
    };

    document.getElementById('passwordForm').onsubmit = function(e) {
        e.preventDefault();
        var form = new FormData(this);
        form.append('action', 'change_password');

        fetch(window.location.href, {
            method: 'POST',
            body: new URLSearchParams(form)
        })
        .then(r => r.json())
        .then(data => {
            if (data.success) {
                closeModal('passwordModal');
                alert('Password changed successfully');
            } else {
                alert('Error: ' + (data.error || 'Unknown error'));
            }
        });
    };

    window.onclick = function(e) {
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
        }
    };
    </script>
</body>
</html>
