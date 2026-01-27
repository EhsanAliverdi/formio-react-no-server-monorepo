import { ContactClient } from './ContactClient';
import { ContactDTO } from './ContactDTO';
import { Result } from '../../core/types';
import { mapContactError } from './ContactErrorMapper';

export class ContactService {
  constructor(
    private readonly client: ContactClient
  ) {}

  async getByUsername(
    username: string
  ): Promise<Result<ContactDTO>> {
    try {
      const data =
        await this.client.getByUsername(username);
      return { ok: true, value: data };
    } catch (err) {
      return {
        ok: false,
        error: mapContactError(err),
      };
    }
  }

  async getByFullName(
    fullName: string
  ): Promise<Result<ContactDTO>> {
    try {
      const data =
        await this.client.getByFullName(fullName);
      return { ok: true, value: data };
    } catch (err) {
      return {
        ok: false,
        error: mapContactError(err),
      };
    }
  }
}
