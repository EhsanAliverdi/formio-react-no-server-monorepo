import { MexHttpClient } from '../../core/http';
import { RequestDTO } from './RequestDTO';

export class RequestClient {
  constructor(
    private readonly http: MexHttpClient
  ) {}

  getAll(): Promise<RequestDTO[]> {
    return this.http.get('/Request/GetAll');
  }

  getById(
    requestId: number
  ): Promise<RequestDTO> {
    return this.http.get(`/Request/${requestId}`);
  }

  getByRequestNumber(
    requestNumber: string
  ): Promise<RequestDTO> {
    return this.http.get(
      `/Request/GetByRequestNumber/${encodeURIComponent(
        requestNumber
      )}`
    );
  }

  getByDescription(
    description: string
  ): Promise<RequestDTO[]> {
    return this.http.get(
      `/Request/GetByRequestDescription/${encodeURIComponent(
        description
      )}`
    );
  }

  create(
    actionedByContactId: number,
    payload: RequestDTO
  ): Promise<RequestDTO> {
    return this.http.post(
      `/Request/${actionedByContactId}`,
      payload
    );
  }

  update(
    requestId: number,
    actionedByContactId: number,
    payload: RequestDTO
  ): Promise<RequestDTO> {
    return this.http.put(
      `/Request/${requestId}/${actionedByContactId}`,
      payload
    );
  }
}
