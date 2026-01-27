import { MexHttpClient } from '../../core/http';
import { WorkOrderDTO } from './WorkOrderDTO';

export class WorkOrderClient {
  constructor(
    private readonly http: MexHttpClient
  ) {}

  getAll(): Promise<WorkOrderDTO[]> {
    return this.http.get('/WorkOrder/GetAll');
  }

  getById(
    workOrderId: number
  ): Promise<WorkOrderDTO> {
    return this.http.get(`/WorkOrder/${workOrderId}`);
  }

  getByWorkOrderNumber(
    workOrderNumber: string
  ): Promise<WorkOrderDTO> {
    return this.http.get(
      `/WorkOrder/GetByWorkOrderNumber/${encodeURIComponent(
        workOrderNumber
      )}`
    );
  }

  create(
    actionedByContactId: number,
    payload: WorkOrderDTO
  ): Promise<WorkOrderDTO> {
    return this.http.post(
      `/WorkOrder/${actionedByContactId}`,
      payload
    );
  }

  update(
    workOrderId: number,
    actionedByContactId: number,
    payload: WorkOrderDTO
  ): Promise<WorkOrderDTO> {
    return this.http.put(
      `/WorkOrder/${workOrderId}/${actionedByContactId}`,
      payload
    );
  }
}
