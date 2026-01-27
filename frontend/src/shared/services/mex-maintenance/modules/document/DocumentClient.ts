import { MexHttpClient } from '../../core/http';
import { DocumentDTO } from './DocumentDTO';

export class DocumentClient {
  constructor(
    private readonly http: MexHttpClient
  ) {}

  /**
   * Create a document record in MEX
   */
  create(
    actionedByContactId: number,
    payload: DocumentDTO
  ): Promise<DocumentDTO> {
    return this.http.post(
      `/Document/${actionedByContactId}`,
      payload
    );
  }

  /**
   * Update an existing document record in MEX
   */
  update(
    actionedByContactId: number,
    payload: DocumentDTO
  ): Promise<DocumentDTO> {
    return this.http.put(
      `/Document/${actionedByContactId}`,
      payload
    );
  }

  /**
   * Delete a document record in MEX
   * MEX expects documentId as a query parameter
   */
  delete(
    documentId: number
  ): Promise<void> {
    return this.http.delete(
      `/Document/delete?documentId=${documentId}`
    );
  }
}
