---
phase: "02"
title: "cPanel/WHM Plugin Development"
status: pending
priority: P1
effort: 2 weeks
---

# Phase 02: cPanel/WHM Plugin Development

## Context Links
- [Plan Overview](plan.md)
- [Phase 01: Provider API](phase-01-hosting-provider-api.md)
- [cPanel Plugin Development Guide](https://api.docs.cpanel.net/)

## Overview

Xây dựng cPanel/WHM plugin cho phép hosting providers và end-users quản lý email hosting trực tiếp từ cPanel interface.

## Key Insights

1. **WHM Admin Plugin** - Cho reseller/admin quản lý provider settings
2. **cPanel User Plugin** - Cho end-user quản lý mailboxes
3. **UAPI Integration** - Modern API cho cPanel v120+
4. **Hooks System** - Auto-provision khi tạo account mới

**Nguồn**: [cPanel Developer Docs](https://api.docs.cpanel.net/)

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         WHM (Admin)                          │
│  ┌─────────────────────────────────────────────────────────┐│
│  │              Ephemera WHM Plugin                        ││
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐               ││
│  │  │ Settings │ │ Tenants  │ │  Usage   │               ││
│  │  │   Page   │ │   List   │ │  Report  │               ││
│  │  └──────────┘ └──────────┘ └──────────┘               ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      cPanel (End User)                       │
│  ┌─────────────────────────────────────────────────────────┐│
│  │              Ephemera cPanel Plugin                     ││
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  ││
│  │  │ Mailbox  │ │ Webmail  │ │Forwarding│ │  Quota   │  ││
│  │  │  Create  │ │  Login   │ │  Rules   │ │  Usage   │  ││
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘  ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  Ephemera Provider API                       │
│                   (From Phase 01)                            │
└─────────────────────────────────────────────────────────────┘
```

## File Structure

```
/usr/local/cpanel/
├── Cpanel/
│   └── Ephemera/              # Perl modules
│       ├── API.pm             # UAPI wrapper
│       ├── Config.pm          # Configuration handler
│       └── Utils.pm           # Helper functions
├── base/frontend/jupiter/
│   └── ephemera/              # cPanel UI (user)
│       ├── index.tt           # Main template
│       ├── mailboxes.tt       # Mailbox management
│       ├── webmail.tt         # Webmail SSO
│       └── assets/
│           ├── ephemera.css
│           └── ephemera.js
├── whostmgr/docroot/
│   └── cgi/ephemera/          # WHM UI (admin)
│       ├── index.cgi          # Main page
│       ├── settings.cgi       # Provider settings
│       ├── tenants.cgi        # Tenant management
│       └── templates/
│           ├── header.tt
│           ├── footer.tt
│           └── *.tt
└── scripts/
    └── ephemera_hooks.pl      # cPanel hooks
```

## Implementation Steps

### Step 1: WHM Plugin Structure (Day 1-2)

```perl
#!/usr/local/cpanel/3rdparty/bin/perl
# /usr/local/cpanel/whostmgr/docroot/cgi/ephemera/index.cgi

use strict;
use warnings;

use Whostmgr::HTMLInterface ();
use Whostmgr::ACLS          ();
use Cpanel::Form            ();
use JSON::XS                ();
use LWP::UserAgent          ();

Whostmgr::ACLS::init_acls();

# Check permissions
if (!Whostmgr::ACLS::hasroot()) {
    print "Content-type: text/html\r\n\r\n";
    print "Access Denied";
    exit;
}

my $form = Cpanel::Form::parseform();

print "Content-type: text/html\r\n\r\n";
Whostmgr::HTMLInterface::defheader('Ephemera Email Hosting', '/images/ephemera_icon.png', '/cgi/ephemera/');

# Load config
my $config = load_config();

# Main template
print qq{
<div class="ephemera-admin">
    <h1>Ephemera Email Hosting</h1>

    <div class="section">
        <h2>Provider Status</h2>
        <div id="provider-status">Loading...</div>
    </div>

    <div class="section">
        <h2>Quick Actions</h2>
        <ul>
            <li><a href="settings.cgi">Provider Settings</a></li>
            <li><a href="tenants.cgi">Manage Tenants</a></li>
            <li><a href="usage.cgi">Usage Reports</a></li>
        </ul>
    </div>

    <div class="section">
        <h2>Recent Activity</h2>
        <div id="recent-activity">Loading...</div>
    </div>
</div>

<script src="ephemera.js"></script>
};

Whostmgr::HTMLInterface::sendfooter();

sub load_config {
    my $config_file = '/var/cpanel/ephemera/config.json';
    return {} unless -e $config_file;

    open my $fh, '<', $config_file or return {};
    local $/;
    my $json = <$fh>;
    close $fh;

    return JSON::XS::decode_json($json);
}
```

### Step 2: Provider Settings Page (Day 2-3)

```perl
#!/usr/local/cpanel/3rdparty/bin/perl
# /usr/local/cpanel/whostmgr/docroot/cgi/ephemera/settings.cgi

use strict;
use warnings;

use Whostmgr::HTMLInterface ();
use Whostmgr::ACLS          ();
use Cpanel::Form            ();
use JSON::XS                ();

Whostmgr::ACLS::init_acls();

if (!Whostmgr::ACLS::hasroot()) {
    print "Content-type: text/html\r\n\r\n";
    print "Access Denied";
    exit;
}

my $form = Cpanel::Form::parseform();

# Handle form submission
if ($form->{'action'} eq 'save') {
    save_settings($form);
}

print "Content-type: text/html\r\n\r\n";
Whostmgr::HTMLInterface::defheader('Ephemera Settings', '/images/ephemera_icon.png', '/cgi/ephemera/');

my $config = load_config();

print qq{
<form method="post" action="settings.cgi">
    <input type="hidden" name="action" value="save">

    <div class="form-group">
        <label for="api_url">Ephemera API URL</label>
        <input type="text" id="api_url" name="api_url"
               value="$config->{api_url}" placeholder="https://api.ephemera.email">
    </div>

    <div class="form-group">
        <label for="api_key">Provider API Key</label>
        <input type="password" id="api_key" name="api_key"
               value="$config->{api_key}" placeholder="eph_provider_...">
        <small>Get your API key from <a href="https://ephemera.email/providers" target="_blank">ephemera.email/providers</a></small>
    </div>

    <div class="form-group">
        <label for="default_plan">Default Plan for New Accounts</label>
        <select id="default_plan" name="default_plan">
            <option value="LITE" ${\($config->{default_plan} eq 'LITE' ? 'selected' : '')}>Lite (5 mailboxes)</option>
            <option value="PRO" ${\($config->{default_plan} eq 'PRO' ? 'selected' : '')}>Pro (Unlimited)</option>
            <option value="BUSINESS" ${\($config->{default_plan} eq 'BUSINESS' ? 'selected' : '')}>Business (Full features)</option>
        </select>
    </div>

    <div class="form-group">
        <label>
            <input type="checkbox" name="auto_provision" ${\($config->{auto_provision} ? 'checked' : '')}>
            Auto-provision email for new cPanel accounts
        </label>
    </div>

    <button type="submit" class="btn btn-primary">Save Settings</button>
</form>

<hr>

<h3>Test Connection</h3>
<button onclick="testConnection()" class="btn btn-secondary">Test API Connection</button>
<div id="test-result"></div>

<script>
function testConnection() {
    fetch('/cgi/ephemera/api.cgi?action=test')
        .then(r => r.json())
        .then(data => {
            document.getElementById('test-result').innerHTML =
                data.success ? '<span class="success">✓ Connected</span>' : '<span class="error">✗ ' + data.error + '</span>';
        });
}
</script>
};

Whostmgr::HTMLInterface::sendfooter();

sub save_settings {
    my ($form) = @_;

    my $config = {
        api_url       => $form->{api_url} || 'https://api.ephemera.email',
        api_key       => $form->{api_key},
        default_plan  => $form->{default_plan} || 'LITE',
        auto_provision => $form->{auto_provision} ? 1 : 0,
    };

    my $config_dir = '/var/cpanel/ephemera';
    mkdir $config_dir unless -d $config_dir;

    open my $fh, '>', "$config_dir/config.json" or die "Cannot write config: $!";
    print $fh JSON::XS::encode_json($config);
    close $fh;

    chmod 0600, "$config_dir/config.json";
}

sub load_config {
    my $config_file = '/var/cpanel/ephemera/config.json';
    return {
        api_url => 'https://api.ephemera.email',
        default_plan => 'LITE',
        auto_provision => 0,
    } unless -e $config_file;

    open my $fh, '<', $config_file or return {};
    local $/;
    my $json = <$fh>;
    close $fh;

    return JSON::XS::decode_json($json);
}
```

### Step 3: cPanel User Plugin (Day 4-6)

```perl
# /usr/local/cpanel/Cpanel/Ephemera/API.pm

package Cpanel::Ephemera::API;

use strict;
use warnings;

use Cpanel::JSON            ();
use LWP::UserAgent          ();
use HTTP::Request::Common   ();

our $VERSION = '1.0.0';

sub new {
    my ($class) = @_;

    my $config = _load_config();

    my $self = {
        api_url => $config->{api_url},
        api_key => $config->{api_key},
        ua      => LWP::UserAgent->new(timeout => 30),
    };

    return bless $self, $class;
}

sub list_mailboxes {
    my ($self, $tenant_id) = @_;
    return $self->_request('GET', "/v1/provider/tenants/$tenant_id/mailboxes");
}

sub create_mailbox {
    my ($self, $tenant_id, $data) = @_;
    return $self->_request('POST', "/v1/provider/tenants/$tenant_id/mailboxes", $data);
}

sub delete_mailbox {
    my ($self, $tenant_id, $email) = @_;
    return $self->_request('DELETE', "/v1/provider/tenants/$tenant_id/mailboxes/$email");
}

sub update_password {
    my ($self, $tenant_id, $email, $password) = @_;
    return $self->_request('POST', "/v1/provider/tenants/$tenant_id/mailboxes/$email/password", {
        password => $password,
    });
}

sub get_usage {
    my ($self, $tenant_id) = @_;
    return $self->_request('GET', "/v1/provider/tenants/$tenant_id/usage");
}

sub get_webmail_sso {
    my ($self, $tenant_id, $email) = @_;
    return $self->_request('POST', "/v1/provider/tenants/$tenant_id/mailboxes/$email/sso");
}

sub _request {
    my ($self, $method, $path, $body) = @_;

    my $url = $self->{api_url} . $path;

    my $req;
    if ($method eq 'GET') {
        $req = HTTP::Request->new(GET => $url);
    } elsif ($method eq 'POST') {
        $req = HTTP::Request->new(POST => $url);
        $req->content_type('application/json');
        $req->content(Cpanel::JSON::Dump($body)) if $body;
    } elsif ($method eq 'DELETE') {
        $req = HTTP::Request->new(DELETE => $url);
    }

    $req->header('X-Provider-Key' => $self->{api_key});

    my $res = $self->{ua}->request($req);

    if ($res->is_success) {
        return { success => 1, data => Cpanel::JSON::Load($res->content) };
    } else {
        return { success => 0, error => $res->status_line };
    }
}

sub _load_config {
    my $config_file = '/var/cpanel/ephemera/config.json';
    return {} unless -e $config_file;

    open my $fh, '<', $config_file or return {};
    local $/;
    my $json = <$fh>;
    close $fh;

    return Cpanel::JSON::Load($json);
}

1;
```

### Step 4: cPanel User Interface (Day 6-8)

```html
<!-- /usr/local/cpanel/base/frontend/jupiter/ephemera/index.tt -->
[%
    USE CPScalar;

    SET CPANEL.CPVAR.dprefix = "../";

    Api2.pre_exec("Ephemera", "list_mailboxes");
    SET mailboxes = Api2.exec("Ephemera", "list_mailboxes", {});
    Api2.post_exec("Ephemera", "list_mailboxes");

    Api2.pre_exec("Ephemera", "get_usage");
    SET usage = Api2.exec("Ephemera", "get_usage", {});
    Api2.post_exec("Ephemera", "get_usage");
%]

[% WRAPPER '_assets/master.html.tt'
    app_key = 'ephemera'
    page_title = 'Ephemera Email'
    include_legacy_stylesheets = 0
    include_legacy_scripts = 0
%]

<div class="body-content">

    <!-- Usage Summary -->
    <div class="section">
        <h2>Email Usage</h2>
        <div class="row">
            <div class="col-md-4">
                <div class="panel panel-default">
                    <div class="panel-heading">Mailboxes</div>
                    <div class="panel-body">
                        <h3>[% usage.mailboxes %] / [% usage.limit %]</h3>
                    </div>
                </div>
            </div>
            <div class="col-md-4">
                <div class="panel panel-default">
                    <div class="panel-heading">Storage Used</div>
                    <div class="panel-body">
                        <h3>[% usage.storage_used_mb %] MB</h3>
                    </div>
                </div>
            </div>
            <div class="col-md-4">
                <div class="panel panel-default">
                    <div class="panel-heading">Messages</div>
                    <div class="panel-body">
                        <h3>[% usage.total_messages %]</h3>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Mailbox List -->
    <div class="section">
        <h2>Email Accounts</h2>

        <button class="btn btn-primary" onclick="showCreateModal()">
            <span class="fas fa-plus"></span> Create Email Account
        </button>

        <table class="table table-striped sortable" id="mailbox-table">
            <thead>
                <tr>
                    <th>Email Address</th>
                    <th>Display Name</th>
                    <th>Quota</th>
                    <th>Used</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                [% FOREACH mailbox IN mailboxes %]
                <tr>
                    <td>[% mailbox.email %]</td>
                    <td>[% mailbox.display_name %]</td>
                    <td>[% mailbox.quota_mb %] MB</td>
                    <td>[% mailbox.used_mb %] MB</td>
                    <td>
                        <a href="webmail.html?email=[% mailbox.email | uri %]" class="btn btn-sm btn-info">
                            <span class="fas fa-envelope"></span> Webmail
                        </a>
                        <button class="btn btn-sm btn-warning" onclick="changePassword('[% mailbox.email %]')">
                            <span class="fas fa-key"></span> Password
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="deleteMailbox('[% mailbox.email %]')">
                            <span class="fas fa-trash"></span>
                        </button>
                    </td>
                </tr>
                [% END %]
            </tbody>
        </table>
    </div>

</div>

<!-- Create Mailbox Modal -->
<div class="modal fade" id="createModal" tabindex="-1">
    <div class="modal-dialog">
        <div class="modal-content">
            <div class="modal-header">
                <h4 class="modal-title">Create Email Account</h4>
                <button type="button" class="close" data-dismiss="modal">&times;</button>
            </div>
            <form id="create-form" action="mailboxes.html" method="post">
                <div class="modal-body">
                    <input type="hidden" name="action" value="create">

                    <div class="form-group">
                        <label>Email Address</label>
                        <div class="input-group">
                            <input type="text" name="local_part" class="form-control" required>
                            <span class="input-group-addon">@</span>
                            <select name="domain" class="form-control">
                                [% FOREACH domain IN domains %]
                                <option value="[% domain %]">[% domain %]</option>
                                [% END %]
                            </select>
                        </div>
                    </div>

                    <div class="form-group">
                        <label>Password</label>
                        <input type="password" name="password" class="form-control" required minlength="8">
                    </div>

                    <div class="form-group">
                        <label>Display Name (optional)</label>
                        <input type="text" name="display_name" class="form-control">
                    </div>

                    <div class="form-group">
                        <label>Quota (MB)</label>
                        <input type="number" name="quota_mb" class="form-control" value="1024">
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-dismiss="modal">Cancel</button>
                    <button type="submit" class="btn btn-primary">Create</button>
                </div>
            </form>
        </div>
    </div>
</div>

<script>
function showCreateModal() {
    $('#createModal').modal('show');
}

function changePassword(email) {
    var password = prompt('Enter new password for ' + email);
    if (password && password.length >= 8) {
        // AJAX call to change password
        $.post('mailboxes.html', {
            action: 'password',
            email: email,
            password: password
        }, function(response) {
            if (response.success) {
                alert('Password changed successfully');
            } else {
                alert('Error: ' + response.error);
            }
        });
    } else if (password) {
        alert('Password must be at least 8 characters');
    }
}

function deleteMailbox(email) {
    if (confirm('Are you sure you want to delete ' + email + '? This cannot be undone.')) {
        $.post('mailboxes.html', {
            action: 'delete',
            email: email
        }, function(response) {
            if (response.success) {
                location.reload();
            } else {
                alert('Error: ' + response.error);
            }
        });
    }
}
</script>

[% END %]
```

### Step 5: cPanel Hooks (Day 9-10)

```perl
#!/usr/local/cpanel/3rdparty/bin/perl
# /usr/local/cpanel/scripts/ephemera_hooks.pl

use strict;
use warnings;

use Cpanel::Hooks  ();
use JSON::XS       ();

# Register hooks
my $hooks = [
    {
        'category' => 'Whostmgr',
        'event'    => 'Accounts::Create',
        'stage'    => 'post',
        'hook'     => '/usr/local/cpanel/scripts/ephemera_hooks.pl --event=account_create',
        'exectype' => 'script',
    },
    {
        'category' => 'Whostmgr',
        'event'    => 'Accounts::Remove',
        'stage'    => 'pre',
        'hook'     => '/usr/local/cpanel/scripts/ephemera_hooks.pl --event=account_remove',
        'exectype' => 'script',
    },
    {
        'category' => 'Whostmgr',
        'event'    => 'Accounts::suspendacct',
        'stage'    => 'post',
        'hook'     => '/usr/local/cpanel/scripts/ephemera_hooks.pl --event=account_suspend',
        'exectype' => 'script',
    },
    {
        'category' => 'Whostmgr',
        'event'    => 'Accounts::unsuspendacct',
        'stage'    => 'post',
        'hook'     => '/usr/local/cpanel/scripts/ephemera_hooks.pl --event=account_unsuspend',
        'exectype' => 'script',
    },
];

# Handle events
my $event = get_arg('--event');

if ($event eq 'account_create') {
    handle_account_create();
} elsif ($event eq 'account_remove') {
    handle_account_remove();
} elsif ($event eq 'account_suspend') {
    handle_account_suspend();
} elsif ($event eq 'account_unsuspend') {
    handle_account_unsuspend();
} elsif ($event eq 'register') {
    register_hooks();
}

sub handle_account_create {
    my $input = get_hook_input();
    my $user = $input->{user};
    my $domain = $input->{domain};

    my $config = load_config();
    return unless $config->{auto_provision};

    # Create tenant via API
    my $api = Cpanel::Ephemera::API->new();
    my $result = $api->create_tenant({
        externalId    => $user,
        customerEmail => "$user\@$domain",
        plan          => $config->{default_plan},
    });

    if ($result->{success}) {
        # Add domain
        $api->add_domain($result->{data}{tenant}{id}, $domain);

        # Store tenant ID for this cPanel user
        save_user_tenant_id($user, $result->{data}{tenant}{id});

        log_event("Created Ephemera tenant for $user: $result->{data}{tenant}{id}");
    } else {
        log_event("Failed to create Ephemera tenant for $user: $result->{error}");
    }
}

sub handle_account_remove {
    my $input = get_hook_input();
    my $user = $input->{user};

    my $tenant_id = get_user_tenant_id($user);
    return unless $tenant_id;

    my $api = Cpanel::Ephemera::API->new();
    my $result = $api->terminate_tenant($tenant_id);

    if ($result->{success}) {
        log_event("Terminated Ephemera tenant for $user: $tenant_id");
    }
}

sub handle_account_suspend {
    my $input = get_hook_input();
    my $user = $input->{user};

    my $tenant_id = get_user_tenant_id($user);
    return unless $tenant_id;

    my $api = Cpanel::Ephemera::API->new();
    $api->suspend_tenant($tenant_id);
}

sub handle_account_unsuspend {
    my $input = get_hook_input();
    my $user = $input->{user};

    my $tenant_id = get_user_tenant_id($user);
    return unless $tenant_id;

    my $api = Cpanel::Ephemera::API->new();
    $api->unsuspend_tenant($tenant_id);
}

sub register_hooks {
    foreach my $hook (@$hooks) {
        Cpanel::Hooks::manage_hooks('add', $hook);
    }
    print "Ephemera hooks registered successfully\n";
}

# Helper functions
sub get_hook_input {
    my $json = do { local $/; <STDIN> };
    return JSON::XS::decode_json($json);
}

sub load_config {
    my $file = '/var/cpanel/ephemera/config.json';
    return {} unless -e $file;
    open my $fh, '<', $file or return {};
    local $/;
    return JSON::XS::decode_json(<$fh>);
}

sub save_user_tenant_id {
    my ($user, $tenant_id) = @_;
    my $file = "/var/cpanel/ephemera/users/$user.json";
    mkdir '/var/cpanel/ephemera/users' unless -d '/var/cpanel/ephemera/users';
    open my $fh, '>', $file or return;
    print $fh JSON::XS::encode_json({ tenant_id => $tenant_id });
    close $fh;
}

sub get_user_tenant_id {
    my ($user) = @_;
    my $file = "/var/cpanel/ephemera/users/$user.json";
    return unless -e $file;
    open my $fh, '<', $file or return;
    local $/;
    my $data = JSON::XS::decode_json(<$fh>);
    return $data->{tenant_id};
}

sub log_event {
    my ($msg) = @_;
    open my $fh, '>>', '/var/log/ephemera.log' or return;
    print $fh localtime() . " - $msg\n";
    close $fh;
}

sub get_arg {
    my ($name) = @_;
    foreach my $arg (@ARGV) {
        if ($arg =~ /^$name=(.+)$/) {
            return $1;
        }
    }
    return '';
}
```

### Step 6: Installation Script (Day 10)

```bash
#!/bin/bash
# install.sh - Ephemera cPanel Plugin Installer

set -e

PLUGIN_VERSION="1.0.0"
API_URL="${API_URL:-https://api.ephemera.email}"

echo "Installing Ephemera cPanel Plugin v${PLUGIN_VERSION}..."

# Check cPanel version
CPANEL_VERSION=$(cat /usr/local/cpanel/version)
echo "cPanel version: ${CPANEL_VERSION}"

# Create directories
mkdir -p /usr/local/cpanel/Cpanel/Ephemera
mkdir -p /usr/local/cpanel/base/frontend/jupiter/ephemera
mkdir -p /usr/local/cpanel/whostmgr/docroot/cgi/ephemera
mkdir -p /var/cpanel/ephemera

# Copy Perl modules
cp -r lib/Cpanel/Ephemera/* /usr/local/cpanel/Cpanel/Ephemera/

# Copy cPanel UI
cp -r cpanel/* /usr/local/cpanel/base/frontend/jupiter/ephemera/

# Copy WHM UI
cp -r whm/* /usr/local/cpanel/whostmgr/docroot/cgi/ephemera/

# Copy hooks
cp scripts/ephemera_hooks.pl /usr/local/cpanel/scripts/
chmod +x /usr/local/cpanel/scripts/ephemera_hooks.pl

# Register AppConfig
cat > /var/cpanel/apps/ephemera.conf << EOF
name=Ephemera Email
url=ephemera/index.html
group=mail
acls=all
feature=ephemera
EOF

# Register WHM feature
cat > /var/cpanel/features/ephemera << EOF
ephemera=1
EOF

# Register hooks
/usr/local/cpanel/scripts/ephemera_hooks.pl --event=register

# Rebuild Apache config
/usr/local/cpanel/scripts/rebuildhttpdconf
/usr/local/cpanel/scripts/restartsrv_httpd

echo "Installation complete!"
echo ""
echo "Next steps:"
echo "1. Go to WHM > Ephemera Email Hosting"
echo "2. Enter your Provider API Key"
echo "3. Configure default settings"
```

## Todo List

- [ ] Create WHM admin pages (index, settings, tenants)
- [ ] Create Perl API wrapper module
- [ ] Create cPanel user interface templates
- [ ] Implement cPanel hooks for auto-provisioning
- [ ] Create installation/uninstallation scripts
- [ ] Add Webmail SSO functionality
- [ ] Test on cPanel v120+
- [ ] Create plugin package (.tar.gz)
- [ ] Write installation documentation

## Success Criteria

- [ ] WHM admin can configure provider settings
- [ ] cPanel users can create/manage mailboxes
- [ ] Auto-provision works on new account creation
- [ ] Webmail SSO redirects correctly
- [ ] Plugin installs without errors on cPanel v120+

## Security Considerations

1. **API Key Storage**: Stored with 0600 permissions
2. **Input Validation**: All user inputs sanitized
3. **CSRF Protection**: Use cPanel's built-in CSRF tokens
4. **Audit Logging**: All actions logged to /var/log/ephemera.log

## Next Steps

After completing Phase 02:
→ [Phase 03: WHMCS Module](phase-03-whmcs-module.md)
