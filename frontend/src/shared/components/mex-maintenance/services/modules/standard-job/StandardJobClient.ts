import { MexHttpClient } from '../../core/http';
import { StandardJobActionDTO } from './StandardJobActionDTO';

export class StandardJobClient {
  constructor(
    private readonly http: MexHttpClient
  ) {}

  raiseWorkOrder(
    payload: StandardJobActionDTO
  ): Promise<void> {
    return this.http.post(
      '/StandardJob/RaiseWorkOrder',
      payload
    );
  }
}
