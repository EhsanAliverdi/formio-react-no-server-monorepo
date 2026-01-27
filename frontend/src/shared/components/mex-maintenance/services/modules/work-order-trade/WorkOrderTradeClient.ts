import { MexHttpClient } from '../../core/http';
import { WorkOrderTradeDTO } from './WorkOrderTradeDTO';

export class WorkOrderTradeClient {
  constructor(
    private readonly http: MexHttpClient
  ) {}

  getAll(): Promise<WorkOrderTradeDTO[]> {
    return this.http.get('/WorkOrderTrade/GetAll');
  }

  getById(
    workOrderTradeId: number
  ): Promise<WorkOrderTradeDTO> {
    return this.http.get(
      `/WorkOrderTrade/${workOrderTradeId}`
    );
  }

  getByWorkOrderId(
    workOrderId: number
  ): Promise<WorkOrderTradeDTO[]> {
    return this.http.get(
      `/WorkOrderTrade/GetByWorkOrderId/${workOrderId}`
    );
  }
}
