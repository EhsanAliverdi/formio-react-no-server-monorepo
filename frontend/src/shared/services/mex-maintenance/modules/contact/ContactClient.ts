import { MexHttpClient } from '../../core/http';
import { ContactDTO } from './ContactDTO';

export class ContactClient {
  constructor(private readonly http: MexHttpClient) {}

  getByUsername(username: string): Promise<ContactDTO> {
    return this.http.get(
      `/Contact/GetByUsername/${encodeURIComponent(
        username
      )}`
    );
  }

  getByFullName(
    fullName: string
  ): Promise<ContactDTO> {
    return this.http.get(
      `/Contact/GetByContactName/${encodeURIComponent(
        fullName
      )}`
    );
  }
}
