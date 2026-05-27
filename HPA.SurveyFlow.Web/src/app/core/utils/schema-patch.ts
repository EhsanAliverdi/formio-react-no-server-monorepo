/**
 * Patches a Formio schema before rendering:
 * - Rewrites relative data URLs (/api/...) to absolute so Formio doesn't
 *   prepend its own cloud base (api.form.io).
 * - Called in fill-form, public-form-page, and form-renderer contexts.
 */
export function patchSchemaUrls(schema: any, apiBase: string): any {
  if (!schema || typeof schema !== 'object') return schema;

  const walk = (node: any): any => {
    if (!node || typeof node !== 'object') return node;
    if (Array.isArray(node)) return node.map(walk);

    const patched = { ...node };

    // Rewrite relative data.url on select components
    if (
      patched['type'] === 'select' &&
      patched['dataSrc'] === 'url' &&
      patched['data']?.['url']
    ) {
      const url: string = patched['data']['url'];
      if (url.startsWith('/api/')) {
        patched['data'] = { ...patched['data'], url: `${apiBase}${url}` };
      }
    }

    // Recurse into components, columns, rows, tabs
    if (patched['components']) patched['components'] = walk(patched['components']);
    if (patched['columns'])    patched['columns']    = walk(patched['columns']);
    if (patched['rows'])       patched['rows']       = walk(patched['rows']);

    return patched;
  };

  return walk(schema);
}
