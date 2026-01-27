import { WorkOrderClient } from './WorkOrderClient';
import { WorkOrderDTO } from './WorkOrderDTO';
import { Result } from '../../core/types';
import { mapWorkOrderError } from './WorkOrderErrorMapper';

export class WorkOrderService {
  constructor(
    private readonly client: WorkOrderClient
  ) {}

  async getAll(): Promise<Result<WorkOrderDTO[]>> {
    try {
      const data = await this.client.getAll();
      return { ok: true, value: data };
    } catch (err) {
      return {
        ok: false,
        error: mapWorkOrderError(err),
      };
    }
  }

  async getById(
    id: number
  ): Promise<Result<WorkOrderDTO>> {
    try {
      const data = await this.client.getById(id);
      return { ok: true, value: data };
    } catch (err) {
      return {
        ok: false,
        error: mapWorkOrderError(err),
      };
    }
  }

  async getByWorkOrderNumber(
    number: string
  ): Promise<Result<WorkOrderDTO>> {
    try {
      const data =
        await this.client.getByWorkOrderNumber(
          number
        );
      return { ok: true, value: data };
    } catch (err) {
      return {
        ok: false,
        error: mapWorkOrderError(err),
      };
    }
  }

  async create(
    actionedByContactId: number,
    workOrder: WorkOrderDTO
  ): Promise<Result<WorkOrderDTO>> {
    try {
      const data = await this.client.create(
        actionedByContactId,
        workOrder
      );
      return { ok: true, value: data };
    } catch (err) {
      return {
        ok: false,
        error: mapWorkOrderError(err),
      };
    }
  }

  async update(
    workOrderId: number,
    actionedByContactId: number,
    workOrder: WorkOrderDTO
  ): Promise<Result<WorkOrderDTO>> {
    try {
      const data = await this.client.update(
        workOrderId,
        actionedByContactId,
        workOrder
      );
      return { ok: true, value: data };
    } catch (err) {
      return {
        ok: false,
        error: mapWorkOrderError(err),
      };
    }
  }
}
