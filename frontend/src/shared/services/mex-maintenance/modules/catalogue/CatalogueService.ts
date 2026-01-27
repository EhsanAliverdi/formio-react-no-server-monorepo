import { CatalogueClient } from './CatalogueClient';
import { CatalogueDTO } from './CatalogueDTO';
import { Result } from '../../core/types';
import { mapCatalogueError } from './CatalogueErrorMapper';

export class CatalogueService {
  constructor(
    private readonly client: CatalogueClient
  ) {}

  async getAll(): Promise<Result<CatalogueDTO[]>> {
    try {
      const data = await this.client.getAll();
      return { ok: true, value: data };
    } catch (err) {
      return { ok: false, error: mapCatalogueError(err) };
    }
  }

  async getById(
    catalogueId: number
  ): Promise<Result<CatalogueDTO>> {
    try {
      const data = await this.client.getById(catalogueId);
      return { ok: true, value: data };
    } catch (err) {
      return { ok: false, error: mapCatalogueError(err) };
    }
  }

  async getByCatalogueNumber(
    catalogueNumber: string
  ): Promise<Result<CatalogueDTO[]>> {
    try {
      const data =
        await this.client.getByCatalogueNumber(
          catalogueNumber
        );
      return { ok: true, value: data };
    } catch (err) {
      return { ok: false, error: mapCatalogueError(err) };
    }
  }

  async create(
    actionedByContactId: number,
    catalogue: CatalogueDTO
  ): Promise<Result<CatalogueDTO>> {
    try {
      const data = await this.client.create(
        actionedByContactId,
        catalogue
      );
      return { ok: true, value: data };
    } catch (err) {
      return { ok: false, error: mapCatalogueError(err) };
    }
  }

  async update(
    catalogueId: number,
    actionedByContactId: number,
    catalogue: CatalogueDTO
  ): Promise<Result<CatalogueDTO>> {
    try {
      const data = await this.client.update(
        catalogueId,
        actionedByContactId,
        catalogue
      );
      return { ok: true, value: data };
    } catch (err) {
      return { ok: false, error: mapCatalogueError(err) };
    }
  }
}
