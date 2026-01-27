import { MexHttpClient } from '../../core/http';
import { EmployeeDTO } from './EmployeeDTO';

export class EmployeeClient {
  constructor(
    private readonly http: MexHttpClient
  ) {}

  getAll(): Promise<EmployeeDTO[]> {
    return this.http.get('/Employee/GetAll');
  }

  getById(
    employeeId: number
  ): Promise<EmployeeDTO> {
    return this.http.get(`/Employee/${employeeId}`);
  }

  create(
    actionedByContactId: number,
    payload: EmployeeDTO
  ): Promise<EmployeeDTO> {
    return this.http.post(
      `/Employee/${actionedByContactId}`,
      payload
    );
  }

  update(
    employeeId: number,
    actionedByContactId: number,
    payload: EmployeeDTO
  ): Promise<EmployeeDTO> {
    return this.http.put(
      `/Employee/${employeeId}/${actionedByContactId}`,
      payload
    );
  }
}
