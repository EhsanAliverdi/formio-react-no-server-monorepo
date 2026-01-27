import { MexHttpClient } from '../../core/http';
import { SupplierDTO } from './SupplierDTO';

export class SupplierClient {
  constructor(
    private readonly http: MexHttpClient
  ) {}

  getAll(): Promise<SupplierDTO[]> {
    return this.http.get('/Supplier/GetAll');
  }

  getById(
    supplierId: number
  ): Promise<SupplierDTO> {
    return this.http.get(`/Supplier/${supplierId}`);
  }

  getByCode(
    code: string
  ): Promise<SupplierDTO[]> {
    return this.http.get(
      `/Supplier/GetByCode/${encodeURIComponent(code)}`
    );
  }

  getByCompany(
    company: string
  ): Promise<SupplierDTO[]> {
    return this.http.get(
      `/Supplier/GetByCompany/${encodeURIComponent(company)}`
    );
  }

  create(
    actionedByContactId: number,
    payload: SupplierDTO
  ): Promise<SupplierDTO> {
    return this.http.post(
      `/Supplier/${actionedByContactId}`,
      payload
    );
  }

  update(
    supplierId: number,
    actionedByContactId: number,
    payload: SupplierDTO
  ): Promise<SupplierDTO> {
    return this.http.put(
      `/Supplier/${supplierId}/${actionedByContactId}`,
      payload
    );
  }
}
