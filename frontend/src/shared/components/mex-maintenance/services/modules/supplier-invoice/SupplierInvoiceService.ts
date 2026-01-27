import { SupplierInvoiceClient } from './SupplierInvoiceClient';
import { SupplierInvoiceDTO } from './SupplierInvoiceDTO';
import { Result } from '../../core/types';
import { mapSupplierInvoiceError } from './SupplierInvoiceErrorMapper';

export class SupplierInvoiceService {
  constructor(
    private readonly client: SupplierInvoiceClient
  ) {}

  async getAll(): Promise<Result<SupplierInvoiceDTO[]>> {
    try {
      const data = await this.client.getAll();
      return { ok: true, value: data };
    } catch (err) {
      return {
        ok: false,
        error: mapSupplierInvoiceError(err),
      };
    }
  }

  async getById(
    id: number
  ): Promise<Result<SupplierInvoiceDTO>> {
    try {
      const data = await this.client.getById(id);
      return { ok: true, value: data };
    } catch (err) {
      return {
        ok: false,
        error: mapSupplierInvoiceError(err),
      };
    }
  }

  async getByInvoiceNumber(
    invoiceNumber: string
  ): Promise<Result<SupplierInvoiceDTO>> {
    try {
      const data =
        await this.client.getByInvoiceNumber(
          invoiceNumber
        );
      return { ok: true, value: data };
    } catch (err) {
      return {
        ok: false,
        error: mapSupplierInvoiceError(err),
      };
    }
  }

  async create(
    actionedByContactId: number,
    invoice: SupplierInvoiceDTO
  ): Promise<Result<SupplierInvoiceDTO>> {
    try {
      const data = await this.client.create(
        actionedByContactId,
        invoice
      );
      return { ok: true, value: data };
    } catch (err) {
      return {
        ok: false,
        error: mapSupplierInvoiceError(err),
      };
    }
  }

  async update(
    supplierInvoiceId: number,
    actionedByContactId: number,
    invoice: SupplierInvoiceDTO
  ): Promise<Result<SupplierInvoiceDTO>> {
    try {
      const data = await this.client.update(
        supplierInvoiceId,
        actionedByContactId,
        invoice
      );
      return { ok: true, value: data };
    } catch (err) {
      return {
        ok: false,
        error: mapSupplierInvoiceError(err),
      };
    }
  }
}
