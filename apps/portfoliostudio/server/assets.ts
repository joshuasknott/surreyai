import { newId } from "../shared/portfolio";
import type { Store } from "./store";

export const MAX_ASSET_DATA_URL_LENGTH = 600_000;
export const MAX_ASSET_BYTES = 400_000;
export const MAX_USER_ASSET_BYTES = 5 * 1024 * 1024;
export const MAX_PROJECT_ASSETS = 40;

const assetKey = (assetId: string) => `asset:${assetId}`;
const ownerIndexKey = (ownerId: string) => `asset-index:user:${ownerId}`;
const assetPath = (assetId: string) => `/api/assets/${assetId}`;

export type AssetMime = "image/jpeg" | "image/png" | "image/webp";

export type AssetRecord = {
  version: 1;
  assetId: string;
  ownerId: string;
  projectId: string;
  contentType: AssetMime;
  bytes: number;
  dataUrl: string;
  createdAt: string;
};

type AssetIndexEntry = {
  assetId: string;
  projectId: string;
  bytes: number;
  createdAt: string;
};
type AssetOwnerIndex = {
  version: 1;
  totalBytes: number;
  assets: AssetIndexEntry[];
};

export type PublishedAssetProject = {
  projectId: string;
  ownerId?: string;
  archived?: boolean;
  publishedAt?: string | null;
  publishedDocument?: unknown;
};

export type AssetReadAccess = {
  userId?: string | null;
  publishedProject?: PublishedAssetProject | null;
  verifiedHostProjectId?: string | null;
};

export type AssetReadResult = {
  assetId: string;
  projectId: string;
  contentType: AssetMime;
  bytes: Uint8Array;
  size: number;
  publicAccess: boolean;
  cacheControl: string;
  etag: string;
};

export type AssetServiceOptions = {
  maxUserBytes?: number;
  maxProjectAssets?: number;
  now?: () => string;
};

export class AssetError extends Error {
  constructor(
    readonly status: 400 | 403 | 404 | 409 | 413,
    message: string,
    readonly code: string,
  ) {
    super(message);
  }
}

function decodeBase64(value: string): Uint8Array {
  if (!value || value.length % 4 === 1 || !/^[A-Za-z0-9+/]*={0,2}$/.test(value))
    throw new AssetError(400, "Upload a valid image file.", "asset_invalid");
  let binary: string;
  try {
    binary = atob(value);
  } catch {
    throw new AssetError(400, "Upload a valid image file.", "asset_invalid");
  }
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function isMagicBytes(bytes: Uint8Array, contentType: AssetMime): boolean {
  if (contentType === "image/jpeg")
    return (
      bytes.length >= 3 &&
      bytes[0] === 0xff &&
      bytes[1] === 0xd8 &&
      bytes[2] === 0xff
    );
  if (contentType === "image/png")
    return (
      bytes.length >= 8 &&
      [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every(
        (value, index) => bytes[index] === value,
      )
    );
  return (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  );
}

function parseDataUrl(value: unknown): {
  contentType: AssetMime;
  bytes: Uint8Array;
} {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > MAX_ASSET_DATA_URL_LENGTH
  )
    throw new AssetError(
      413,
      "That image is too large. Choose an image under 400 KB.",
      "asset_too_large",
    );
  const match =
    /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]*={0,2})$/i.exec(
      value,
    );
  if (!match)
    throw new AssetError(
      400,
      "Use a JPEG, PNG or WebP image.",
      "asset_type_invalid",
    );
  const contentType = match[1].toLowerCase() as AssetMime;
  const bytes = decodeBase64(match[2]);
  if (bytes.length === 0 || bytes.length > MAX_ASSET_BYTES)
    throw new AssetError(
      413,
      "That image is too large. Choose an image under 400 KB.",
      "asset_too_large",
    );
  if (!isMagicBytes(bytes, contentType))
    throw new AssetError(
      400,
      "That file does not match its image type.",
      "asset_signature_invalid",
    );
  return { contentType, bytes };
}

function toIndex(value: AssetOwnerIndex | null): AssetOwnerIndex {
  if (!value || value.version !== 1 || !Array.isArray(value.assets))
    return { version: 1, totalBytes: 0, assets: [] };
  return {
    version: 1,
    totalBytes: Math.max(0, value.totalBytes || 0),
    assets: value.assets.filter(
      (asset) =>
        asset &&
        typeof asset.assetId === "string" &&
        typeof asset.projectId === "string" &&
        Number.isSafeInteger(asset.bytes) &&
        asset.bytes > 0,
    ),
  };
}

function referencesAsset(document: unknown, assetId: string): boolean {
  return (
    typeof document !== "undefined" &&
    JSON.stringify(document).includes(assetPath(assetId))
  );
}

function base64FromDataUrl(dataUrl: string): Uint8Array {
  const comma = dataUrl.indexOf(",");
  return decodeBase64(comma < 0 ? "" : dataUrl.slice(comma + 1));
}

export class AssetService {
  private readonly maxUserBytes: number;
  private readonly maxProjectAssets: number;
  private readonly now: () => string;

  constructor(
    private readonly store: Store,
    options: AssetServiceOptions = {},
  ) {
    this.maxUserBytes = options.maxUserBytes ?? MAX_USER_ASSET_BYTES;
    this.maxProjectAssets = options.maxProjectAssets ?? MAX_PROJECT_ASSETS;
    this.now = options.now ?? (() => new Date().toISOString());
  }

  async upload(
    ownerId: string,
    projectId: string,
    dataUrl: unknown,
  ): Promise<{
    assetId: string;
    url: string;
    bytes: number;
    contentType: AssetMime;
  }> {
    if (!ownerId || !projectId)
      throw new AssetError(
        400,
        "An owner and project are required.",
        "asset_context_invalid",
      );
    const parsed = parseDataUrl(dataUrl);
    const key = ownerIndexKey(ownerId);
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const expected = await this.store.get<AssetOwnerIndex>(key);
      const current = toIndex(expected);
      const projectCount = current.assets.filter(
        (asset) => asset.projectId === projectId,
      ).length;
      if (projectCount >= this.maxProjectAssets)
        throw new AssetError(
          413,
          "This portfolio has reached its image limit.",
          "project_asset_limit",
        );
      if (current.totalBytes + parsed.bytes.byteLength > this.maxUserBytes)
        throw new AssetError(
          413,
          "Your image storage limit has been reached. Delete an unused portfolio or use a smaller image.",
          "user_asset_limit",
        );
      const assetId = newId("asset");
      const createdAt = this.now();
      const record: AssetRecord = {
        version: 1,
        assetId,
        ownerId,
        projectId,
        contentType: parsed.contentType,
        bytes: parsed.bytes.byteLength,
        dataUrl: dataUrl as string,
        createdAt,
      };
      await this.store.put(assetKey(assetId), record);
      const next: AssetOwnerIndex = {
        version: 1,
        totalBytes: current.totalBytes + record.bytes,
        assets: [
          ...current.assets,
          { assetId, projectId, bytes: record.bytes, createdAt },
        ],
      };
      try {
        if (await this.store.compareAndSwap(key, expected, next))
          return {
            assetId,
            url: assetPath(assetId),
            bytes: record.bytes,
            contentType: record.contentType,
          };
      } catch (error) {
        await this.store.delete(assetKey(assetId));
        throw error;
      }
      await this.store.delete(assetKey(assetId));
    }
    throw new AssetError(
      409,
      "Another image upload changed this portfolio. Try again.",
      "asset_conflict",
    );
  }

  async read(
    assetId: string,
    access: AssetReadAccess = {},
  ): Promise<AssetReadResult | null> {
    if (!/^asset_[A-Za-z0-9-]+$/.test(assetId)) return null;
    const record = await this.store.get<AssetRecord>(assetKey(assetId));
    if (!record || record.version !== 1) return null;
    if (access.userId && access.userId === record.ownerId)
      return this.result(record, false);
    const published = access.publishedProject;
    const publicAccess = Boolean(
      published &&
      published.projectId === record.projectId &&
      published.publishedAt &&
      !published.archived &&
      referencesAsset(published.publishedDocument, assetId),
    );
    if (!publicAccess) return null;
    if (
      access.verifiedHostProjectId &&
      access.verifiedHostProjectId !== published?.projectId
    )
      return null;
    return this.result(record, true);
  }

  async deleteForProject(ownerId: string, projectId: string): Promise<number> {
    if (!ownerId || !projectId) return 0;
    const key = ownerIndexKey(ownerId);
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const expected = await this.store.get<AssetOwnerIndex>(key);
      const current = toIndex(expected);
      const removed = current.assets.filter(
        (asset) => asset.projectId === projectId,
      );
      if (removed.length === 0) return 0;
      const remaining = current.assets.filter(
        (asset) => asset.projectId !== projectId,
      );
      const next: AssetOwnerIndex = {
        version: 1,
        totalBytes: remaining.reduce((total, asset) => total + asset.bytes, 0),
        assets: remaining,
      };
      if (!(await this.store.compareAndSwap(key, expected, next))) continue;
      await Promise.all(
        removed.map((asset) => this.store.delete(assetKey(asset.assetId))),
      );
      return removed.length;
    }
    throw new AssetError(
      409,
      "Another image change is still in progress. Try again.",
      "asset_conflict",
    );
  }

  private result(record: AssetRecord, publicAccess: boolean): AssetReadResult {
    return {
      assetId: record.assetId,
      projectId: record.projectId,
      contentType: record.contentType,
      bytes: base64FromDataUrl(record.dataUrl),
      size: record.bytes,
      publicAccess,
      cacheControl: publicAccess
        ? "public, max-age=300, s-maxage=300"
        : "private, no-store",
      etag: `"${record.assetId}-${record.bytes}"`,
    };
  }
}

export const assetStorageKey = assetKey;
export const assetOwnerIndexStorageKey = ownerIndexKey;
