/**
 * Registry of field maps for each integration source.
 * Add new entries here when a new integration is added.
 *
 * Key: matches ExternalAsset.source (e.g. "mex")
 */
import { FieldGroup } from './mex-asset.field-map';
import { MEX_ASSET_FIELD_MAP } from './mex-asset.field-map';

const REGISTRY: Record<string, FieldGroup[]> = {
  mex: MEX_ASSET_FIELD_MAP,
  // future: 'myob': MYOB_ASSET_FIELD_MAP,
};

export function getFieldMap(source: string): FieldGroup[] {
  return REGISTRY[source.toLowerCase()] ?? [];
}
