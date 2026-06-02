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

# CSRF token: WHM sets cp_security_token in the URL for authenticated sessions;
# read it from the environment so state-changing POSTs can be tied to the session.
my $EXPECTED_CSRF = $ENV{'cp_security_token'} || '';

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
    # Reject requests that don't carry the session security token to prevent CSRF.
    if (!$EXPECTED_CSRF || ($form->{csrf_token} || '') ne $EXPECTED_CSRF) {
        $message = 'Invalid or missing security token. Please reload the page and try again.';
        $message_type = 'error';
    }
    elsif ($form->{action} eq 'suspend' && $form->{tenant_id}) {
        my $result = $api->suspend_tenant($form->{tenant_id});
        if ($result->{success}) {
            $message = 'Tenant suspended successfully.';
            $message_type = 'success';
        } else {
            $message = 'Failed to suspend tenant.';
            $message_type = 'error';
        }
    }
    elsif ($form->{action} eq 'unsuspend' && $form->{tenant_id}) {
        my $result = $api->unsuspend_tenant($form->{tenant_id});
        if ($result->{success}) {
            $message = 'Tenant unsuspended successfully.';
            $message_type = 'success';
        } else {
            $message = 'Failed to unsuspend tenant.';
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
    my $e_msg      = $encode_entities->($message);
    my $e_msg_type = $encode_entities->($message_type);
    print qq{<div class="alert alert-$e_msg_type">$e_msg</div>};
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

    my $e_csrf = $encode_entities->($EXPECTED_CSRF);

    for my $tenant (@$tenants) {
        my $raw_status   = $tenant->{status} || '';
        my $status_class = 'status-' . lc($raw_status);
        my $domain_count = $tenant->{_count}{domains} || 0;
        my $created      = substr($tenant->{createdAt} || '', 0, 10);

        my $e_ext_id  = $encode_entities->($tenant->{externalId});
        my $e_email   = $encode_entities->($tenant->{customerEmail});
        my $e_plan    = $encode_entities->($tenant->{plan});
        my $e_status  = $encode_entities->($raw_status);
        my $e_sc      = $encode_entities->($status_class);
        my $e_count   = $encode_entities->("$domain_count");
        my $e_created = $encode_entities->($created);
        my $e_id      = $encode_entities->($tenant->{id});

        print qq{
            <tr>
                <td>$e_ext_id</td>
                <td>$e_email</td>
                <td>$e_plan</td>
                <td><span class="$e_sc">$e_status</span></td>
                <td>$e_count</td>
                <td>$e_created</td>
                <td>
        };

        if ($raw_status eq 'ACTIVE') {
            print qq{
                <form method="post" style="display:inline">
                    <input type="hidden" name="action" value="suspend">
                    <input type="hidden" name="tenant_id" value="$e_id">
                    <input type="hidden" name="csrf_token" value="$e_csrf">
                    <button type="submit" class="btn-sm btn-warning">Suspend</button>
                </form>
            };
        } elsif ($raw_status eq 'SUSPENDED') {
            print qq{
                <form method="post" style="display:inline">
                    <input type="hidden" name="action" value="unsuspend">
                    <input type="hidden" name="tenant_id" value="$e_id">
                    <input type="hidden" name="csrf_token" value="$e_csrf">
                    <button type="submit" class="btn-sm btn-success">Unsuspend</button>
                </form>
            };
        }

        print qq{
                <a href="tenant_detail.cgi?id=$e_id" class="btn-sm btn-info">Details</a>
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
