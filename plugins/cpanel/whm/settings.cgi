#!/usr/local/cpanel/3rdparty/bin/perl
# WHM Ephemera Plugin - Settings Page
# /usr/local/cpanel/whostmgr/docroot/cgi/ephemera/settings.cgi

use strict;
use warnings;

use lib '/usr/local/cpanel';
use Whostmgr::HTMLInterface ();
use Whostmgr::ACLS          ();
use Cpanel::Form            ();

use lib '/usr/local/cpanel/Cpanel/Ephemera';
use Cpanel::Ephemera::API    ();
use Cpanel::Ephemera::Config ();

# Initialize
Whostmgr::ACLS::init_acls();

unless (Whostmgr::ACLS::hasroot()) {
    print "Content-type: text/html\r\n\r\n";
    print "Access Denied";
    exit;
}

my $form = Cpanel::Form::parseform();
my $config = Cpanel::Ephemera::Config->new();
my $message = '';
my $message_type = '';

# Handle form submission
if ($form->{action} && $form->{action} eq 'save') {
    my $new_config = {
        api_url        => $form->{api_url} || 'https://api.ephemera.email',
        api_key        => $form->{api_key} || '',
        default_plan   => $form->{default_plan} || 'LITE',
        auto_provision => $form->{auto_provision} ? 1 : 0,
    };

    if ($config->save($new_config)) {
        $message = 'Settings saved successfully!';
        $message_type = 'success';
    } else {
        $message = 'Failed to save settings.';
        $message_type = 'error';
    }
}

# Handle test connection
if ($form->{action} && $form->{action} eq 'test') {
    my $api = Cpanel::Ephemera::API->new();
    my $result = $api->test_connection();

    if ($result->{success}) {
        $message = "Connection successful! Provider: $result->{data}{provider}{name}";
        $message_type = 'success';
    } else {
        $message = "Connection failed: $result->{error}";
        $message_type = 'error';
    }
}

my $settings = $config->load();

print "Content-type: text/html\r\n\r\n";
Whostmgr::HTMLInterface::defheader(
    'Ephemera Settings',
    '/images/ephemera_icon.png',
    '/cgi/ephemera/'
);

# Selected states for plan dropdown
my $lite_sel = $settings->{default_plan} eq 'LITE' ? 'selected' : '';
my $pro_sel = $settings->{default_plan} eq 'PRO' ? 'selected' : '';
my $biz_sel = $settings->{default_plan} eq 'BUSINESS' ? 'selected' : '';
my $auto_checked = $settings->{auto_provision} ? 'checked' : '';

print qq{
<style>
.settings-form {
    max-width: 600px;
    margin: 20px auto;
    background: #fff;
    padding: 30px;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}
.form-group {
    margin-bottom: 20px;
}
.form-group label {
    display: block;
    font-weight: bold;
    margin-bottom: 5px;
    color: #333;
}
.form-group input[type="text"],
.form-group input[type="password"],
.form-group select {
    width: 100%;
    padding: 10px;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 14px;
}
.form-group small {
    color: #666;
    font-size: 12px;
}
.form-group input[type="checkbox"] {
    margin-right: 10px;
}
.btn {
    padding: 10px 20px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    margin-right: 10px;
}
.btn-primary {
    background: #2196F3;
    color: white;
}
.btn-secondary {
    background: #6c757d;
    color: white;
}
.btn:hover {
    opacity: 0.9;
}
.alert {
    padding: 15px;
    border-radius: 4px;
    margin-bottom: 20px;
}
.alert-success {
    background: #d4edda;
    border: 1px solid #c3e6cb;
    color: #155724;
}
.alert-error {
    background: #f8d7da;
    border: 1px solid #f5c6cb;
    color: #721c24;
}
.back-link {
    margin-bottom: 20px;
}
</style>

<div class="settings-form">
    <p class="back-link"><a href="index.cgi">&larr; Back to Dashboard</a></p>

    <h2>Provider Settings</h2>
};

if ($message) {
    print qq{<div class="alert alert-$message_type">$message</div>};
}

print qq{
    <form method="post" action="settings.cgi">
        <input type="hidden" name="action" value="save">

        <div class="form-group">
            <label for="api_url">Ephemera API URL</label>
            <input type="text" id="api_url" name="api_url"
                   value="$settings->{api_url}"
                   placeholder="https://api.ephemera.email">
        </div>

        <div class="form-group">
            <label for="api_key">Provider API Key</label>
            <input type="password" id="api_key" name="api_key"
                   value="$settings->{api_key}"
                   placeholder="eph_provider_...">
            <small>Get your API key from <a href="https://ephemera.email/providers" target="_blank">ephemera.email/providers</a></small>
        </div>

        <div class="form-group">
            <label for="default_plan">Default Plan for New Accounts</label>
            <select id="default_plan" name="default_plan">
                <option value="LITE" $lite_sel>Lite (5 mailboxes, 1GB each)</option>
                <option value="PRO" $pro_sel>Pro (Unlimited, 10GB each)</option>
                <option value="BUSINESS" $biz_sel>Business (Full features, 50GB each)</option>
            </select>
        </div>

        <div class="form-group">
            <label>
                <input type="checkbox" name="auto_provision" value="1" $auto_checked>
                Auto-provision email for new cPanel accounts
            </label>
            <small>When enabled, new cPanel accounts will automatically get email hosting.</small>
        </div>

        <button type="submit" class="btn btn-primary">Save Settings</button>
    </form>

    <hr style="margin: 30px 0;">

    <h3>Test Connection</h3>
    <form method="post" action="settings.cgi">
        <input type="hidden" name="action" value="test">
        <button type="submit" class="btn btn-secondary">Test API Connection</button>
    </form>
</div>
};

Whostmgr::HTMLInterface::sendfooter();
