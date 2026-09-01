import type { D1Database } from "@cloudflare/workers-types";

import type { NormalizedWidgetOrigin, WidgetDomainStatus } from "./contracts";

export interface StoredWidgetDomain {
  readonly id: string;
  readonly ownerUserId: string;
  readonly normalizedHostname: string;
  readonly displayHostname: string;
  readonly pairKey: string;
  readonly status: WidgetDomainStatus;
  readonly verifiedAt: number | null;
  readonly createdAt: number;
  readonly updatedAt: number;
  readonly deletedAt: number | null;
}

export type WidgetVerificationMethod = "dns_txt" | "local_development";
export type WidgetVerificationStatus = "pending" | "verified" | "expired" | "revoked";

export interface StoredWidgetVerification {
  readonly id: string;
  readonly domainId: string;
  readonly method: WidgetVerificationMethod;
  readonly challengeToken: string | null;
  readonly status: WidgetVerificationStatus;
  readonly expiresAt: number | null;
  readonly lastCheckedAt: number | null;
  readonly verifiedAt: number | null;
  readonly createdAt: number;
}

export interface CreateWidgetVerificationInput {
  readonly domainId: string;
  readonly method: WidgetVerificationMethod;
  readonly challengeToken: string | null;
  readonly expiresAt: number | null;
  readonly createdAt: number;
}

type DomainRow = {
  id: string; owner_user_id: string; normalized_hostname: string; display_hostname: string; pair_key: string;
  status: WidgetDomainStatus; verified_at: number | null; created_at: number; updated_at: number; deleted_at: number | null;
};
type VerificationRow = {
  id: string; domain_id: string; method: WidgetVerificationMethod; challenge_token: string | null;
  status: WidgetVerificationStatus; expires_at: number | null; last_checked_at: number | null; verified_at: number | null; created_at: number;
};

const decodeDomain = (row: DomainRow): StoredWidgetDomain => ({
  id: row.id, ownerUserId: row.owner_user_id, normalizedHostname: row.normalized_hostname,
  displayHostname: row.display_hostname, pairKey: row.pair_key, status: row.status,
  verifiedAt: row.verified_at, createdAt: row.created_at, updatedAt: row.updated_at, deletedAt: row.deleted_at,
});
const decodeVerification = (row: VerificationRow): StoredWidgetVerification => ({
  id: row.id, domainId: row.domain_id, method: row.method, challengeToken: row.challenge_token,
  status: row.status, expiresAt: row.expires_at, lastCheckedAt: row.last_checked_at,
  verifiedAt: row.verified_at, createdAt: row.created_at,
});

export const createWidgetDomainRepository = (db: D1Database) => {
  const getForOwner = async (userId: string, domainId: string): Promise<StoredWidgetDomain | null> => {
    const row = await db.prepare(
      "SELECT * FROM widget_domain WHERE id = ? AND owner_user_id = ? AND deleted_at IS NULL LIMIT 1",
    ).bind(domainId, userId).first<DomainRow>();
    return row ? decodeDomain(row) : null;
  };

  const listForOwner = async (userId: string): Promise<StoredWidgetDomain[]> => {
    const rows = await db.prepare(
      "SELECT * FROM widget_domain WHERE owner_user_id = ? AND deleted_at IS NULL ORDER BY updated_at DESC, id ASC",
    ).bind(userId).all<DomainRow>();
    return rows.results.map(decodeDomain);
  };

  const create = async (userId: string, origin: NormalizedWidgetOrigin, now: number): Promise<StoredWidgetDomain> => {
    const id = crypto.randomUUID();
    await db.prepare(`
      INSERT INTO widget_domain
        (id, owner_user_id, normalized_hostname, display_hostname, pair_key, status, verified_at, created_at, updated_at, deleted_at)
      VALUES (?, ?, ?, ?, ?, 'pending', NULL, ?, ?, NULL)
    `).bind(id, userId, origin.hostname, origin.displayHostname, origin.pairKey, now, now).run();
    const stored = await getForOwner(userId, id);
    if (!stored) throw new Error("widget domain create invariant failed");
    return stored;
  };

  const setStatus = async (
    userId: string, domainId: string, status: WidgetDomainStatus, now: number,
  ): Promise<StoredWidgetDomain | null> => {
    await db.prepare(
      "UPDATE widget_domain SET status = ?, updated_at = ? WHERE id = ? AND owner_user_id = ? AND deleted_at IS NULL",
    ).bind(status, now, domainId, userId).run();
    return getForOwner(userId, domainId);
  };

  const softDelete = async (userId: string, domainId: string, now: number): Promise<boolean> => {
    const result = await db.prepare(
      "UPDATE widget_domain SET deleted_at = ?, updated_at = ? WHERE id = ? AND owner_user_id = ? AND deleted_at IS NULL",
    ).bind(now, now, domainId, userId).run();
    return Number(result.meta.changes ?? 0) > 0;
  };

  const createVerification = async (input: CreateWidgetVerificationInput): Promise<StoredWidgetVerification> => {
    const id = crypto.randomUUID();
    await db.prepare(`
      INSERT INTO widget_verification
        (id, domain_id, method, challenge_token, status, expires_at, last_checked_at, verified_at, created_at)
      VALUES (?, ?, ?, ?, 'pending', ?, NULL, NULL, ?)
    `).bind(id, input.domainId, input.method, input.challengeToken, input.expiresAt, input.createdAt).run();
    const row = await db.prepare("SELECT * FROM widget_verification WHERE id = ? LIMIT 1")
      .bind(id).first<VerificationRow>();
    if (!row) throw new Error("widget verification create invariant failed");
    return decodeVerification(row);
  };

  const getPendingVerification = async (domainId: string): Promise<StoredWidgetVerification | null> => {
    const row = await db.prepare(
      "SELECT * FROM widget_verification WHERE domain_id = ? AND status = 'pending' ORDER BY created_at DESC LIMIT 1",
    ).bind(domainId).first<VerificationRow>();
    return row ? decodeVerification(row) : null;
  };

  const recordVerificationCheck = async (id: string, checkedAt: number): Promise<void> => {
    await db.prepare("UPDATE widget_verification SET last_checked_at = ? WHERE id = ? AND status = 'pending'")
      .bind(checkedAt, id).run();
  };

  const completeVerification = async (id: string, domainId: string, verifiedAt: number): Promise<void> => {
    await db.batch([
      db.prepare(
        "UPDATE widget_verification SET status = 'verified', verified_at = ?, last_checked_at = ? WHERE id = ? AND domain_id = ? AND status = 'pending'",
      ).bind(verifiedAt, verifiedAt, id, domainId),
      db.prepare(
        "UPDATE widget_domain SET status = 'active', verified_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL",
      ).bind(verifiedAt, verifiedAt, domainId),
    ]);
  };

  return {
    listForOwner, getForOwner, create, setStatus, softDelete,
    createVerification, getPendingVerification, recordVerificationCheck, completeVerification,
  } as const;
};
