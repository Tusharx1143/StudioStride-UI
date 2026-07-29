/**
 * Test-only 2D context double. Records every call with its arguments and every
 * property assignment, so a canvas draw pass can be asserted on outside a
 * browser.
 */

export interface FakeContext {
  ctx: CanvasRenderingContext2D;
  /** Every method call, in order, with arguments. */
  calls: { name: string; args: unknown[] }[];
  /** Latest value assigned to each context property. */
  props: Record<string, unknown>;
  /** Convenience: arguments of every call to `name`. */
  argsFor(name: string): unknown[][];
  /** Convenience: how many times `name` was called. */
  countOf(name: string): number;
}

export function fakeContext(): FakeContext {
  const calls: { name: string; args: unknown[] }[] = [];
  const props: Record<string, unknown> = {};

  const target: Record<string, unknown> = {
    measureText: (t: string) => {
      calls.push({ name: "measureText", args: [t] });
      return { width: String(t).length * 6 };
    },
    createLinearGradient: () => {
      calls.push({ name: "createLinearGradient", args: [] });
      return { addColorStop: () => {} };
    },
  };

  const ctx = new Proxy(target, {
    get(obj, prop: string) {
      if (prop in obj) return obj[prop];
      if (prop in props) return props[prop];
      return (...args: unknown[]) => {
        calls.push({ name: prop, args });
      };
    },
    set(_obj, prop: string, value) {
      props[prop] = value;
      calls.push({ name: `set:${prop}`, args: [value] });
      return true;
    },
  });

  return {
    ctx: ctx as unknown as CanvasRenderingContext2D,
    calls,
    props,
    argsFor: (name) => calls.filter((c) => c.name === name).map((c) => c.args),
    countOf: (name) => calls.filter((c) => c.name === name).length,
  };
}
