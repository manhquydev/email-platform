#!/usr/local/cpanel/3rdparty/bin/perl
# WHM Ephemera Plugin - Main Dashboard
# /usr/local/cpanel/whostmgr/docroot/cgi/ephemera/index.cgi

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

# Check permissions
unless (Whostmgr::ACLS::hasroot()) {
    print "Content-type: text/html\r\n\r\n";
    print "Access Denied";
    exit;
}

print "Content-type: text/html\r\n\r\n";
Whostmgr::HTMLInterface::defheader(
    'Ephemera Email Hosting',
    '/images/ephemera_icon.png',
    '/cgi/ephemera/'
);

# Load config and API
my $config = Cpanel::Ephemera::Config->new();
my $settings = $config->load();
my $api = Cpanel::Ephemera::API->new();

# Get provider info if configured
my $provider_info = {};
my $usage = {};
if ($settings->{api_key}) {
    my $result = $api->get_provider_info();
    $provider_info = $result->{data}{provider} if $result->{success};

    my $usage_result = $api->get_usage();
    $usage = $usage_result->{data}{usage} if $usage_result->{success};
}

# Output HTML
print qq{
<style>
.ephemera-dashboard {
    font-family: 'Open Sans', sans-serif;
    max-width: 1200px;
    margin: 0 auto;
}
.ephemera-dashboard h1 {
    color: #333;
    border-bottom: 2px solid #2196F3;
    padding-bottom: 10px;
}
.dashboard-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 20px;
    margin: 20px 0;
}
.dashboard-card {
    background: #fff;
    border: 1px solid #ddd;
    border-radius: 8px;
    padding: 20px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}
.dashboard-card h3 {
    margin-top: 0;
    color: #2196F3;
    border-bottom: 1px solid #eee;
    padding-bottom: 10px;
}
.stat-value {
    font-size: 2em;
    font-weight: bold;
    color: #333;
}
.stat-label {
    color: #666;
    font-size: 0.9em;
}
.status-active { color: #4CAF50; }
.status-pending { color: #FF9800; }
.status-error { color: #F44336; }
.quick-links a {
    display: block;
    padding: 10px 15px;
    margin: 5px 0;
    background: #f5f5f5;
    border-radius: 4px;
    text-decoration: none;
    color: #333;
}
.quick-links a:hover {
    background: #e3f2fd;
}
.alert-warning {
    background: #fff3cd;
    border: 1px solid #ffc107;
    color: #856404;
    padding: 15px;
    border-radius: 4px;
    margin: 20px 0;
}
</style>

<div class="ephemera-dashboard">
    <h1>Ephemera Email Hosting</h1>
};

# Check if configured
unless ($settings->{api_key}) {
    print qq{
    <div class="alert-warning">
        <strong>Setup Required:</strong> Please configure your Provider API Key to get started.
        <br><br>
        <a href="settings.cgi" class="btn btn-primary">Configure Settings</a>
    </div>
    };
} else {
    my $status_class = $provider_info->{status} eq 'ACTIVE' ? 'status-active' : 'status-pending';
    my $tenant_count = $usage->{summary}{tenants} || 0;
    my $mailbox_count = $usage->{summary}{mailboxes} || 0;

    print qq{
    <div class="dashboard-grid">
        <div class="dashboard-card">
            <h3>Provider Status</h3>
            <p><strong>Name:</strong> $provider_info->{name}</p>
            <p><strong>Tier:</strong> $provider_info->{tier}</p>
            <p><strong>Status:</strong> <span class="$status_class">$provider_info->{status}</span></p>
        </div>

        <div class="dashboard-card">
            <h3>Usage Summary</h3>
            <p><span class="stat-value">$tenant_count</span> <span class="stat-label">Active Tenants</span></p>
            <p><span class="stat-value">$mailbox_count</span> <span class="stat-label">Total Mailboxes</span></p>
        </div>

        <div class="dashboard-card">
            <h3>Quick Actions</h3>
            <div class="quick-links">
                <a href="settings.cgi">⚙️ Provider Settings</a>
                <a href="tenants.cgi">👥 Manage Tenants</a>
                <a href="usage.cgi">📊 Usage Reports</a>
            </div>
        </div>

        <div class="dashboard-card">
            <h3>Configuration</h3>
            <p><strong>API URL:</strong> $settings->{api_url}</p>
            <p><strong>Default Plan:</strong> $settings->{default_plan}</p>
            <p><strong>Auto-Provision:</strong> } . ($settings->{auto_provision} ? 'Enabled' : 'Disabled') . qq{</p>
        </div>
    </div>
    };
}

print qq{
</div>
};

Whostmgr::HTMLInterface::sendfooter();
