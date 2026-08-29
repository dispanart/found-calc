import type { D1Database } from "@cloudflare/workers-types";
import type { BillingSubscriptionStatus } from "./contracts";

export type BillingSubscriptionRecord = {
  readonly id: string;
  readonly userId: string;
  readonly planId: string;
  readonly providerPlanId: string;
  readonly referenceId: string;
  readonly status: BillingSubscriptionStatus;
  readonly latestCycleStatus: string | null;
  readonly latestEventAt: number;
  readonly nextCycleAt: number | null;
  readonly cancellationRequestedAt: number | null;
};

export type BillingStatusRecord = {
  readonly subscription: BillingSubscriptionRecord | null;
  readonly checkoutPending: boolean;
};

export type BillingWebhookTransition = {
  readonly dedupeKey: string;
  readonly eventName: string;
  readonly providerPlanId: string;
  readonly providerCycleId: string | null;
  readonly referenceId: string;
  readonly providerEventAt: number;
  readonly nextStatus: BillingSubscriptionStatus | null;
  readonly latestCycleStatus: string | null;
  readonly currentCycleStartedAt: number | null;
  readonly nextCycleAt: number | null;
  readonly providerCreatedAt: number | null;
  readonly providerUpdatedAt: number | null;
  readonly rank: number;
};

type SubscriptionRow = {
  id: string;
  userId: string;
  planId: string;
  providerPlanId: string;
  referenceId: string;
  status: BillingSubscriptionStatus;
  latestCycleStatus: string | null;
  latestEventAt: number;
  latestEventRank: number;
  nextCycleAt: number | null;
  cancellationRequestedAt: number | null;
};

export type BillingEventOwner = { readonly userId: string; readonly planId: string };
type CheckoutOwnerRow = { userId: string; planId: string };

const subscriptionFromRow = (row: SubscriptionRow): BillingSubscriptionRecord => ({
  id: row.id,
  userId: row.userId,
  planId: row.planId,
  providerPlanId: row.providerPlanId,
  referenceId: row.referenceId,
  status: row.status,
  latestCycleStatus: row.latestCycleStatus,
  latestEventAt: row.latestEventAt,
  nextCycleAt: row.nextCycleAt,
  cancellationRequestedAt: row.cancellationRequestedAt,
});

export const createBillingRepository = (binding: D1Database) => {
  const ensureCustomer = async (userId: string, now = Date.now()): Promise<void> => {
    await binding.prepare(`
      INSERT OR IGNORE INTO billing_customer (user_id, created_at, updated_at)
      VALUES (?, ?, ?)
    `).bind(userId, now, now).run();
  };

  const createCheckoutCorrelation = async (input: {
    readonly id: string;
    readonly userId: string;
    readonly planId: string;
    readonly referenceId: string;
    readonly now?: number;
  }): Promise<void> => {
    const now = input.now ?? Date.now();
    await ensureCustomer(input.userId, now);
    await binding.prepare(`
      INSERT INTO billing_checkout (id, user_id, plan_id, provider_reference_id, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'pending', ?, ?)
    `).bind(input.id, input.userId, input.planId, input.referenceId, now, now).run();
  };

  const attachProviderSession = async (
    userId: string,
    checkoutId: string,
    providerSessionId: string,
    now = Date.now(),
  ): Promise<boolean> => {
    const result = await binding.prepare(`
      UPDATE billing_checkout
      SET provider_session_id = ?, updated_at = ?
      WHERE id = ? AND user_id = ?
    `).bind(providerSessionId, now, checkoutId, userId).run();
    return Boolean(result.meta.changes);
  };

  const expireCheckout = async (userId: string, checkoutId: string, now = Date.now()): Promise<boolean> => {
    const result = await binding.prepare(`
      UPDATE billing_checkout
      SET status = 'expired', updated_at = ?
      WHERE id = ? AND user_id = ? AND status = 'pending'
    `).bind(now, checkoutId, userId).run();
    return Boolean(result.meta.changes);
  };

  const getEventOwner = async (referenceId: string, providerPlanId: string): Promise<BillingEventOwner | null> => {
    const subscription = await binding.prepare(`
      SELECT user_id AS userId, plan_id AS planId
      FROM billing_subscription
      WHERE provider_plan_id = ? OR reference_id = ?
      ORDER BY updated_at DESC LIMIT 1
    `).bind(providerPlanId, referenceId).first<CheckoutOwnerRow>();
    if (subscription) return subscription;
    return await binding.prepare(`
      SELECT user_id AS userId, plan_id AS planId
      FROM billing_checkout
      WHERE provider_reference_id = ?
      ORDER BY created_at DESC LIMIT 1
    `).bind(referenceId).first<CheckoutOwnerRow>();
  };

  const getStatusForUser = async (userId: string): Promise<BillingStatusRecord> => {
    const subscription = await binding.prepare(`
      SELECT id, user_id AS userId, plan_id AS planId, provider_plan_id AS providerPlanId,
             reference_id AS referenceId, status, latest_cycle_status AS latestCycleStatus,
             latest_event_at AS latestEventAt, latest_event_rank AS latestEventRank,
             next_cycle_at AS nextCycleAt, cancellation_requested_at AS cancellationRequestedAt
      FROM billing_subscription
      WHERE user_id = ?
      ORDER BY updated_at DESC
      LIMIT 1
    `).bind(userId).first<SubscriptionRow>();
    const pending = await binding.prepare(`
      SELECT id FROM billing_checkout
      WHERE user_id = ? AND status = 'pending'
      ORDER BY created_at DESC LIMIT 1
    `).bind(userId).first<{ id: string }>();
    return { subscription: subscription ? subscriptionFromRow(subscription) : null, checkoutPending: Boolean(pending) };
  };

  const getSubscriptionForCancellation = async (userId: string): Promise<BillingSubscriptionRecord | null> => {
    const row = await binding.prepare(`
      SELECT id, user_id AS userId, plan_id AS planId, provider_plan_id AS providerPlanId,
             reference_id AS referenceId, status, latest_cycle_status AS latestCycleStatus,
             latest_event_at AS latestEventAt, latest_event_rank AS latestEventRank,
             next_cycle_at AS nextCycleAt, cancellation_requested_at AS cancellationRequestedAt
      FROM billing_subscription
      WHERE user_id = ? AND status <> 'inactive'
      ORDER BY updated_at DESC LIMIT 1
    `).bind(userId).first<SubscriptionRow>();
    return row ? subscriptionFromRow(row) : null;
  };

  const markCancellationRequested = async (
    userId: string,
    providerPlanId: string,
    now = Date.now(),
  ): Promise<boolean> => {
    const result = await binding.prepare(`
      UPDATE billing_subscription
      SET cancellation_requested_at = COALESCE(cancellation_requested_at, ?), updated_at = ?
      WHERE user_id = ? AND provider_plan_id = ? AND status <> 'inactive'
    `).bind(now, now, userId, providerPlanId).run();
    return Boolean(result.meta.changes);
  };

  const applyWebhookTransition = async (
    event: BillingWebhookTransition,
    receivedAt = Date.now(),
  ): Promise<{ readonly duplicate: boolean; readonly applied: boolean; readonly matched: boolean }> => {
    const existingInbox = await binding.prepare(`SELECT dedupe_key FROM billing_webhook_inbox WHERE dedupe_key = ? LIMIT 1`)
      .bind(event.dedupeKey).first<{ dedupe_key: string }>();
    if (existingInbox) return { duplicate: true, applied: false, matched: true };

    const existingSubscription = await binding.prepare(`
      SELECT id, user_id AS userId, plan_id AS planId, provider_plan_id AS providerPlanId,
             reference_id AS referenceId, status, latest_cycle_status AS latestCycleStatus,
             latest_event_at AS latestEventAt, latest_event_rank AS latestEventRank,
             next_cycle_at AS nextCycleAt, cancellation_requested_at AS cancellationRequestedAt
      FROM billing_subscription
      WHERE provider_plan_id = ? OR reference_id = ?
      ORDER BY updated_at DESC LIMIT 1
    `).bind(event.providerPlanId, event.referenceId).first<SubscriptionRow>();

    const checkout = existingSubscription ? null : await binding.prepare(`
      SELECT user_id AS userId, plan_id AS planId
      FROM billing_checkout WHERE provider_reference_id = ? LIMIT 1
    `).bind(event.referenceId).first<CheckoutOwnerRow>();

    const owner = existingSubscription
      ? { userId: existingSubscription.userId, planId: existingSubscription.planId }
      : checkout;
    if (!owner) return { duplicate: false, applied: false, matched: false };

    const nextStatus = event.nextStatus ?? existingSubscription?.status ?? "pending";
    const stale = Boolean(existingSubscription && (
      existingSubscription.status === "inactive" && nextStatus !== "inactive"
      || event.providerEventAt < existingSubscription.latestEventAt
      || event.providerEventAt === existingSubscription.latestEventAt && event.rank < existingSubscription.latestEventRank
    ));
    const inboxResult = stale ? "ignored" : "applied";
    const subscriptionId = existingSubscription?.id ?? crypto.randomUUID();
    const claimToken = crypto.randomUUID();

    const inboxStatement = binding.prepare(`
      INSERT OR IGNORE INTO billing_webhook_inbox
        (dedupe_key, claim_token, event_name, provider_plan_id, provider_cycle_id, provider_event_at, received_at, processed_at, result)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      event.dedupeKey,
      claimToken,
      event.eventName,
      event.providerPlanId,
      event.providerCycleId,
      event.providerEventAt,
      receivedAt,
      receivedAt,
      inboxResult,
    );

    const subscriptionStatement = binding.prepare(`
      INSERT INTO billing_subscription (
        id, user_id, plan_id, provider_plan_id, reference_id, status, latest_cycle_status,
        latest_event_at, latest_event_rank, current_cycle_started_at, next_cycle_at,
        provider_created_at, provider_updated_at, created_at, updated_at
      )
      SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
      WHERE ? = 0
        AND EXISTS (SELECT 1 FROM billing_webhook_inbox WHERE dedupe_key = ? AND claim_token = ?)
      ON CONFLICT(provider_plan_id) DO UPDATE SET
        status = excluded.status,
        latest_cycle_status = excluded.latest_cycle_status,
        latest_event_at = excluded.latest_event_at,
        latest_event_rank = excluded.latest_event_rank,
        current_cycle_started_at = COALESCE(excluded.current_cycle_started_at, billing_subscription.current_cycle_started_at),
        next_cycle_at = COALESCE(excluded.next_cycle_at, billing_subscription.next_cycle_at),
        provider_created_at = COALESCE(excluded.provider_created_at, billing_subscription.provider_created_at),
        provider_updated_at = COALESCE(excluded.provider_updated_at, billing_subscription.provider_updated_at),
        updated_at = excluded.updated_at
      WHERE (billing_subscription.status <> 'inactive' OR excluded.status = 'inactive')
        AND (
          excluded.latest_event_at > billing_subscription.latest_event_at
          OR (
            excluded.latest_event_at = billing_subscription.latest_event_at
            AND excluded.latest_event_rank >= billing_subscription.latest_event_rank
          )
        )
    `).bind(
      subscriptionId,
      owner.userId,
      owner.planId,
      event.providerPlanId,
      event.referenceId,
      nextStatus,
      event.latestCycleStatus,
      event.providerEventAt,
      event.rank,
      event.currentCycleStartedAt,
      event.nextCycleAt,
      event.providerCreatedAt,
      event.providerUpdatedAt,
      receivedAt,
      receivedAt,
      stale ? 1 : 0,
      event.dedupeKey,
      claimToken,
    );

    const checkoutStatement = binding.prepare(`
      UPDATE billing_checkout SET status = 'completed', updated_at = ?
      WHERE provider_reference_id = ? AND ? = 0
        AND EXISTS (SELECT 1 FROM billing_webhook_inbox WHERE dedupe_key = ? AND claim_token = ?)
    `).bind(receivedAt, event.referenceId, stale ? 1 : 0, event.dedupeKey, claimToken);

    const results = await binding.batch([inboxStatement, subscriptionStatement, checkoutStatement]);
    const inserted = Boolean(results[0]?.meta.changes);
    const subscriptionChanged = Boolean(results[1]?.meta.changes);
    return { duplicate: !inserted, applied: inserted && !stale && subscriptionChanged, matched: true };
  };

  return {
    ensureCustomer,
    createCheckoutCorrelation,
    attachProviderSession,
    expireCheckout,
    getEventOwner,
    getStatusForUser,
    getSubscriptionForCancellation,
    markCancellationRequested,
    applyWebhookTransition,
  };
};
