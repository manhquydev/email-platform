#!/usr/local/cpanel/3rdparty/bin/perl
# cPanel Ephemera Plugin - API Endpoint
# /usr/local/cpanel/base/frontend/jupiter/ephemera/api.cgi

use strict;
use warnings;

use CGI;
use JSON::XS ();

use lib '/usr/local/cpanel/Cpanel/Ephemera';
use Cpanel::Ephemera::API    ();
use Cpanel::Ephemera::Config ();

# Get cPanel user
my $user = $ENV{'REMOTE_USER'} || '';
unless ($user) {
    print_json({ success => 0, error => 'Not authenticated' });
    exit;
}

my $cgi = CGI->new();
my $action = $cgi->param('action') || '';

# Parse JSON body for POST requests
my $body = {};
if ($ENV{'REQUEST_METHOD'} eq 'POST') {
    my $json_input = do { local $/; <STDIN> };
    $body = eval { JSON::XS::decode_json($json_input) } || {};
    $action = $body->{action} if $body->{action};
}

# Get tenant ID for this user
my $config = Cpanel::Ephemera::Config->new();
my $tenant_id = $config->get_user_tenant($user);

unless ($tenant_id) {
    print_json({ success => 0, error => 'No email service provisioned for this account' });
    exit;
}

my $api = Cpanel::Ephemera::API->new();

# Route actions
if ($action eq 'list_mailboxes') {
    my $result = $api->list_mailboxes($tenant_id);
    if ($result->{success}) {
        print_json({ success => 1, mailboxes => $result->{data}{mailboxes} || [] });
    } else {
        print_json({ success => 0, error => $result->{error} });
    }
}
elsif ($action eq 'create_mailbox') {
    my $result = $api->create_mailbox($tenant_id, {
        localPart   => $body->{local_part},
        domain      => $body->{domain},
        password    => $body->{password},
        displayName => $body->{display_name},
        quotaMb     => int($body->{quota_mb} || 1024),
    });
    if ($result->{success}) {
        print_json({ success => 1, mailbox => $result->{data}{mailbox} });
    } else {
        print_json({ success => 0, error => $result->{error} });
    }
}
elsif ($action eq 'delete_mailbox') {
    my $result = $api->delete_mailbox($tenant_id, $body->{email});
    print_json($result);
}
elsif ($action eq 'change_password') {
    my $result = $api->update_password($tenant_id, $body->{email}, $body->{password});
    print_json($result);
}
elsif ($action eq 'list_domains') {
    my $result = $api->list_domains($tenant_id);
    if ($result->{success}) {
        print_json({ success => 1, domains => $result->{data}{domains} || [] });
    } else {
        print_json({ success => 0, error => $result->{error} });
    }
}
elsif ($action eq 'get_usage') {
    my $result = $api->get_usage($tenant_id);
    if ($result->{success}) {
        print_json({ success => 1, usage => $result->{data}{usage}{summary} || {} });
    } else {
        print_json({ success => 0, error => $result->{error} });
    }
}
else {
    print_json({ success => 0, error => 'Unknown action' });
}

sub print_json {
    my ($data) = @_;
    print "Content-Type: application/json\r\n\r\n";
    print JSON::XS::encode_json($data);
}
