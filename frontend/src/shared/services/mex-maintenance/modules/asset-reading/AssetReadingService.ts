import { AssetReadingClient } from './AssetReadingClient';
import { AssetReadingActionDTO } from './AssetReadingActionDTO';
import { AssetReadingDTO } from './AssetReadingDTO';
import { Result } from '../../core/types';
import { mapAssetReadingError } from './AssetReadingErrorMapper';

export class AssetReadingService {
  constructor(
    private readonly client: AssetReadingClient
  ) {}

  async create(
    actionedByContactId: number,
    reading: AssetReadingActionDTO
  ): Promise<Result<AssetReadingDTO>> {
    try {
      const data = await this.client.create(
        actionedByContactId,
        reading
      );
      return { ok: true, value: data };
    } catch (err) {
      return { ok: false, error: mapAssetReadingError(err) };
    }
  }
}
