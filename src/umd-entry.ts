/**
 * UMD entry point — exposes the JubJub class directly as the global,
 * so `window.JubJub.play(...)` and `window.JubJub.connectBrowserWallet()`
 * work from a script tag without an extra `.JubJub` dereference.
 */
export { JubJub as default } from './JubJub';
