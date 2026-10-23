// Retired 2026-10-23 (Counsel): not routed. #/terms is an alias of the no-banner view in lib/router.js. Kept, not deleted.
import { renderDocument } from '../lib/legal.js';
export const render = ctx => renderDocument(ctx, 'terms');
