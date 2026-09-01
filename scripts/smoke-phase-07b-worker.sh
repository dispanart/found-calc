#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
web_dir="$repo_root/apps/web"
runner_temp="${RUNNER_TEMP:-/tmp}"
smoke_state="${PHASE07B_SMOKE_STATE:-$runner_temp/found-calc-phase07b-smoke-state}"
worker_log="${PHASE07B_WORKER_LOG:-$runner_temp/found-calc-phase07b-wrangler.log}"
response_body="${PHASE07B_RESPONSE_BODY:-$runner_temp/found-calc-phase07b-response.txt}"
response_headers="${PHASE07B_RESPONSE_HEADERS:-$runner_temp/found-calc-phase07b-headers.txt}"
seed_sql="${PHASE07B_SEED_SQL:-$runner_temp/found-calc-phase07b-seed.sql}"

main_origin="${PHASE07B_SMOKE_MAIN_ORIGIN:-http://127.0.0.1:8787}"
embed_origin="${FOUNDCALC_EMBED_ORIGIN:-http://localhost:8787}"
local_ports="${FOUNDCALC_WIDGET_LOCAL_PORTS:-3000,3101,3102}"
valid_parent_origin="http://localhost:3101"
unauthorized_parent_origin="http://localhost:3102"
public_widget_key="fcw_phase07b_worker_smoke_0123456789abcdef0123456789abcdef"
worker_pid=""
status=""

better_auth_secret="${BETTER_AUTH_SECRET:-phase-07b-worker-smoke-secret-not-for-production-0000000000000000}"
billing_plans_json="${BILLING_PLANS_JSON:-[]}"
public_app_origin="${PUBLIC_APP_ORIGIN:-$main_origin}"
xendit_secret="${XENDIT_SECRET_API_KEY:-phase-07b-worker-smoke-provider-placeholder}"
xendit_webhook="${XENDIT_WEBHOOK_TOKEN:-phase-07b-worker-smoke-webhook-placeholder}"

sanitize_stream() {
  node -e '
    const fs = require("node:fs");
    let text = fs.readFileSync(0, "utf8");
    for (const key of [
      "BETTER_AUTH_SECRET",
      "XENDIT_SECRET_API_KEY",
      "XENDIT_WEBHOOK_TOKEN",
      "GOOGLE_CLIENT_SECRET",
    ]) {
      const value = process.env[key];
      if (value) text = text.split(value).join("[REDACTED]");
    }
    text = text
      .replace(/(authorization\s*[:=]\s*)([^\s,;]+)/gi, "$1[REDACTED]")
      .replace(/(set-cookie\s*:\s*)([^\r\n]+)/gi, "$1[REDACTED]")
      .replace(/(cookie\s*:\s*)([^\r\n]+)/gi, "$1[REDACTED]")
      .replace(/("(?:token|secret|password|cookie)"\s*:\s*")[^"]*(")/gi, "$1[REDACTED]$2");
    process.stdout.write(text);
  '
}

one_line_file() {
  local path="$1"
  if [[ ! -f "$path" ]]; then
    printf '%s' '<no response body>'
    return
  fi
  head -c 1000 "$path" | sanitize_stream | tr '\r\n' '  ' | sed -E 's/[[:space:]]+/ /g'
}

show_worker_log() {
  if [[ -f "$worker_log" ]]; then
    echo '::group::Sanitized Phase 07B Worker log tail'
    tail -n 180 "$worker_log" | sanitize_stream
    echo
    echo '::endgroup::'
  fi
}

fail_checkpoint() {
  local checkpoint="$1"
  local detail="$2"
  echo "::error title=Phase 07B Worker smoke [$checkpoint]::$detail"
  show_worker_log
  exit 1
}

pass_checkpoint() {
  local checkpoint="$1"
  echo "::notice title=Phase 07B Worker smoke [$checkpoint]::passed"
}

stop_worker() {
  if [[ -n "$worker_pid" ]]; then
    kill "$worker_pid" 2>/dev/null || true
    wait "$worker_pid" 2>/dev/null || true
    worker_pid=""
  fi
}

start_worker() {
  local attempt
  pnpm exec wrangler dev --config dist/server/wrangler.json --port 8787 --persist-to "$smoke_state" \
    --var BETTER_AUTH_SECRET:"$better_auth_secret" \
    --var BETTER_AUTH_URL:"$main_origin" \
    --var BILLING_PLANS_JSON:"$billing_plans_json" \
    --var PUBLIC_APP_ORIGIN:"$public_app_origin" \
    --var XENDIT_SECRET_API_KEY:"$xendit_secret" \
    --var XENDIT_WEBHOOK_TOKEN:"$xendit_webhook" \
    --var FOUNDCALC_EMBED_ORIGIN:"$embed_origin" \
    --var FOUNDCALC_WIDGET_LOCAL_PORTS:"$local_ports" \
    >> "$worker_log" 2>&1 &
  worker_pid=$!

  for attempt in $(seq 1 40); do
    if ! kill -0 "$worker_pid" 2>/dev/null; then
      return 1
    fi
    status="$(curl -sS -o "$response_body" -w '%{http_code}' "$main_origin/id" || true)"
    if [[ "$status" =~ ^[23][0-9][0-9]$ ]]; then
      return 0
    fi
    sleep 1
  done
  return 1
}

is_known_miniflare_connection_loss() {
  [[ "$status" == "500" ]] && grep -Fq 'Error: Network connection lost.' "$response_body"
}

restart_worker_after_miniflare_loss() {
  stop_worker
  sleep 2
  if ! start_worker; then
    fail_checkpoint "worker-startup" "Wrangler did not recover after known local Miniflare connection loss"
  fi
}

request_with_retry() {
  local attempt
  for attempt in 1 2 3; do
    : > "$response_headers"
    status="$(curl -sS -D "$response_headers" -o "$response_body" -w '%{http_code}' "$@" || true)"
    if ! is_known_miniflare_connection_loss; then
      return 0
    fi
    if [[ "$attempt" -lt 3 ]]; then
      echo "::warning title=Phase 07B Worker smoke [miniflare-local-proxy]::known local Wrangler connection loss; restarting before retry $attempt/3"
      restart_worker_after_miniflare_loss
    fi
  done
}

cleanup() {
  stop_worker
  rm -f "$response_body" "$response_headers" "$seed_sql"
}
trap cleanup EXIT

cd "$web_dir"
rm -rf "$smoke_state"
rm -f "$worker_log" "$response_body" "$response_headers" "$seed_sql"

for migration in \
  migrations/0001_phase04_auth_and_calculator_state.sql \
  migrations/0002_phase05_rule_platform_admin.sql \
  migrations/0003_phase06_workspace.sql \
  migrations/0004_phase07_billing.sql \
  migrations/0005_phase07a_commercial_auth_amendment.sql \
  migrations/0006_phase07b_widget_platform.sql; do
  if ! pnpm exec wrangler d1 execute found-calc-local --local --persist-to "$smoke_state" --file "$migration" --yes; then
    fail_checkpoint "migration-chain" "failed to apply local D1 migration $migration"
  fi
done
pass_checkpoint "migration-chain"

cat > "$seed_sql" <<'SQL'
INSERT INTO user (id, name, email, email_verified, created_at, updated_at)
VALUES (
  'phase07b-smoke-user',
  'Phase 07B Worker Smoke',
  'phase07b-worker-smoke@example.test',
  1,
  1788144000000,
  1788144000000
);

INSERT INTO widget_domain (
  id,
  owner_user_id,
  normalized_hostname,
  display_hostname,
  pair_key,
  status,
  verified_at,
  created_at,
  updated_at,
  deleted_at
) VALUES (
  'phase07b-smoke-domain',
  'phase07b-smoke-user',
  'localhost',
  'localhost:3101',
  'loopback:3101',
  'active',
  1788144000000,
  1788144000000,
  1788144000000,
  NULL
);

INSERT INTO widget_verification (
  id,
  domain_id,
  method,
  challenge_token,
  status,
  expires_at,
  last_checked_at,
  verified_at,
  created_at
) VALUES (
  'phase07b-smoke-verification',
  'phase07b-smoke-domain',
  'local_development',
  NULL,
  'verified',
  NULL,
  1788144000000,
  1788144000000,
  1788144000000
);

INSERT INTO widget_configuration (
  id,
  owner_user_id,
  public_widget_key,
  public_key_version,
  name,
  calculator_id,
  locale,
  status,
  theme_json,
  branding_preference,
  default_input_configuration_json,
  key_rotated_at,
  created_at,
  updated_at
) VALUES (
  'phase07b-smoke-widget',
  'phase07b-smoke-user',
  'fcw_phase07b_worker_smoke_0123456789abcdef0123456789abcdef',
  1,
  'Phase 07B Worker Smoke Discount',
  'reference.discount',
  'en',
  'active',
  '{"appearance":"system","accent":"brand","density":"comfortable","radiusPreset":"standard","showTitle":true}',
  'foundcalc',
  '{"baseAmount":"100","discountPercentages":["10"]}',
  NULL,
  1788144000000,
  1788144000000
);

INSERT INTO widget_domain_binding (widget_id, domain_id, priority, created_at)
VALUES (
  'phase07b-smoke-widget',
  'phase07b-smoke-domain',
  0,
  1788144000000
);
SQL

if ! pnpm exec wrangler d1 execute found-calc-local --local --persist-to "$smoke_state" --file "$seed_sql" --yes; then
  fail_checkpoint "fixture-seed" "failed to seed the deterministic widget fixture"
fi
pass_checkpoint "fixture-seed"

if ! start_worker; then
  fail_checkpoint "worker-startup" "Worker did not become ready; last status=${status:-none}; body=$(one_line_file "$response_body")"
fi
pass_checkpoint "worker-startup"

request_with_retry \
  --resolve localhost:8787:127.0.0.1 \
  "$embed_origin/embed.js"
if [[ "$status" != "200" ]]; then
  fail_checkpoint "embed-loader" "expected HTTP 200 for /embed.js, got ${status:-curl-error}; body=$(one_line_file "$response_body")"
fi
if ! grep -Fq 'foundcalc' "$response_body"; then
  fail_checkpoint "embed-loader" "loader response did not contain the Found Calc namespace"
fi
pass_checkpoint "embed-loader"

valid_url="$embed_origin/embed/$public_widget_key?parentOrigin=http%3A%2F%2Flocalhost%3A3101"
request_with_retry \
  --resolve localhost:8787:127.0.0.1 \
  --header "origin: $valid_parent_origin" \
  --header "referer: $valid_parent_origin/host" \
  "$valid_url"
if [[ "$status" != "200" ]]; then
  fail_checkpoint "valid-embed" "expected HTTP 200 for verified local host, got ${status:-curl-error}; body=$(one_line_file "$response_body")"
fi
csp="$(tr -d '\r' < "$response_headers" | grep -i '^content-security-policy:' | tail -n 1 || true)"
if [[ "$csp" != *"frame-ancestors $valid_parent_origin"* ]]; then
  fail_checkpoint "valid-embed" "CSP did not pin frame-ancestors to $valid_parent_origin"
fi
if [[ "$csp" == *"frame-ancestors *"* ]]; then
  fail_checkpoint "valid-embed" "CSP unexpectedly contains wildcard frame-ancestors"
fi
pass_checkpoint "valid-embed"

denied_url="$embed_origin/embed/$public_widget_key?parentOrigin=http%3A%2F%2Flocalhost%3A3102"
request_with_retry \
  --resolve localhost:8787:127.0.0.1 \
  --header "origin: $unauthorized_parent_origin" \
  --header "referer: $unauthorized_parent_origin/host" \
  "$denied_url"
if [[ "$status" != "404" ]]; then
  fail_checkpoint "unauthorized-origin" "expected HTTP 404 for unbound local port 3102, got ${status:-curl-error}; body=$(one_line_file "$response_body")"
fi
pass_checkpoint "unauthorized-origin"

unknown_key_url="$embed_origin/embed/fcw_unknown_worker_smoke_key?parentOrigin=http%3A%2F%2Flocalhost%3A3101"
request_with_retry \
  --resolve localhost:8787:127.0.0.1 \
  --header "origin: $valid_parent_origin" \
  --header "referer: $valid_parent_origin/host" \
  "$unknown_key_url"
if [[ "$status" != "404" ]]; then
  fail_checkpoint "unauthorized-key" "expected HTTP 404 for unknown public widget key, got ${status:-curl-error}; body=$(one_line_file "$response_body")"
fi
pass_checkpoint "unauthorized-key"

request_with_retry \
  --resolve localhost:8787:127.0.0.1 \
  "$embed_origin/api/rules/reference.synthetic-rate/versions"
if [[ "$status" != "200" ]]; then
  fail_checkpoint "rule-feed" "expected HTTP 200 for read-only /api/rules/ path on embed host, got ${status:-curl-error}; body=$(one_line_file "$response_body")"
fi
if ! PHASE07B_RESPONSE_BODY="$response_body" node <<'NODE'
const fs = require("node:fs");
const payload = JSON.parse(fs.readFileSync(process.env.PHASE07B_RESPONSE_BODY, "utf8"));
if (payload?.ruleId !== "reference.synthetic-rate" || !Array.isArray(payload?.versions)) process.exit(1);
NODE
then
  fail_checkpoint "rule-feed" "rule feed response did not match the public contract; body=$(one_line_file "$response_body")"
fi
pass_checkpoint "rule-feed"

request_with_retry \
  --resolve localhost:8787:127.0.0.1 \
  "$embed_origin/api/auth/get-session"
if [[ "$status" != "404" ]]; then
  fail_checkpoint "embed-auth-isolation" "expected HTTP 404 for /api/auth/ on embed host, got ${status:-curl-error}; body=$(one_line_file "$response_body")"
fi
pass_checkpoint "embed-auth-isolation"

request_with_retry \
  --resolve localhost:8787:127.0.0.1 \
  "$embed_origin/api/workspace/widgets"
if [[ "$status" != "404" ]]; then
  fail_checkpoint "embed-workspace-isolation" "expected HTTP 404 for /api/workspace/ on embed host, got ${status:-curl-error}; body=$(one_line_file "$response_body")"
fi
pass_checkpoint "embed-workspace-isolation"

echo 'Phase 07B built Worker smoke passed widget runtime, CSP, rule-feed, and embed-host isolation boundaries.'
