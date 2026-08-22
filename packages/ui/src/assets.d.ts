/**
 * Metro resolves an image import to an opaque asset handle, not to a URL. There
 * is no ambient declaration for that in this package, so it lives here rather
 * than as a `require()` at each call site.
 */
declare module "*.png" {
  const asset: number;
  export default asset;
}
