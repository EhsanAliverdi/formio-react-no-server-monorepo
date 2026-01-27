import { MexHttpClient } from '../../core/http';
import { WorkOrderSpareDTO } from './WorkOrderSpareDTO';

export class WorkOrderSpareClient {
  constructor(
    private readonly http: MexHttpClient
  ) {}

  getAll(): Promise<WorkOrderSpareDTO[]> {
    return this.http.get('/WorkOrderSpare/GetAll');
  }

  getById(
    workOrderSpareId: number
  ): Promise<WorkOrderSpareDTO> {
    return this.http.get(
      `/WorkOrderSpare/${workOrderSpareId}`
    );
  }

  getByWorkOrderId(
    workOrderId: number
  ): Promise<WorkOrderSpareDTO[]> {
    return this.http.get(
      `/WorkOrderSpare/GetByWorkOrderId/${workOrderId}`
    );
  }
}
