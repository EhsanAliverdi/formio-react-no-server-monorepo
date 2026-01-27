import { MexHttpClient } from '../../core/http';
import { ComponentCodeDTO } from './ComponentCodeDTO';

export class ComponentCodeClient {
  constructor(private readonly http: MexHttpClient) {}

  getAll(): Promise<ComponentCodeDTO[]> {
    return this.http.get('/ComponentCode/GetAll');
  }

  getById(
    componentCodeId: number
  ): Promise<ComponentCodeDTO> {
    return this.http.get(
      `/ComponentCode/${componentCodeId}`
    );
  }

  getByName(
    name: string
  ): Promise<ComponentCodeDTO[]> {
    return this.http.get(
      `/ComponentCode/GetByComponentCodeName/${encodeURIComponent(
        name
      )}`
    );
  }

  getByDescription(
    description: string
  ): Promise<ComponentCodeDTO[]> {
    return this.http.get(
      `/ComponentCode/GetByComponentCodeDescription/${encodeURIComponent(
        description
      )}`
    );
  }
}
