/**
 * DOMParser that works in the browser (native) and on Node (linkedom).
 * linkedom is loaded only when native DOMParser is missing (server / bot).
 */
export async function createDOMParser(): Promise<DOMParser> {
  if (typeof globalThis.DOMParser !== 'undefined') {
    return new globalThis.DOMParser();
  }
  const linkedom = await import('linkedom');
  return new linkedom.DOMParser() as unknown as DOMParser;
}
