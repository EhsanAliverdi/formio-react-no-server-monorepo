import { MexHttpClient } from '../../core/http';
import { AssetReadingActionDTO } from './AssetReadingActionDTO';
import { AssetReadingDTO } from './AssetReadingDTO';

export class AssetReadingClient {
  constructor(private readonly http: MexHttpClient) {}

  create(
    actionedByContactId: number,
    payload: AssetReadingActionDTO
  ): Promise<AssetReadingDTO> {
    return this.http.post(
      `/AssetReading/${actionedByContactId}`,
      payload
    );
  }
}
