<?php
/**
 * Ephemera Plesk Extension - Index Controller
 */

class IndexController extends pm_Controller_Action
{
    public function init()
    {
        parent::init();
        $this->view->pageTitle = 'Ephemera Email Hosting';
    }

    public function indexAction()
    {
        $api = new Modules_Ephemera_EphemeraAPI();

        // Get current domain context
        $domain = $this->_getParam('domain');
        if (!$domain && pm_Session::getClient()) {
            $domains = pm_Session::getClient()->getDomains();
            if (count($domains) > 0) {
                $domain = $domains[0]->getName();
            }
        }

        $tenantId = $api->getTenantIdForDomain($domain);

        if ($tenantId) {
            $mailboxResult = $api->listMailboxes($tenantId);
            $usageResult = $api->getUsage($tenantId);

            $this->view->mailboxes = $mailboxResult['data']['mailboxes'] ?? [];
            $this->view->usage = $usageResult['data']['usage']['summary'] ?? [];
        } else {
            $this->view->mailboxes = [];
            $this->view->usage = [];
        }

        $this->view->domain = $domain;
        $this->view->tenantId = $tenantId;
        $this->view->isProvisioned = !empty($tenantId);
    }

    public function createMailboxAction()
    {
        $api = new Modules_Ephemera_EphemeraAPI();
        $domain = $this->_getParam('domain');
        $tenantId = $api->getTenantIdForDomain($domain);

        if (!$tenantId) {
            $this->_status->addError('Email service not provisioned');
            $this->_redirect('index');
            return;
        }

        $localPart = preg_replace('/[^a-zA-Z0-9._-]/', '', $this->_getParam('local_part'));
        $password = $this->_getParam('password');
        $displayName = htmlspecialchars($this->_getParam('display_name'), ENT_QUOTES, 'UTF-8');

        if (!$localPart || !$password) {
            $this->_status->addError('Missing required fields');
            $this->_redirect('index');
            return;
        }

        if (strlen($password) < 8) {
            $this->_status->addError('Password must be at least 8 characters');
            $this->_redirect('index');
            return;
        }

        $result = $api->createMailbox($tenantId, [
            'localPart' => $localPart,
            'domain' => $domain,
            'password' => $password,
            'displayName' => $displayName,
        ]);

        if ($result['success']) {
            $this->_status->addMessage('info', 'Mailbox created successfully');
        } else {
            $this->_status->addError('Failed to create mailbox: ' . ($result['error'] ?? 'Unknown error'));
        }

        $this->_redirect('index', null, null, ['domain' => $domain]);
    }

    public function deleteMailboxAction()
    {
        $api = new Modules_Ephemera_EphemeraAPI();
        $domain = $this->_getParam('domain');
        $email = $this->_getParam('email');
        $tenantId = $api->getTenantIdForDomain($domain);

        if (!$tenantId) {
            $this->_status->addError('Email service not provisioned');
            $this->_redirect('index');
            return;
        }

        $result = $api->deleteMailbox($tenantId, $email);

        if ($result['success']) {
            $this->_status->addMessage('info', 'Mailbox deleted successfully');
        } else {
            $this->_status->addError('Failed to delete mailbox: ' . ($result['error'] ?? 'Unknown error'));
        }

        $this->_redirect('index', null, null, ['domain' => $domain]);
    }

    public function changePasswordAction()
    {
        $api = new Modules_Ephemera_EphemeraAPI();
        $domain = $this->_getParam('domain');
        $email = $this->_getParam('email');
        $password = $this->_getParam('password');
        $tenantId = $api->getTenantIdForDomain($domain);

        if (!$tenantId) {
            $this->_status->addError('Email service not provisioned');
            $this->_redirect('index');
            return;
        }

        if (strlen($password) < 8) {
            $this->_status->addError('Password must be at least 8 characters');
            $this->_redirect('index');
            return;
        }

        $result = $api->updatePassword($tenantId, $email, $password);

        if ($result['success']) {
            $this->_status->addMessage('info', 'Password changed successfully');
        } else {
            $this->_status->addError('Failed to change password: ' . ($result['error'] ?? 'Unknown error'));
        }

        $this->_redirect('index', null, null, ['domain' => $domain]);
    }
}
