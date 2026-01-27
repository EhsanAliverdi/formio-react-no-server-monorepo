import { WorkOrderSpareClient } from './WorkOrderSpareClient';
import { WorkOrderSpareDTO } from './WorkOrderSpareDTO';
import { Result } from '../../core/types';
import { mapWorkOrderSpareError } from './WorkOrderSpareErrorMapper';

export class WorkOrderSpareService {
  constructor(
    private readonly client: WorkOrderSpareClient
  ) {}

  async getAll(): Promise<Result<WorkOrderSpareDTO[]>> {
    try {
      const data = await this.client.getAll();
      return { ok: true, value: data };
    } catch (err) {
      return {
        ok: false,
        error: mapWorkOrderSpareError(err),
      };
    }
  }

  async getById(
    id: number
  ): Promise<Result<WorkOrderSpareDTO>> {
    try {
      const data = await this.client.getById(id);
      return { ok: true, value: data };
    } catch (err) {
      return {
        ok: false,
        error: mapWorkOrderSpareError(err),
      };
    }
  }

  async getByWorkOrderId(
    workOrderId: number
  ): Promise<Result<WorkOrderSpareDTO[]>> {
    try {
      const data =
        await this.client.getByWorkOrderId(
          workOrderId
        );
      return { ok: true, value: data };
    } catch (err) {
      return {
        ok: false,
        error: mapWorkOrderSpareError(err),
      };
    }
  }
}
