import { AssetClient } from './AssetClient';
import { AssetDTO } from './AssetDTO';
import { Result } from '../../core/types';
import { mapAssetError } from './AssetErrorMapper';

export class AssetService {
  constructor(
    private readonly client: AssetClient
  ) {}

  async getAll(): Promise<Result<AssetDTO[]>> {
    try {
      const data = await this.client.getAll();
      return { ok: true, value: data };
    } catch (err) {
      return { ok: false, error: mapAssetError(err) };
    }
  }

  async getById(
    assetId: number
  ): Promise<Result<AssetDTO>> {
    try {
      const data = await this.client.getById(assetId);
      return { ok: true, value: data };
    } catch (err) {
      return { ok: false, error: mapAssetError(err) };
    }
  }

  async getByAssetNumber(
    assetNumber: string
  ): Promise<Result<AssetDTO[]>> {
    try {
      const data = await this.client.getByAssetNumber(assetNumber);
      return { ok: true, value: data };
    } catch (err) {
      return { ok: false, error: mapAssetError(err) };
    }
  }

  async create(
    actionedByContactId: number,
    asset: AssetDTO
  ): Promise<Result<AssetDTO>> {
    try {
      const data = await this.client.create(
        actionedByContactId,
        asset
      );
      return { ok: true, value: data };
    } catch (err) {
      return { ok: false, error: mapAssetError(err) };
    }
  }

  async update(
    assetId: number,
    actionedByContactId: number,
    asset: AssetDTO
  ): Promise<Result<AssetDTO>> {
    try {
      const data = await this.client.update(
        assetId,
        actionedByContactId,
        asset
      );
      return { ok: true, value: data };
    } catch (err) {
      return { ok: false, error: mapAssetError(err) };
    }
  }
}
