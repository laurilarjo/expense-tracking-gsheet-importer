import * as tf from '@tensorflow/tfjs';
import type { BlobStore } from '../storage/blob-store';
import {
  MLCategorizationService,
  type ModelArtifactsBundle,
} from './ml-categorization-service';
import { memberModelPrefix } from './workspace-service';
import type { ModelMetadata } from '../types/categorization';

function toBase64(data: ArrayBuffer): string {
  return Buffer.from(data).toString('base64');
}

function fromBase64(b64: string): ArrayBuffer {
  const buf = Buffer.from(b64, 'base64');
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
}

/**
 * Persist / load per-member TF models via BlobStore.
 */
export class ModelStore {
  constructor(private readonly store: BlobStore) {}

  async saveArtifacts(
    workspaceId: string,
    memberId: string,
    bundle: ModelArtifactsBundle
  ): Promise<void> {
    const prefix = memberModelPrefix(workspaceId, memberId);
    await this.store.putJson(`${prefix}/model.json`, {
      modelTopology: bundle.modelTopology,
      weightSpecs: bundle.weightSpecs,
      weightDataBase64: toBase64(bundle.weightData),
    });
    await this.store.putJson(`${prefix}/vocabulary.json`, bundle.vocabulary);
    await this.store.putJson(`${prefix}/categories.json`, bundle.categories);
    await this.store.putJson(`${prefix}/metadata.json`, bundle.metadata);
  }

  async loadService(
    workspaceId: string,
    memberId: string
  ): Promise<MLCategorizationService | null> {
    const prefix = memberModelPrefix(workspaceId, memberId);
    const modelJson = await this.store.getJson<{
      modelTopology: unknown;
      weightSpecs: tf.io.WeightsManifestEntry[];
      weightDataBase64: string;
    }>(`${prefix}/model.json`);
    const vocabulary = await this.store.getJson<string[]>(`${prefix}/vocabulary.json`);
    const categories = await this.store.getJson<string[]>(`${prefix}/categories.json`);
    const metadata = await this.store.getJson<ModelMetadata>(`${prefix}/metadata.json`);

    if (!modelJson || !vocabulary || !categories || !metadata) {
      return null;
    }

    const service = new MLCategorizationService(memberId);
    const ok = await service.loadFromArtifacts({
      modelTopology: modelJson.modelTopology,
      weightSpecs: modelJson.weightSpecs,
      weightData: fromBase64(modelJson.weightDataBase64),
      vocabulary,
      categories,
      metadata,
    });
    return ok ? service : null;
  }
}

/** Process-wide cache for warm serverless instances. */
const modelCache = new Map<string, { service: MLCategorizationService; loadedAt: number }>();

export async function getCachedModel(
  store: BlobStore,
  workspaceId: string,
  memberId: string
): Promise<MLCategorizationService | null> {
  const key = `${workspaceId}:${memberId}`;
  const cached = modelCache.get(key);
  if (cached) return cached.service;

  const modelStore = new ModelStore(store);
  const service = await modelStore.loadService(workspaceId, memberId);
  if (service) {
    modelCache.set(key, { service, loadedAt: Date.now() });
  }
  return service;
}

export function clearModelCache(): void {
  modelCache.clear();
}
