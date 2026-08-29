#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
web_dir="$repo_root/apps/web"
runner_temp="${RUNNER_TEMP:-/tmp}"
smoke_state="${PHASE07_SMOKE_STATE:-$runner_temp/found-calc-phase07-smoke-state}"
worker_log="${PHASE07_WORKER_LOG:-$runner_temp/found-calc-phase07-wrangler.log}"
cookie_jar="${PHASE07_COOKIE_JAR:-$runner_temp/found-calc-phase07-cookies.txt}"
response_body="${PHASE07_RESPONSE_BODY:-$runner_temp/found-calc-phase07-response.txt}"
base_url="${PHASE07_SMOKE_BASE_URL:-http://127.0.0.1:8787}"
worker_pid=""

sanitize_stream() {
  node <<'NODE'
const fs = require("node:fs");
let text = fs.readFileSync(0, "utf8");
for (const key of ["BETTER_AUTH_SECRET", "XENDIT_SECRET_API_KEY", "XENDIT_WEBHOOK_TOKEN"]) {
  const value = process.env[key];
  if (value) text = text.split(value).join("[REDACTED]");
}
text = text
  .replace(/(authorization\s*[:=]\s*)([^\s,;]+)/gi, "$1[REDACTED]")
  .replace(/(x-callback-token\s*[:=]\s*)([^\s,;]+)/gi, "$1[REDACTED]")
  .replace(/(set-cookie\s*:\s*)([^\r\n]+)/gi, "$1[REDACTED]")
  .replace(/(cookie\s*:\s*)([^\r\n]+)/gi, "$1[REDACTED]")
  .replace(/("(?:token|secret|password|cookie)"\s*:\s*")[^"]*(")/gi, "$1[REDACTED]$2");
process.stdout.write(text);
NODE
}

one_line_file() {
  local path="$1"
  if [[ ! -f "$path" ]]; then
    printf '%s' '<no response body>'
    return
  fi
  head -c 800 "$path" | sanitize_stream | tr '\r\n' '  ' | sed -E 's/[[:space:]]+/ /g'
}

annotation_escape() {
  printf '%s' "$1" | sed -e 's/%/%25/g' -e 's/\r/%0D/g' -e 's/\n/%0A/g'
}

show_worker_log() {
  if [[ -f "$worker_log" ]]; then
    echo '::group::Sanitized Phase 07 Worker log tail'
    tail -n 120 "$worker_log" | sanitize_stream
    echo
    echo '::endgroup::'
  fi
}

fail_checkpoint() {
  local checkpoint="$1"
  local detail="$2"
  local escaped
  escaped="$(annotation_escape "$detail")"
  echo "::error title=Phase 07 Worker smoke [$checkpoint]::$escaped"
  show_worker_log
  exit 1
}

pass_checkpoint() {
  local checkpoint="$1"
  echo "::notice title=Phase 07 Worker smoke [$checkpoint]::passed"
}

cleanup() {
  if [[ -n "$worker_pid" ]]; then
    kill "$worker_pid" 2>/dev/null || true
    wait "$worker_pid" 2>/dev/null || true
  fi
  rm -f "$cookie_jar" "$response_body"
}
trap cleanup EXIT

for key in BETTER_AUTH_SECRET BILLING_PLANS_JSON PUBLIC_APP_ORIGIN XENDIT_SECRET_API_KEY XENDIT_WEBHOOK_TOKEN; do
  if [[ -z "${!key:-}" ]]; then
    fail_checkpoint "worker-startup" "required environment variable $key is missing"
  fi
done

cd "$web_dir"
rm -rf "$smoke_state"
rm -f "$worker_log" "$cookie_jar" "$response_body"

for migration in \
  migrations/0001_phase04_auth_and_calculator_state.sql \
  migrations/0002_phase05_rule_platform_admin.sql \
  migrations/0003_phase06_workspace.sql \
  migrations/0004_phase07_billing.sql; do
  if ! pnpm exec wrangler d1 execute found-calc-local --local --persist-to "$smoke_state" --file "$migration" --yes; then
    fail_checkpoint "worker-startup" "failed to apply local D1 migration $migration"
  fi
done

pnpm exec wrangler dev --config dist/server/wrangler.json --port 8787 --persist-to "$smoke_state" \
  --var BETTER_AUTH_SECRET:"$BETTER_AUTH_SECRET" \
  --var BETTER_AUTH_URL:"$base_url" \
  --var BETTER_AUTH_ADMIN_USER_IDS:"${BETTER_AUTH_ADMIN_USER_IDS:-}" \
  --var BILLING_PLANS_JSON:"$BILLING_PLANS_JSON" \
  --var PUBLIC_APP_ORIGIN:"$PUBLIC_APP_ORIGIN" \
  --var XENDIT_SECRET_API_KEY:"$XENDIT_SECRET_API_KEY" \
  --var XENDIT_WEBHOOK_TOKEN:"$XENDIT_WEBHOOK_TOKEN" \
  > "$worker_log" 2>&1 &
worker_pid=$!

ready=0
for attempt in $(seq 1 30); do
  if ! kill -0 "$worker_pid" 2>/dev/null; then
    fail_checkpoint "worker-startup" "wrangler exited before the Worker became ready (attempt $attempt)"
  fi
  status="$(curl -sS -o "$response_body" -w '%{http_code}' "$base_url/id" || true)"
  if [[ "$status" =~ ^[23][0-9][0-9]$ ]]; then
    ready=1
    break
  fi
  sleep 1
done
if [[ "$ready" -ne 1 ]]; then
  fail_checkpoint "worker-startup" "Worker did not become ready within 30 attempts; last status=${status:-none}; body=$(one_line_file "$response_body")"
fi
pass_checkpoint "worker-startup"

status="$(curl -sS -o "$response_body" -w '%{http_code}' "$base_url/api/billing/status" || true)"
if [[ "$status" != "401" ]]; then
  fail_checkpoint "anonymous-status" "expected HTTP 401, got ${status:-curl-error}; body=$(one_line_file "$response_body")"
fi
pass_checkpoint "anonymous-status"

status="$(curl -sS -o "$response_body" -w '%{http_code}' \
  --header 'content-type: application/json' \
  --header 'x-callback-token: definitely-wrong-token' \
  --data '{}' \
  "$base_url/api/billing/webhooks/xendit" || true)"
if [[ "$status" != "401" ]]; then
  fail_checkpoint "invalid-webhook" "expected HTTP 401, got ${status:-curl-error}; body=$(one_line_file "$response_body")"
fi
pass_checkpoint "invalid-webhook"

rm -f "$cookie_jar"
status="$(curl -sS -o "$response_body" -w '%{http_code}' \
  --cookie-jar "$cookie_jar" \
  --header 'content-type: application/json' \
  --header "origin: $base_url" \
  --data '{"name":"Phase Seven Worker Smoke","email":"phase07-worker-smoke@example.test","password":"phase-seven-worker-password-123"}' \
  "$base_url/api/auth/sign-up/email" || true)"
if [[ "$status" != "200" ]]; then
  fail_checkpoint "auth-signup" "expected HTTP 200, got ${status:-curl-error}; body=$(one_line_file "$response_body")"
fi
if ! grep -Fq '"user"' "$response_body"; then
  fail_checkpoint "auth-signup" "signup returned HTTP 200 without a user payload; body=$(one_line_file "$response_body")"
fi
if [[ ! -s "$cookie_jar" ]]; then
  fail_checkpoint "auth-signup" "signup returned HTTP 200 but did not persist an auth cookie"
fi
pass_checkpoint "auth-signup"

status="$(curl -sS -o "$response_body" -w '%{http_code}' --cookie "$cookie_jar" "$base_url/api/billing/status" || true)"
if [[ "$status" != "200" ]]; then
  fail_checkpoint "authenticated-status" "expected HTTP 200, got ${status:-curl-error}; body=$(one_line_file "$response_body")"
fi
if ! BILLING_RESPONSE_FILE="$response_body" node <<'NODE'
const fs = require("node:fs");
const body = JSON.parse(fs.readFileSync(process.env.BILLING_RESPONSE_FILE, "utf8"));
const expectedPlanIds = ["pro-monthly", "pro-annual", "business-monthly", "business-annual"];
const actualPlanIds = Array.isArray(body?.billing?.plans) ? body.billing.plans.map((plan) => plan?.id) : null;
const valid =
  body?.billing?.available === true &&
  JSON.stringify(actualPlanIds) === JSON.stringify(expectedPlanIds) &&
  body.billing.subscription === null &&
  Array.isArray(body.billing.entitlements) &&
  body.billing.entitlements.length === 0;
if (!valid) process.exit(1);
NODE
then
  fail_checkpoint "authenticated-status" "billing payload contract mismatch; body=$(one_line_file "$response_body")"
fi
pass_checkpoint "authenticated-status"

echo 'Phase 07 built Worker smoke passed all runtime boundaries.'
