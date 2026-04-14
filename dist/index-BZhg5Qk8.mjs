const au = "1.2.3";
let ue = class Kr extends Error {
  constructor(t, n = {}) {
    var i;
    const r = n.cause instanceof Kr ? n.cause.details : (i = n.cause) != null && i.message ? n.cause.message : n.details, s = n.cause instanceof Kr && n.cause.docsPath || n.docsPath, o = [
      t || "An error occurred.",
      "",
      ...n.metaMessages ? [...n.metaMessages, ""] : [],
      ...s ? [`Docs: https://abitype.dev${s}`] : [],
      ...r ? [`Details: ${r}`] : [],
      `Version: abitype@${au}`
    ].join(`
`);
    super(o), Object.defineProperty(this, "details", {
      enumerable: !0,
      configurable: !0,
      writable: !0,
      value: void 0
    }), Object.defineProperty(this, "docsPath", {
      enumerable: !0,
      configurable: !0,
      writable: !0,
      value: void 0
    }), Object.defineProperty(this, "metaMessages", {
      enumerable: !0,
      configurable: !0,
      writable: !0,
      value: void 0
    }), Object.defineProperty(this, "shortMessage", {
      enumerable: !0,
      configurable: !0,
      writable: !0,
      value: void 0
    }), Object.defineProperty(this, "name", {
      enumerable: !0,
      configurable: !0,
      writable: !0,
      value: "AbiTypeError"
    }), n.cause && (this.cause = n.cause), this.details = r, this.docsPath = s, this.metaMessages = n.metaMessages, this.shortMessage = t;
  }
};
function Ue(e, t) {
  const n = e.exec(t);
  return n == null ? void 0 : n.groups;
}
const Si = /^bytes([1-9]|1[0-9]|2[0-9]|3[0-2])?$/, Bi = /^u?int(8|16|24|32|40|48|56|64|72|80|88|96|104|112|120|128|136|144|152|160|168|176|184|192|200|208|216|224|232|240|248|256)?$/, Ti = /^\(.+?\).*?$/, To = /^tuple(?<array>(\[(\d*)\])*)$/;
function Jr(e) {
  let t = e.type;
  if (To.test(e.type) && "components" in e) {
    t = "(";
    const n = e.components.length;
    for (let s = 0; s < n; s++) {
      const o = e.components[s];
      t += Jr(o), s < n - 1 && (t += ", ");
    }
    const r = Ue(To, e.type);
    return t += `)${(r == null ? void 0 : r.array) || ""}`, Jr({
      ...e,
      type: t
    });
  }
  return "indexed" in e && e.indexed && (t = `${t} indexed`), e.name ? `${t} ${e.name}` : t;
}
function xt(e) {
  let t = "";
  const n = e.length;
  for (let r = 0; r < n; r++) {
    const s = e[r];
    t += Jr(s), r !== n - 1 && (t += ", ");
  }
  return t;
}
function Wn(e) {
  var t;
  return e.type === "function" ? `function ${e.name}(${xt(e.inputs)})${e.stateMutability && e.stateMutability !== "nonpayable" ? ` ${e.stateMutability}` : ""}${(t = e.outputs) != null && t.length ? ` returns (${xt(e.outputs)})` : ""}` : e.type === "event" ? `event ${e.name}(${xt(e.inputs)})` : e.type === "error" ? `error ${e.name}(${xt(e.inputs)})` : e.type === "constructor" ? `constructor(${xt(e.inputs)})${e.stateMutability === "payable" ? " payable" : ""}` : e.type === "fallback" ? `fallback() external${e.stateMutability === "payable" ? " payable" : ""}` : "receive() external payable";
}
const Ci = /^error (?<name>[a-zA-Z$_][a-zA-Z0-9$_]*)\((?<parameters>.*?)\)$/;
function cu(e) {
  return Ci.test(e);
}
function uu(e) {
  return Ue(Ci, e);
}
const ki = /^event (?<name>[a-zA-Z$_][a-zA-Z0-9$_]*)\((?<parameters>.*?)\)$/;
function fu(e) {
  return ki.test(e);
}
function du(e) {
  return Ue(ki, e);
}
const Ni = /^function (?<name>[a-zA-Z$_][a-zA-Z0-9$_]*)\((?<parameters>.*?)\)(?: (?<scope>external|public{1}))?(?: (?<stateMutability>pure|view|nonpayable|payable{1}))?(?: returns\s?\((?<returns>.*?)\))?$/;
function lu(e) {
  return Ni.test(e);
}
function hu(e) {
  return Ue(Ni, e);
}
const Fi = /^struct (?<name>[a-zA-Z$_][a-zA-Z0-9$_]*) \{(?<properties>.*?)\}$/;
function tr(e) {
  return Fi.test(e);
}
function pu(e) {
  return Ue(Fi, e);
}
const Oi = /^constructor\((?<parameters>.*?)\)(?:\s(?<stateMutability>payable{1}))?$/;
function bu(e) {
  return Oi.test(e);
}
function yu(e) {
  return Ue(Oi, e);
}
const zi = /^fallback\(\) external(?:\s(?<stateMutability>payable{1}))?$/;
function mu(e) {
  return zi.test(e);
}
function gu(e) {
  return Ue(zi, e);
}
const wu = /^receive\(\) external payable$/;
function xu(e) {
  return wu.test(e);
}
const Co = /* @__PURE__ */ new Set([
  "memory",
  "indexed",
  "storage",
  "calldata"
]), vu = /* @__PURE__ */ new Set(["indexed"]), Yr = /* @__PURE__ */ new Set([
  "calldata",
  "memory",
  "storage"
]);
class Eu extends ue {
  constructor({ signature: t }) {
    super("Failed to parse ABI item.", {
      details: `parseAbiItem(${JSON.stringify(t, null, 2)})`,
      docsPath: "/api/human#parseabiitem-1"
    }), Object.defineProperty(this, "name", {
      enumerable: !0,
      configurable: !0,
      writable: !0,
      value: "InvalidAbiItemError"
    });
  }
}
class Pu extends ue {
  constructor({ type: t }) {
    super("Unknown type.", {
      metaMessages: [
        `Type "${t}" is not a valid ABI type. Perhaps you forgot to include a struct signature?`
      ]
    }), Object.defineProperty(this, "name", {
      enumerable: !0,
      configurable: !0,
      writable: !0,
      value: "UnknownTypeError"
    });
  }
}
class Au extends ue {
  constructor({ type: t }) {
    super("Unknown type.", {
      metaMessages: [`Type "${t}" is not a valid ABI type.`]
    }), Object.defineProperty(this, "name", {
      enumerable: !0,
      configurable: !0,
      writable: !0,
      value: "UnknownSolidityTypeError"
    });
  }
}
class $u extends ue {
  constructor({ params: t }) {
    super("Failed to parse ABI parameters.", {
      details: `parseAbiParameters(${JSON.stringify(t, null, 2)})`,
      docsPath: "/api/human#parseabiparameters-1"
    }), Object.defineProperty(this, "name", {
      enumerable: !0,
      configurable: !0,
      writable: !0,
      value: "InvalidAbiParametersError"
    });
  }
}
class Iu extends ue {
  constructor({ param: t }) {
    super("Invalid ABI parameter.", {
      details: t
    }), Object.defineProperty(this, "name", {
      enumerable: !0,
      configurable: !0,
      writable: !0,
      value: "InvalidParameterError"
    });
  }
}
class Su extends ue {
  constructor({ param: t, name: n }) {
    super("Invalid ABI parameter.", {
      details: t,
      metaMessages: [
        `"${n}" is a protected Solidity keyword. More info: https://docs.soliditylang.org/en/latest/cheatsheet.html`
      ]
    }), Object.defineProperty(this, "name", {
      enumerable: !0,
      configurable: !0,
      writable: !0,
      value: "SolidityProtectedKeywordError"
    });
  }
}
class Bu extends ue {
  constructor({ param: t, type: n, modifier: r }) {
    super("Invalid ABI parameter.", {
      details: t,
      metaMessages: [
        `Modifier "${r}" not allowed${n ? ` in "${n}" type` : ""}.`
      ]
    }), Object.defineProperty(this, "name", {
      enumerable: !0,
      configurable: !0,
      writable: !0,
      value: "InvalidModifierError"
    });
  }
}
class Tu extends ue {
  constructor({ param: t, type: n, modifier: r }) {
    super("Invalid ABI parameter.", {
      details: t,
      metaMessages: [
        `Modifier "${r}" not allowed${n ? ` in "${n}" type` : ""}.`,
        `Data location can only be specified for array, struct, or mapping types, but "${r}" was given.`
      ]
    }), Object.defineProperty(this, "name", {
      enumerable: !0,
      configurable: !0,
      writable: !0,
      value: "InvalidFunctionModifierError"
    });
  }
}
class Cu extends ue {
  constructor({ abiParameter: t }) {
    super("Invalid ABI parameter.", {
      details: JSON.stringify(t, null, 2),
      metaMessages: ["ABI parameter type is invalid."]
    }), Object.defineProperty(this, "name", {
      enumerable: !0,
      configurable: !0,
      writable: !0,
      value: "InvalidAbiTypeParameterError"
    });
  }
}
class Mt extends ue {
  constructor({ signature: t, type: n }) {
    super(`Invalid ${n} signature.`, {
      details: t
    }), Object.defineProperty(this, "name", {
      enumerable: !0,
      configurable: !0,
      writable: !0,
      value: "InvalidSignatureError"
    });
  }
}
class ku extends ue {
  constructor({ signature: t }) {
    super("Unknown signature.", {
      details: t
    }), Object.defineProperty(this, "name", {
      enumerable: !0,
      configurable: !0,
      writable: !0,
      value: "UnknownSignatureError"
    });
  }
}
class Nu extends ue {
  constructor({ signature: t }) {
    super("Invalid struct signature.", {
      details: t,
      metaMessages: ["No properties exist."]
    }), Object.defineProperty(this, "name", {
      enumerable: !0,
      configurable: !0,
      writable: !0,
      value: "InvalidStructSignatureError"
    });
  }
}
class Fu extends ue {
  constructor({ type: t }) {
    super("Circular reference detected.", {
      metaMessages: [`Struct "${t}" is a circular reference.`]
    }), Object.defineProperty(this, "name", {
      enumerable: !0,
      configurable: !0,
      writable: !0,
      value: "CircularReferenceError"
    });
  }
}
class Ou extends ue {
  constructor({ current: t, depth: n }) {
    super("Unbalanced parentheses.", {
      metaMessages: [
        `"${t.trim()}" has too many ${n > 0 ? "opening" : "closing"} parentheses.`
      ],
      details: `Depth "${n}"`
    }), Object.defineProperty(this, "name", {
      enumerable: !0,
      configurable: !0,
      writable: !0,
      value: "InvalidParenthesisError"
    });
  }
}
function zu(e, t, n) {
  let r = "";
  if (n)
    for (const s of Object.entries(n)) {
      if (!s)
        continue;
      let o = "";
      for (const i of s[1])
        o += `[${i.type}${i.name ? `:${i.name}` : ""}]`;
      r += `(${s[0]}{${o}})`;
    }
  return t ? `${t}:${e}${r}` : `${e}${r}`;
}
const Ir = /* @__PURE__ */ new Map([
  // Unnamed
  ["address", { type: "address" }],
  ["bool", { type: "bool" }],
  ["bytes", { type: "bytes" }],
  ["bytes32", { type: "bytes32" }],
  ["int", { type: "int256" }],
  ["int256", { type: "int256" }],
  ["string", { type: "string" }],
  ["uint", { type: "uint256" }],
  ["uint8", { type: "uint8" }],
  ["uint16", { type: "uint16" }],
  ["uint24", { type: "uint24" }],
  ["uint32", { type: "uint32" }],
  ["uint64", { type: "uint64" }],
  ["uint96", { type: "uint96" }],
  ["uint112", { type: "uint112" }],
  ["uint160", { type: "uint160" }],
  ["uint192", { type: "uint192" }],
  ["uint256", { type: "uint256" }],
  // Named
  ["address owner", { type: "address", name: "owner" }],
  ["address to", { type: "address", name: "to" }],
  ["bool approved", { type: "bool", name: "approved" }],
  ["bytes _data", { type: "bytes", name: "_data" }],
  ["bytes data", { type: "bytes", name: "data" }],
  ["bytes signature", { type: "bytes", name: "signature" }],
  ["bytes32 hash", { type: "bytes32", name: "hash" }],
  ["bytes32 r", { type: "bytes32", name: "r" }],
  ["bytes32 root", { type: "bytes32", name: "root" }],
  ["bytes32 s", { type: "bytes32", name: "s" }],
  ["string name", { type: "string", name: "name" }],
  ["string symbol", { type: "string", name: "symbol" }],
  ["string tokenURI", { type: "string", name: "tokenURI" }],
  ["uint tokenId", { type: "uint256", name: "tokenId" }],
  ["uint8 v", { type: "uint8", name: "v" }],
  ["uint256 balance", { type: "uint256", name: "balance" }],
  ["uint256 tokenId", { type: "uint256", name: "tokenId" }],
  ["uint256 value", { type: "uint256", name: "value" }],
  // Indexed
  [
    "event:address indexed from",
    { type: "address", name: "from", indexed: !0 }
  ],
  ["event:address indexed to", { type: "address", name: "to", indexed: !0 }],
  [
    "event:uint indexed tokenId",
    { type: "uint256", name: "tokenId", indexed: !0 }
  ],
  [
    "event:uint256 indexed tokenId",
    { type: "uint256", name: "tokenId", indexed: !0 }
  ]
]);
function Xr(e, t = {}) {
  if (lu(e))
    return Ru(e, t);
  if (fu(e))
    return Mu(e, t);
  if (cu(e))
    return Lu(e, t);
  if (bu(e))
    return _u(e, t);
  if (mu(e))
    return ju(e);
  if (xu(e))
    return {
      type: "receive",
      stateMutability: "payable"
    };
  throw new ku({ signature: e });
}
function Ru(e, t = {}) {
  const n = hu(e);
  if (!n)
    throw new Mt({ signature: e, type: "function" });
  const r = he(n.parameters), s = [], o = r.length;
  for (let a = 0; a < o; a++)
    s.push(_e(r[a], {
      modifiers: Yr,
      structs: t,
      type: "function"
    }));
  const i = [];
  if (n.returns) {
    const a = he(n.returns), c = a.length;
    for (let u = 0; u < c; u++)
      i.push(_e(a[u], {
        modifiers: Yr,
        structs: t,
        type: "function"
      }));
  }
  return {
    name: n.name,
    type: "function",
    stateMutability: n.stateMutability ?? "nonpayable",
    inputs: s,
    outputs: i
  };
}
function Mu(e, t = {}) {
  const n = du(e);
  if (!n)
    throw new Mt({ signature: e, type: "event" });
  const r = he(n.parameters), s = [], o = r.length;
  for (let i = 0; i < o; i++)
    s.push(_e(r[i], {
      modifiers: vu,
      structs: t,
      type: "event"
    }));
  return { name: n.name, type: "event", inputs: s };
}
function Lu(e, t = {}) {
  const n = uu(e);
  if (!n)
    throw new Mt({ signature: e, type: "error" });
  const r = he(n.parameters), s = [], o = r.length;
  for (let i = 0; i < o; i++)
    s.push(_e(r[i], { structs: t, type: "error" }));
  return { name: n.name, type: "error", inputs: s };
}
function _u(e, t = {}) {
  const n = yu(e);
  if (!n)
    throw new Mt({ signature: e, type: "constructor" });
  const r = he(n.parameters), s = [], o = r.length;
  for (let i = 0; i < o; i++)
    s.push(_e(r[i], { structs: t, type: "constructor" }));
  return {
    type: "constructor",
    stateMutability: n.stateMutability ?? "nonpayable",
    inputs: s
  };
}
function ju(e) {
  const t = gu(e);
  if (!t)
    throw new Mt({ signature: e, type: "fallback" });
  return {
    type: "fallback",
    stateMutability: t.stateMutability ?? "nonpayable"
  };
}
const Uu = /^(?<type>[a-zA-Z$_][a-zA-Z0-9$_]*(?:\spayable)?)(?<array>(?:\[\d*?\])+?)?(?:\s(?<modifier>calldata|indexed|memory|storage{1}))?(?:\s(?<name>[a-zA-Z$_][a-zA-Z0-9$_]*))?$/, Gu = /^\((?<type>.+?)\)(?<array>(?:\[\d*?\])+?)?(?:\s(?<modifier>calldata|indexed|memory|storage{1}))?(?:\s(?<name>[a-zA-Z$_][a-zA-Z0-9$_]*))?$/, Du = /^u?int$/;
function _e(e, t) {
  var d, l;
  const n = zu(e, t == null ? void 0 : t.type, t == null ? void 0 : t.structs);
  if (Ir.has(n))
    return Ir.get(n);
  const r = Ti.test(e), s = Ue(r ? Gu : Uu, e);
  if (!s)
    throw new Iu({ param: e });
  if (s.name && qu(s.name))
    throw new Su({ param: e, name: s.name });
  const o = s.name ? { name: s.name } : {}, i = s.modifier === "indexed" ? { indexed: !0 } : {}, a = (t == null ? void 0 : t.structs) ?? {};
  let c, u = {};
  if (r) {
    c = "tuple";
    const h = he(s.type), p = [], b = h.length;
    for (let x = 0; x < b; x++)
      p.push(_e(h[x], { structs: a }));
    u = { components: p };
  } else if (s.type in a)
    c = "tuple", u = { components: a[s.type] };
  else if (Du.test(s.type))
    c = `${s.type}256`;
  else if (s.type === "address payable")
    c = "address";
  else if (c = s.type, (t == null ? void 0 : t.type) !== "struct" && !Ri(c))
    throw new Au({ type: c });
  if (s.modifier) {
    if (!((l = (d = t == null ? void 0 : t.modifiers) == null ? void 0 : d.has) != null && l.call(d, s.modifier)))
      throw new Bu({
        param: e,
        type: t == null ? void 0 : t.type,
        modifier: s.modifier
      });
    if (Yr.has(s.modifier) && !Vu(c, !!s.array))
      throw new Tu({
        param: e,
        type: t == null ? void 0 : t.type,
        modifier: s.modifier
      });
  }
  const f = {
    type: `${c}${s.array ?? ""}`,
    ...o,
    ...i,
    ...u
  };
  return Ir.set(n, f), f;
}
function he(e, t = [], n = "", r = 0) {
  const s = e.trim().length;
  for (let o = 0; o < s; o++) {
    const i = e[o], a = e.slice(o + 1);
    switch (i) {
      case ",":
        return r === 0 ? he(a, [...t, n.trim()]) : he(a, t, `${n}${i}`, r);
      case "(":
        return he(a, t, `${n}${i}`, r + 1);
      case ")":
        return he(a, t, `${n}${i}`, r - 1);
      default:
        return he(a, t, `${n}${i}`, r);
    }
  }
  if (n === "")
    return t;
  if (r !== 0)
    throw new Ou({ current: n, depth: r });
  return t.push(n.trim()), t;
}
function Ri(e) {
  return e === "address" || e === "bool" || e === "function" || e === "string" || Si.test(e) || Bi.test(e);
}
const Hu = /^(?:after|alias|anonymous|apply|auto|byte|calldata|case|catch|constant|copyof|default|defined|error|event|external|false|final|function|immutable|implements|in|indexed|inline|internal|let|mapping|match|memory|mutable|null|of|override|partial|private|promise|public|pure|reference|relocatable|return|returns|sizeof|static|storage|struct|super|supports|switch|this|true|try|typedef|typeof|var|view|virtual)$/;
function qu(e) {
  return e === "address" || e === "bool" || e === "function" || e === "string" || e === "tuple" || Si.test(e) || Bi.test(e) || Hu.test(e);
}
function Vu(e, t) {
  return t || e === "bytes" || e === "string" || e === "tuple";
}
function Cs(e) {
  const t = {}, n = e.length;
  for (let i = 0; i < n; i++) {
    const a = e[i];
    if (!tr(a))
      continue;
    const c = pu(a);
    if (!c)
      throw new Mt({ signature: a, type: "struct" });
    const u = c.properties.split(";"), f = [], d = u.length;
    for (let l = 0; l < d; l++) {
      const p = u[l].trim();
      if (!p)
        continue;
      const b = _e(p, {
        type: "struct"
      });
      f.push(b);
    }
    if (!f.length)
      throw new Nu({ signature: a });
    t[c.name] = f;
  }
  const r = {}, s = Object.entries(t), o = s.length;
  for (let i = 0; i < o; i++) {
    const [a, c] = s[i];
    r[a] = Mi(c, t);
  }
  return r;
}
const Wu = /^(?<type>[a-zA-Z$_][a-zA-Z0-9$_]*)(?<array>(?:\[\d*?\])+?)?$/;
function Mi(e = [], t = {}, n = /* @__PURE__ */ new Set()) {
  const r = [], s = e.length;
  for (let o = 0; o < s; o++) {
    const i = e[o];
    if (Ti.test(i.type))
      r.push(i);
    else {
      const c = Ue(Wu, i.type);
      if (!(c != null && c.type))
        throw new Cu({ abiParameter: i });
      const { array: u, type: f } = c;
      if (f in t) {
        if (n.has(f))
          throw new Fu({ type: f });
        r.push({
          ...i,
          type: `tuple${u ?? ""}`,
          components: Mi(t[f], t, /* @__PURE__ */ new Set([...n, f]))
        });
      } else if (Ri(f))
        r.push(i);
      else
        throw new Pu({ type: f });
    }
  }
  return r;
}
function Li(e) {
  const t = Cs(e), n = [], r = e.length;
  for (let s = 0; s < r; s++) {
    const o = e[s];
    tr(o) || n.push(Xr(o, t));
  }
  return n;
}
function ko(e) {
  let t;
  if (typeof e == "string")
    t = Xr(e);
  else {
    const n = Cs(e), r = e.length;
    for (let s = 0; s < r; s++) {
      const o = e[s];
      if (!tr(o)) {
        t = Xr(o, n);
        break;
      }
    }
  }
  if (!t)
    throw new Eu({ signature: e });
  return t;
}
function No(e) {
  const t = [];
  if (typeof e == "string") {
    const n = he(e), r = n.length;
    for (let s = 0; s < r; s++)
      t.push(_e(n[s], { modifiers: Co }));
  } else {
    const n = Cs(e), r = e.length;
    for (let s = 0; s < r; s++) {
      const o = e[s];
      if (tr(o))
        continue;
      const i = he(o), a = i.length;
      for (let c = 0; c < a; c++)
        t.push(_e(i[c], { modifiers: Co, structs: n }));
    }
  }
  if (t.length === 0)
    throw new $u({ params: e });
  return t;
}
function M(e, t, n) {
  const r = e[t.name];
  if (typeof r == "function")
    return r;
  const s = e[n];
  return typeof s == "function" ? s : (o) => t(e, o);
}
function ve(e, { includeName: t = !1 } = {}) {
  if (e.type !== "function" && e.type !== "event" && e.type !== "error")
    throw new a0(e.type);
  return `${e.name}(${nr(e.inputs, { includeName: t })})`;
}
function nr(e, { includeName: t = !1 } = {}) {
  return e ? e.map((n) => Zu(n, { includeName: t })).join(t ? ", " : ",") : "";
}
function Zu(e, { includeName: t }) {
  return e.type.startsWith("tuple") ? `(${nr(e.components, { includeName: t })})${e.type.slice(5)}` : e.type + (t && e.name ? ` ${e.name}` : "");
}
function Te(e, { strict: t = !0 } = {}) {
  return !e || typeof e != "string" ? !1 : t ? /^0x[0-9a-fA-F]*$/.test(e) : e.startsWith("0x");
}
function D(e) {
  return Te(e, { strict: !1 }) ? Math.ceil((e.length - 2) / 2) : e.length;
}
const _i = "2.47.17";
let Wt = {
  getDocsUrl: ({ docsBaseUrl: e, docsPath: t = "", docsSlug: n }) => t ? `${e ?? "https://viem.sh"}${t}${n ? `#${n}` : ""}` : void 0,
  version: `viem@${_i}`
}, I = class Qr extends Error {
  constructor(t, n = {}) {
    var a;
    const r = (() => {
      var c;
      return n.cause instanceof Qr ? n.cause.details : (c = n.cause) != null && c.message ? n.cause.message : n.details;
    })(), s = n.cause instanceof Qr && n.cause.docsPath || n.docsPath, o = (a = Wt.getDocsUrl) == null ? void 0 : a.call(Wt, { ...n, docsPath: s }), i = [
      t || "An error occurred.",
      "",
      ...n.metaMessages ? [...n.metaMessages, ""] : [],
      ...o ? [`Docs: ${o}`] : [],
      ...r ? [`Details: ${r}`] : [],
      ...Wt.version ? [`Version: ${Wt.version}`] : []
    ].join(`
`);
    super(i, n.cause ? { cause: n.cause } : void 0), Object.defineProperty(this, "details", {
      enumerable: !0,
      configurable: !0,
      writable: !0,
      value: void 0
    }), Object.defineProperty(this, "docsPath", {
      enumerable: !0,
      configurable: !0,
      writable: !0,
      value: void 0
    }), Object.defineProperty(this, "metaMessages", {
      enumerable: !0,
      configurable: !0,
      writable: !0,
      value: void 0
    }), Object.defineProperty(this, "shortMessage", {
      enumerable: !0,
      configurable: !0,
      writable: !0,
      value: void 0
    }), Object.defineProperty(this, "version", {
      enumerable: !0,
      configurable: !0,
      writable: !0,
      value: void 0
    }), Object.defineProperty(this, "name", {
      enumerable: !0,
      configurable: !0,
      writable: !0,
      value: "BaseError"
    }), this.details = r, this.docsPath = s, this.metaMessages = n.metaMessages, this.name = n.name ?? this.name, this.shortMessage = t, this.version = _i;
  }
  walk(t) {
    return ji(this, t);
  }
};
function ji(e, t) {
  return t != null && t(e) ? e : e && typeof e == "object" && "cause" in e && e.cause !== void 0 ? ji(e.cause, t) : t ? null : e;
}
class Ku extends I {
  constructor({ docsPath: t }) {
    super([
      "A constructor was not found on the ABI.",
      "Make sure you are using the correct ABI and that the constructor exists on it."
    ].join(`
`), {
      docsPath: t,
      name: "AbiConstructorNotFoundError"
    });
  }
}
class Fo extends I {
  constructor({ docsPath: t }) {
    super([
      "Constructor arguments were provided (`args`), but a constructor parameters (`inputs`) were not found on the ABI.",
      "Make sure you are using the correct ABI, and that the `inputs` attribute on the constructor exists."
    ].join(`
`), {
      docsPath: t,
      name: "AbiConstructorParamsNotFoundError"
    });
  }
}
class Ui extends I {
  constructor({ data: t, params: n, size: r }) {
    super([`Data size of ${r} bytes is too small for given parameters.`].join(`
`), {
      metaMessages: [
        `Params: (${nr(n, { includeName: !0 })})`,
        `Data:   ${t} (${r} bytes)`
      ],
      name: "AbiDecodingDataSizeTooSmallError"
    }), Object.defineProperty(this, "data", {
      enumerable: !0,
      configurable: !0,
      writable: !0,
      value: void 0
    }), Object.defineProperty(this, "params", {
      enumerable: !0,
      configurable: !0,
      writable: !0,
      value: void 0
    }), Object.defineProperty(this, "size", {
      enumerable: !0,
      configurable: !0,
      writable: !0,
      value: void 0
    }), this.data = t, this.params = n, this.size = r;
  }
}
class In extends I {
  constructor({ cause: t } = {}) {
    super('Cannot decode zero data ("0x") with ABI parameters.', {
      name: "AbiDecodingZeroDataError",
      cause: t
    });
  }
}
class Ju extends I {
  constructor({ expectedLength: t, givenLength: n, type: r }) {
    super([
      `ABI encoding array length mismatch for type ${r}.`,
      `Expected length: ${t}`,
      `Given length: ${n}`
    ].join(`
`), { name: "AbiEncodingArrayLengthMismatchError" });
  }
}
class Yu extends I {
  constructor({ expectedSize: t, value: n }) {
    super(`Size of bytes "${n}" (bytes${D(n)}) does not match expected size (bytes${t}).`, { name: "AbiEncodingBytesSizeMismatchError" });
  }
}
class Xu extends I {
  constructor({ expectedLength: t, givenLength: n }) {
    super([
      "ABI encoding params/values length mismatch.",
      `Expected length (params): ${t}`,
      `Given length (values): ${n}`
    ].join(`
`), { name: "AbiEncodingLengthMismatchError" });
  }
}
class Qu extends I {
  constructor(t, { docsPath: n }) {
    super([
      `Arguments (\`args\`) were provided to "${t}", but "${t}" on the ABI does not contain any parameters (\`inputs\`).`,
      "Cannot encode error result without knowing what the parameter types are.",
      "Make sure you are using the correct ABI and that the inputs exist on it."
    ].join(`
`), {
      docsPath: n,
      name: "AbiErrorInputsNotFoundError"
    });
  }
}
class Oo extends I {
  constructor(t, { docsPath: n } = {}) {
    super([
      `Error ${t ? `"${t}" ` : ""}not found on ABI.`,
      "Make sure you are using the correct ABI and that the error exists on it."
    ].join(`
`), {
      docsPath: n,
      name: "AbiErrorNotFoundError"
    });
  }
}
class Gi extends I {
  constructor(t, { docsPath: n, cause: r }) {
    super([
      `Encoded error signature "${t}" not found on ABI.`,
      "Make sure you are using the correct ABI and that the error exists on it.",
      `You can look up the decoded signature here: https://4byte.sourcify.dev/?q=${t}.`
    ].join(`
`), {
      docsPath: n,
      name: "AbiErrorSignatureNotFoundError",
      cause: r
    }), Object.defineProperty(this, "signature", {
      enumerable: !0,
      configurable: !0,
      writable: !0,
      value: void 0
    }), this.signature = t;
  }
}
class e0 extends I {
  constructor({ docsPath: t }) {
    super("Cannot extract event signature from empty topics.", {
      docsPath: t,
      name: "AbiEventSignatureEmptyTopicsError"
    });
  }
}
class t0 extends I {
  constructor(t, { docsPath: n }) {
    super([
      `Encoded event signature "${t}" not found on ABI.`,
      "Make sure you are using the correct ABI and that the event exists on it.",
      `You can look up the signature here: https://4byte.sourcify.dev/?q=${t}.`
    ].join(`
`), {
      docsPath: n,
      name: "AbiEventSignatureNotFoundError"
    });
  }
}
class zo extends I {
  constructor(t, { docsPath: n } = {}) {
    super([
      `Event ${t ? `"${t}" ` : ""}not found on ABI.`,
      "Make sure you are using the correct ABI and that the event exists on it."
    ].join(`
`), {
      docsPath: n,
      name: "AbiEventNotFoundError"
    });
  }
}
class Bt extends I {
  constructor(t, { docsPath: n } = {}) {
    super([
      `Function ${t ? `"${t}" ` : ""}not found on ABI.`,
      "Make sure you are using the correct ABI and that the function exists on it."
    ].join(`
`), {
      docsPath: n,
      name: "AbiFunctionNotFoundError"
    });
  }
}
class Di extends I {
  constructor(t, { docsPath: n }) {
    super([
      `Function "${t}" does not contain any \`outputs\` on ABI.`,
      "Cannot decode function result without knowing what the parameter types are.",
      "Make sure you are using the correct ABI and that the function exists on it."
    ].join(`
`), {
      docsPath: n,
      name: "AbiFunctionOutputsNotFoundError"
    });
  }
}
class n0 extends I {
  constructor(t, { docsPath: n }) {
    super([
      `Encoded function signature "${t}" not found on ABI.`,
      "Make sure you are using the correct ABI and that the function exists on it.",
      `You can look up the signature here: https://4byte.sourcify.dev/?q=${t}.`
    ].join(`
`), {
      docsPath: n,
      name: "AbiFunctionSignatureNotFoundError"
    });
  }
}
class r0 extends I {
  constructor(t, n) {
    super("Found ambiguous types in overloaded ABI items.", {
      metaMessages: [
        `\`${t.type}\` in \`${ve(t.abiItem)}\`, and`,
        `\`${n.type}\` in \`${ve(n.abiItem)}\``,
        "",
        "These types encode differently and cannot be distinguished at runtime.",
        "Remove one of the ambiguous items in the ABI."
      ],
      name: "AbiItemAmbiguityError"
    });
  }
}
let s0 = class extends I {
  constructor({ expectedSize: t, givenSize: n }) {
    super(`Expected bytes${t}, got bytes${n}.`, {
      name: "BytesSizeMismatchError"
    });
  }
};
class Zn extends I {
  constructor({ abiItem: t, data: n, params: r, size: s }) {
    super([
      `Data size of ${s} bytes is too small for non-indexed event parameters.`
    ].join(`
`), {
      metaMessages: [
        `Params: (${nr(r, { includeName: !0 })})`,
        `Data:   ${n} (${s} bytes)`
      ],
      name: "DecodeLogDataMismatch"
    }), Object.defineProperty(this, "abiItem", {
      enumerable: !0,
      configurable: !0,
      writable: !0,
      value: void 0
    }), Object.defineProperty(this, "data", {
      enumerable: !0,
      configurable: !0,
      writable: !0,
      value: void 0
    }), Object.defineProperty(this, "params", {
      enumerable: !0,
      configurable: !0,
      writable: !0,
      value: void 0
    }), Object.defineProperty(this, "size", {
      enumerable: !0,
      configurable: !0,
      writable: !0,
      value: void 0
    }), this.abiItem = t, this.data = n, this.params = r, this.size = s;
  }
}
class ks extends I {
  constructor({ abiItem: t, param: n }) {
    super([
      `Expected a topic for indexed event parameter${n.name ? ` "${n.name}"` : ""} on event "${ve(t, { includeName: !0 })}".`
    ].join(`
`), { name: "DecodeLogTopicsMismatch" }), Object.defineProperty(this, "abiItem", {
      enumerable: !0,
      configurable: !0,
      writable: !0,
      value: void 0
    }), this.abiItem = t;
  }
}
class o0 extends I {
  constructor(t, { docsPath: n }) {
    super([
      `Type "${t}" is not a valid encoding type.`,
      "Please provide a valid ABI type."
    ].join(`
`), { docsPath: n, name: "InvalidAbiEncodingType" });
  }
}
class i0 extends I {
  constructor(t, { docsPath: n }) {
    super([
      `Type "${t}" is not a valid decoding type.`,
      "Please provide a valid ABI type."
    ].join(`
`), { docsPath: n, name: "InvalidAbiDecodingType" });
  }
}
let Hi = class extends I {
  constructor(t) {
    super([`Value "${t}" is not a valid array.`].join(`
`), {
      name: "InvalidArrayError"
    });
  }
};
class a0 extends I {
  constructor(t) {
    super([
      `"${t}" is not a valid definition type.`,
      'Valid types: "function", "event", "error"'
    ].join(`
`), { name: "InvalidDefinitionTypeError" });
  }
}
class c0 extends I {
  constructor(t) {
    super(`Filter type "${t}" is not supported.`, {
      name: "FilterTypeNotSupportedError"
    });
  }
}
let qi = class extends I {
  constructor({ offset: t, position: n, size: r }) {
    super(`Slice ${n === "start" ? "starting" : "ending"} at offset "${t}" is out-of-bounds (size: ${r}).`, { name: "SliceOffsetOutOfBoundsError" });
  }
}, Vi = class extends I {
  constructor({ size: t, targetSize: n, type: r }) {
    super(`${r.charAt(0).toUpperCase()}${r.slice(1).toLowerCase()} size (${t}) exceeds padding size (${n}).`, { name: "SizeExceedsPaddingSizeError" });
  }
};
class Ro extends I {
  constructor({ size: t, targetSize: n, type: r }) {
    super(`${r.charAt(0).toUpperCase()}${r.slice(1).toLowerCase()} is expected to be ${n} ${r} long, but is ${t} ${r} long.`, { name: "InvalidBytesLengthError" });
  }
}
function Lt(e, { dir: t, size: n = 32 } = {}) {
  return typeof e == "string" ? Ve(e, { dir: t, size: n }) : u0(e, { dir: t, size: n });
}
function Ve(e, { dir: t, size: n = 32 } = {}) {
  if (n === null)
    return e;
  const r = e.replace("0x", "");
  if (r.length > n * 2)
    throw new Vi({
      size: Math.ceil(r.length / 2),
      targetSize: n,
      type: "hex"
    });
  return `0x${r[t === "right" ? "padEnd" : "padStart"](n * 2, "0")}`;
}
function u0(e, { dir: t, size: n = 32 } = {}) {
  if (n === null)
    return e;
  if (e.length > n)
    throw new Vi({
      size: e.length,
      targetSize: n,
      type: "bytes"
    });
  const r = new Uint8Array(n);
  for (let s = 0; s < n; s++) {
    const o = t === "right";
    r[o ? s : n - s - 1] = e[o ? s : e.length - s - 1];
  }
  return r;
}
let Ns = class extends I {
  constructor({ max: t, min: n, signed: r, size: s, value: o }) {
    super(`Number "${o}" is not in safe ${s ? `${s * 8}-bit ${r ? "signed" : "unsigned"} ` : ""}integer range ${t ? `(${n} to ${t})` : `(above ${n})`}`, { name: "IntegerOutOfRangeError" });
  }
}, f0 = class extends I {
  constructor(t) {
    super(`Bytes value "${t}" is not a valid boolean. The bytes array must contain a single byte of either a 0 or 1 value.`, {
      name: "InvalidBytesBooleanError"
    });
  }
};
class d0 extends I {
  constructor(t) {
    super(`Hex value "${t}" is not a valid boolean. The hex value must be "0x0" (false) or "0x1" (true).`, { name: "InvalidHexBooleanError" });
  }
}
let l0 = class extends I {
  constructor({ givenSize: t, maxSize: n }) {
    super(`Size cannot exceed ${n} bytes. Given size: ${t} bytes.`, { name: "SizeOverflowError" });
  }
};
function me(e, { dir: t = "left" } = {}) {
  let n = typeof e == "string" ? e.replace("0x", "") : e, r = 0;
  for (let s = 0; s < n.length - 1 && n[t === "left" ? s : n.length - s - 1].toString() === "0"; s++)
    r++;
  return n = t === "left" ? n.slice(r) : n.slice(0, n.length - r), typeof e == "string" ? (n.length === 1 && t === "right" && (n = `${n}0`), `0x${n.length % 2 === 1 ? `0${n}` : n}`) : n;
}
function $e(e, { size: t }) {
  if (D(e) > t)
    throw new l0({
      givenSize: D(e),
      maxSize: t
    });
}
function X(e, t = {}) {
  const { signed: n } = t;
  t.size && $e(e, { size: t.size });
  const r = BigInt(e);
  if (!n)
    return r;
  const s = (e.length - 2) / 2, o = (1n << BigInt(s) * 8n - 1n) - 1n;
  return r <= o ? r : r - BigInt(`0x${"f".padStart(s * 2, "f")}`) - 1n;
}
function h0(e, t = {}) {
  let n = e;
  if (t.size && ($e(n, { size: t.size }), n = me(n)), me(n) === "0x00")
    return !1;
  if (me(n) === "0x01")
    return !0;
  throw new d0(n);
}
function ge(e, t = {}) {
  const n = X(e, t), r = Number(n);
  if (!Number.isSafeInteger(r))
    throw new Ns({
      max: `${Number.MAX_SAFE_INTEGER}`,
      min: `${Number.MIN_SAFE_INTEGER}`,
      signed: t.signed,
      size: t.size,
      value: `${n}n`
    });
  return r;
}
const p0 = /* @__PURE__ */ Array.from({ length: 256 }, (e, t) => t.toString(16).padStart(2, "0"));
function ae(e, t = {}) {
  return typeof e == "number" || typeof e == "bigint" ? N(e, t) : typeof e == "string" ? Tt(e, t) : typeof e == "boolean" ? Wi(e, t) : V(e, t);
}
function Wi(e, t = {}) {
  const n = `0x${Number(e)}`;
  return typeof t.size == "number" ? ($e(n, { size: t.size }), Lt(n, { size: t.size })) : n;
}
function V(e, t = {}) {
  let n = "";
  for (let s = 0; s < e.length; s++)
    n += p0[e[s]];
  const r = `0x${n}`;
  return typeof t.size == "number" ? ($e(r, { size: t.size }), Lt(r, { dir: "right", size: t.size })) : r;
}
function N(e, t = {}) {
  const { signed: n, size: r } = t, s = BigInt(e);
  let o;
  r ? n ? o = (1n << BigInt(r) * 8n - 1n) - 1n : o = 2n ** (BigInt(r) * 8n) - 1n : typeof e == "number" && (o = BigInt(Number.MAX_SAFE_INTEGER));
  const i = typeof o == "bigint" && n ? -o - 1n : 0;
  if (o && s > o || s < i) {
    const c = typeof e == "bigint" ? "n" : "";
    throw new Ns({
      max: o ? `${o}${c}` : void 0,
      min: `${i}${c}`,
      signed: n,
      size: r,
      value: `${e}${c}`
    });
  }
  const a = `0x${(n && s < 0 ? (1n << BigInt(r * 8)) + BigInt(s) : s).toString(16)}`;
  return r ? Lt(a, { size: r }) : a;
}
const b0 = /* @__PURE__ */ new TextEncoder();
function Tt(e, t = {}) {
  const n = b0.encode(e);
  return V(n, t);
}
const y0 = /* @__PURE__ */ new TextEncoder();
function _t(e, t = {}) {
  return typeof e == "number" || typeof e == "bigint" ? g0(e, t) : typeof e == "boolean" ? m0(e, t) : Te(e) ? Ce(e, t) : st(e, t);
}
function m0(e, t = {}) {
  const n = new Uint8Array(1);
  return n[0] = Number(e), typeof t.size == "number" ? ($e(n, { size: t.size }), Lt(n, { size: t.size })) : n;
}
const Ne = {
  zero: 48,
  nine: 57,
  A: 65,
  F: 70,
  a: 97,
  f: 102
};
function Mo(e) {
  if (e >= Ne.zero && e <= Ne.nine)
    return e - Ne.zero;
  if (e >= Ne.A && e <= Ne.F)
    return e - (Ne.A - 10);
  if (e >= Ne.a && e <= Ne.f)
    return e - (Ne.a - 10);
}
function Ce(e, t = {}) {
  let n = e;
  t.size && ($e(n, { size: t.size }), n = Lt(n, { dir: "right", size: t.size }));
  let r = n.slice(2);
  r.length % 2 && (r = `0${r}`);
  const s = r.length / 2, o = new Uint8Array(s);
  for (let i = 0, a = 0; i < s; i++) {
    const c = Mo(r.charCodeAt(a++)), u = Mo(r.charCodeAt(a++));
    if (c === void 0 || u === void 0)
      throw new I(`Invalid byte sequence ("${r[a - 2]}${r[a - 1]}" in "${r}").`);
    o[i] = c * 16 + u;
  }
  return o;
}
function g0(e, t) {
  const n = N(e, t);
  return Ce(n);
}
function st(e, t = {}) {
  const n = y0.encode(e);
  return typeof t.size == "number" ? ($e(n, { size: t.size }), Lt(n, { dir: "right", size: t.size })) : n;
}
const Un = /* @__PURE__ */ BigInt(2 ** 32 - 1), Lo = /* @__PURE__ */ BigInt(32);
function w0(e, t = !1) {
  return t ? { h: Number(e & Un), l: Number(e >> Lo & Un) } : { h: Number(e >> Lo & Un) | 0, l: Number(e & Un) | 0 };
}
function x0(e, t = !1) {
  const n = e.length;
  let r = new Uint32Array(n), s = new Uint32Array(n);
  for (let o = 0; o < n; o++) {
    const { h: i, l: a } = w0(e[o], t);
    [r[o], s[o]] = [i, a];
  }
  return [r, s];
}
const v0 = (e, t, n) => e << n | t >>> 32 - n, E0 = (e, t, n) => t << n | e >>> 32 - n, P0 = (e, t, n) => t << n - 32 | e >>> 64 - n, A0 = (e, t, n) => e << n - 32 | t >>> 64 - n, gt = typeof globalThis == "object" && "crypto" in globalThis ? globalThis.crypto : void 0;
/*! noble-hashes - MIT License (c) 2022 Paul Miller (paulmillr.com) */
function $0(e) {
  return e instanceof Uint8Array || ArrayBuffer.isView(e) && e.constructor.name === "Uint8Array";
}
function Xt(e) {
  if (!Number.isSafeInteger(e) || e < 0)
    throw new Error("positive integer expected, got " + e);
}
function at(e, ...t) {
  if (!$0(e))
    throw new Error("Uint8Array expected");
  if (t.length > 0 && !t.includes(e.length))
    throw new Error("Uint8Array expected of length " + t + ", got length=" + e.length);
}
function I0(e) {
  if (typeof e != "function" || typeof e.create != "function")
    throw new Error("Hash should be wrapped by utils.createHasher");
  Xt(e.outputLen), Xt(e.blockLen);
}
function Ct(e, t = !0) {
  if (e.destroyed)
    throw new Error("Hash instance has been destroyed");
  if (t && e.finished)
    throw new Error("Hash#digest() has already been called");
}
function Zi(e, t) {
  at(e);
  const n = t.outputLen;
  if (e.length < n)
    throw new Error("digestInto() expects output buffer of length at least " + n);
}
function S0(e) {
  return new Uint32Array(e.buffer, e.byteOffset, Math.floor(e.byteLength / 4));
}
function kt(...e) {
  for (let t = 0; t < e.length; t++)
    e[t].fill(0);
}
function Sr(e) {
  return new DataView(e.buffer, e.byteOffset, e.byteLength);
}
function Se(e, t) {
  return e << 32 - t | e >>> t;
}
const B0 = new Uint8Array(new Uint32Array([287454020]).buffer)[0] === 68;
function T0(e) {
  return e << 24 & 4278190080 | e << 8 & 16711680 | e >>> 8 & 65280 | e >>> 24 & 255;
}
function C0(e) {
  for (let t = 0; t < e.length; t++)
    e[t] = T0(e[t]);
  return e;
}
const _o = B0 ? (e) => e : C0;
function k0(e) {
  if (typeof e != "string")
    throw new Error("string expected");
  return new Uint8Array(new TextEncoder().encode(e));
}
function rr(e) {
  return typeof e == "string" && (e = k0(e)), at(e), e;
}
function N0(...e) {
  let t = 0;
  for (let r = 0; r < e.length; r++) {
    const s = e[r];
    at(s), t += s.length;
  }
  const n = new Uint8Array(t);
  for (let r = 0, s = 0; r < e.length; r++) {
    const o = e[r];
    n.set(o, s), s += o.length;
  }
  return n;
}
class Fs {
}
function Ki(e) {
  const t = (r) => e().update(rr(r)).digest(), n = e();
  return t.outputLen = n.outputLen, t.blockLen = n.blockLen, t.create = () => e(), t;
}
function F0(e = 32) {
  if (gt && typeof gt.getRandomValues == "function")
    return gt.getRandomValues(new Uint8Array(e));
  if (gt && typeof gt.randomBytes == "function")
    return Uint8Array.from(gt.randomBytes(e));
  throw new Error("crypto.getRandomValues must be defined");
}
const O0 = BigInt(0), Zt = BigInt(1), z0 = BigInt(2), R0 = BigInt(7), M0 = BigInt(256), L0 = BigInt(113), Ji = [], Yi = [], Xi = [];
for (let e = 0, t = Zt, n = 1, r = 0; e < 24; e++) {
  [n, r] = [r, (2 * n + 3 * r) % 5], Ji.push(2 * (5 * r + n)), Yi.push((e + 1) * (e + 2) / 2 % 64);
  let s = O0;
  for (let o = 0; o < 7; o++)
    t = (t << Zt ^ (t >> R0) * L0) % M0, t & z0 && (s ^= Zt << (Zt << /* @__PURE__ */ BigInt(o)) - Zt);
  Xi.push(s);
}
const Qi = x0(Xi, !0), _0 = Qi[0], j0 = Qi[1], jo = (e, t, n) => n > 32 ? P0(e, t, n) : v0(e, t, n), Uo = (e, t, n) => n > 32 ? A0(e, t, n) : E0(e, t, n);
function U0(e, t = 24) {
  const n = new Uint32Array(10);
  for (let r = 24 - t; r < 24; r++) {
    for (let i = 0; i < 10; i++)
      n[i] = e[i] ^ e[i + 10] ^ e[i + 20] ^ e[i + 30] ^ e[i + 40];
    for (let i = 0; i < 10; i += 2) {
      const a = (i + 8) % 10, c = (i + 2) % 10, u = n[c], f = n[c + 1], d = jo(u, f, 1) ^ n[a], l = Uo(u, f, 1) ^ n[a + 1];
      for (let h = 0; h < 50; h += 10)
        e[i + h] ^= d, e[i + h + 1] ^= l;
    }
    let s = e[2], o = e[3];
    for (let i = 0; i < 24; i++) {
      const a = Yi[i], c = jo(s, o, a), u = Uo(s, o, a), f = Ji[i];
      s = e[f], o = e[f + 1], e[f] = c, e[f + 1] = u;
    }
    for (let i = 0; i < 50; i += 10) {
      for (let a = 0; a < 10; a++)
        n[a] = e[i + a];
      for (let a = 0; a < 10; a++)
        e[i + a] ^= ~n[(a + 2) % 10] & n[(a + 4) % 10];
    }
    e[0] ^= _0[r], e[1] ^= j0[r];
  }
  kt(n);
}
class Os extends Fs {
  // NOTE: we accept arguments in bytes instead of bits here.
  constructor(t, n, r, s = !1, o = 24) {
    if (super(), this.pos = 0, this.posOut = 0, this.finished = !1, this.destroyed = !1, this.enableXOF = !1, this.blockLen = t, this.suffix = n, this.outputLen = r, this.enableXOF = s, this.rounds = o, Xt(r), !(0 < t && t < 200))
      throw new Error("only keccak-f1600 function is supported");
    this.state = new Uint8Array(200), this.state32 = S0(this.state);
  }
  clone() {
    return this._cloneInto();
  }
  keccak() {
    _o(this.state32), U0(this.state32, this.rounds), _o(this.state32), this.posOut = 0, this.pos = 0;
  }
  update(t) {
    Ct(this), t = rr(t), at(t);
    const { blockLen: n, state: r } = this, s = t.length;
    for (let o = 0; o < s; ) {
      const i = Math.min(n - this.pos, s - o);
      for (let a = 0; a < i; a++)
        r[this.pos++] ^= t[o++];
      this.pos === n && this.keccak();
    }
    return this;
  }
  finish() {
    if (this.finished)
      return;
    this.finished = !0;
    const { state: t, suffix: n, pos: r, blockLen: s } = this;
    t[r] ^= n, n & 128 && r === s - 1 && this.keccak(), t[s - 1] ^= 128, this.keccak();
  }
  writeInto(t) {
    Ct(this, !1), at(t), this.finish();
    const n = this.state, { blockLen: r } = this;
    for (let s = 0, o = t.length; s < o; ) {
      this.posOut >= r && this.keccak();
      const i = Math.min(r - this.posOut, o - s);
      t.set(n.subarray(this.posOut, this.posOut + i), s), this.posOut += i, s += i;
    }
    return t;
  }
  xofInto(t) {
    if (!this.enableXOF)
      throw new Error("XOF is not possible for this instance");
    return this.writeInto(t);
  }
  xof(t) {
    return Xt(t), this.xofInto(new Uint8Array(t));
  }
  digestInto(t) {
    if (Zi(t, this), this.finished)
      throw new Error("digest() was already called");
    return this.writeInto(t), this.destroy(), t;
  }
  digest() {
    return this.digestInto(new Uint8Array(this.outputLen));
  }
  destroy() {
    this.destroyed = !0, kt(this.state);
  }
  _cloneInto(t) {
    const { blockLen: n, suffix: r, outputLen: s, rounds: o, enableXOF: i } = this;
    return t || (t = new Os(n, r, s, i, o)), t.state32.set(this.state32), t.pos = this.pos, t.posOut = this.posOut, t.finished = this.finished, t.rounds = o, t.suffix = r, t.outputLen = s, t.enableXOF = i, t.destroyed = this.destroyed, t;
  }
}
const G0 = (e, t, n) => Ki(() => new Os(t, e, n)), ea = G0(1, 136, 256 / 8);
function Q(e, t) {
  const n = t || "hex", r = ea(Te(e, { strict: !1 }) ? _t(e) : e);
  return n === "bytes" ? r : ae(r);
}
const D0 = (e) => Q(_t(e));
function H0(e) {
  return D0(e);
}
function q0(e) {
  let t = !0, n = "", r = 0, s = "", o = !1;
  for (let i = 0; i < e.length; i++) {
    const a = e[i];
    if (["(", ")", ","].includes(a) && (t = !0), a === "(" && r++, a === ")" && r--, !!t) {
      if (r === 0) {
        if (a === " " && ["event", "function", ""].includes(s))
          s = "";
        else if (s += a, a === ")") {
          o = !0;
          break;
        }
        continue;
      }
      if (a === " ") {
        e[i - 1] !== "," && n !== "," && n !== ",(" && (n = "", t = !1);
        continue;
      }
      s += a, n += a;
    }
  }
  if (!o)
    throw new I("Unable to normalize signature.");
  return s;
}
const V0 = (e) => {
  const t = typeof e == "string" ? e : Wn(e);
  return q0(t);
};
function ta(e) {
  return H0(V0(e));
}
const sr = ta;
let se = class extends I {
  constructor({ address: t }) {
    super(`Address "${t}" is invalid.`, {
      metaMessages: [
        "- Address must be a hex value of 20 bytes (40 hex characters).",
        "- Address must match its checksum counterpart."
      ],
      name: "InvalidAddressError"
    });
  }
}, jt = class extends Map {
  constructor(t) {
    super(), Object.defineProperty(this, "maxSize", {
      enumerable: !0,
      configurable: !0,
      writable: !0,
      value: void 0
    }), this.maxSize = t;
  }
  get(t) {
    const n = super.get(t);
    return super.has(t) && (super.delete(t), super.set(t, n)), n;
  }
  set(t, n) {
    if (super.has(t) && super.delete(t), super.set(t, n), this.maxSize && this.size > this.maxSize) {
      const r = super.keys().next().value;
      r !== void 0 && super.delete(r);
    }
    return this;
  }
};
const Br = /* @__PURE__ */ new jt(8192);
function Sn(e, t) {
  if (Br.has(`${e}.${t}`))
    return Br.get(`${e}.${t}`);
  const n = e.substring(2).toLowerCase(), r = Q(st(n), "bytes"), s = n.split("");
  for (let i = 0; i < 40; i += 2)
    r[i >> 1] >> 4 >= 8 && s[i] && (s[i] = s[i].toUpperCase()), (r[i >> 1] & 15) >= 8 && s[i + 1] && (s[i + 1] = s[i + 1].toUpperCase());
  const o = `0x${s.join("")}`;
  return Br.set(`${e}.${t}`, o), o;
}
function Qt(e, t) {
  if (!J(e, { strict: !1 }))
    throw new se({ address: e });
  return Sn(e, t);
}
const W0 = /^0x[a-fA-F0-9]{40}$/, Tr = /* @__PURE__ */ new jt(8192);
function J(e, t) {
  const { strict: n = !0 } = t ?? {}, r = `${e}.${n}`;
  if (Tr.has(r))
    return Tr.get(r);
  const s = W0.test(e) ? e.toLowerCase() === e ? !0 : n ? Sn(e) === e : !0 : !1;
  return Tr.set(r, s), s;
}
function ee(e) {
  return typeof e[0] == "string" ? Ie(e) : Z0(e);
}
function Z0(e) {
  let t = 0;
  for (const s of e)
    t += s.length;
  const n = new Uint8Array(t);
  let r = 0;
  for (const s of e)
    n.set(s, r), r += s.length;
  return n;
}
function Ie(e) {
  return `0x${e.reduce((t, n) => t + n.replace("0x", ""), "")}`;
}
function We(e, t, n, { strict: r } = {}) {
  return Te(e, { strict: !1 }) ? es(e, t, n, {
    strict: r
  }) : sa(e, t, n, {
    strict: r
  });
}
function na(e, t) {
  if (typeof t == "number" && t > 0 && t > D(e) - 1)
    throw new qi({
      offset: t,
      position: "start",
      size: D(e)
    });
}
function ra(e, t, n) {
  if (typeof t == "number" && typeof n == "number" && D(e) !== n - t)
    throw new qi({
      offset: n,
      position: "end",
      size: D(e)
    });
}
function sa(e, t, n, { strict: r } = {}) {
  na(e, t);
  const s = e.slice(t, n);
  return r && ra(s, t, n), s;
}
function es(e, t, n, { strict: r } = {}) {
  na(e, t);
  const s = `0x${e.replace("0x", "").slice((t ?? 0) * 2, (n ?? e.length) * 2)}`;
  return r && ra(s, t, n), s;
}
const K0 = /^bytes([1-9]|1[0-9]|2[0-9]|3[0-2])?$/, oa = /^(u?int)(8|16|24|32|40|48|56|64|72|80|88|96|104|112|120|128|136|144|152|160|168|176|184|192|200|208|216|224|232|240|248|256)?$/;
function pt(e, t) {
  if (e.length !== t.length)
    throw new Xu({
      expectedLength: e.length,
      givenLength: t.length
    });
  const n = J0({
    params: e,
    values: t
  }), r = Rs(n);
  return r.length === 0 ? "0x" : r;
}
function J0({ params: e, values: t }) {
  const n = [];
  for (let r = 0; r < e.length; r++)
    n.push(zs({ param: e[r], value: t[r] }));
  return n;
}
function zs({ param: e, value: t }) {
  const n = Ms(e.type);
  if (n) {
    const [r, s] = n;
    return X0(t, { length: r, param: { ...e, type: s } });
  }
  if (e.type === "tuple")
    return rf(t, {
      param: e
    });
  if (e.type === "address")
    return Y0(t);
  if (e.type === "bool")
    return ef(t);
  if (e.type.startsWith("uint") || e.type.startsWith("int")) {
    const r = e.type.startsWith("int"), [, , s = "256"] = oa.exec(e.type) ?? [];
    return tf(t, {
      signed: r,
      size: Number(s)
    });
  }
  if (e.type.startsWith("bytes"))
    return Q0(t, { param: e });
  if (e.type === "string")
    return nf(t);
  throw new o0(e.type, {
    docsPath: "/docs/contract/encodeAbiParameters"
  });
}
function Rs(e) {
  let t = 0;
  for (let o = 0; o < e.length; o++) {
    const { dynamic: i, encoded: a } = e[o];
    i ? t += 32 : t += D(a);
  }
  const n = [], r = [];
  let s = 0;
  for (let o = 0; o < e.length; o++) {
    const { dynamic: i, encoded: a } = e[o];
    i ? (n.push(N(t + s, { size: 32 })), r.push(a), s += D(a)) : n.push(a);
  }
  return ee([...n, ...r]);
}
function Y0(e) {
  if (!J(e))
    throw new se({ address: e });
  return { dynamic: !1, encoded: Ve(e.toLowerCase()) };
}
function X0(e, { length: t, param: n }) {
  const r = t === null;
  if (!Array.isArray(e))
    throw new Hi(e);
  if (!r && e.length !== t)
    throw new Ju({
      expectedLength: t,
      givenLength: e.length,
      type: `${n.type}[${t}]`
    });
  let s = !1;
  const o = [];
  for (let i = 0; i < e.length; i++) {
    const a = zs({ param: n, value: e[i] });
    a.dynamic && (s = !0), o.push(a);
  }
  if (r || s) {
    const i = Rs(o);
    if (r) {
      const a = N(o.length, { size: 32 });
      return {
        dynamic: !0,
        encoded: o.length > 0 ? ee([a, i]) : a
      };
    }
    if (s)
      return { dynamic: !0, encoded: i };
  }
  return {
    dynamic: !1,
    encoded: ee(o.map(({ encoded: i }) => i))
  };
}
function Q0(e, { param: t }) {
  const [, n] = t.type.split("bytes"), r = D(e);
  if (!n) {
    let s = e;
    return r % 32 !== 0 && (s = Ve(s, {
      dir: "right",
      size: Math.ceil((e.length - 2) / 2 / 32) * 32
    })), {
      dynamic: !0,
      encoded: ee([Ve(N(r, { size: 32 })), s])
    };
  }
  if (r !== Number.parseInt(n, 10))
    throw new Yu({
      expectedSize: Number.parseInt(n, 10),
      value: e
    });
  return { dynamic: !1, encoded: Ve(e, { dir: "right" }) };
}
function ef(e) {
  if (typeof e != "boolean")
    throw new I(`Invalid boolean value: "${e}" (type: ${typeof e}). Expected: \`true\` or \`false\`.`);
  return { dynamic: !1, encoded: Ve(Wi(e)) };
}
function tf(e, { signed: t, size: n = 256 }) {
  if (typeof n == "number") {
    const r = 2n ** (BigInt(n) - (t ? 1n : 0n)) - 1n, s = t ? -r - 1n : 0n;
    if (e > r || e < s)
      throw new Ns({
        max: r.toString(),
        min: s.toString(),
        signed: t,
        size: n / 8,
        value: e.toString()
      });
  }
  return {
    dynamic: !1,
    encoded: N(e, {
      size: 32,
      signed: t
    })
  };
}
function nf(e) {
  const t = Tt(e), n = Math.ceil(D(t) / 32), r = [];
  for (let s = 0; s < n; s++)
    r.push(Ve(We(t, s * 32, (s + 1) * 32), {
      dir: "right"
    }));
  return {
    dynamic: !0,
    encoded: ee([
      Ve(N(D(t), { size: 32 })),
      ...r
    ])
  };
}
function rf(e, { param: t }) {
  let n = !1;
  const r = [];
  for (let s = 0; s < t.components.length; s++) {
    const o = t.components[s], i = Array.isArray(e) ? s : o.name, a = zs({
      param: o,
      value: e[i]
    });
    r.push(a), a.dynamic && (n = !0);
  }
  return {
    dynamic: n,
    encoded: n ? Rs(r) : ee(r.map(({ encoded: s }) => s))
  };
}
function Ms(e) {
  const t = e.match(/^(.*)\[(\d+)?\]$/);
  return t ? (
    // Return `null` if the array is dynamic.
    [t[2] ? Number(t[2]) : null, t[1]]
  ) : void 0;
}
const Bn = (e) => We(ta(e), 0, 4);
function bt(e) {
  const { abi: t, args: n = [], name: r } = e, s = Te(r, { strict: !1 }), o = t.filter((a) => s ? a.type === "function" ? Bn(a) === r : a.type === "event" ? sr(a) === r : !1 : "name" in a && a.name === r);
  if (o.length === 0)
    return;
  if (o.length === 1)
    return o[0];
  let i;
  for (const a of o) {
    if (!("inputs" in a))
      continue;
    if (!n || n.length === 0) {
      if (!a.inputs || a.inputs.length === 0)
        return a;
      continue;
    }
    if (!a.inputs || a.inputs.length === 0 || a.inputs.length !== n.length)
      continue;
    if (n.every((u, f) => {
      const d = "inputs" in a && a.inputs[f];
      return d ? ts(u, d) : !1;
    })) {
      if (i && "inputs" in i && i.inputs) {
        const u = ia(a.inputs, i.inputs, n);
        if (u)
          throw new r0({
            abiItem: a,
            type: u[0]
          }, {
            abiItem: i,
            type: u[1]
          });
      }
      i = a;
    }
  }
  return i || o[0];
}
function ts(e, t) {
  const n = typeof e, r = t.type;
  switch (r) {
    case "address":
      return J(e, { strict: !1 });
    case "bool":
      return n === "boolean";
    case "function":
      return n === "string";
    case "string":
      return n === "string";
    default:
      return r === "tuple" && "components" in t ? Object.values(t.components).every((s, o) => n === "object" && ts(Object.values(e)[o], s)) : /^u?int(8|16|24|32|40|48|56|64|72|80|88|96|104|112|120|128|136|144|152|160|168|176|184|192|200|208|216|224|232|240|248|256)?$/.test(r) ? n === "number" || n === "bigint" : /^bytes([1-9]|1[0-9]|2[0-9]|3[0-2])?$/.test(r) ? n === "string" || e instanceof Uint8Array : /[a-z]+[1-9]{0,3}(\[[0-9]{0,}\])+$/.test(r) ? Array.isArray(e) && e.every((s) => ts(s, {
        ...t,
        // Pop off `[]` or `[M]` from end of type
        type: r.replace(/(\[[0-9]{0,}\])$/, "")
      })) : !1;
  }
}
function ia(e, t, n) {
  for (const r in e) {
    const s = e[r], o = t[r];
    if (s.type === "tuple" && o.type === "tuple" && "components" in s && "components" in o)
      return ia(s.components, o.components, n[r]);
    const i = [s.type, o.type];
    if (i.includes("address") && i.includes("bytes20") ? !0 : i.includes("address") && i.includes("string") ? J(n[r], { strict: !1 }) : i.includes("address") && i.includes("bytes") ? J(n[r], { strict: !1 }) : !1)
      return i;
  }
}
const Go = "/docs/contract/encodeEventTopics";
function Tn(e) {
  var c;
  const { abi: t, eventName: n, args: r } = e;
  let s = t[0];
  if (n) {
    const u = bt({ abi: t, name: n });
    if (!u)
      throw new zo(n, { docsPath: Go });
    s = u;
  }
  if (s.type !== "event")
    throw new zo(void 0, { docsPath: Go });
  const o = ve(s), i = sr(o);
  let a = [];
  if (r && "inputs" in s) {
    const u = (c = s.inputs) == null ? void 0 : c.filter((d) => "indexed" in d && d.indexed), f = Array.isArray(r) ? r : Object.values(r).length > 0 ? (u == null ? void 0 : u.map((d) => r[d.name])) ?? [] : [];
    f.length > 0 && (a = (u == null ? void 0 : u.map((d, l) => Array.isArray(f[l]) ? f[l].map((h, p) => Do({ param: d, value: f[l][p] })) : typeof f[l] < "u" && f[l] !== null ? Do({ param: d, value: f[l] }) : null)) ?? []);
  }
  return [i, ...a];
}
function Do({ param: e, value: t }) {
  if (e.type === "string" || e.type === "bytes")
    return Q(_t(t));
  if (e.type === "tuple" || e.type.match(/^(.*)\[(\d+)?\]$/))
    throw new c0(e.type);
  return pt([e], [t]);
}
function or(e, { method: t }) {
  var r, s;
  const n = {};
  return e.transport.type === "fallback" && ((s = (r = e.transport).onResponse) == null || s.call(r, ({ method: o, response: i, status: a, transport: c }) => {
    a === "success" && t === o && (n[i] = c.request);
  })), (o) => n[o] || e.request;
}
async function aa(e, t) {
  const { address: n, abi: r, args: s, eventName: o, fromBlock: i, strict: a, toBlock: c } = t, u = or(e, {
    method: "eth_newFilter"
  }), f = o ? Tn({
    abi: r,
    args: s,
    eventName: o
  }) : void 0, d = await e.request({
    method: "eth_newFilter",
    params: [
      {
        address: n,
        fromBlock: typeof i == "bigint" ? N(i) : i,
        toBlock: typeof c == "bigint" ? N(c) : c,
        topics: f
      }
    ]
  });
  return {
    abi: r,
    args: s,
    eventName: o,
    id: d,
    request: u(d),
    strict: !!a,
    type: "event"
  };
}
function H(e) {
  return typeof e == "string" ? { address: e, type: "json-rpc" } : e;
}
const Ho = "/docs/contract/encodeFunctionData";
function sf(e) {
  const { abi: t, args: n, functionName: r } = e;
  let s = t[0];
  if (r) {
    const o = bt({
      abi: t,
      args: n,
      name: r
    });
    if (!o)
      throw new Bt(r, { docsPath: Ho });
    s = o;
  }
  if (s.type !== "function")
    throw new Bt(void 0, { docsPath: Ho });
  return {
    abi: [s],
    functionName: Bn(ve(s))
  };
}
function fe(e) {
  const { args: t } = e, { abi: n, functionName: r } = (() => {
    var a;
    return e.abi.length === 1 && ((a = e.functionName) != null && a.startsWith("0x")) ? e : sf(e);
  })(), s = n[0], o = r, i = "inputs" in s && s.inputs ? pt(s.inputs, t ?? []) : void 0;
  return Ie([o, i ?? "0x"]);
}
const of = {
  1: "An `assert` condition failed.",
  17: "Arithmetic operation resulted in underflow or overflow.",
  18: "Division or modulo by zero (e.g. `5 / 0` or `23 % 0`).",
  33: "Attempted to convert to an invalid type.",
  34: "Attempted to access a storage byte array that is incorrectly encoded.",
  49: "Performed `.pop()` on an empty array",
  50: "Array index is out of bounds.",
  65: "Allocated too much memory or created an array which is too large.",
  81: "Attempted to call a zero-initialized variable of internal function type."
}, ca = {
  inputs: [
    {
      name: "message",
      type: "string"
    }
  ],
  name: "Error",
  type: "error"
}, af = {
  inputs: [
    {
      name: "reason",
      type: "uint256"
    }
  ],
  name: "Panic",
  type: "error"
};
let qo = class extends I {
  constructor({ offset: t }) {
    super(`Offset \`${t}\` cannot be negative.`, {
      name: "NegativeOffsetError"
    });
  }
}, ua = class extends I {
  constructor({ length: t, position: n }) {
    super(`Position \`${n}\` is out of bounds (\`0 < position < ${t}\`).`, { name: "PositionOutOfBoundsError" });
  }
}, cf = class extends I {
  constructor({ count: t, limit: n }) {
    super(`Recursive read limit of \`${n}\` exceeded (recursive read count: \`${t}\`).`, { name: "RecursiveReadLimitExceededError" });
  }
};
const uf = {
  bytes: new Uint8Array(),
  dataView: new DataView(new ArrayBuffer(0)),
  position: 0,
  positionReadCount: /* @__PURE__ */ new Map(),
  recursiveReadCount: 0,
  recursiveReadLimit: Number.POSITIVE_INFINITY,
  assertReadLimit() {
    if (this.recursiveReadCount >= this.recursiveReadLimit)
      throw new cf({
        count: this.recursiveReadCount + 1,
        limit: this.recursiveReadLimit
      });
  },
  assertPosition(e) {
    if (e < 0 || e > this.bytes.length - 1)
      throw new ua({
        length: this.bytes.length,
        position: e
      });
  },
  decrementPosition(e) {
    if (e < 0)
      throw new qo({ offset: e });
    const t = this.position - e;
    this.assertPosition(t), this.position = t;
  },
  getReadCount(e) {
    return this.positionReadCount.get(e || this.position) || 0;
  },
  incrementPosition(e) {
    if (e < 0)
      throw new qo({ offset: e });
    const t = this.position + e;
    this.assertPosition(t), this.position = t;
  },
  inspectByte(e) {
    const t = e ?? this.position;
    return this.assertPosition(t), this.bytes[t];
  },
  inspectBytes(e, t) {
    const n = t ?? this.position;
    return this.assertPosition(n + e - 1), this.bytes.subarray(n, n + e);
  },
  inspectUint8(e) {
    const t = e ?? this.position;
    return this.assertPosition(t), this.bytes[t];
  },
  inspectUint16(e) {
    const t = e ?? this.position;
    return this.assertPosition(t + 1), this.dataView.getUint16(t);
  },
  inspectUint24(e) {
    const t = e ?? this.position;
    return this.assertPosition(t + 2), (this.dataView.getUint16(t) << 8) + this.dataView.getUint8(t + 2);
  },
  inspectUint32(e) {
    const t = e ?? this.position;
    return this.assertPosition(t + 3), this.dataView.getUint32(t);
  },
  pushByte(e) {
    this.assertPosition(this.position), this.bytes[this.position] = e, this.position++;
  },
  pushBytes(e) {
    this.assertPosition(this.position + e.length - 1), this.bytes.set(e, this.position), this.position += e.length;
  },
  pushUint8(e) {
    this.assertPosition(this.position), this.bytes[this.position] = e, this.position++;
  },
  pushUint16(e) {
    this.assertPosition(this.position + 1), this.dataView.setUint16(this.position, e), this.position += 2;
  },
  pushUint24(e) {
    this.assertPosition(this.position + 2), this.dataView.setUint16(this.position, e >> 8), this.dataView.setUint8(this.position + 2, e & 255), this.position += 3;
  },
  pushUint32(e) {
    this.assertPosition(this.position + 3), this.dataView.setUint32(this.position, e), this.position += 4;
  },
  readByte() {
    this.assertReadLimit(), this._touch();
    const e = this.inspectByte();
    return this.position++, e;
  },
  readBytes(e, t) {
    this.assertReadLimit(), this._touch();
    const n = this.inspectBytes(e);
    return this.position += t ?? e, n;
  },
  readUint8() {
    this.assertReadLimit(), this._touch();
    const e = this.inspectUint8();
    return this.position += 1, e;
  },
  readUint16() {
    this.assertReadLimit(), this._touch();
    const e = this.inspectUint16();
    return this.position += 2, e;
  },
  readUint24() {
    this.assertReadLimit(), this._touch();
    const e = this.inspectUint24();
    return this.position += 3, e;
  },
  readUint32() {
    this.assertReadLimit(), this._touch();
    const e = this.inspectUint32();
    return this.position += 4, e;
  },
  get remaining() {
    return this.bytes.length - this.position;
  },
  setPosition(e) {
    const t = this.position;
    return this.assertPosition(e), this.position = e, () => this.position = t;
  },
  _touch() {
    if (this.recursiveReadLimit === Number.POSITIVE_INFINITY)
      return;
    const e = this.getReadCount();
    this.positionReadCount.set(this.position, e + 1), e > 0 && this.recursiveReadCount++;
  }
};
function Ls(e, { recursiveReadLimit: t = 8192 } = {}) {
  const n = Object.create(uf);
  return n.bytes = e, n.dataView = new DataView(e.buffer ?? e, e.byteOffset, e.byteLength), n.positionReadCount = /* @__PURE__ */ new Map(), n.recursiveReadLimit = t, n;
}
function ff(e, t = {}) {
  typeof t.size < "u" && $e(e, { size: t.size });
  const n = V(e, t);
  return X(n, t);
}
function df(e, t = {}) {
  let n = e;
  if (typeof t.size < "u" && ($e(n, { size: t.size }), n = me(n)), n.length > 1 || n[0] > 1)
    throw new f0(n);
  return !!n[0];
}
function Me(e, t = {}) {
  typeof t.size < "u" && $e(e, { size: t.size });
  const n = V(e, t);
  return ge(n, t);
}
function lf(e, t = {}) {
  let n = e;
  return typeof t.size < "u" && ($e(n, { size: t.size }), n = me(n, { dir: "right" })), new TextDecoder().decode(n);
}
function Cn(e, t) {
  const n = typeof t == "string" ? Ce(t) : t, r = Ls(n);
  if (D(n) === 0 && e.length > 0)
    throw new In();
  if (D(t) && D(t) < 32)
    throw new Ui({
      data: typeof t == "string" ? t : V(t),
      params: e,
      size: D(t)
    });
  let s = 0;
  const o = [];
  for (let i = 0; i < e.length; ++i) {
    const a = e[i];
    r.setPosition(s);
    const [c, u] = At(r, a, {
      staticPosition: 0
    });
    s += u, o.push(c);
  }
  return o;
}
function At(e, t, { staticPosition: n }) {
  const r = Ms(t.type);
  if (r) {
    const [s, o] = r;
    return pf(e, { ...t, type: o }, { length: s, staticPosition: n });
  }
  if (t.type === "tuple")
    return gf(e, t, { staticPosition: n });
  if (t.type === "address")
    return hf(e);
  if (t.type === "bool")
    return bf(e);
  if (t.type.startsWith("bytes"))
    return yf(e, t, { staticPosition: n });
  if (t.type.startsWith("uint") || t.type.startsWith("int"))
    return mf(e, t);
  if (t.type === "string")
    return wf(e, { staticPosition: n });
  throw new i0(t.type, {
    docsPath: "/docs/contract/decodeAbiParameters"
  });
}
const Vo = 32, ns = 32;
function hf(e) {
  const t = e.readBytes(32);
  return [Sn(V(sa(t, -20))), 32];
}
function pf(e, t, { length: n, staticPosition: r }) {
  if (!n) {
    const i = Me(e.readBytes(ns)), a = r + i, c = a + Vo;
    e.setPosition(a);
    const u = Me(e.readBytes(Vo)), f = en(t);
    let d = 0;
    const l = [];
    for (let h = 0; h < u; ++h) {
      e.setPosition(c + (f ? h * 32 : d));
      const [p, b] = At(e, t, {
        staticPosition: c
      });
      d += b, l.push(p);
    }
    return e.setPosition(r + 32), [l, 32];
  }
  if (en(t)) {
    const i = Me(e.readBytes(ns)), a = r + i, c = [];
    for (let u = 0; u < n; ++u) {
      e.setPosition(a + u * 32);
      const [f] = At(e, t, {
        staticPosition: a
      });
      c.push(f);
    }
    return e.setPosition(r + 32), [c, 32];
  }
  let s = 0;
  const o = [];
  for (let i = 0; i < n; ++i) {
    const [a, c] = At(e, t, {
      staticPosition: r + s
    });
    s += c, o.push(a);
  }
  return [o, s];
}
function bf(e) {
  return [df(e.readBytes(32), { size: 32 }), 32];
}
function yf(e, t, { staticPosition: n }) {
  const [r, s] = t.type.split("bytes");
  if (!s) {
    const i = Me(e.readBytes(32));
    e.setPosition(n + i);
    const a = Me(e.readBytes(32));
    if (a === 0)
      return e.setPosition(n + 32), ["0x", 32];
    const c = e.readBytes(a);
    return e.setPosition(n + 32), [V(c), 32];
  }
  return [V(e.readBytes(Number.parseInt(s, 10), 32)), 32];
}
function mf(e, t) {
  const n = t.type.startsWith("int"), r = Number.parseInt(t.type.split("int")[1] || "256", 10), s = e.readBytes(32);
  return [
    r > 48 ? ff(s, { signed: n }) : Me(s, { signed: n }),
    32
  ];
}
function gf(e, t, { staticPosition: n }) {
  const r = t.components.length === 0 || t.components.some(({ name: i }) => !i), s = r ? [] : {};
  let o = 0;
  if (en(t)) {
    const i = Me(e.readBytes(ns)), a = n + i;
    for (let c = 0; c < t.components.length; ++c) {
      const u = t.components[c];
      e.setPosition(a + o);
      const [f, d] = At(e, u, {
        staticPosition: a
      });
      o += d, s[r ? c : u == null ? void 0 : u.name] = f;
    }
    return e.setPosition(n + 32), [s, 32];
  }
  for (let i = 0; i < t.components.length; ++i) {
    const a = t.components[i], [c, u] = At(e, a, {
      staticPosition: n
    });
    s[r ? i : a == null ? void 0 : a.name] = c, o += u;
  }
  return [s, o];
}
function wf(e, { staticPosition: t }) {
  const n = Me(e.readBytes(32)), r = t + n;
  e.setPosition(r);
  const s = Me(e.readBytes(32));
  if (s === 0)
    return e.setPosition(t + 32), ["", 32];
  const o = e.readBytes(s, 32), i = lf(me(o));
  return e.setPosition(t + 32), [i, 32];
}
function en(e) {
  var r;
  const { type: t } = e;
  if (t === "string" || t === "bytes" || t.endsWith("[]"))
    return !0;
  if (t === "tuple")
    return (r = e.components) == null ? void 0 : r.some(en);
  const n = Ms(e.type);
  return !!(n && en({ ...e, type: n[1] }));
}
function xf(e) {
  const { abi: t, data: n, cause: r } = e, s = We(n, 0, 4);
  if (s === "0x")
    throw new In({ cause: r });
  const i = [...t || [], ca, af].find((a) => a.type === "error" && s === Bn(ve(a)));
  if (!i)
    throw new Gi(s, {
      docsPath: "/docs/contract/decodeErrorResult",
      cause: r
    });
  return {
    abiItem: i,
    args: "inputs" in i && i.inputs && i.inputs.length > 0 ? Cn(i.inputs, We(n, 4)) : void 0,
    errorName: i.name
  };
}
const K = (e, t, n) => JSON.stringify(e, (r, s) => typeof s == "bigint" ? s.toString() : s, n);
function fa({ abiItem: e, args: t, includeFunctionName: n = !0, includeName: r = !1 }) {
  if ("name" in e && "inputs" in e && e.inputs)
    return `${n ? e.name : ""}(${e.inputs.map((s, o) => `${r && s.name ? `${s.name}: ` : ""}${typeof t[o] == "object" ? K(t[o]) : t[o]}`).join(", ")})`;
}
const vf = {
  gwei: 9,
  wei: 18
}, Ef = {
  ether: -9,
  wei: 9
};
function da(e, t) {
  let n = e.toString();
  const r = n.startsWith("-");
  r && (n = n.slice(1)), n = n.padStart(t, "0");
  let [s, o] = [
    n.slice(0, n.length - t),
    n.slice(n.length - t)
  ];
  return o = o.replace(/(0+)$/, ""), `${r ? "-" : ""}${s || "0"}${o ? `.${o}` : ""}`;
}
function _s(e, t = "wei") {
  return da(e, vf[t]);
}
function ce(e, t = "wei") {
  return da(e, Ef[t]);
}
class Pf extends I {
  constructor({ address: t }) {
    super(`State for account "${t}" is set multiple times.`, {
      name: "AccountStateConflictError"
    });
  }
}
class Af extends I {
  constructor() {
    super("state and stateDiff are set on the same account.", {
      name: "StateAssignmentConflictError"
    });
  }
}
function Wo(e) {
  return e.reduce((t, { slot: n, value: r }) => `${t}        ${n}: ${r}
`, "");
}
function $f(e) {
  return e.reduce((t, { address: n, ...r }) => {
    let s = `${t}    ${n}:
`;
    return r.nonce && (s += `      nonce: ${r.nonce}
`), r.balance && (s += `      balance: ${r.balance}
`), r.code && (s += `      code: ${r.code}
`), r.state && (s += `      state:
`, s += Wo(r.state)), r.stateDiff && (s += `      stateDiff:
`, s += Wo(r.stateDiff)), s;
  }, `  State Override:
`).slice(0, -1);
}
function kn(e) {
  const t = Object.entries(e).map(([r, s]) => s === void 0 || s === !1 ? null : [r, s]).filter(Boolean), n = t.reduce((r, [s]) => Math.max(r, s.length), 0);
  return t.map(([r, s]) => `  ${`${r}:`.padEnd(n + 1)}  ${s}`).join(`
`);
}
class If extends I {
  constructor({ v: t }) {
    super(`Invalid \`v\` value "${t}". Expected 27 or 28.`, {
      name: "InvalidLegacyVError"
    });
  }
}
class Sf extends I {
  constructor({ transaction: t }) {
    super("Cannot infer a transaction type from provided transaction.", {
      metaMessages: [
        "Provided Transaction:",
        "{",
        kn(t),
        "}",
        "",
        "To infer the type, either provide:",
        "- a `type` to the Transaction, or",
        "- an EIP-1559 Transaction with `maxFeePerGas`, or",
        "- an EIP-2930 Transaction with `gasPrice` & `accessList`, or",
        "- an EIP-4844 Transaction with `blobs`, `blobVersionedHashes`, `sidecars`, or",
        "- an EIP-7702 Transaction with `authorizationList`, or",
        "- a Legacy Transaction with `gasPrice`"
      ],
      name: "InvalidSerializableTransactionError"
    });
  }
}
class Bf extends I {
  constructor({ storageKey: t }) {
    super(`Size for storage key "${t}" is invalid. Expected 32 bytes. Got ${Math.floor((t.length - 2) / 2)} bytes.`, { name: "InvalidStorageKeySizeError" });
  }
}
class Tf extends I {
  constructor(t, { account: n, docsPath: r, chain: s, data: o, gas: i, gasPrice: a, maxFeePerGas: c, maxPriorityFeePerGas: u, nonce: f, to: d, value: l }) {
    var p;
    const h = kn({
      chain: s && `${s == null ? void 0 : s.name} (id: ${s == null ? void 0 : s.id})`,
      from: n == null ? void 0 : n.address,
      to: d,
      value: typeof l < "u" && `${_s(l)} ${((p = s == null ? void 0 : s.nativeCurrency) == null ? void 0 : p.symbol) || "ETH"}`,
      data: o,
      gas: i,
      gasPrice: typeof a < "u" && `${ce(a)} gwei`,
      maxFeePerGas: typeof c < "u" && `${ce(c)} gwei`,
      maxPriorityFeePerGas: typeof u < "u" && `${ce(u)} gwei`,
      nonce: f
    });
    super(t.shortMessage, {
      cause: t,
      docsPath: r,
      metaMessages: [
        ...t.metaMessages ? [...t.metaMessages, " "] : [],
        "Request Arguments:",
        h
      ].filter(Boolean),
      name: "TransactionExecutionError"
    }), Object.defineProperty(this, "cause", {
      enumerable: !0,
      configurable: !0,
      writable: !0,
      value: void 0
    }), this.cause = t;
  }
}
class la extends I {
  constructor({ blockHash: t, blockNumber: n, blockTag: r, hash: s, index: o }) {
    let i = "Transaction";
    r && o !== void 0 && (i = `Transaction at block time "${r}" at index "${o}"`), t && o !== void 0 && (i = `Transaction at block hash "${t}" at index "${o}"`), n && o !== void 0 && (i = `Transaction at block number "${n}" at index "${o}"`), s && (i = `Transaction with hash "${s}"`), super(`${i} could not be found.`, {
      name: "TransactionNotFoundError"
    });
  }
}
class ha extends I {
  constructor({ hash: t }) {
    super(`Transaction receipt with hash "${t}" could not be found. The Transaction may not be processed on a block yet.`, {
      name: "TransactionReceiptNotFoundError"
    });
  }
}
class pa extends I {
  constructor({ receipt: t }) {
    super(`Transaction with hash "${t.transactionHash}" reverted.`, {
      metaMessages: [
        'The receipt marked the transaction as "reverted". This could mean that the function on the contract you are trying to call threw an error.',
        " ",
        "You can attempt to extract the revert reason by:",
        "- calling the `simulateContract` or `simulateCalls` Action with the `abi` and `functionName` of the contract",
        "- using the `call` Action with raw `data`"
      ],
      name: "TransactionReceiptRevertedError"
    }), Object.defineProperty(this, "receipt", {
      enumerable: !0,
      configurable: !0,
      writable: !0,
      value: void 0
    }), this.receipt = t;
  }
}
class Cf extends I {
  constructor({ hash: t }) {
    super(`Timed out while waiting for transaction with hash "${t}" to be confirmed.`, { name: "WaitForTransactionReceiptTimeoutError" });
  }
}
const kf = (e) => e, js = (e) => e;
class ba extends I {
  constructor(t, { account: n, docsPath: r, chain: s, data: o, gas: i, gasPrice: a, maxFeePerGas: c, maxPriorityFeePerGas: u, nonce: f, to: d, value: l, stateOverride: h }) {
    var x;
    const p = n ? H(n) : void 0;
    let b = kn({
      from: p == null ? void 0 : p.address,
      to: d,
      value: typeof l < "u" && `${_s(l)} ${((x = s == null ? void 0 : s.nativeCurrency) == null ? void 0 : x.symbol) || "ETH"}`,
      data: o,
      gas: i,
      gasPrice: typeof a < "u" && `${ce(a)} gwei`,
      maxFeePerGas: typeof c < "u" && `${ce(c)} gwei`,
      maxPriorityFeePerGas: typeof u < "u" && `${ce(u)} gwei`,
      nonce: f
    });
    h && (b += `
${$f(h)}`), super(t.shortMessage, {
      cause: t,
      docsPath: r,
      metaMessages: [
        ...t.metaMessages ? [...t.metaMessages, " "] : [],
        "Raw Call Arguments:",
        b
      ].filter(Boolean),
      name: "CallExecutionError"
    }), Object.defineProperty(this, "cause", {
      enumerable: !0,
      configurable: !0,
      writable: !0,
      value: void 0
    }), this.cause = t;
  }
}
class ya extends I {
  constructor(t, { abi: n, args: r, contractAddress: s, docsPath: o, functionName: i, sender: a }) {
    const c = bt({ abi: n, args: r, name: i }), u = c ? fa({
      abiItem: c,
      args: r,
      includeFunctionName: !1,
      includeName: !1
    }) : void 0, f = c ? ve(c, { includeName: !0 }) : void 0, d = kn({
      address: s && kf(s),
      function: f,
      args: u && u !== "()" && `${[...Array((i == null ? void 0 : i.length) ?? 0).keys()].map(() => " ").join("")}${u}`,
      sender: a
    });
    super(t.shortMessage || `An unknown error occurred while executing the contract function "${i}".`, {
      cause: t,
      docsPath: o,
      metaMessages: [
        ...t.metaMessages ? [...t.metaMessages, " "] : [],
        d && "Contract Call:",
        d
      ].filter(Boolean),
      name: "ContractFunctionExecutionError"
    }), Object.defineProperty(this, "abi", {
      enumerable: !0,
      configurable: !0,
      writable: !0,
      value: void 0
    }), Object.defineProperty(this, "args", {
      enumerable: !0,
      configurable: !0,
      writable: !0,
      value: void 0
    }), Object.defineProperty(this, "cause", {
      enumerable: !0,
      configurable: !0,
      writable: !0,
      value: void 0
    }), Object.defineProperty(this, "contractAddress", {
      enumerable: !0,
      configurable: !0,
      writable: !0,
      value: void 0
    }), Object.defineProperty(this, "formattedArgs", {
      enumerable: !0,
      configurable: !0,
      writable: !0,
      value: void 0
    }), Object.defineProperty(this, "functionName", {
      enumerable: !0,
      configurable: !0,
      writable: !0,
      value: void 0
    }), Object.defineProperty(this, "sender", {
      enumerable: !0,
      configurable: !0,
      writable: !0,
      value: void 0
    }), this.abi = n, this.args = r, this.cause = t, this.contractAddress = s, this.functionName = i, this.sender = a;
  }
}
class rs extends I {
  constructor({ abi: t, data: n, functionName: r, message: s, cause: o }) {
    let i, a, c, u;
    if (n && n !== "0x")
      try {
        a = xf({ abi: t, data: n, cause: o });
        const { abiItem: d, errorName: l, args: h } = a;
        if (l === "Error")
          u = h[0];
        else if (l === "Panic") {
          const [p] = h;
          u = of[p];
        } else {
          const p = d ? ve(d, { includeName: !0 }) : void 0, b = d && h ? fa({
            abiItem: d,
            args: h,
            includeFunctionName: !1,
            includeName: !1
          }) : void 0;
          c = [
            p ? `Error: ${p}` : "",
            b && b !== "()" ? `       ${[...Array((l == null ? void 0 : l.length) ?? 0).keys()].map(() => " ").join("")}${b}` : ""
          ];
        }
      } catch (d) {
        i = d;
      }
    else s && (u = s);
    let f;
    i instanceof Gi && (f = i.signature, c = [
      `Unable to decode signature "${f}" as it was not found on the provided ABI.`,
      "Make sure you are using the correct ABI and that the error exists on it.",
      `You can look up the decoded signature here: https://4byte.sourcify.dev/?q=${f}.`
    ]), super(u && u !== "execution reverted" || f ? [
      `The contract function "${r}" reverted with the following ${f ? "signature" : "reason"}:`,
      u || f
    ].join(`
`) : `The contract function "${r}" reverted.`, {
      cause: i ?? o,
      metaMessages: c,
      name: "ContractFunctionRevertedError"
    }), Object.defineProperty(this, "data", {
      enumerable: !0,
      configurable: !0,
      writable: !0,
      value: void 0
    }), Object.defineProperty(this, "raw", {
      enumerable: !0,
      configurable: !0,
      writable: !0,
      value: void 0
    }), Object.defineProperty(this, "reason", {
      enumerable: !0,
      configurable: !0,
      writable: !0,
      value: void 0
    }), Object.defineProperty(this, "signature", {
      enumerable: !0,
      configurable: !0,
      writable: !0,
      value: void 0
    }), this.data = a, this.raw = n, this.reason = u, this.signature = f;
  }
}
class Nf extends I {
  constructor({ functionName: t, cause: n }) {
    super(`The contract function "${t}" returned no data ("0x").`, {
      metaMessages: [
        "This could be due to any of the following:",
        `  - The contract does not have the function "${t}",`,
        "  - The parameters passed to the contract function may be invalid, or",
        "  - The address is not a contract."
      ],
      name: "ContractFunctionZeroDataError",
      cause: n
    });
  }
}
class Ff extends I {
  constructor({ factory: t }) {
    super(`Deployment for counterfactual contract call failed${t ? ` for factory "${t}".` : ""}`, {
      metaMessages: [
        "Please ensure:",
        "- The `factory` is a valid contract deployment factory (ie. Create2 Factory, ERC-4337 Factory, etc).",
        "- The `factoryData` is a valid encoded function call for contract deployment function on the factory."
      ],
      name: "CounterfactualDeploymentFailedError"
    });
  }
}
class ir extends I {
  constructor({ data: t, message: n }) {
    super(n || "", { name: "RawContractError" }), Object.defineProperty(this, "code", {
      enumerable: !0,
      configurable: !0,
      writable: !0,
      value: 3
    }), Object.defineProperty(this, "data", {
      enumerable: !0,
      configurable: !0,
      writable: !0,
      value: void 0
    }), this.data = t;
  }
}
class Yt extends I {
  constructor({ body: t, cause: n, details: r, headers: s, status: o, url: i }) {
    super("HTTP request failed.", {
      cause: n,
      details: r,
      metaMessages: [
        o && `Status: ${o}`,
        `URL: ${js(i)}`,
        t && `Request body: ${K(t)}`
      ].filter(Boolean),
      name: "HttpRequestError"
    }), Object.defineProperty(this, "body", {
      enumerable: !0,
      configurable: !0,
      writable: !0,
      value: void 0
    }), Object.defineProperty(this, "headers", {
      enumerable: !0,
      configurable: !0,
      writable: !0,
      value: void 0
    }), Object.defineProperty(this, "status", {
      enumerable: !0,
      configurable: !0,
      writable: !0,
      value: void 0
    }), Object.defineProperty(this, "url", {
      enumerable: !0,
      configurable: !0,
      writable: !0,
      value: void 0
    }), this.body = t, this.headers = s, this.status = o, this.url = i;
  }
}
class Us extends I {
  constructor({ body: t, error: n, url: r }) {
    super("RPC Request failed.", {
      cause: n,
      details: n.message,
      metaMessages: [`URL: ${js(r)}`, `Request body: ${K(t)}`],
      name: "RpcRequestError"
    }), Object.defineProperty(this, "code", {
      enumerable: !0,
      configurable: !0,
      writable: !0,
      value: void 0
    }), Object.defineProperty(this, "data", {
      enumerable: !0,
      configurable: !0,
      writable: !0,
      value: void 0
    }), Object.defineProperty(this, "url", {
      enumerable: !0,
      configurable: !0,
      writable: !0,
      value: void 0
    }), this.code = n.code, this.data = n.data, this.url = r;
  }
}
class Zo extends I {
  constructor({ body: t, url: n }) {
    super("The request took too long to respond.", {
      details: "The request timed out.",
      metaMessages: [`URL: ${js(n)}`, `Request body: ${K(t)}`],
      name: "TimeoutError"
    }), Object.defineProperty(this, "url", {
      enumerable: !0,
      configurable: !0,
      writable: !0,
      value: void 0
    }), this.url = n;
  }
}
const Of = -1;
class de extends I {
  constructor(t, { code: n, docsPath: r, metaMessages: s, name: o, shortMessage: i }) {
    super(i, {
      cause: t,
      docsPath: r,
      metaMessages: s || (t == null ? void 0 : t.metaMessages),
      name: o || "RpcError"
    }), Object.defineProperty(this, "code", {
      enumerable: !0,
      configurable: !0,
      writable: !0,
      value: void 0
    }), this.name = o || t.name, this.code = t instanceof Us ? t.code : n ?? Of;
  }
}
class le extends de {
  constructor(t, n) {
    super(t, n), Object.defineProperty(this, "data", {
      enumerable: !0,
      configurable: !0,
      writable: !0,
      value: void 0
    }), this.data = n.data;
  }
}
class tn extends de {
  constructor(t) {
    super(t, {
      code: tn.code,
      name: "ParseRpcError",
      shortMessage: "Invalid JSON was received by the server. An error occurred on the server while parsing the JSON text."
    });
  }
}
Object.defineProperty(tn, "code", {
  enumerable: !0,
  configurable: !0,
  writable: !0,
  value: -32700
});
class nn extends de {
  constructor(t) {
    super(t, {
      code: nn.code,
      name: "InvalidRequestRpcError",
      shortMessage: "JSON is not a valid request object."
    });
  }
}
Object.defineProperty(nn, "code", {
  enumerable: !0,
  configurable: !0,
  writable: !0,
  value: -32600
});
class rn extends de {
  constructor(t, { method: n } = {}) {
    super(t, {
      code: rn.code,
      name: "MethodNotFoundRpcError",
      shortMessage: `The method${n ? ` "${n}"` : ""} does not exist / is not available.`
    });
  }
}
Object.defineProperty(rn, "code", {
  enumerable: !0,
  configurable: !0,
  writable: !0,
  value: -32601
});
class sn extends de {
  constructor(t) {
    super(t, {
      code: sn.code,
      name: "InvalidParamsRpcError",
      shortMessage: [
        "Invalid parameters were provided to the RPC method.",
        "Double check you have provided the correct parameters."
      ].join(`
`)
    });
  }
}
Object.defineProperty(sn, "code", {
  enumerable: !0,
  configurable: !0,
  writable: !0,
  value: -32602
});
class ct extends de {
  constructor(t) {
    super(t, {
      code: ct.code,
      name: "InternalRpcError",
      shortMessage: "An internal error was received."
    });
  }
}
Object.defineProperty(ct, "code", {
  enumerable: !0,
  configurable: !0,
  writable: !0,
  value: -32603
});
class Ze extends de {
  constructor(t) {
    super(t, {
      code: Ze.code,
      name: "InvalidInputRpcError",
      shortMessage: [
        "Missing or invalid parameters.",
        "Double check you have provided the correct parameters."
      ].join(`
`)
    });
  }
}
Object.defineProperty(Ze, "code", {
  enumerable: !0,
  configurable: !0,
  writable: !0,
  value: -32e3
});
class on extends de {
  constructor(t) {
    super(t, {
      code: on.code,
      name: "ResourceNotFoundRpcError",
      shortMessage: "Requested resource not found."
    }), Object.defineProperty(this, "name", {
      enumerable: !0,
      configurable: !0,
      writable: !0,
      value: "ResourceNotFoundRpcError"
    });
  }
}
Object.defineProperty(on, "code", {
  enumerable: !0,
  configurable: !0,
  writable: !0,
  value: -32001
});
class an extends de {
  constructor(t) {
    super(t, {
      code: an.code,
      name: "ResourceUnavailableRpcError",
      shortMessage: "Requested resource not available."
    });
  }
}
Object.defineProperty(an, "code", {
  enumerable: !0,
  configurable: !0,
  writable: !0,
  value: -32002
});
class cn extends de {
  constructor(t) {
    super(t, {
      code: cn.code,
      name: "TransactionRejectedRpcError",
      shortMessage: "Transaction creation failed."
    });
  }
}
Object.defineProperty(cn, "code", {
  enumerable: !0,
  configurable: !0,
  writable: !0,
  value: -32003
});
class nt extends de {
  constructor(t, { method: n } = {}) {
    super(t, {
      code: nt.code,
      name: "MethodNotSupportedRpcError",
      shortMessage: `Method${n ? ` "${n}"` : ""} is not supported.`
    });
  }
}
Object.defineProperty(nt, "code", {
  enumerable: !0,
  configurable: !0,
  writable: !0,
  value: -32004
});
class Nt extends de {
  constructor(t) {
    super(t, {
      code: Nt.code,
      name: "LimitExceededRpcError",
      shortMessage: "Request exceeds defined limit."
    });
  }
}
Object.defineProperty(Nt, "code", {
  enumerable: !0,
  configurable: !0,
  writable: !0,
  value: -32005
});
class un extends de {
  constructor(t) {
    super(t, {
      code: un.code,
      name: "JsonRpcVersionUnsupportedError",
      shortMessage: "Version of JSON-RPC protocol is not supported."
    });
  }
}
Object.defineProperty(un, "code", {
  enumerable: !0,
  configurable: !0,
  writable: !0,
  value: -32006
});
class $t extends le {
  constructor(t) {
    super(t, {
      code: $t.code,
      name: "UserRejectedRequestError",
      shortMessage: "User rejected the request."
    });
  }
}
Object.defineProperty($t, "code", {
  enumerable: !0,
  configurable: !0,
  writable: !0,
  value: 4001
});
class fn extends le {
  constructor(t) {
    super(t, {
      code: fn.code,
      name: "UnauthorizedProviderError",
      shortMessage: "The requested method and/or account has not been authorized by the user."
    });
  }
}
Object.defineProperty(fn, "code", {
  enumerable: !0,
  configurable: !0,
  writable: !0,
  value: 4100
});
class dn extends le {
  constructor(t, { method: n } = {}) {
    super(t, {
      code: dn.code,
      name: "UnsupportedProviderMethodError",
      shortMessage: `The Provider does not support the requested method${n ? ` " ${n}"` : ""}.`
    });
  }
}
Object.defineProperty(dn, "code", {
  enumerable: !0,
  configurable: !0,
  writable: !0,
  value: 4200
});
class ln extends le {
  constructor(t) {
    super(t, {
      code: ln.code,
      name: "ProviderDisconnectedError",
      shortMessage: "The Provider is disconnected from all chains."
    });
  }
}
Object.defineProperty(ln, "code", {
  enumerable: !0,
  configurable: !0,
  writable: !0,
  value: 4900
});
class hn extends le {
  constructor(t) {
    super(t, {
      code: hn.code,
      name: "ChainDisconnectedError",
      shortMessage: "The Provider is not connected to the requested chain."
    });
  }
}
Object.defineProperty(hn, "code", {
  enumerable: !0,
  configurable: !0,
  writable: !0,
  value: 4901
});
class pn extends le {
  constructor(t) {
    super(t, {
      code: pn.code,
      name: "SwitchChainError",
      shortMessage: "An error occurred when attempting to switch chain."
    });
  }
}
Object.defineProperty(pn, "code", {
  enumerable: !0,
  configurable: !0,
  writable: !0,
  value: 4902
});
class Ft extends le {
  constructor(t) {
    super(t, {
      code: Ft.code,
      name: "UnsupportedNonOptionalCapabilityError",
      shortMessage: "This Wallet does not support a capability that was not marked as optional."
    });
  }
}
Object.defineProperty(Ft, "code", {
  enumerable: !0,
  configurable: !0,
  writable: !0,
  value: 5700
});
class bn extends le {
  constructor(t) {
    super(t, {
      code: bn.code,
      name: "UnsupportedChainIdError",
      shortMessage: "This Wallet does not support the requested chain ID."
    });
  }
}
Object.defineProperty(bn, "code", {
  enumerable: !0,
  configurable: !0,
  writable: !0,
  value: 5710
});
class yn extends le {
  constructor(t) {
    super(t, {
      code: yn.code,
      name: "DuplicateIdError",
      shortMessage: "There is already a bundle submitted with this ID."
    });
  }
}
Object.defineProperty(yn, "code", {
  enumerable: !0,
  configurable: !0,
  writable: !0,
  value: 5720
});
class mn extends le {
  constructor(t) {
    super(t, {
      code: mn.code,
      name: "UnknownBundleIdError",
      shortMessage: "This bundle id is unknown / has not been submitted"
    });
  }
}
Object.defineProperty(mn, "code", {
  enumerable: !0,
  configurable: !0,
  writable: !0,
  value: 5730
});
class gn extends le {
  constructor(t) {
    super(t, {
      code: gn.code,
      name: "BundleTooLargeError",
      shortMessage: "The call bundle is too large for the Wallet to process."
    });
  }
}
Object.defineProperty(gn, "code", {
  enumerable: !0,
  configurable: !0,
  writable: !0,
  value: 5740
});
class wn extends le {
  constructor(t) {
    super(t, {
      code: wn.code,
      name: "AtomicReadyWalletRejectedUpgradeError",
      shortMessage: "The Wallet can support atomicity after an upgrade, but the user rejected the upgrade."
    });
  }
}
Object.defineProperty(wn, "code", {
  enumerable: !0,
  configurable: !0,
  writable: !0,
  value: 5750
});
class Ot extends le {
  constructor(t) {
    super(t, {
      code: Ot.code,
      name: "AtomicityNotSupportedError",
      shortMessage: "The wallet does not support atomic execution but the request requires it."
    });
  }
}
Object.defineProperty(Ot, "code", {
  enumerable: !0,
  configurable: !0,
  writable: !0,
  value: 5760
});
class xn extends le {
  constructor(t) {
    super(t, {
      code: xn.code,
      name: "WalletConnectSessionSettlementError",
      shortMessage: "WalletConnect session settlement failed."
    });
  }
}
Object.defineProperty(xn, "code", {
  enumerable: !0,
  configurable: !0,
  writable: !0,
  value: 7e3
});
class zf extends de {
  constructor(t) {
    super(t, {
      name: "UnknownRpcError",
      shortMessage: "An unknown RPC error occurred."
    });
  }
}
const Rf = 3;
function ut(e, { abi: t, address: n, args: r, docsPath: s, functionName: o, sender: i }) {
  const a = e instanceof ir ? e : e instanceof I ? e.walk((p) => "data" in p) || e.walk() : {}, { code: c, data: u, details: f, message: d, shortMessage: l } = a, h = e instanceof In ? new Nf({ functionName: o, cause: e }) : [Rf, ct.code].includes(c) && (u || f || d || l) || c === Ze.code && f === "execution reverted" && u ? new rs({
    abi: t,
    data: typeof u == "object" ? u.data : u,
    functionName: o,
    message: a instanceof Us ? f : l ?? d,
    cause: e
  }) : e;
  return new ya(h, {
    abi: t,
    args: r,
    contractAddress: n,
    docsPath: s,
    functionName: o,
    sender: i
  });
}
function Mf(e) {
  const t = Q(`0x${e.substring(4)}`).substring(26);
  return Sn(`0x${t}`);
}
async function Lf({ hash: e, signature: t }) {
  const n = Te(e) ? e : ae(e), { secp256k1: r } = await Promise.resolve().then(() => P1);
  return `0x${(() => {
    if (typeof t == "object" && "r" in t && "s" in t) {
      const { r: u, s: f, v: d, yParity: l } = t, h = Number(l ?? d), p = Ko(h);
      return new r.Signature(X(u), X(f)).addRecoveryBit(p);
    }
    const i = Te(t) ? t : ae(t);
    if (D(i) !== 65)
      throw new Error("invalid signature length");
    const a = ge(`0x${i.slice(130)}`), c = Ko(a);
    return r.Signature.fromCompact(i.substring(2, 130)).addRecoveryBit(c);
  })().recoverPublicKey(n.substring(2)).toHex(!1)}`;
}
function Ko(e) {
  if (e === 0 || e === 1)
    return e;
  if (e === 27)
    return 0;
  if (e === 28)
    return 1;
  throw new Error("Invalid yParityOrV value");
}
async function ss({ hash: e, signature: t }) {
  return Mf(await Lf({ hash: e, signature: t }));
}
function Ke(e, t = "hex") {
  const n = ma(e), r = Ls(new Uint8Array(n.length));
  return n.encode(r), t === "hex" ? V(r.bytes) : r.bytes;
}
function ma(e) {
  return Array.isArray(e) ? _f(e.map((t) => ma(t))) : jf(e);
}
function _f(e) {
  const t = e.reduce((s, o) => s + o.length, 0), n = ga(t);
  return {
    length: t <= 55 ? 1 + t : 1 + n + t,
    encode(s) {
      t <= 55 ? s.pushByte(192 + t) : (s.pushByte(247 + n), n === 1 ? s.pushUint8(t) : n === 2 ? s.pushUint16(t) : n === 3 ? s.pushUint24(t) : s.pushUint32(t));
      for (const { encode: o } of e)
        o(s);
    }
  };
}
function jf(e) {
  const t = typeof e == "string" ? Ce(e) : e, n = ga(t.length);
  return {
    length: t.length === 1 && t[0] < 128 ? 1 : t.length <= 55 ? 1 + t.length : 1 + n + t.length,
    encode(s) {
      t.length === 1 && t[0] < 128 ? s.pushBytes(t) : t.length <= 55 ? (s.pushByte(128 + t.length), s.pushBytes(t)) : (s.pushByte(183 + n), n === 1 ? s.pushUint8(t.length) : n === 2 ? s.pushUint16(t.length) : n === 3 ? s.pushUint24(t.length) : s.pushUint32(t.length), s.pushBytes(t));
    }
  };
}
function ga(e) {
  if (e < 2 ** 8)
    return 1;
  if (e < 2 ** 16)
    return 2;
  if (e < 2 ** 24)
    return 3;
  if (e < 2 ** 32)
    return 4;
  throw new I("Length is too large.");
}
function Uf(e) {
  const { chainId: t, nonce: n, to: r } = e, s = e.contractAddress ?? e.address, o = Q(Ie([
    "0x05",
    Ke([
      t ? N(t) : "0x",
      s,
      n ? N(n) : "0x"
    ])
  ]));
  return r === "bytes" ? Ce(o) : o;
}
async function ar(e) {
  const { authorization: t, signature: n } = e;
  return ss({
    hash: Uf(t),
    signature: n ?? t
  });
}
class Gf extends I {
  constructor(t, { account: n, docsPath: r, chain: s, data: o, gas: i, gasPrice: a, maxFeePerGas: c, maxPriorityFeePerGas: u, nonce: f, to: d, value: l }) {
    var p;
    const h = kn({
      from: n == null ? void 0 : n.address,
      to: d,
      value: typeof l < "u" && `${_s(l)} ${((p = s == null ? void 0 : s.nativeCurrency) == null ? void 0 : p.symbol) || "ETH"}`,
      data: o,
      gas: i,
      gasPrice: typeof a < "u" && `${ce(a)} gwei`,
      maxFeePerGas: typeof c < "u" && `${ce(c)} gwei`,
      maxPriorityFeePerGas: typeof u < "u" && `${ce(u)} gwei`,
      nonce: f
    });
    super(t.shortMessage, {
      cause: t,
      docsPath: r,
      metaMessages: [
        ...t.metaMessages ? [...t.metaMessages, " "] : [],
        "Estimate Gas Arguments:",
        h
      ].filter(Boolean),
      name: "EstimateGasExecutionError"
    }), Object.defineProperty(this, "cause", {
      enumerable: !0,
      configurable: !0,
      writable: !0,
      value: void 0
    }), this.cause = t;
  }
}
class vt extends I {
  constructor({ cause: t, message: n } = {}) {
    var s;
    const r = (s = n == null ? void 0 : n.replace("execution reverted: ", "")) == null ? void 0 : s.replace("execution reverted", "");
    super(`Execution reverted ${r ? `with reason: ${r}` : "for an unknown reason"}.`, {
      cause: t,
      name: "ExecutionRevertedError"
    });
  }
}
Object.defineProperty(vt, "code", {
  enumerable: !0,
  configurable: !0,
  writable: !0,
  value: 3
});
Object.defineProperty(vt, "nodeMessage", {
  enumerable: !0,
  configurable: !0,
  writable: !0,
  value: /execution reverted|gas required exceeds allowance/
});
class ft extends I {
  constructor({ cause: t, maxFeePerGas: n } = {}) {
    super(`The fee cap (\`maxFeePerGas\`${n ? ` = ${ce(n)} gwei` : ""}) cannot be higher than the maximum allowed value (2^256-1).`, {
      cause: t,
      name: "FeeCapTooHighError"
    });
  }
}
Object.defineProperty(ft, "nodeMessage", {
  enumerable: !0,
  configurable: !0,
  writable: !0,
  value: /max fee per gas higher than 2\^256-1|fee cap higher than 2\^256-1/
});
class os extends I {
  constructor({ cause: t, maxFeePerGas: n } = {}) {
    super(`The fee cap (\`maxFeePerGas\`${n ? ` = ${ce(n)}` : ""} gwei) cannot be lower than the block base fee.`, {
      cause: t,
      name: "FeeCapTooLowError"
    });
  }
}
Object.defineProperty(os, "nodeMessage", {
  enumerable: !0,
  configurable: !0,
  writable: !0,
  value: /max fee per gas less than block base fee|fee cap less than block base fee|transaction is outdated/
});
class is extends I {
  constructor({ cause: t, nonce: n } = {}) {
    super(`Nonce provided for the transaction ${n ? `(${n}) ` : ""}is higher than the next one expected.`, { cause: t, name: "NonceTooHighError" });
  }
}
Object.defineProperty(is, "nodeMessage", {
  enumerable: !0,
  configurable: !0,
  writable: !0,
  value: /nonce too high/
});
class as extends I {
  constructor({ cause: t, nonce: n } = {}) {
    super([
      `Nonce provided for the transaction ${n ? `(${n}) ` : ""}is lower than the current nonce of the account.`,
      "Try increasing the nonce or find the latest nonce with `getTransactionCount`."
    ].join(`
`), { cause: t, name: "NonceTooLowError" });
  }
}
Object.defineProperty(as, "nodeMessage", {
  enumerable: !0,
  configurable: !0,
  writable: !0,
  value: /nonce too low|transaction already imported|already known/
});
class cs extends I {
  constructor({ cause: t, nonce: n } = {}) {
    super(`Nonce provided for the transaction ${n ? `(${n}) ` : ""}exceeds the maximum allowed nonce.`, { cause: t, name: "NonceMaxValueError" });
  }
}
Object.defineProperty(cs, "nodeMessage", {
  enumerable: !0,
  configurable: !0,
  writable: !0,
  value: /nonce has max value/
});
class us extends I {
  constructor({ cause: t } = {}) {
    super([
      "The total cost (gas * gas fee + value) of executing this transaction exceeds the balance of the account."
    ].join(`
`), {
      cause: t,
      metaMessages: [
        "This error could arise when the account does not have enough funds to:",
        " - pay for the total gas fee,",
        " - pay for the value to send.",
        " ",
        "The cost of the transaction is calculated as `gas * gas fee + value`, where:",
        " - `gas` is the amount of gas needed for transaction to execute,",
        " - `gas fee` is the gas fee,",
        " - `value` is the amount of ether to send to the recipient."
      ],
      name: "InsufficientFundsError"
    });
  }
}
Object.defineProperty(us, "nodeMessage", {
  enumerable: !0,
  configurable: !0,
  writable: !0,
  value: /insufficient funds|exceeds transaction sender account balance/
});
class fs extends I {
  constructor({ cause: t, gas: n } = {}) {
    super(`The amount of gas ${n ? `(${n}) ` : ""}provided for the transaction exceeds the limit allowed for the block.`, {
      cause: t,
      name: "IntrinsicGasTooHighError"
    });
  }
}
Object.defineProperty(fs, "nodeMessage", {
  enumerable: !0,
  configurable: !0,
  writable: !0,
  value: /intrinsic gas too high|gas limit reached/
});
class ds extends I {
  constructor({ cause: t, gas: n } = {}) {
    super(`The amount of gas ${n ? `(${n}) ` : ""}provided for the transaction is too low.`, {
      cause: t,
      name: "IntrinsicGasTooLowError"
    });
  }
}
Object.defineProperty(ds, "nodeMessage", {
  enumerable: !0,
  configurable: !0,
  writable: !0,
  value: /intrinsic gas too low/
});
class ls extends I {
  constructor({ cause: t }) {
    super("The transaction type is not supported for this chain.", {
      cause: t,
      name: "TransactionTypeNotSupportedError"
    });
  }
}
Object.defineProperty(ls, "nodeMessage", {
  enumerable: !0,
  configurable: !0,
  writable: !0,
  value: /transaction type not valid/
});
class vn extends I {
  constructor({ cause: t, maxPriorityFeePerGas: n, maxFeePerGas: r } = {}) {
    super([
      `The provided tip (\`maxPriorityFeePerGas\`${n ? ` = ${ce(n)} gwei` : ""}) cannot be higher than the fee cap (\`maxFeePerGas\`${r ? ` = ${ce(r)} gwei` : ""}).`
    ].join(`
`), {
      cause: t,
      name: "TipAboveFeeCapError"
    });
  }
}
Object.defineProperty(vn, "nodeMessage", {
  enumerable: !0,
  configurable: !0,
  writable: !0,
  value: /max priority fee per gas higher than max fee per gas|tip higher than fee cap/
});
class Nn extends I {
  constructor({ cause: t }) {
    super(`An error occurred while executing: ${t == null ? void 0 : t.shortMessage}`, {
      cause: t,
      name: "UnknownNodeError"
    });
  }
}
function cr(e, t) {
  const n = (e.details || "").toLowerCase(), r = e instanceof I ? e.walk((s) => (s == null ? void 0 : s.code) === vt.code) : e;
  return r instanceof I ? new vt({
    cause: e,
    message: r.details
  }) : vt.nodeMessage.test(n) ? new vt({
    cause: e,
    message: e.details
  }) : ft.nodeMessage.test(n) ? new ft({
    cause: e,
    maxFeePerGas: t == null ? void 0 : t.maxFeePerGas
  }) : os.nodeMessage.test(n) ? new os({
    cause: e,
    maxFeePerGas: t == null ? void 0 : t.maxFeePerGas
  }) : is.nodeMessage.test(n) ? new is({ cause: e, nonce: t == null ? void 0 : t.nonce }) : as.nodeMessage.test(n) ? new as({ cause: e, nonce: t == null ? void 0 : t.nonce }) : cs.nodeMessage.test(n) ? new cs({ cause: e, nonce: t == null ? void 0 : t.nonce }) : us.nodeMessage.test(n) ? new us({ cause: e }) : fs.nodeMessage.test(n) ? new fs({ cause: e, gas: t == null ? void 0 : t.gas }) : ds.nodeMessage.test(n) ? new ds({ cause: e, gas: t == null ? void 0 : t.gas }) : ls.nodeMessage.test(n) ? new ls({ cause: e }) : vn.nodeMessage.test(n) ? new vn({
    cause: e,
    maxFeePerGas: t == null ? void 0 : t.maxFeePerGas,
    maxPriorityFeePerGas: t == null ? void 0 : t.maxPriorityFeePerGas
  }) : new Nn({
    cause: e
  });
}
function Df(e, { docsPath: t, ...n }) {
  const r = (() => {
    const s = cr(e, n);
    return s instanceof Nn ? e : s;
  })();
  return new Gf(r, {
    docsPath: t,
    ...n
  });
}
function Ut(e, { format: t }) {
  if (!t)
    return {};
  const n = {};
  function r(o) {
    const i = Object.keys(o);
    for (const a of i)
      a in e && (n[a] = e[a]), o[a] && typeof o[a] == "object" && !Array.isArray(o[a]) && r(o[a]);
  }
  const s = t(e || {});
  return r(s), n;
}
function Gs(e, t) {
  return ({ exclude: n, format: r }) => ({
    exclude: n,
    format: (s, o) => {
      const i = t(s, o);
      if (n)
        for (const a of n)
          delete i[a];
      return {
        ...i,
        ...r(s, o)
      };
    },
    type: e
  });
}
const Hf = {
  legacy: "0x0",
  eip2930: "0x1",
  eip1559: "0x2",
  eip4844: "0x3",
  eip7702: "0x4"
};
function Je(e, t) {
  const n = {};
  return typeof e.authorizationList < "u" && (n.authorizationList = qf(e.authorizationList)), typeof e.accessList < "u" && (n.accessList = e.accessList), typeof e.blobVersionedHashes < "u" && (n.blobVersionedHashes = e.blobVersionedHashes), typeof e.blobs < "u" && (typeof e.blobs[0] != "string" ? n.blobs = e.blobs.map((r) => V(r)) : n.blobs = e.blobs), typeof e.data < "u" && (n.data = e.data), e.account && (n.from = e.account.address), typeof e.from < "u" && (n.from = e.from), typeof e.gas < "u" && (n.gas = N(e.gas)), typeof e.gasPrice < "u" && (n.gasPrice = N(e.gasPrice)), typeof e.maxFeePerBlobGas < "u" && (n.maxFeePerBlobGas = N(e.maxFeePerBlobGas)), typeof e.maxFeePerGas < "u" && (n.maxFeePerGas = N(e.maxFeePerGas)), typeof e.maxPriorityFeePerGas < "u" && (n.maxPriorityFeePerGas = N(e.maxPriorityFeePerGas)), typeof e.nonce < "u" && (n.nonce = N(e.nonce)), typeof e.to < "u" && (n.to = e.to), typeof e.type < "u" && (n.type = Hf[e.type]), typeof e.value < "u" && (n.value = N(e.value)), n;
}
function qf(e) {
  return e.map((t) => ({
    address: t.address,
    r: t.r ? N(BigInt(t.r)) : t.r,
    s: t.s ? N(BigInt(t.s)) : t.s,
    chainId: N(t.chainId),
    nonce: N(t.nonce),
    ...typeof t.yParity < "u" ? { yParity: N(t.yParity) } : {},
    ...typeof t.v < "u" && typeof t.yParity > "u" ? { v: N(t.v) } : {}
  }));
}
function Jo(e) {
  if (!(!e || e.length === 0))
    return e.reduce((t, { slot: n, value: r }) => {
      if (n.length !== 66)
        throw new Ro({
          size: n.length,
          targetSize: 66,
          type: "hex"
        });
      if (r.length !== 66)
        throw new Ro({
          size: r.length,
          targetSize: 66,
          type: "hex"
        });
      return t[n] = r, t;
    }, {});
}
function Vf(e) {
  const { balance: t, nonce: n, state: r, stateDiff: s, code: o } = e, i = {};
  if (o !== void 0 && (i.code = o), t !== void 0 && (i.balance = N(t)), n !== void 0 && (i.nonce = N(n)), r !== void 0 && (i.state = Jo(r)), s !== void 0) {
    if (i.state)
      throw new Af();
    i.stateDiff = Jo(s);
  }
  return i;
}
function Ds(e) {
  if (!e)
    return;
  const t = {};
  for (const { address: n, ...r } of e) {
    if (!J(n, { strict: !1 }))
      throw new se({ address: n });
    if (t[n])
      throw new Pf({ address: n });
    t[n] = Vf(r);
  }
  return t;
}
const ur = 2n ** 256n - 1n;
function Ge(e) {
  const { account: t, maxFeePerGas: n, maxPriorityFeePerGas: r, to: s } = e, o = t ? H(t) : void 0;
  if (o && !J(o.address))
    throw new se({ address: o.address });
  if (s && !J(s))
    throw new se({ address: s });
  if (n && n > ur)
    throw new ft({ maxFeePerGas: n });
  if (r && n && r > n)
    throw new vn({ maxFeePerGas: n, maxPriorityFeePerGas: r });
}
class wa extends I {
  constructor() {
    super("`baseFeeMultiplier` must be greater than 1.", {
      name: "BaseFeeScalarError"
    });
  }
}
class Hs extends I {
  constructor() {
    super("Chain does not support EIP-1559 fees.", {
      name: "Eip1559FeesNotSupportedError"
    });
  }
}
class Wf extends I {
  constructor({ maxPriorityFeePerGas: t }) {
    super(`\`maxFeePerGas\` cannot be less than the \`maxPriorityFeePerGas\` (${ce(t)} gwei).`, { name: "MaxFeePerGasTooLowError" });
  }
}
class xa extends I {
  constructor({ blockHash: t, blockNumber: n }) {
    let r = "Block";
    t && (r = `Block at hash "${t}"`), n && (r = `Block at number "${n}"`), super(`${r} could not be found.`, { name: "BlockNotFoundError" });
  }
}
const va = {
  "0x0": "legacy",
  "0x1": "eip2930",
  "0x2": "eip1559",
  "0x3": "eip4844",
  "0x4": "eip7702"
};
function Fn(e, t) {
  const n = {
    ...e,
    blockHash: e.blockHash ? e.blockHash : null,
    blockNumber: e.blockNumber ? BigInt(e.blockNumber) : null,
    chainId: e.chainId ? ge(e.chainId) : void 0,
    gas: e.gas ? BigInt(e.gas) : void 0,
    gasPrice: e.gasPrice ? BigInt(e.gasPrice) : void 0,
    maxFeePerBlobGas: e.maxFeePerBlobGas ? BigInt(e.maxFeePerBlobGas) : void 0,
    maxFeePerGas: e.maxFeePerGas ? BigInt(e.maxFeePerGas) : void 0,
    maxPriorityFeePerGas: e.maxPriorityFeePerGas ? BigInt(e.maxPriorityFeePerGas) : void 0,
    nonce: e.nonce ? ge(e.nonce) : void 0,
    to: e.to ? e.to : null,
    transactionIndex: e.transactionIndex ? Number(e.transactionIndex) : null,
    type: e.type ? va[e.type] : void 0,
    typeHex: e.type ? e.type : void 0,
    value: e.value ? BigInt(e.value) : void 0,
    v: e.v ? BigInt(e.v) : void 0
  };
  return e.authorizationList && (n.authorizationList = Kf(e.authorizationList)), n.yParity = (() => {
    if (e.yParity)
      return Number(e.yParity);
    if (typeof n.v == "bigint") {
      if (n.v === 0n || n.v === 27n)
        return 0;
      if (n.v === 1n || n.v === 28n)
        return 1;
      if (n.v >= 35n)
        return n.v % 2n === 0n ? 1 : 0;
    }
  })(), n.type === "legacy" && (delete n.accessList, delete n.maxFeePerBlobGas, delete n.maxFeePerGas, delete n.maxPriorityFeePerGas, delete n.yParity), n.type === "eip2930" && (delete n.maxFeePerBlobGas, delete n.maxFeePerGas, delete n.maxPriorityFeePerGas), n.type === "eip1559" && delete n.maxFeePerBlobGas, n;
}
const Zf = /* @__PURE__ */ Gs("transaction", Fn);
function Kf(e) {
  return e.map((t) => ({
    address: t.address,
    chainId: Number(t.chainId),
    nonce: Number(t.nonce),
    r: t.r,
    s: t.s,
    yParity: Number(t.yParity)
  }));
}
function qs(e, t) {
  const n = (e.transactions ?? []).map((r) => typeof r == "string" ? r : Fn(r));
  return {
    ...e,
    baseFeePerGas: e.baseFeePerGas ? BigInt(e.baseFeePerGas) : null,
    blobGasUsed: e.blobGasUsed ? BigInt(e.blobGasUsed) : void 0,
    difficulty: e.difficulty ? BigInt(e.difficulty) : void 0,
    excessBlobGas: e.excessBlobGas ? BigInt(e.excessBlobGas) : void 0,
    gasLimit: e.gasLimit ? BigInt(e.gasLimit) : void 0,
    gasUsed: e.gasUsed ? BigInt(e.gasUsed) : void 0,
    hash: e.hash ? e.hash : null,
    logsBloom: e.logsBloom ? e.logsBloom : null,
    nonce: e.nonce ? e.nonce : null,
    number: e.number ? BigInt(e.number) : null,
    size: e.size ? BigInt(e.size) : void 0,
    timestamp: e.timestamp ? BigInt(e.timestamp) : void 0,
    transactions: n,
    totalDifficulty: e.totalDifficulty ? BigInt(e.totalDifficulty) : null
  };
}
const Jf = /* @__PURE__ */ Gs("block", qs);
async function xe(e, { blockHash: t, blockNumber: n, blockTag: r = e.experimental_blockTag ?? "latest", includeTransactions: s } = {}) {
  var u, f, d;
  const o = s ?? !1, i = n !== void 0 ? N(n) : void 0;
  let a = null;
  if (t ? a = await e.request({
    method: "eth_getBlockByHash",
    params: [t, o]
  }, { dedupe: !0 }) : a = await e.request({
    method: "eth_getBlockByNumber",
    params: [i || r, o]
  }, { dedupe: !!i }), !a)
    throw new xa({ blockHash: t, blockNumber: n });
  return (((d = (f = (u = e.chain) == null ? void 0 : u.formatters) == null ? void 0 : f.block) == null ? void 0 : d.format) || qs)(a, "getBlock");
}
async function Vs(e) {
  const t = await e.request({
    method: "eth_gasPrice"
  });
  return BigInt(t);
}
async function Yf(e, t) {
  return Ea(e, t);
}
async function Ea(e, t) {
  var o, i;
  const { block: n, chain: r = e.chain, request: s } = t || {};
  try {
    const a = ((o = r == null ? void 0 : r.fees) == null ? void 0 : o.maxPriorityFeePerGas) ?? ((i = r == null ? void 0 : r.fees) == null ? void 0 : i.defaultPriorityFee);
    if (typeof a == "function") {
      const u = n || await M(e, xe, "getBlock")({}), f = await a({
        block: u,
        client: e,
        request: s
      });
      if (f === null)
        throw new Error();
      return f;
    }
    if (typeof a < "u")
      return a;
    const c = await e.request({
      method: "eth_maxPriorityFeePerGas"
    });
    return X(c);
  } catch {
    const [a, c] = await Promise.all([
      n ? Promise.resolve(n) : M(e, xe, "getBlock")({}),
      M(e, Vs, "getGasPrice")({})
    ]);
    if (typeof a.baseFeePerGas != "bigint")
      throw new Hs();
    const u = c - a.baseFeePerGas;
    return u < 0n ? 0n : u;
  }
}
async function Xf(e, t) {
  return hs(e, t);
}
async function hs(e, t) {
  var l, h;
  const { block: n, chain: r = e.chain, request: s, type: o = "eip1559" } = t || {}, i = await (async () => {
    var p, b;
    return typeof ((p = r == null ? void 0 : r.fees) == null ? void 0 : p.baseFeeMultiplier) == "function" ? r.fees.baseFeeMultiplier({
      block: n,
      client: e,
      request: s
    }) : ((b = r == null ? void 0 : r.fees) == null ? void 0 : b.baseFeeMultiplier) ?? 1.2;
  })();
  if (i < 1)
    throw new wa();
  const c = 10 ** (((l = i.toString().split(".")[1]) == null ? void 0 : l.length) ?? 0), u = (p) => p * BigInt(Math.ceil(i * c)) / BigInt(c), f = n || await M(e, xe, "getBlock")({});
  if (typeof ((h = r == null ? void 0 : r.fees) == null ? void 0 : h.estimateFeesPerGas) == "function") {
    const p = await r.fees.estimateFeesPerGas({
      block: n,
      client: e,
      multiply: u,
      request: s,
      type: o
    });
    if (p !== null)
      return p;
  }
  if (o === "eip1559") {
    if (typeof f.baseFeePerGas != "bigint")
      throw new Hs();
    const p = typeof (s == null ? void 0 : s.maxPriorityFeePerGas) == "bigint" ? s.maxPriorityFeePerGas : await Ea(e, {
      block: f,
      chain: r,
      request: s
    }), b = u(f.baseFeePerGas);
    return {
      maxFeePerGas: (s == null ? void 0 : s.maxFeePerGas) ?? b + p,
      maxPriorityFeePerGas: p
    };
  }
  return {
    gasPrice: (s == null ? void 0 : s.gasPrice) ?? u(await M(e, Vs, "getGasPrice")({}))
  };
}
async function Ws(e, { address: t, blockTag: n = "latest", blockNumber: r }) {
  const s = await e.request({
    method: "eth_getTransactionCount",
    params: [
      t,
      typeof r == "bigint" ? N(r) : n
    ]
  }, {
    dedupe: !!r
  });
  return ge(s);
}
function Zs(e) {
  const { kzg: t } = e, n = e.to ?? (typeof e.blobs[0] == "string" ? "hex" : "bytes"), r = typeof e.blobs[0] == "string" ? e.blobs.map((o) => Ce(o)) : e.blobs, s = [];
  for (const o of r)
    s.push(Uint8Array.from(t.blobToKzgCommitment(o)));
  return n === "bytes" ? s : s.map((o) => V(o));
}
function Ks(e) {
  const { kzg: t } = e, n = e.to ?? (typeof e.blobs[0] == "string" ? "hex" : "bytes"), r = typeof e.blobs[0] == "string" ? e.blobs.map((i) => Ce(i)) : e.blobs, s = typeof e.commitments[0] == "string" ? e.commitments.map((i) => Ce(i)) : e.commitments, o = [];
  for (let i = 0; i < r.length; i++) {
    const a = r[i], c = s[i];
    o.push(Uint8Array.from(t.computeBlobKzgProof(a, c)));
  }
  return n === "bytes" ? o : o.map((i) => V(i));
}
function Qf(e, t, n, r) {
  if (typeof e.setBigUint64 == "function")
    return e.setBigUint64(t, n, r);
  const s = BigInt(32), o = BigInt(4294967295), i = Number(n >> s & o), a = Number(n & o), c = r ? 4 : 0, u = r ? 0 : 4;
  e.setUint32(t + c, i, r), e.setUint32(t + u, a, r);
}
function ed(e, t, n) {
  return e & t ^ ~e & n;
}
function td(e, t, n) {
  return e & t ^ e & n ^ t & n;
}
class nd extends Fs {
  constructor(t, n, r, s) {
    super(), this.finished = !1, this.length = 0, this.pos = 0, this.destroyed = !1, this.blockLen = t, this.outputLen = n, this.padOffset = r, this.isLE = s, this.buffer = new Uint8Array(t), this.view = Sr(this.buffer);
  }
  update(t) {
    Ct(this), t = rr(t), at(t);
    const { view: n, buffer: r, blockLen: s } = this, o = t.length;
    for (let i = 0; i < o; ) {
      const a = Math.min(s - this.pos, o - i);
      if (a === s) {
        const c = Sr(t);
        for (; s <= o - i; i += s)
          this.process(c, i);
        continue;
      }
      r.set(t.subarray(i, i + a), this.pos), this.pos += a, i += a, this.pos === s && (this.process(n, 0), this.pos = 0);
    }
    return this.length += t.length, this.roundClean(), this;
  }
  digestInto(t) {
    Ct(this), Zi(t, this), this.finished = !0;
    const { buffer: n, view: r, blockLen: s, isLE: o } = this;
    let { pos: i } = this;
    n[i++] = 128, kt(this.buffer.subarray(i)), this.padOffset > s - i && (this.process(r, 0), i = 0);
    for (let d = i; d < s; d++)
      n[d] = 0;
    Qf(r, s - 8, BigInt(this.length * 8), o), this.process(r, 0);
    const a = Sr(t), c = this.outputLen;
    if (c % 4)
      throw new Error("_sha2: outputLen should be aligned to 32bit");
    const u = c / 4, f = this.get();
    if (u > f.length)
      throw new Error("_sha2: outputLen bigger than state");
    for (let d = 0; d < u; d++)
      a.setUint32(4 * d, f[d], o);
  }
  digest() {
    const { buffer: t, outputLen: n } = this;
    this.digestInto(t);
    const r = t.slice(0, n);
    return this.destroy(), r;
  }
  _cloneInto(t) {
    t || (t = new this.constructor()), t.set(...this.get());
    const { blockLen: n, buffer: r, length: s, finished: o, destroyed: i, pos: a } = this;
    return t.destroyed = i, t.finished = o, t.length = s, t.pos = a, s % n && t.buffer.set(r), t;
  }
  clone() {
    return this._cloneInto();
  }
}
const He = /* @__PURE__ */ Uint32Array.from([
  1779033703,
  3144134277,
  1013904242,
  2773480762,
  1359893119,
  2600822924,
  528734635,
  1541459225
]), rd = /* @__PURE__ */ Uint32Array.from([
  1116352408,
  1899447441,
  3049323471,
  3921009573,
  961987163,
  1508970993,
  2453635748,
  2870763221,
  3624381080,
  310598401,
  607225278,
  1426881987,
  1925078388,
  2162078206,
  2614888103,
  3248222580,
  3835390401,
  4022224774,
  264347078,
  604807628,
  770255983,
  1249150122,
  1555081692,
  1996064986,
  2554220882,
  2821834349,
  2952996808,
  3210313671,
  3336571891,
  3584528711,
  113926993,
  338241895,
  666307205,
  773529912,
  1294757372,
  1396182291,
  1695183700,
  1986661051,
  2177026350,
  2456956037,
  2730485921,
  2820302411,
  3259730800,
  3345764771,
  3516065817,
  3600352804,
  4094571909,
  275423344,
  430227734,
  506948616,
  659060556,
  883997877,
  958139571,
  1322822218,
  1537002063,
  1747873779,
  1955562222,
  2024104815,
  2227730452,
  2361852424,
  2428436474,
  2756734187,
  3204031479,
  3329325298
]), qe = /* @__PURE__ */ new Uint32Array(64);
class sd extends nd {
  constructor(t = 32) {
    super(64, t, 8, !1), this.A = He[0] | 0, this.B = He[1] | 0, this.C = He[2] | 0, this.D = He[3] | 0, this.E = He[4] | 0, this.F = He[5] | 0, this.G = He[6] | 0, this.H = He[7] | 0;
  }
  get() {
    const { A: t, B: n, C: r, D: s, E: o, F: i, G: a, H: c } = this;
    return [t, n, r, s, o, i, a, c];
  }
  // prettier-ignore
  set(t, n, r, s, o, i, a, c) {
    this.A = t | 0, this.B = n | 0, this.C = r | 0, this.D = s | 0, this.E = o | 0, this.F = i | 0, this.G = a | 0, this.H = c | 0;
  }
  process(t, n) {
    for (let d = 0; d < 16; d++, n += 4)
      qe[d] = t.getUint32(n, !1);
    for (let d = 16; d < 64; d++) {
      const l = qe[d - 15], h = qe[d - 2], p = Se(l, 7) ^ Se(l, 18) ^ l >>> 3, b = Se(h, 17) ^ Se(h, 19) ^ h >>> 10;
      qe[d] = b + qe[d - 7] + p + qe[d - 16] | 0;
    }
    let { A: r, B: s, C: o, D: i, E: a, F: c, G: u, H: f } = this;
    for (let d = 0; d < 64; d++) {
      const l = Se(a, 6) ^ Se(a, 11) ^ Se(a, 25), h = f + l + ed(a, c, u) + rd[d] + qe[d] | 0, b = (Se(r, 2) ^ Se(r, 13) ^ Se(r, 22)) + td(r, s, o) | 0;
      f = u, u = c, c = a, a = i + h | 0, i = o, o = s, s = r, r = h + b | 0;
    }
    r = r + this.A | 0, s = s + this.B | 0, o = o + this.C | 0, i = i + this.D | 0, a = a + this.E | 0, c = c + this.F | 0, u = u + this.G | 0, f = f + this.H | 0, this.set(r, s, o, i, a, c, u, f);
  }
  roundClean() {
    kt(qe);
  }
  destroy() {
    this.set(0, 0, 0, 0, 0, 0, 0, 0), kt(this.buffer);
  }
}
const Pa = /* @__PURE__ */ Ki(() => new sd()), od = Pa;
function id(e, t) {
  return od(Te(e, { strict: !1 }) ? _t(e) : e);
}
function ad(e) {
  const { commitment: t, version: n = 1 } = e, r = e.to ?? (typeof t == "string" ? "hex" : "bytes"), s = id(t);
  return s.set([n], 0), r === "bytes" ? s : V(s);
}
function Aa(e) {
  const { commitments: t, version: n } = e, r = e.to ?? (typeof t[0] == "string" ? "hex" : "bytes"), s = [];
  for (const o of t)
    s.push(ad({
      commitment: o,
      to: r,
      version: n
    }));
  return s;
}
const Yo = 6, $a = 32, Js = 4096, Ia = $a * Js, Xo = Ia * Yo - // terminator byte (0x80).
1 - // zero byte (0x00) appended to each field element.
1 * Js * Yo, Sa = 1;
class cd extends I {
  constructor({ maxSize: t, size: n }) {
    super("Blob size is too large.", {
      metaMessages: [`Max: ${t} bytes`, `Given: ${n} bytes`],
      name: "BlobSizeTooLargeError"
    });
  }
}
class Ba extends I {
  constructor() {
    super("Blob data must not be empty.", { name: "EmptyBlobError" });
  }
}
class ud extends I {
  constructor({ hash: t, size: n }) {
    super(`Versioned hash "${t}" size is invalid.`, {
      metaMessages: ["Expected: 32", `Received: ${n}`],
      name: "InvalidVersionedHashSizeError"
    });
  }
}
class fd extends I {
  constructor({ hash: t, version: n }) {
    super(`Versioned hash "${t}" version is invalid.`, {
      metaMessages: [
        `Expected: ${Sa}`,
        `Received: ${n}`
      ],
      name: "InvalidVersionedHashVersionError"
    });
  }
}
function dd(e) {
  const t = e.to ?? (typeof e.data == "string" ? "hex" : "bytes"), n = typeof e.data == "string" ? Ce(e.data) : e.data, r = D(n);
  if (!r)
    throw new Ba();
  if (r > Xo)
    throw new cd({
      maxSize: Xo,
      size: r
    });
  const s = [];
  let o = !0, i = 0;
  for (; o; ) {
    const a = Ls(new Uint8Array(Ia));
    let c = 0;
    for (; c < Js; ) {
      const u = n.slice(i, i + ($a - 1));
      if (a.pushByte(0), a.pushBytes(u), u.length < 31) {
        a.pushByte(128), o = !1;
        break;
      }
      c++, i += 31;
    }
    s.push(a);
  }
  return t === "bytes" ? s.map((a) => a.bytes) : s.map((a) => V(a.bytes));
}
function Ta(e) {
  const { data: t, kzg: n, to: r } = e, s = e.blobs ?? dd({ data: t, to: r }), o = e.commitments ?? Zs({ blobs: s, kzg: n, to: r }), i = e.proofs ?? Ks({ blobs: s, commitments: o, kzg: n, to: r }), a = [];
  for (let c = 0; c < s.length; c++)
    a.push({
      blob: s[c],
      commitment: o[c],
      proof: i[c]
    });
  return a;
}
function Ca(e) {
  if (e.type)
    return e.type;
  if (typeof e.authorizationList < "u")
    return "eip7702";
  if (typeof e.blobs < "u" || typeof e.blobVersionedHashes < "u" || typeof e.maxFeePerBlobGas < "u" || typeof e.sidecars < "u")
    return "eip4844";
  if (typeof e.maxFeePerGas < "u" || typeof e.maxPriorityFeePerGas < "u")
    return "eip1559";
  if (typeof e.gasPrice < "u")
    return typeof e.accessList < "u" ? "eip2930" : "legacy";
  throw new Sf({ transaction: e });
}
function fr(e, { docsPath: t, ...n }) {
  const r = (() => {
    const s = cr(e, n);
    return s instanceof Nn ? e : s;
  })();
  return new Tf(r, {
    docsPath: t,
    ...n
  });
}
async function Ye(e) {
  const t = await e.request({
    method: "eth_chainId"
  }, { dedupe: !0 });
  return ge(t);
}
async function Ys(e, t) {
  var A, C, z, S, F;
  const { account: n = e.account, accessList: r, authorizationList: s, chain: o = e.chain, blobVersionedHashes: i, blobs: a, data: c, gas: u, gasPrice: f, maxFeePerBlobGas: d, maxFeePerGas: l, maxPriorityFeePerGas: h, nonce: p, nonceManager: b, to: x, type: g, value: w, ...m } = t, y = await (async () => {
    if (!n || !b || typeof p < "u")
      return p;
    const k = H(n), _ = o ? o.id : await M(e, Ye, "getChainId")({});
    return await b.consume({
      address: k.address,
      chainId: _,
      client: e
    });
  })();
  Ge(t);
  const E = (C = (A = o == null ? void 0 : o.formatters) == null ? void 0 : A.transactionRequest) == null ? void 0 : C.format, P = (E || Je)({
    // Pick out extra data that might exist on the chain's transaction request type.
    ...Ut(m, { format: E }),
    account: n ? H(n) : void 0,
    accessList: r,
    authorizationList: s,
    blobs: a,
    blobVersionedHashes: i,
    data: c,
    gas: u,
    gasPrice: f,
    maxFeePerBlobGas: d,
    maxFeePerGas: l,
    maxPriorityFeePerGas: h,
    nonce: y,
    to: x,
    type: g,
    value: w
  }, "fillTransaction");
  try {
    const k = await e.request({
      method: "eth_fillTransaction",
      params: [P]
    }), v = (((S = (z = o == null ? void 0 : o.formatters) == null ? void 0 : z.transaction) == null ? void 0 : S.format) || Fn)(k.tx);
    delete v.blockHash, delete v.blockNumber, delete v.r, delete v.s, delete v.transactionIndex, delete v.v, delete v.yParity, v.data = v.input, v.gas && (v.gas = t.gas ?? v.gas), v.gasPrice && (v.gasPrice = t.gasPrice ?? v.gasPrice), v.maxFeePerBlobGas && (v.maxFeePerBlobGas = t.maxFeePerBlobGas ?? v.maxFeePerBlobGas), v.maxFeePerGas && (v.maxFeePerGas = t.maxFeePerGas ?? v.maxFeePerGas), v.maxPriorityFeePerGas && (v.maxPriorityFeePerGas = t.maxPriorityFeePerGas ?? v.maxPriorityFeePerGas), v.nonce && (v.nonce = t.nonce ?? v.nonce);
    const T = await (async () => {
      var L, U;
      if (typeof ((L = o == null ? void 0 : o.fees) == null ? void 0 : L.baseFeeMultiplier) == "function") {
        const G = await M(e, xe, "getBlock")({});
        return o.fees.baseFeeMultiplier({
          block: G,
          client: e,
          request: t
        });
      }
      return ((U = o == null ? void 0 : o.fees) == null ? void 0 : U.baseFeeMultiplier) ?? 1.2;
    })();
    if (T < 1)
      throw new wa();
    const B = 10 ** (((F = T.toString().split(".")[1]) == null ? void 0 : F.length) ?? 0), R = (L) => L * BigInt(Math.ceil(T * B)) / BigInt(B);
    return v.feePayerSignature || (v.maxFeePerGas && !t.maxFeePerGas && (v.maxFeePerGas = R(v.maxFeePerGas)), v.gasPrice && !t.gasPrice && (v.gasPrice = R(v.gasPrice))), {
      raw: k.raw,
      transaction: {
        from: P.from,
        ...v
      },
      ...k.capabilities ? { capabilities: k.capabilities } : {}
    };
  } catch (k) {
    throw fr(k, {
      ...t,
      chain: e.chain
    });
  }
}
const Xs = [
  "blobVersionedHashes",
  "chainId",
  "fees",
  "gas",
  "nonce",
  "type"
], Qo = /* @__PURE__ */ new Map(), Cr = /* @__PURE__ */ new jt(128);
async function On(e, t) {
  var y, E, $;
  let n = t;
  n.account ?? (n.account = e.account), n.parameters ?? (n.parameters = Xs);
  const { account: r, chain: s = e.chain, nonceManager: o, parameters: i } = n, a = (() => {
    if (typeof (s == null ? void 0 : s.prepareTransactionRequest) == "function")
      return {
        fn: s.prepareTransactionRequest,
        runAt: ["beforeFillTransaction"]
      };
    if (Array.isArray(s == null ? void 0 : s.prepareTransactionRequest))
      return {
        fn: s.prepareTransactionRequest[0],
        runAt: s.prepareTransactionRequest[1].runAt
      };
  })();
  let c;
  async function u() {
    return c || (typeof n.chainId < "u" ? n.chainId : s ? s.id : (c = await M(e, Ye, "getChainId")({}), c));
  }
  const f = r && H(r);
  let d = n.nonce;
  if (i.includes("nonce") && typeof d > "u" && f && o) {
    const P = await u();
    d = await o.consume({
      address: f.address,
      chainId: P,
      client: e
    });
  }
  a != null && a.fn && ((y = a.runAt) != null && y.includes("beforeFillTransaction")) && (n = await a.fn({ ...n, chain: s }, {
    phase: "beforeFillTransaction"
  }), d ?? (d = n.nonce));
  const h = ((i.includes("blobVersionedHashes") || i.includes("sidecars")) && n.kzg && n.blobs || Cr.get(e.uid) === !1 || !["fees", "gas"].some((A) => i.includes(A)) ? !1 : !!(i.includes("chainId") && typeof n.chainId != "number" || i.includes("nonce") && typeof d != "number" || i.includes("fees") && typeof n.gasPrice != "bigint" && (typeof n.maxFeePerGas != "bigint" || typeof n.maxPriorityFeePerGas != "bigint") || i.includes("gas") && typeof n.gas != "bigint")) ? await M(e, Ys, "fillTransaction")({ ...n, nonce: d }).then((P) => {
    const { chainId: A, from: C, gas: z, gasPrice: S, nonce: F, maxFeePerBlobGas: k, maxFeePerGas: _, maxPriorityFeePerGas: v, type: T, ...O } = P.transaction;
    return Cr.set(e.uid, !0), {
      ...n,
      ...C ? { from: C } : {},
      ...T && !n.type ? { type: T } : {},
      ...typeof A < "u" ? { chainId: A } : {},
      ...typeof z < "u" ? { gas: z } : {},
      ...typeof S < "u" ? { gasPrice: S } : {},
      ...typeof F < "u" ? { nonce: F } : {},
      ...typeof k < "u" && n.type !== "legacy" && n.type !== "eip2930" ? { maxFeePerBlobGas: k } : {},
      ...typeof _ < "u" && n.type !== "legacy" && n.type !== "eip2930" ? { maxFeePerGas: _ } : {},
      ...typeof v < "u" && n.type !== "legacy" && n.type !== "eip2930" ? { maxPriorityFeePerGas: v } : {},
      ..."nonceKey" in O && typeof O.nonceKey < "u" ? { nonceKey: O.nonceKey } : {},
      ..."keyAuthorization" in O && typeof O.keyAuthorization < "u" && O.keyAuthorization !== null && !("keyAuthorization" in n) ? { keyAuthorization: O.keyAuthorization } : {},
      ..."feePayerSignature" in O && typeof O.feePayerSignature < "u" && O.feePayerSignature !== null ? { feePayerSignature: O.feePayerSignature } : {},
      ..."feeToken" in O && typeof O.feeToken < "u" && O.feeToken !== null && !("feeToken" in n) ? { feeToken: O.feeToken } : {},
      ...P.capabilities ? { _capabilities: P.capabilities } : {}
    };
  }).catch((P) => {
    var S, F;
    const A = P;
    if (A.name !== "TransactionExecutionError")
      return n;
    if ((S = A.walk) == null ? void 0 : S.call(A, (k) => k.name === "ExecutionRevertedError"))
      throw P;
    return ((F = A.walk) == null ? void 0 : F.call(A, (k) => {
      var v;
      const _ = k;
      return _.name === "MethodNotFoundRpcError" || _.name === "MethodNotSupportedRpcError" || ((v = _.message) == null ? void 0 : v.includes("eth_fillTransaction is not available"));
    })) && Cr.set(e.uid, !1), n;
  }) : n;
  d ?? (d = h.nonce), n = {
    ...h,
    ...f ? { from: f == null ? void 0 : f.address } : {},
    ...d ? { nonce: d } : {}
  };
  const { blobs: p, gas: b, kzg: x, type: g } = n;
  a != null && a.fn && ((E = a.runAt) != null && E.includes("beforeFillParameters")) && (n = await a.fn({ ...n, chain: s }, {
    phase: "beforeFillParameters"
  }));
  let w;
  async function m() {
    return w || (w = await M(e, xe, "getBlock")({ blockTag: "latest" }), w);
  }
  if (i.includes("nonce") && typeof d > "u" && f && !o && (n.nonce = await M(e, Ws, "getTransactionCount")({
    address: f.address,
    blockTag: "pending"
  })), (i.includes("blobVersionedHashes") || i.includes("sidecars")) && p && x) {
    const P = Zs({ blobs: p, kzg: x });
    if (i.includes("blobVersionedHashes")) {
      const A = Aa({
        commitments: P,
        to: "hex"
      });
      n.blobVersionedHashes = A;
    }
    if (i.includes("sidecars")) {
      const A = Ks({ blobs: p, commitments: P, kzg: x }), C = Ta({
        blobs: p,
        commitments: P,
        proofs: A,
        to: "hex"
      });
      n.sidecars = C;
    }
  }
  if (i.includes("chainId") && (n.chainId = await u()), (i.includes("fees") || i.includes("type")) && typeof g > "u")
    try {
      n.type = Ca(n);
    } catch {
      let P = Qo.get(e.uid);
      if (typeof P > "u") {
        const A = await m();
        P = typeof (A == null ? void 0 : A.baseFeePerGas) == "bigint", Qo.set(e.uid, P);
      }
      n.type = P ? "eip1559" : "legacy";
    }
  if (i.includes("fees"))
    if (n.type !== "legacy" && n.type !== "eip2930") {
      if (typeof n.maxFeePerGas > "u" || typeof n.maxPriorityFeePerGas > "u") {
        const P = await m(), { maxFeePerGas: A, maxPriorityFeePerGas: C } = await hs(e, {
          block: P,
          chain: s,
          request: n
        });
        if (typeof n.maxPriorityFeePerGas > "u" && n.maxFeePerGas && n.maxFeePerGas < C)
          throw new Wf({
            maxPriorityFeePerGas: C
          });
        n.maxPriorityFeePerGas = C, n.maxFeePerGas = A;
      }
    } else {
      if (typeof n.maxFeePerGas < "u" || typeof n.maxPriorityFeePerGas < "u")
        throw new Hs();
      if (typeof n.gasPrice > "u") {
        const P = await m(), { gasPrice: A } = await hs(e, {
          block: P,
          chain: s,
          request: n,
          type: "legacy"
        });
        n.gasPrice = A;
      }
    }
  return i.includes("gas") && typeof b > "u" && (n.gas = await M(e, Qs, "estimateGas")({
    ...n,
    account: f,
    prepare: (f == null ? void 0 : f.type) === "local" ? [] : ["blobVersionedHashes"]
  })), a != null && a.fn && (($ = a.runAt) != null && $.includes("afterFillParameters")) && (n = await a.fn({ ...n, chain: s }, {
    phase: "afterFillParameters"
  })), Ge(n), delete n.parameters, n;
}
async function Qs(e, t) {
  var i, a, c;
  const { account: n = e.account, prepare: r = !0 } = t, s = n ? H(n) : void 0, o = (() => {
    if (Array.isArray(r))
      return r;
    if ((s == null ? void 0 : s.type) !== "local")
      return ["blobVersionedHashes"];
  })();
  try {
    const u = await (async () => {
      if (t.to)
        return t.to;
      if (t.authorizationList && t.authorizationList.length > 0)
        return await ar({
          authorization: t.authorizationList[0]
        }).catch(() => {
          throw new I("`to` is required. Could not infer from `authorizationList`");
        });
    })(), { accessList: f, authorizationList: d, blobs: l, blobVersionedHashes: h, blockNumber: p, blockTag: b, data: x, gas: g, gasPrice: w, maxFeePerBlobGas: m, maxFeePerGas: y, maxPriorityFeePerGas: E, nonce: $, value: P, stateOverride: A, ...C } = r ? await On(e, {
      ...t,
      parameters: o,
      to: u
    }) : t;
    if (g && t.gas !== g)
      return g;
    const S = (typeof p == "bigint" ? N(p) : void 0) || b, F = Ds(A);
    Ge(t);
    const k = (c = (a = (i = e.chain) == null ? void 0 : i.formatters) == null ? void 0 : a.transactionRequest) == null ? void 0 : c.format, v = (k || Je)({
      // Pick out extra data that might exist on the chain's transaction request type.
      ...Ut(C, { format: k }),
      account: s,
      accessList: f,
      authorizationList: d,
      blobs: l,
      blobVersionedHashes: h,
      data: x,
      gasPrice: w,
      maxFeePerBlobGas: m,
      maxFeePerGas: y,
      maxPriorityFeePerGas: E,
      nonce: $,
      to: u,
      value: P
    }, "estimateGas");
    return BigInt(await e.request({
      method: "eth_estimateGas",
      params: F ? [
        v,
        S ?? e.experimental_blockTag ?? "latest",
        F
      ] : S ? [v, S] : [v]
    }));
  } catch (u) {
    throw Df(u, {
      ...t,
      account: s,
      chain: e.chain
    });
  }
}
async function ld(e, t) {
  var u;
  const { abi: n, address: r, args: s, functionName: o, dataSuffix: i = typeof e.dataSuffix == "string" ? e.dataSuffix : (u = e.dataSuffix) == null ? void 0 : u.value, ...a } = t, c = fe({
    abi: n,
    args: s,
    functionName: o
  });
  try {
    return await M(e, Qs, "estimateGas")({
      data: `${c}${i ? i.replace("0x", "") : ""}`,
      to: r,
      ...a
    });
  } catch (f) {
    const d = a.account ? H(a.account) : void 0;
    throw ut(f, {
      abi: n,
      address: r,
      args: s,
      docsPath: "/docs/contract/estimateContractGas",
      functionName: o,
      sender: d == null ? void 0 : d.address
    });
  }
}
function zt(e, t) {
  if (!J(e, { strict: !1 }))
    throw new se({ address: e });
  if (!J(t, { strict: !1 }))
    throw new se({ address: t });
  return e.toLowerCase() === t.toLowerCase();
}
function ke(e, { args: t, eventName: n } = {}) {
  return {
    ...e,
    blockHash: e.blockHash ? e.blockHash : null,
    blockNumber: e.blockNumber ? BigInt(e.blockNumber) : null,
    blockTimestamp: e.blockTimestamp ? BigInt(e.blockTimestamp) : e.blockTimestamp === null ? null : void 0,
    logIndex: e.logIndex ? Number(e.logIndex) : null,
    transactionHash: e.transactionHash ? e.transactionHash : null,
    transactionIndex: e.transactionIndex ? Number(e.transactionIndex) : null,
    ...n ? { args: t, eventName: n } : {}
  };
}
const ei = "/docs/contract/decodeEventLog";
function Kn(e) {
  const { abi: t, data: n, strict: r, topics: s } = e, o = r ?? !0, [i, ...a] = s;
  if (!i)
    throw new e0({ docsPath: ei });
  const c = t.find((g) => g.type === "event" && i === sr(ve(g)));
  if (!(c && "name" in c) || c.type !== "event")
    throw new t0(i, { docsPath: ei });
  const { name: u, inputs: f } = c, d = f == null ? void 0 : f.some((g) => !("name" in g && g.name)), l = d ? [] : {}, h = f.map((g, w) => [g, w]).filter(([g]) => "indexed" in g && g.indexed), p = [];
  for (let g = 0; g < h.length; g++) {
    const [w, m] = h[g], y = a[g];
    if (!y) {
      if (o)
        throw new ks({
          abiItem: c,
          param: w
        });
      p.push([w, m]);
      continue;
    }
    l[d ? m : w.name || m] = hd({
      param: w,
      value: y
    });
  }
  const b = f.filter((g) => !("indexed" in g && g.indexed)), x = o ? b : [...p.map(([g]) => g), ...b];
  if (x.length > 0) {
    if (n && n !== "0x")
      try {
        const g = Cn(x, n);
        if (g) {
          let w = 0;
          if (!o)
            for (const [m, y] of p)
              l[d ? y : m.name || y] = g[w++];
          if (d)
            for (let m = 0; m < f.length; m++)
              l[m] === void 0 && w < g.length && (l[m] = g[w++]);
          else
            for (let m = 0; m < b.length; m++)
              l[b[m].name] = g[w++];
        }
      } catch (g) {
        if (o)
          throw g instanceof Ui || g instanceof ua ? new Zn({
            abiItem: c,
            data: n,
            params: x,
            size: D(n)
          }) : g;
      }
    else if (o)
      throw new Zn({
        abiItem: c,
        data: "0x",
        params: x,
        size: 0
      });
  }
  return {
    eventName: u,
    args: Object.values(l).length > 0 ? l : void 0
  };
}
function hd({ param: e, value: t }) {
  return e.type === "string" || e.type === "bytes" || e.type === "tuple" || e.type.match(/^(.*)\[(\d+)?\]$/) ? t : (Cn([e], t) || [])[0];
}
function eo(e) {
  const { abi: t, args: n, logs: r, strict: s = !0 } = e, o = (() => {
    if (e.eventName)
      return Array.isArray(e.eventName) ? e.eventName : [e.eventName];
  })(), i = t.filter((a) => a.type === "event").map((a) => ({
    abi: a,
    selector: sr(a)
  }));
  return r.map((a) => {
    var l;
    const c = typeof a.blockNumber == "string" ? ke(a) : a, u = i.filter((h) => c.topics[0] === h.selector);
    if (u.length === 0)
      return null;
    let f, d;
    for (const h of u)
      try {
        f = Kn({
          ...c,
          abi: [h.abi],
          strict: !0
        }), d = h;
        break;
      } catch {
      }
    if (!f && !s) {
      d = u[0];
      try {
        f = Kn({
          data: c.data,
          topics: c.topics,
          abi: [d.abi],
          strict: !1
        });
      } catch {
        const h = (l = d.abi.inputs) == null ? void 0 : l.some((p) => !("name" in p && p.name));
        return {
          ...c,
          args: h ? [] : {},
          eventName: d.abi.name
        };
      }
    }
    return !f || !d || o && !o.includes(f.eventName) || !pd({
      args: f.args,
      inputs: d.abi.inputs,
      matchArgs: n
    }) ? null : { ...f, ...c };
  }).filter(Boolean);
}
function pd(e) {
  const { args: t, inputs: n, matchArgs: r } = e;
  if (!r)
    return !0;
  if (!t)
    return !1;
  function s(o, i, a) {
    try {
      return o.type === "address" ? zt(i, a) : o.type === "string" || o.type === "bytes" ? Q(_t(i)) === a : i === a;
    } catch {
      return !1;
    }
  }
  return Array.isArray(t) && Array.isArray(r) ? r.every((o, i) => {
    if (o == null)
      return !0;
    const a = n[i];
    return a ? (Array.isArray(o) ? o : [o]).some((u) => s(a, u, t[i])) : !1;
  }) : typeof t == "object" && !Array.isArray(t) && typeof r == "object" && !Array.isArray(r) ? Object.entries(r).every(([o, i]) => {
    if (i == null)
      return !0;
    const a = n.find((u) => u.name === o);
    return a ? (Array.isArray(i) ? i : [i]).some((u) => s(a, u, t[o])) : !1;
  }) : !1;
}
async function to(e, { address: t, blockHash: n, fromBlock: r, toBlock: s, event: o, events: i, args: a, strict: c } = {}) {
  const u = c ?? !1, f = i ?? (o ? [o] : void 0);
  let d = [];
  f && (d = [f.flatMap((b) => Tn({
    abi: [b],
    eventName: b.name,
    args: i ? void 0 : a
  }))], o && (d = d[0]));
  let l;
  n ? l = await e.request({
    method: "eth_getLogs",
    params: [{ address: t, topics: d, blockHash: n }]
  }) : l = await e.request({
    method: "eth_getLogs",
    params: [
      {
        address: t,
        topics: d,
        fromBlock: typeof r == "bigint" ? N(r) : r,
        toBlock: typeof s == "bigint" ? N(s) : s
      }
    ]
  });
  const h = l.map((p) => ke(p));
  return f ? eo({
    abi: f,
    args: a,
    logs: h,
    strict: u
  }) : h;
}
async function ka(e, t) {
  const { abi: n, address: r, args: s, blockHash: o, eventName: i, fromBlock: a, toBlock: c, strict: u } = t, f = i ? bt({ abi: n, name: i }) : void 0, d = f ? void 0 : n.filter((l) => l.type === "event");
  return M(e, to, "getLogs")({
    address: r,
    args: s,
    blockHash: o,
    event: f,
    events: d,
    fromBlock: a,
    toBlock: c,
    strict: u
  });
}
const kr = "/docs/contract/decodeFunctionResult";
function Xe(e) {
  const { abi: t, args: n, functionName: r, data: s } = e;
  let o = t[0];
  if (r) {
    const a = bt({ abi: t, args: n, name: r });
    if (!a)
      throw new Bt(r, { docsPath: kr });
    o = a;
  }
  if (o.type !== "function")
    throw new Bt(void 0, { docsPath: kr });
  if (!o.outputs)
    throw new Di(o.name, { docsPath: kr });
  const i = Cn(o.outputs, s);
  if (i && i.length > 1)
    return i;
  if (i && i.length === 1)
    return i[0];
}
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const no = /* @__PURE__ */ BigInt(0), ps = /* @__PURE__ */ BigInt(1);
function zn(e) {
  return e instanceof Uint8Array || ArrayBuffer.isView(e) && e.constructor.name === "Uint8Array";
}
function ro(e) {
  if (!zn(e))
    throw new Error("Uint8Array expected");
}
function En(e, t) {
  if (typeof t != "boolean")
    throw new Error(e + " boolean expected, got " + t);
}
function Gn(e) {
  const t = e.toString(16);
  return t.length & 1 ? "0" + t : t;
}
function Na(e) {
  if (typeof e != "string")
    throw new Error("hex string expected, got " + typeof e);
  return e === "" ? no : BigInt("0x" + e);
}
const Fa = (
  // @ts-ignore
  typeof Uint8Array.from([]).toHex == "function" && typeof Uint8Array.fromHex == "function"
), bd = /* @__PURE__ */ Array.from({ length: 256 }, (e, t) => t.toString(16).padStart(2, "0"));
function Pn(e) {
  if (ro(e), Fa)
    return e.toHex();
  let t = "";
  for (let n = 0; n < e.length; n++)
    t += bd[e[n]];
  return t;
}
const Fe = { _0: 48, _9: 57, A: 65, F: 70, a: 97, f: 102 };
function ti(e) {
  if (e >= Fe._0 && e <= Fe._9)
    return e - Fe._0;
  if (e >= Fe.A && e <= Fe.F)
    return e - (Fe.A - 10);
  if (e >= Fe.a && e <= Fe.f)
    return e - (Fe.a - 10);
}
function Jn(e) {
  if (typeof e != "string")
    throw new Error("hex string expected, got " + typeof e);
  if (Fa)
    return Uint8Array.fromHex(e);
  const t = e.length, n = t / 2;
  if (t % 2)
    throw new Error("hex string expected, got unpadded hex of length " + t);
  const r = new Uint8Array(n);
  for (let s = 0, o = 0; s < n; s++, o += 2) {
    const i = ti(e.charCodeAt(o)), a = ti(e.charCodeAt(o + 1));
    if (i === void 0 || a === void 0) {
      const c = e[o] + e[o + 1];
      throw new Error('hex string expected, got non-hex character "' + c + '" at index ' + o);
    }
    r[s] = i * 16 + a;
  }
  return r;
}
function ot(e) {
  return Na(Pn(e));
}
function Oa(e) {
  return ro(e), Na(Pn(Uint8Array.from(e).reverse()));
}
function Rn(e, t) {
  return Jn(e.toString(16).padStart(t * 2, "0"));
}
function za(e, t) {
  return Rn(e, t).reverse();
}
function ye(e, t, n) {
  let r;
  if (typeof t == "string")
    try {
      r = Jn(t);
    } catch (o) {
      throw new Error(e + " must be hex string or Uint8Array, cause: " + o);
    }
  else if (zn(t))
    r = Uint8Array.from(t);
  else
    throw new Error(e + " must be hex string or Uint8Array");
  const s = r.length;
  if (typeof n == "number" && s !== n)
    throw new Error(e + " of length " + n + " expected, got " + s);
  return r;
}
function Yn(...e) {
  let t = 0;
  for (let r = 0; r < e.length; r++) {
    const s = e[r];
    ro(s), t += s.length;
  }
  const n = new Uint8Array(t);
  for (let r = 0, s = 0; r < e.length; r++) {
    const o = e[r];
    n.set(o, s), s += o.length;
  }
  return n;
}
const Nr = (e) => typeof e == "bigint" && no <= e;
function so(e, t, n) {
  return Nr(e) && Nr(t) && Nr(n) && t <= e && e < n;
}
function It(e, t, n, r) {
  if (!so(t, n, r))
    throw new Error("expected valid " + e + ": " + n + " <= n < " + r + ", got " + t);
}
function yd(e) {
  let t;
  for (t = 0; e > no; e >>= ps, t += 1)
    ;
  return t;
}
const dr = (e) => (ps << BigInt(e)) - ps, Fr = (e) => new Uint8Array(e), ni = (e) => Uint8Array.from(e);
function md(e, t, n) {
  if (typeof e != "number" || e < 2)
    throw new Error("hashLen must be a number");
  if (typeof t != "number" || t < 2)
    throw new Error("qByteLen must be a number");
  if (typeof n != "function")
    throw new Error("hmacFn must be a function");
  let r = Fr(e), s = Fr(e), o = 0;
  const i = () => {
    r.fill(1), s.fill(0), o = 0;
  }, a = (...d) => n(s, r, ...d), c = (d = Fr(0)) => {
    s = a(ni([0]), d), r = a(), d.length !== 0 && (s = a(ni([1]), d), r = a());
  }, u = () => {
    if (o++ >= 1e3)
      throw new Error("drbg: tried 1000 values");
    let d = 0;
    const l = [];
    for (; d < t; ) {
      r = a();
      const h = r.slice();
      l.push(h), d += r.length;
    }
    return Yn(...l);
  };
  return (d, l) => {
    i(), c(d);
    let h;
    for (; !(h = l(u())); )
      c();
    return i(), h;
  };
}
const gd = {
  bigint: (e) => typeof e == "bigint",
  function: (e) => typeof e == "function",
  boolean: (e) => typeof e == "boolean",
  string: (e) => typeof e == "string",
  stringOrUint8Array: (e) => typeof e == "string" || zn(e),
  isSafeInteger: (e) => Number.isSafeInteger(e),
  array: (e) => Array.isArray(e),
  field: (e, t) => t.Fp.isValid(e),
  hash: (e) => typeof e == "function" && Number.isSafeInteger(e.outputLen)
};
function lr(e, t, n = {}) {
  const r = (s, o, i) => {
    const a = gd[o];
    if (typeof a != "function")
      throw new Error("invalid validator function");
    const c = e[s];
    if (!(i && c === void 0) && !a(c, e))
      throw new Error("param " + String(s) + " is invalid. Expected " + o + ", got " + c);
  };
  for (const [s, o] of Object.entries(t))
    r(s, o, !1);
  for (const [s, o] of Object.entries(n))
    r(s, o, !0);
  return e;
}
function ri(e) {
  const t = /* @__PURE__ */ new WeakMap();
  return (n, ...r) => {
    const s = t.get(n);
    if (s !== void 0)
      return s;
    const o = e(n, ...r);
    return t.set(n, o), o;
  };
}
const wd = "0.1.1";
function xd() {
  return wd;
}
class j extends Error {
  static setStaticOptions(t) {
    j.prototype.docsOrigin = t.docsOrigin, j.prototype.showVersion = t.showVersion, j.prototype.version = t.version;
  }
  constructor(t, n = {}) {
    const r = (() => {
      var f;
      if (n.cause instanceof j) {
        if (n.cause.details)
          return n.cause.details;
        if (n.cause.shortMessage)
          return n.cause.shortMessage;
      }
      return n.cause && "details" in n.cause && typeof n.cause.details == "string" ? n.cause.details : (f = n.cause) != null && f.message ? n.cause.message : n.details;
    })(), s = n.cause instanceof j && n.cause.docsPath || n.docsPath, o = n.docsOrigin ?? j.prototype.docsOrigin, i = `${o}${s ?? ""}`, a = !!(n.version ?? j.prototype.showVersion), c = n.version ?? j.prototype.version, u = [
      t || "An error occurred.",
      ...n.metaMessages ? ["", ...n.metaMessages] : [],
      ...r || s || a ? [
        "",
        r ? `Details: ${r}` : void 0,
        s ? `See: ${i}` : void 0,
        a ? `Version: ${c}` : void 0
      ] : []
    ].filter((f) => typeof f == "string").join(`
`);
    super(u, n.cause ? { cause: n.cause } : void 0), Object.defineProperty(this, "details", {
      enumerable: !0,
      configurable: !0,
      writable: !0,
      value: void 0
    }), Object.defineProperty(this, "docs", {
      enumerable: !0,
      configurable: !0,
      writable: !0,
      value: void 0
    }), Object.defineProperty(this, "docsOrigin", {
      enumerable: !0,
      configurable: !0,
      writable: !0,
      value: void 0
    }), Object.defineProperty(this, "docsPath", {
      enumerable: !0,
      configurable: !0,
      writable: !0,
      value: void 0
    }), Object.defineProperty(this, "shortMessage", {
      enumerable: !0,
      configurable: !0,
      writable: !0,
      value: void 0
    }), Object.defineProperty(this, "showVersion", {
      enumerable: !0,
      configurable: !0,
      writable: !0,
      value: void 0
    }), Object.defineProperty(this, "version", {
      enumerable: !0,
      configurable: !0,
      writable: !0,
      value: void 0
    }), Object.defineProperty(this, "cause", {
      enumerable: !0,
      configurable: !0,
      writable: !0,
      value: void 0
    }), Object.defineProperty(this, "name", {
      enumerable: !0,
      configurable: !0,
      writable: !0,
      value: "BaseError"
    }), this.cause = n.cause, this.details = r, this.docs = i, this.docsOrigin = o, this.docsPath = s, this.shortMessage = t, this.showVersion = a, this.version = c;
  }
  walk(t) {
    return Ra(this, t);
  }
}
Object.defineProperty(j, "defaultStaticOptions", {
  enumerable: !0,
  configurable: !0,
  writable: !0,
  value: {
    docsOrigin: "https://oxlib.sh",
    showVersion: !1,
    version: `ox@${xd()}`
  }
});
j.setStaticOptions(j.defaultStaticOptions);
function Ra(e, t) {
  return t != null && t(e) ? e : e && typeof e == "object" && "cause" in e && e.cause ? Ra(e.cause, t) : t ? null : e;
}
function Mn(e, t) {
  if (Et(e) > t)
    throw new Md({
      givenSize: Et(e),
      maxSize: t
    });
}
const Oe = {
  zero: 48,
  nine: 57,
  A: 65,
  F: 70,
  a: 97,
  f: 102
};
function si(e) {
  if (e >= Oe.zero && e <= Oe.nine)
    return e - Oe.zero;
  if (e >= Oe.A && e <= Oe.F)
    return e - (Oe.A - 10);
  if (e >= Oe.a && e <= Oe.f)
    return e - (Oe.a - 10);
}
function vd(e, t = {}) {
  const { dir: n, size: r = 32 } = t;
  if (r === 0)
    return e;
  if (e.length > r)
    throw new Ld({
      size: e.length,
      targetSize: r,
      type: "Bytes"
    });
  const s = new Uint8Array(r);
  for (let o = 0; o < r; o++) {
    const i = n === "right";
    s[i ? o : r - o - 1] = e[i ? o : e.length - o - 1];
  }
  return s;
}
function Ma(e, t = {}) {
  const { dir: n = "left" } = t;
  let r = e, s = 0;
  for (let o = 0; o < r.length - 1 && r[n === "left" ? o : r.length - o - 1].toString() === "0"; o++)
    s++;
  return r = n === "left" ? r.slice(s) : r.slice(0, r.length - s), r;
}
function hr(e, t) {
  if (pe(e) > t)
    throw new Hd({
      givenSize: pe(e),
      maxSize: t
    });
}
function Ed(e, t) {
  if (typeof t == "number" && t > 0 && t > pe(e) - 1)
    throw new Va({
      offset: t,
      position: "start",
      size: pe(e)
    });
}
function Pd(e, t, n) {
  if (typeof t == "number" && typeof n == "number" && pe(e) !== n - t)
    throw new Va({
      offset: n,
      position: "end",
      size: pe(e)
    });
}
function La(e, t = {}) {
  const { dir: n, size: r = 32 } = t;
  if (r === 0)
    return e;
  const s = e.replace("0x", "");
  if (s.length > r * 2)
    throw new qd({
      size: Math.ceil(s.length / 2),
      targetSize: r,
      type: "Hex"
    });
  return `0x${s[n === "right" ? "padEnd" : "padStart"](r * 2, "0")}`;
}
const Ad = "#__bigint";
function _a(e, t, n) {
  return JSON.stringify(e, (r, s) => typeof s == "bigint" ? s.toString() + Ad : s, n);
}
const $d = /* @__PURE__ */ new TextDecoder(), Id = /* @__PURE__ */ new TextEncoder();
function Sd(e) {
  return e instanceof Uint8Array ? e : typeof e == "string" ? ja(e) : Bd(e);
}
function Bd(e) {
  return e instanceof Uint8Array ? e : new Uint8Array(e);
}
function ja(e, t = {}) {
  const { size: n } = t;
  let r = e;
  n && (hr(e, n), r = lt(e, n));
  let s = r.slice(2);
  s.length % 2 && (s = `0${s}`);
  const o = s.length / 2, i = new Uint8Array(o);
  for (let a = 0, c = 0; a < o; a++) {
    const u = si(s.charCodeAt(c++)), f = si(s.charCodeAt(c++));
    if (u === void 0 || f === void 0)
      throw new j(`Invalid byte sequence ("${s[c - 2]}${s[c - 1]}" in "${s}").`);
    i[a] = u << 4 | f;
  }
  return i;
}
function Td(e, t = {}) {
  const { size: n } = t, r = Id.encode(e);
  return typeof n == "number" ? (Mn(r, n), Cd(r, n)) : r;
}
function Cd(e, t) {
  return vd(e, { dir: "right", size: t });
}
function Et(e) {
  return e.length;
}
function kd(e, t, n, r = {}) {
  const { strict: s } = r;
  return e.slice(t, n);
}
function Nd(e, t = {}) {
  const { size: n } = t;
  typeof n < "u" && Mn(e, n);
  const r = Pe(e, t);
  return Da(r, t);
}
function Fd(e, t = {}) {
  const { size: n } = t;
  let r = e;
  if (typeof n < "u" && (Mn(r, n), r = Ua(r)), r.length > 1 || r[0] > 1)
    throw new Rd(r);
  return !!r[0];
}
function Le(e, t = {}) {
  const { size: n } = t;
  typeof n < "u" && Mn(e, n);
  const r = Pe(e, t);
  return Ha(r, t);
}
function Od(e, t = {}) {
  const { size: n } = t;
  let r = e;
  return typeof n < "u" && (Mn(r, n), r = zd(r)), $d.decode(r);
}
function Ua(e) {
  return Ma(e, { dir: "left" });
}
function zd(e) {
  return Ma(e, { dir: "right" });
}
class Rd extends j {
  constructor(t) {
    super(`Bytes value \`${t}\` is not a valid boolean.`, {
      metaMessages: [
        "The bytes array must contain a single byte of either a `0` or `1` value."
      ]
    }), Object.defineProperty(this, "name", {
      enumerable: !0,
      configurable: !0,
      writable: !0,
      value: "Bytes.InvalidBytesBooleanError"
    });
  }
}
let Md = class extends j {
  constructor({ givenSize: t, maxSize: n }) {
    super(`Size cannot exceed \`${n}\` bytes. Given size: \`${t}\` bytes.`), Object.defineProperty(this, "name", {
      enumerable: !0,
      configurable: !0,
      writable: !0,
      value: "Bytes.SizeOverflowError"
    });
  }
}, Ld = class extends j {
  constructor({ size: t, targetSize: n, type: r }) {
    super(`${r.charAt(0).toUpperCase()}${r.slice(1).toLowerCase()} size (\`${t}\`) exceeds padding size (\`${n}\`).`), Object.defineProperty(this, "name", {
      enumerable: !0,
      configurable: !0,
      writable: !0,
      value: "Bytes.SizeExceedsPaddingSizeError"
    });
  }
};
const _d = /* @__PURE__ */ new TextEncoder(), jd = /* @__PURE__ */ Array.from({ length: 256 }, (e, t) => t.toString(16).padStart(2, "0"));
function Ud(e, t = {}) {
  const { strict: n = !1 } = t;
  if (!e)
    throw new oi(e);
  if (typeof e != "string")
    throw new oi(e);
  if (n && !/^0x[0-9a-fA-F]*$/.test(e))
    throw new ii(e);
  if (!e.startsWith("0x"))
    throw new ii(e);
}
function Ee(...e) {
  return `0x${e.reduce((t, n) => t + n.replace("0x", ""), "")}`;
}
function Gd(e) {
  return e instanceof Uint8Array ? Pe(e) : Array.isArray(e) ? Pe(new Uint8Array(e)) : e;
}
function Ga(e, t = {}) {
  const n = `0x${Number(e)}`;
  return typeof t.size == "number" ? (hr(n, t.size), dt(n, t.size)) : n;
}
function Pe(e, t = {}) {
  let n = "";
  for (let s = 0; s < e.length; s++)
    n += jd[e[s]];
  const r = `0x${n}`;
  return typeof t.size == "number" ? (hr(r, t.size), lt(r, t.size)) : r;
}
function ne(e, t = {}) {
  const { signed: n, size: r } = t, s = BigInt(e);
  let o;
  r ? n ? o = (1n << BigInt(r) * 8n - 1n) - 1n : o = 2n ** (BigInt(r) * 8n) - 1n : typeof e == "number" && (o = BigInt(Number.MAX_SAFE_INTEGER));
  const i = typeof o == "bigint" && n ? -o - 1n : 0;
  if (o && s > o || s < i) {
    const u = typeof e == "bigint" ? "n" : "";
    throw new qa({
      max: o ? `${o}${u}` : void 0,
      min: `${i}${u}`,
      signed: n,
      size: r,
      value: `${e}${u}`
    });
  }
  const c = `0x${(n && s < 0 ? BigInt.asUintN(r * 8, BigInt(s)) : s).toString(16)}`;
  return r ? dt(c, r) : c;
}
function oo(e, t = {}) {
  return Pe(_d.encode(e), t);
}
function dt(e, t) {
  return La(e, { dir: "left", size: t });
}
function lt(e, t) {
  return La(e, { dir: "right", size: t });
}
function Be(e, t, n, r = {}) {
  const { strict: s } = r;
  Ed(e, t);
  const o = `0x${e.replace("0x", "").slice((t ?? 0) * 2, (n ?? e.length) * 2)}`;
  return s && Pd(o, t, n), o;
}
function pe(e) {
  return Math.ceil((e.length - 2) / 2);
}
function Da(e, t = {}) {
  const { signed: n } = t;
  t.size && hr(e, t.size);
  const r = BigInt(e);
  if (!n)
    return r;
  const s = (e.length - 2) / 2, o = (1n << BigInt(s) * 8n) - 1n, i = o >> 1n;
  return r <= i ? r : r - o - 1n;
}
function Ha(e, t = {}) {
  const { signed: n, size: r } = t;
  return Number(!n && !r ? e : Da(e, t));
}
function Dd(e, t = {}) {
  const { strict: n = !1 } = t;
  try {
    return Ud(e, { strict: n }), !0;
  } catch {
    return !1;
  }
}
class qa extends j {
  constructor({ max: t, min: n, signed: r, size: s, value: o }) {
    super(`Number \`${o}\` is not in safe${s ? ` ${s * 8}-bit` : ""}${r ? " signed" : " unsigned"} integer range ${t ? `(\`${n}\` to \`${t}\`)` : `(above \`${n}\`)`}`), Object.defineProperty(this, "name", {
      enumerable: !0,
      configurable: !0,
      writable: !0,
      value: "Hex.IntegerOutOfRangeError"
    });
  }
}
class oi extends j {
  constructor(t) {
    super(`Value \`${typeof t == "object" ? _a(t) : t}\` of type \`${typeof t}\` is an invalid hex type.`, {
      metaMessages: ['Hex types must be represented as `"0x${string}"`.']
    }), Object.defineProperty(this, "name", {
      enumerable: !0,
      configurable: !0,
      writable: !0,
      value: "Hex.InvalidHexTypeError"
    });
  }
}
class ii extends j {
  constructor(t) {
    super(`Value \`${t}\` is an invalid hex value.`, {
      metaMessages: [
        'Hex values must start with `"0x"` and contain only hexadecimal characters (0-9, a-f, A-F).'
      ]
    }), Object.defineProperty(this, "name", {
      enumerable: !0,
      configurable: !0,
      writable: !0,
      value: "Hex.InvalidHexValueError"
    });
  }
}
class Hd extends j {
  constructor({ givenSize: t, maxSize: n }) {
    super(`Size cannot exceed \`${n}\` bytes. Given size: \`${t}\` bytes.`), Object.defineProperty(this, "name", {
      enumerable: !0,
      configurable: !0,
      writable: !0,
      value: "Hex.SizeOverflowError"
    });
  }
}
class Va extends j {
  constructor({ offset: t, position: n, size: r }) {
    super(`Slice ${n === "start" ? "starting" : "ending"} at offset \`${t}\` is out-of-bounds (size: \`${r}\`).`), Object.defineProperty(this, "name", {
      enumerable: !0,
      configurable: !0,
      writable: !0,
      value: "Hex.SliceOffsetOutOfBoundsError"
    });
  }
}
class qd extends j {
  constructor({ size: t, targetSize: n, type: r }) {
    super(`${r.charAt(0).toUpperCase()}${r.slice(1).toLowerCase()} size (\`${t}\`) exceeds padding size (\`${n}\`).`), Object.defineProperty(this, "name", {
      enumerable: !0,
      configurable: !0,
      writable: !0,
      value: "Hex.SizeExceedsPaddingSizeError"
    });
  }
}
function Vd(e) {
  return {
    address: e.address,
    amount: ne(e.amount),
    index: ne(e.index),
    validatorIndex: ne(e.validatorIndex)
  };
}
function Wa(e) {
  return {
    ...typeof e.baseFeePerGas == "bigint" && {
      baseFeePerGas: ne(e.baseFeePerGas)
    },
    ...typeof e.blobBaseFee == "bigint" && {
      blobBaseFee: ne(e.blobBaseFee)
    },
    ...typeof e.feeRecipient == "string" && {
      feeRecipient: e.feeRecipient
    },
    ...typeof e.gasLimit == "bigint" && {
      gasLimit: ne(e.gasLimit)
    },
    ...typeof e.number == "bigint" && {
      number: ne(e.number)
    },
    ...typeof e.prevRandao == "bigint" && {
      prevRandao: ne(e.prevRandao)
    },
    ...typeof e.time == "bigint" && {
      time: ne(e.time)
    },
    ...e.withdrawals && {
      withdrawals: e.withdrawals.map(Vd)
    }
  };
}
const Rt = [
  {
    inputs: [
      {
        components: [
          {
            name: "target",
            type: "address"
          },
          {
            name: "allowFailure",
            type: "bool"
          },
          {
            name: "callData",
            type: "bytes"
          }
        ],
        name: "calls",
        type: "tuple[]"
      }
    ],
    name: "aggregate3",
    outputs: [
      {
        components: [
          {
            name: "success",
            type: "bool"
          },
          {
            name: "returnData",
            type: "bytes"
          }
        ],
        name: "returnData",
        type: "tuple[]"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      {
        name: "addr",
        type: "address"
      }
    ],
    name: "getEthBalance",
    outputs: [
      {
        name: "balance",
        type: "uint256"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "getCurrentBlockTimestamp",
    outputs: [
      {
        internalType: "uint256",
        name: "timestamp",
        type: "uint256"
      }
    ],
    stateMutability: "view",
    type: "function"
  }
], bs = [
  {
    name: "query",
    type: "function",
    stateMutability: "view",
    inputs: [
      {
        type: "tuple[]",
        name: "queries",
        components: [
          {
            type: "address",
            name: "sender"
          },
          {
            type: "string[]",
            name: "urls"
          },
          {
            type: "bytes",
            name: "data"
          }
        ]
      }
    ],
    outputs: [
      {
        type: "bool[]",
        name: "failures"
      },
      {
        type: "bytes[]",
        name: "responses"
      }
    ]
  },
  {
    name: "HttpError",
    type: "error",
    inputs: [
      {
        type: "uint16",
        name: "status"
      },
      {
        type: "string",
        name: "message"
      }
    ]
  }
], Za = [
  {
    inputs: [
      {
        name: "dns",
        type: "bytes"
      }
    ],
    name: "DNSDecodingFailed",
    type: "error"
  },
  {
    inputs: [
      {
        name: "ens",
        type: "string"
      }
    ],
    name: "DNSEncodingFailed",
    type: "error"
  },
  {
    inputs: [],
    name: "EmptyAddress",
    type: "error"
  },
  {
    inputs: [
      {
        name: "status",
        type: "uint16"
      },
      {
        name: "message",
        type: "string"
      }
    ],
    name: "HttpError",
    type: "error"
  },
  {
    inputs: [],
    name: "InvalidBatchGatewayResponse",
    type: "error"
  },
  {
    inputs: [
      {
        name: "errorData",
        type: "bytes"
      }
    ],
    name: "ResolverError",
    type: "error"
  },
  {
    inputs: [
      {
        name: "name",
        type: "bytes"
      },
      {
        name: "resolver",
        type: "address"
      }
    ],
    name: "ResolverNotContract",
    type: "error"
  },
  {
    inputs: [
      {
        name: "name",
        type: "bytes"
      }
    ],
    name: "ResolverNotFound",
    type: "error"
  },
  {
    inputs: [
      {
        name: "primary",
        type: "string"
      },
      {
        name: "primaryAddress",
        type: "bytes"
      }
    ],
    name: "ReverseAddressMismatch",
    type: "error"
  },
  {
    inputs: [
      {
        internalType: "bytes4",
        name: "selector",
        type: "bytes4"
      }
    ],
    name: "UnsupportedResolverProfile",
    type: "error"
  }
], Ka = [
  ...Za,
  {
    name: "resolveWithGateways",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "name", type: "bytes" },
      { name: "data", type: "bytes" },
      { name: "gateways", type: "string[]" }
    ],
    outputs: [
      { name: "", type: "bytes" },
      { name: "address", type: "address" }
    ]
  }
], Wd = [
  ...Za,
  {
    name: "reverseWithGateways",
    type: "function",
    stateMutability: "view",
    inputs: [
      { type: "bytes", name: "reverseName" },
      { type: "uint256", name: "coinType" },
      { type: "string[]", name: "gateways" }
    ],
    outputs: [
      { type: "string", name: "resolvedName" },
      { type: "address", name: "resolver" },
      { type: "address", name: "reverseResolver" }
    ]
  }
], ai = [
  {
    name: "text",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "name", type: "bytes32" },
      { name: "key", type: "string" }
    ],
    outputs: [{ name: "", type: "string" }]
  }
], ci = [
  {
    name: "addr",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "name", type: "bytes32" }],
    outputs: [{ name: "", type: "address" }]
  },
  {
    name: "addr",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "name", type: "bytes32" },
      { name: "coinType", type: "uint256" }
    ],
    outputs: [{ name: "", type: "bytes" }]
  }
], Ja = [
  {
    name: "isValidSignature",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "hash", type: "bytes32" },
      { name: "signature", type: "bytes" }
    ],
    outputs: [{ name: "", type: "bytes4" }]
  }
], ui = [
  {
    inputs: [
      {
        name: "_signer",
        type: "address"
      },
      {
        name: "_hash",
        type: "bytes32"
      },
      {
        name: "_signature",
        type: "bytes"
      }
    ],
    stateMutability: "nonpayable",
    type: "constructor"
  },
  {
    inputs: [
      {
        name: "_signer",
        type: "address"
      },
      {
        name: "_hash",
        type: "bytes32"
      },
      {
        name: "_signature",
        type: "bytes"
      }
    ],
    outputs: [
      {
        type: "bool"
      }
    ],
    stateMutability: "nonpayable",
    type: "function",
    name: "isValidSig"
  }
], Zd = "0x82ad56cb", Ya = "0x608060405234801561001057600080fd5b5060405161018e38038061018e83398101604081905261002f91610124565b6000808351602085016000f59050803b61004857600080fd5b6000808351602085016000855af16040513d6000823e81610067573d81fd5b3d81f35b634e487b7160e01b600052604160045260246000fd5b600082601f83011261009257600080fd5b81516001600160401b038111156100ab576100ab61006b565b604051601f8201601f19908116603f011681016001600160401b03811182821017156100d9576100d961006b565b6040528181528382016020018510156100f157600080fd5b60005b82811015610110576020818601810151838301820152016100f4565b506000918101602001919091529392505050565b6000806040838503121561013757600080fd5b82516001600160401b0381111561014d57600080fd5b61015985828601610081565b602085015190935090506001600160401b0381111561017757600080fd5b61018385828601610081565b915050925092905056fe", Kd = "0x608060405234801561001057600080fd5b506040516102c03803806102c083398101604081905261002f916101e6565b836001600160a01b03163b6000036100e457600080836001600160a01b03168360405161005c9190610270565b6000604051808303816000865af19150503d8060008114610099576040519150601f19603f3d011682016040523d82523d6000602084013e61009e565b606091505b50915091508115806100b857506001600160a01b0386163b155b156100e1578060405163101bb98d60e01b81526004016100d8919061028c565b60405180910390fd5b50505b6000808451602086016000885af16040513d6000823e81610103573d81fd5b3d81f35b80516001600160a01b038116811461011e57600080fd5b919050565b634e487b7160e01b600052604160045260246000fd5b60005b8381101561015457818101518382015260200161013c565b50506000910152565b600082601f83011261016e57600080fd5b81516001600160401b0381111561018757610187610123565b604051601f8201601f19908116603f011681016001600160401b03811182821017156101b5576101b5610123565b6040528181528382016020018510156101cd57600080fd5b6101de826020830160208701610139565b949350505050565b600080600080608085870312156101fc57600080fd5b61020585610107565b60208601519094506001600160401b0381111561022157600080fd5b61022d8782880161015d565b93505061023c60408601610107565b60608601519092506001600160401b0381111561025857600080fd5b6102648782880161015d565b91505092959194509250565b60008251610282818460208701610139565b9190910192915050565b60208152600082518060208401526102ab816040850160208701610139565b601f01601f1916919091016040019291505056fe", Jd = "0x608060405234801561001057600080fd5b5060405161069438038061069483398101604081905261002f9161051e565b600061003c848484610048565b9050806000526001601ff35b60007f64926492649264926492649264926492649264926492649264926492649264926100748361040c565b036101e7576000606080848060200190518101906100929190610577565b60405192955090935091506000906001600160a01b038516906100b69085906105dd565b6000604051808303816000865af19150503d80600081146100f3576040519150601f19603f3d011682016040523d82523d6000602084013e6100f8565b606091505b50509050876001600160a01b03163b60000361016057806101605760405162461bcd60e51b815260206004820152601e60248201527f5369676e617475726556616c696461746f723a206465706c6f796d656e74000060448201526064015b60405180910390fd5b604051630b135d3f60e11b808252906001600160a01b038a1690631626ba7e90610190908b9087906004016105f9565b602060405180830381865afa1580156101ad573d6000803e3d6000fd5b505050506040513d601f19601f820116820180604052508101906101d19190610633565b6001600160e01b03191614945050505050610405565b6001600160a01b0384163b1561027a57604051630b135d3f60e11b808252906001600160a01b03861690631626ba7e9061022790879087906004016105f9565b602060405180830381865afa158015610244573d6000803e3d6000fd5b505050506040513d601f19601f820116820180604052508101906102689190610633565b6001600160e01b031916149050610405565b81516041146102df5760405162461bcd60e51b815260206004820152603a602482015260008051602061067483398151915260448201527f3a20696e76616c6964207369676e6174757265206c656e6774680000000000006064820152608401610157565b6102e7610425565b5060208201516040808401518451859392600091859190811061030c5761030c61065d565b016020015160f81c9050601b811480159061032b57508060ff16601c14155b1561038c5760405162461bcd60e51b815260206004820152603b602482015260008051602061067483398151915260448201527f3a20696e76616c6964207369676e617475726520762076616c756500000000006064820152608401610157565b60408051600081526020810180835289905260ff83169181019190915260608101849052608081018390526001600160a01b0389169060019060a0016020604051602081039080840390855afa1580156103ea573d6000803e3d6000fd5b505050602060405103516001600160a01b0316149450505050505b9392505050565b600060208251101561041d57600080fd5b508051015190565b60405180606001604052806003906020820280368337509192915050565b6001600160a01b038116811461045857600080fd5b50565b634e487b7160e01b600052604160045260246000fd5b60005b8381101561048c578181015183820152602001610474565b50506000910152565b600082601f8301126104a657600080fd5b81516001600160401b038111156104bf576104bf61045b565b604051601f8201601f19908116603f011681016001600160401b03811182821017156104ed576104ed61045b565b60405281815283820160200185101561050557600080fd5b610516826020830160208701610471565b949350505050565b60008060006060848603121561053357600080fd5b835161053e81610443565b6020850151604086015191945092506001600160401b0381111561056157600080fd5b61056d86828701610495565b9150509250925092565b60008060006060848603121561058c57600080fd5b835161059781610443565b60208501519093506001600160401b038111156105b357600080fd5b6105bf86828701610495565b604086015190935090506001600160401b0381111561056157600080fd5b600082516105ef818460208701610471565b9190910192915050565b828152604060208201526000825180604084015261061e816060850160208701610471565b601f01601f1916919091016060019392505050565b60006020828403121561064557600080fd5b81516001600160e01b03198116811461040557600080fd5b634e487b7160e01b600052603260045260246000fdfe5369676e617475726556616c696461746f72237265636f7665725369676e6572", io = "0x608060405234801561001057600080fd5b506115b9806100206000396000f3fe6080604052600436106100f35760003560e01c80634d2301cc1161008a578063a8b0574e11610059578063a8b0574e14610325578063bce38bd714610350578063c3077fa914610380578063ee82ac5e146103b2576100f3565b80634d2301cc1461026257806372425d9d1461029f57806382ad56cb146102ca57806386d516e8146102fa576100f3565b80633408e470116100c65780633408e470146101af578063399542e9146101da5780633e64a6961461020c57806342cbb15c14610237576100f3565b80630f28c97d146100f8578063174dea7114610123578063252dba421461015357806327e86d6e14610184575b600080fd5b34801561010457600080fd5b5061010d6103ef565b60405161011a9190610c0a565b60405180910390f35b61013d60048036038101906101389190610c94565b6103f7565b60405161014a9190610e94565b60405180910390f35b61016d60048036038101906101689190610f0c565b610615565b60405161017b92919061101b565b60405180910390f35b34801561019057600080fd5b506101996107ab565b6040516101a69190611064565b60405180910390f35b3480156101bb57600080fd5b506101c46107b7565b6040516101d19190610c0a565b60405180910390f35b6101f460048036038101906101ef91906110ab565b6107bf565b6040516102039392919061110b565b60405180910390f35b34801561021857600080fd5b506102216107e1565b60405161022e9190610c0a565b60405180910390f35b34801561024357600080fd5b5061024c6107e9565b6040516102599190610c0a565b60405180910390f35b34801561026e57600080fd5b50610289600480360381019061028491906111a7565b6107f1565b6040516102969190610c0a565b60405180910390f35b3480156102ab57600080fd5b506102b4610812565b6040516102c19190610c0a565b60405180910390f35b6102e460048036038101906102df919061122a565b61081a565b6040516102f19190610e94565b60405180910390f35b34801561030657600080fd5b5061030f6109e4565b60405161031c9190610c0a565b60405180910390f35b34801561033157600080fd5b5061033a6109ec565b6040516103479190611286565b60405180910390f35b61036a600480360381019061036591906110ab565b6109f4565b6040516103779190610e94565b60405180910390f35b61039a60048036038101906103959190610f0c565b610ba6565b6040516103a99392919061110b565b60405180910390f35b3480156103be57600080fd5b506103d960048036038101906103d491906112cd565b610bca565b6040516103e69190611064565b60405180910390f35b600042905090565b60606000808484905090508067ffffffffffffffff81111561041c5761041b6112fa565b5b60405190808252806020026020018201604052801561045557816020015b610442610bd5565b81526020019060019003908161043a5790505b5092503660005b828110156105c957600085828151811061047957610478611329565b5b6020026020010151905087878381811061049657610495611329565b5b90506020028101906104a89190611367565b925060008360400135905080860195508360000160208101906104cb91906111a7565b73ffffffffffffffffffffffffffffffffffffffff16818580606001906104f2919061138f565b604051610500929190611431565b60006040518083038185875af1925050503d806000811461053d576040519150601f19603f3d011682016040523d82523d6000602084013e610542565b606091505b5083600001846020018290528215151515815250505081516020850135176105bc577f08c379a000000000000000000000000000000000000000000000000000000000600052602060045260176024527f4d756c746963616c6c333a2063616c6c206661696c656400000000000000000060445260846000fd5b826001019250505061045c565b5082341461060c576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401610603906114a7565b60405180910390fd5b50505092915050565b6000606043915060008484905090508067ffffffffffffffff81111561063e5761063d6112fa565b5b60405190808252806020026020018201604052801561067157816020015b606081526020019060019003908161065c5790505b5091503660005b828110156107a157600087878381811061069557610694611329565b5b90506020028101906106a791906114c7565b92508260000160208101906106bc91906111a7565b73ffffffffffffffffffffffffffffffffffffffff168380602001906106e2919061138f565b6040516106f0929190611431565b6000604051808303816000865af19150503d806000811461072d576040519150601f19603f3d011682016040523d82523d6000602084013e610732565b606091505b5086848151811061074657610745611329565b5b60200260200101819052819250505080610795576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161078c9061153b565b60405180910390fd5b81600101915050610678565b5050509250929050565b60006001430340905090565b600046905090565b6000806060439250434091506107d68686866109f4565b905093509350939050565b600048905090565b600043905090565b60008173ffffffffffffffffffffffffffffffffffffffff16319050919050565b600044905090565b606060008383905090508067ffffffffffffffff81111561083e5761083d6112fa565b5b60405190808252806020026020018201604052801561087757816020015b610864610bd5565b81526020019060019003908161085c5790505b5091503660005b828110156109db57600084828151811061089b5761089a611329565b5b602002602001015190508686838181106108b8576108b7611329565b5b90506020028101906108ca919061155b565b92508260000160208101906108df91906111a7565b73ffffffffffffffffffffffffffffffffffffffff16838060400190610905919061138f565b604051610913929190611431565b6000604051808303816000865af19150503d8060008114610950576040519150601f19603f3d011682016040523d82523d6000602084013e610955565b606091505b5082600001836020018290528215151515815250505080516020840135176109cf577f08c379a000000000000000000000000000000000000000000000000000000000600052602060045260176024527f4d756c746963616c6c333a2063616c6c206661696c656400000000000000000060445260646000fd5b8160010191505061087e565b50505092915050565b600045905090565b600041905090565b606060008383905090508067ffffffffffffffff811115610a1857610a176112fa565b5b604051908082528060200260200182016040528015610a5157816020015b610a3e610bd5565b815260200190600190039081610a365790505b5091503660005b82811015610b9c576000848281518110610a7557610a74611329565b5b60200260200101519050868683818110610a9257610a91611329565b5b9050602002810190610aa491906114c7565b9250826000016020810190610ab991906111a7565b73ffffffffffffffffffffffffffffffffffffffff16838060200190610adf919061138f565b604051610aed929190611431565b6000604051808303816000865af19150503d8060008114610b2a576040519150601f19603f3d011682016040523d82523d6000602084013e610b2f565b606091505b508260000183602001829052821515151581525050508715610b90578060000151610b8f576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401610b869061153b565b60405180910390fd5b5b81600101915050610a58565b5050509392505050565b6000806060610bb7600186866107bf565b8093508194508295505050509250925092565b600081409050919050565b6040518060400160405280600015158152602001606081525090565b6000819050919050565b610c0481610bf1565b82525050565b6000602082019050610c1f6000830184610bfb565b92915050565b600080fd5b600080fd5b600080fd5b600080fd5b600080fd5b60008083601f840112610c5457610c53610c2f565b5b8235905067ffffffffffffffff811115610c7157610c70610c34565b5b602083019150836020820283011115610c8d57610c8c610c39565b5b9250929050565b60008060208385031215610cab57610caa610c25565b5b600083013567ffffffffffffffff811115610cc957610cc8610c2a565b5b610cd585828601610c3e565b92509250509250929050565b600081519050919050565b600082825260208201905092915050565b6000819050602082019050919050565b60008115159050919050565b610d2281610d0d565b82525050565b600081519050919050565b600082825260208201905092915050565b60005b83811015610d62578082015181840152602081019050610d47565b83811115610d71576000848401525b50505050565b6000601f19601f8301169050919050565b6000610d9382610d28565b610d9d8185610d33565b9350610dad818560208601610d44565b610db681610d77565b840191505092915050565b6000604083016000830151610dd96000860182610d19565b5060208301518482036020860152610df18282610d88565b9150508091505092915050565b6000610e0a8383610dc1565b905092915050565b6000602082019050919050565b6000610e2a82610ce1565b610e348185610cec565b935083602082028501610e4685610cfd565b8060005b85811015610e825784840389528151610e638582610dfe565b9450610e6e83610e12565b925060208a01995050600181019050610e4a565b50829750879550505050505092915050565b60006020820190508181036000830152610eae8184610e1f565b905092915050565b60008083601f840112610ecc57610ecb610c2f565b5b8235905067ffffffffffffffff811115610ee957610ee8610c34565b5b602083019150836020820283011115610f0557610f04610c39565b5b9250929050565b60008060208385031215610f2357610f22610c25565b5b600083013567ffffffffffffffff811115610f4157610f40610c2a565b5b610f4d85828601610eb6565b92509250509250929050565b600081519050919050565b600082825260208201905092915050565b6000819050602082019050919050565b6000610f918383610d88565b905092915050565b6000602082019050919050565b6000610fb182610f59565b610fbb8185610f64565b935083602082028501610fcd85610f75565b8060005b858110156110095784840389528151610fea8582610f85565b9450610ff583610f99565b925060208a01995050600181019050610fd1565b50829750879550505050505092915050565b60006040820190506110306000830185610bfb565b81810360208301526110428184610fa6565b90509392505050565b6000819050919050565b61105e8161104b565b82525050565b60006020820190506110796000830184611055565b92915050565b61108881610d0d565b811461109357600080fd5b50565b6000813590506110a58161107f565b92915050565b6000806000604084860312156110c4576110c3610c25565b5b60006110d286828701611096565b935050602084013567ffffffffffffffff8111156110f3576110f2610c2a565b5b6110ff86828701610eb6565b92509250509250925092565b60006060820190506111206000830186610bfb565b61112d6020830185611055565b818103604083015261113f8184610e1f565b9050949350505050565b600073ffffffffffffffffffffffffffffffffffffffff82169050919050565b600061117482611149565b9050919050565b61118481611169565b811461118f57600080fd5b50565b6000813590506111a18161117b565b92915050565b6000602082840312156111bd576111bc610c25565b5b60006111cb84828501611192565b91505092915050565b60008083601f8401126111ea576111e9610c2f565b5b8235905067ffffffffffffffff81111561120757611206610c34565b5b60208301915083602082028301111561122357611222610c39565b5b9250929050565b6000806020838503121561124157611240610c25565b5b600083013567ffffffffffffffff81111561125f5761125e610c2a565b5b61126b858286016111d4565b92509250509250929050565b61128081611169565b82525050565b600060208201905061129b6000830184611277565b92915050565b6112aa81610bf1565b81146112b557600080fd5b50565b6000813590506112c7816112a1565b92915050565b6000602082840312156112e3576112e2610c25565b5b60006112f1848285016112b8565b91505092915050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052604160045260246000fd5b7f4e487b7100000000000000000000000000000000000000000000000000000000600052603260045260246000fd5b600080fd5b600080fd5b600080fd5b60008235600160800383360303811261138357611382611358565b5b80830191505092915050565b600080833560016020038436030381126113ac576113ab611358565b5b80840192508235915067ffffffffffffffff8211156113ce576113cd61135d565b5b6020830192506001820236038313156113ea576113e9611362565b5b509250929050565b600081905092915050565b82818337600083830152505050565b600061141883856113f2565b93506114258385846113fd565b82840190509392505050565b600061143e82848661140c565b91508190509392505050565b600082825260208201905092915050565b7f4d756c746963616c6c333a2076616c7565206d69736d61746368000000000000600082015250565b6000611491601a8361144a565b915061149c8261145b565b602082019050919050565b600060208201905081810360008301526114c081611484565b9050919050565b6000823560016040038336030381126114e3576114e2611358565b5b80830191505092915050565b7f4d756c746963616c6c333a2063616c6c206661696c6564000000000000000000600082015250565b600061152560178361144a565b9150611530826114ef565b602082019050919050565b6000602082019050818103600083015261155481611518565b9050919050565b60008235600160600383360303811261157757611576611358565b5b8083019150509291505056fea264697066735822122020c1bc9aacf8e4a6507193432a895a8e77094f45a1395583f07b24e860ef06cd64736f6c634300080c0033";
class ys extends I {
  constructor({ blockNumber: t, chain: n, contract: r }) {
    super(`Chain "${n.name}" does not support contract "${r.name}".`, {
      metaMessages: [
        "This could be due to any of the following:",
        ...t && r.blockCreated && r.blockCreated > t ? [
          `- The contract "${r.name}" was not deployed until block ${r.blockCreated} (current block ${t}).`
        ] : [
          `- The chain does not have the contract "${r.name}" configured.`
        ]
      ],
      name: "ChainDoesNotSupportContract"
    });
  }
}
class Yd extends I {
  constructor({ chain: t, currentChainId: n }) {
    super(`The current chain of the wallet (id: ${n}) does not match the target chain for the transaction (id: ${t.id} – ${t.name}).`, {
      metaMessages: [
        `Current Chain ID:  ${n}`,
        `Expected Chain ID: ${t.id} – ${t.name}`
      ],
      name: "ChainMismatchError"
    });
  }
}
class Xd extends I {
  constructor() {
    super([
      "No chain was provided to the request.",
      "Please provide a chain with the `chain` argument on the Action, or by supplying a `chain` to WalletClient."
    ].join(`
`), {
      name: "ChainNotFoundError"
    });
  }
}
class Xa extends I {
  constructor() {
    super("No chain was provided to the Client.", {
      name: "ClientChainNotConfiguredError"
    });
  }
}
class pr extends I {
  constructor({ chainId: t }) {
    super(typeof t == "number" ? `Chain ID "${t}" is invalid.` : "Chain ID is invalid.", { name: "InvalidChainIdError" });
  }
}
const Or = "/docs/contract/encodeDeployData";
function br(e) {
  const { abi: t, args: n, bytecode: r } = e;
  if (!n || n.length === 0)
    return r;
  const s = t.find((i) => "type" in i && i.type === "constructor");
  if (!s)
    throw new Ku({ docsPath: Or });
  if (!("inputs" in s))
    throw new Fo({ docsPath: Or });
  if (!s.inputs || s.inputs.length === 0)
    throw new Fo({ docsPath: Or });
  const o = pt(s.inputs, n);
  return Ie([r, o]);
}
function Gt({ blockNumber: e, chain: t, contract: n }) {
  var s;
  const r = (s = t == null ? void 0 : t.contracts) == null ? void 0 : s[n];
  if (!r)
    throw new ys({
      chain: t,
      contract: { name: n }
    });
  if (e && r.blockCreated && r.blockCreated > e)
    throw new ys({
      blockNumber: e,
      chain: t,
      contract: {
        name: n,
        blockCreated: r.blockCreated
      }
    });
  return r.address;
}
function Qa(e, { docsPath: t, ...n }) {
  const r = (() => {
    const s = cr(e, n);
    return s instanceof Nn ? e : s;
  })();
  return new ba(r, {
    docsPath: t,
    ...n
  });
}
function ao() {
  let e = () => {
  }, t = () => {
  };
  return { promise: new Promise((r, s) => {
    e = r, t = s;
  }), resolve: e, reject: t };
}
const zr = /* @__PURE__ */ new Map();
function ec({ fn: e, id: t, shouldSplitBatch: n, wait: r = 0, sort: s }) {
  const o = async () => {
    const f = c();
    i();
    const d = f.map(({ args: l }) => l);
    d.length !== 0 && e(d).then((l) => {
      s && Array.isArray(l) && l.sort(s);
      for (let h = 0; h < f.length; h++) {
        const { resolve: p } = f[h];
        p == null || p([l[h], l]);
      }
    }).catch((l) => {
      for (let h = 0; h < f.length; h++) {
        const { reject: p } = f[h];
        p == null || p(l);
      }
    });
  }, i = () => zr.delete(t), a = () => c().map(({ args: f }) => f), c = () => zr.get(t) || [], u = (f) => zr.set(t, [...c(), f]);
  return {
    flush: i,
    async schedule(f) {
      const { promise: d, resolve: l, reject: h } = ao();
      return (n == null ? void 0 : n([...a(), f])) && o(), c().length > 0 ? (u({ args: f, resolve: l, reject: h }), d) : (u({ args: f, resolve: l, reject: h }), setTimeout(o, r), d);
    }
  };
}
async function Ln(e, t) {
  var k, _, v, T;
  const { account: n = e.account, authorizationList: r, batch: s = !!((k = e.batch) != null && k.multicall), blockNumber: o, blockTag: i = e.experimental_blockTag ?? "latest", accessList: a, blobs: c, blockOverrides: u, code: f, data: d, factory: l, factoryData: h, gas: p, gasPrice: b, maxFeePerBlobGas: x, maxFeePerGas: g, maxPriorityFeePerGas: w, nonce: m, to: y, value: E, stateOverride: $, ...P } = t, A = n ? H(n) : void 0;
  if (f && (l || h))
    throw new I("Cannot provide both `code` & `factory`/`factoryData` as parameters.");
  if (f && y)
    throw new I("Cannot provide both `code` & `to` as parameters.");
  const C = f && d, z = l && h && y && d, S = C || z, F = C ? tc({
    code: f,
    data: d
  }) : z ? tl({
    data: d,
    factory: l,
    factoryData: h,
    to: y
  }) : d;
  try {
    Ge(t);
    const B = (typeof o == "bigint" ? N(o) : void 0) || i, R = u ? Wa(u) : void 0, L = Ds($), U = (T = (v = (_ = e.chain) == null ? void 0 : _.formatters) == null ? void 0 : v.transactionRequest) == null ? void 0 : T.format, W = (U || Je)({
      // Pick out extra data that might exist on the chain's transaction request type.
      ...Ut(P, { format: U }),
      accessList: a,
      account: A,
      authorizationList: r,
      blobs: c,
      data: F,
      gas: p,
      gasPrice: b,
      maxFeePerBlobGas: x,
      maxFeePerGas: g,
      maxPriorityFeePerGas: w,
      nonce: m,
      to: S ? void 0 : y,
      value: E
    }, "call");
    if (s && Qd({ request: W }) && !L && !R)
      try {
        return await el(e, {
          ...W,
          blockNumber: o,
          blockTag: i
        });
      } catch (te) {
        if (!(te instanceof Xa) && !(te instanceof ys))
          throw te;
      }
    const q = (() => {
      const te = [
        W,
        B
      ];
      return L && R ? [...te, L, R] : L ? [...te, L] : R ? [...te, {}, R] : te;
    })(), Z = await e.request({
      method: "eth_call",
      params: q
    });
    return Z === "0x" ? { data: void 0 } : { data: Z };
  } catch (O) {
    const B = nl(O), { offchainLookup: R, offchainLookupSignature: L } = await import("./ccip-L7NC8QY5.mjs");
    if (e.ccipRead !== !1 && (B == null ? void 0 : B.slice(0, 10)) === L && y)
      return { data: await R(e, { data: B, to: y }) };
    throw S && (B == null ? void 0 : B.slice(0, 10)) === "0x101bb98d" ? new Ff({ factory: l }) : Qa(O, {
      ...t,
      account: A,
      chain: e.chain
    });
  }
}
function Qd({ request: e }) {
  const { data: t, to: n, ...r } = e;
  return !(!t || t.startsWith(Zd) || !n || Object.values(r).filter((s) => typeof s < "u").length > 0);
}
async function el(e, t) {
  var b;
  const { batchSize: n = 1024, deployless: r = !1, wait: s = 0 } = typeof ((b = e.batch) == null ? void 0 : b.multicall) == "object" ? e.batch.multicall : {}, { blockNumber: o, blockTag: i = e.experimental_blockTag ?? "latest", data: a, to: c } = t, u = (() => {
    if (r)
      return null;
    if (t.multicallAddress)
      return t.multicallAddress;
    if (e.chain)
      return Gt({
        blockNumber: o,
        chain: e.chain,
        contract: "multicall3"
      });
    throw new Xa();
  })(), d = (typeof o == "bigint" ? N(o) : void 0) || i, { schedule: l } = ec({
    id: `${e.uid}.${d}`,
    wait: s,
    shouldSplitBatch(x) {
      return x.reduce((w, { data: m }) => w + (m.length - 2), 0) > n * 2;
    },
    fn: async (x) => {
      const g = x.map((y) => ({
        allowFailure: !0,
        callData: y.data,
        target: y.to
      })), w = fe({
        abi: Rt,
        args: [g],
        functionName: "aggregate3"
      }), m = await e.request({
        method: "eth_call",
        params: [
          {
            ...u === null ? {
              data: tc({
                code: io,
                data: w
              })
            } : { to: u, data: w }
          },
          d
        ]
      });
      return Xe({
        abi: Rt,
        args: [g],
        functionName: "aggregate3",
        data: m || "0x"
      });
    }
  }), [{ returnData: h, success: p }] = await l({ data: a, to: c });
  if (!p)
    throw new ir({ data: h });
  return h === "0x" ? { data: void 0 } : { data: h };
}
function tc(e) {
  const { code: t, data: n } = e;
  return br({
    abi: Li(["constructor(bytes, bytes)"]),
    bytecode: Ya,
    args: [t, n]
  });
}
function tl(e) {
  const { data: t, factory: n, factoryData: r, to: s } = e;
  return br({
    abi: Li(["constructor(address, bytes, address, bytes)"]),
    bytecode: Kd,
    args: [s, t, n, r]
  });
}
function nl(e) {
  var n;
  if (!(e instanceof I))
    return;
  const t = e.walk();
  return typeof (t == null ? void 0 : t.data) == "object" ? (n = t.data) == null ? void 0 : n.data : t.data;
}
async function Ae(e, t) {
  const { abi: n, address: r, args: s, functionName: o, ...i } = t, a = fe({
    abi: n,
    args: s,
    functionName: o
  });
  try {
    const { data: c } = await M(e, Ln, "call")({
      ...i,
      data: a,
      to: r
    });
    return Xe({
      abi: n,
      args: s,
      functionName: o,
      data: c || "0x"
    });
  } catch (c) {
    throw ut(c, {
      abi: n,
      address: r,
      args: s,
      docsPath: "/docs/contract/readContract",
      functionName: o
    });
  }
}
async function rl(e, t) {
  var f;
  const { abi: n, address: r, args: s, functionName: o, dataSuffix: i = typeof e.dataSuffix == "string" ? e.dataSuffix : (f = e.dataSuffix) == null ? void 0 : f.value, ...a } = t, c = a.account ? H(a.account) : e.account, u = fe({ abi: n, args: s, functionName: o });
  try {
    const { data: d } = await M(e, Ln, "call")({
      batch: !1,
      data: `${u}${i ? i.replace("0x", "") : ""}`,
      to: r,
      ...a,
      account: c
    }), l = Xe({
      abi: n,
      args: s,
      functionName: o,
      data: d || "0x"
    }), h = n.filter((p) => "name" in p && p.name === t.functionName);
    return {
      result: l,
      request: {
        abi: h,
        address: r,
        args: s,
        dataSuffix: i,
        functionName: o,
        ...a,
        account: c
      }
    };
  } catch (d) {
    throw ut(d, {
      abi: n,
      address: r,
      args: s,
      docsPath: "/docs/contract/simulateContract",
      functionName: o,
      sender: c == null ? void 0 : c.address
    });
  }
}
const Rr = /* @__PURE__ */ new Map(), fi = /* @__PURE__ */ new Map();
let sl = 0;
function je(e, t, n) {
  const r = ++sl, s = () => Rr.get(e) || [], o = () => {
    const f = s();
    Rr.set(e, f.filter((d) => d.id !== r));
  }, i = () => {
    const f = s();
    if (!f.some((l) => l.id === r))
      return;
    const d = fi.get(e);
    if (f.length === 1 && d) {
      const l = d();
      l instanceof Promise && l.catch(() => {
      });
    }
    o();
  }, a = s();
  if (Rr.set(e, [
    ...a,
    { id: r, fns: t }
  ]), a && a.length > 0)
    return i;
  const c = {};
  for (const f in t)
    c[f] = (...d) => {
      var h, p;
      const l = s();
      if (l.length !== 0)
        for (const b of l)
          (p = (h = b.fns)[f]) == null || p.call(h, ...d);
    };
  const u = n(c);
  return typeof u == "function" && fi.set(e, u), i;
}
async function ms(e) {
  return new Promise((t) => setTimeout(t, e));
}
function Dt(e, { emitOnBegin: t, initialWaitTime: n, interval: r }) {
  let s = !0;
  const o = () => s = !1;
  return (async () => {
    let a;
    t && (a = await e({ unpoll: o }));
    const c = await (n == null ? void 0 : n(a)) ?? r;
    await ms(c);
    const u = async () => {
      s && (await e({ unpoll: o }), await ms(r), u());
    };
    u();
  })(), o;
}
const ol = /* @__PURE__ */ new Map(), il = /* @__PURE__ */ new Map();
function al(e) {
  const t = (s, o) => ({
    clear: () => o.delete(s),
    get: () => o.get(s),
    set: (i) => o.set(s, i)
  }), n = t(e, ol), r = t(e, il);
  return {
    clear: () => {
      n.clear(), r.clear();
    },
    promise: n,
    response: r
  };
}
async function cl(e, { cacheKey: t, cacheTime: n = Number.POSITIVE_INFINITY }) {
  const r = al(t), s = r.response.get();
  if (s && n > 0 && Date.now() - s.created.getTime() < n)
    return s.data;
  let o = r.promise.get();
  o || (o = e(), r.promise.set(o));
  try {
    const i = await o;
    return r.response.set({ created: /* @__PURE__ */ new Date(), data: i }), i;
  } finally {
    r.promise.clear();
  }
}
const ul = (e) => `blockNumber.${e}`;
async function _n(e, { cacheTime: t = e.cacheTime } = {}) {
  const n = await cl(() => e.request({
    method: "eth_blockNumber"
  }), { cacheKey: ul(e.uid), cacheTime: t });
  return BigInt(n);
}
async function yr(e, { filter: t }) {
  const n = "strict" in t && t.strict, r = await t.request({
    method: "eth_getFilterChanges",
    params: [t.id]
  });
  if (typeof r[0] == "string")
    return r;
  const s = r.map((o) => ke(o));
  return !("abi" in t) || !t.abi ? s : eo({
    abi: t.abi,
    logs: s,
    strict: n
  });
}
async function mr(e, { filter: t }) {
  return t.request({
    method: "eth_uninstallFilter",
    params: [t.id]
  });
}
function fl(e, t) {
  const { abi: n, address: r, args: s, batch: o = !0, eventName: i, fromBlock: a, onError: c, onLogs: u, poll: f, pollingInterval: d = e.pollingInterval, strict: l } = t;
  return (typeof f < "u" ? f : typeof a == "bigint" ? !0 : !(e.transport.type === "webSocket" || e.transport.type === "ipc" || e.transport.type === "fallback" && (e.transport.transports[0].config.type === "webSocket" || e.transport.transports[0].config.type === "ipc"))) ? (() => {
    const x = l ?? !1, g = K([
      "watchContractEvent",
      r,
      s,
      o,
      e.uid,
      i,
      d,
      x,
      a
    ]);
    return je(g, { onLogs: u, onError: c }, (w) => {
      let m;
      a !== void 0 && (m = a - 1n);
      let y, E = !1;
      const $ = Dt(async () => {
        var P;
        if (!E) {
          try {
            y = await M(e, aa, "createContractEventFilter")({
              abi: n,
              address: r,
              args: s,
              eventName: i,
              strict: x,
              fromBlock: a
            });
          } catch {
          }
          E = !0;
          return;
        }
        try {
          let A;
          if (y)
            A = await M(e, yr, "getFilterChanges")({ filter: y });
          else {
            const C = await M(e, _n, "getBlockNumber")({});
            m && m < C ? A = await M(e, ka, "getContractEvents")({
              abi: n,
              address: r,
              args: s,
              eventName: i,
              fromBlock: m + 1n,
              toBlock: C,
              strict: x
            }) : A = [], m = C;
          }
          if (A.length === 0)
            return;
          if (o)
            w.onLogs(A);
          else
            for (const C of A)
              w.onLogs([C]);
        } catch (A) {
          y && A instanceof Ze && (E = !1), (P = w.onError) == null || P.call(w, A);
        }
      }, {
        emitOnBegin: !0,
        interval: d
      });
      return async () => {
        y && await M(e, mr, "uninstallFilter")({ filter: y }), $();
      };
    });
  })() : (() => {
    const x = l ?? !1, g = K([
      "watchContractEvent",
      r,
      s,
      o,
      e.uid,
      i,
      d,
      x
    ]);
    let w = !0, m = () => w = !1;
    return je(g, { onLogs: u, onError: c }, (y) => ((async () => {
      try {
        const E = (() => {
          if (e.transport.type === "fallback") {
            const A = e.transport.transports.find((C) => C.config.type === "webSocket" || C.config.type === "ipc");
            return A ? A.value : e.transport;
          }
          return e.transport;
        })(), $ = i ? Tn({
          abi: n,
          eventName: i,
          args: s
        }) : [], { unsubscribe: P } = await E.subscribe({
          params: ["logs", { address: r, topics: $ }],
          onData(A) {
            var z;
            if (!w)
              return;
            const C = A.result;
            try {
              const { eventName: S, args: F } = Kn({
                abi: n,
                data: C.data,
                topics: C.topics,
                strict: l
              }), k = ke(C, {
                args: F,
                eventName: S
              });
              y.onLogs([k]);
            } catch (S) {
              let F, k;
              if (S instanceof Zn || S instanceof ks) {
                if (l)
                  return;
                F = S.abiItem.name, k = (z = S.abiItem.inputs) == null ? void 0 : z.some((v) => !("name" in v && v.name));
              }
              const _ = ke(C, {
                args: k ? [] : {},
                eventName: F
              });
              y.onLogs([_]);
            }
          },
          onError(A) {
            var C;
            (C = y.onError) == null || C.call(y, A);
          }
        });
        m = P, w || m();
      } catch (E) {
        c == null || c(E);
      }
    })(), () => m()));
  })();
}
class Qe extends I {
  constructor({ docsPath: t } = {}) {
    super([
      "Could not find an Account to execute with this Action.",
      "Please provide an Account with the `account` argument on the Action, or by supplying an `account` to the Client."
    ].join(`
`), {
      docsPath: t,
      docsSlug: "account",
      name: "AccountNotFoundError"
    });
  }
}
class it extends I {
  constructor({ docsPath: t, metaMessages: n, type: r }) {
    super(`Account type "${r}" is not supported.`, {
      docsPath: t,
      metaMessages: n,
      name: "AccountTypeNotSupportedError"
    });
  }
}
function co({ chain: e, currentChainId: t }) {
  if (!e)
    throw new Xd();
  if (t !== e.id)
    throw new Yd({ chain: e, currentChainId: t });
}
async function uo(e, { serializedTransaction: t }) {
  return e.request({
    method: "eth_sendRawTransaction",
    params: [t]
  }, { retryCount: 0 });
}
const Mr = new jt(128);
async function gr(e, t) {
  var y, E, $, P, A;
  const { account: n = e.account, assertChainId: r = !0, chain: s = e.chain, accessList: o, authorizationList: i, blobs: a, data: c, dataSuffix: u = typeof e.dataSuffix == "string" ? e.dataSuffix : (y = e.dataSuffix) == null ? void 0 : y.value, gas: f, gasPrice: d, maxFeePerBlobGas: l, maxFeePerGas: h, maxPriorityFeePerGas: p, nonce: b, type: x, value: g, ...w } = t;
  if (typeof n > "u")
    throw new Qe({
      docsPath: "/docs/actions/wallet/sendTransaction"
    });
  const m = n ? H(n) : null;
  try {
    Ge(t);
    const C = await (async () => {
      if (t.to)
        return t.to;
      if (t.to !== null && i && i.length > 0)
        return await ar({
          authorization: i[0]
        }).catch(() => {
          throw new I("`to` is required. Could not infer from `authorizationList`.");
        });
    })();
    if ((m == null ? void 0 : m.type) === "json-rpc" || m === null) {
      let z;
      s !== null && (z = await M(e, Ye, "getChainId")({}), r && co({
        currentChainId: z,
        chain: s
      }));
      const S = (P = ($ = (E = e.chain) == null ? void 0 : E.formatters) == null ? void 0 : $.transactionRequest) == null ? void 0 : P.format, k = (S || Je)({
        // Pick out extra data that might exist on the chain's transaction request type.
        ...Ut(w, { format: S }),
        accessList: o,
        account: m,
        authorizationList: i,
        blobs: a,
        chainId: z,
        data: u ? ee([c ?? "0x", u]) : c,
        gas: f,
        gasPrice: d,
        maxFeePerBlobGas: l,
        maxFeePerGas: h,
        maxPriorityFeePerGas: p,
        nonce: b,
        to: C,
        type: x,
        value: g
      }, "sendTransaction"), _ = Mr.get(e.uid), v = _ ? "wallet_sendTransaction" : "eth_sendTransaction";
      try {
        return await e.request({
          method: v,
          params: [k]
        }, { retryCount: 0 });
      } catch (T) {
        if (_ === !1)
          throw T;
        const O = T;
        if (O.name === "InvalidInputRpcError" || O.name === "InvalidParamsRpcError" || O.name === "MethodNotFoundRpcError" || O.name === "MethodNotSupportedRpcError")
          return await e.request({
            method: "wallet_sendTransaction",
            params: [k]
          }, { retryCount: 0 }).then((B) => (Mr.set(e.uid, !0), B)).catch((B) => {
            const R = B;
            throw R.name === "MethodNotFoundRpcError" || R.name === "MethodNotSupportedRpcError" ? (Mr.set(e.uid, !1), O) : R;
          });
        throw O;
      }
    }
    if ((m == null ? void 0 : m.type) === "local") {
      const z = await M(e, On, "prepareTransactionRequest")({
        account: m,
        accessList: o,
        authorizationList: i,
        blobs: a,
        chain: s,
        data: u ? ee([c ?? "0x", u]) : c,
        gas: f,
        gasPrice: d,
        maxFeePerBlobGas: l,
        maxFeePerGas: h,
        maxPriorityFeePerGas: p,
        nonce: b,
        nonceManager: m.nonceManager,
        parameters: [...Xs, "sidecars"],
        type: x,
        value: g,
        ...w,
        to: C
      }), S = (A = s == null ? void 0 : s.serializers) == null ? void 0 : A.transaction, F = await m.signTransaction(z, {
        serializer: S
      });
      return await M(e, uo, "sendRawTransaction")({
        serializedTransaction: F
      });
    }
    throw (m == null ? void 0 : m.type) === "smart" ? new it({
      metaMessages: [
        "Consider using the `sendUserOperation` Action instead."
      ],
      docsPath: "/docs/actions/bundler/sendUserOperation",
      type: "smart"
    }) : new it({
      docsPath: "/docs/actions/wallet/sendTransaction",
      type: m == null ? void 0 : m.type
    });
  } catch (C) {
    throw C instanceof it ? C : fr(C, {
      ...t,
      account: m,
      chain: t.chain || void 0
    });
  }
}
async function An(e, t) {
  return An.internal(e, gr, "sendTransaction", t);
}
(function(e) {
  async function t(n, r, s, o) {
    const { abi: i, account: a = n.account, address: c, args: u, functionName: f, ...d } = o;
    if (typeof a > "u")
      throw new Qe({
        docsPath: "/docs/contract/writeContract"
      });
    const l = a ? H(a) : null, h = fe({
      abi: i,
      args: u,
      functionName: f
    });
    try {
      return await M(n, r, s)({
        data: h,
        to: c,
        account: l,
        ...d
      });
    } catch (p) {
      throw ut(p, {
        abi: i,
        address: c,
        args: u,
        docsPath: "/docs/contract/writeContract",
        functionName: f,
        sender: l == null ? void 0 : l.address
      });
    }
  }
  e.internal = t;
})(An || (An = {}));
class dl extends I {
  constructor(t) {
    super(`Call bundle failed with status: ${t.statusCode}`, {
      name: "BundleFailedError"
    }), Object.defineProperty(this, "result", {
      enumerable: !0,
      configurable: !0,
      writable: !0,
      value: void 0
    }), this.result = t;
  }
}
function Xn(e, { delay: t = 100, retryCount: n = 2, shouldRetry: r = () => !0 } = {}) {
  return new Promise((s, o) => {
    const i = async ({ count: a = 0 } = {}) => {
      const c = async ({ error: u }) => {
        const f = typeof t == "function" ? t({ count: a, error: u }) : t;
        f && await ms(f), i({ count: a + 1 });
      };
      try {
        const u = await e();
        s(u);
      } catch (u) {
        if (a < n && await r({ count: a, error: u }))
          return c({ error: u });
        o(u);
      }
    };
    i();
  });
}
const nc = {
  "0x0": "reverted",
  "0x1": "success"
};
function fo(e, t) {
  const n = {
    ...e,
    blockNumber: e.blockNumber ? BigInt(e.blockNumber) : null,
    contractAddress: e.contractAddress ? e.contractAddress : null,
    cumulativeGasUsed: e.cumulativeGasUsed ? BigInt(e.cumulativeGasUsed) : null,
    effectiveGasPrice: e.effectiveGasPrice ? BigInt(e.effectiveGasPrice) : null,
    gasUsed: e.gasUsed ? BigInt(e.gasUsed) : null,
    logs: e.logs ? e.logs.map((r) => ke(r)) : null,
    to: e.to ? e.to : null,
    transactionIndex: e.transactionIndex ? ge(e.transactionIndex) : null,
    status: e.status ? nc[e.status] : null,
    type: e.type ? va[e.type] || e.type : null
  };
  return e.blobGasPrice && (n.blobGasPrice = BigInt(e.blobGasPrice)), e.blobGasUsed && (n.blobGasUsed = BigInt(e.blobGasUsed)), n;
}
const ll = /* @__PURE__ */ Gs("transactionReceipt", fo), rc = "0x5792579257925792579257925792579257925792579257925792579257925792", sc = N(0, {
  size: 32
});
async function oc(e, t) {
  var l;
  const { account: n = e.account, chain: r = e.chain, experimental_fallback: s, experimental_fallbackDelay: o = 32, forceAtomic: i = !1, id: a, version: c = "2.0.0" } = t, u = n ? H(n) : null;
  let f = t.capabilities;
  e.dataSuffix && !((l = t.capabilities) != null && l.dataSuffix) && (typeof e.dataSuffix == "string" ? f = {
    ...t.capabilities,
    dataSuffix: { value: e.dataSuffix, optional: !0 }
  } : f = {
    ...t.capabilities,
    dataSuffix: {
      value: e.dataSuffix.value,
      ...e.dataSuffix.required ? {} : { optional: !0 }
    }
  });
  const d = t.calls.map((h) => {
    const p = h, b = p.abi ? fe({
      abi: p.abi,
      functionName: p.functionName,
      args: p.args
    }) : p.data;
    return {
      data: p.dataSuffix && b ? ee([b, p.dataSuffix]) : b,
      to: p.to,
      value: p.value ? N(p.value) : void 0
    };
  });
  try {
    const h = await e.request({
      method: "wallet_sendCalls",
      params: [
        {
          atomicRequired: i,
          calls: d,
          capabilities: f,
          chainId: N(r.id),
          from: u == null ? void 0 : u.address,
          id: a,
          version: c
        }
      ]
    }, { retryCount: 0 });
    return typeof h == "string" ? { id: h } : h;
  } catch (h) {
    const p = h;
    if (s && (p.name === "MethodNotFoundRpcError" || p.name === "MethodNotSupportedRpcError" || p.name === "UnknownRpcError" || p.details.toLowerCase().includes("does not exist / is not available") || p.details.toLowerCase().includes("missing or invalid. request()") || p.details.toLowerCase().includes("did not match any variant of untagged enum") || p.details.toLowerCase().includes("account upgraded to unsupported contract") || p.details.toLowerCase().includes("eip-7702 not supported") || p.details.toLowerCase().includes("unsupported wc_ method") || // magic.link
    p.details.toLowerCase().includes("feature toggled misconfigured") || // Trust Wallet
    p.details.toLowerCase().includes("jsonrpcengine: response has no error or result for request"))) {
      if (f && Object.values(f).some((m) => !m.optional)) {
        const m = "non-optional `capabilities` are not supported on fallback to `eth_sendTransaction`.";
        throw new Ft(new I(m, {
          details: m
        }));
      }
      if (i && d.length > 1) {
        const w = "`forceAtomic` is not supported on fallback to `eth_sendTransaction`.";
        throw new Ot(new I(w, {
          details: w
        }));
      }
      const b = [];
      for (const w of d) {
        const m = gr(e, {
          account: u,
          chain: r,
          data: w.data,
          to: w.to,
          value: w.value ? X(w.value) : void 0
        });
        b.push(m), o > 0 && await new Promise((y) => setTimeout(y, o));
      }
      const x = await Promise.allSettled(b);
      if (x.every((w) => w.status === "rejected"))
        throw x[0].reason;
      const g = x.map((w) => w.status === "fulfilled" ? w.value : sc);
      return {
        id: ee([
          ...g,
          N(r.id, { size: 32 }),
          rc
        ])
      };
    }
    throw fr(h, {
      ...t,
      account: u,
      chain: t.chain
    });
  }
}
async function ic(e, t) {
  async function n(f) {
    if (f.endsWith(rc.slice(2))) {
      const l = me(es(f, -64, -32)), h = es(f, 0, -64).slice(2).match(/.{1,64}/g), p = await Promise.all(h.map((x) => sc.slice(2) !== x ? e.request({
        method: "eth_getTransactionReceipt",
        params: [`0x${x}`]
      }, { dedupe: !0 }) : void 0)), b = p.some((x) => x === null) ? 100 : p.every((x) => (x == null ? void 0 : x.status) === "0x1") ? 200 : p.every((x) => (x == null ? void 0 : x.status) === "0x0") ? 500 : 600;
      return {
        atomic: !1,
        chainId: ge(l),
        receipts: p.filter(Boolean),
        status: b,
        version: "2.0.0"
      };
    }
    return e.request({
      method: "wallet_getCallsStatus",
      params: [f]
    });
  }
  const { atomic: r = !1, chainId: s, receipts: o, version: i = "2.0.0", ...a } = await n(t.id), [c, u] = (() => {
    const f = a.status;
    return f >= 100 && f < 200 ? ["pending", f] : f >= 200 && f < 300 ? ["success", f] : f >= 300 && f < 700 ? ["failure", f] : f === "CONFIRMED" ? ["success", 200] : f === "PENDING" ? ["pending", 100] : [void 0, f];
  })();
  return {
    ...a,
    atomic: r,
    // @ts-expect-error: for backwards compatibility
    chainId: s ? ge(s) : void 0,
    receipts: (o == null ? void 0 : o.map((f) => ({
      ...f,
      blockNumber: X(f.blockNumber),
      gasUsed: X(f.gasUsed),
      status: nc[f.status]
    }))) ?? [],
    statusCode: u,
    status: c,
    version: i
  };
}
async function ac(e, t) {
  const {
    id: n,
    pollingInterval: r = e.pollingInterval,
    status: s = ({ statusCode: b }) => b === 200 || b >= 300,
    retryCount: o = 4,
    retryDelay: i = ({ count: b }) => ~~(1 << b) * 200,
    // exponential backoff
    timeout: a = 6e4,
    throwOnFailure: c = !1
  } = t, u = K(["waitForCallsStatus", e.uid, n]), { promise: f, resolve: d, reject: l } = ao();
  let h;
  const p = je(u, { resolve: d, reject: l }, (b) => {
    const x = Dt(async () => {
      const g = (w) => {
        clearTimeout(h), x(), w(), p();
      };
      try {
        const w = await Xn(async () => {
          const m = await M(e, ic, "getCallsStatus")({ id: n });
          if (c && m.status === "failure")
            throw new dl(m);
          return m;
        }, {
          retryCount: o,
          delay: i
        });
        if (!s(w))
          return;
        g(() => b.resolve(w));
      } catch (w) {
        g(() => b.reject(w));
      }
    }, {
      interval: r,
      emitOnBegin: !0
    });
    return x;
  });
  return h = a ? setTimeout(() => {
    p(), clearTimeout(h), l(new hl({ id: n }));
  }, a) : void 0, await f;
}
class hl extends I {
  constructor({ id: t }) {
    super(`Timed out while waiting for call bundle with id "${t}" to be confirmed.`, { name: "WaitForCallsStatusTimeoutError" });
  }
}
const gs = 256;
let Dn = gs, Hn;
function cc(e = 11) {
  if (!Hn || Dn + e > gs * 2) {
    Hn = "", Dn = 0;
    for (let t = 0; t < gs; t++)
      Hn += (256 + Math.random() * 256 | 0).toString(16).substring(1);
  }
  return Hn.substring(Dn, Dn++ + e);
}
function uc(e) {
  const { batch: t, chain: n, ccipRead: r, dataSuffix: s, key: o = "base", name: i = "Base Client", type: a = "base" } = e, c = e.experimental_blockTag ?? (typeof (n == null ? void 0 : n.experimental_preconfirmationTime) == "number" ? "pending" : void 0), u = (n == null ? void 0 : n.blockTime) ?? 12e3, f = Math.min(Math.max(Math.floor(u / 2), 500), 4e3), d = e.pollingInterval ?? f, l = e.cacheTime ?? d, h = e.account ? H(e.account) : void 0, { config: p, request: b, value: x } = e.transport({
    account: h,
    chain: n,
    pollingInterval: d
  }), g = { ...p, ...x }, w = {
    account: h,
    batch: t,
    cacheTime: l,
    ccipRead: r,
    chain: n,
    dataSuffix: s,
    key: o,
    name: i,
    pollingInterval: d,
    request: b,
    transport: g,
    type: a,
    uid: cc(),
    ...c ? { experimental_blockTag: c } : {}
  };
  function m(y) {
    return (E) => {
      const $ = E(y);
      for (const A in w)
        delete $[A];
      const P = { ...y, ...$ };
      return Object.assign(P, { extend: m(P) });
    };
  }
  return Object.assign(w, { extend: m(w) });
}
function lo(e) {
  var n, r, s, o, i, a;
  if (!(e instanceof I))
    return !1;
  const t = e.walk((c) => c instanceof rs);
  return t instanceof rs ? ((n = t.data) == null ? void 0 : n.errorName) === "HttpError" || ((r = t.data) == null ? void 0 : r.errorName) === "ResolverError" || ((s = t.data) == null ? void 0 : s.errorName) === "ResolverNotContract" || ((o = t.data) == null ? void 0 : o.errorName) === "ResolverNotFound" || ((i = t.data) == null ? void 0 : i.errorName) === "ReverseAddressMismatch" || ((a = t.data) == null ? void 0 : a.errorName) === "UnsupportedResolverProfile" : !1;
}
function pl(e) {
  const { abi: t, data: n } = e, r = We(n, 0, 4), s = t.find((o) => o.type === "function" && r === Bn(ve(o)));
  if (!s)
    throw new n0(r, {
      docsPath: "/docs/contract/decodeFunctionData"
    });
  return {
    functionName: s.name,
    args: "inputs" in s && s.inputs && s.inputs.length > 0 ? Cn(s.inputs, We(n, 4)) : void 0
  };
}
const Lr = "/docs/contract/encodeErrorResult";
function di(e) {
  const { abi: t, errorName: n, args: r } = e;
  let s = t[0];
  if (n) {
    const c = bt({ abi: t, args: r, name: n });
    if (!c)
      throw new Oo(n, { docsPath: Lr });
    s = c;
  }
  if (s.type !== "error")
    throw new Oo(void 0, { docsPath: Lr });
  const o = ve(s), i = Bn(o);
  let a = "0x";
  if (r && r.length > 0) {
    if (!s.inputs)
      throw new Qu(s.name, { docsPath: Lr });
    a = pt(s.inputs, r);
  }
  return Ie([i, a]);
}
const _r = "/docs/contract/encodeFunctionResult";
function bl(e) {
  const { abi: t, functionName: n, result: r } = e;
  let s = t[0];
  if (n) {
    const i = bt({ abi: t, name: n });
    if (!i)
      throw new Bt(n, { docsPath: _r });
    s = i;
  }
  if (s.type !== "function")
    throw new Bt(void 0, { docsPath: _r });
  if (!s.outputs)
    throw new Di(s.name, { docsPath: _r });
  const o = (() => {
    if (s.outputs.length === 0)
      return [];
    if (s.outputs.length === 1)
      return [r];
    if (Array.isArray(r))
      return r;
    throw new Hi(r);
  })();
  return pt(s.outputs, o);
}
const wr = "x-batch-gateway:true";
async function yl(e) {
  const { data: t, ccipRequest: n } = e, { args: [r] } = pl({ abi: bs, data: t }), s = [], o = [];
  return await Promise.all(r.map(async (i, a) => {
    try {
      o[a] = i.urls.includes(wr) ? await yl({ data: i.data, ccipRequest: n }) : await n(i), s[a] = !1;
    } catch (c) {
      s[a] = !0, o[a] = ml(c);
    }
  })), bl({
    abi: bs,
    functionName: "query",
    result: [s, o]
  });
}
function ml(e) {
  return e.name === "HttpRequestError" && e.status ? di({
    abi: bs,
    errorName: "HttpError",
    args: [e.status, e.shortMessage]
  }) : di({
    abi: [ca],
    errorName: "Error",
    args: ["shortMessage" in e ? e.shortMessage : e.message]
  });
}
function fc(e) {
  if (e.length !== 66 || e.indexOf("[") !== 0 || e.indexOf("]") !== 65)
    return null;
  const t = `0x${e.slice(1, 65)}`;
  return Te(t) ? t : null;
}
function ws(e) {
  let t = new Uint8Array(32).fill(0);
  if (!e)
    return V(t);
  const n = e.split(".");
  for (let r = n.length - 1; r >= 0; r -= 1) {
    const s = fc(n[r]), o = s ? _t(s) : Q(st(n[r]), "bytes");
    t = Q(ee([t, o]), "bytes");
  }
  return V(t);
}
function gl(e) {
  return `[${e.slice(2)}]`;
}
function wl(e) {
  const t = new Uint8Array(32).fill(0);
  return e ? fc(e) || Q(st(e)) : V(t);
}
function ho(e) {
  const t = e.replace(/^\.|\.$/gm, "");
  if (t.length === 0)
    return new Uint8Array(1);
  const n = new Uint8Array(st(t).byteLength + 2);
  let r = 0;
  const s = t.split(".");
  for (let o = 0; o < s.length; o++) {
    let i = st(s[o]);
    i.byteLength > 255 && (i = st(gl(wl(s[o])))), n[r] = i.length, n.set(i, r + 1), r += i.length + 1;
  }
  return n.byteLength !== r + 1 ? n.slice(0, r + 1) : n;
}
async function xl(e, t) {
  const { blockNumber: n, blockTag: r, coinType: s, name: o, gatewayUrls: i, strict: a } = t, { chain: c } = e, u = (() => {
    if (t.universalResolverAddress)
      return t.universalResolverAddress;
    if (!c)
      throw new Error("client chain not configured. universalResolverAddress is required.");
    return Gt({
      blockNumber: n,
      chain: c,
      contract: "ensUniversalResolver"
    });
  })(), f = c == null ? void 0 : c.ensTlds;
  if (f && !f.some((l) => o.endsWith(l)))
    return null;
  const d = s != null ? [ws(o), BigInt(s)] : [ws(o)];
  try {
    const l = fe({
      abi: ci,
      functionName: "addr",
      args: d
    }), h = {
      address: u,
      abi: Ka,
      functionName: "resolveWithGateways",
      args: [
        ae(ho(o)),
        l,
        i ?? [wr]
      ],
      blockNumber: n,
      blockTag: r
    }, b = await M(e, Ae, "readContract")(h);
    if (b[0] === "0x")
      return null;
    const x = Xe({
      abi: ci,
      args: d,
      functionName: "addr",
      data: b[0]
    });
    return x === "0x" || me(x) === "0x00" ? null : x;
  } catch (l) {
    if (a)
      throw l;
    if (lo(l))
      return null;
    throw l;
  }
}
class vl extends I {
  constructor({ data: t }) {
    super("Unable to extract image from metadata. The metadata may be malformed or invalid.", {
      metaMessages: [
        "- Metadata must be a JSON object with at least an `image`, `image_url` or `image_data` property.",
        "",
        `Provided data: ${JSON.stringify(t)}`
      ],
      name: "EnsAvatarInvalidMetadataError"
    });
  }
}
class Kt extends I {
  constructor({ reason: t }) {
    super(`ENS NFT avatar URI is invalid. ${t}`, {
      name: "EnsAvatarInvalidNftUriError"
    });
  }
}
class po extends I {
  constructor({ uri: t }) {
    super(`Unable to resolve ENS avatar URI "${t}". The URI may be malformed, invalid, or does not respond with a valid image.`, { name: "EnsAvatarUriResolutionError" });
  }
}
class El extends I {
  constructor({ namespace: t }) {
    super(`ENS NFT avatar namespace "${t}" is not supported. Must be "erc721" or "erc1155".`, { name: "EnsAvatarUnsupportedNamespaceError" });
  }
}
const Pl = /(?<protocol>https?:\/\/[^/]*|ipfs:\/|ipns:\/|ar:\/)?(?<root>\/)?(?<subpath>ipfs\/|ipns\/)?(?<target>[\w\-.]+)(?<subtarget>\/.*)?/, Al = /^(Qm[1-9A-HJ-NP-Za-km-z]{44,}|b[A-Za-z2-7]{58,}|B[A-Z2-7]{58,}|z[1-9A-HJ-NP-Za-km-z]{48,}|F[0-9A-F]{50,})(\/(?<target>[\w\-.]+))?(?<subtarget>\/.*)?$/, $l = /^data:([a-zA-Z\-/+]*);base64,([^"].*)/, Il = /^data:([a-zA-Z\-/+]*)?(;[a-zA-Z0-9].*?)?(,)/;
async function Sl(e) {
  try {
    const t = await fetch(e, { method: "HEAD" });
    if (t.status === 200) {
      const n = t.headers.get("content-type");
      return n == null ? void 0 : n.startsWith("image/");
    }
    return !1;
  } catch (t) {
    return typeof t == "object" && typeof t.response < "u" || !Object.hasOwn(globalThis, "Image") ? !1 : new Promise((n) => {
      const r = new Image();
      r.onload = () => {
        n(!0);
      }, r.onerror = () => {
        n(!1);
      }, r.src = e;
    });
  }
}
function li(e, t) {
  return e ? e.endsWith("/") ? e.slice(0, -1) : e : t;
}
function dc({ uri: e, gatewayUrls: t }) {
  const n = $l.test(e);
  if (n)
    return { uri: e, isOnChain: !0, isEncoded: n };
  const r = li(t == null ? void 0 : t.ipfs, "https://ipfs.io"), s = li(t == null ? void 0 : t.arweave, "https://arweave.net"), o = e.match(Pl), { protocol: i, subpath: a, target: c, subtarget: u = "" } = (o == null ? void 0 : o.groups) || {}, f = i === "ipns:/" || a === "ipns/", d = i === "ipfs:/" || a === "ipfs/" || Al.test(e);
  if (e.startsWith("http") && !f && !d) {
    let h = e;
    return t != null && t.arweave && (h = e.replace(/https:\/\/arweave.net/g, t == null ? void 0 : t.arweave)), { uri: h, isOnChain: !1, isEncoded: !1 };
  }
  if ((f || d) && c)
    return {
      uri: `${r}/${f ? "ipns" : "ipfs"}/${c}${u}`,
      isOnChain: !1,
      isEncoded: !1
    };
  if (i === "ar:/" && c)
    return {
      uri: `${s}/${c}${u || ""}`,
      isOnChain: !1,
      isEncoded: !1
    };
  let l = e.replace(Il, "");
  if (l.startsWith("<svg") && (l = `data:image/svg+xml;base64,${btoa(l)}`), l.startsWith("data:") || l.startsWith("{"))
    return {
      uri: l,
      isOnChain: !0,
      isEncoded: !1
    };
  throw new po({ uri: e });
}
function lc(e) {
  if (typeof e != "object" || !("image" in e) && !("image_url" in e) && !("image_data" in e))
    throw new vl({ data: e });
  return e.image || e.image_url || e.image_data;
}
async function Bl({ gatewayUrls: e, uri: t }) {
  try {
    const n = await fetch(t).then((s) => s.json());
    return await bo({
      gatewayUrls: e,
      uri: lc(n)
    });
  } catch {
    throw new po({ uri: t });
  }
}
async function bo({ gatewayUrls: e, uri: t }) {
  const { uri: n, isOnChain: r } = dc({ uri: t, gatewayUrls: e });
  if (r || await Sl(n))
    return n;
  throw new po({ uri: t });
}
function Tl(e) {
  let t = e;
  t.startsWith("did:nft:") && (t = t.replace("did:nft:", "").replace(/_/g, "/"));
  const [n, r, s] = t.split("/"), [o, i] = n.split(":"), [a, c] = r.split(":");
  if (!o || o.toLowerCase() !== "eip155")
    throw new Kt({ reason: "Only EIP-155 supported" });
  if (!i)
    throw new Kt({ reason: "Chain ID not found" });
  if (!c)
    throw new Kt({
      reason: "Contract address not found"
    });
  if (!s)
    throw new Kt({ reason: "Token ID not found" });
  if (!a)
    throw new Kt({ reason: "ERC namespace not found" });
  return {
    chainID: Number.parseInt(i, 10),
    namespace: a.toLowerCase(),
    contractAddress: c,
    tokenID: s
  };
}
async function Cl(e, { nft: t }) {
  if (t.namespace === "erc721")
    return Ae(e, {
      address: t.contractAddress,
      abi: [
        {
          name: "tokenURI",
          type: "function",
          stateMutability: "view",
          inputs: [{ name: "tokenId", type: "uint256" }],
          outputs: [{ name: "", type: "string" }]
        }
      ],
      functionName: "tokenURI",
      args: [BigInt(t.tokenID)]
    });
  if (t.namespace === "erc1155")
    return Ae(e, {
      address: t.contractAddress,
      abi: [
        {
          name: "uri",
          type: "function",
          stateMutability: "view",
          inputs: [{ name: "_id", type: "uint256" }],
          outputs: [{ name: "", type: "string" }]
        }
      ],
      functionName: "uri",
      args: [BigInt(t.tokenID)]
    });
  throw new El({ namespace: t.namespace });
}
async function kl(e, { gatewayUrls: t, record: n }) {
  return /eip155:/i.test(n) ? Nl(e, { gatewayUrls: t, record: n }) : bo({ uri: n, gatewayUrls: t });
}
async function Nl(e, { gatewayUrls: t, record: n }) {
  const r = Tl(n), s = await Cl(e, { nft: r }), { uri: o, isOnChain: i, isEncoded: a } = dc({ uri: s, gatewayUrls: t });
  if (i && (o.includes("data:application/json;base64,") || o.startsWith("{"))) {
    const u = a ? (
      // if it is encoded, decode it
      atob(o.replace("data:application/json;base64,", ""))
    ) : (
      // if it isn't encoded assume it is a JSON string, but it could be anything (it will error if it is)
      o
    ), f = JSON.parse(u);
    return bo({ uri: lc(f), gatewayUrls: t });
  }
  let c = r.tokenID;
  return r.namespace === "erc1155" && (c = c.replace("0x", "").padStart(64, "0")), Bl({
    gatewayUrls: t,
    uri: o.replace(/(?:0x)?{id}/, c)
  });
}
async function hc(e, t) {
  const { blockNumber: n, blockTag: r, key: s, name: o, gatewayUrls: i, strict: a } = t, { chain: c } = e, u = (() => {
    if (t.universalResolverAddress)
      return t.universalResolverAddress;
    if (!c)
      throw new Error("client chain not configured. universalResolverAddress is required.");
    return Gt({
      blockNumber: n,
      chain: c,
      contract: "ensUniversalResolver"
    });
  })(), f = c == null ? void 0 : c.ensTlds;
  if (f && !f.some((d) => o.endsWith(d)))
    return null;
  try {
    const d = {
      address: u,
      abi: Ka,
      args: [
        ae(ho(o)),
        fe({
          abi: ai,
          functionName: "text",
          args: [ws(o), s]
        }),
        i ?? [wr]
      ],
      functionName: "resolveWithGateways",
      blockNumber: n,
      blockTag: r
    }, h = await M(e, Ae, "readContract")(d);
    if (h[0] === "0x")
      return null;
    const p = Xe({
      abi: ai,
      functionName: "text",
      data: h[0]
    });
    return p === "" ? null : p;
  } catch (d) {
    if (a)
      throw d;
    if (lo(d))
      return null;
    throw d;
  }
}
async function Fl(e, { blockNumber: t, blockTag: n, assetGatewayUrls: r, name: s, gatewayUrls: o, strict: i, universalResolverAddress: a }) {
  const c = await M(e, hc, "getEnsText")({
    blockNumber: t,
    blockTag: n,
    key: "avatar",
    name: s,
    universalResolverAddress: a,
    gatewayUrls: o,
    strict: i
  });
  if (!c)
    return null;
  try {
    return await kl(e, {
      record: c,
      gatewayUrls: r
    });
  } catch {
    return null;
  }
}
async function Ol(e, t) {
  const { address: n, blockNumber: r, blockTag: s, coinType: o = 60n, gatewayUrls: i, strict: a } = t, { chain: c } = e, u = (() => {
    if (t.universalResolverAddress)
      return t.universalResolverAddress;
    if (!c)
      throw new Error("client chain not configured. universalResolverAddress is required.");
    return Gt({
      blockNumber: r,
      chain: c,
      contract: "ensUniversalResolver"
    });
  })();
  try {
    const f = {
      address: u,
      abi: Wd,
      args: [n, o, i ?? [wr]],
      functionName: "reverseWithGateways",
      blockNumber: r,
      blockTag: s
    }, d = M(e, Ae, "readContract"), [l] = await d(f);
    return l || null;
  } catch (f) {
    if (a)
      throw f;
    if (lo(f))
      return null;
    throw f;
  }
}
async function zl(e, t) {
  const { blockNumber: n, blockTag: r, name: s } = t, { chain: o } = e, i = (() => {
    if (t.universalResolverAddress)
      return t.universalResolverAddress;
    if (!o)
      throw new Error("client chain not configured. universalResolverAddress is required.");
    return Gt({
      blockNumber: n,
      chain: o,
      contract: "ensUniversalResolver"
    });
  })(), a = o == null ? void 0 : o.ensTlds;
  if (a && !a.some((u) => s.endsWith(u)))
    throw new Error(`${s} is not a valid ENS TLD (${a == null ? void 0 : a.join(", ")}) for chain "${o.name}" (id: ${o.id}).`);
  const [c] = await M(e, Ae, "readContract")({
    address: i,
    abi: [
      {
        inputs: [{ type: "bytes" }],
        name: "findResolver",
        outputs: [
          { type: "address" },
          { type: "bytes32" },
          { type: "uint256" }
        ],
        stateMutability: "view",
        type: "function"
      }
    ],
    functionName: "findResolver",
    args: [ae(ho(s))],
    blockNumber: n,
    blockTag: r
  });
  return c;
}
async function pc(e, t) {
  var x, g, w;
  const { account: n = e.account, blockNumber: r, blockTag: s = "latest", blobs: o, data: i, gas: a, gasPrice: c, maxFeePerBlobGas: u, maxFeePerGas: f, maxPriorityFeePerGas: d, to: l, value: h, ...p } = t, b = n ? H(n) : void 0;
  try {
    Ge(t);
    const y = (typeof r == "bigint" ? N(r) : void 0) || s, E = (w = (g = (x = e.chain) == null ? void 0 : x.formatters) == null ? void 0 : g.transactionRequest) == null ? void 0 : w.format, P = (E || Je)({
      // Pick out extra data that might exist on the chain's transaction request type.
      ...Ut(p, { format: E }),
      account: b,
      blobs: o,
      data: i,
      gas: a,
      gasPrice: c,
      maxFeePerBlobGas: u,
      maxFeePerGas: f,
      maxPriorityFeePerGas: d,
      to: l,
      value: h
    }, "createAccessList"), A = await e.request({
      method: "eth_createAccessList",
      params: [P, y]
    });
    return {
      accessList: A.accessList,
      gasUsed: BigInt(A.gasUsed)
    };
  } catch (m) {
    throw Qa(m, {
      ...t,
      account: b,
      chain: e.chain
    });
  }
}
async function Rl(e) {
  const t = or(e, {
    method: "eth_newBlockFilter"
  }), n = await e.request({
    method: "eth_newBlockFilter"
  });
  return { id: n, request: t(n), type: "block" };
}
async function bc(e, { address: t, args: n, event: r, events: s, fromBlock: o, strict: i, toBlock: a } = {}) {
  const c = s ?? (r ? [r] : void 0), u = or(e, {
    method: "eth_newFilter"
  });
  let f = [];
  c && (f = [c.flatMap((h) => Tn({
    abi: [h],
    eventName: h.name,
    args: n
  }))], r && (f = f[0]));
  const d = await e.request({
    method: "eth_newFilter",
    params: [
      {
        address: t,
        fromBlock: typeof o == "bigint" ? N(o) : o,
        toBlock: typeof a == "bigint" ? N(a) : a,
        ...f.length ? { topics: f } : {}
      }
    ]
  });
  return {
    abi: c,
    args: n,
    eventName: r ? r.name : void 0,
    fromBlock: o,
    id: d,
    request: u(d),
    strict: !!i,
    toBlock: a,
    type: "event"
  };
}
async function yc(e) {
  const t = or(e, {
    method: "eth_newPendingTransactionFilter"
  }), n = await e.request({
    method: "eth_newPendingTransactionFilter"
  });
  return { id: n, request: t(n), type: "transaction" };
}
async function Ml(e, { address: t, blockNumber: n, blockTag: r = e.experimental_blockTag ?? "latest" }) {
  var i, a, c;
  if ((i = e.batch) != null && i.multicall && ((c = (a = e.chain) == null ? void 0 : a.contracts) != null && c.multicall3)) {
    const u = e.chain.contracts.multicall3.address, f = fe({
      abi: Rt,
      functionName: "getEthBalance",
      args: [t]
    }), { data: d } = await M(e, Ln, "call")({
      to: u,
      data: f,
      blockNumber: n,
      blockTag: r
    });
    return Xe({
      abi: Rt,
      functionName: "getEthBalance",
      args: [t],
      data: d || "0x"
    });
  }
  const s = typeof n == "bigint" ? N(n) : void 0, o = await e.request({
    method: "eth_getBalance",
    params: [t, s || r]
  });
  return BigInt(o);
}
async function Ll(e) {
  const t = await e.request({
    method: "eth_blobBaseFee"
  });
  return BigInt(t);
}
async function _l(e, { blockHash: t, blockNumber: n, blockTag: r = "latest" } = {}) {
  const s = n !== void 0 ? N(n) : void 0;
  let o;
  return t ? o = await e.request({
    method: "eth_getBlockTransactionCountByHash",
    params: [t]
  }, { dedupe: !0 }) : o = await e.request({
    method: "eth_getBlockTransactionCountByNumber",
    params: [s || r]
  }, { dedupe: !!s }), ge(o);
}
async function Qn(e, { address: t, blockNumber: n, blockTag: r = "latest" }) {
  const s = n !== void 0 ? N(n) : void 0, o = await e.request({
    method: "eth_getCode",
    params: [t, s || r]
  }, { dedupe: !!s });
  if (o !== "0x")
    return o;
}
async function jl(e, { address: t, blockNumber: n, blockTag: r = "latest" }) {
  const s = await Qn(e, {
    address: t,
    ...n !== void 0 ? { blockNumber: n } : { blockTag: r }
  });
  if (s && D(s) === 23 && s.startsWith("0xef0100"))
    return Qt(We(s, 3, 23));
}
class Ul extends I {
  constructor({ address: t }) {
    super(`No EIP-712 domain found on contract "${t}".`, {
      metaMessages: [
        "Ensure that:",
        `- The contract is deployed at the address "${t}".`,
        "- `eip712Domain()` function exists on the contract.",
        "- `eip712Domain()` function matches signature to ERC-5267 specification."
      ],
      name: "Eip712DomainNotFoundError"
    });
  }
}
async function Gl(e, t) {
  const { address: n, factory: r, factoryData: s } = t;
  try {
    const [o, i, a, c, u, f, d] = await M(e, Ae, "readContract")({
      abi: Dl,
      address: n,
      functionName: "eip712Domain",
      factory: r,
      factoryData: s
    });
    return {
      domain: {
        name: i,
        version: a,
        chainId: Number(c),
        verifyingContract: u,
        salt: f
      },
      extensions: d,
      fields: o
    };
  } catch (o) {
    const i = o;
    throw i.name === "ContractFunctionExecutionError" && i.cause.name === "ContractFunctionZeroDataError" ? new Ul({ address: n }) : i;
  }
}
const Dl = [
  {
    inputs: [],
    name: "eip712Domain",
    outputs: [
      { name: "fields", type: "bytes1" },
      { name: "name", type: "string" },
      { name: "version", type: "string" },
      { name: "chainId", type: "uint256" },
      { name: "verifyingContract", type: "address" },
      { name: "salt", type: "bytes32" },
      { name: "extensions", type: "uint256[]" }
    ],
    stateMutability: "view",
    type: "function"
  }
];
function Hl(e) {
  var t;
  return {
    baseFeePerGas: e.baseFeePerGas.map((n) => BigInt(n)),
    gasUsedRatio: e.gasUsedRatio,
    oldestBlock: BigInt(e.oldestBlock),
    reward: (t = e.reward) == null ? void 0 : t.map((n) => n.map((r) => BigInt(r)))
  };
}
async function ql(e, { blockCount: t, blockNumber: n, blockTag: r = "latest", rewardPercentiles: s }) {
  const o = typeof n == "bigint" ? N(n) : void 0, i = await e.request({
    method: "eth_feeHistory",
    params: [
      N(t),
      o || r,
      s
    ]
  }, { dedupe: !!o });
  return Hl(i);
}
async function Vl(e, { filter: t }) {
  const n = t.strict ?? !1, s = (await t.request({
    method: "eth_getFilterLogs",
    params: [t.id]
  })).map((o) => ke(o));
  return t.abi ? eo({
    abi: t.abi,
    logs: s,
    strict: n
  }) : s;
}
function Wl(e) {
  const { authorizationList: t } = e;
  if (t)
    for (const n of t) {
      const { chainId: r } = n, s = n.address;
      if (!J(s))
        throw new se({ address: s });
      if (r < 0)
        throw new pr({ chainId: r });
    }
  yo(e);
}
function Zl(e) {
  const { blobVersionedHashes: t } = e;
  if (t) {
    if (t.length === 0)
      throw new Ba();
    for (const n of t) {
      const r = D(n), s = ge(We(n, 0, 1));
      if (r !== 32)
        throw new ud({ hash: n, size: r });
      if (s !== Sa)
        throw new fd({
          hash: n,
          version: s
        });
    }
  }
  yo(e);
}
function yo(e) {
  const { chainId: t, maxPriorityFeePerGas: n, maxFeePerGas: r, to: s } = e;
  if (t <= 0)
    throw new pr({ chainId: t });
  if (s && !J(s))
    throw new se({ address: s });
  if (r && r > ur)
    throw new ft({ maxFeePerGas: r });
  if (n && r && n > r)
    throw new vn({ maxFeePerGas: r, maxPriorityFeePerGas: n });
}
function Kl(e) {
  const { chainId: t, maxPriorityFeePerGas: n, gasPrice: r, maxFeePerGas: s, to: o } = e;
  if (t <= 0)
    throw new pr({ chainId: t });
  if (o && !J(o))
    throw new se({ address: o });
  if (n || s)
    throw new I("`maxFeePerGas`/`maxPriorityFeePerGas` is not a valid EIP-2930 Transaction attribute.");
  if (r && r > ur)
    throw new ft({ maxFeePerGas: r });
}
function Jl(e) {
  const { chainId: t, maxPriorityFeePerGas: n, gasPrice: r, maxFeePerGas: s, to: o } = e;
  if (o && !J(o))
    throw new se({ address: o });
  if (typeof t < "u" && t <= 0)
    throw new pr({ chainId: t });
  if (n || s)
    throw new I("`maxFeePerGas`/`maxPriorityFeePerGas` is not a valid Legacy Transaction attribute.");
  if (r && r > ur)
    throw new ft({ maxFeePerGas: r });
}
function xr(e) {
  if (!e || e.length === 0)
    return [];
  const t = [];
  for (let n = 0; n < e.length; n++) {
    const { address: r, storageKeys: s } = e[n];
    for (let o = 0; o < s.length; o++)
      if (s[o].length - 2 !== 64)
        throw new Bf({ storageKey: s[o] });
    if (!J(r, { strict: !1 }))
      throw new se({ address: r });
    t.push([r, s]);
  }
  return t;
}
function Yl(e, t) {
  const n = Ca(e);
  return n === "eip1559" ? eh(e, t) : n === "eip2930" ? th(e, t) : n === "eip4844" ? Ql(e, t) : n === "eip7702" ? Xl(e, t) : nh(e, t);
}
function Xl(e, t) {
  const { authorizationList: n, chainId: r, gas: s, nonce: o, to: i, value: a, maxFeePerGas: c, maxPriorityFeePerGas: u, accessList: f, data: d } = e;
  Wl(e);
  const l = xr(f), h = rh(n);
  return Ie([
    "0x04",
    Ke([
      N(r),
      o ? N(o) : "0x",
      u ? N(u) : "0x",
      c ? N(c) : "0x",
      s ? N(s) : "0x",
      i ?? "0x",
      a ? N(a) : "0x",
      d ?? "0x",
      l,
      h,
      ...jn(e, t)
    ])
  ]);
}
function Ql(e, t) {
  const { chainId: n, gas: r, nonce: s, to: o, value: i, maxFeePerBlobGas: a, maxFeePerGas: c, maxPriorityFeePerGas: u, accessList: f, data: d } = e;
  Zl(e);
  let l = e.blobVersionedHashes, h = e.sidecars;
  if (e.blobs && (typeof l > "u" || typeof h > "u")) {
    const m = typeof e.blobs[0] == "string" ? e.blobs : e.blobs.map(($) => V($)), y = e.kzg, E = Zs({
      blobs: m,
      kzg: y
    });
    if (typeof l > "u" && (l = Aa({
      commitments: E
    })), typeof h > "u") {
      const $ = Ks({ blobs: m, commitments: E, kzg: y });
      h = Ta({ blobs: m, commitments: E, proofs: $ });
    }
  }
  const p = xr(f), b = [
    N(n),
    s ? N(s) : "0x",
    u ? N(u) : "0x",
    c ? N(c) : "0x",
    r ? N(r) : "0x",
    o ?? "0x",
    i ? N(i) : "0x",
    d ?? "0x",
    p,
    a ? N(a) : "0x",
    l ?? [],
    ...jn(e, t)
  ], x = [], g = [], w = [];
  if (h)
    for (let m = 0; m < h.length; m++) {
      const { blob: y, commitment: E, proof: $ } = h[m];
      x.push(y), g.push(E), w.push($);
    }
  return Ie([
    "0x03",
    // If sidecars are enabled, envelope turns into a "wrapper":
    Ke(h ? [b, x, g, w] : b)
  ]);
}
function eh(e, t) {
  const { chainId: n, gas: r, nonce: s, to: o, value: i, maxFeePerGas: a, maxPriorityFeePerGas: c, accessList: u, data: f } = e;
  yo(e);
  const d = xr(u), l = [
    N(n),
    s ? N(s) : "0x",
    c ? N(c) : "0x",
    a ? N(a) : "0x",
    r ? N(r) : "0x",
    o ?? "0x",
    i ? N(i) : "0x",
    f ?? "0x",
    d,
    ...jn(e, t)
  ];
  return Ie([
    "0x02",
    Ke(l)
  ]);
}
function th(e, t) {
  const { chainId: n, gas: r, data: s, nonce: o, to: i, value: a, accessList: c, gasPrice: u } = e;
  Kl(e);
  const f = xr(c), d = [
    N(n),
    o ? N(o) : "0x",
    u ? N(u) : "0x",
    r ? N(r) : "0x",
    i ?? "0x",
    a ? N(a) : "0x",
    s ?? "0x",
    f,
    ...jn(e, t)
  ];
  return Ie([
    "0x01",
    Ke(d)
  ]);
}
function nh(e, t) {
  const { chainId: n = 0, gas: r, data: s, nonce: o, to: i, value: a, gasPrice: c } = e;
  Jl(e);
  let u = [
    o ? N(o) : "0x",
    c ? N(c) : "0x",
    r ? N(r) : "0x",
    i ?? "0x",
    a ? N(a) : "0x",
    s ?? "0x"
  ];
  if (t) {
    const f = (() => {
      if (t.v >= 35n)
        return (t.v - 35n) / 2n > 0 ? t.v : 27n + (t.v === 35n ? 0n : 1n);
      if (n > 0)
        return BigInt(n * 2) + BigInt(35n + t.v - 27n);
      const h = 27n + (t.v === 27n ? 0n : 1n);
      if (t.v !== h)
        throw new If({ v: t.v });
      return h;
    })(), d = me(t.r), l = me(t.s);
    u = [
      ...u,
      N(f),
      d === "0x00" ? "0x" : d,
      l === "0x00" ? "0x" : l
    ];
  } else n > 0 && (u = [
    ...u,
    N(n),
    "0x",
    "0x"
  ]);
  return Ke(u);
}
function jn(e, t) {
  const n = t ?? e, { v: r, yParity: s } = n;
  if (typeof n.r > "u")
    return [];
  if (typeof n.s > "u")
    return [];
  if (typeof r > "u" && typeof s > "u")
    return [];
  const o = me(n.r), i = me(n.s);
  return [typeof s == "number" ? s ? N(1) : "0x" : r === 0n ? "0x" : r === 1n ? N(1) : r === 27n ? "0x" : N(1), o === "0x00" ? "0x" : o, i === "0x00" ? "0x" : i];
}
function rh(e) {
  if (!e || e.length === 0)
    return [];
  const t = [];
  for (const n of e) {
    const { chainId: r, nonce: s, ...o } = n, i = n.address;
    t.push([
      r ? ae(r) : "0x",
      i,
      s ? ae(s) : "0x",
      ...jn({}, o)
    ]);
  }
  return t;
}
async function sh({ address: e, authorization: t, signature: n }) {
  return zt(Qt(e), await ar({
    authorization: t,
    signature: n
  }));
}
const qn = /* @__PURE__ */ new jt(8192);
function oh(e, { enabled: t = !0, id: n }) {
  if (!t || !n)
    return e();
  if (qn.get(n))
    return qn.get(n);
  const r = e().finally(() => qn.delete(n));
  return qn.set(n, r), r;
}
function ih(e, t = {}) {
  return async (n, r = {}) => {
    var d;
    const { dedupe: s = !1, methods: o, retryDelay: i = 150, retryCount: a = 3, uid: c } = {
      ...t,
      ...r
    }, { method: u } = n;
    if ((d = o == null ? void 0 : o.exclude) != null && d.includes(u))
      throw new nt(new Error("method not supported"), {
        method: u
      });
    if (o != null && o.include && !o.include.includes(u))
      throw new nt(new Error("method not supported"), {
        method: u
      });
    const f = s ? Tt(`${c}.${K(n)}`) : void 0;
    return oh(() => Xn(async () => {
      try {
        return await e(n);
      } catch (l) {
        const h = l;
        switch (h.code) {
          case tn.code:
            throw new tn(h);
          case nn.code:
            throw new nn(h);
          case rn.code:
            throw new rn(h, { method: n.method });
          case sn.code:
            throw new sn(h);
          case ct.code:
            throw new ct(h);
          case Ze.code:
            throw new Ze(h);
          case on.code:
            throw new on(h);
          case an.code:
            throw new an(h);
          case cn.code:
            throw new cn(h);
          case nt.code:
            throw new nt(h, {
              method: n.method
            });
          case Nt.code:
            throw new Nt(h);
          case un.code:
            throw new un(h);
          case $t.code:
            throw new $t(h);
          case fn.code:
            throw new fn(h);
          case dn.code:
            throw new dn(h);
          case ln.code:
            throw new ln(h);
          case hn.code:
            throw new hn(h);
          case pn.code:
            throw new pn(h);
          case Ft.code:
            throw new Ft(h);
          case bn.code:
            throw new bn(h);
          case yn.code:
            throw new yn(h);
          case mn.code:
            throw new mn(h);
          case gn.code:
            throw new gn(h);
          case wn.code:
            throw new wn(h);
          case Ot.code:
            throw new Ot(h);
          case 5e3:
            throw new $t(h);
          case xn.code:
            throw new xn(h);
          default:
            throw l instanceof I ? l : new zf(h);
        }
      }
    }, {
      delay: ({ count: l, error: h }) => {
        var p;
        if (h && h instanceof Yt) {
          const b = (p = h == null ? void 0 : h.headers) == null ? void 0 : p.get("Retry-After");
          if (b != null && b.match(/\d/))
            return Number.parseInt(b, 10) * 1e3;
        }
        return ~~(1 << l) * i;
      },
      retryCount: a,
      shouldRetry: ({ error: l }) => ah(l)
    }), { enabled: s, id: f });
  };
}
function ah(e) {
  return "code" in e && typeof e.code == "number" ? e.code === -1 || e.code === Nt.code || e.code === ct.code || e.code === 429 : e instanceof Yt && e.status ? e.status === 403 || e.status === 408 || e.status === 413 || e.status === 429 || e.status === 500 || e.status === 502 || e.status === 503 || e.status === 504 : !0;
}
function mc(e) {
  const t = {
    formatters: void 0,
    fees: void 0,
    serializers: void 0,
    ...e
  };
  function n(r) {
    return (s) => {
      const o = typeof s == "function" ? s(r) : s, i = { ...r, ...o };
      return Object.assign(i, { extend: n(i) });
    };
  }
  return Object.assign(t, {
    extend: n(t)
  });
}
function ch(e, { errorInstance: t = new Error("timed out"), timeout: n, signal: r }) {
  return new Promise((s, o) => {
    (async () => {
      let i;
      try {
        const a = new AbortController();
        n > 0 && (i = setTimeout(() => {
          r && a.abort();
        }, n)), s(await e({ signal: (a == null ? void 0 : a.signal) || null }));
      } catch (a) {
        (a == null ? void 0 : a.name) === "AbortError" && o(t), o(a);
      } finally {
        clearTimeout(i);
      }
    })();
  });
}
function uh() {
  return {
    current: 0,
    take() {
      return this.current++;
    },
    reset() {
      this.current = 0;
    }
  };
}
const hi = /* @__PURE__ */ uh();
function fh(e, t = {}) {
  const { url: n, headers: r } = dh(e);
  return {
    async request(s) {
      var p, b, x;
      const { body: o, fetchFn: i = t.fetchFn ?? fetch, onRequest: a = t.onRequest, onResponse: c = t.onResponse, timeout: u = t.timeout ?? 1e4 } = s, f = {
        ...t.fetchOptions ?? {},
        ...s.fetchOptions ?? {}
      }, { headers: d, method: l, signal: h } = f;
      try {
        const g = await ch(async ({ signal: m }) => {
          const y = {
            ...f,
            body: Array.isArray(o) ? K(o.map((A) => ({
              jsonrpc: "2.0",
              id: A.id ?? hi.take(),
              ...A
            }))) : K({
              jsonrpc: "2.0",
              id: o.id ?? hi.take(),
              ...o
            }),
            headers: {
              ...r,
              "Content-Type": "application/json",
              ...d
            },
            method: l || "POST",
            signal: h || (u > 0 ? m : null)
          }, E = new Request(n, y), $ = await (a == null ? void 0 : a(E, y)) ?? { ...y, url: n };
          return await i($.url ?? n, $);
        }, {
          errorInstance: new Zo({ body: o, url: n }),
          timeout: u,
          signal: !0
        });
        c && await c(g);
        let w;
        if ((p = g.headers.get("Content-Type")) != null && p.startsWith("application/json"))
          w = await g.json();
        else {
          w = await g.text();
          try {
            w = JSON.parse(w || "{}");
          } catch (m) {
            if (g.ok)
              throw m;
            w = { error: w };
          }
        }
        if (!g.ok) {
          if (typeof ((b = w.error) == null ? void 0 : b.code) == "number" && typeof ((x = w.error) == null ? void 0 : x.message) == "string")
            return w;
          throw new Yt({
            body: o,
            details: K(w.error) || g.statusText,
            headers: g.headers,
            status: g.status,
            url: n
          });
        }
        return w;
      } catch (g) {
        throw g instanceof Yt || g instanceof Zo ? g : new Yt({
          body: o,
          cause: g,
          url: n
        });
      }
    }
  };
}
function dh(e) {
  try {
    const t = new URL(e), n = (() => {
      if (t.username) {
        const r = `${decodeURIComponent(t.username)}:${decodeURIComponent(t.password)}`;
        return t.username = "", t.password = "", {
          url: t.toString(),
          headers: { Authorization: `Basic ${btoa(r)}` }
        };
      }
    })();
    return { url: t.toString(), ...n };
  } catch {
    return { url: e };
  }
}
const lh = `Ethereum Signed Message:
`;
function hh(e) {
  const t = typeof e == "string" ? Tt(e) : typeof e.raw == "string" ? e.raw : V(e.raw), n = Tt(`${lh}${D(t)}`);
  return ee([n, t]);
}
function gc(e, t) {
  return Q(hh(e), t);
}
class ph extends I {
  constructor({ domain: t }) {
    super(`Invalid domain "${K(t)}".`, {
      metaMessages: ["Must be a valid EIP-712 domain."]
    });
  }
}
class bh extends I {
  constructor({ primaryType: t, types: n }) {
    super(`Invalid primary type \`${t}\` must be one of \`${JSON.stringify(Object.keys(n))}\`.`, {
      docsPath: "/api/glossary/Errors#typeddatainvalidprimarytypeerror",
      metaMessages: ["Check that the primary type is a key in `types`."]
    });
  }
}
class yh extends I {
  constructor({ type: t }) {
    super(`Struct type "${t}" is invalid.`, {
      metaMessages: ["Struct type must not be a Solidity type."],
      name: "InvalidStructTypeError"
    });
  }
}
function mh(e) {
  const { domain: t, message: n, primaryType: r, types: s } = e, o = (c, u) => {
    const f = { ...u };
    for (const d of c) {
      const { name: l, type: h } = d;
      h === "address" && (f[l] = f[l].toLowerCase());
    }
    return f;
  }, i = s.EIP712Domain ? t ? o(s.EIP712Domain, t) : {} : {}, a = (() => {
    if (r !== "EIP712Domain")
      return o(s[r], n);
  })();
  return K({ domain: i, message: a, primaryType: r, types: s });
}
function wc(e) {
  const { domain: t, message: n, primaryType: r, types: s } = e, o = (i, a) => {
    for (const c of i) {
      const { name: u, type: f } = c, d = a[u], l = f.match(oa);
      if (l && (typeof d == "number" || typeof d == "bigint")) {
        const [b, x, g] = l;
        N(d, {
          signed: x === "int",
          size: Number.parseInt(g, 10) / 8
        });
      }
      if (f === "address" && typeof d == "string" && !J(d))
        throw new se({ address: d });
      const h = f.match(K0);
      if (h) {
        const [b, x] = h;
        if (x && D(d) !== Number.parseInt(x, 10))
          throw new s0({
            expectedSize: Number.parseInt(x, 10),
            givenSize: D(d)
          });
      }
      const p = s[f];
      p && (gh(f), o(p, d));
    }
  };
  if (s.EIP712Domain && t) {
    if (typeof t != "object")
      throw new ph({ domain: t });
    o(s.EIP712Domain, t);
  }
  if (r !== "EIP712Domain")
    if (s[r])
      o(s[r], n);
    else
      throw new bh({ primaryType: r, types: s });
}
function xc({ domain: e }) {
  return [
    typeof (e == null ? void 0 : e.name) == "string" && { name: "name", type: "string" },
    (e == null ? void 0 : e.version) && { name: "version", type: "string" },
    (typeof (e == null ? void 0 : e.chainId) == "number" || typeof (e == null ? void 0 : e.chainId) == "bigint") && {
      name: "chainId",
      type: "uint256"
    },
    (e == null ? void 0 : e.verifyingContract) && {
      name: "verifyingContract",
      type: "address"
    },
    (e == null ? void 0 : e.salt) && { name: "salt", type: "bytes32" }
  ].filter(Boolean);
}
function gh(e) {
  if (e === "address" || e === "bool" || e === "string" || e.startsWith("bytes") || e.startsWith("uint") || e.startsWith("int"))
    throw new yh({ type: e });
}
function wh(e) {
  const { domain: t = {}, message: n, primaryType: r } = e, s = {
    EIP712Domain: xc({ domain: t }),
    ...e.types
  };
  wc({
    domain: t,
    message: n,
    primaryType: r,
    types: s
  });
  const o = ["0x1901"];
  return t && o.push(xh({
    domain: t,
    types: s
  })), r !== "EIP712Domain" && o.push(vc({
    data: n,
    primaryType: r,
    types: s
  })), Q(ee(o));
}
function xh({ domain: e, types: t }) {
  return vc({
    data: e,
    primaryType: "EIP712Domain",
    types: t
  });
}
function vc({ data: e, primaryType: t, types: n }) {
  const r = Ec({
    data: e,
    primaryType: t,
    types: n
  });
  return Q(r);
}
function Ec({ data: e, primaryType: t, types: n }) {
  const r = [{ type: "bytes32" }], s = [vh({ primaryType: t, types: n })];
  for (const o of n[t]) {
    const [i, a] = Ac({
      types: n,
      name: o.name,
      type: o.type,
      value: e[o.name]
    });
    r.push(i), s.push(a);
  }
  return pt(r, s);
}
function vh({ primaryType: e, types: t }) {
  const n = ae(Eh({ primaryType: e, types: t }));
  return Q(n);
}
function Eh({ primaryType: e, types: t }) {
  let n = "";
  const r = Pc({ primaryType: e, types: t });
  r.delete(e);
  const s = [e, ...Array.from(r).sort()];
  for (const o of s)
    n += `${o}(${t[o].map(({ name: i, type: a }) => `${a} ${i}`).join(",")})`;
  return n;
}
function Pc({ primaryType: e, types: t }, n = /* @__PURE__ */ new Set()) {
  const r = e.match(/^\w*/u), s = r == null ? void 0 : r[0];
  if (n.has(s) || t[s] === void 0)
    return n;
  n.add(s);
  for (const o of t[s])
    Pc({ primaryType: o.type, types: t }, n);
  return n;
}
function Ac({ types: e, name: t, type: n, value: r }) {
  if (e[n] !== void 0)
    return [
      { type: "bytes32" },
      Q(Ec({ data: r, primaryType: n, types: e }))
    ];
  if (n === "bytes")
    return [{ type: "bytes32" }, Q(r)];
  if (n === "string")
    return [{ type: "bytes32" }, Q(ae(r))];
  if (n.lastIndexOf("]") === n.length - 1) {
    const s = n.slice(0, n.lastIndexOf("[")), o = r.map((i) => Ac({
      name: t,
      type: s,
      types: e,
      value: i
    }));
    return [
      { type: "bytes32" },
      Q(pt(o.map(([i]) => i), o.map(([, i]) => i)))
    ];
  }
  return [{ type: n }, r];
}
class Ph extends Map {
  constructor(t) {
    super(), Object.defineProperty(this, "maxSize", {
      enumerable: !0,
      configurable: !0,
      writable: !0,
      value: void 0
    }), this.maxSize = t;
  }
  get(t) {
    const n = super.get(t);
    return super.has(t) && n !== void 0 && (this.delete(t), super.set(t, n)), n;
  }
  set(t, n) {
    if (super.set(t, n), this.maxSize && this.size > this.maxSize) {
      const r = this.keys().next().value;
      r && this.delete(r);
    }
    return this;
  }
}
const Ah = {
  checksum: /* @__PURE__ */ new Ph(8192)
}, jr = Ah.checksum;
class $c extends Fs {
  constructor(t, n) {
    super(), this.finished = !1, this.destroyed = !1, I0(t);
    const r = rr(n);
    if (this.iHash = t.create(), typeof this.iHash.update != "function")
      throw new Error("Expected instance of class which extends utils.Hash");
    this.blockLen = this.iHash.blockLen, this.outputLen = this.iHash.outputLen;
    const s = this.blockLen, o = new Uint8Array(s);
    o.set(r.length > s ? t.create().update(r).digest() : r);
    for (let i = 0; i < o.length; i++)
      o[i] ^= 54;
    this.iHash.update(o), this.oHash = t.create();
    for (let i = 0; i < o.length; i++)
      o[i] ^= 106;
    this.oHash.update(o), kt(o);
  }
  update(t) {
    return Ct(this), this.iHash.update(t), this;
  }
  digestInto(t) {
    Ct(this), at(t, this.outputLen), this.finished = !0, this.iHash.digestInto(t), this.oHash.update(t), this.oHash.digestInto(t), this.destroy();
  }
  digest() {
    const t = new Uint8Array(this.oHash.outputLen);
    return this.digestInto(t), t;
  }
  _cloneInto(t) {
    t || (t = Object.create(Object.getPrototypeOf(this), {}));
    const { oHash: n, iHash: r, finished: s, destroyed: o, blockLen: i, outputLen: a } = this;
    return t = t, t.finished = s, t.destroyed = o, t.blockLen = i, t.outputLen = a, t.oHash = n._cloneInto(t.oHash), t.iHash = r._cloneInto(t.iHash), t;
  }
  clone() {
    return this._cloneInto();
  }
  destroy() {
    this.destroyed = !0, this.oHash.destroy(), this.iHash.destroy();
  }
}
const Ic = (e, t, n) => new $c(e, t).update(n).digest();
Ic.create = (e, t) => new $c(e, t);
function Sc(e, t = {}) {
  const { as: n = typeof e == "string" ? "Hex" : "Bytes" } = t, r = ea(Sd(e));
  return n === "Bytes" ? r : Pe(r);
}
const $h = /^0x[a-fA-F0-9]{40}$/;
function vr(e, t = {}) {
  const { strict: n = !0 } = t;
  if (!$h.test(e))
    throw new pi({
      address: e,
      cause: new Ih()
    });
  if (n) {
    if (e.toLowerCase() === e)
      return;
    if (Bc(e) !== e)
      throw new pi({
        address: e,
        cause: new Sh()
      });
  }
}
function Bc(e) {
  if (jr.has(e))
    return jr.get(e);
  vr(e, { strict: !1 });
  const t = e.substring(2).toLowerCase(), n = Sc(Td(t), { as: "Bytes" }), r = t.split("");
  for (let o = 0; o < 40; o += 2)
    n[o >> 1] >> 4 >= 8 && r[o] && (r[o] = r[o].toUpperCase()), (n[o >> 1] & 15) >= 8 && r[o + 1] && (r[o + 1] = r[o + 1].toUpperCase());
  const s = `0x${r.join("")}`;
  return jr.set(e, s), s;
}
function xs(e, t = {}) {
  const { strict: n = !0 } = t ?? {};
  try {
    return vr(e, { strict: n }), !0;
  } catch {
    return !1;
  }
}
class pi extends j {
  constructor({ address: t, cause: n }) {
    super(`Address "${t}" is invalid.`, {
      cause: n
    }), Object.defineProperty(this, "name", {
      enumerable: !0,
      configurable: !0,
      writable: !0,
      value: "Address.InvalidAddressError"
    });
  }
}
class Ih extends j {
  constructor() {
    super("Address is not a 20 byte (40 hexadecimal character) value."), Object.defineProperty(this, "name", {
      enumerable: !0,
      configurable: !0,
      writable: !0,
      value: "Address.InvalidInputError"
    });
  }
}
class Sh extends j {
  constructor() {
    super("Address does not match its checksum counterpart."), Object.defineProperty(this, "name", {
      enumerable: !0,
      configurable: !0,
      writable: !0,
      value: "Address.InvalidChecksumError"
    });
  }
}
const Bh = /^(.*)\[([0-9]*)\]$/, Th = /^bytes([1-9]|1[0-9]|2[0-9]|3[0-2])?$/, Tc = /^(u?int)(8|16|24|32|40|48|56|64|72|80|88|96|104|112|120|128|136|144|152|160|168|176|184|192|200|208|216|224|232|240|248|256)?$/, bi = 2n ** 256n - 1n;
function St(e, t, n) {
  const { checksumAddress: r, staticPosition: s } = n, o = wo(t.type);
  if (o) {
    const [i, a] = o;
    return kh(e, { ...t, type: a }, { checksumAddress: r, length: i, staticPosition: s });
  }
  if (t.type === "tuple")
    return zh(e, t, {
      checksumAddress: r,
      staticPosition: s
    });
  if (t.type === "address")
    return Ch(e, { checksum: r });
  if (t.type === "bool")
    return Nh(e);
  if (t.type.startsWith("bytes"))
    return Fh(e, t, { staticPosition: s });
  if (t.type.startsWith("uint") || t.type.startsWith("int"))
    return Oh(e, t);
  if (t.type === "string")
    return Rh(e, { staticPosition: s });
  throw new vo(t.type);
}
const yi = 32, vs = 32;
function Ch(e, t = {}) {
  const { checksum: n = !1 } = t, r = e.readBytes(32);
  return [((o) => n ? Bc(o) : o)(Pe(kd(r, -20))), 32];
}
function kh(e, t, n) {
  const { checksumAddress: r, length: s, staticPosition: o } = n;
  if (!s) {
    const c = Le(e.readBytes(vs)), u = o + c, f = u + yi;
    e.setPosition(u);
    const d = Le(e.readBytes(yi)), l = $n(t);
    let h = 0;
    const p = [];
    for (let b = 0; b < d; ++b) {
      e.setPosition(f + (l ? b * 32 : h));
      const [x, g] = St(e, t, {
        checksumAddress: r,
        staticPosition: f
      });
      h += g, p.push(x);
    }
    return e.setPosition(o + 32), [p, 32];
  }
  if ($n(t)) {
    const c = Le(e.readBytes(vs)), u = o + c, f = [];
    for (let d = 0; d < s; ++d) {
      e.setPosition(u + d * 32);
      const [l] = St(e, t, {
        checksumAddress: r,
        staticPosition: u
      });
      f.push(l);
    }
    return e.setPosition(o + 32), [f, 32];
  }
  let i = 0;
  const a = [];
  for (let c = 0; c < s; ++c) {
    const [u, f] = St(e, t, {
      checksumAddress: r,
      staticPosition: o + i
    });
    i += f, a.push(u);
  }
  return [a, i];
}
function Nh(e) {
  return [Fd(e.readBytes(32), { size: 32 }), 32];
}
function Fh(e, t, { staticPosition: n }) {
  const [r, s] = t.type.split("bytes");
  if (!s) {
    const i = Le(e.readBytes(32));
    e.setPosition(n + i);
    const a = Le(e.readBytes(32));
    if (a === 0)
      return e.setPosition(n + 32), ["0x", 32];
    const c = e.readBytes(a);
    return e.setPosition(n + 32), [Pe(c), 32];
  }
  return [Pe(e.readBytes(Number.parseInt(s, 10), 32)), 32];
}
function Oh(e, t) {
  const n = t.type.startsWith("int"), r = Number.parseInt(t.type.split("int")[1] || "256", 10), s = e.readBytes(32);
  return [
    r > 48 ? Nd(s, { signed: n }) : Le(s, { signed: n }),
    32
  ];
}
function zh(e, t, n) {
  const { checksumAddress: r, staticPosition: s } = n, o = t.components.length === 0 || t.components.some(({ name: c }) => !c), i = o ? [] : {};
  let a = 0;
  if ($n(t)) {
    const c = Le(e.readBytes(vs)), u = s + c;
    for (let f = 0; f < t.components.length; ++f) {
      const d = t.components[f];
      e.setPosition(u + a);
      const [l, h] = St(e, d, {
        checksumAddress: r,
        staticPosition: u
      });
      a += h, i[o ? f : d == null ? void 0 : d.name] = l;
    }
    return e.setPosition(s + 32), [i, 32];
  }
  for (let c = 0; c < t.components.length; ++c) {
    const u = t.components[c], [f, d] = St(e, u, {
      checksumAddress: r,
      staticPosition: s
    });
    i[o ? c : u == null ? void 0 : u.name] = f, a += d;
  }
  return [i, a];
}
function Rh(e, { staticPosition: t }) {
  const n = Le(e.readBytes(32)), r = t + n;
  e.setPosition(r);
  const s = Le(e.readBytes(32));
  if (s === 0)
    return e.setPosition(t + 32), ["", 32];
  const o = e.readBytes(s, 32), i = Od(Ua(o));
  return e.setPosition(t + 32), [i, 32];
}
function Mh({ checksumAddress: e, parameters: t, values: n }) {
  const r = [];
  for (let s = 0; s < t.length; s++)
    r.push(mo({
      checksumAddress: e,
      parameter: t[s],
      value: n[s]
    }));
  return r;
}
function mo({ checksumAddress: e = !1, parameter: t, value: n }) {
  const r = t, s = wo(r.type);
  if (s) {
    const [o, i] = s;
    return _h(n, {
      checksumAddress: e,
      length: o,
      parameter: {
        ...r,
        type: i
      }
    });
  }
  if (r.type === "tuple")
    return Hh(n, {
      checksumAddress: e,
      parameter: r
    });
  if (r.type === "address")
    return Lh(n, {
      checksum: e
    });
  if (r.type === "bool")
    return Uh(n);
  if (r.type.startsWith("uint") || r.type.startsWith("int")) {
    const o = r.type.startsWith("int"), [, , i = "256"] = Tc.exec(r.type) ?? [];
    return Gh(n, {
      signed: o,
      size: Number(i)
    });
  }
  if (r.type.startsWith("bytes"))
    return jh(n, { type: r.type });
  if (r.type === "string")
    return Dh(n);
  throw new vo(r.type);
}
function go(e) {
  let t = 0;
  for (let o = 0; o < e.length; o++) {
    const { dynamic: i, encoded: a } = e[o];
    i ? t += 32 : t += pe(a);
  }
  const n = [], r = [];
  let s = 0;
  for (let o = 0; o < e.length; o++) {
    const { dynamic: i, encoded: a } = e[o];
    i ? (n.push(ne(t + s, { size: 32 })), r.push(a), s += pe(a)) : n.push(a);
  }
  return Ee(...n, ...r);
}
function Lh(e, t) {
  const { checksum: n = !1 } = t;
  return vr(e, { strict: n }), {
    dynamic: !1,
    encoded: dt(e.toLowerCase())
  };
}
function _h(e, t) {
  const { checksumAddress: n, length: r, parameter: s } = t, o = r === null;
  if (!Array.isArray(e))
    throw new Qh(e);
  if (!o && e.length !== r)
    throw new Xh({
      expectedLength: r,
      givenLength: e.length,
      type: `${s.type}[${r}]`
    });
  let i = !1;
  const a = [];
  for (let c = 0; c < e.length; c++) {
    const u = mo({
      checksumAddress: n,
      parameter: s,
      value: e[c]
    });
    u.dynamic && (i = !0), a.push(u);
  }
  if (o || i) {
    const c = go(a);
    if (o) {
      const u = ne(a.length, { size: 32 });
      return {
        dynamic: !0,
        encoded: a.length > 0 ? Ee(u, c) : u
      };
    }
    if (i)
      return { dynamic: !0, encoded: c };
  }
  return {
    dynamic: !1,
    encoded: Ee(...a.map(({ encoded: c }) => c))
  };
}
function jh(e, { type: t }) {
  const [, n] = t.split("bytes"), r = pe(e);
  if (!n) {
    let s = e;
    return r % 32 !== 0 && (s = lt(s, Math.ceil((e.length - 2) / 2 / 32) * 32)), {
      dynamic: !0,
      encoded: Ee(dt(ne(r, { size: 32 })), s)
    };
  }
  if (r !== Number.parseInt(n, 10))
    throw new kc({
      expectedSize: Number.parseInt(n, 10),
      value: e
    });
  return { dynamic: !1, encoded: lt(e) };
}
function Uh(e) {
  if (typeof e != "boolean")
    throw new j(`Invalid boolean value: "${e}" (type: ${typeof e}). Expected: \`true\` or \`false\`.`);
  return { dynamic: !1, encoded: dt(Ga(e)) };
}
function Gh(e, { signed: t, size: n }) {
  if (typeof n == "number") {
    const r = 2n ** (BigInt(n) - (t ? 1n : 0n)) - 1n, s = t ? -r - 1n : 0n;
    if (e > r || e < s)
      throw new qa({
        max: r.toString(),
        min: s.toString(),
        signed: t,
        size: n / 8,
        value: e.toString()
      });
  }
  return {
    dynamic: !1,
    encoded: ne(e, {
      size: 32,
      signed: t
    })
  };
}
function Dh(e) {
  const t = oo(e), n = Math.ceil(pe(t) / 32), r = [];
  for (let s = 0; s < n; s++)
    r.push(lt(Be(t, s * 32, (s + 1) * 32)));
  return {
    dynamic: !0,
    encoded: Ee(lt(ne(pe(t), { size: 32 })), ...r)
  };
}
function Hh(e, t) {
  const { checksumAddress: n, parameter: r } = t;
  let s = !1;
  const o = [];
  for (let i = 0; i < r.components.length; i++) {
    const a = r.components[i], c = Array.isArray(e) ? i : a.name, u = mo({
      checksumAddress: n,
      parameter: a,
      value: e[c]
    });
    o.push(u), u.dynamic && (s = !0);
  }
  return {
    dynamic: s,
    encoded: s ? go(o) : Ee(...o.map(({ encoded: i }) => i))
  };
}
function wo(e) {
  const t = e.match(/^(.*)\[(\d+)?\]$/);
  return t ? (
    // Return `null` if the array is dynamic.
    [t[2] ? Number(t[2]) : null, t[1]]
  ) : void 0;
}
function $n(e) {
  var r;
  const { type: t } = e;
  if (t === "string" || t === "bytes" || t.endsWith("[]"))
    return !0;
  if (t === "tuple")
    return (r = e.components) == null ? void 0 : r.some($n);
  const n = wo(e.type);
  return !!(n && $n({
    ...e,
    type: n[1]
  }));
}
const qh = {
  bytes: new Uint8Array(),
  dataView: new DataView(new ArrayBuffer(0)),
  position: 0,
  positionReadCount: /* @__PURE__ */ new Map(),
  recursiveReadCount: 0,
  recursiveReadLimit: Number.POSITIVE_INFINITY,
  assertReadLimit() {
    if (this.recursiveReadCount >= this.recursiveReadLimit)
      throw new Zh({
        count: this.recursiveReadCount + 1,
        limit: this.recursiveReadLimit
      });
  },
  assertPosition(e) {
    if (e < 0 || e > this.bytes.length - 1)
      throw new Wh({
        length: this.bytes.length,
        position: e
      });
  },
  decrementPosition(e) {
    if (e < 0)
      throw new mi({ offset: e });
    const t = this.position - e;
    this.assertPosition(t), this.position = t;
  },
  getReadCount(e) {
    return this.positionReadCount.get(e || this.position) || 0;
  },
  incrementPosition(e) {
    if (e < 0)
      throw new mi({ offset: e });
    const t = this.position + e;
    this.assertPosition(t), this.position = t;
  },
  inspectByte(e) {
    const t = e ?? this.position;
    return this.assertPosition(t), this.bytes[t];
  },
  inspectBytes(e, t) {
    const n = t ?? this.position;
    return this.assertPosition(n + e - 1), this.bytes.subarray(n, n + e);
  },
  inspectUint8(e) {
    const t = e ?? this.position;
    return this.assertPosition(t), this.bytes[t];
  },
  inspectUint16(e) {
    const t = e ?? this.position;
    return this.assertPosition(t + 1), this.dataView.getUint16(t);
  },
  inspectUint24(e) {
    const t = e ?? this.position;
    return this.assertPosition(t + 2), (this.dataView.getUint16(t) << 8) + this.dataView.getUint8(t + 2);
  },
  inspectUint32(e) {
    const t = e ?? this.position;
    return this.assertPosition(t + 3), this.dataView.getUint32(t);
  },
  pushByte(e) {
    this.assertPosition(this.position), this.bytes[this.position] = e, this.position++;
  },
  pushBytes(e) {
    this.assertPosition(this.position + e.length - 1), this.bytes.set(e, this.position), this.position += e.length;
  },
  pushUint8(e) {
    this.assertPosition(this.position), this.bytes[this.position] = e, this.position++;
  },
  pushUint16(e) {
    this.assertPosition(this.position + 1), this.dataView.setUint16(this.position, e), this.position += 2;
  },
  pushUint24(e) {
    this.assertPosition(this.position + 2), this.dataView.setUint16(this.position, e >> 8), this.dataView.setUint8(this.position + 2, e & 255), this.position += 3;
  },
  pushUint32(e) {
    this.assertPosition(this.position + 3), this.dataView.setUint32(this.position, e), this.position += 4;
  },
  readByte() {
    this.assertReadLimit(), this._touch();
    const e = this.inspectByte();
    return this.position++, e;
  },
  readBytes(e, t) {
    this.assertReadLimit(), this._touch();
    const n = this.inspectBytes(e);
    return this.position += t ?? e, n;
  },
  readUint8() {
    this.assertReadLimit(), this._touch();
    const e = this.inspectUint8();
    return this.position += 1, e;
  },
  readUint16() {
    this.assertReadLimit(), this._touch();
    const e = this.inspectUint16();
    return this.position += 2, e;
  },
  readUint24() {
    this.assertReadLimit(), this._touch();
    const e = this.inspectUint24();
    return this.position += 3, e;
  },
  readUint32() {
    this.assertReadLimit(), this._touch();
    const e = this.inspectUint32();
    return this.position += 4, e;
  },
  get remaining() {
    return this.bytes.length - this.position;
  },
  setPosition(e) {
    const t = this.position;
    return this.assertPosition(e), this.position = e, () => this.position = t;
  },
  _touch() {
    if (this.recursiveReadLimit === Number.POSITIVE_INFINITY)
      return;
    const e = this.getReadCount();
    this.positionReadCount.set(this.position, e + 1), e > 0 && this.recursiveReadCount++;
  }
};
function Vh(e, { recursiveReadLimit: t = 8192 } = {}) {
  const n = Object.create(qh);
  return n.bytes = e, n.dataView = new DataView(e.buffer, e.byteOffset, e.byteLength), n.positionReadCount = /* @__PURE__ */ new Map(), n.recursiveReadLimit = t, n;
}
class mi extends j {
  constructor({ offset: t }) {
    super(`Offset \`${t}\` cannot be negative.`), Object.defineProperty(this, "name", {
      enumerable: !0,
      configurable: !0,
      writable: !0,
      value: "Cursor.NegativeOffsetError"
    });
  }
}
class Wh extends j {
  constructor({ length: t, position: n }) {
    super(`Position \`${n}\` is out of bounds (\`0 < position < ${t}\`).`), Object.defineProperty(this, "name", {
      enumerable: !0,
      configurable: !0,
      writable: !0,
      value: "Cursor.PositionOutOfBoundsError"
    });
  }
}
class Zh extends j {
  constructor({ count: t, limit: n }) {
    super(`Recursive read limit of \`${n}\` exceeded (recursive read count: \`${t}\`).`), Object.defineProperty(this, "name", {
      enumerable: !0,
      configurable: !0,
      writable: !0,
      value: "Cursor.RecursiveReadLimitExceededError"
    });
  }
}
function Kh(e, t, n = {}) {
  const { as: r = "Array", checksumAddress: s = !1 } = n, o = typeof t == "string" ? ja(t) : t, i = Vh(o);
  if (Et(o) === 0 && e.length > 0)
    throw new Yh();
  if (Et(o) && Et(o) < 32)
    throw new Jh({
      data: typeof t == "string" ? t : Pe(t),
      parameters: e,
      size: Et(o)
    });
  let a = 0;
  const c = r === "Array" ? [] : {};
  for (let u = 0; u < e.length; ++u) {
    const f = e[u];
    i.setPosition(a);
    const [d, l] = St(i, f, {
      checksumAddress: s,
      staticPosition: 0
    });
    a += l, r === "Array" ? c.push(d) : c[f.name ?? u] = d;
  }
  return c;
}
function xo(e, t, n) {
  const { checksumAddress: r = !1 } = {};
  if (e.length !== t.length)
    throw new Nc({
      expectedLength: e.length,
      givenLength: t.length
    });
  const s = Mh({
    checksumAddress: r,
    parameters: e,
    values: t
  }), o = go(s);
  return o.length === 0 ? "0x" : o;
}
function Es(e, t) {
  if (e.length !== t.length)
    throw new Nc({
      expectedLength: e.length,
      givenLength: t.length
    });
  const n = [];
  for (let r = 0; r < e.length; r++) {
    const s = e[r], o = t[r];
    n.push(Es.encode(s, o));
  }
  return Ee(...n);
}
(function(e) {
  function t(n, r, s = !1) {
    if (n === "address") {
      const c = r;
      return vr(c), dt(c.toLowerCase(), s ? 32 : 0);
    }
    if (n === "string")
      return oo(r);
    if (n === "bytes")
      return r;
    if (n === "bool")
      return dt(Ga(r), s ? 32 : 1);
    const o = n.match(Tc);
    if (o) {
      const [c, u, f = "256"] = o, d = Number.parseInt(f, 10) / 8;
      return ne(r, {
        size: s ? 32 : d,
        signed: u === "int"
      });
    }
    const i = n.match(Th);
    if (i) {
      const [c, u] = i;
      if (Number.parseInt(u, 10) !== (r.length - 2) / 2)
        throw new kc({
          expectedSize: Number.parseInt(u, 10),
          value: r
        });
      return lt(r, s ? 32 : 0);
    }
    const a = n.match(Bh);
    if (a && Array.isArray(r)) {
      const [c, u] = a, f = [];
      for (let d = 0; d < r.length; d++)
        f.push(t(u, r[d], !0));
      return f.length === 0 ? "0x" : Ee(...f);
    }
    throw new vo(n);
  }
  e.encode = t;
})(Es || (Es = {}));
function Cc(e) {
  return Array.isArray(e) && typeof e[0] == "string" || typeof e == "string" ? No(e) : e;
}
class Jh extends j {
  constructor({ data: t, parameters: n, size: r }) {
    super(`Data size of ${r} bytes is too small for given parameters.`, {
      metaMessages: [
        `Params: (${xt(n)})`,
        `Data:   ${t} (${r} bytes)`
      ]
    }), Object.defineProperty(this, "name", {
      enumerable: !0,
      configurable: !0,
      writable: !0,
      value: "AbiParameters.DataSizeTooSmallError"
    });
  }
}
class Yh extends j {
  constructor() {
    super('Cannot decode zero data ("0x") with ABI parameters.'), Object.defineProperty(this, "name", {
      enumerable: !0,
      configurable: !0,
      writable: !0,
      value: "AbiParameters.ZeroDataError"
    });
  }
}
class Xh extends j {
  constructor({ expectedLength: t, givenLength: n, type: r }) {
    super(`Array length mismatch for type \`${r}\`. Expected: \`${t}\`. Given: \`${n}\`.`), Object.defineProperty(this, "name", {
      enumerable: !0,
      configurable: !0,
      writable: !0,
      value: "AbiParameters.ArrayLengthMismatchError"
    });
  }
}
class kc extends j {
  constructor({ expectedSize: t, value: n }) {
    super(`Size of bytes "${n}" (bytes${pe(n)}) does not match expected size (bytes${t}).`), Object.defineProperty(this, "name", {
      enumerable: !0,
      configurable: !0,
      writable: !0,
      value: "AbiParameters.BytesSizeMismatchError"
    });
  }
}
class Nc extends j {
  constructor({ expectedLength: t, givenLength: n }) {
    super([
      "ABI encoding parameters/values length mismatch.",
      `Expected length (parameters): ${t}`,
      `Given length (values): ${n}`
    ].join(`
`)), Object.defineProperty(this, "name", {
      enumerable: !0,
      configurable: !0,
      writable: !0,
      value: "AbiParameters.LengthMismatchError"
    });
  }
}
class Qh extends j {
  constructor(t) {
    super(`Value \`${t}\` is not a valid array.`), Object.defineProperty(this, "name", {
      enumerable: !0,
      configurable: !0,
      writable: !0,
      value: "AbiParameters.InvalidArrayError"
    });
  }
}
class vo extends j {
  constructor(t) {
    super(`Type \`${t}\` is not a valid ABI Type.`), Object.defineProperty(this, "name", {
      enumerable: !0,
      configurable: !0,
      writable: !0,
      value: "AbiParameters.InvalidTypeError"
    });
  }
}
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const ie = BigInt(0), re = BigInt(1), rt = /* @__PURE__ */ BigInt(2), e1 = /* @__PURE__ */ BigInt(3), Fc = /* @__PURE__ */ BigInt(4), Oc = /* @__PURE__ */ BigInt(5), zc = /* @__PURE__ */ BigInt(8);
function oe(e, t) {
  const n = e % t;
  return n >= ie ? n : t + n;
}
function be(e, t, n) {
  let r = e;
  for (; t-- > ie; )
    r *= r, r %= n;
  return r;
}
function Ps(e, t) {
  if (e === ie)
    throw new Error("invert: expected non-zero number");
  if (t <= ie)
    throw new Error("invert: expected positive modulus, got " + t);
  let n = oe(e, t), r = t, s = ie, o = re;
  for (; n !== ie; ) {
    const a = r / n, c = r % n, u = s - o * a;
    r = n, n = c, s = o, o = u;
  }
  if (r !== re)
    throw new Error("invert: does not exist");
  return oe(s, t);
}
function Rc(e, t) {
  const n = (e.ORDER + re) / Fc, r = e.pow(t, n);
  if (!e.eql(e.sqr(r), t))
    throw new Error("Cannot find square root");
  return r;
}
function t1(e, t) {
  const n = (e.ORDER - Oc) / zc, r = e.mul(t, rt), s = e.pow(r, n), o = e.mul(t, s), i = e.mul(e.mul(o, rt), s), a = e.mul(o, e.sub(i, e.ONE));
  if (!e.eql(e.sqr(a), t))
    throw new Error("Cannot find square root");
  return a;
}
function n1(e) {
  if (e < BigInt(3))
    throw new Error("sqrt is not defined for small field");
  let t = e - re, n = 0;
  for (; t % rt === ie; )
    t /= rt, n++;
  let r = rt;
  const s = Eo(e);
  for (; gi(s, r) === 1; )
    if (r++ > 1e3)
      throw new Error("Cannot find square root: probably non-prime P");
  if (n === 1)
    return Rc;
  let o = s.pow(r, t);
  const i = (t + re) / rt;
  return function(c, u) {
    if (c.is0(u))
      return u;
    if (gi(c, u) !== 1)
      throw new Error("Cannot find square root");
    let f = n, d = c.mul(c.ONE, o), l = c.pow(u, t), h = c.pow(u, i);
    for (; !c.eql(l, c.ONE); ) {
      if (c.is0(l))
        return c.ZERO;
      let p = 1, b = c.sqr(l);
      for (; !c.eql(b, c.ONE); )
        if (p++, b = c.sqr(b), p === f)
          throw new Error("Cannot find square root");
      const x = re << BigInt(f - p - 1), g = c.pow(d, x);
      f = p, d = c.sqr(g), l = c.mul(l, d), h = c.mul(h, g);
    }
    return h;
  };
}
function r1(e) {
  return e % Fc === e1 ? Rc : e % zc === Oc ? t1 : n1(e);
}
const s1 = [
  "create",
  "isValid",
  "is0",
  "neg",
  "inv",
  "sqrt",
  "sqr",
  "eql",
  "add",
  "sub",
  "mul",
  "pow",
  "div",
  "addN",
  "subN",
  "mulN",
  "sqrN"
];
function o1(e) {
  const t = {
    ORDER: "bigint",
    MASK: "bigint",
    BYTES: "isSafeInteger",
    BITS: "isSafeInteger"
  }, n = s1.reduce((r, s) => (r[s] = "function", r), t);
  return lr(e, n);
}
function i1(e, t, n) {
  if (n < ie)
    throw new Error("invalid exponent, negatives unsupported");
  if (n === ie)
    return e.ONE;
  if (n === re)
    return t;
  let r = e.ONE, s = t;
  for (; n > ie; )
    n & re && (r = e.mul(r, s)), s = e.sqr(s), n >>= re;
  return r;
}
function Mc(e, t, n = !1) {
  const r = new Array(t.length).fill(n ? e.ZERO : void 0), s = t.reduce((i, a, c) => e.is0(a) ? i : (r[c] = i, e.mul(i, a)), e.ONE), o = e.inv(s);
  return t.reduceRight((i, a, c) => e.is0(a) ? i : (r[c] = e.mul(i, r[c]), e.mul(i, a)), o), r;
}
function gi(e, t) {
  const n = (e.ORDER - re) / rt, r = e.pow(t, n), s = e.eql(r, e.ONE), o = e.eql(r, e.ZERO), i = e.eql(r, e.neg(e.ONE));
  if (!s && !o && !i)
    throw new Error("invalid Legendre symbol result");
  return s ? 1 : o ? 0 : -1;
}
function Lc(e, t) {
  t !== void 0 && Xt(t);
  const n = t !== void 0 ? t : e.toString(2).length, r = Math.ceil(n / 8);
  return { nBitLength: n, nByteLength: r };
}
function Eo(e, t, n = !1, r = {}) {
  if (e <= ie)
    throw new Error("invalid field: expected ORDER > 0, got " + e);
  const { nBitLength: s, nByteLength: o } = Lc(e, t);
  if (o > 2048)
    throw new Error("invalid field: expected ORDER of <= 2048 bytes");
  let i;
  const a = Object.freeze({
    ORDER: e,
    isLE: n,
    BITS: s,
    BYTES: o,
    MASK: dr(s),
    ZERO: ie,
    ONE: re,
    create: (c) => oe(c, e),
    isValid: (c) => {
      if (typeof c != "bigint")
        throw new Error("invalid field element: expected bigint, got " + typeof c);
      return ie <= c && c < e;
    },
    is0: (c) => c === ie,
    isOdd: (c) => (c & re) === re,
    neg: (c) => oe(-c, e),
    eql: (c, u) => c === u,
    sqr: (c) => oe(c * c, e),
    add: (c, u) => oe(c + u, e),
    sub: (c, u) => oe(c - u, e),
    mul: (c, u) => oe(c * u, e),
    pow: (c, u) => i1(a, c, u),
    div: (c, u) => oe(c * Ps(u, e), e),
    // Same as above, but doesn't normalize
    sqrN: (c) => c * c,
    addN: (c, u) => c + u,
    subN: (c, u) => c - u,
    mulN: (c, u) => c * u,
    inv: (c) => Ps(c, e),
    sqrt: r.sqrt || ((c) => (i || (i = r1(e)), i(a, c))),
    toBytes: (c) => n ? za(c, o) : Rn(c, o),
    fromBytes: (c) => {
      if (c.length !== o)
        throw new Error("Field.fromBytes: expected " + o + " bytes, got " + c.length);
      return n ? Oa(c) : ot(c);
    },
    // TODO: we don't need it here, move out to separate fn
    invertBatch: (c) => Mc(a, c),
    // We can't move this out because Fp6, Fp12 implement it
    // and it's unclear what to return in there.
    cmov: (c, u, f) => f ? u : c
  });
  return Object.freeze(a);
}
function _c(e) {
  if (typeof e != "bigint")
    throw new Error("field order must be bigint");
  const t = e.toString(2).length;
  return Math.ceil(t / 8);
}
function jc(e) {
  const t = _c(e);
  return t + Math.ceil(t / 2);
}
function a1(e, t, n = !1) {
  const r = e.length, s = _c(t), o = jc(t);
  if (r < 16 || r < o || r > 1024)
    throw new Error("expected " + o + "-1024 bytes of input, got " + r);
  const i = n ? Oa(e) : ot(e), a = oe(i, t - re) + re;
  return n ? za(a, s) : Rn(a, s);
}
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const wi = BigInt(0), As = BigInt(1);
function Ur(e, t) {
  const n = t.negate();
  return e ? n : t;
}
function Uc(e, t) {
  if (!Number.isSafeInteger(e) || e <= 0 || e > t)
    throw new Error("invalid window size, expected [1.." + t + "], got W=" + e);
}
function Gr(e, t) {
  Uc(e, t);
  const n = Math.ceil(t / e) + 1, r = 2 ** (e - 1), s = 2 ** e, o = dr(e), i = BigInt(e);
  return { windows: n, windowSize: r, mask: o, maxNumber: s, shiftBy: i };
}
function xi(e, t, n) {
  const { windowSize: r, mask: s, maxNumber: o, shiftBy: i } = n;
  let a = Number(e & s), c = e >> i;
  a > r && (a -= o, c += As);
  const u = t * r, f = u + Math.abs(a) - 1, d = a === 0, l = a < 0, h = t % 2 !== 0;
  return { nextN: c, offset: f, isZero: d, isNeg: l, isNegF: h, offsetF: u };
}
function c1(e, t) {
  if (!Array.isArray(e))
    throw new Error("array expected");
  e.forEach((n, r) => {
    if (!(n instanceof t))
      throw new Error("invalid point at index " + r);
  });
}
function u1(e, t) {
  if (!Array.isArray(e))
    throw new Error("array of scalars expected");
  e.forEach((n, r) => {
    if (!t.isValid(n))
      throw new Error("invalid scalar at index " + r);
  });
}
const Dr = /* @__PURE__ */ new WeakMap(), Gc = /* @__PURE__ */ new WeakMap();
function Hr(e) {
  return Gc.get(e) || 1;
}
function f1(e, t) {
  return {
    constTimeNegate: Ur,
    hasPrecomputes(n) {
      return Hr(n) !== 1;
    },
    // non-const time multiplication ladder
    unsafeLadder(n, r, s = e.ZERO) {
      let o = n;
      for (; r > wi; )
        r & As && (s = s.add(o)), o = o.double(), r >>= As;
      return s;
    },
    /**
     * Creates a wNAF precomputation window. Used for caching.
     * Default window size is set by `utils.precompute()` and is equal to 8.
     * Number of precomputed points depends on the curve size:
     * 2^(𝑊−1) * (Math.ceil(𝑛 / 𝑊) + 1), where:
     * - 𝑊 is the window size
     * - 𝑛 is the bitlength of the curve order.
     * For a 256-bit curve and window size 8, the number of precomputed points is 128 * 33 = 4224.
     * @param elm Point instance
     * @param W window size
     * @returns precomputed point tables flattened to a single array
     */
    precomputeWindow(n, r) {
      const { windows: s, windowSize: o } = Gr(r, t), i = [];
      let a = n, c = a;
      for (let u = 0; u < s; u++) {
        c = a, i.push(c);
        for (let f = 1; f < o; f++)
          c = c.add(a), i.push(c);
        a = c.double();
      }
      return i;
    },
    /**
     * Implements ec multiplication using precomputed tables and w-ary non-adjacent form.
     * @param W window size
     * @param precomputes precomputed tables
     * @param n scalar (we don't check here, but should be less than curve order)
     * @returns real and fake (for const-time) points
     */
    wNAF(n, r, s) {
      let o = e.ZERO, i = e.BASE;
      const a = Gr(n, t);
      for (let c = 0; c < a.windows; c++) {
        const { nextN: u, offset: f, isZero: d, isNeg: l, isNegF: h, offsetF: p } = xi(s, c, a);
        s = u, d ? i = i.add(Ur(h, r[p])) : o = o.add(Ur(l, r[f]));
      }
      return { p: o, f: i };
    },
    /**
     * Implements ec unsafe (non const-time) multiplication using precomputed tables and w-ary non-adjacent form.
     * @param W window size
     * @param precomputes precomputed tables
     * @param n scalar (we don't check here, but should be less than curve order)
     * @param acc accumulator point to add result of multiplication
     * @returns point
     */
    wNAFUnsafe(n, r, s, o = e.ZERO) {
      const i = Gr(n, t);
      for (let a = 0; a < i.windows && s !== wi; a++) {
        const { nextN: c, offset: u, isZero: f, isNeg: d } = xi(s, a, i);
        if (s = c, !f) {
          const l = r[u];
          o = o.add(d ? l.negate() : l);
        }
      }
      return o;
    },
    getPrecomputes(n, r, s) {
      let o = Dr.get(r);
      return o || (o = this.precomputeWindow(r, n), n !== 1 && Dr.set(r, s(o))), o;
    },
    wNAFCached(n, r, s) {
      const o = Hr(n);
      return this.wNAF(o, this.getPrecomputes(o, n, s), r);
    },
    wNAFCachedUnsafe(n, r, s, o) {
      const i = Hr(n);
      return i === 1 ? this.unsafeLadder(n, r, o) : this.wNAFUnsafe(i, this.getPrecomputes(i, n, s), r, o);
    },
    // We calculate precomputes for elliptic curve point multiplication
    // using windowed method. This specifies window size and
    // stores precomputed values. Usually only base point would be precomputed.
    setWindowSize(n, r) {
      Uc(r, t), Gc.set(n, r), Dr.delete(n);
    }
  };
}
function d1(e, t, n, r) {
  c1(n, e), u1(r, t);
  const s = n.length, o = r.length;
  if (s !== o)
    throw new Error("arrays of points and scalars must have equal length");
  const i = e.ZERO, a = yd(BigInt(s));
  let c = 1;
  a > 12 ? c = a - 3 : a > 4 ? c = a - 2 : a > 0 && (c = 2);
  const u = dr(c), f = new Array(Number(u) + 1).fill(i), d = Math.floor((t.BITS - 1) / c) * c;
  let l = i;
  for (let h = d; h >= 0; h -= c) {
    f.fill(i);
    for (let b = 0; b < o; b++) {
      const x = r[b], g = Number(x >> BigInt(h) & u);
      f[g] = f[g].add(n[b]);
    }
    let p = i;
    for (let b = f.length - 1, x = i; b > 0; b--)
      x = x.add(f[b]), p = p.add(x);
    if (l = l.add(p), h !== 0)
      for (let b = 0; b < c; b++)
        l = l.double();
  }
  return l;
}
function Dc(e) {
  return o1(e.Fp), lr(e, {
    n: "bigint",
    h: "bigint",
    Gx: "field",
    Gy: "field"
  }, {
    nBitLength: "isSafeInteger",
    nByteLength: "isSafeInteger"
  }), Object.freeze({
    ...Lc(e.n, e.nBitLength),
    ...e,
    p: e.Fp.ORDER
  });
}
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
function vi(e) {
  e.lowS !== void 0 && En("lowS", e.lowS), e.prehash !== void 0 && En("prehash", e.prehash);
}
function l1(e) {
  const t = Dc(e);
  lr(t, {
    a: "field",
    b: "field"
  }, {
    allowInfinityPoint: "boolean",
    allowedPrivateKeyLengths: "array",
    clearCofactor: "function",
    fromBytes: "function",
    isTorsionFree: "function",
    toBytes: "function",
    wrapPrivateKey: "boolean"
  });
  const { endo: n, Fp: r, a: s } = t;
  if (n) {
    if (!r.eql(s, r.ZERO))
      throw new Error("invalid endo: CURVE.a must be 0");
    if (typeof n != "object" || typeof n.beta != "bigint" || typeof n.splitScalar != "function")
      throw new Error('invalid endo: expected "beta": bigint and "splitScalar": function');
  }
  return Object.freeze({ ...t });
}
class h1 extends Error {
  constructor(t = "") {
    super(t);
  }
}
const ze = {
  // asn.1 DER encoding utils
  Err: h1,
  // Basic building block is TLV (Tag-Length-Value)
  _tlv: {
    encode: (e, t) => {
      const { Err: n } = ze;
      if (e < 0 || e > 256)
        throw new n("tlv.encode: wrong tag");
      if (t.length & 1)
        throw new n("tlv.encode: unpadded data");
      const r = t.length / 2, s = Gn(r);
      if (s.length / 2 & 128)
        throw new n("tlv.encode: long form length too big");
      const o = r > 127 ? Gn(s.length / 2 | 128) : "";
      return Gn(e) + o + s + t;
    },
    // v - value, l - left bytes (unparsed)
    decode(e, t) {
      const { Err: n } = ze;
      let r = 0;
      if (e < 0 || e > 256)
        throw new n("tlv.encode: wrong tag");
      if (t.length < 2 || t[r++] !== e)
        throw new n("tlv.decode: wrong tlv");
      const s = t[r++], o = !!(s & 128);
      let i = 0;
      if (!o)
        i = s;
      else {
        const c = s & 127;
        if (!c)
          throw new n("tlv.decode(long): indefinite length not supported");
        if (c > 4)
          throw new n("tlv.decode(long): byte length is too big");
        const u = t.subarray(r, r + c);
        if (u.length !== c)
          throw new n("tlv.decode: length bytes not complete");
        if (u[0] === 0)
          throw new n("tlv.decode(long): zero leftmost byte");
        for (const f of u)
          i = i << 8 | f;
        if (r += c, i < 128)
          throw new n("tlv.decode(long): not minimal encoding");
      }
      const a = t.subarray(r, r + i);
      if (a.length !== i)
        throw new n("tlv.decode: wrong value length");
      return { v: a, l: t.subarray(r + i) };
    }
  },
  // https://crypto.stackexchange.com/a/57734 Leftmost bit of first byte is 'negative' flag,
  // since we always use positive integers here. It must always be empty:
  // - add zero byte if exists
  // - if next byte doesn't have a flag, leading zero is not allowed (minimal encoding)
  _int: {
    encode(e) {
      const { Err: t } = ze;
      if (e < Re)
        throw new t("integer: negative integers are not allowed");
      let n = Gn(e);
      if (Number.parseInt(n[0], 16) & 8 && (n = "00" + n), n.length & 1)
        throw new t("unexpected DER parsing assertion: unpadded hex");
      return n;
    },
    decode(e) {
      const { Err: t } = ze;
      if (e[0] & 128)
        throw new t("invalid signature integer: negative");
      if (e[0] === 0 && !(e[1] & 128))
        throw new t("invalid signature integer: unnecessary leading zero");
      return ot(e);
    }
  },
  toSig(e) {
    const { Err: t, _int: n, _tlv: r } = ze, s = ye("signature", e), { v: o, l: i } = r.decode(48, s);
    if (i.length)
      throw new t("invalid signature: left bytes after parsing");
    const { v: a, l: c } = r.decode(2, o), { v: u, l: f } = r.decode(2, c);
    if (f.length)
      throw new t("invalid signature: left bytes after parsing");
    return { r: n.decode(a), s: n.decode(u) };
  },
  hexFromSig(e) {
    const { _tlv: t, _int: n } = ze, r = t.encode(2, n.encode(e.r)), s = t.encode(2, n.encode(e.s)), o = r + s;
    return t.encode(48, o);
  }
};
function qr(e, t) {
  return Pn(Rn(e, t));
}
const Re = BigInt(0), Y = BigInt(1);
BigInt(2);
const Vr = BigInt(3), p1 = BigInt(4);
function b1(e) {
  const t = l1(e), { Fp: n } = t, r = Eo(t.n, t.nBitLength), s = t.toBytes || ((m, y, E) => {
    const $ = y.toAffine();
    return Yn(Uint8Array.from([4]), n.toBytes($.x), n.toBytes($.y));
  }), o = t.fromBytes || ((m) => {
    const y = m.subarray(1), E = n.fromBytes(y.subarray(0, n.BYTES)), $ = n.fromBytes(y.subarray(n.BYTES, 2 * n.BYTES));
    return { x: E, y: $ };
  });
  function i(m) {
    const { a: y, b: E } = t, $ = n.sqr(m), P = n.mul($, m);
    return n.add(n.add(P, n.mul(m, y)), E);
  }
  function a(m, y) {
    const E = n.sqr(y), $ = i(m);
    return n.eql(E, $);
  }
  if (!a(t.Gx, t.Gy))
    throw new Error("bad curve params: generator point");
  const c = n.mul(n.pow(t.a, Vr), p1), u = n.mul(n.sqr(t.b), BigInt(27));
  if (n.is0(n.add(c, u)))
    throw new Error("bad curve params: a or b");
  function f(m) {
    return so(m, Y, t.n);
  }
  function d(m) {
    const { allowedPrivateKeyLengths: y, nByteLength: E, wrapPrivateKey: $, n: P } = t;
    if (y && typeof m != "bigint") {
      if (zn(m) && (m = Pn(m)), typeof m != "string" || !y.includes(m.length))
        throw new Error("invalid private key");
      m = m.padStart(E * 2, "0");
    }
    let A;
    try {
      A = typeof m == "bigint" ? m : ot(ye("private key", m, E));
    } catch {
      throw new Error("invalid private key, expected hex or " + E + " bytes, got " + typeof m);
    }
    return $ && (A = oe(A, P)), It("private key", A, Y, P), A;
  }
  function l(m) {
    if (!(m instanceof b))
      throw new Error("ProjectivePoint expected");
  }
  const h = ri((m, y) => {
    const { px: E, py: $, pz: P } = m;
    if (n.eql(P, n.ONE))
      return { x: E, y: $ };
    const A = m.is0();
    y == null && (y = A ? n.ONE : n.inv(P));
    const C = n.mul(E, y), z = n.mul($, y), S = n.mul(P, y);
    if (A)
      return { x: n.ZERO, y: n.ZERO };
    if (!n.eql(S, n.ONE))
      throw new Error("invZ was invalid");
    return { x: C, y: z };
  }), p = ri((m) => {
    if (m.is0()) {
      if (t.allowInfinityPoint && !n.is0(m.py))
        return;
      throw new Error("bad point: ZERO");
    }
    const { x: y, y: E } = m.toAffine();
    if (!n.isValid(y) || !n.isValid(E))
      throw new Error("bad point: x or y not FE");
    if (!a(y, E))
      throw new Error("bad point: equation left != right");
    if (!m.isTorsionFree())
      throw new Error("bad point: not in prime-order subgroup");
    return !0;
  });
  class b {
    constructor(y, E, $) {
      if (y == null || !n.isValid(y))
        throw new Error("x required");
      if (E == null || !n.isValid(E) || n.is0(E))
        throw new Error("y required");
      if ($ == null || !n.isValid($))
        throw new Error("z required");
      this.px = y, this.py = E, this.pz = $, Object.freeze(this);
    }
    // Does not validate if the point is on-curve.
    // Use fromHex instead, or call assertValidity() later.
    static fromAffine(y) {
      const { x: E, y: $ } = y || {};
      if (!y || !n.isValid(E) || !n.isValid($))
        throw new Error("invalid affine point");
      if (y instanceof b)
        throw new Error("projective point not allowed");
      const P = (A) => n.eql(A, n.ZERO);
      return P(E) && P($) ? b.ZERO : new b(E, $, n.ONE);
    }
    get x() {
      return this.toAffine().x;
    }
    get y() {
      return this.toAffine().y;
    }
    /**
     * Takes a bunch of Projective Points but executes only one
     * inversion on all of them. Inversion is very slow operation,
     * so this improves performance massively.
     * Optimization: converts a list of projective points to a list of identical points with Z=1.
     */
    static normalizeZ(y) {
      const E = Mc(n, y.map(($) => $.pz));
      return y.map(($, P) => $.toAffine(E[P])).map(b.fromAffine);
    }
    /**
     * Converts hash string or Uint8Array to Point.
     * @param hex short/long ECDSA hex
     */
    static fromHex(y) {
      const E = b.fromAffine(o(ye("pointHex", y)));
      return E.assertValidity(), E;
    }
    // Multiplies generator point by privateKey.
    static fromPrivateKey(y) {
      return b.BASE.multiply(d(y));
    }
    // Multiscalar Multiplication
    static msm(y, E) {
      return d1(b, r, y, E);
    }
    // "Private method", don't use it directly
    _setWindowSize(y) {
      w.setWindowSize(this, y);
    }
    // A point on curve is valid if it conforms to equation.
    assertValidity() {
      p(this);
    }
    hasEvenY() {
      const { y } = this.toAffine();
      if (n.isOdd)
        return !n.isOdd(y);
      throw new Error("Field doesn't support isOdd");
    }
    /**
     * Compare one point to another.
     */
    equals(y) {
      l(y);
      const { px: E, py: $, pz: P } = this, { px: A, py: C, pz: z } = y, S = n.eql(n.mul(E, z), n.mul(A, P)), F = n.eql(n.mul($, z), n.mul(C, P));
      return S && F;
    }
    /**
     * Flips point to one corresponding to (x, -y) in Affine coordinates.
     */
    negate() {
      return new b(this.px, n.neg(this.py), this.pz);
    }
    // Renes-Costello-Batina exception-free doubling formula.
    // There is 30% faster Jacobian formula, but it is not complete.
    // https://eprint.iacr.org/2015/1060, algorithm 3
    // Cost: 8M + 3S + 3*a + 2*b3 + 15add.
    double() {
      const { a: y, b: E } = t, $ = n.mul(E, Vr), { px: P, py: A, pz: C } = this;
      let z = n.ZERO, S = n.ZERO, F = n.ZERO, k = n.mul(P, P), _ = n.mul(A, A), v = n.mul(C, C), T = n.mul(P, A);
      return T = n.add(T, T), F = n.mul(P, C), F = n.add(F, F), z = n.mul(y, F), S = n.mul($, v), S = n.add(z, S), z = n.sub(_, S), S = n.add(_, S), S = n.mul(z, S), z = n.mul(T, z), F = n.mul($, F), v = n.mul(y, v), T = n.sub(k, v), T = n.mul(y, T), T = n.add(T, F), F = n.add(k, k), k = n.add(F, k), k = n.add(k, v), k = n.mul(k, T), S = n.add(S, k), v = n.mul(A, C), v = n.add(v, v), k = n.mul(v, T), z = n.sub(z, k), F = n.mul(v, _), F = n.add(F, F), F = n.add(F, F), new b(z, S, F);
    }
    // Renes-Costello-Batina exception-free addition formula.
    // There is 30% faster Jacobian formula, but it is not complete.
    // https://eprint.iacr.org/2015/1060, algorithm 1
    // Cost: 12M + 0S + 3*a + 3*b3 + 23add.
    add(y) {
      l(y);
      const { px: E, py: $, pz: P } = this, { px: A, py: C, pz: z } = y;
      let S = n.ZERO, F = n.ZERO, k = n.ZERO;
      const _ = t.a, v = n.mul(t.b, Vr);
      let T = n.mul(E, A), O = n.mul($, C), B = n.mul(P, z), R = n.add(E, $), L = n.add(A, C);
      R = n.mul(R, L), L = n.add(T, O), R = n.sub(R, L), L = n.add(E, P);
      let U = n.add(A, z);
      return L = n.mul(L, U), U = n.add(T, B), L = n.sub(L, U), U = n.add($, P), S = n.add(C, z), U = n.mul(U, S), S = n.add(O, B), U = n.sub(U, S), k = n.mul(_, L), S = n.mul(v, B), k = n.add(S, k), S = n.sub(O, k), k = n.add(O, k), F = n.mul(S, k), O = n.add(T, T), O = n.add(O, T), B = n.mul(_, B), L = n.mul(v, L), O = n.add(O, B), B = n.sub(T, B), B = n.mul(_, B), L = n.add(L, B), T = n.mul(O, L), F = n.add(F, T), T = n.mul(U, L), S = n.mul(R, S), S = n.sub(S, T), T = n.mul(R, O), k = n.mul(U, k), k = n.add(k, T), new b(S, F, k);
    }
    subtract(y) {
      return this.add(y.negate());
    }
    is0() {
      return this.equals(b.ZERO);
    }
    wNAF(y) {
      return w.wNAFCached(this, y, b.normalizeZ);
    }
    /**
     * Non-constant-time multiplication. Uses double-and-add algorithm.
     * It's faster, but should only be used when you don't care about
     * an exposed private key e.g. sig verification, which works over *public* keys.
     */
    multiplyUnsafe(y) {
      const { endo: E, n: $ } = t;
      It("scalar", y, Re, $);
      const P = b.ZERO;
      if (y === Re)
        return P;
      if (this.is0() || y === Y)
        return this;
      if (!E || w.hasPrecomputes(this))
        return w.wNAFCachedUnsafe(this, y, b.normalizeZ);
      let { k1neg: A, k1: C, k2neg: z, k2: S } = E.splitScalar(y), F = P, k = P, _ = this;
      for (; C > Re || S > Re; )
        C & Y && (F = F.add(_)), S & Y && (k = k.add(_)), _ = _.double(), C >>= Y, S >>= Y;
      return A && (F = F.negate()), z && (k = k.negate()), k = new b(n.mul(k.px, E.beta), k.py, k.pz), F.add(k);
    }
    /**
     * Constant time multiplication.
     * Uses wNAF method. Windowed method may be 10% faster,
     * but takes 2x longer to generate and consumes 2x memory.
     * Uses precomputes when available.
     * Uses endomorphism for Koblitz curves.
     * @param scalar by which the point would be multiplied
     * @returns New point
     */
    multiply(y) {
      const { endo: E, n: $ } = t;
      It("scalar", y, Y, $);
      let P, A;
      if (E) {
        const { k1neg: C, k1: z, k2neg: S, k2: F } = E.splitScalar(y);
        let { p: k, f: _ } = this.wNAF(z), { p: v, f: T } = this.wNAF(F);
        k = w.constTimeNegate(C, k), v = w.constTimeNegate(S, v), v = new b(n.mul(v.px, E.beta), v.py, v.pz), P = k.add(v), A = _.add(T);
      } else {
        const { p: C, f: z } = this.wNAF(y);
        P = C, A = z;
      }
      return b.normalizeZ([P, A])[0];
    }
    /**
     * Efficiently calculate `aP + bQ`. Unsafe, can expose private key, if used incorrectly.
     * Not using Strauss-Shamir trick: precomputation tables are faster.
     * The trick could be useful if both P and Q are not G (not in our case).
     * @returns non-zero affine point
     */
    multiplyAndAddUnsafe(y, E, $) {
      const P = b.BASE, A = (z, S) => S === Re || S === Y || !z.equals(P) ? z.multiplyUnsafe(S) : z.multiply(S), C = A(this, E).add(A(y, $));
      return C.is0() ? void 0 : C;
    }
    // Converts Projective point to affine (x, y) coordinates.
    // Can accept precomputed Z^-1 - for example, from invertBatch.
    // (x, y, z) ∋ (x=x/z, y=y/z)
    toAffine(y) {
      return h(this, y);
    }
    isTorsionFree() {
      const { h: y, isTorsionFree: E } = t;
      if (y === Y)
        return !0;
      if (E)
        return E(b, this);
      throw new Error("isTorsionFree() has not been declared for the elliptic curve");
    }
    clearCofactor() {
      const { h: y, clearCofactor: E } = t;
      return y === Y ? this : E ? E(b, this) : this.multiplyUnsafe(t.h);
    }
    toRawBytes(y = !0) {
      return En("isCompressed", y), this.assertValidity(), s(b, this, y);
    }
    toHex(y = !0) {
      return En("isCompressed", y), Pn(this.toRawBytes(y));
    }
  }
  b.BASE = new b(t.Gx, t.Gy, n.ONE), b.ZERO = new b(n.ZERO, n.ONE, n.ZERO);
  const { endo: x, nBitLength: g } = t, w = f1(b, x ? Math.ceil(g / 2) : g);
  return {
    CURVE: t,
    ProjectivePoint: b,
    normPrivateKeyToScalar: d,
    weierstrassEquation: i,
    isWithinCurveOrder: f
  };
}
function y1(e) {
  const t = Dc(e);
  return lr(t, {
    hash: "hash",
    hmac: "function",
    randomBytes: "function"
  }, {
    bits2int: "function",
    bits2int_modN: "function",
    lowS: "boolean"
  }), Object.freeze({ lowS: !0, ...t });
}
function m1(e) {
  const t = y1(e), { Fp: n, n: r, nByteLength: s, nBitLength: o } = t, i = n.BYTES + 1, a = 2 * n.BYTES + 1;
  function c(v) {
    return oe(v, r);
  }
  function u(v) {
    return Ps(v, r);
  }
  const { ProjectivePoint: f, normPrivateKeyToScalar: d, weierstrassEquation: l, isWithinCurveOrder: h } = b1({
    ...t,
    toBytes(v, T, O) {
      const B = T.toAffine(), R = n.toBytes(B.x), L = Yn;
      return En("isCompressed", O), O ? L(Uint8Array.from([T.hasEvenY() ? 2 : 3]), R) : L(Uint8Array.from([4]), R, n.toBytes(B.y));
    },
    fromBytes(v) {
      const T = v.length, O = v[0], B = v.subarray(1);
      if (T === i && (O === 2 || O === 3)) {
        const R = ot(B);
        if (!so(R, Y, n.ORDER))
          throw new Error("Point is not on curve");
        const L = l(R);
        let U;
        try {
          U = n.sqrt(L);
        } catch (q) {
          const Z = q instanceof Error ? ": " + q.message : "";
          throw new Error("Point is not on curve" + Z);
        }
        const G = (U & Y) === Y;
        return (O & 1) === 1 !== G && (U = n.neg(U)), { x: R, y: U };
      } else if (T === a && O === 4) {
        const R = n.fromBytes(B.subarray(0, n.BYTES)), L = n.fromBytes(B.subarray(n.BYTES, 2 * n.BYTES));
        return { x: R, y: L };
      } else {
        const R = i, L = a;
        throw new Error("invalid Point, expected length of " + R + ", or uncompressed " + L + ", got " + T);
      }
    }
  });
  function p(v) {
    const T = r >> Y;
    return v > T;
  }
  function b(v) {
    return p(v) ? c(-v) : v;
  }
  const x = (v, T, O) => ot(v.slice(T, O));
  class g {
    constructor(T, O, B) {
      It("r", T, Y, r), It("s", O, Y, r), this.r = T, this.s = O, B != null && (this.recovery = B), Object.freeze(this);
    }
    // pair (bytes of r, bytes of s)
    static fromCompact(T) {
      const O = s;
      return T = ye("compactSignature", T, O * 2), new g(x(T, 0, O), x(T, O, 2 * O));
    }
    // DER encoded ECDSA signature
    // https://bitcoin.stackexchange.com/questions/57644/what-are-the-parts-of-a-bitcoin-transaction-input-script
    static fromDER(T) {
      const { r: O, s: B } = ze.toSig(ye("DER", T));
      return new g(O, B);
    }
    /**
     * @todo remove
     * @deprecated
     */
    assertValidity() {
    }
    addRecoveryBit(T) {
      return new g(this.r, this.s, T);
    }
    recoverPublicKey(T) {
      const { r: O, s: B, recovery: R } = this, L = P(ye("msgHash", T));
      if (R == null || ![0, 1, 2, 3].includes(R))
        throw new Error("recovery id invalid");
      const U = R === 2 || R === 3 ? O + t.n : O;
      if (U >= n.ORDER)
        throw new Error("recovery id 2 or 3 invalid");
      const G = R & 1 ? "03" : "02", W = f.fromHex(G + qr(U, n.BYTES)), q = u(U), Z = c(-L * q), te = c(B * q), De = f.BASE.multiplyAndAddUnsafe(W, Z, te);
      if (!De)
        throw new Error("point at infinify");
      return De.assertValidity(), De;
    }
    // Signatures should be low-s, to prevent malleability.
    hasHighS() {
      return p(this.s);
    }
    normalizeS() {
      return this.hasHighS() ? new g(this.r, c(-this.s), this.recovery) : this;
    }
    // DER-encoded
    toDERRawBytes() {
      return Jn(this.toDERHex());
    }
    toDERHex() {
      return ze.hexFromSig(this);
    }
    // padded bytes of r, then padded bytes of s
    toCompactRawBytes() {
      return Jn(this.toCompactHex());
    }
    toCompactHex() {
      const T = s;
      return qr(this.r, T) + qr(this.s, T);
    }
  }
  const w = {
    isValidPrivateKey(v) {
      try {
        return d(v), !0;
      } catch {
        return !1;
      }
    },
    normPrivateKeyToScalar: d,
    /**
     * Produces cryptographically secure private key from random of size
     * (groupLen + ceil(groupLen / 2)) with modulo bias being negligible.
     */
    randomPrivateKey: () => {
      const v = jc(t.n);
      return a1(t.randomBytes(v), t.n);
    },
    /**
     * Creates precompute table for an arbitrary EC point. Makes point "cached".
     * Allows to massively speed-up `point.multiply(scalar)`.
     * @returns cached point
     * @example
     * const fast = utils.precompute(8, ProjectivePoint.fromHex(someonesPubKey));
     * fast.multiply(privKey); // much faster ECDH now
     */
    precompute(v = 8, T = f.BASE) {
      return T._setWindowSize(v), T.multiply(BigInt(3)), T;
    }
  };
  function m(v, T = !0) {
    return f.fromPrivateKey(v).toRawBytes(T);
  }
  function y(v) {
    if (typeof v == "bigint")
      return !1;
    if (v instanceof f)
      return !0;
    const O = ye("key", v).length, B = n.BYTES, R = B + 1, L = 2 * B + 1;
    if (!(t.allowedPrivateKeyLengths || s === R))
      return O === R || O === L;
  }
  function E(v, T, O = !0) {
    if (y(v) === !0)
      throw new Error("first arg must be private key");
    if (y(T) === !1)
      throw new Error("second arg must be public key");
    return f.fromHex(T).multiply(d(v)).toRawBytes(O);
  }
  const $ = t.bits2int || function(v) {
    if (v.length > 8192)
      throw new Error("input is too large");
    const T = ot(v), O = v.length * 8 - o;
    return O > 0 ? T >> BigInt(O) : T;
  }, P = t.bits2int_modN || function(v) {
    return c($(v));
  }, A = dr(o);
  function C(v) {
    return It("num < 2^" + o, v, Re, A), Rn(v, s);
  }
  function z(v, T, O = S) {
    if (["recovered", "canonical"].some((et) => et in O))
      throw new Error("sign() legacy options not supported");
    const { hash: B, randomBytes: R } = t;
    let { lowS: L, prehash: U, extraEntropy: G } = O;
    L == null && (L = !0), v = ye("msgHash", v), vi(O), U && (v = ye("prehashed msgHash", B(v)));
    const W = P(v), q = d(T), Z = [C(q), C(W)];
    if (G != null && G !== !1) {
      const et = G === !0 ? R(n.BYTES) : G;
      Z.push(ye("extraEntropy", et));
    }
    const te = Yn(...Z), De = W;
    function Ar(et) {
      const yt = $(et);
      if (!h(yt))
        return;
      const $r = u(yt), Ht = f.BASE.multiply(yt).toAffine(), tt = c(Ht.x);
      if (tt === Re)
        return;
      const qt = c($r * c(De + tt * q));
      if (qt === Re)
        return;
      let Vt = (Ht.x === tt ? 0 : 2) | Number(Ht.y & Y), mt = qt;
      return L && p(qt) && (mt = b(qt), Vt ^= 1), new g(tt, mt, Vt);
    }
    return { seed: te, k2sig: Ar };
  }
  const S = { lowS: t.lowS, prehash: !1 }, F = { lowS: t.lowS, prehash: !1 };
  function k(v, T, O = S) {
    const { seed: B, k2sig: R } = z(v, T, O), L = t;
    return md(L.hash.outputLen, L.nByteLength, L.hmac)(B, R);
  }
  f.BASE._setWindowSize(8);
  function _(v, T, O, B = F) {
    var Vt;
    const R = v;
    T = ye("msgHash", T), O = ye("publicKey", O);
    const { lowS: L, prehash: U, format: G } = B;
    if (vi(B), "strict" in B)
      throw new Error("options.strict was renamed to lowS");
    if (G !== void 0 && G !== "compact" && G !== "der")
      throw new Error("format must be compact or der");
    const W = typeof R == "string" || zn(R), q = !W && !G && typeof R == "object" && R !== null && typeof R.r == "bigint" && typeof R.s == "bigint";
    if (!W && !q)
      throw new Error("invalid signature, expected Uint8Array, hex string or Signature instance");
    let Z, te;
    try {
      if (q && (Z = new g(R.r, R.s)), W) {
        try {
          G !== "compact" && (Z = g.fromDER(R));
        } catch (mt) {
          if (!(mt instanceof ze.Err))
            throw mt;
        }
        !Z && G !== "der" && (Z = g.fromCompact(R));
      }
      te = f.fromHex(O);
    } catch {
      return !1;
    }
    if (!Z || L && Z.hasHighS())
      return !1;
    U && (T = t.hash(T));
    const { r: De, s: Ar } = Z, et = P(T), yt = u(Ar), $r = c(et * yt), Ht = c(De * yt), tt = (Vt = f.BASE.multiplyAndAddUnsafe(te, $r, Ht)) == null ? void 0 : Vt.toAffine();
    return tt ? c(tt.x) === De : !1;
  }
  return {
    CURVE: t,
    getPublicKey: m,
    getSharedSecret: E,
    sign: k,
    verify: _,
    ProjectivePoint: f,
    Signature: g,
    utils: w
  };
}
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
function g1(e) {
  return {
    hash: e,
    hmac: (t, ...n) => Ic(e, t, N0(...n)),
    randomBytes: F0
  };
}
function w1(e, t) {
  const n = (r) => m1({ ...e, ...g1(r) });
  return { ...n(t), create: n };
}
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const Hc = BigInt("0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2f"), Ei = BigInt("0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141"), x1 = BigInt(0), v1 = BigInt(1), $s = BigInt(2), Pi = (e, t) => (e + t / $s) / t;
function E1(e) {
  const t = Hc, n = BigInt(3), r = BigInt(6), s = BigInt(11), o = BigInt(22), i = BigInt(23), a = BigInt(44), c = BigInt(88), u = e * e * e % t, f = u * u * e % t, d = be(f, n, t) * f % t, l = be(d, n, t) * f % t, h = be(l, $s, t) * u % t, p = be(h, s, t) * h % t, b = be(p, o, t) * p % t, x = be(b, a, t) * b % t, g = be(x, c, t) * x % t, w = be(g, a, t) * b % t, m = be(w, n, t) * f % t, y = be(m, i, t) * p % t, E = be(y, r, t) * u % t, $ = be(E, $s, t);
  if (!Is.eql(Is.sqr($), e))
    throw new Error("Cannot find square root");
  return $;
}
const Is = Eo(Hc, void 0, void 0, { sqrt: E1 }), qc = w1({
  a: x1,
  b: BigInt(7),
  Fp: Is,
  n: Ei,
  Gx: BigInt("55066263022277343669578718895168534326250603453777594175500187360389116729240"),
  Gy: BigInt("32670510020758816978083085130507043184471273380659243275938904335757337482424"),
  h: BigInt(1),
  lowS: !0,
  // Allow only low-S signatures by default in sign() and verify()
  endo: {
    // Endomorphism, see above
    beta: BigInt("0x7ae96a2b657c07106e64479eac3434e99cf0497512f58995c1396c28719501ee"),
    splitScalar: (e) => {
      const t = Ei, n = BigInt("0x3086d221a7d46bcde86c90e49284eb15"), r = -v1 * BigInt("0xe4437ed6010e88286f547fa90abfe4c3"), s = BigInt("0x114ca50f7a8e2f3f657c1108d9d44cfd8"), o = n, i = BigInt("0x100000000000000000000000000000000"), a = Pi(o * e, t), c = Pi(-r * e, t);
      let u = oe(e - a * n - c * s, t), f = oe(-a * r - c * o, t);
      const d = u > i, l = f > i;
      if (d && (u = t - u), l && (f = t - f), u > i || f > i)
        throw new Error("splitScalar: Endomorphism failed, k=" + e);
      return { k1neg: d, k1: u, k2neg: l, k2: f };
    }
  }
}, Pa), P1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  secp256k1: qc
}, Symbol.toStringTag, { value: "Module" }));
function Vc(e, t = {}) {
  const { recovered: n } = t;
  if (typeof e.r > "u")
    throw new Wr({ signature: e });
  if (typeof e.s > "u")
    throw new Wr({ signature: e });
  if (n && typeof e.yParity > "u")
    throw new Wr({ signature: e });
  if (e.r < 0n || e.r > bi)
    throw new C1({ value: e.r });
  if (e.s < 0n || e.s > bi)
    throw new k1({ value: e.s });
  if (typeof e.yParity == "number" && e.yParity !== 0 && e.yParity !== 1)
    throw new Ao({ value: e.yParity });
}
function A1(e) {
  return Wc(Pe(e));
}
function Wc(e) {
  if (e.length !== 130 && e.length !== 132)
    throw new T1({ signature: e });
  const t = BigInt(Be(e, 0, 32)), n = BigInt(Be(e, 32, 64)), r = (() => {
    const s = +`0x${e.slice(130)}`;
    if (!Number.isNaN(s))
      try {
        return Po(s);
      } catch {
        throw new Ao({ value: s });
      }
  })();
  return typeof r > "u" ? {
    r: t,
    s: n
  } : {
    r: t,
    s: n,
    yParity: r
  };
}
function $1(e) {
  if (!(typeof e.r > "u") && !(typeof e.s > "u"))
    return I1(e);
}
function I1(e) {
  const t = typeof e == "string" ? Wc(e) : e instanceof Uint8Array ? A1(e) : typeof e.r == "string" ? B1(e) : e.v ? S1(e) : {
    r: e.r,
    s: e.s,
    ...typeof e.yParity < "u" ? { yParity: e.yParity } : {}
  };
  return Vc(t), t;
}
function S1(e) {
  return {
    r: e.r,
    s: e.s,
    yParity: Po(e.v)
  };
}
function B1(e) {
  const t = (() => {
    const n = e.v ? Number(e.v) : void 0;
    let r = e.yParity ? Number(e.yParity) : void 0;
    if (typeof n == "number" && typeof r != "number" && (r = Po(n)), typeof r != "number")
      throw new Ao({ value: e.yParity });
    return r;
  })();
  return {
    r: BigInt(e.r),
    s: BigInt(e.s),
    yParity: t
  };
}
function Po(e) {
  if (e === 0 || e === 27)
    return 0;
  if (e === 1 || e === 28)
    return 1;
  if (e >= 35)
    return e % 2 === 0 ? 1 : 0;
  throw new N1({ value: e });
}
class T1 extends j {
  constructor({ signature: t }) {
    super(`Value \`${t}\` is an invalid signature size.`, {
      metaMessages: [
        "Expected: 64 bytes or 65 bytes.",
        `Received ${pe(Gd(t))} bytes.`
      ]
    }), Object.defineProperty(this, "name", {
      enumerable: !0,
      configurable: !0,
      writable: !0,
      value: "Signature.InvalidSerializedSizeError"
    });
  }
}
class Wr extends j {
  constructor({ signature: t }) {
    super(`Signature \`${_a(t)}\` is missing either an \`r\`, \`s\`, or \`yParity\` property.`), Object.defineProperty(this, "name", {
      enumerable: !0,
      configurable: !0,
      writable: !0,
      value: "Signature.MissingPropertiesError"
    });
  }
}
class C1 extends j {
  constructor({ value: t }) {
    super(`Value \`${t}\` is an invalid r value. r must be a positive integer less than 2^256.`), Object.defineProperty(this, "name", {
      enumerable: !0,
      configurable: !0,
      writable: !0,
      value: "Signature.InvalidRError"
    });
  }
}
class k1 extends j {
  constructor({ value: t }) {
    super(`Value \`${t}\` is an invalid s value. s must be a positive integer less than 2^256.`), Object.defineProperty(this, "name", {
      enumerable: !0,
      configurable: !0,
      writable: !0,
      value: "Signature.InvalidSError"
    });
  }
}
class Ao extends j {
  constructor({ value: t }) {
    super(`Value \`${t}\` is an invalid y-parity value. Y-parity must be 0 or 1.`), Object.defineProperty(this, "name", {
      enumerable: !0,
      configurable: !0,
      writable: !0,
      value: "Signature.InvalidYParityError"
    });
  }
}
class N1 extends j {
  constructor({ value: t }) {
    super(`Value \`${t}\` is an invalid v value. v must be 27, 28 or >=35.`), Object.defineProperty(this, "name", {
      enumerable: !0,
      configurable: !0,
      writable: !0,
      value: "Signature.InvalidVError"
    });
  }
}
function F1(e, t = {}) {
  return typeof e.chainId == "string" ? O1(e) : { ...e, ...t.signature };
}
function O1(e) {
  const { address: t, chainId: n, nonce: r } = e, s = $1(e);
  return {
    address: t,
    chainId: Number(n),
    nonce: BigInt(r),
    ...s
  };
}
const z1 = "0x8010801080108010801080108010801080108010801080108010801080108010", R1 = Cc("(uint256 chainId, address delegation, uint256 nonce, uint8 yParity, uint256 r, uint256 s), address to, bytes data");
function Zc(e) {
  if (typeof e == "string") {
    if (Be(e, -32) !== z1)
      throw new _1(e);
  } else
    Vc(e.authorization);
}
function M1(e) {
  Zc(e);
  const t = Ha(Be(e, -64, -32)), n = Be(e, -t - 64, -64), r = Be(e, 0, -t - 64), [s, o, i] = Kh(R1, n);
  return {
    authorization: F1({
      address: s.delegation,
      chainId: Number(s.chainId),
      nonce: s.nonce,
      yParity: s.yParity,
      r: s.r,
      s: s.s
    }),
    signature: r,
    ...i && i !== "0x" ? { data: i, to: o } : {}
  };
}
function L1(e) {
  try {
    return Zc(e), !0;
  } catch {
    return !1;
  }
}
let _1 = class extends j {
  constructor(t) {
    super(`Value \`${t}\` is an invalid ERC-8010 wrapped signature.`), Object.defineProperty(this, "name", {
      enumerable: !0,
      configurable: !0,
      writable: !0,
      value: "SignatureErc8010.InvalidWrappedSignatureError"
    });
  }
};
function j1(e) {
  return e.map((t) => ({
    ...t,
    value: BigInt(t.value)
  }));
}
function U1(e) {
  return {
    ...e,
    balance: e.balance ? BigInt(e.balance) : void 0,
    nonce: e.nonce ? ge(e.nonce) : void 0,
    storageProof: e.storageProof ? j1(e.storageProof) : void 0
  };
}
async function G1(e, { address: t, blockNumber: n, blockTag: r, storageKeys: s }) {
  const o = r ?? "latest", i = n !== void 0 ? N(n) : void 0, a = await e.request({
    method: "eth_getProof",
    params: [t, s, i || o]
  });
  return U1(a);
}
async function D1(e, { address: t, blockNumber: n, blockTag: r = "latest", slot: s }) {
  const o = n !== void 0 ? N(n) : void 0;
  return await e.request({
    method: "eth_getStorageAt",
    params: [t, s, o || r]
  });
}
async function $o(e, { blockHash: t, blockNumber: n, blockTag: r, hash: s, index: o, sender: i, nonce: a }) {
  var l, h, p;
  const c = r || "latest", u = n !== void 0 ? N(n) : void 0;
  let f = null;
  if (s ? f = await e.request({
    method: "eth_getTransactionByHash",
    params: [s]
  }, { dedupe: !0 }) : t ? f = await e.request({
    method: "eth_getTransactionByBlockHashAndIndex",
    params: [t, N(o)]
  }, { dedupe: !0 }) : typeof o == "number" ? f = await e.request({
    method: "eth_getTransactionByBlockNumberAndIndex",
    params: [u || c, N(o)]
  }, { dedupe: !!u }) : i && typeof a == "number" && (f = await e.request({
    method: "eth_getTransactionBySenderAndNonce",
    params: [i, N(a)]
  }, { dedupe: !0 })), !f)
    throw new la({
      blockHash: t,
      blockNumber: n,
      blockTag: c,
      hash: s,
      index: o
    });
  return (((p = (h = (l = e.chain) == null ? void 0 : l.formatters) == null ? void 0 : h.transaction) == null ? void 0 : p.format) || Fn)(f, "getTransaction");
}
async function H1(e, { hash: t, transactionReceipt: n }) {
  const [r, s] = await Promise.all([
    M(e, _n, "getBlockNumber")({}),
    t ? M(e, $o, "getTransaction")({ hash: t }) : void 0
  ]), o = (n == null ? void 0 : n.blockNumber) || (s == null ? void 0 : s.blockNumber);
  return o ? r - o + 1n : 0n;
}
async function Vn(e, { hash: t }) {
  var s, o, i;
  const n = await e.request({
    method: "eth_getTransactionReceipt",
    params: [t]
  }, { dedupe: !0 });
  if (!n)
    throw new ha({ hash: t });
  return (((i = (o = (s = e.chain) == null ? void 0 : s.formatters) == null ? void 0 : o.transactionReceipt) == null ? void 0 : i.format) || fo)(n, "getTransactionReceipt");
}
async function q1(e, t) {
  var w;
  const { account: n, authorizationList: r, allowFailure: s = !0, blockNumber: o, blockOverrides: i, blockTag: a, stateOverride: c } = t, u = t.contracts, { batchSize: f = t.batchSize ?? 1024, deployless: d = t.deployless ?? !1 } = typeof ((w = e.batch) == null ? void 0 : w.multicall) == "object" ? e.batch.multicall : {}, l = (() => {
    if (t.multicallAddress)
      return t.multicallAddress;
    if (d)
      return null;
    if (e.chain)
      return Gt({
        blockNumber: o,
        chain: e.chain,
        contract: "multicall3"
      });
    throw new Error("client chain not configured. multicallAddress is required.");
  })(), h = [[]];
  let p = 0, b = 0;
  for (let m = 0; m < u.length; m++) {
    const { abi: y, address: E, args: $, functionName: P } = u[m];
    try {
      const A = fe({ abi: y, args: $, functionName: P });
      b += (A.length - 2) / 2, // Check if batching is enabled.
      f > 0 && // Check if the current size of the batch exceeds the size limit.
      b > f && // Check if the current chunk is not already empty.
      h[p].length > 0 && (p++, b = (A.length - 2) / 2, h[p] = []), h[p] = [
        ...h[p],
        {
          allowFailure: !0,
          callData: A,
          target: E
        }
      ];
    } catch (A) {
      const C = ut(A, {
        abi: y,
        address: E,
        args: $,
        docsPath: "/docs/contract/multicall",
        functionName: P,
        sender: n
      });
      if (!s)
        throw C;
      h[p] = [
        ...h[p],
        {
          allowFailure: !0,
          callData: "0x",
          target: E
        }
      ];
    }
  }
  const x = await Promise.allSettled(h.map((m) => M(e, Ae, "readContract")({
    ...l === null ? { code: io } : { address: l },
    abi: Rt,
    account: n,
    args: [m],
    authorizationList: r,
    blockNumber: o,
    blockOverrides: i,
    blockTag: a,
    functionName: "aggregate3",
    stateOverride: c
  }))), g = [];
  for (let m = 0; m < x.length; m++) {
    const y = x[m];
    if (y.status === "rejected") {
      if (!s)
        throw y.reason;
      for (let $ = 0; $ < h[m].length; $++)
        g.push({
          status: "failure",
          error: y.reason,
          result: void 0
        });
      continue;
    }
    const E = y.value;
    for (let $ = 0; $ < E.length; $++) {
      const { returnData: P, success: A } = E[$], { callData: C } = h[m][$], { abi: z, address: S, functionName: F, args: k } = u[g.length];
      try {
        if (C === "0x")
          throw new In();
        if (!A)
          throw new ir({ data: P });
        const _ = Xe({
          abi: z,
          args: k,
          data: P,
          functionName: F
        });
        g.push(s ? { result: _, status: "success" } : _);
      } catch (_) {
        const v = ut(_, {
          abi: z,
          address: S,
          args: k,
          docsPath: "/docs/contract/multicall",
          functionName: F
        });
        if (!s)
          throw v;
        g.push({ error: v, result: void 0, status: "failure" });
      }
    }
  }
  if (g.length !== u.length)
    throw new I("multicall results mismatch");
  return g;
}
async function Ss(e, t) {
  const { blockNumber: n, blockTag: r = e.experimental_blockTag ?? "latest", blocks: s, returnFullTransactions: o, traceTransfers: i, validation: a } = t;
  try {
    const c = [];
    for (const l of s) {
      const h = l.blockOverrides ? Wa(l.blockOverrides) : void 0, p = l.calls.map((x) => {
        const g = x, w = g.account ? H(g.account) : void 0, m = g.abi ? fe(g) : g.data, y = {
          ...g,
          account: w,
          data: g.dataSuffix ? ee([m || "0x", g.dataSuffix]) : m,
          from: g.from ?? (w == null ? void 0 : w.address)
        };
        return Ge(y), Je(y);
      }), b = l.stateOverrides ? Ds(l.stateOverrides) : void 0;
      c.push({
        blockOverrides: h,
        calls: p,
        stateOverrides: b
      });
    }
    const f = (typeof n == "bigint" ? N(n) : void 0) || r;
    return (await e.request({
      method: "eth_simulateV1",
      params: [
        { blockStateCalls: c, returnFullTransactions: o, traceTransfers: i, validation: a },
        f
      ]
    })).map((l, h) => ({
      ...qs(l),
      calls: l.calls.map((p, b) => {
        var z, S;
        const { abi: x, args: g, functionName: w, to: m } = s[h].calls[b], y = ((z = p.error) == null ? void 0 : z.data) ?? p.returnData, E = BigInt(p.gasUsed), $ = (S = p.logs) == null ? void 0 : S.map((F) => ke(F)), P = p.status === "0x1" ? "success" : "failure", A = x && P === "success" && y !== "0x" ? Xe({
          abi: x,
          data: y,
          functionName: w
        }) : null, C = (() => {
          if (P === "success")
            return;
          let F;
          if (y === "0x" ? F = new In() : y && (F = new ir({ data: y })), !!F)
            return ut(F, {
              abi: x ?? [],
              address: m ?? "0x",
              args: g,
              functionName: w ?? "<unknown>"
            });
        })();
        return {
          data: y,
          gasUsed: E,
          logs: $,
          status: P,
          ...P === "success" ? {
            result: A
          } : {
            error: C
          }
        };
      })
    }));
  } catch (c) {
    const u = c, f = cr(u, {});
    throw f instanceof Nn ? u : f;
  }
}
function Bs(e) {
  let t = !0, n = "", r = 0, s = "", o = !1;
  for (let i = 0; i < e.length; i++) {
    const a = e[i];
    if (["(", ")", ","].includes(a) && (t = !0), a === "(" && r++, a === ")" && r--, !!t) {
      if (r === 0) {
        if (a === " " && ["event", "function", "error", ""].includes(s))
          s = "";
        else if (s += a, a === ")") {
          o = !0;
          break;
        }
        continue;
      }
      if (a === " ") {
        e[i - 1] !== "," && n !== "," && n !== ",(" && (n = "", t = !1);
        continue;
      }
      s += a, n += a;
    }
  }
  if (!o)
    throw new j("Unable to normalize signature.");
  return s;
}
function Ts(e, t) {
  const n = typeof e, r = t.type;
  switch (r) {
    case "address":
      return xs(e, { strict: !1 });
    case "bool":
      return n === "boolean";
    case "function":
      return n === "string";
    case "string":
      return n === "string";
    default:
      return r === "tuple" && "components" in t ? Object.values(t.components).every((s, o) => Ts(Object.values(e)[o], s)) : /^u?int(8|16|24|32|40|48|56|64|72|80|88|96|104|112|120|128|136|144|152|160|168|176|184|192|200|208|216|224|232|240|248|256)?$/.test(r) ? n === "number" || n === "bigint" : /^bytes([1-9]|1[0-9]|2[0-9]|3[0-2])?$/.test(r) ? n === "string" || e instanceof Uint8Array : /[a-z]+[1-9]{0,3}(\[[0-9]{0,}\])+$/.test(r) ? Array.isArray(e) && e.every((s) => Ts(s, {
        ...t,
        // Pop off `[]` or `[M]` from end of type
        type: r.replace(/(\[[0-9]{0,}\])$/, "")
      })) : !1;
  }
}
function Kc(e, t, n) {
  for (const r in e) {
    const s = e[r], o = t[r];
    if (s.type === "tuple" && o.type === "tuple" && "components" in s && "components" in o)
      return Kc(s.components, o.components, n[r]);
    const i = [s.type, o.type];
    if (i.includes("address") && i.includes("bytes20") ? !0 : i.includes("address") && i.includes("string") ? xs(n[r], {
      strict: !1
    }) : i.includes("address") && i.includes("bytes") ? xs(n[r], {
      strict: !1
    }) : !1)
      return i;
  }
}
function Jc(e, t = {}) {
  const { prepare: n = !0 } = t, r = Array.isArray(e) || typeof e == "string" ? ko(e) : e;
  return {
    ...r,
    ...n ? { hash: Pt(r) } : {}
  };
}
function Er(e, t, n) {
  const { args: r = [], prepare: s = !0 } = n ?? {}, o = Dd(t, { strict: !1 }), i = e.filter((u) => o ? u.type === "function" || u.type === "error" ? Yc(u) === Be(t, 0, 4) : u.type === "event" ? Pt(u) === t : !1 : "name" in u && u.name === t);
  if (i.length === 0)
    throw new er({ name: t });
  if (i.length === 1)
    return {
      ...i[0],
      ...s ? { hash: Pt(i[0]) } : {}
    };
  let a;
  for (const u of i) {
    if (!("inputs" in u))
      continue;
    if (!r || r.length === 0) {
      if (!u.inputs || u.inputs.length === 0)
        return {
          ...u,
          ...s ? { hash: Pt(u) } : {}
        };
      continue;
    }
    if (!u.inputs || u.inputs.length === 0 || u.inputs.length !== r.length)
      continue;
    if (r.every((d, l) => {
      const h = "inputs" in u && u.inputs[l];
      return h ? Ts(d, h) : !1;
    })) {
      if (a && "inputs" in a && a.inputs) {
        const d = Kc(u.inputs, a.inputs, r);
        if (d)
          throw new W1({
            abiItem: u,
            type: d[0]
          }, {
            abiItem: a,
            type: d[1]
          });
      }
      a = u;
    }
  }
  const c = (() => {
    if (a)
      return a;
    const [u, ...f] = i;
    return { ...u, overloads: f };
  })();
  if (!c)
    throw new er({ name: t });
  return {
    ...c,
    ...s ? { hash: Pt(c) } : {}
  };
}
function Yc(...e) {
  const t = (() => {
    if (Array.isArray(e[0])) {
      const [n, r] = e;
      return Er(n, r);
    }
    return e[0];
  })();
  return Be(Pt(t), 0, 4);
}
function V1(...e) {
  const t = (() => {
    if (Array.isArray(e[0])) {
      const [r, s] = e;
      return Er(r, s);
    }
    return e[0];
  })(), n = typeof t == "string" ? t : Wn(t);
  return Bs(n);
}
function Pt(...e) {
  const t = (() => {
    if (Array.isArray(e[0])) {
      const [n, r] = e;
      return Er(n, r);
    }
    return e[0];
  })();
  return typeof t != "string" && "hash" in t && t.hash ? t.hash : Sc(oo(V1(t)));
}
class W1 extends j {
  constructor(t, n) {
    super("Found ambiguous types in overloaded ABI Items.", {
      metaMessages: [
        // TODO: abitype to add support for signature-formatted ABI items.
        `\`${t.type}\` in \`${Bs(Wn(t.abiItem))}\`, and`,
        `\`${n.type}\` in \`${Bs(Wn(n.abiItem))}\``,
        "",
        "These types encode differently and cannot be distinguished at runtime.",
        "Remove one of the ambiguous items in the ABI."
      ]
    }), Object.defineProperty(this, "name", {
      enumerable: !0,
      configurable: !0,
      writable: !0,
      value: "AbiItem.AmbiguityError"
    });
  }
}
class er extends j {
  constructor({ name: t, data: n, type: r = "item" }) {
    const s = t ? ` with name "${t}"` : n ? ` with data "${n}"` : "";
    super(`ABI ${r}${s} not found.`), Object.defineProperty(this, "name", {
      enumerable: !0,
      configurable: !0,
      writable: !0,
      value: "AbiItem.NotFoundError"
    });
  }
}
function Z1(...e) {
  var o;
  const [t, n] = (() => {
    if (Array.isArray(e[0])) {
      const [i, a] = e;
      return [J1(i), a];
    }
    return e;
  })(), { bytecode: r, args: s } = n;
  return Ee(r, (o = t.inputs) != null && o.length && (s != null && s.length) ? xo(t.inputs, s) : "0x");
}
function K1(e) {
  return Jc(e);
}
function J1(e) {
  const t = e.find((n) => n.type === "constructor");
  if (!t)
    throw new er({ name: "constructor" });
  return t;
}
function Y1(...e) {
  const [t, n = []] = (() => {
    if (Array.isArray(e[0])) {
      const [u, f, d] = e;
      return [Ai(u, f, { args: d }), d];
    }
    const [a, c] = e;
    return [a, c];
  })(), { overloads: r } = t, s = r ? Ai([t, ...r], t.name, {
    args: n
  }) : t, o = X1(s), i = n.length > 0 ? xo(s.inputs, n) : void 0;
  return i ? Ee(o, i) : o;
}
function wt(e, t = {}) {
  return Jc(e, t);
}
function Ai(e, t, n) {
  const r = Er(e, t, n);
  if (r.type !== "function")
    throw new er({ name: t, type: "function" });
  return r;
}
function X1(e) {
  return Yc(e);
}
const Q1 = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee", we = "0x0000000000000000000000000000000000000000", ep = "0x6080604052348015600e575f80fd5b5061016d8061001c5f395ff3fe608060405234801561000f575f80fd5b5060043610610029575f3560e01c8063f8b2cb4f1461002d575b5f80fd5b610047600480360381019061004291906100db565b61005d565b604051610054919061011e565b60405180910390f35b5f8173ffffffffffffffffffffffffffffffffffffffff16319050919050565b5f80fd5b5f73ffffffffffffffffffffffffffffffffffffffff82169050919050565b5f6100aa82610081565b9050919050565b6100ba816100a0565b81146100c4575f80fd5b50565b5f813590506100d5816100b1565b92915050565b5f602082840312156100f0576100ef61007d565b5b5f6100fd848285016100c7565b91505092915050565b5f819050919050565b61011881610106565b82525050565b5f6020820190506101315f83018461010f565b9291505056fea26469706673582212203b9fe929fe995c7cf9887f0bdba8a36dd78e8b73f149b17d2d9ad7cd09d2dc6264736f6c634300081a0033";
async function tp(e, t) {
  const { blockNumber: n, blockTag: r, calls: s, stateOverrides: o, traceAssetChanges: i, traceTransfers: a, validation: c } = t, u = t.account ? H(t.account) : void 0;
  if (i && !u)
    throw new I("`account` is required when `traceAssetChanges` is true");
  const f = u ? Z1(K1("constructor(bytes, bytes)"), {
    bytecode: Ya,
    args: [
      ep,
      Y1(wt("function getBalance(address)"), [u.address])
    ]
  }) : void 0, d = i ? await Promise.all(t.calls.map(async (B) => {
    if (!B.data && !B.abi)
      return;
    const { accessList: R } = await pc(e, {
      account: u.address,
      ...B,
      data: B.abi ? fe(B) : B.data
    });
    return R.map(({ address: L, storageKeys: U }) => U.length > 0 ? L : null);
  })).then((B) => B.flat().filter(Boolean)) : [], l = await Ss(e, {
    blockNumber: n,
    blockTag: r,
    blocks: [
      ...i ? [
        // ETH pre balances
        {
          calls: [{ data: f }],
          stateOverrides: o
        },
        // Asset pre balances
        {
          calls: d.map((B, R) => ({
            abi: [
              wt("function balanceOf(address) returns (uint256)")
            ],
            functionName: "balanceOf",
            args: [u.address],
            to: B,
            from: we,
            nonce: R
          })),
          stateOverrides: [
            {
              address: we,
              nonce: 0
            }
          ]
        }
      ] : [],
      {
        calls: [...s, { to: we }].map((B) => ({
          ...B,
          from: u == null ? void 0 : u.address
        })),
        stateOverrides: o
      },
      ...i ? [
        // ETH post balances
        {
          calls: [{ data: f }]
        },
        // Asset post balances
        {
          calls: d.map((B, R) => ({
            abi: [
              wt("function balanceOf(address) returns (uint256)")
            ],
            functionName: "balanceOf",
            args: [u.address],
            to: B,
            from: we,
            nonce: R
          })),
          stateOverrides: [
            {
              address: we,
              nonce: 0
            }
          ]
        },
        // Decimals
        {
          calls: d.map((B, R) => ({
            to: B,
            abi: [
              wt("function decimals() returns (uint256)")
            ],
            functionName: "decimals",
            from: we,
            nonce: R
          })),
          stateOverrides: [
            {
              address: we,
              nonce: 0
            }
          ]
        },
        // Token URI
        {
          calls: d.map((B, R) => ({
            to: B,
            abi: [
              wt("function tokenURI(uint256) returns (string)")
            ],
            functionName: "tokenURI",
            args: [0n],
            from: we,
            nonce: R
          })),
          stateOverrides: [
            {
              address: we,
              nonce: 0
            }
          ]
        },
        // Symbols
        {
          calls: d.map((B, R) => ({
            to: B,
            abi: [wt("function symbol() returns (string)")],
            functionName: "symbol",
            from: we,
            nonce: R
          })),
          stateOverrides: [
            {
              address: we,
              nonce: 0
            }
          ]
        }
      ] : []
    ],
    traceTransfers: a,
    validation: c
  }), h = i ? l[2] : l[0], [p, b, , x, g, w, m, y] = i ? l : [], { calls: E, ...$ } = h, P = E.slice(0, -1) ?? [], A = (p == null ? void 0 : p.calls) ?? [], C = (b == null ? void 0 : b.calls) ?? [], z = [...A, ...C].map((B) => B.status === "success" ? X(B.data) : null), S = (x == null ? void 0 : x.calls) ?? [], F = (g == null ? void 0 : g.calls) ?? [], k = [...S, ...F].map((B) => B.status === "success" ? X(B.data) : null), _ = ((w == null ? void 0 : w.calls) ?? []).map((B) => B.status === "success" ? B.result : null), v = ((y == null ? void 0 : y.calls) ?? []).map((B) => B.status === "success" ? B.result : null), T = ((m == null ? void 0 : m.calls) ?? []).map((B) => B.status === "success" ? B.result : null), O = [];
  for (const [B, R] of k.entries()) {
    const L = z[B];
    if (typeof R != "bigint" || typeof L != "bigint")
      continue;
    const U = _[B - 1], G = v[B - 1], W = T[B - 1], q = B === 0 ? {
      address: Q1,
      decimals: 18,
      symbol: "ETH"
    } : {
      address: d[B - 1],
      decimals: W || U ? Number(U ?? 1) : void 0,
      symbol: G ?? void 0
    };
    O.some((Z) => Z.token.address === q.address) || O.push({
      token: q,
      value: {
        pre: L,
        post: R,
        diff: R - L
      }
    });
  }
  return {
    assetChanges: O,
    block: $,
    results: P
  };
}
const Xc = "0x6492649264926492649264926492649264926492649264926492649264926492";
function np(e) {
  if (Be(e, -32) !== Xc)
    throw new op(e);
}
function rp(e) {
  const { data: t, signature: n, to: r } = e;
  return Ee(xo(Cc("address, bytes, bytes"), [
    r,
    t,
    n
  ]), Xc);
}
function sp(e) {
  try {
    return np(e), !0;
  } catch {
    return !1;
  }
}
class op extends j {
  constructor(t) {
    super(`Value \`${t}\` is an invalid ERC-6492 wrapped signature.`), Object.defineProperty(this, "name", {
      enumerable: !0,
      configurable: !0,
      writable: !0,
      value: "SignatureErc6492.InvalidWrappedSignatureError"
    });
  }
}
function ip({ r: e, s: t, to: n = "hex", v: r, yParity: s }) {
  const o = (() => {
    if (s === 0 || s === 1)
      return s;
    if (r && (r === 27n || r === 28n || r >= 35n))
      return r % 2n === 0n ? 1 : 0;
    throw new Error("Invalid `v` or `yParity` value");
  })(), i = `0x${new qc.Signature(X(e), X(t)).toCompactHex()}${o === 0 ? "1b" : "1c"}`;
  return n === "hex" ? i : Ce(i);
}
async function Pr(e, t) {
  var u, f, d, l;
  const { address: n, chain: r = e.chain, hash: s, erc6492VerifierAddress: o = t.universalSignatureVerifierAddress ?? ((f = (u = r == null ? void 0 : r.contracts) == null ? void 0 : u.erc6492Verifier) == null ? void 0 : f.address), multicallAddress: i = t.multicallAddress ?? ((l = (d = r == null ? void 0 : r.contracts) == null ? void 0 : d.multicall3) == null ? void 0 : l.address), mode: a = "auto" } = t;
  if (r != null && r.verifyHash)
    return await r.verifyHash(e, t);
  const c = (() => {
    const h = t.signature;
    return Te(h) ? h : typeof h == "object" && "r" in h && "s" in h ? ip(h) : V(h);
  })();
  try {
    if (a === "eoa")
      try {
        if (zt(Qt(n), await ss({ hash: s, signature: c })))
          return !0;
      } catch {
      }
    return L1(c) ? await ap(e, {
      ...t,
      multicallAddress: i,
      signature: c
    }) : await cp(e, {
      ...t,
      verifierAddress: o,
      signature: c
    });
  } catch (h) {
    if (a !== "eoa")
      try {
        if (zt(Qt(n), await ss({ hash: s, signature: c })))
          return !0;
      } catch {
      }
    if (h instanceof ht)
      return !1;
    throw h;
  }
}
async function ap(e, t) {
  var x;
  const { address: n, blockNumber: r, blockTag: s, hash: o, multicallAddress: i } = t, { authorization: a, data: c, signature: u, to: f } = M1(t.signature);
  if (await Qn(e, {
    address: n,
    blockNumber: r,
    blockTag: s
  }) === Ie(["0xef0100", a.address]))
    return await up(e, {
      address: n,
      blockNumber: r,
      blockTag: s,
      hash: o,
      signature: u
    });
  const l = {
    address: a.address,
    chainId: Number(a.chainId),
    nonce: Number(a.nonce),
    r: N(a.r, { size: 32 }),
    s: N(a.s, { size: 32 }),
    yParity: a.yParity
  };
  if (!await sh({
    address: n,
    authorization: l
  }))
    throw new ht();
  const p = await M(e, Ae, "readContract")({
    ...i ? { address: i } : { code: io },
    authorizationList: [l],
    abi: Rt,
    blockNumber: r,
    blockTag: "pending",
    functionName: "aggregate3",
    args: [
      [
        ...c ? [
          {
            allowFailure: !0,
            target: f ?? n,
            callData: c
          }
        ] : [],
        {
          allowFailure: !0,
          target: n,
          callData: fe({
            abi: Ja,
            functionName: "isValidSignature",
            args: [o, u]
          })
        }
      ]
    ]
  }), b = (x = p[p.length - 1]) == null ? void 0 : x.returnData;
  if (b != null && b.startsWith("0x1626ba7e"))
    return !0;
  throw new ht();
}
async function cp(e, t) {
  const { address: n, factory: r, factoryData: s, hash: o, signature: i, verifierAddress: a, ...c } = t, u = await (async () => !r && !s || sp(i) ? i : rp({
    data: s,
    signature: i,
    to: r
  }))(), f = a ? {
    to: a,
    data: fe({
      abi: ui,
      functionName: "isValidSig",
      args: [n, o, u]
    }),
    ...c
  } : {
    data: br({
      abi: ui,
      args: [n, o, u],
      bytecode: Jd
    }),
    ...c
  }, { data: d } = await M(e, Ln, "call")(f).catch((l) => {
    throw l instanceof ba ? new ht() : l;
  });
  if (h0(d ?? "0x0"))
    return !0;
  throw new ht();
}
async function up(e, t) {
  const { address: n, blockNumber: r, blockTag: s, hash: o, signature: i } = t;
  if ((await M(e, Ae, "readContract")({
    address: n,
    abi: Ja,
    args: [o, i],
    blockNumber: r,
    blockTag: s,
    functionName: "isValidSignature"
  }).catch((c) => {
    throw c instanceof ya ? new ht() : c;
  })).startsWith("0x1626ba7e"))
    return !0;
  throw new ht();
}
class ht extends Error {
}
async function fp(e, { address: t, message: n, factory: r, factoryData: s, signature: o, ...i }) {
  const a = gc(n);
  return M(e, Pr, "verifyHash")({
    address: t,
    factory: r,
    factoryData: s,
    hash: a,
    signature: o,
    ...i
  });
}
async function dp(e, t) {
  const { address: n, factory: r, factoryData: s, signature: o, message: i, primaryType: a, types: c, domain: u, ...f } = t, d = wh({ message: i, primaryType: a, types: c, domain: u });
  return M(e, Pr, "verifyHash")({
    address: n,
    factory: r,
    factoryData: s,
    hash: d,
    signature: o,
    ...f
  });
}
function Qc(e, { emitOnBegin: t = !1, emitMissed: n = !1, onBlockNumber: r, onError: s, poll: o, pollingInterval: i = e.pollingInterval }) {
  const a = typeof o < "u" ? o : !(e.transport.type === "webSocket" || e.transport.type === "ipc" || e.transport.type === "fallback" && (e.transport.transports[0].config.type === "webSocket" || e.transport.transports[0].config.type === "ipc"));
  let c;
  return a ? (() => {
    const d = K([
      "watchBlockNumber",
      e.uid,
      t,
      n,
      i
    ]);
    return je(d, { onBlockNumber: r, onError: s }, (l) => Dt(async () => {
      var h;
      try {
        const p = await M(e, _n, "getBlockNumber")({ cacheTime: 0 });
        if (c !== void 0) {
          if (p === c)
            return;
          if (p - c > 1 && n)
            for (let b = c + 1n; b < p; b++)
              l.onBlockNumber(b, c), c = b;
        }
        (c === void 0 || p > c) && (l.onBlockNumber(p, c), c = p);
      } catch (p) {
        (h = l.onError) == null || h.call(l, p);
      }
    }, {
      emitOnBegin: t,
      interval: i
    }));
  })() : (() => {
    const d = K([
      "watchBlockNumber",
      e.uid,
      t,
      n
    ]);
    return je(d, { onBlockNumber: r, onError: s }, (l) => {
      let h = !0, p = () => h = !1;
      return (async () => {
        try {
          const b = (() => {
            if (e.transport.type === "fallback") {
              const g = e.transport.transports.find((w) => w.config.type === "webSocket" || w.config.type === "ipc");
              return g ? g.value : e.transport;
            }
            return e.transport;
          })(), { unsubscribe: x } = await b.subscribe({
            params: ["newHeads"],
            onData(g) {
              var m;
              if (!h)
                return;
              const w = X((m = g.result) == null ? void 0 : m.number);
              l.onBlockNumber(w, c), c = w;
            },
            onError(g) {
              var w;
              (w = l.onError) == null || w.call(l, g);
            }
          });
          p = x, h || p();
        } catch (b) {
          s == null || s(b);
        }
      })(), () => p();
    });
  })();
}
async function eu(e, t) {
  const {
    checkReplacement: n = !0,
    confirmations: r = 1,
    hash: s,
    onReplaced: o,
    retryCount: i = 6,
    retryDelay: a = ({ count: E }) => ~~(1 << E) * 200,
    // exponential backoff
    timeout: c = 18e4
  } = t, u = K(["waitForTransactionReceipt", e.uid, s]), f = (() => {
    var E;
    return t.pollingInterval ? t.pollingInterval : (E = e.chain) != null && E.experimental_preconfirmationTime ? e.chain.experimental_preconfirmationTime : e.pollingInterval;
  })();
  let d, l, h, p = !1, b, x;
  const { promise: g, resolve: w, reject: m } = ao(), y = c ? setTimeout(() => {
    x == null || x(), b == null || b(), m(new Cf({ hash: s }));
  }, c) : void 0;
  return b = je(u, { onReplaced: o, resolve: w, reject: m }, async (E) => {
    if (h = await M(e, Vn, "getTransactionReceipt")({ hash: s }).catch(() => {
    }), h && r <= 1) {
      clearTimeout(y), E.resolve(h), b == null || b();
      return;
    }
    x = M(e, Qc, "watchBlockNumber")({
      emitMissed: !0,
      emitOnBegin: !0,
      poll: !0,
      pollingInterval: f,
      async onBlockNumber($) {
        const P = (C) => {
          clearTimeout(y), x == null || x(), C(), b == null || b();
        };
        let A = $;
        if (!p)
          try {
            if (h) {
              if (r > 1 && (!h.blockNumber || A - h.blockNumber + 1n < r))
                return;
              P(() => E.resolve(h));
              return;
            }
            if (n && !d && (p = !0, await Xn(async () => {
              d = await M(e, $o, "getTransaction")({ hash: s }), d.blockNumber && (A = d.blockNumber);
            }, {
              delay: a,
              retryCount: i
            }), p = !1), h = await M(e, Vn, "getTransactionReceipt")({ hash: s }), r > 1 && (!h.blockNumber || A - h.blockNumber + 1n < r))
              return;
            P(() => E.resolve(h));
          } catch (C) {
            if (C instanceof la || C instanceof ha) {
              if (!d) {
                p = !1;
                return;
              }
              try {
                l = d, p = !0;
                const z = await Xn(() => M(e, xe, "getBlock")({
                  blockNumber: A,
                  includeTransactions: !0
                }), {
                  delay: a,
                  retryCount: i,
                  shouldRetry: ({ error: k }) => k instanceof xa
                });
                p = !1;
                const S = z.transactions.find(({ from: k, nonce: _ }) => k === l.from && _ === l.nonce);
                if (!S || (h = await M(e, Vn, "getTransactionReceipt")({
                  hash: S.hash
                }), r > 1 && (!h.blockNumber || A - h.blockNumber + 1n < r)))
                  return;
                let F = "replaced";
                S.to === l.to && S.value === l.value && S.input === l.input ? F = "repriced" : S.from === S.to && S.value === 0n && (F = "cancelled"), P(() => {
                  var k;
                  (k = E.onReplaced) == null || k.call(E, {
                    reason: F,
                    replacedTransaction: l,
                    transaction: S,
                    transactionReceipt: h
                  }), E.resolve(h);
                });
              } catch (z) {
                P(() => E.reject(z));
              }
            } else
              P(() => E.reject(C));
          }
      }
    });
  }), g;
}
function lp(e, { blockTag: t = e.experimental_blockTag ?? "latest", emitMissed: n = !1, emitOnBegin: r = !1, onBlock: s, onError: o, includeTransactions: i, poll: a, pollingInterval: c = e.pollingInterval }) {
  const u = typeof a < "u" ? a : !(e.transport.type === "webSocket" || e.transport.type === "ipc" || e.transport.type === "fallback" && (e.transport.transports[0].config.type === "webSocket" || e.transport.transports[0].config.type === "ipc")), f = i ?? !1;
  let d;
  return u ? (() => {
    const p = K([
      "watchBlocks",
      e.uid,
      t,
      n,
      r,
      f,
      c
    ]);
    return je(p, { onBlock: s, onError: o }, (b) => Dt(async () => {
      var x;
      try {
        const g = await M(e, xe, "getBlock")({
          blockTag: t,
          includeTransactions: f
        });
        if (g.number !== null && (d == null ? void 0 : d.number) != null) {
          if (g.number === d.number)
            return;
          if (g.number - d.number > 1 && n)
            for (let w = (d == null ? void 0 : d.number) + 1n; w < g.number; w++) {
              const m = await M(e, xe, "getBlock")({
                blockNumber: w,
                includeTransactions: f
              });
              b.onBlock(m, d), d = m;
            }
        }
        // If no previous block exists, emit.
        ((d == null ? void 0 : d.number) == null || // If the block tag is "pending" with no block number, emit.
        t === "pending" && (g == null ? void 0 : g.number) == null || // If the next block number is greater than the previous block number, emit.
        // We don't want to emit blocks in the past.
        g.number !== null && g.number > d.number) && (b.onBlock(g, d), d = g);
      } catch (g) {
        (x = b.onError) == null || x.call(b, g);
      }
    }, {
      emitOnBegin: r,
      interval: c
    }));
  })() : (() => {
    let p = !0, b = !0, x = () => p = !1;
    return (async () => {
      try {
        r && M(e, xe, "getBlock")({
          blockTag: t,
          includeTransactions: f
        }).then((m) => {
          p && b && (s(m, void 0), b = !1);
        }).catch(o);
        const g = (() => {
          if (e.transport.type === "fallback") {
            const m = e.transport.transports.find((y) => y.config.type === "webSocket" || y.config.type === "ipc");
            return m ? m.value : e.transport;
          }
          return e.transport;
        })(), { unsubscribe: w } = await g.subscribe({
          params: ["newHeads"],
          async onData(m) {
            var E;
            if (!p)
              return;
            const y = await M(e, xe, "getBlock")({
              blockNumber: (E = m.result) == null ? void 0 : E.number,
              includeTransactions: f
            }).catch(() => {
            });
            p && (s(y, d), b = !1, d = y);
          },
          onError(m) {
            o == null || o(m);
          }
        });
        x = w, p || x();
      } catch (g) {
        o == null || o(g);
      }
    })(), () => x();
  })();
}
function hp(e, { address: t, args: n, batch: r = !0, event: s, events: o, fromBlock: i, onError: a, onLogs: c, poll: u, pollingInterval: f = e.pollingInterval, strict: d }) {
  const l = typeof u < "u" ? u : typeof i == "bigint" ? !0 : !(e.transport.type === "webSocket" || e.transport.type === "ipc" || e.transport.type === "fallback" && (e.transport.transports[0].config.type === "webSocket" || e.transport.transports[0].config.type === "ipc")), h = d ?? !1;
  return l ? (() => {
    const x = K([
      "watchEvent",
      t,
      n,
      r,
      e.uid,
      s,
      f,
      i
    ]);
    return je(x, { onLogs: c, onError: a }, (g) => {
      let w;
      i !== void 0 && (w = i - 1n);
      let m, y = !1;
      const E = Dt(async () => {
        var $;
        if (!y) {
          try {
            m = await M(e, bc, "createEventFilter")({
              address: t,
              args: n,
              event: s,
              events: o,
              strict: h,
              fromBlock: i
            });
          } catch {
          }
          y = !0;
          return;
        }
        try {
          let P;
          if (m)
            P = await M(e, yr, "getFilterChanges")({ filter: m });
          else {
            const A = await M(e, _n, "getBlockNumber")({});
            w && w !== A ? P = await M(e, to, "getLogs")({
              address: t,
              args: n,
              event: s,
              events: o,
              fromBlock: w + 1n,
              toBlock: A
            }) : P = [], w = A;
          }
          if (P.length === 0)
            return;
          if (r)
            g.onLogs(P);
          else
            for (const A of P)
              g.onLogs([A]);
        } catch (P) {
          m && P instanceof Ze && (y = !1), ($ = g.onError) == null || $.call(g, P);
        }
      }, {
        emitOnBegin: !0,
        interval: f
      });
      return async () => {
        m && await M(e, mr, "uninstallFilter")({ filter: m }), E();
      };
    });
  })() : (() => {
    let x = !0, g = () => x = !1;
    return (async () => {
      try {
        const w = (() => {
          if (e.transport.type === "fallback") {
            const $ = e.transport.transports.find((P) => P.config.type === "webSocket" || P.config.type === "ipc");
            return $ ? $.value : e.transport;
          }
          return e.transport;
        })(), m = o ?? (s ? [s] : void 0);
        let y = [];
        m && (y = [m.flatMap((P) => Tn({
          abi: [P],
          eventName: P.name,
          args: n
        }))], s && (y = y[0]));
        const { unsubscribe: E } = await w.subscribe({
          params: ["logs", { address: t, topics: y }],
          onData($) {
            var A;
            if (!x)
              return;
            const P = $.result;
            try {
              const { eventName: C, args: z } = Kn({
                abi: m ?? [],
                data: P.data,
                topics: P.topics,
                strict: h
              }), S = ke(P, { args: z, eventName: C });
              c([S]);
            } catch (C) {
              let z, S;
              if (C instanceof Zn || C instanceof ks) {
                if (d)
                  return;
                z = C.abiItem.name, S = (A = C.abiItem.inputs) == null ? void 0 : A.some((k) => !("name" in k && k.name));
              }
              const F = ke(P, {
                args: S ? [] : {},
                eventName: z
              });
              c([F]);
            }
          },
          onError($) {
            a == null || a($);
          }
        });
        g = E, x || g();
      } catch (w) {
        a == null || a(w);
      }
    })(), () => g();
  })();
}
function pp(e, { batch: t = !0, onError: n, onTransactions: r, poll: s, pollingInterval: o = e.pollingInterval }) {
  return (typeof s < "u" ? s : e.transport.type !== "webSocket" && e.transport.type !== "ipc") ? (() => {
    const u = K([
      "watchPendingTransactions",
      e.uid,
      t,
      o
    ]);
    return je(u, { onTransactions: r, onError: n }, (f) => {
      let d;
      const l = Dt(async () => {
        var h;
        try {
          if (!d)
            try {
              d = await M(e, yc, "createPendingTransactionFilter")({});
              return;
            } catch (b) {
              throw l(), b;
            }
          const p = await M(e, yr, "getFilterChanges")({ filter: d });
          if (p.length === 0)
            return;
          if (t)
            f.onTransactions(p);
          else
            for (const b of p)
              f.onTransactions([b]);
        } catch (p) {
          (h = f.onError) == null || h.call(f, p);
        }
      }, {
        emitOnBegin: !0,
        interval: o
      });
      return async () => {
        d && await M(e, mr, "uninstallFilter")({ filter: d }), l();
      };
    });
  })() : (() => {
    let u = !0, f = () => u = !1;
    return (async () => {
      try {
        const { unsubscribe: d } = await e.transport.subscribe({
          params: ["newPendingTransactions"],
          onData(l) {
            if (!u)
              return;
            const h = l.result;
            r([h]);
          },
          onError(l) {
            n == null || n(l);
          }
        });
        f = d, u || f();
      } catch (d) {
        n == null || n(d);
      }
    })(), () => f();
  })();
}
function bp(e) {
  var d, l, h;
  const { scheme: t, statement: n, ...r } = ((d = e.match(yp)) == null ? void 0 : d.groups) ?? {}, { chainId: s, expirationTime: o, issuedAt: i, notBefore: a, requestId: c, ...u } = ((l = e.match(mp)) == null ? void 0 : l.groups) ?? {}, f = (h = e.split("Resources:")[1]) == null ? void 0 : h.split(`
- `).slice(1);
  return {
    ...r,
    ...u,
    ...s ? { chainId: Number(s) } : {},
    ...o ? { expirationTime: new Date(o) } : {},
    ...i ? { issuedAt: new Date(i) } : {},
    ...a ? { notBefore: new Date(a) } : {},
    ...c ? { requestId: c } : {},
    ...f ? { resources: f } : {},
    ...t ? { scheme: t } : {},
    ...n ? { statement: n } : {}
  };
}
const yp = /^(?:(?<scheme>[a-zA-Z][a-zA-Z0-9+-.]*):\/\/)?(?<domain>[a-zA-Z0-9+-.]*(?::[0-9]{1,5})?) (?:wants you to sign in with your Ethereum account:\n)(?<address>0x[a-fA-F0-9]{40})\n\n(?:(?<statement>.*)\n\n)?/, mp = /(?:URI: (?<uri>.+))\n(?:Version: (?<version>.+))\n(?:Chain ID: (?<chainId>\d+))\n(?:Nonce: (?<nonce>[a-zA-Z0-9]+))\n(?:Issued At: (?<issuedAt>.+))(?:\nExpiration Time: (?<expirationTime>.+))?(?:\nNot Before: (?<notBefore>.+))?(?:\nRequest ID: (?<requestId>.+))?/;
function gp(e) {
  const { address: t, domain: n, message: r, nonce: s, scheme: o, time: i = /* @__PURE__ */ new Date() } = e;
  if (n && r.domain !== n || s && r.nonce !== s || o && r.scheme !== o || r.expirationTime && i >= r.expirationTime || r.notBefore && i < r.notBefore)
    return !1;
  try {
    if (!r.address || !J(r.address, { strict: !1 }) || t && !zt(r.address, t))
      return !1;
  } catch {
    return !1;
  }
  return !0;
}
async function wp(e, t) {
  const { address: n, domain: r, message: s, nonce: o, scheme: i, signature: a, time: c = /* @__PURE__ */ new Date(), ...u } = t, f = bp(s);
  if (!f.address || !gp({
    address: n,
    domain: r,
    message: f,
    nonce: o,
    scheme: i,
    time: c
  }))
    return !1;
  const l = gc(s);
  return Pr(e, {
    address: f.address,
    hash: l,
    signature: a,
    ...u
  });
}
async function Io(e, { serializedTransaction: t, throwOnReceiptRevert: n, timeout: r }) {
  var a, c, u;
  const s = await e.request({
    method: "eth_sendRawTransactionSync",
    params: r ? [t, r] : [t]
  }, { retryCount: 0 }), i = (((u = (c = (a = e.chain) == null ? void 0 : a.formatters) == null ? void 0 : c.transactionReceipt) == null ? void 0 : u.format) || fo)(s);
  if (i.status === "reverted" && n)
    throw new pa({ receipt: i });
  return i;
}
function xp(e) {
  return {
    call: (t) => Ln(e, t),
    createAccessList: (t) => pc(e, t),
    createBlockFilter: () => Rl(e),
    createContractEventFilter: (t) => aa(e, t),
    createEventFilter: (t) => bc(e, t),
    createPendingTransactionFilter: () => yc(e),
    estimateContractGas: (t) => ld(e, t),
    estimateGas: (t) => Qs(e, t),
    getBalance: (t) => Ml(e, t),
    getBlobBaseFee: () => Ll(e),
    getBlock: (t) => xe(e, t),
    getBlockNumber: (t) => _n(e, t),
    getBlockTransactionCount: (t) => _l(e, t),
    getBytecode: (t) => Qn(e, t),
    getChainId: () => Ye(e),
    getCode: (t) => Qn(e, t),
    getContractEvents: (t) => ka(e, t),
    getDelegation: (t) => jl(e, t),
    getEip712Domain: (t) => Gl(e, t),
    getEnsAddress: (t) => xl(e, t),
    getEnsAvatar: (t) => Fl(e, t),
    getEnsName: (t) => Ol(e, t),
    getEnsResolver: (t) => zl(e, t),
    getEnsText: (t) => hc(e, t),
    getFeeHistory: (t) => ql(e, t),
    estimateFeesPerGas: (t) => Xf(e, t),
    getFilterChanges: (t) => yr(e, t),
    getFilterLogs: (t) => Vl(e, t),
    getGasPrice: () => Vs(e),
    getLogs: (t) => to(e, t),
    getProof: (t) => G1(e, t),
    estimateMaxPriorityFeePerGas: (t) => Yf(e, t),
    fillTransaction: (t) => Ys(e, t),
    getStorageAt: (t) => D1(e, t),
    getTransaction: (t) => $o(e, t),
    getTransactionConfirmations: (t) => H1(e, t),
    getTransactionCount: (t) => Ws(e, t),
    getTransactionReceipt: (t) => Vn(e, t),
    multicall: (t) => q1(e, t),
    prepareTransactionRequest: (t) => On(e, t),
    readContract: (t) => Ae(e, t),
    sendRawTransaction: (t) => uo(e, t),
    sendRawTransactionSync: (t) => Io(e, t),
    simulate: (t) => Ss(e, t),
    simulateBlocks: (t) => Ss(e, t),
    simulateCalls: (t) => tp(e, t),
    simulateContract: (t) => rl(e, t),
    verifyHash: (t) => Pr(e, t),
    verifyMessage: (t) => fp(e, t),
    verifySiweMessage: (t) => wp(e, t),
    verifyTypedData: (t) => dp(e, t),
    uninstallFilter: (t) => mr(e, t),
    waitForTransactionReceipt: (t) => eu(e, t),
    watchBlocks: (t) => lp(e, t),
    watchBlockNumber: (t) => Qc(e, t),
    watchContractEvent: (t) => fl(e, t),
    watchEvent: (t) => hp(e, t),
    watchPendingTransactions: (t) => pp(e, t)
  };
}
function vp(e) {
  const { key: t = "public", name: n = "Public Client" } = e;
  return uc({
    ...e,
    key: t,
    name: n,
    type: "publicClient"
  }).extend(xp);
}
async function Ep(e, { chain: t }) {
  const { id: n, name: r, nativeCurrency: s, rpcUrls: o, blockExplorers: i } = t;
  await e.request({
    method: "wallet_addEthereumChain",
    params: [
      {
        chainId: N(n),
        chainName: r,
        nativeCurrency: s,
        rpcUrls: o.default.http,
        blockExplorerUrls: i ? Object.values(i).map(({ url: a }) => a) : void 0
      }
    ]
  }, { dedupe: !0, retryCount: 0 });
}
function Pp(e, t) {
  const { abi: n, args: r, bytecode: s, ...o } = t, i = br({ abi: n, args: r, bytecode: s });
  return gr(e, {
    ...o,
    ...o.authorizationList ? { to: null } : {},
    data: i
  });
}
async function Ap(e) {
  var n;
  return ((n = e.account) == null ? void 0 : n.type) === "local" ? [e.account.address] : (await e.request({ method: "eth_accounts" }, { dedupe: !0 })).map((r) => Sn(r));
}
async function $p(e, t = {}) {
  const { account: n = e.account, chainId: r } = t, s = n ? H(n) : void 0, o = r ? [s == null ? void 0 : s.address, [N(r)]] : [s == null ? void 0 : s.address], i = await e.request({
    method: "wallet_getCapabilities",
    params: o
  }), a = {};
  for (const [c, u] of Object.entries(i)) {
    a[Number(c)] = {};
    for (let [f, d] of Object.entries(u))
      f === "addSubAccount" && (f = "unstable_addSubAccount"), a[Number(c)][f] = d;
  }
  return typeof r == "number" ? a[r] : a;
}
async function Ip(e) {
  return await e.request({ method: "wallet_getPermissions" }, { dedupe: !0 });
}
async function tu(e, t) {
  var c;
  const { account: n = e.account, chainId: r, nonce: s } = t;
  if (!n)
    throw new Qe({
      docsPath: "/docs/eip7702/prepareAuthorization"
    });
  const o = H(n), i = (() => {
    if (t.executor)
      return t.executor === "self" ? t.executor : H(t.executor);
  })(), a = {
    address: t.contractAddress ?? t.address,
    chainId: r,
    nonce: s
  };
  return typeof a.chainId > "u" && (a.chainId = ((c = e.chain) == null ? void 0 : c.id) ?? await M(e, Ye, "getChainId")({})), typeof a.nonce > "u" && (a.nonce = await M(e, Ws, "getTransactionCount")({
    address: o.address,
    blockTag: "pending"
  }), (i === "self" || i != null && i.address && zt(i.address, o.address)) && (a.nonce += 1)), a;
}
async function Sp(e) {
  return (await e.request({ method: "eth_requestAccounts" }, { dedupe: !0, retryCount: 0 })).map((n) => Qt(n));
}
async function Bp(e, t) {
  return e.request({
    method: "wallet_requestPermissions",
    params: [t]
  }, { retryCount: 0 });
}
async function Tp(e, t) {
  const { chain: n = e.chain } = t, r = t.timeout ?? Math.max(((n == null ? void 0 : n.blockTime) ?? 0) * 3, 5e3), s = await M(e, oc, "sendCalls")(t);
  return await M(e, ac, "waitForCallsStatus")({
    ...t,
    id: s.id,
    timeout: r
  });
}
const Zr = new jt(128);
async function nu(e, t) {
  var P, A, C, z, S;
  const { account: n = e.account, assertChainId: r = !0, chain: s = e.chain, accessList: o, authorizationList: i, blobs: a, data: c, dataSuffix: u = typeof e.dataSuffix == "string" ? e.dataSuffix : (P = e.dataSuffix) == null ? void 0 : P.value, gas: f, gasPrice: d, maxFeePerBlobGas: l, maxFeePerGas: h, maxPriorityFeePerGas: p, nonce: b, pollingInterval: x, throwOnReceiptRevert: g, type: w, value: m, ...y } = t, E = t.timeout ?? Math.max(((s == null ? void 0 : s.blockTime) ?? 0) * 3, 5e3);
  if (typeof n > "u")
    throw new Qe({
      docsPath: "/docs/actions/wallet/sendTransactionSync"
    });
  const $ = n ? H(n) : null;
  try {
    Ge(t);
    const F = await (async () => {
      if (t.to)
        return t.to;
      if (t.to !== null && i && i.length > 0)
        return await ar({
          authorization: i[0]
        }).catch(() => {
          throw new I("`to` is required. Could not infer from `authorizationList`.");
        });
    })();
    if (($ == null ? void 0 : $.type) === "json-rpc" || $ === null) {
      let k;
      s !== null && (k = await M(e, Ye, "getChainId")({}), r && co({
        currentChainId: k,
        chain: s
      }));
      const _ = (z = (C = (A = e.chain) == null ? void 0 : A.formatters) == null ? void 0 : C.transactionRequest) == null ? void 0 : z.format, T = (_ || Je)({
        // Pick out extra data that might exist on the chain's transaction request type.
        ...Ut(y, { format: _ }),
        accessList: o,
        account: $,
        authorizationList: i,
        blobs: a,
        chainId: k,
        data: c && ee([c, u ?? "0x"]),
        gas: f,
        gasPrice: d,
        maxFeePerBlobGas: l,
        maxFeePerGas: h,
        maxPriorityFeePerGas: p,
        nonce: b,
        to: F,
        type: w,
        value: m
      }, "sendTransaction"), O = Zr.get(e.uid), B = O ? "wallet_sendTransaction" : "eth_sendTransaction", R = await (async () => {
        try {
          return await e.request({
            method: B,
            params: [T]
          }, { retryCount: 0 });
        } catch (U) {
          if (O === !1)
            throw U;
          const G = U;
          if (G.name === "InvalidInputRpcError" || G.name === "InvalidParamsRpcError" || G.name === "MethodNotFoundRpcError" || G.name === "MethodNotSupportedRpcError")
            return await e.request({
              method: "wallet_sendTransaction",
              params: [T]
            }, { retryCount: 0 }).then((W) => (Zr.set(e.uid, !0), W)).catch((W) => {
              const q = W;
              throw q.name === "MethodNotFoundRpcError" || q.name === "MethodNotSupportedRpcError" ? (Zr.set(e.uid, !1), G) : q;
            });
          throw G;
        }
      })(), L = await M(e, eu, "waitForTransactionReceipt")({
        checkReplacement: !1,
        hash: R,
        pollingInterval: x,
        timeout: E
      });
      if (g && L.status === "reverted")
        throw new pa({ receipt: L });
      return L;
    }
    if (($ == null ? void 0 : $.type) === "local") {
      const k = await M(e, On, "prepareTransactionRequest")({
        account: $,
        accessList: o,
        authorizationList: i,
        blobs: a,
        chain: s,
        data: c && ee([c, u ?? "0x"]),
        gas: f,
        gasPrice: d,
        maxFeePerBlobGas: l,
        maxFeePerGas: h,
        maxPriorityFeePerGas: p,
        nonce: b,
        nonceManager: $.nonceManager,
        parameters: [...Xs, "sidecars"],
        type: w,
        value: m,
        ...y,
        to: F
      }), _ = (S = s == null ? void 0 : s.serializers) == null ? void 0 : S.transaction, v = await $.signTransaction(k, {
        serializer: _
      });
      return await M(e, Io, "sendRawTransactionSync")({
        serializedTransaction: v,
        throwOnReceiptRevert: g,
        timeout: t.timeout
      });
    }
    throw ($ == null ? void 0 : $.type) === "smart" ? new it({
      metaMessages: [
        "Consider using the `sendUserOperation` Action instead."
      ],
      docsPath: "/docs/actions/bundler/sendUserOperation",
      type: "smart"
    }) : new it({
      docsPath: "/docs/actions/wallet/sendTransactionSync",
      type: $ == null ? void 0 : $.type
    });
  } catch (F) {
    throw F instanceof it ? F : fr(F, {
      ...t,
      account: $,
      chain: t.chain || void 0
    });
  }
}
async function Cp(e, t) {
  const { id: n } = t;
  await e.request({
    method: "wallet_showCallsStatus",
    params: [n]
  });
}
async function kp(e, t) {
  const { account: n = e.account } = t;
  if (!n)
    throw new Qe({
      docsPath: "/docs/eip7702/signAuthorization"
    });
  const r = H(n);
  if (!r.signAuthorization)
    throw new it({
      docsPath: "/docs/eip7702/signAuthorization",
      metaMessages: [
        "The `signAuthorization` Action does not support JSON-RPC Accounts."
      ],
      type: r.type
    });
  const s = await tu(e, t);
  return r.signAuthorization(s);
}
async function Np(e, { account: t = e.account, message: n }) {
  if (!t)
    throw new Qe({
      docsPath: "/docs/actions/wallet/signMessage"
    });
  const r = H(t);
  if (r.signMessage)
    return r.signMessage({ message: n });
  const s = typeof n == "string" ? Tt(n) : n.raw instanceof Uint8Array ? ae(n.raw) : n.raw;
  return e.request({
    method: "personal_sign",
    params: [s, r.address]
  }, { retryCount: 0 });
}
async function Fp(e, t) {
  var u, f, d, l;
  const { account: n = e.account, chain: r = e.chain, ...s } = t;
  if (!n)
    throw new Qe({
      docsPath: "/docs/actions/wallet/signTransaction"
    });
  const o = H(n);
  Ge({
    account: o,
    ...t
  });
  const i = await M(e, Ye, "getChainId")({});
  r !== null && co({
    currentChainId: i,
    chain: r
  });
  const a = (r == null ? void 0 : r.formatters) || ((u = e.chain) == null ? void 0 : u.formatters), c = ((f = a == null ? void 0 : a.transactionRequest) == null ? void 0 : f.format) || Je;
  return o.signTransaction ? o.signTransaction({
    ...s,
    chainId: i
  }, { serializer: (l = (d = e.chain) == null ? void 0 : d.serializers) == null ? void 0 : l.transaction }) : await e.request({
    method: "eth_signTransaction",
    params: [
      {
        ...c({
          ...s,
          account: o
        }, "signTransaction"),
        chainId: N(i),
        from: o.address
      }
    ]
  }, { retryCount: 0 });
}
async function Op(e, t) {
  const { account: n = e.account, domain: r, message: s, primaryType: o } = t;
  if (!n)
    throw new Qe({
      docsPath: "/docs/actions/wallet/signTypedData"
    });
  const i = H(n), a = {
    EIP712Domain: xc({ domain: r }),
    ...t.types
  };
  if (wc({ domain: r, message: s, primaryType: o, types: a }), i.signTypedData)
    return i.signTypedData({ domain: r, message: s, primaryType: o, types: a });
  const c = mh({ domain: r, message: s, primaryType: o, types: a });
  return e.request({
    method: "eth_signTypedData_v4",
    params: [i.address, c]
  }, { retryCount: 0 });
}
async function zp(e, { id: t }) {
  await e.request({
    method: "wallet_switchEthereumChain",
    params: [
      {
        chainId: N(t)
      }
    ]
  }, { retryCount: 0 });
}
async function Rp(e, t) {
  return await e.request({
    method: "wallet_watchAsset",
    params: t
  }, { retryCount: 0 });
}
async function Mp(e, t) {
  return An.internal(e, nu, "sendTransactionSync", t);
}
function Lp(e) {
  return {
    addChain: (t) => Ep(e, t),
    deployContract: (t) => Pp(e, t),
    fillTransaction: (t) => Ys(e, t),
    getAddresses: () => Ap(e),
    getCallsStatus: (t) => ic(e, t),
    getCapabilities: (t) => $p(e, t),
    getChainId: () => Ye(e),
    getPermissions: () => Ip(e),
    prepareAuthorization: (t) => tu(e, t),
    prepareTransactionRequest: (t) => On(e, t),
    requestAddresses: () => Sp(e),
    requestPermissions: (t) => Bp(e, t),
    sendCalls: (t) => oc(e, t),
    sendCallsSync: (t) => Tp(e, t),
    sendRawTransaction: (t) => uo(e, t),
    sendRawTransactionSync: (t) => Io(e, t),
    sendTransaction: (t) => gr(e, t),
    sendTransactionSync: (t) => nu(e, t),
    showCallsStatus: (t) => Cp(e, t),
    signAuthorization: (t) => kp(e, t),
    signMessage: (t) => Np(e, t),
    signTransaction: (t) => Fp(e, t),
    signTypedData: (t) => Op(e, t),
    switchChain: (t) => zp(e, t),
    waitForCallsStatus: (t) => ac(e, t),
    watchAsset: (t) => Rp(e, t),
    writeContract: (t) => An(e, t),
    writeContractSync: (t) => Mp(e, t)
  };
}
function _p(e) {
  const { key: t = "wallet", name: n = "Wallet Client", transport: r } = e;
  return uc({
    ...e,
    key: t,
    name: n,
    transport: r,
    type: "walletClient"
  }).extend(Lp);
}
function ru({ key: e, methods: t, name: n, request: r, retryCount: s = 3, retryDelay: o = 150, timeout: i, type: a }, c) {
  const u = cc();
  return {
    config: {
      key: e,
      methods: t,
      name: n,
      request: r,
      retryCount: s,
      retryDelay: o,
      timeout: i,
      type: a
    },
    request: ih(r, { methods: t, retryCount: s, retryDelay: o, uid: u }),
    value: c
  };
}
function jp(e, t = {}) {
  const { key: n = "custom", methods: r, name: s = "Custom Provider", retryDelay: o } = t;
  return ({ retryCount: i }) => ru({
    key: n,
    methods: r,
    name: s,
    request: e.request.bind(e),
    retryCount: t.retryCount ?? i,
    retryDelay: o,
    type: "custom"
  });
}
function Up(e, t = {}) {
  const { batch: n, fetchFn: r, fetchOptions: s, key: o = "http", methods: i, name: a = "HTTP JSON-RPC", onFetchRequest: c, onFetchResponse: u, retryDelay: f, raw: d } = t;
  return ({ chain: l, retryCount: h, timeout: p }) => {
    const { batchSize: b = 1e3, wait: x = 0 } = typeof n == "object" ? n : {}, g = t.retryCount ?? h, w = p ?? t.timeout ?? 1e4, m = e, y = fh(m, {
      fetchFn: r,
      fetchOptions: s,
      onRequest: c,
      onResponse: u,
      timeout: w
    });
    return ru({
      key: o,
      methods: i,
      name: a,
      async request({ method: E, params: $ }) {
        const P = { method: E, params: $ }, { schedule: A } = ec({
          id: m,
          wait: x,
          shouldSplitBatch(F) {
            return F.length > b;
          },
          fn: (F) => y.request({
            body: F
          }),
          sort: (F, k) => F.id - k.id
        }), C = async (F) => n ? A(F) : [
          await y.request({
            body: F
          })
        ], [{ error: z, result: S }] = await C(P);
        if (d)
          return { error: z, result: S };
        if (z)
          throw new Us({
            body: P,
            error: z,
            url: m
          });
        return S;
      },
      retryCount: g,
      retryDelay: f,
      timeout: w,
      type: "http"
    }, {
      fetchOptions: s,
      url: m
    });
  };
}
const Gp = {
  gasPriceOracle: { address: "0x420000000000000000000000000000000000000F" },
  l1Block: { address: "0x4200000000000000000000000000000000000015" },
  l2CrossDomainMessenger: {
    address: "0x4200000000000000000000000000000000000007"
  },
  l2Erc721Bridge: { address: "0x4200000000000000000000000000000000000014" },
  l2StandardBridge: { address: "0x4200000000000000000000000000000000000010" },
  l2ToL1MessagePasser: {
    address: "0x4200000000000000000000000000000000000016"
  }
}, Dp = {
  block: /* @__PURE__ */ Jf({
    format(e) {
      var n;
      return {
        transactions: (n = e.transactions) == null ? void 0 : n.map((r) => {
          if (typeof r == "string")
            return r;
          const s = Fn(r);
          return s.typeHex === "0x7e" && (s.isSystemTx = r.isSystemTx, s.mint = r.mint ? X(r.mint) : void 0, s.sourceHash = r.sourceHash, s.type = "deposit"), s;
        }),
        stateRoot: e.stateRoot
      };
    }
  }),
  transaction: /* @__PURE__ */ Zf({
    format(e) {
      const t = {};
      return e.type === "0x7e" && (t.isSystemTx = e.isSystemTx, t.mint = e.mint ? X(e.mint) : void 0, t.sourceHash = e.sourceHash, t.type = "deposit"), t;
    }
  }),
  transactionReceipt: /* @__PURE__ */ ll({
    format(e) {
      return {
        l1GasPrice: e.l1GasPrice ? X(e.l1GasPrice) : null,
        l1GasUsed: e.l1GasUsed ? X(e.l1GasUsed) : null,
        l1Fee: e.l1Fee ? X(e.l1Fee) : null,
        l1FeeScalar: e.l1FeeScalar ? Number(e.l1FeeScalar) : null
      };
    }
  })
};
function Hp(e, t) {
  return Wp(e) ? Vp(e) : Yl(e, t);
}
const qp = {
  transaction: Hp
};
function Vp(e) {
  Zp(e);
  const { sourceHash: t, data: n, from: r, gas: s, isSystemTx: o, mint: i, to: a, value: c } = e, u = [
    t,
    r,
    a ?? "0x",
    i ? ae(i) : "0x",
    c ? ae(c) : "0x",
    s ? ae(s) : "0x",
    o ? "0x1" : "0x",
    n ?? "0x"
  ];
  return Ie([
    "0x7e",
    Ke(u)
  ]);
}
function Wp(e) {
  return e.type === "deposit" || typeof e.sourceHash < "u";
}
function Zp(e) {
  const { from: t, to: n } = e;
  if (t && !J(t))
    throw new se({ address: t });
  if (n && !J(n))
    throw new se({ address: n });
}
const $i = {
  blockTime: 2e3,
  contracts: Gp,
  formatters: Dp,
  serializers: qp
}, Jt = 11155111, So = /* @__PURE__ */ mc({
  ...$i,
  id: 84532,
  network: "base-sepolia",
  name: "Base Sepolia",
  nativeCurrency: { name: "Sepolia Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: {
      http: ["https://sepolia.base.org"]
    }
  },
  blockExplorers: {
    default: {
      name: "Basescan",
      url: "https://sepolia.basescan.org",
      apiUrl: "https://api-sepolia.basescan.org/api"
    }
  },
  contracts: {
    ...$i.contracts,
    disputeGameFactory: {
      [Jt]: {
        address: "0xd6E6dBf4F7EA0ac412fD8b65ED297e64BB7a06E1"
      }
    },
    l2OutputOracle: {
      [Jt]: {
        address: "0x84457ca9D0163FbC4bbfe4Dfbb20ba46e48DF254"
      }
    },
    portal: {
      [Jt]: {
        address: "0x49f53e41452c74589e85ca1677426ba426459e85",
        blockCreated: 4446677
      }
    },
    l1StandardBridge: {
      [Jt]: {
        address: "0xfd0Bf71F60660E2f608ed56e1659C450eB113120",
        blockCreated: 4446677
      }
    },
    multicall3: {
      address: "0xca11bde05977b3631167028862be2a173976ca11",
      blockCreated: 1059647
    }
  },
  testnet: !0,
  sourceId: Jt
});
({
  ...So
});
class su {
  constructor() {
    this._listeners = /* @__PURE__ */ new Map();
  }
  on(t, n) {
    return this._listeners.has(t) || this._listeners.set(t, /* @__PURE__ */ new Set()), this._listeners.get(t).add(n), this;
  }
  off(t, n) {
    var r;
    return (r = this._listeners.get(t)) == null || r.delete(n), this;
  }
  emit(t, ...n) {
    var r;
    (r = this._listeners.get(t)) == null || r.forEach((s) => {
      try {
        s(...n);
      } catch {
      }
    });
  }
}
class Kp {
  constructor(t) {
    this.sessionToken = null, this.apiUrl = t.replace(/\/+$/, "");
  }
  setSessionToken(t) {
    this.sessionToken = t;
  }
  // -- Public endpoints (no auth) --
  async getPlaybackInfo(t) {
    const n = await fetch(
      `${this.apiUrl}/v2/public/contents/${t}/playback-info`
    );
    if (!n.ok)
      throw new Error(`Playback info failed: ${n.status}`);
    return n.json();
  }
  async createViewerSession(t, n) {
    const r = await fetch(`${this.apiUrl}/v2/public/viewer-session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content_id: t,
        wallet_address: n
      })
    });
    if (!r.ok)
      throw new Error(`Viewer session failed: ${r.status}`);
    const s = await r.json();
    return this.sessionToken = s.session_token, {
      sessionToken: s.session_token,
      profileId: s.profile_id
    };
  }
  // -- Authenticated endpoints (jj_ Bearer token) --
  authHeaders() {
    const t = { "Content-Type": "application/json" };
    return this.sessionToken && (t.Authorization = `Bearer ${this.sessionToken}`), t;
  }
  async createStreamingSession(t, n) {
    const r = await fetch(`${this.apiUrl}/v2/streaming/sessions`, {
      method: "POST",
      headers: this.authHeaders(),
      body: JSON.stringify({
        content_id: t,
        viewer_wallet: n,
        viewer_type: "human"
      })
    });
    if (!r.ok) {
      const o = await r.text();
      throw new Error(`Create session failed: ${r.status} ${o}`);
    }
    const s = await r.json();
    return {
      sessionId: s.session_id,
      onChainSessionId: s.on_chain_session_id
    };
  }
  async recordSegment(t) {
    const n = await fetch(
      `${this.apiUrl}/v2/streaming/sessions/${t}/segment`,
      { method: "POST", headers: this.authHeaders() }
    );
    n.ok || console.error("[JubJub] segment failed:", n.status);
  }
  async closeSession(t, n) {
    const r = await fetch(
      `${this.apiUrl}/v2/streaming/sessions/${t}/close`,
      {
        method: "POST",
        headers: this.authHeaders(),
        body: JSON.stringify({ playback_seconds: n })
      }
    );
    r.ok || console.error("[JubJub] close failed:", r.status);
  }
  beaconClose(t, n, r) {
    const s = JSON.stringify({
      viewer_wallet: n,
      playback_seconds: r
    }), o = new Blob([s], { type: "application/json" });
    navigator.sendBeacon(
      `${this.apiUrl}/v2/streaming/sessions/${t}/beacon-close`,
      o
    );
  }
}
class Jp {
  constructor(t) {
    var n;
    this.client = null, this._address = null, this.mode = null, t && (this.client = t, this._address = ((n = t.account) == null ? void 0 : n.address) ?? t.address ?? null, this.mode = "byo");
  }
  async connect() {
    var t;
    if (this._address && this.client)
      return this._address;
    if (this.client) {
      const n = ((t = this.client.account) == null ? void 0 : t.address) ?? this.client.address ?? null;
      if (n)
        return this._address = n, this.mode = "byo", n;
    }
    try {
      const n = await import("./sdk-CMYq8l3H.mjs");
      throw new Error("Privy headless SDK integration is not yet implemented");
    } catch {
      throw new Error(
        "No wallet provided. Pass a wallet client via options.wallet, or install @privy-io/js-sdk-core for built-in wallet connect."
      );
    }
  }
  getAddress() {
    return this._address;
  }
  getClient() {
    return this.client;
  }
  getMode() {
    return this.mode;
  }
}
const Ii = [
  {
    name: "allowance",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" }
    ],
    outputs: [{ name: "", type: "uint256" }]
  },
  {
    name: "approve",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" }
    ],
    outputs: [{ name: "", type: "bool" }]
  }
], Yp = BigInt(
  "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
);
class Xp {
  constructor(t, n) {
    this.wallet = t, this.usdc = n.usdc_address, this.router = n.payment_router, this.publicClient = vp({
      chain: So,
      transport: Up("https://sepolia.base.org")
    });
  }
  async isApproved() {
    const t = this.wallet.getAddress();
    return t ? await this.publicClient.readContract({
      address: this.usdc,
      abi: Ii,
      functionName: "allowance",
      args: [t, this.router]
    }) > 0n : !1;
  }
  async approve() {
    const t = this.wallet.getClient();
    if (!t) throw new Error("No wallet client");
    const n = await t.writeContract({
      address: this.usdc,
      abi: Ii,
      functionName: "approve",
      args: [this.router, Yp]
    });
    await this.publicClient.waitForTransactionReceipt({ hash: n });
  }
  async ensureApproved() {
    return await this.isApproved() ? !1 : (await this.approve(), !0);
  }
}
class Bo {
  constructor(t, n, r, s, o) {
    this.id = t, this.onChainId = n, this.contentId = r, this.walletAddress = s, this.api = o;
  }
  static async create(t, n, r) {
    const s = await r.createStreamingSession(t, n);
    return new Bo(
      s.sessionId,
      s.onChainSessionId,
      t,
      n,
      r
    );
  }
  async close(t) {
    await this.api.closeSession(this.id, t);
  }
  beaconClose(t) {
    this.api.beaconClose(this.id, this.walletAddress, t);
  }
}
const Qp = 6, eb = 2;
class tb extends su {
  // based on totalPlaybackSeconds
  constructor(t, n, r, s) {
    super(), this.displayInterval = null, this.timeUpdateHandler = null, this.totalPlaybackSeconds = 0, this.lastCurrentTime = 0, this.lastSegmentBoundary = 0, this.video = t, this.pricePerMinute = n, this.pricePerSecond = n / 60, this.session = r, this.api = s, this.lastCurrentTime = t.currentTime;
  }
  start() {
    this.timeUpdateHandler = () => {
      const t = this.video.currentTime, n = t - this.lastCurrentTime;
      this.lastCurrentTime = t, n > 0 && n <= eb && (this.totalPlaybackSeconds += n);
      const r = Math.floor(
        this.totalPlaybackSeconds / Qp
      );
      if (r > this.lastSegmentBoundary) {
        const s = r - this.lastSegmentBoundary;
        for (let o = 0; o < s; o++)
          this.api.recordSegment(this.session.id).catch(() => {
          });
        this.lastSegmentBoundary = r;
      }
    }, this.video.addEventListener("timeupdate", this.timeUpdateHandler), this.displayInterval = window.setInterval(() => {
      if (this.video.paused) return;
      const t = this.getCost();
      this.emit("cost", t);
    }, 200);
  }
  stop() {
    this.timeUpdateHandler && (this.video.removeEventListener("timeupdate", this.timeUpdateHandler), this.timeUpdateHandler = null), this.displayInterval !== null && (clearInterval(this.displayInterval), this.displayInterval = null);
  }
  getPlaybackSeconds() {
    return this.totalPlaybackSeconds;
  }
  getCost() {
    const t = this.totalPlaybackSeconds, n = t * this.pricePerSecond;
    return {
      usdc: n,
      seconds: t,
      formatted: `$${n.toFixed(4)}`
    };
  }
}
const nb = {
  "bottom-right": "bottom:8px;right:8px;",
  "bottom-left": "bottom:8px;left:8px;",
  "top-right": "top:8px;right:8px;",
  "top-left": "top:8px;left:8px;"
};
class rb {
  constructor(t, n = "bottom-right") {
    this.observer = null, this.video = t;
    const r = t.parentElement;
    r && getComputedStyle(r).position === "static" && (r.style.position = "relative"), this.container = document.createElement("div"), this.container.setAttribute("data-jubjub-overlay", "true"), this.container.style.cssText = `position:absolute;${nb[n]}z-index:1000;display:flex;align-items:center;gap:6px;background:rgba(0,0,0,0.75);color:#fff;padding:4px 10px;border-radius:6px;font-family:system-ui,-apple-system,sans-serif;font-size:12px;pointer-events:auto;user-select:none;backdrop-filter:blur(4px);transition:opacity 0.2s;`, this.costEl = document.createElement("span"), this.costEl.style.cssText = "font-family:ui-monospace,monospace;font-weight:600;", this.costEl.textContent = "$0.0000", this.timeEl = document.createElement("span"), this.timeEl.style.cssText = "font-family:ui-monospace,monospace;opacity:0.7;", this.timeEl.textContent = "0:00";
    const s = document.createElement("span");
    s.style.cssText = "opacity:0.4;", s.textContent = "·";
    const o = document.createElement("a");
    o.href = "https://jubjubapp.com", o.target = "_blank", o.rel = "noopener noreferrer", o.style.cssText = "font-size:9px;opacity:0.5;color:#fff;text-decoration:none;margin-left:4px;", o.textContent = "Powered by JubJub", this.container.appendChild(this.costEl), this.container.appendChild(s), this.container.appendChild(this.timeEl), this.container.appendChild(o), (r ?? document.body).appendChild(this.container);
  }
  update(t) {
    this.costEl.textContent = t.formatted;
    const n = Math.floor(t.seconds), r = Math.floor(n / 60), s = n % 60;
    this.timeEl.textContent = `${r}:${s.toString().padStart(2, "0")}`;
  }
  remove() {
    var t;
    (t = this.observer) == null || t.disconnect(), this.container.remove();
  }
}
const ou = "https://api.jubjubapp.com", sb = {
  contentId: void 0,
  wallet: void 0,
  apiUrl: ou,
  network: "testnet",
  showCostOverlay: !0,
  overlayPosition: "bottom-right"
};
class iu extends su {
  constructor(t = {}) {
    super(), this.approval = null, this.session = null, this.costTracker = null, this.overlay = null, this.contentInfo = null, this.video = null, this.beforeUnloadHandler = null, this.options = { ...sb, ...t }, this.api = new Kp(this.options.apiUrl ?? ou), this.wallet = new Jp(this.options.wallet ?? void 0), t.onCostUpdate && this.on("cost", (n) => t.onCostUpdate(n.usdc, n.seconds)), t.onSessionStart && this.on("session:start", t.onSessionStart), t.onSessionEnd && this.on("session:end", t.onSessionEnd), t.onError && this.on("error", t.onError), t.onWalletConnected && this.on("wallet:connected", t.onWalletConnected);
  }
  /**
   * Zero-config shorthand — two lines to add streaming payments.
   *
   * ```js
   * JubJub.play('cnt_xxx', document.getElementById('video'));
   * ```
   */
  static play(t, n, r = {}) {
    const s = new iu({ ...r, contentId: t });
    return t ? (s.attach(t, n).catch((o) => {
      s.emit("error", o), console.error("[JubJub]", o);
    }), s) : (console.warn("[JubJub] No content ID provided — video will play without payments."), s);
  }
  /**
   * Full async setup flow — resolves when streaming is active.
   */
  async attach(t, n) {
    var r, s, o;
    if (this.video = n, !t) {
      const i = new Error("No content ID — video plays without payments.");
      console.warn("[JubJub]", i.message), this.emit("error", i);
      return;
    }
    try {
      try {
        this.contentInfo = await this.api.getPlaybackInfo(t);
      } catch (c) {
        const u = (r = c == null ? void 0 : c.message) != null && r.includes("404") ? `Content '${t}' not found — video plays without payments.` : `Failed to load content info — video plays without payments. (${c == null ? void 0 : c.message})`;
        console.warn("[JubJub]", u), this.emit("error", new Error(u));
        return;
      }
      this.emit("content:loaded", this.contentInfo);
      const i = await this.wallet.connect();
      this.emit("wallet:connected", i), await this.api.createViewerSession(t, i), this.approval = new Xp(this.wallet, {
        usdc_address: this.contentInfo.usdc_address,
        payment_router: this.contentInfo.payment_router,
        chain_id: this.contentInfo.chain_id
      }), await this.approval.ensureApproved() && this.emit("approved", i), this.session = await Bo.create(t, i, this.api), this.emit("session:start", this.session.id), (o = (s = this.options).onSessionStart) == null || o.call(s, this.session.id), this.costTracker = new tb(
        n,
        this.contentInfo.price_per_minute_usdc,
        this.session,
        this.api
      ), this.costTracker.on("cost", (c) => {
        var u;
        this.emit("cost", c), (u = this.overlay) == null || u.update(c);
      }), this.costTracker.start(), this.options.showCostOverlay !== !1 && (this.overlay = new rb(
        n,
        this.options.overlayPosition ?? "bottom-right"
      )), this.beforeUnloadHandler = () => {
        this.session && this.costTracker && this.session.beaconClose(this.costTracker.getPlaybackSeconds());
      }, window.addEventListener("beforeunload", this.beforeUnloadHandler), this.emit("ready");
    } catch (i) {
      const a = i instanceof Error ? i : new Error(String(i));
      throw this.emit("error", a), a;
    }
  }
  /**
   * Gracefully end the streaming session.
   */
  async disconnect() {
    var s, o, i, a, c, u;
    const t = ((s = this.costTracker) == null ? void 0 : s.getPlaybackSeconds()) ?? 0, n = ((i = (o = this.costTracker) == null ? void 0 : o.getCost()) == null ? void 0 : i.usdc) ?? 0;
    (a = this.costTracker) == null || a.stop(), this.session && await this.session.close(t), (c = this.overlay) == null || c.remove(), this.beforeUnloadHandler && (window.removeEventListener("beforeunload", this.beforeUnloadHandler), this.beforeUnloadHandler = null);
    const r = {
      sessionId: ((u = this.session) == null ? void 0 : u.id) ?? "",
      seconds: t,
      cost: n,
      walletAddress: this.wallet.getAddress() ?? ""
    };
    return this.emit("session:end", r), this.session = null, this.costTracker = null, this.overlay = null, r;
  }
  getSession() {
    return this.session ? { id: this.session.id, onChainId: this.session.onChainId } : null;
  }
  getCost() {
    var t;
    return ((t = this.costTracker) == null ? void 0 : t.getCost()) ?? { usdc: 0, seconds: 0, formatted: "$0.0000" };
  }
  getWallet() {
    return this.wallet.getAddress();
  }
  getContentInfo() {
    return this.contentInfo;
  }
  /**
   * Connect a browser-injected wallet (MetaMask, Coinbase Wallet, etc.).
   *
   * Returns a viem WalletClient that satisfies the WalletLike interface.
   * Works with any EIP-1193 provider at `window.ethereum`.
   *
   * ```js
   * const wallet = await JubJub.connectBrowserWallet();
   * JubJub.play('cnt_xxx', video, { wallet });
   * ```
   */
  static async connectBrowserWallet() {
    const t = window.ethereum;
    if (!t)
      throw new Error(
        "No browser wallet detected. Install MetaMask or another wallet extension."
      );
    const n = await t.request({
      method: "eth_requestAccounts"
    });
    if (!n.length)
      throw new Error("No accounts returned from wallet.");
    const r = n[0];
    try {
      await t.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: "0x14A34" }]
        // 84532
      });
    } catch (o) {
      o.code === 4902 && await t.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: "0x14A34",
            chainName: "Base Sepolia",
            nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
            rpcUrls: ["https://sepolia.base.org"],
            blockExplorerUrls: ["https://sepolia.basescan.org"]
          }
        ]
      });
    }
    return _p({
      account: r,
      chain: So,
      transport: jp(t)
    });
  }
}
export {
  Kp as A,
  I as B,
  rb as C,
  su as E,
  Yt as H,
  iu as J,
  Bo as S,
  Jp as W,
  yl as a,
  ee as b,
  Ln as c,
  xf as d,
  pt as e,
  Te as f,
  js as g,
  Xp as h,
  zt as i,
  tb as j,
  wr as l,
  K as s
};
//# sourceMappingURL=index-BZhg5Qk8.mjs.map
