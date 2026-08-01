#!/usr/bin/env bash
# Manage the local MySQL server used for Zeon CRM development.
# MySQL 8.0.35 binaries live in ~/mysql, data in ~/mysql-data.
set -euo pipefail

MYSQL_HOME="$HOME/mysql"
DATA_DIR="$HOME/mysql-data"
SOCKET="/tmp/mysql.sock"

case "${1:-}" in
  start)
    if "$MYSQL_HOME/bin/mysqladmin" --socket="$SOCKET" -u root status >/dev/null 2>&1; then
      echo "MySQL is already running."
      exit 0
    fi
    "$MYSQL_HOME/bin/mysqld_safe" --datadir="$DATA_DIR" --basedir="$MYSQL_HOME" \
      --port=3306 --socket="$SOCKET" >/dev/null 2>&1 &
    for _ in $(seq 1 15); do
      sleep 1
      if "$MYSQL_HOME/bin/mysqladmin" --socket="$SOCKET" -u root status >/dev/null 2>&1; then
        echo "MySQL started."
        exit 0
      fi
    done
    echo "MySQL failed to start — check $DATA_DIR/*.err" >&2
    exit 1
    ;;
  stop)
    "$MYSQL_HOME/bin/mysqladmin" --socket="$SOCKET" -u root shutdown
    echo "MySQL stopped."
    ;;
  status)
    "$MYSQL_HOME/bin/mysqladmin" --socket="$SOCKET" -u root status
    ;;
  *)
    echo "Usage: $0 {start|stop|status}" >&2
    exit 1
    ;;
esac
