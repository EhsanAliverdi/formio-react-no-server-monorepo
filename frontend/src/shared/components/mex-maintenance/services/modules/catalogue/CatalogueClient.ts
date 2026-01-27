import { MexHttpClient } from '../../core/http';
import { CatalogueDTO } from './CatalogueDTO';

export class CatalogueClient {
  constructor(private readonly http: MexHttpClient) {}

  getAll(): Promise<CatalogueDTO[]> {
    return this.http.get('/Catalogue/GetAll');
  }

  getById(catalogueId: number): Promise<CatalogueDTO> {
    return this.http.get(`/Catalogue/${catalogueId}`);
  }

  getByCatalogueNumber(
    catalogueNumber: string
  ): Promise<CatalogueDTO[]> {
    return this.http.get(
      `/Catalogue/GetByCatalogueNumber/${encodeURIComponent(
        catalogueNumber
      )}`
    );
  }

  create(
    actionedByContactId: number,
    payload: CatalogueDTO
  ): Promise<CatalogueDTO> {
    return this.http.post(
      `/Catalogue/${actionedByContactId}`,
      payload
    );
  }

  update(
    catalogueId: number,
    actionedByContactId: number,
    payload: CatalogueDTO
  ): Promise<CatalogueDTO> {
    return this.http.put(
      `/Catalogue/${catalogueId}/${actionedByContactId}`,
      payload
    );
  }
}
