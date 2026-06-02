"""Shared SSH connection configuration loaded from environment variables.

Required env vars:
  DEPLOY_SSH_HOST     - production server IP/hostname
  DEPLOY_SSH_USER     - SSH username (default: root)
  DEPLOY_SSH_PASSWORD - SSH password for the production server
"""

import os
import sys


def _require(name: str) -> str:
    value = os.environ.get(name)
    if not value:
        print(f"Error: required environment variable '{name}' is not set.", file=sys.stderr)
        sys.exit(1)
    return value


HOST = os.environ.get("DEPLOY_SSH_HOST", "165.22.48.193")
USERNAME = os.environ.get("DEPLOY_SSH_USER", "root")
PASSWORD = _require("DEPLOY_SSH_PASSWORD")
