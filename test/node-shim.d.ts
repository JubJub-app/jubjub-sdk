// @types/node is not a dependency of this package and the test must not add
// one, so the two node builtins the test uses are declared untyped here.
declare module 'node:test' {
  export function test(name: string, fn: () => void | Promise<void>): void;
}
declare module 'node:assert/strict' {
  const assert: any;
  export default assert;
}
