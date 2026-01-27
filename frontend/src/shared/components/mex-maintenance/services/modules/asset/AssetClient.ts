import { MexHttpClient } from '../../core/http';
import { AssetDTO } from './AssetDTO';

export class AssetClient {
  constructor(private readonly http: MexHttpClient) {}

  getAll(): Promise<AssetDTO[]> {
    return this.http.get('/Asset/GetAll');
  }

  getById(assetId: number): Promise<AssetDTO> {
    return this.http.get(`/Asset/${assetId}`);
  }

  getByAssetNumber(assetNumber: string): Promise<AssetDTO[]> {
    return this.http.get(
      `/Asset/GetByAssetNumber/${encodeURIComponent(assetNumber)}`
    );
  }

  create(
    actionedByContactId: number,
    payload: AssetDTO
  ): Promise<AssetDTO> {
    return this.http.post(
      `/Asset/${actionedByContactId}`,
      payload
    );
  }

  update(
    assetId: number,
    actionedByContactId: number,
    payload: AssetDTO
  ): Promise<AssetDTO> {
    return this.http.put(
      `/Asset/${assetId}/${actionedByContactId}`,
      payload
    );
  }
}
