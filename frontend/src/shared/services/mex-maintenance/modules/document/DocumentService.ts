import { DocumentClient } from './DocumentClient';
import { DocumentDTO } from './DocumentDTO';
import { Result } from '../../core/types';
import { mapDocumentError } from './DocumentErrorMapper';

export class DocumentService {
  constructor(
    private readonly client: DocumentClient
  ) {}

  async create(
    actionedByContactId: number,
    document: DocumentDTO
  ): Promise<Result<DocumentDTO>> {
    try {
      const data = await this.client.create(
        actionedByContactId,
        document
      );
      return { ok: true, value: data };
    } catch (err) {
      return {
        ok: false,
        error: mapDocumentError(err),
      };
    }
  }

  async update(
    actionedByContactId: number,
    document: DocumentDTO
  ): Promise<Result<DocumentDTO>> {
    try {
      const data = await this.client.update(
        actionedByContactId,
        document
      );
      return { ok: true, value: data };
    } catch (err) {
      return {
        ok: false,
        error: mapDocumentError(err),
      };
    }
  }

  async delete(
    documentId: number
  ): Promise<Result<void>> {
    try {
      await this.client.delete(documentId);
      return { ok: true, value: undefined };
    } catch (err) {
      return {
        ok: false,
        error: mapDocumentError(err),
      };
    }
  }
}
