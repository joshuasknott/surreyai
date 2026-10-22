import { describe, expect, it } from "vitest";
import {
  AssetError,
  AssetService,
  assetOwnerIndexStorageKey,
  assetStorageKey,
  type PublishedAssetProject,
} from "../server/assets";
import { MemoryStore } from "../server/store";

function dataUrl(type: "jpeg" | "png" | "webp", tail: number[] = []) {
  const signatures: Record<typeof type, number[]> = {
    jpeg: [0xff, 0xd8, 0xff, 0xe0],
    png: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
    webp: [
      0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
    ],
  };
  const bytes = Uint8Array.from([...signatures[type], ...tail]);
  return `data:image/${type};base64,${Buffer.from(bytes).toString("base64")}`;
}

describe("AssetService", () => {
  it("validates image signatures, stores one immutable asset and serves it to its owner", async () => {
    const store = new MemoryStore();
    const service = new AssetService(store, {
      now: () => "2026-10-22T12:00:00.000Z",
    });
    const uploaded = await service.upload(
      "user_1",
      "project_1",
      dataUrl("webp", [1, 2, 3]),
    );
    expect(uploaded.url).toBe(`/api/assets/${uploaded.assetId}`);
    expect(uploaded.bytes).toBe(15);
    const stored = await store.get<{ dataUrl: string }>(
      assetStorageKey(uploaded.assetId),
    );
    expect(stored?.dataUrl).toBe(dataUrl("webp", [1, 2, 3]));
    const result = await service.read(uploaded.assetId, { userId: "user_1" });
    expect(result?.contentType).toBe("image/webp");
    expect([...result!.bytes]).toEqual([
      0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50, 1,
      2, 3,
    ]);
    expect(result?.cacheControl).toBe("private, no-store");
  });

  it("rejects unsupported types, mismatched signatures and decoded payloads over the limit", async () => {
    const service = new AssetService(new MemoryStore());
    await expect(
      service.upload("user_1", "project_1", "data:image/gif;base64,R0lGODlh"),
    ).rejects.toMatchObject({ code: "asset_type_invalid" });
    await expect(
      service.upload(
        "user_1",
        "project_1",
        dataUrl("png").replace("iVBORw0KGgo=", " /wD="),
      ),
    ).rejects.toBeInstanceOf(AssetError);
    const tooLarge = new Uint8Array(400_001);
    tooLarge.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    await expect(
      service.upload(
        "user_1",
        "project_1",
        `data:image/png;base64,${Buffer.from(tooLarge).toString("base64")}`,
      ),
    ).rejects.toMatchObject({ code: "asset_too_large" });
  });

  it("enforces per-project and per-user quotas through the owner index", async () => {
    const store = new MemoryStore();
    const service = new AssetService(store, {
      maxProjectAssets: 2,
      maxUserBytes: 20,
    });
    await service.upload("user_1", "project_1", dataUrl("jpeg", [1, 2, 3, 4]));
    await service.upload("user_1", "project_1", dataUrl("jpeg", [5, 6, 7, 8]));
    await expect(
      service.upload("user_1", "project_1", dataUrl("jpeg", [9, 10, 11, 12])),
    ).rejects.toMatchObject({ code: "project_asset_limit" });
    await expect(
      service.upload("user_1", "project_2", dataUrl("jpeg", [9, 10, 11, 12])),
    ).rejects.toMatchObject({ code: "user_asset_limit" });
    const index = await store.get<{ totalBytes: number; assets: unknown[] }>(
      assetOwnerIndexStorageKey("user_1"),
    );
    expect(index?.assets).toHaveLength(2);
    expect(index?.totalBytes).toBe(16);
  });

  it("keeps anonymous reads private until a published document references the asset", async () => {
    const service = new AssetService(new MemoryStore());
    const uploaded = await service.upload(
      "owner_1",
      "project_1",
      dataUrl("jpeg"),
    );
    const published: PublishedAssetProject = {
      projectId: "project_1",
      ownerId: "owner_1",
      publishedAt: "2026-10-22T12:00:00.000Z",
      publishedDocument: { sections: [{ image: uploaded.url }] },
    };
    expect(await service.read(uploaded.assetId)).toBeNull();
    expect(
      await service.read(uploaded.assetId, {
        publishedProject: { ...published, publishedDocument: { sections: [] } },
      }),
    ).toBeNull();
    const publicResult = await service.read(uploaded.assetId, {
      publishedProject: published,
    });
    expect(publicResult?.publicAccess).toBe(true);
    expect(publicResult?.cacheControl).toContain("max-age=300");
    expect(publicResult?.cacheControl).not.toContain("immutable");
    expect(
      await service.read(uploaded.assetId, {
        publishedProject: published,
        verifiedHostProjectId: "project_other",
      }),
    ).toBeNull();
    expect(
      (
        await service.read(uploaded.assetId, {
          publishedProject: published,
          verifiedHostProjectId: "project_1",
        })
      )?.publicAccess,
    ).toBe(true);
  });

  it("deletes all assets for one project and leaves another project intact", async () => {
    const service = new AssetService(new MemoryStore());
    const first = await service.upload("owner_1", "project_1", dataUrl("png"));
    const second = await service.upload("owner_1", "project_2", dataUrl("png"));
    expect(await service.deleteForProject("owner_1", "project_1")).toBe(1);
    expect(await service.read(first.assetId, { userId: "owner_1" })).toBeNull();
    expect(
      await service.read(second.assetId, { userId: "owner_1" }),
    ).not.toBeNull();
  });
});
