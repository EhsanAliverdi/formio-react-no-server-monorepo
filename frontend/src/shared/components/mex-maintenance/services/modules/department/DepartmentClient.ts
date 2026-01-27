import { MexHttpClient } from '../../core/http';
import { DepartmentDTO } from './DepartmentDTO';

export class DepartmentClient {
  constructor(private readonly http: MexHttpClient) {}

  getAll(): Promise<DepartmentDTO[]> {
    return this.http.get('/Department/GetAll');
  }

  getById(departmentId: number): Promise<DepartmentDTO> {
    return this.http.get(`/Department/${departmentId}`);
  }

  getByName(name: string): Promise<DepartmentDTO[]> {
    return this.http.get(
      `/Department/GetByDepartmentName/${encodeURIComponent(
        name
      )}`
    );
  }
}
