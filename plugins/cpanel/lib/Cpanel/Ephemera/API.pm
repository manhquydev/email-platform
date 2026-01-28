package Cpanel::Ephemera::API;

# Ephemera Email API Client for cPanel
# Provides interface to Ephemera Provider API

use strict;
use warnings;

use JSON::XS        ();
use LWP::UserAgent  ();
use HTTP::Request   ();

our $VERSION = '1.0.0';

sub new {
    my ($class) = @_;

    my $config = _load_config();

    my $self = {
        api_url => $config->{api_url} || 'https://api.ephemera.email',
        api_key => $config->{api_key} || '',
        ua      => LWP::UserAgent->new(
            timeout => 30,
            agent   => "Ephemera-cPanel/$VERSION",
        ),
    };

    return bless $self, $class;
}

# Provider info
sub get_provider_info {
    my ($self) = @_;
    return $self->_request('GET', '/v1/provider/me');
}

# Tenant management
sub create_tenant {
    my ($self, $data) = @_;
    return $self->_request('POST', '/v1/provider/tenants', $data);
}

sub get_tenant {
    my ($self, $tenant_id) = @_;
    return $self->_request('GET', "/v1/provider/tenants/$tenant_id");
}

sub list_tenants {
    my ($self, $params) = @_;
    my $query = _build_query($params);
    return $self->_request('GET', "/v1/provider/tenants$query");
}

sub suspend_tenant {
    my ($self, $tenant_id) = @_;
    return $self->_request('POST', "/v1/provider/tenants/$tenant_id/suspend");
}

sub unsuspend_tenant {
    my ($self, $tenant_id) = @_;
    return $self->_request('POST', "/v1/provider/tenants/$tenant_id/unsuspend");
}

sub terminate_tenant {
    my ($self, $tenant_id) = @_;
    return $self->_request('DELETE', "/v1/provider/tenants/$tenant_id");
}

# Domain management
sub add_domain {
    my ($self, $tenant_id, $domain) = @_;
    return $self->_request('POST', "/v1/provider/tenants/$tenant_id/domains", {
        domain => $domain,
    });
}

sub list_domains {
    my ($self, $tenant_id) = @_;
    return $self->_request('GET', "/v1/provider/tenants/$tenant_id/domains");
}

sub get_domain_dns {
    my ($self, $tenant_id, $domain) = @_;
    return $self->_request('GET', "/v1/provider/tenants/$tenant_id/domains/$domain/dns");
}

sub verify_domain {
    my ($self, $tenant_id, $domain) = @_;
    return $self->_request('POST', "/v1/provider/tenants/$tenant_id/domains/$domain/verify");
}

# Mailbox management
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
    my $encoded_email = _uri_encode($email);
    return $self->_request('DELETE', "/v1/provider/tenants/$tenant_id/mailboxes/$encoded_email");
}

sub update_password {
    my ($self, $tenant_id, $email, $password) = @_;
    my $encoded_email = _uri_encode($email);
    return $self->_request('POST', "/v1/provider/tenants/$tenant_id/mailboxes/$encoded_email/password", {
        password => $password,
    });
}

# Usage
sub get_usage {
    my ($self, $tenant_id) = @_;
    if ($tenant_id) {
        return $self->_request('GET', "/v1/provider/tenants/$tenant_id/usage");
    }
    return $self->_request('GET', '/v1/provider/usage');
}

# Test connection
sub test_connection {
    my ($self) = @_;
    return $self->get_provider_info();
}

# Internal: Make HTTP request
sub _request {
    my ($self, $method, $path, $body) = @_;

    my $url = $self->{api_url} . $path;

    my $req = HTTP::Request->new($method => $url);
    $req->header('X-Provider-Key' => $self->{api_key});
    $req->header('Content-Type' => 'application/json');
    $req->header('Accept' => 'application/json');

    if ($body && ($method eq 'POST' || $method eq 'PATCH' || $method eq 'PUT')) {
        $req->content(JSON::XS::encode_json($body));
    }

    my $res = $self->{ua}->request($req);

    if ($res->is_success) {
        my $data = eval { JSON::XS::decode_json($res->content) };
        return { success => 1, data => $data || {} };
    } else {
        my $error = eval { JSON::XS::decode_json($res->content) };
        return {
            success => 0,
            error   => $error->{message} || $error->{error} || $res->status_line,
            status  => $res->code,
        };
    }
}

# Internal: Load config
sub _load_config {
    my $config_file = '/var/cpanel/ephemera/config.json';
    return {} unless -e $config_file;

    open my $fh, '<', $config_file or return {};
    local $/;
    my $json = <$fh>;
    close $fh;

    return eval { JSON::XS::decode_json($json) } || {};
}

# Internal: Build query string
sub _build_query {
    my ($params) = @_;
    return '' unless $params && ref($params) eq 'HASH';

    my @parts;
    for my $key (keys %$params) {
        push @parts, _uri_encode($key) . '=' . _uri_encode($params->{$key});
    }

    return @parts ? '?' . join('&', @parts) : '';
}

# Internal: URI encode
sub _uri_encode {
    my ($str) = @_;
    $str =~ s/([^A-Za-z0-9\-_.~])/sprintf("%%%02X", ord($1))/ge;
    return $str;
}

1;

__END__

=head1 NAME

Cpanel::Ephemera::API - Ephemera Email API Client for cPanel

=head1 SYNOPSIS

    use Cpanel::Ephemera::API;

    my $api = Cpanel::Ephemera::API->new();

    # Test connection
    my $result = $api->test_connection();

    # Create tenant
    my $tenant = $api->create_tenant({
        externalId    => 'cpanel-user123',
        customerEmail => 'user@example.com',
        plan          => 'LITE',
    });

=head1 DESCRIPTION

This module provides a Perl interface to the Ephemera Hosting Provider API
for use within cPanel/WHM plugins.

=cut
