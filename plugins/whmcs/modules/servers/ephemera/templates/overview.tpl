{* Ephemera Email Hosting - Client Area Overview Template *}

<div class="ephemera-client-area">

    {if $error}
        <div class="alert alert-danger">{$error}</div>
    {/if}

    <!-- Usage Summary -->
    <div class="row">
        <div class="col-md-4">
            <div class="panel panel-default">
                <div class="panel-heading">
                    <h3 class="panel-title"><i class="fa fa-envelope"></i> Mailboxes</h3>
                </div>
                <div class="panel-body text-center">
                    <h2>{$mailboxes|count} / {if $maxMailboxes == 0}&infin;{else}{$maxMailboxes}{/if}</h2>
                </div>
            </div>
        </div>
        <div class="col-md-4">
            <div class="panel panel-default">
                <div class="panel-heading">
                    <h3 class="panel-title"><i class="fa fa-database"></i> Storage Used</h3>
                </div>
                <div class="panel-body text-center">
                    <h2>{$usage.storageUsedMb|default:0} MB</h2>
                </div>
            </div>
        </div>
        <div class="col-md-4">
            <div class="panel panel-default">
                <div class="panel-heading">
                    <h3 class="panel-title"><i class="fa fa-tag"></i> Plan</h3>
                </div>
                <div class="panel-body text-center">
                    <h2>{$plan}</h2>
                </div>
            </div>
        </div>
    </div>

    <!-- Domains -->
    <div class="panel panel-default">
        <div class="panel-heading">
            <h3 class="panel-title"><i class="fa fa-globe"></i> Domains</h3>
        </div>
        <div class="panel-body">
            <table class="table table-striped">
                <thead>
                    <tr>
                        <th>Domain</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {foreach $domains as $domain}
                    <tr>
                        <td>{$domain.domainName}</td>
                        <td>
                            {if $domain.verified}
                                <span class="label label-success">Verified</span>
                            {else}
                                <span class="label label-warning">Pending</span>
                            {/if}
                        </td>
                        <td>
                            {if !$domain.verified}
                                <button class="btn btn-xs btn-info" onclick="showDnsRecords('{$domain.domainName|escape:'javascript'}')">
                                    <i class="fa fa-cog"></i> View DNS Records
                                </button>
                            {/if}
                        </td>
                    </tr>
                    {foreachelse}
                    <tr>
                        <td colspan="3" class="text-center text-muted">No domains configured</td>
                    </tr>
                    {/foreach}
                </tbody>
            </table>
        </div>
    </div>

    <!-- Mailboxes -->
    <div class="panel panel-default">
        <div class="panel-heading clearfix">
            <h3 class="panel-title pull-left" style="padding-top: 7px;">
                <i class="fa fa-inbox"></i> Email Accounts
            </h3>
            <button class="btn btn-sm btn-primary pull-right" onclick="showCreateMailbox()">
                <i class="fa fa-plus"></i> Create Mailbox
            </button>
        </div>
        <div class="panel-body">
            <table class="table table-striped" id="mailbox-table">
                <thead>
                    <tr>
                        <th>Email</th>
                        <th>Display Name</th>
                        <th>Quota</th>
                        <th>Used</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {foreach $mailboxes as $mailbox}
                    <tr>
                        <td>{$mailbox.email}</td>
                        <td>{$mailbox.displayName|default:'-'}</td>
                        <td>{$mailbox.quotaMb} MB</td>
                        <td>{$mailbox.usedMb|default:0} MB</td>
                        <td>
                            <a href="clientarea.php?action=productdetails&id={$serviceid}&modop=custom&a=clientWebmailSSO&email={$mailbox.email|urlencode}"
                               class="btn btn-xs btn-info" target="_blank" title="Open Webmail">
                                <i class="fa fa-envelope"></i>
                            </a>
                            <button class="btn btn-xs btn-warning" onclick="changePassword('{$mailbox.email|escape:'javascript'}')" title="Change Password">
                                <i class="fa fa-key"></i>
                            </button>
                            <button class="btn btn-xs btn-danger" onclick="deleteMailbox('{$mailbox.email|escape:'javascript'}')" title="Delete">
                                <i class="fa fa-trash"></i>
                            </button>
                        </td>
                    </tr>
                    {foreachelse}
                    <tr>
                        <td colspan="5" class="text-center text-muted">No mailboxes created yet</td>
                    </tr>
                    {/foreach}
                </tbody>
            </table>
        </div>
    </div>

</div>

<!-- Create Mailbox Modal -->
<div class="modal fade" id="createMailboxModal" tabindex="-1" role="dialog">
    <div class="modal-dialog" role="document">
        <div class="modal-content">
            <div class="modal-header">
                <button type="button" class="close" data-dismiss="modal">&times;</button>
                <h4 class="modal-title"><i class="fa fa-plus"></i> Create Email Account</h4>
            </div>
            <div class="modal-body">
                <form id="createMailboxForm">
                    <div class="form-group">
                        <label>Email Address</label>
                        <div class="input-group">
                            <input type="text" name="localPart" class="form-control" placeholder="username" required>
                            <span class="input-group-addon">@</span>
                            <select name="domain" class="form-control">
                                {foreach $domains as $domain}
                                    {if $domain.verified}
                                    <option value="{$domain.domainName}">{$domain.domainName}</option>
                                    {/if}
                                {/foreach}
                            </select>
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Password</label>
                        <input type="password" name="password" class="form-control" required minlength="8"
                               placeholder="Minimum 8 characters">
                    </div>
                    <div class="form-group">
                        <label>Display Name <small class="text-muted">(optional)</small></label>
                        <input type="text" name="displayName" class="form-control" placeholder="John Doe">
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-default" data-dismiss="modal">Cancel</button>
                <button type="button" class="btn btn-primary" onclick="submitCreateMailbox()">
                    <i class="fa fa-plus"></i> Create
                </button>
            </div>
        </div>
    </div>
</div>

<!-- Change Password Modal -->
<div class="modal fade" id="changePasswordModal" tabindex="-1" role="dialog">
    <div class="modal-dialog" role="document">
        <div class="modal-content">
            <div class="modal-header">
                <button type="button" class="close" data-dismiss="modal">&times;</button>
                <h4 class="modal-title"><i class="fa fa-key"></i> Change Password</h4>
            </div>
            <div class="modal-body">
                <form id="changePasswordForm">
                    <input type="hidden" name="email" id="passwordChangeEmail">
                    <p>Changing password for: <strong id="passwordChangeEmailDisplay"></strong></p>
                    <div class="form-group">
                        <label>New Password</label>
                        <input type="password" name="password" class="form-control" required minlength="8"
                               placeholder="Minimum 8 characters">
                    </div>
                    <div class="form-group">
                        <label>Confirm Password</label>
                        <input type="password" name="password_confirm" class="form-control" required minlength="8">
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-default" data-dismiss="modal">Cancel</button>
                <button type="button" class="btn btn-warning" onclick="submitChangePassword()">
                    <i class="fa fa-key"></i> Change Password
                </button>
            </div>
        </div>
    </div>
</div>

<!-- DNS Records Modal -->
<div class="modal fade" id="dnsRecordsModal" tabindex="-1" role="dialog">
    <div class="modal-dialog modal-lg" role="document">
        <div class="modal-content">
            <div class="modal-header">
                <button type="button" class="close" data-dismiss="modal">&times;</button>
                <h4 class="modal-title"><i class="fa fa-cog"></i> DNS Records for <span id="dnsDomainName"></span></h4>
            </div>
            <div class="modal-body">
                <p class="text-info">Add these DNS records to your domain to verify ownership and enable email delivery:</p>
                <div id="dnsRecordsContent">Loading...</div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-default" data-dismiss="modal">Close</button>
            </div>
        </div>
    </div>
</div>

<script>
var serviceId = {$serviceid};
var tenantId = '{$tenantId}';

function showCreateMailbox() {
    $('#createMailboxForm')[0].reset();
    $('#createMailboxModal').modal('show');
}

function submitCreateMailbox() {
    var form = $('#createMailboxForm');
    var data = {
        serviceid: serviceId,
        localPart: form.find('[name="localPart"]').val(),
        domain: form.find('[name="domain"]').val(),
        password: form.find('[name="password"]').val(),
        displayName: form.find('[name="displayName"]').val()
    };

    if (!data.localPart || !data.password) {
        alert('Please fill in all required fields');
        return;
    }

    $.post('clientarea.php?action=productdetails&id=' + serviceId + '&modop=custom&a=clientCreateMailbox', data)
        .done(function(response) {
            if (response.success) {
                $('#createMailboxModal').modal('hide');
                location.reload();
            } else {
                alert('Error: ' + (response.message || response.error || 'Unknown error'));
            }
        })
        .fail(function() {
            alert('Request failed. Please try again.');
        });
}

function changePassword(email) {
    $('#passwordChangeEmail').val(email);
    $('#passwordChangeEmailDisplay').text(email);
    $('#changePasswordForm')[0].reset();
    $('#changePasswordModal').modal('show');
}

function submitChangePassword() {
    var form = $('#changePasswordForm');
    var password = form.find('[name="password"]').val();
    var confirm = form.find('[name="password_confirm"]').val();

    if (password !== confirm) {
        alert('Passwords do not match');
        return;
    }

    if (password.length < 8) {
        alert('Password must be at least 8 characters');
        return;
    }

    $.post('clientarea.php?action=productdetails&id=' + serviceId + '&modop=custom&a=changePassword', {
        serviceid: serviceId,
        email: form.find('[name="email"]').val(),
        password: password
    }).done(function(response) {
        if (response.success) {
            $('#changePasswordModal').modal('hide');
            alert('Password changed successfully');
        } else {
            alert('Error: ' + (response.message || response.error || 'Unknown error'));
        }
    }).fail(function() {
        alert('Request failed. Please try again.');
    });
}

function deleteMailbox(email) {
    if (!confirm('Are you sure you want to delete ' + email + '?\n\nThis action cannot be undone and all emails will be permanently deleted.')) {
        return;
    }

    $.post('clientarea.php?action=productdetails&id=' + serviceId + '&modop=custom&a=deleteMailbox', {
        serviceid: serviceId,
        email: email
    }).done(function(response) {
        if (response.success) {
            location.reload();
        } else {
            alert('Error: ' + (response.message || response.error || 'Unknown error'));
        }
    }).fail(function() {
        alert('Request failed. Please try again.');
    });
}

function showDnsRecords(domain) {
    $('#dnsDomainName').text(domain);
    $('#dnsRecordsContent').html('<p class="text-center"><i class="fa fa-spinner fa-spin"></i> Loading...</p>');
    $('#dnsRecordsModal').modal('show');

    $.get('clientarea.php?action=productdetails&id=' + serviceId + '&modop=custom&a=getDnsRecords&domain=' + encodeURIComponent(domain))
        .done(function(response) {
            if (response.success && response.data && response.data.records) {
                var html = '<table class="table table-bordered table-condensed">';
                html += '<thead><tr><th>Type</th><th>Name</th><th>Value</th><th>Priority</th></tr></thead><tbody>';

                response.data.records.forEach(function(r) {
                    html += '<tr>';
                    html += '<td><code>' + r.type + '</code></td>';
                    html += '<td><code>' + r.name + '</code></td>';
                    html += '<td><code style="word-break: break-all;">' + r.value + '</code></td>';
                    html += '<td>' + (r.priority || '-') + '</td>';
                    html += '</tr>';
                });

                html += '</tbody></table>';
                $('#dnsRecordsContent').html(html);
            } else {
                $('#dnsRecordsContent').html('<p class="text-danger">Failed to load DNS records</p>');
            }
        })
        .fail(function() {
            $('#dnsRecordsContent').html('<p class="text-danger">Request failed</p>');
        });
}
</script>

<style>
.ephemera-client-area .panel-title {
    font-size: 14px;
}
.ephemera-client-area .panel-body h2 {
    margin: 0;
    font-size: 28px;
}
.ephemera-client-area .btn-xs {
    margin-right: 2px;
}
</style>
