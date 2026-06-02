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

# HTML escaping: prefer HTML::Entities when available, fall back to inline sub
my $encode_entities;
eval { require HTML::Entities; $encode_entities = \&HTML::Entities::encode_entities; };
if ($@) {
    $encode_entities = sub {
        my ($str) = @_;
        return '' unless defined $str;
        $str =~ s/&/&amp;/g;
        $str =~ s/</&lt;/g;
        $str =~ s/>/&gt;/g;
        $str =~ s/"/&quot;/g;
        $str =~ s/'/&#x27;/g;
        return $str;
    };
}

# CSRF token from WHM session environment
my $EXPECTED_CSRF = $ENV{'cp_security_token'} || '';

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
    if (!$EXPECTED_CSRF || ($form->{csrf_token} || '') ne $EXPECTED_CSRF) {
        $message = 'Invalid or missing security token. Please reload the page and try again.';
        $message_type = 'error';
    } else {
        # Keep existing api_key if the field was left blank (not pre-filled in form).
        my $existing_settings = $config->load();
        my $new_api_key = ($form->{api_key} && $form->{api_key} =~ /\S/)
            ? $form->{api_key}
            : $existing_settings->{api_key};

        my $new_config = {
            api_url        => $form->{api_url} || 'https://api.ephemera.email',
            api_key        => $new_api_key || '',
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
}

# Handle test connection
if ($form->{action} && $form->{action} eq 'test') {
    if (!$EXPECTED_CSRF || ($form->{csrf_token} || '') ne $EXPECTED_CSRF) {
        $message = 'Invalid or missing security token. Please reload the page and try again.';
        $message_type = 'error';
    } else {
        my $api = Cpanel::Ephemera::API->new();
        my $result = $api->test_connection();

        if ($result->{success}) {
            $message = 'Connection successful!';
            $message_type = 'success';
        } else {
            $message = 'Connection test failed. Please check your API key and URL.';
            $message_type = 'error';
        }
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
    my $e_msg      = $encode_entities->($message);
    my $e_msg_type = $encode_entities->($message_type);
    print qq{<div class="alert alert-$e_msg_type">$e_msg</div>};
}

my $e_csrf    = $encode_entities->($EXPECTED_CSRF);
my $e_api_url = $encode_entities->($settings->{api_url});
# api_key is intentionally not pre-filled to avoid rendering the stored secret into HTML.

print qq{
    <form method="post" action="settings.cgi">
        <input type="hidden" name="action" value="save">
        <input type="hidden" name="csrf_token" value="$e_csrf">

        <div class="form-group">
            <label for="api_url">Ephemera API URL</label>
            <input type="text" id="api_url" name="api_url"
                   value="$e_api_url"
                   placeholder="https://api.ephemera.email">
        </div>

        <div class="form-group">
            <label for="api_key">Provider API Key</label>
            <input type="password" id="api_key" name="api_key"
                   placeholder="Enter new API key to change (leave blank to keep current)">
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
        <input type="hidden" name="csrf_token" value="$e_csrf">
        <button type="submit" class="btn btn-secondary">Test API Connection</button>
    </form>
</div>
};

Whostmgr::HTMLInterface::sendfooter();
