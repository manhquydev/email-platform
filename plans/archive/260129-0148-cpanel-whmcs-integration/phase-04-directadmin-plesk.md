---
phase: "04"
title: "DirectAdmin & Plesk Extensions"
status: pending
priority: P2
effort: 1.5 weeks
---

# Phase 04: DirectAdmin & Plesk Extensions

## Context Links
- [Plan Overview](plan.md)
- [Phase 01: Provider API](phase-01-hosting-provider-api.md)

## Overview

Mở rộng integration sang DirectAdmin và Plesk để tăng độ phủ thị trường hosting panels.

## DirectAdmin Plugin

### File Structure
```
/usr/local/directadmin/plugins/ephemera/
├── plugin.conf
├── admin/
│   └── index.html
├── user/
│   └── index.html
├── hooks/
│   └── user_create.sh
└── exec/
    └── ephemera_api.php
```

### plugin.conf
```ini
name=Ephemera Email
author=Ephemera
version=1.0.0
requires_directadmin=1.65.0
```

### Admin Interface
```php
<?php
// admin/index.php
require_once '/usr/local/directadmin/plugins/ephemera/exec/ephemera_api.php';

$api = new EphemeraAPI();
$config = $api->loadConfig();

if ($_POST['action'] === 'save') {
    $api->saveConfig([
        'api_url' => $_POST['api_url'],
        'api_key' => $_POST['api_key'],
        'default_plan' => $_POST['default_plan'],
    ]);
    echo "Settings saved!";
}
?>
<form method="post">
    <input type="hidden" name="action" value="save">
    <label>API URL: <input name="api_url" value="<?= $config['api_url'] ?>"></label>
    <label>API Key: <input name="api_key" type="password" value="<?= $config['api_key'] ?>"></label>
    <label>Default Plan:
        <select name="default_plan">
            <option value="LITE">Lite</option>
            <option value="PRO">Pro</option>
            <option value="BUSINESS">Business</option>
        </select>
    </label>
    <button type="submit">Save</button>
</form>
```

### User Hooks
```bash
#!/bin/bash
# hooks/user_create.sh
USER=$1
DOMAIN=$2

php /usr/local/directadmin/plugins/ephemera/exec/provision.php "$USER" "$DOMAIN"
```

## Plesk Extension

### File Structure
```
plesk-ephemera/
├── meta.xml
├── plib/
│   ├── controllers/
│   │   └── IndexController.php
│   ├── library/
│   │   └── EphemeraAPI.php
│   └── views/
│       └── scripts/
│           └── index/
│               └── index.phtml
└── htdocs/
    └── images/
        └── logo.png
```

### meta.xml
```xml
<?xml version="1.0" encoding="UTF-8"?>
<module>
    <id>ephemera</id>
    <name>Ephemera Email Hosting</name>
    <description>Enterprise email hosting integration</description>
    <version>1.0.0</version>
    <release>1</release>
    <vendor>Ephemera</vendor>
    <url>https://ephemera.email</url>

    <plesk_min_version>18.0.0</plesk_min_version>

    <php_min_version>7.4</php_min_version>

    <view>
        <tab>
            <id>ephemera</id>
            <title>Email Hosting</title>
        </tab>
    </view>
</module>
```

### Controller
```php
<?php
// plib/controllers/IndexController.php

class IndexController extends pm_Controller_Action
{
    public function indexAction()
    {
        $api = new Modules_Ephemera_EphemeraAPI();

        $this->view->mailboxes = $api->listMailboxes();
        $this->view->usage = $api->getUsage();
    }

    public function createMailboxAction()
    {
        $api = new Modules_Ephemera_EphemeraAPI();

        $result = $api->createMailbox([
            'localPart' => $this->getRequest()->getParam('local_part'),
            'domain' => $this->getRequest()->getParam('domain'),
            'password' => $this->getRequest()->getParam('password'),
        ]);

        $this->_redirect('index');
    }
}
```

## Todo List

- [ ] DirectAdmin plugin structure
- [ ] DirectAdmin admin/user interfaces
- [ ] DirectAdmin hooks (user create/delete)
- [ ] Plesk extension meta.xml
- [ ] Plesk controller and views
- [ ] Plesk event handlers
- [ ] Test on DirectAdmin 1.65+
- [ ] Test on Plesk Obsidian 18+
- [ ] Package for distribution

## Success Criteria

- [ ] DirectAdmin plugin installs and works
- [ ] Plesk extension passes validation
- [ ] Auto-provisioning on account creation
- [ ] User can manage mailboxes from panel

## Next Steps

→ [Phase 05: Testing & Documentation](phase-05-testing-documentation.md)
