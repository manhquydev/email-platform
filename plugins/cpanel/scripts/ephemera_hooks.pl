#!/usr/local/cpanel/3rdparty/bin/perl
# Ephemera cPanel Hooks
# Auto-provision email on account create/suspend/remove
# /usr/local/cpanel/scripts/ephemera_hooks.pl

use strict;
use warnings;

use JSON::XS ();

use lib '/usr/local/cpanel/Cpanel/Ephemera';
use Cpanel::Ephemera::API    ();
use Cpanel::Ephemera::Config ();

our $VERSION = '1.0.0';

# Get command line argument
my $event = '';
foreach my $arg (@ARGV) {
    if ($arg =~ /^--event=(.+)$/) {
        $event = $1;
        last;
    }
}

# Route to handler
if ($event eq 'account_create') {
    handle_account_create();
}
elsif ($event eq 'account_remove') {
    handle_account_remove();
}
elsif ($event eq 'account_suspend') {
    handle_account_suspend();
}
elsif ($event eq 'account_unsuspend') {
    handle_account_unsuspend();
}
elsif ($event eq 'register') {
    register_hooks();
}
elsif ($event eq 'unregister') {
    unregister_hooks();
}
else {
    print "Usage: $0 --event=<event>\n";
    print "Events: account_create, account_remove, account_suspend, account_unsuspend, register, unregister\n";
    exit 1;
}

sub handle_account_create {
    my $input = get_hook_input();
    my $user = $input->{user} || $input->{args}{user} || '';
    my $domain = $input->{domain} || $input->{args}{domain} || '';

    return unless $user && $domain;

    my $config = Cpanel::Ephemera::Config->new();
    my $settings = $config->load();

    # Check if auto-provision is enabled
    return unless $settings->{auto_provision};

    log_event("Creating Ephemera tenant for $user ($domain)");

    my $api = Cpanel::Ephemera::API->new();

    # Create tenant
    my $result = $api->create_tenant({
        externalId    => "cpanel-$user",
        customerEmail => "$user\@$domain",
        customerName  => $user,
        plan          => $settings->{default_plan} || 'LITE',
    });

    if ($result->{success}) {
        my $tenant_id = $result->{data}{tenant}{id};

        # Save tenant ID for user
        $config->save_user_tenant($user, $tenant_id);

        # Add domain
        my $domain_result = $api->add_domain($tenant_id, $domain);

        if ($domain_result->{success}) {
            log_event("Created tenant $tenant_id for $user with domain $domain");
        } else {
            log_event("Created tenant $tenant_id for $user, but failed to add domain: $domain_result->{error}");
        }
    } else {
        log_event("Failed to create tenant for $user: $result->{error}");
    }
}

sub handle_account_remove {
    my $input = get_hook_input();
    my $user = $input->{user} || $input->{args}{user} || '';

    return unless $user;

    my $config = Cpanel::Ephemera::Config->new();
    my $tenant_id = $config->get_user_tenant($user);

    return unless $tenant_id;

    log_event("Terminating Ephemera tenant for $user ($tenant_id)");

    my $api = Cpanel::Ephemera::API->new();
    my $result = $api->terminate_tenant($tenant_id);

    if ($result->{success}) {
        $config->delete_user_tenant($user);
        log_event("Terminated tenant $tenant_id for $user");
    } else {
        log_event("Failed to terminate tenant for $user: $result->{error}");
    }
}

sub handle_account_suspend {
    my $input = get_hook_input();
    my $user = $input->{user} || $input->{args}{user} || '';

    return unless $user;

    my $config = Cpanel::Ephemera::Config->new();
    my $tenant_id = $config->get_user_tenant($user);

    return unless $tenant_id;

    log_event("Suspending Ephemera tenant for $user ($tenant_id)");

    my $api = Cpanel::Ephemera::API->new();
    my $result = $api->suspend_tenant($tenant_id);

    if ($result->{success}) {
        log_event("Suspended tenant $tenant_id for $user");
    } else {
        log_event("Failed to suspend tenant for $user: $result->{error}");
    }
}

sub handle_account_unsuspend {
    my $input = get_hook_input();
    my $user = $input->{args}{user} || '';

    return unless $user;

    my $config = Cpanel::Ephemera::Config->new();
    my $tenant_id = $config->get_user_tenant($user);

    return unless $tenant_id;

    log_event("Unsuspending Ephemera tenant for $user ($tenant_id)");

    my $api = Cpanel::Ephemera::API->new();
    my $result = $api->unsuspend_tenant($tenant_id);

    if ($result->{success}) {
        log_event("Unsuspended tenant $tenant_id for $user");
    } else {
        log_event("Failed to unsuspend tenant for $user: $result->{error}");
    }
}

sub register_hooks {
    print "Registering Ephemera hooks...\n";

    my @hooks = (
        {
            category => 'Whostmgr',
            event    => 'Accounts::Create',
            stage    => 'post',
            hook     => '/usr/local/cpanel/scripts/ephemera_hooks.pl --event=account_create',
            exectype => 'script',
        },
        {
            category => 'Whostmgr',
            event    => 'Accounts::Remove',
            stage    => 'pre',
            hook     => '/usr/local/cpanel/scripts/ephemera_hooks.pl --event=account_remove',
            exectype => 'script',
        },
        {
            category => 'Whostmgr',
            event    => 'Accounts::suspendacct',
            stage    => 'post',
            hook     => '/usr/local/cpanel/scripts/ephemera_hooks.pl --event=account_suspend',
            exectype => 'script',
        },
        {
            category => 'Whostmgr',
            event    => 'Accounts::unsuspendacct',
            stage    => 'post',
            hook     => '/usr/local/cpanel/scripts/ephemera_hooks.pl --event=account_unsuspend',
            exectype => 'script',
        },
    );

    # Write hooks to hooks registry
    my $hooks_dir = '/var/cpanel/hooks';
    mkdir $hooks_dir unless -d $hooks_dir;

    my $hooks_file = "$hooks_dir/ephemera.yaml";
    open my $fh, '>', $hooks_file or die "Cannot write hooks: $!";

    print $fh "---\n";
    for my $hook (@hooks) {
        print $fh "- category: $hook->{category}\n";
        print $fh "  event: $hook->{event}\n";
        print $fh "  stage: $hook->{stage}\n";
        print $fh "  hook: $hook->{hook}\n";
        print $fh "  exectype: $hook->{exectype}\n";
    }

    close $fh;

    print "Ephemera hooks registered successfully!\n";
    log_event("Hooks registered");
}

sub unregister_hooks {
    print "Unregistering Ephemera hooks...\n";

    my $hooks_file = '/var/cpanel/hooks/ephemera.yaml';
    unlink $hooks_file if -e $hooks_file;

    print "Ephemera hooks unregistered.\n";
    log_event("Hooks unregistered");
}

sub get_hook_input {
    # cPanel passes hook data via STDIN as JSON
    my $json = do { local $/; <STDIN> };
    return {} unless $json;
    return eval { JSON::XS::decode_json($json) } || {};
}

sub log_event {
    my ($message) = @_;

    my $log_file = '/var/log/ephemera.log';
    open my $fh, '>>', $log_file or return;

    my $timestamp = localtime();
    print $fh "[$timestamp] $message\n";

    close $fh;
}

1;
