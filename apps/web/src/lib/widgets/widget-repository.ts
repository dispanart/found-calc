import type { D1Database } from "@cloudflare/workers-types";

import type {
  WidgetBrandingPreference,
  WidgetStatus,
  WidgetTheme,
} from "./contracts";
import { parseWidgetTheme } from "./contracts";

export type WidgetLocale = "id" | "en";

export interface StoredWidget {
  readonly id: string;
  readonly ownerUserId: string;
  readonly publicWidgetKey: string;
  readonly publicKeyVersion: number;
  readonly name: string;
  readonly calculatorId: string;
  readonly locale: WidgetLocale;
  readonly status: WidgetStatus;
  readonly theme: WidgetTheme;
  readonly brandingPreference: WidgetBrandingPreference;
  readonly defaultInputConfiguration: Readonly<Record<string, unknown>>;
  readonly keyRotatedAt: number | null;
  readonly createdAt: number;
  readonly updatedAt: number;
}

export interface CreateStoredWidgetInput {
  readonly ownerUserId: string;
  readonly publicWidgetKey: string;
  readonly name: string;
  readonly calculatorId: string;
  readonly locale: WidgetLocale;
  readonly status: WidgetStatus;
  readonly theme: WidgetTheme;
  readonly brandingPreference: WidgetBrandingPreference;
  readonly defaultInputConfiguration: Readonly<Record<string, unknown>>;
  readonly createdAt: number;
}

export interface UpdateStoredWidgetInput {
  readonly ownerUserId: string;
  readonly widgetId: string;
  readonly name?: string;
  readonly locale?: WidgetLocale;
  readonly status?: WidgetStatus;
  readonly theme?: WidgetTheme;
  readonly brandingPreference?: WidgetBrandingPreference;
  readonly defaultInputConfiguration?: Readonly<Record<string, unknown>>;
  readonly updatedAt: number;
}

export interface StoredWidgetDomainBinding {
  readonly widgetId: string;
  readonly domainId: string;
  readonly priority: number | null;
  readonly createdAt: number;
}

type WidgetRow = {
  id: string; owner_user_id: string; public_widget_key: string; public_key_version: number; name: string;
  calculator_id: string; locale: WidgetLocale; status: WidgetStatus; theme_json: string;
  branding_preference: WidgetBrandingPreference; default_input_configuration_json: string;
  key_rotated_at: number | null; created_at: number; updated_at: number;
};
type BindingRow = { widget_id: string; domain_id: string; priority: number | null; created_at: number };

const decodeWidget = (row: WidgetRow): StoredWidget => {
  const parsedTheme = parseWidgetTheme(JSON.parse(row.theme_json) as unknown);
  if (!parsedTheme.ok) throw new Error("stored widget theme is invalid");
  const defaults = JSON.parse(row.default_input_configuration_json) as unknown;
  if (typeof defaults !== "object" || defaults === null || Array.isArray(defaults)) {
    throw new Error("stored widget defaults are invalid");
  }
  return {
    id: row.id, ownerUserId: row.owner_user_id, publicWidgetKey: row.public_widget_key,
    publicKeyVersion: row.public_key_version, name: row.name, calculatorId: row.calculator_id,
    locale: row.locale, status: row.status, theme: parsedTheme.value,
    brandingPreference: row.branding_preference,
    defaultInputConfiguration: defaults as Readonly<Record<string, unknown>>,
    keyRotatedAt: row.key_rotated_at, createdAt: row.created_at, updatedAt: row.updated_at,
  };
};
const decodeBinding = (row: BindingRow): StoredWidgetDomainBinding => ({
  widgetId: row.widget_id, domainId: row.domain_id, priority: row.priority, createdAt: row.created_at,
});

export const createWidgetRepository = (db: D1Database) => {
  const getForOwner = async (userId: string, widgetId: string): Promise<StoredWidget | null> => {
    const row = await db.prepare("SELECT * FROM widget_configuration WHERE id = ? AND owner_user_id = ? LIMIT 1")
      .bind(widgetId, userId).first<WidgetRow>();
    return row ? decodeWidget(row) : null;
  };
  const getByPublicKey = async (publicWidgetKey: string): Promise<StoredWidget | null> => {
    const row = await db.prepare("SELECT * FROM widget_configuration WHERE public_widget_key = ? LIMIT 1")
      .bind(publicWidgetKey).first<WidgetRow>();
    return row ? decodeWidget(row) : null;
  };
  const listForOwner = async (userId: string): Promise<StoredWidget[]> => {
    const rows = await db.prepare(
      "SELECT * FROM widget_configuration WHERE owner_user_id = ? ORDER BY updated_at DESC, id ASC",
    ).bind(userId).all<WidgetRow>();
    return rows.results.map(decodeWidget);
  };
  const create = async (input: CreateStoredWidgetInput): Promise<StoredWidget> => {
    const id = crypto.randomUUID();
    await db.prepare(`
      INSERT INTO widget_configuration
        (id, owner_user_id, public_widget_key, public_key_version, name, calculator_id, locale, status, theme_json, branding_preference, default_input_configuration_json, key_rotated_at, created_at, updated_at)
      VALUES (?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)
    `).bind(
      id, input.ownerUserId, input.publicWidgetKey, input.name, input.calculatorId, input.locale, input.status,
      JSON.stringify(input.theme), input.brandingPreference, JSON.stringify(input.defaultInputConfiguration), input.createdAt, input.createdAt,
    ).run();
    const stored = await getForOwner(input.ownerUserId, id);
    if (!stored) throw new Error("widget create invariant failed");
    return stored;
  };
  const update = async (input: UpdateStoredWidgetInput): Promise<StoredWidget | null> => {
    const current = await getForOwner(input.ownerUserId, input.widgetId);
    if (!current) return null;
    const next = {
      name: input.name ?? current.name,
      locale: input.locale ?? current.locale,
      status: input.status ?? current.status,
      theme: input.theme ?? current.theme,
      brandingPreference: input.brandingPreference ?? current.brandingPreference,
      defaults: input.defaultInputConfiguration ?? current.defaultInputConfiguration,
    };
    await db.prepare(`
      UPDATE widget_configuration SET
        name = ?, locale = ?, status = ?, theme_json = ?, branding_preference = ?, default_input_configuration_json = ?, updated_at = ?
      WHERE id = ? AND owner_user_id = ?
    `).bind(
      next.name, next.locale, next.status, JSON.stringify(next.theme), next.brandingPreference,
      JSON.stringify(next.defaults), input.updatedAt, input.widgetId, input.ownerUserId,
    ).run();
    return getForOwner(input.ownerUserId, input.widgetId);
  };
  const rotatePublicKey = async (
    userId: string, widgetId: string, nextKey: string, now: number,
  ): Promise<StoredWidget | null> => {
    const result = await db.prepare(`
      UPDATE widget_configuration
      SET public_widget_key = ?, public_key_version = public_key_version + 1, key_rotated_at = ?, updated_at = ?
      WHERE id = ? AND owner_user_id = ?
    `).bind(nextKey, now, now, widgetId, userId).run();
    return Number(result.meta.changes ?? 0) > 0 ? getForOwner(userId, widgetId) : null;
  };
  const bindDomain = async (userId: string, widgetId: string, domainId: string, priority: number): Promise<void> => {
    const ownership = await db.prepare(`
      SELECT
        EXISTS(SELECT 1 FROM widget_configuration WHERE id = ? AND owner_user_id = ?) AS owns_widget,
        EXISTS(SELECT 1 FROM widget_domain WHERE id = ? AND owner_user_id = ? AND deleted_at IS NULL) AS owns_domain
    `).bind(widgetId, userId, domainId, userId).first<{ owns_widget: number; owns_domain: number }>();
    if (!ownership?.owns_widget || !ownership.owns_domain) throw new Error("widget domain binding forbidden");
    await db.prepare(`
      INSERT INTO widget_domain_binding (widget_id, domain_id, priority, created_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(widget_id, domain_id) DO UPDATE SET priority = excluded.priority
    `).bind(widgetId, domainId, priority, Date.now()).run();
  };
  const unbindDomain = async (userId: string, widgetId: string, domainId: string): Promise<void> => {
    await db.prepare(`
      DELETE FROM widget_domain_binding
      WHERE widget_id = ? AND domain_id = ?
        AND EXISTS(SELECT 1 FROM widget_configuration WHERE id = ? AND owner_user_id = ?)
    `).bind(widgetId, domainId, widgetId, userId).run();
  };
  const listBindings = async (widgetId: string): Promise<StoredWidgetDomainBinding[]> => {
    const rows = await db.prepare(
      "SELECT * FROM widget_domain_binding WHERE widget_id = ? ORDER BY priority ASC, domain_id ASC",
    ).bind(widgetId).all<BindingRow>();
    return rows.results.map(decodeBinding);
  };
  return {
    listForOwner, getForOwner, getByPublicKey, create, update, rotatePublicKey,
    bindDomain, unbindDomain, listBindings,
  } as const;
};
