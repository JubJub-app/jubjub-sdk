// @types/node is not a dependency of this package and the test must not add
// one, so the two node builtins the test uses are declared untyped here.
declare module 'node:test' {
  export function test(name: string, fn: () => void | Promise<void>): void;
}
declare module 'node:assert/strict' {
  const assert: any;
  export default assert;
}
declare module 'node:fs' {
  export function readFileSync(path: string, encoding: string): string;
}
declare module 'node:path' {
  const path: { join(...parts: string[]): string };
  export default path;
}
declare const process: { cwd(): string };
