import { MexHttpClient } from '../../core/http';
import { SupplierInvoiceDTO } from './SupplierInvoiceDTO';

export class SupplierInvoiceClient {
  constructor(
    private readonly http: MexHttpClient
  ) {}

  getAll(): Promise<SupplierInvoiceDTO[]> {
    return this.http.get('/SupplierInvoice/GetAll');
  }

  getById(
    supplierInvoiceId: number
  ): Promise<SupplierInvoiceDTO> {
    return this.http.get(
      `/SupplierInvoice/${supplierInvoiceId}`
    );
  }

  getByInvoiceNumber(
    invoiceNumber: string
  ): Promise<SupplierInvoiceDTO> {
    return this.http.get(
      `/SupplierInvoice/GetByInvoiceNumber/${encodeURIComponent(
        invoiceNumber
      )}`
    );
  }

  create(
    actionedByContactId: number,
    payload: SupplierInvoiceDTO
  ): Promise<SupplierInvoiceDTO> {
    return this.http.post(
      `/SupplierInvoice/${actionedByContactId}`,
      payload
    );
  }

  update(
    supplierInvoiceId: number,
    actionedByContactId: number,
    payload: SupplierInvoiceDTO
  ): Promise<SupplierInvoiceDTO> {
    return this.http.put(
      `/SupplierInvoice/${supplierInvoiceId}/${actionedByContactId}`,
      payload
    );
  }
}
