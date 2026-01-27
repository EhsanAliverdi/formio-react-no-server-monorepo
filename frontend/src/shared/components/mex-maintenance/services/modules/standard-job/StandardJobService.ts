import { StandardJobClient } from './StandardJobClient';
import { StandardJobActionDTO } from './StandardJobActionDTO';
import { Result } from '../../core/types';
import { mapStandardJobError } from './StandardJobErrorMapper';

export class StandardJobService {
  constructor(
    private readonly client: StandardJobClient
  ) {}

  async raiseWorkOrder(
    action: StandardJobActionDTO
  ): Promise<Result<void>> {
    try {
      await this.client.raiseWorkOrder(action);
      return { ok: true, value: undefined };
    } catch (err) {
      return {
        ok: false,
        error: mapStandardJobError(err),
      };
    }
  }
}
