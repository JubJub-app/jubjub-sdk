/**
 * UMD entry — exports ONLY the JubJub class as the default.
 * This makes `window.JubJub` the class itself (not a namespace wrapper),
 * so `JubJub.init()` and `JubJub.play()` work directly from script tags.
 *
 * ESM consumers use index.ts which has full named exports.
 */
import { JubJub } from './JubJub';
export default JubJub;
