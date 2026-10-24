#!/usr/bin/env bash
# Start the throwaway test bed and make it scriptable.
#
#   tests/itb/bootstrap.sh            # prints ITB_COMMUNITY_KEY=… on the last line
#
# A fresh ITB has its automation API switched off per community and no way to
# read a community key over REST, so both are done in its database: the same
# fix as `enable-automation-api` in OpenTestBed/itb-starter.
set -euo pipefail
cd "$(dirname "$0")"
export ITB_PORT="${ITB_PORT:-10003}"
PROJECT="${COMPOSE_PROJECT_NAME:-tx-tests}"
dc() { docker compose -p "$PROJECT" "$@"; }

dc up -d >&2

echo "waiting for ITB on :$ITB_PORT" >&2
for _ in $(seq 1 120); do
  [ "$(curl -s -o /dev/null -w '%{http_code}' "http://localhost:$ITB_PORT/")" = 200 ] && break
  sleep 5
done

echo "waiting for the FHIR validator" >&2
for _ in $(seq 1 120); do
  [ "$(docker inspect -f '{{.State.Health.Status}}' "$(dc ps -q fhir-validator)")" = healthy ] && break
  sleep 5
done

mysql() { dc exec -T -e MYSQL_PWD=gitb-root gitb-mysql mysql -u root gitb -N -e "$1"; }
# The Communities table appears once gitb-ui has migrated the schema.
for _ in $(seq 1 60); do mysql "SELECT 1 FROM Communities LIMIT 1" >/dev/null 2>&1 && break; sleep 5; done
mysql "UPDATE Communities SET allow_automation_api = 1"
echo "ITB_COMMUNITY_KEY=$(mysql "SELECT api_key FROM Communities WHERE id = 0")"
