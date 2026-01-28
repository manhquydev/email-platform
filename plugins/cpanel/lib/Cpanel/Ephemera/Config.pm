package Cpanel::Ephemera::Config;

# Ephemera Configuration Handler for cPanel
# Manages plugin settings stored in /var/cpanel/ephemera/

use strict;
use warnings;

use JSON::XS ();
use File::Path qw(make_path);

our $VERSION = '1.0.0';

our $CONFIG_DIR  = '/var/cpanel/ephemera';
our $CONFIG_FILE = "$CONFIG_DIR/config.json";
our $USERS_DIR   = "$CONFIG_DIR/users";

# Default configuration
our $DEFAULTS = {
    api_url        => 'https://api.ephemera.email',
    api_key        => '',
    default_plan   => 'LITE',
    auto_provision => 0,
    webhook_url    => '',
};

sub new {
    my ($class) = @_;
    my $self = { config => undef };
    return bless $self, $class;
}

sub load {
    my ($self) = @_;

    if (-e $CONFIG_FILE) {
        open my $fh, '<', $CONFIG_FILE or do {
            warn "Cannot read config: $!";
            return { %$DEFAULTS };
        };
        local $/;
        my $json = <$fh>;
        close $fh;

        my $config = eval { JSON::XS::decode_json($json) };
        if ($@) {
            warn "Invalid config JSON: $@";
            return { %$DEFAULTS };
        }

        # Merge with defaults
        $self->{config} = { %$DEFAULTS, %$config };
    } else {
        $self->{config} = { %$DEFAULTS };
    }

    return $self->{config};
}

sub save {
    my ($self, $config) = @_;

    # Ensure directory exists
    make_path($CONFIG_DIR) unless -d $CONFIG_DIR;

    # Merge with existing config
    my $existing = $self->load();
    my $merged = { %$existing, %$config };

    # Write config
    open my $fh, '>', $CONFIG_FILE or do {
        warn "Cannot write config: $!";
        return 0;
    };
    print $fh JSON::XS->new->pretty->encode($merged);
    close $fh;

    # Secure permissions
    chmod 0600, $CONFIG_FILE;

    $self->{config} = $merged;
    return 1;
}

sub get {
    my ($self, $key) = @_;
    $self->load() unless $self->{config};
    return $self->{config}{$key};
}

sub set {
    my ($self, $key, $value) = @_;
    $self->load() unless $self->{config};
    $self->{config}{$key} = $value;
    return $self->save($self->{config});
}

# User-tenant mapping
sub save_user_tenant {
    my ($self, $username, $tenant_id) = @_;

    make_path($USERS_DIR) unless -d $USERS_DIR;

    my $file = "$USERS_DIR/$username.json";
    open my $fh, '>', $file or do {
        warn "Cannot write user config: $!";
        return 0;
    };
    print $fh JSON::XS::encode_json({ tenant_id => $tenant_id });
    close $fh;
    chmod 0600, $file;

    return 1;
}

sub get_user_tenant {
    my ($self, $username) = @_;

    my $file = "$USERS_DIR/$username.json";
    return undef unless -e $file;

    open my $fh, '<', $file or return undef;
    local $/;
    my $json = <$fh>;
    close $fh;

    my $data = eval { JSON::XS::decode_json($json) };
    return $data->{tenant_id};
}

sub delete_user_tenant {
    my ($self, $username) = @_;
    my $file = "$USERS_DIR/$username.json";
    unlink $file if -e $file;
    return 1;
}

1;

__END__

=head1 NAME

Cpanel::Ephemera::Config - Configuration handler for Ephemera cPanel plugin

=head1 SYNOPSIS

    use Cpanel::Ephemera::Config;

    my $config = Cpanel::Ephemera::Config->new();

    # Load config
    my $settings = $config->load();

    # Save config
    $config->save({
        api_key      => 'eph_provider_xxx',
        default_plan => 'PRO',
    });

=cut
