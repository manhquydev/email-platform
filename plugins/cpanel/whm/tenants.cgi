#!/usr/local/cpanel/3rdparty/bin/perl
# WHM Ephemera Plugin - Tenants Management
# /usr/local/cpanel/whostmgr/docroot/cgi/ephemera/tenants.cgi

use strict;
use warnings;

use lib '/usr/local/cpanel';
use Whostmgr::HTMLInterface ();
use Whostmgr::ACLS          ();
use Cpanel::Form            ();

use lib '/usr/local/cpanel/Cpanel/Ephemera';
use Cpanel::Ephemera::API    ();
use Cpanel::Ephemera::Config ();

Whostmgr::ACLS::init_acls();

unless (Whostmgr::ACLS::hasroot()) {
    print "Content-type: text/html\r\n\r\n";
    print "Access Denied";
    exit;
}

my $form = Cpanel::Form::parseform();
my $api = Cpanel::Ephemera::API->new();
my $message = '';
my $message_type = '';

# Handle actions
if ($form->{action}) {
    if ($form->{action} eq 'suspend' && $form->{tenant_id}) {
        my $result = $api->suspend_tenant($form->{tenant_id});
        if ($result->{success}) {
            $message = 'Tenant suspended successfully.';
            $message_type = 'success';
        } else {
            $message = "Failed to suspend: $result->{error}";
            $message_type = 'error';
        }
    }
    elsif ($form->{action} eq 'unsuspend' && $form->{tenant_id}) {
        my $result = $api->unsuspend_tenant($form->{tenant_id});
        if ($result->{success}) {
            $message = 'Tenant unsuspended successfully.';
            $message_type = 'success';
        } else {
            $message = "Failed to unsuspend: $result->{error}";
            $message_type = 'error';
        }
    }
}

# Fetch tenants
my $result = $api->list_tenants({ limit => 100 });
my $tenants = $result->{success} ? $result->{data}{tenants} : [];

print "Content-type: text/html\r\n\r\n";
Whostmgr::HTMLInterface::defheader(
    'Manage Tenants',
    '/images/ephemera_icon.png',
    '/cgi/ephemera/'
);

print qq{
<style>
.tenants-page {
    max-width: 1200px;
    margin: 20px auto;
}
.tenant-table {
    width: 100%;
    border-collapse: collapse;
    background: #fff;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}
.tenant-table th, .tenant-table td {
    padding: 12px;
    text-align: left;
    border-bottom: 1px solid #ddd;
}
.tenant-table th {
    background: #f5f5f5;
    font-weight: bold;
}
.tenant-table tr:hover {
    background: #f9f9f9;
}
.status-active { color: #4CAF50; font-weight: bold; }
.status-suspended { color: #FF9800; font-weight: bold; }
.status-terminated { color: #F44336; font-weight: bold; }
.btn-sm {
    padding: 5px 10px;
    font-size: 12px;
    border: none;
    border-radius: 3px;
    cursor: pointer;
    margin-right: 5px;
}
.btn-warning { background: #FF9800; color: white; }
.btn-success { background: #4CAF50; color: white; }
.btn-info { background: #2196F3; color: white; }
.alert {
    padding: 15px;
    border-radius: 4px;
    margin-bottom: 20px;
}
.alert-success { background: #d4edda; color: #155724; }
.alert-error { background: #f8d7da; color: #721c24; }
.back-link { margin-bottom: 20px; }
</style>

<div class="tenants-page">
    <p class="back-link"><a href="index.cgi">&larr; Back to Dashboard</a></p>
    <h2>Manage Tenants</h2>
};

if ($message) {
    print qq{<div class="alert alert-$message_type">$message</div>};
}

if (@$tenants) {
    print qq{
    <table class="tenant-table">
        <thead>
            <tr>
                <th>External ID</th>
                <th>Customer Email</th>
                <th>Plan</th>
                <th>Status</th>
                <th>Domains</th>
                <th>Created</th>
                <th>Actions</th>
            </tr>
        </thead>
        <tbody>
    };

    for my $tenant (@$tenants) {
        my $status_class = 'status-' . lc($tenant->{status});
        my $domain_count = $tenant->{_count}{domains} || 0;
        my $created = substr($tenant->{createdAt}, 0, 10);

        print qq{
            <tr>
                <td>$tenant->{externalId}</td>
                <td>$tenant->{customerEmail}</td>
                <td>$tenant->{plan}</td>
                <td><span class="$status_class">$tenant->{status}</span></td>
                <td>$domain_count</td>
                <td>$created</td>
                <td>
        };

        if ($tenant->{status} eq 'ACTIVE') {
            print qq{
                <form method="post" style="display:inline">
                    <input type="hidden" name="action" value="suspend">
                    <input type="hidden" name="tenant_id" value="$tenant->{id}">
                    <button type="submit" class="btn-sm btn-warning">Suspend</button>
                </form>
            };
        } elsif ($tenant->{status} eq 'SUSPENDED') {
            print qq{
                <form method="post" style="display:inline">
                    <input type="hidden" name="action" value="unsuspend">
                    <input type="hidden" name="tenant_id" value="$tenant->{id}">
                    <button type="submit" class="btn-sm btn-success">Unsuspend</button>
                </form>
            };
        }

        print qq{
                <a href="tenant_detail.cgi?id=$tenant->{id}" class="btn-sm btn-info">Details</a>
                </td>
            </tr>
        };
    }

    print qq{
        </tbody>
    </table>
    };
} else {
    print qq{<p>No tenants found. Tenants are created when cPanel accounts are provisioned with email hosting.</p>};
}

print qq{</div>};

Whostmgr::HTMLInterface::sendfooter();
