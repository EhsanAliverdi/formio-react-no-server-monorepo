import { MexHttpClient } from '../../core/http';
import { PriorityDTO } from './PriorityDTO';

export class PriorityClient {
  constructor(
    private readonly http: MexHttpClient
  ) {}

  getAll(): Promise<PriorityDTO[]> {
    return this.http.get('/Priority/GetAll');
  }

  getById(
    priorityId: number
  ): Promise<PriorityDTO> {
    return this.http.get(`/Priority/${priorityId}`);
  }

  getByNumber(
    priorityNumber: number
  ): Promise<PriorityDTO[]> {
    return this.http.get(
      `/Priority/GetByPriorityNumber/${priorityNumber}`
    );
  }

  getByDescription(
    description: string
  ): Promise<PriorityDTO[]> {
    return this.http.get(
      `/Priority/GetByPriorityDescription/${encodeURIComponent(
        description
      )}`
    );
  }
}
