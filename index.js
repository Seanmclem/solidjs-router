var solidjsrouter = (function (exports) {
  'use strict';

  // Modified version of S.js[https://github.com/adamhaile/S] by Adam Haile
  function createEffect(fn, value) {
    createComputationNode(fn, value);
  }
  function createMemo(fn, value, comparator) {
    var node = createComputationNode(fn, value);
    node.comparator = comparator || null;
    return () => {
      if (Listener !== null) {
        const state = node.state;

        if ((state & 7) !== 0) {
          liftComputation(node);
        }

        if (node.age === RootClock.time && state === 8) {
          throw new Error("Circular dependency.");
        }

        if ((state & 16) === 0) {
          if (node.log === null) node.log = createLog();
          logRead(node.log);
        }
      }

      return node.value;
    };
  }
  function freeze(fn) {
    let result = undefined;
    if (RunningClock !== null) result = fn();else {
      RunningClock = RootClock;
      RunningClock.changes.reset();

      try {
        result = fn();
        event();
      } finally {
        RunningClock = null;
      }
    }
    return result;
  }
  function sample(fn) {
    let result,
        listener = Listener;
    Listener = null;
    result = fn();
    Listener = listener;
    return result;
  }
  function isListening() {
    return Listener !== null;
  } // context API

  function createContext(defaultValue) {
    const id = Symbol("context");
    return {
      id,
      Provider: createProvider(id),
      defaultValue
    };
  }
  function useContext(context) {
    return lookup(Owner, context.id) || context.defaultValue;
  }
  /// Graph classes and operations

  class DataNode {
    constructor(value) {
      this.value = value;
      this.pending = NOTPENDING;
      this.log = null;
    }

    current() {
      if (Listener !== null) {
        if (this.log === null) this.log = createLog();
        logRead(this.log);
      }

      return this.value;
    }

    next(value) {
      if (RunningClock !== null) {
        if (this.pending !== NOTPENDING) {
          // value has already been set once, check for conflicts
          if (value !== this.pending) {
            throw new Error("conflicting changes: " + value + " !== " + this.pending);
          }
        } else {
          // add to list of changes
          this.pending = value;
          RootClock.changes.add(this);
        }
      } else {
        // not batching, respond to change now
        if (this.log !== null) {
          this.pending = value;
          RootClock.changes.add(this);
          event();
        } else {
          this.value = value;
        }
      }

      return value;
    }

  }

  function createComputationNode(fn, value) {
    const node = {
      fn,
      value,
      age: RootClock.time,
      state: 0,
      comparator: null,
      source1: null,
      source1slot: 0,
      sources: null,
      sourceslots: null,
      dependents: null,
      dependentslot: 0,
      dependentcount: 0,
      owner: Owner,
      owned: null,
      log: null,
      context: null,
      cleanups: null
    };
    if (fn === null) return node;
    let owner = Owner,
        listener = Listener;
    if (owner === null) console.warn("computations created without a root or parent will never be disposed");
    Owner = Listener = node;

    if (RunningClock === null) {
      toplevelComputation(node);
    } else {
      node.value = node.fn(node.value);
    }

    if (owner && owner !== UNOWNED) {
      if (owner.owned === null) owner.owned = [node];else owner.owned.push(node);
    }

    Owner = owner;
    Listener = listener;
    return node;
  }

  function createClock() {
    return {
      time: 0,
      changes: new Queue(),
      // batched changes to data nodes
      updates: new Queue(),
      // computations to update
      disposes: new Queue() // disposals to run after current batch of updates finishes

    };
  }

  function createLog() {
    return {
      node1: null,
      node1slot: 0,
      nodes: null,
      nodeslots: null
    };
  }

  class Queue {
    constructor() {
      this.items = [];
      this.count = 0;
    }

    reset() {
      this.count = 0;
    }

    add(item) {
      this.items[this.count++] = item;
    }

    run(fn) {
      let items = this.items;

      for (let i = 0; i < this.count; i++) {
        fn(items[i]);
        items[i] = null;
      }

      this.count = 0;
    }

  } // "Globals" used to keep track of current system state


  let RootClock = createClock(),
      RunningClock = null,
      // currently running clock
  Listener = null,
      // currently listening computation
  Owner = null,
      // owner for new computations
  Pending = null; // pending node
  // Constants

  let NOTPENDING = {},
      UNOWNED = createComputationNode(null, null); // State

  function lookup(owner, key) {
    return owner && (owner.context && owner.context[key] || owner.owner && lookup(owner.owner, key));
  }

  function resolveChildren(children) {
    if (typeof children === "function") return createMemo(children);

    if (Array.isArray(children)) {
      const results = [];

      for (let i = 0; i < children.length; i++) {
        let result = resolveChildren(children[i]);
        Array.isArray(result) ? results.push.apply(results, result) : results.push(result);
      }

      return results;
    }

    return children;
  }

  function createProvider(id) {
    return function provider(props) {
      let rendered;
      createComputationNode(() => {
        Owner.context = {
          [id]: props.value
        };
        rendered = sample(() => resolveChildren(props.children));
      });
      return rendered;
    };
  }

  function logRead(from) {
    let to = Listener,
        fromslot,
        toslot = to.source1 === null ? -1 : to.sources === null ? 0 : to.sources.length;

    if (from.node1 === null) {
      from.node1 = to;
      from.node1slot = toslot;
      fromslot = -1;
    } else if (from.nodes === null) {
      if (from.node1 === to) return;
      from.nodes = [to];
      from.nodeslots = [toslot];
      fromslot = 0;
    } else {
      fromslot = from.nodes.length;
      if (from.nodes[fromslot - 1] === to) return;
      from.nodes.push(to);
      from.nodeslots.push(toslot);
    }

    if (to.source1 === null) {
      to.source1 = from;
      to.source1slot = fromslot;
    } else if (to.sources === null) {
      to.sources = [from];
      to.sourceslots = [fromslot];
    } else {
      to.sources.push(from);
      to.sourceslots.push(fromslot);
    }
  }

  function liftComputation(node) {
    if ((node.state & 6) !== 0) {
      applyUpstreamUpdates(node);
    }

    if ((node.state & 1) !== 0) {
      updateNode(node);
    }

    resetComputation(node, 31);
  }

  function event() {
    // b/c we might be under a top level S.root(), have to preserve current root
    let owner = Owner;
    RootClock.updates.reset();
    RootClock.time++;

    try {
      run(RootClock);
    } finally {
      RunningClock = Listener = null;
      Owner = owner;
    }
  }

  function toplevelComputation(node) {
    RunningClock = RootClock;
    RootClock.changes.reset();
    RootClock.updates.reset();

    try {
      node.value = node.fn(node.value);

      if (RootClock.changes.count > 0 || RootClock.updates.count > 0) {
        RootClock.time++;
        run(RootClock);
      }
    } finally {
      RunningClock = Owner = Listener = null;
    }
  }

  function run(clock) {
    let running = RunningClock,
        count = 0;
    RunningClock = clock;
    clock.disposes.reset(); // for each batch ...

    while (clock.changes.count !== 0 || clock.updates.count !== 0 || clock.disposes.count !== 0) {
      if (count > 0) // don't tick on first run, or else we expire already scheduled updates
        clock.time++;
      clock.changes.run(applyDataChange);
      clock.updates.run(updateNode);
      clock.disposes.run(dispose); // if there are still changes after excessive batches, assume runaway

      if (count++ > 1e5) {
        throw new Error("Runaway clock detected");
      }
    }

    RunningClock = running;
  }

  function applyDataChange(data) {
    data.value = data.pending;
    data.pending = NOTPENDING;
    if (data.log) setComputationState(data.log, stateStale);
  }

  function updateNode(node) {
    const state = node.state;

    if ((state & 16) === 0) {
      if ((state & 2) !== 0) {
        node.dependents[node.dependentslot++] = null;

        if (node.dependentslot === node.dependentcount) {
          resetComputation(node, 14);
        }
      } else if ((state & 1) !== 0) {
        if ((state & 4) !== 0) {
          liftComputation(node);
        } else if (node.comparator) {
          const current = updateComputation(node);
          const comparator = node.comparator;

          if (!comparator(current, node.value)) {
            markDownstreamComputations(node, false, true);
          }
        } else {
          updateComputation(node);
        }
      }
    }
  }

  function updateComputation(node) {
    const value = node.value,
          owner = Owner,
          listener = Listener;
    Owner = Listener = node;
    node.state = 8;
    cleanupNode(node, false);
    node.value = node.fn(node.value);
    resetComputation(node, 31);
    Owner = owner;
    Listener = listener;
    return value;
  }

  function stateStale(node) {
    const time = RootClock.time;

    if (node.age < time) {
      node.state |= 1;
      node.age = time;
      setDownstreamState(node, !!node.comparator);
    }
  }

  function statePending(node) {
    const time = RootClock.time;

    if (node.age < time) {
      node.state |= 2;
      let dependents = node.dependents || (node.dependents = []);
      dependents[node.dependentcount++] = Pending;
      setDownstreamState(node, true);
    }
  }

  function pendingStateStale(node) {
    if ((node.state & 2) !== 0) {
      node.state = 1;
      const time = RootClock.time;

      if (node.age < time) {
        node.age = time;

        if (!node.comparator) {
          markDownstreamComputations(node, false, true);
        }
      }
    }
  }

  function setDownstreamState(node, pending) {
    RootClock.updates.add(node);

    if (node.comparator) {
      const pending = Pending;
      Pending = node;
      markDownstreamComputations(node, true, false);
      Pending = pending;
    } else {
      markDownstreamComputations(node, pending, false);
    }
  }

  function markDownstreamComputations(node, onchange, dirty) {
    const owned = node.owned;

    if (owned !== null) {
      const pending = onchange && !dirty;
      markForDisposal(owned, pending, RootClock.time);
    }

    const log = node.log;

    if (log !== null) {
      setComputationState(log, dirty ? pendingStateStale : onchange ? statePending : stateStale);
    }
  }

  function setComputationState(log, stateFn) {
    const node1 = log.node1,
          nodes = log.nodes;
    if (node1 !== null) stateFn(node1);

    if (nodes !== null) {
      for (let i = 0, ln = nodes.length; i < ln; i++) {
        stateFn(nodes[i]);
      }
    }
  }

  function markForDisposal(children, pending, time) {
    for (let i = 0, ln = children.length; i < ln; i++) {
      const child = children[i];

      if (child !== null) {
        if (pending) {
          if ((child.state & 16) === 0) {
            child.state |= 4;
          }
        } else {
          child.age = time;
          child.state = 16;
        }

        const owned = child.owned;
        if (owned !== null) markForDisposal(owned, pending, time);
      }
    }
  }

  function applyUpstreamUpdates(node) {
    if ((node.state & 4) !== 0) {
      const owner = node.owner;
      if ((owner.state & 7) !== 0) liftComputation(owner);
      node.state &= ~4;
    }

    if ((node.state & 2) !== 0) {
      const slots = node.dependents;

      for (let i = node.dependentslot, ln = node.dependentcount; i < ln; i++) {
        const slot = slots[i];
        if (slot != null) liftComputation(slot);
        slots[i] = null;
      }

      node.state &= ~2;
    }
  }

  function cleanupNode(node, final) {
    let source1 = node.source1,
        sources = node.sources,
        sourceslots = node.sourceslots,
        cleanups = node.cleanups,
        owned = node.owned,
        i,
        len;

    if (cleanups !== null) {
      for (i = 0; i < cleanups.length; i++) {
        cleanups[i](final);
      }

      node.cleanups = null;
    }

    if (owned !== null) {
      for (i = 0; i < owned.length; i++) {
        dispose(owned[i]);
      }

      node.owned = null;
    }

    if (source1 !== null) {
      cleanupSource(source1, node.source1slot);
      node.source1 = null;
    }

    if (sources !== null) {
      for (i = 0, len = sources.length; i < len; i++) {
        cleanupSource(sources.pop(), sourceslots.pop());
      }
    }
  }

  function cleanupSource(source, slot) {
    let nodes = source.nodes,
        nodeslots = source.nodeslots,
        last,
        lastslot;

    if (slot === -1) {
      source.node1 = null;
    } else {
      last = nodes.pop();
      lastslot = nodeslots.pop();

      if (slot !== nodes.length) {
        nodes[slot] = last;
        nodeslots[slot] = lastslot;

        if (lastslot === -1) {
          last.source1slot = slot;
        } else {
          last.sourceslots[lastslot] = slot;
        }
      }
    }
  }

  function resetComputation(node, flags) {
    node.state &= ~flags;
    node.dependentslot = 0;
    node.dependentcount = 0;
  }

  function dispose(node) {
    node.fn = null;
    node.log = null;
    node.dependents = null;
    cleanupNode(node, true);
    resetComputation(node, 31);
  }

  const SNODE = Symbol("solid-node"),
        SPROXY = Symbol("solid-proxy");

  function wrap(value) {
    return value[SPROXY] || (value[SPROXY] = new Proxy(value, proxyTraps));
  }

  function isWrappable(obj) {
    return obj != null && typeof obj === "object" && (obj.__proto__ === Object.prototype || Array.isArray(obj));
  }
  function unwrap(item) {
    let result, unwrapped, v;
    if (result = item != null && item._state) return result;
    if (!isWrappable(item)) return item;

    if (Array.isArray(item)) {
      if (Object.isFrozen(item)) item = item.slice(0);

      for (let i = 0, l = item.length; i < l; i++) {
        v = item[i];
        if ((unwrapped = unwrap(v)) !== v) item[i] = unwrapped;
      }
    } else {
      if (Object.isFrozen(item)) item = Object.assign({}, item);
      let keys = Object.keys(item);

      for (let i = 0, l = keys.length; i < l; i++) {
        v = item[keys[i]];
        if ((unwrapped = unwrap(v)) !== v) item[keys[i]] = unwrapped;
      }
    }

    return item;
  }

  function getDataNodes(target) {
    let nodes = target[SNODE];
    if (!nodes) target[SNODE] = nodes = {};
    return nodes;
  }

  const proxyTraps = {
    get(target, property) {
      if (property === "_state") return target;
      if (property === SPROXY || property === SNODE) return;
      const value = target[property],
            wrappable = isWrappable(value);

      if (isListening() && (typeof value !== "function" || target.hasOwnProperty(property))) {
        let nodes, node;

        if (wrappable && (nodes = getDataNodes(value))) {
          node = nodes._ || (nodes._ = new DataNode());
          node.current();
        }

        nodes = getDataNodes(target);
        node = nodes[property] || (nodes[property] = new DataNode());
        node.current();
      }

      return wrappable ? wrap(value) : value;
    },

    set() {
      return true;
    },

    deleteProperty() {
      return true;
    }

  };
  function setProperty(state, property, value, force) {
    let unwrappedValue = unwrap(value);
    if (!force && state[property] === unwrappedValue) return;
    const notify = Array.isArray(state) || !(property in state);

    if (unwrappedValue === void 0) {
      delete state[property];
    } else state[property] = unwrappedValue;

    let nodes = getDataNodes(state),
        node;
    (node = nodes[property]) && node.next();
    notify && (node = nodes._) && node.next();
  }

  function mergeState(state, value, force) {
    const keys = Object.keys(value);

    for (let i = 0; i < keys.length; i += 1) {
      const key = keys[i];
      setProperty(state, key, value[key], force);
    }
  }

  function updatePath(current, path, traversed = [], force) {
    if (path.length === 1) {
      let value = path[0];

      if (typeof value === "function") {
        value = value(wrap(current), traversed); // reconciled

        if (value === undefined) return;
      }

      mergeState(current, value, force);
      return;
    }

    const part = path.shift(),
          partType = typeof part,
          isArray = Array.isArray(current);

    if (Array.isArray(part)) {
      // Ex. update('data', [2, 23], 'label', l => l + ' !!!');
      for (let i = 0; i < part.length; i++) {
        updatePath(current, [part[i]].concat(path), traversed.concat([part[i]]), force);
      }
    } else if (isArray && partType === "function") {
      // Ex. update('data', i => i.id === 42, 'label', l => l + ' !!!');
      for (let i = 0; i < current.length; i++) {
        if (part(current[i], i)) updatePath(current, [i].concat(path), traversed.concat([i]), force);
      }
    } else if (isArray && partType === "object") {
      // Ex. update('data', { from: 3, to: 12, by: 2 }, 'label', l => l + ' !!!');
      const {
        from = 0,
        to = current.length - 1,
        by = 1
      } = part;

      for (let i = from; i <= to; i += by) {
        updatePath(current, [i].concat(path), traversed.concat([i]), force);
      }
    } else if (path.length === 1) {
      let value = path[0];

      if (typeof value === "function") {
        const currentPart = current[part];
        value = value(isWrappable(currentPart) ? wrap(currentPart) : currentPart, traversed.concat([part]));
      }

      if (isWrappable(current[part]) && isWrappable(value) && !Array.isArray(value)) {
        mergeState(current[part], value, force);
      } else setProperty(current, part, value, force);
    } else updatePath(current[part], path, traversed.concat([part]), force);
  }

  function createState(state) {
    const unwrappedState = unwrap(state || {});
    const wrappedState = wrap(unwrappedState);

    function setState(...args) {
      freeze(() => {
        if (Array.isArray(args[0])) {
          for (let i = 0; i < args.length; i += 1) {
            updatePath(unwrappedState, args[i]);
          }
        } else updatePath(unwrappedState, args);
      });
    }

    return [wrappedState, setState];
  } // force state change even if value hasn't changed

  const eventRegistry = new Set();
  function template(html, isSVG) {
    const t = document.createElement('template');
    t.innerHTML = html;
    if (t.innerHTML !== html) throw new Error(`Template html does not match input:\n${t.innerHTML}\n${html}`);
    let node = t.content.firstChild;
    if (isSVG) node = node.firstChild;
    return node;
  }
  function createComponent(Comp, props, dynamicKeys) {
    if (dynamicKeys) {
      for (let i = 0; i < dynamicKeys.length; i++) dynamicProp(props, dynamicKeys[i]);
    }

    return Comp(props);
  }
  function delegateEvents(eventNames) {
    for (let i = 0, l = eventNames.length; i < l; i++) {
      const name = eventNames[i];

      if (!eventRegistry.has(name)) {
        eventRegistry.add(name);
        document.addEventListener(name, eventHandler);
      }
    }
  }
  function insert(parent, accessor, marker, initial) {
    if (marker !== undefined && !initial) initial = [];
    if (typeof accessor === 'function') createEffect((current = initial) => insertExpression(parent, accessor(), current, marker));else if (Array.isArray(accessor) && checkDynamicArray(accessor)) {
      createEffect((current = initial) => insertExpression(parent, accessor, current, marker));
    } else {
      return insertExpression(parent, accessor, initial, marker);
    }
  } // SSR

  function dynamicProp(props, key) {
    const src = props[key];
    Object.defineProperty(props, key, {
      get() {
        return src();
      },

      enumerable: true
    });
  }

  function lookup$1(el) {
    return el && (el.model || lookup$1(el.host || el.parentNode));
  }

  function eventHandler(e) {
    const key = `__${e.type}`;
    let node = e.composedPath && e.composedPath()[0] || e.target; // reverse Shadow DOM retargetting

    if (e.target !== node) {
      Object.defineProperty(e, 'target', {
        configurable: true,
        value: node
      });
    } // simulate currentTarget


    Object.defineProperty(e, 'currentTarget', {
      configurable: true,

      get() {
        return node;
      }

    });

    while (node !== null) {
      const handler = node[key];

      if (handler) {
        const model = handler.length > 1 ? lookup$1(node) : undefined;
        handler(e, model);
        if (e.cancelBubble) return;
      }

      node = node.host && node.host instanceof Node ? node.host : node.parentNode;
    }
  }

  function normalizeIncomingArray(normalized, array) {
    for (let i = 0, len = array.length; i < len; i++) {
      let item = array[i],
          t;

      if (item instanceof Node) {
        normalized.push(item);
      } else if (item == null || item === true || item === false) ; else if (Array.isArray(item)) {
        normalizeIncomingArray(normalized, item);
      } else if ((t = typeof item) === 'string') {
        normalized.push(document.createTextNode(item));
      } else if (t === 'function') {
        const idx = item();
        normalizeIncomingArray(normalized, Array.isArray(idx) ? idx : [idx]);
      } else normalized.push(document.createTextNode(item.toString()));
    }

    return normalized;
  }

  function appendNodes(parent, array, marker) {
    for (let i = 0, len = array.length; i < len; i++) parent.insertBefore(array[i], marker);
  }

  function cleanChildren(parent, current, marker, replacement) {
    if (marker === undefined) return parent.textContent = '';
    const node = replacement || document.createTextNode('');

    if (current.length) {
      node !== current[0] && parent.replaceChild(node, current[0]);

      for (let i = current.length - 1; i > 0; i--) parent.removeChild(current[i]);
    } else parent.insertBefore(node, marker);

    return [node];
  }

  function checkDynamicArray(array) {
    for (let i = 0, len = array.length; i < len; i++) {
      const item = array[i];
      if (Array.isArray(item) && checkDynamicArray(item) || typeof item === 'function') return true;
    }

    return false;
  }

  function insertExpression(parent, value, current, marker) {
    if (value === current) return current;
    const t = typeof value,
          multi = marker !== undefined;
    parent = multi && current[0] && current[0].parentNode || parent;

    if (t === 'string' || t === 'number') {
      if (t === 'number') value = value.toString();

      if (multi) {
        let node = current[0];

        if (node && node.nodeType === 3) {
          node.data = value;
        } else node = document.createTextNode(value);

        current = cleanChildren(parent, current, marker, node);
      } else {
        if (current !== '' && typeof current === 'string') {
          current = parent.firstChild.data = value;
        } else current = parent.textContent = value;
      }
    } else if (value == null || t === 'boolean') {
      current = cleanChildren(parent, current, marker);
    } else if (t === 'function') {
      createEffect(() => current = insertExpression(parent, value(), current, marker));
    } else if (Array.isArray(value)) {
      const array = normalizeIncomingArray([], value);

      if (array.length === 0) {
        current = cleanChildren(parent, current, marker);
        if (multi) return current;
      } else {
        if (Array.isArray(current)) {
          if (current.length === 0) {
            appendNodes(parent, array, marker);
          } else reconcileArrays(parent, current, array);
        } else if (current == null || current === '') {
          appendNodes(parent, array);
        } else {
          reconcileArrays(parent, multi && current || [parent.firstChild], array);
        }
      }

      current = array;
    } else if (value instanceof Node) {
      if (Array.isArray(current)) {
        if (multi) return current = cleanChildren(parent, current, marker, value);
        cleanChildren(parent, current, null, value);
      } else if (current == null || current === '') {
        parent.appendChild(value);
      } else parent.replaceChild(value, parent.firstChild);

      current = value;
    }

    return current;
  } // Picked from
  // https://github.com/adamhaile/surplus/blob/master/src/runtime/content.ts#L368


  var NOMATCH = -1; // reconcile the content of parent from ns to us
  // see ivi's excellent writeup of diffing arrays in a vdom library:
  // https://github.com/ivijs/ivi/blob/2c81ead934b9128e092cc2a5ef2d3cabc73cb5dd/packages/ivi/src/vdom/implementation.ts#L1187
  // this code isn't identical, since we're diffing real dom nodes to nodes-or-strings,
  // but the core methodology of trimming ends and reversals, matching nodes, then using
  // the longest increasing subsequence to minimize DOM ops is inspired by ivi.

  function reconcileArrays(parent, ns, us) {
    var ulen = us.length,
        // n = nodes, u = updates
    // ranges defined by min and max indices
    nmin = 0,
        nmax = ns.length - 1,
        umin = 0,
        umax = ulen - 1,
        // start nodes of ranges
    n = ns[nmin],
        u = us[umin],
        // end nodes of ranges
    nx = ns[nmax],
        ux = us[umax],
        // node, if any, just after ux, used for doing .insertBefore() to put nodes at end
    ul = nx.nextSibling,
        i,
        loop = true; // scan over common prefixes, suffixes, and simple reversals

    fixes: while (loop) {
      loop = false; // common prefix, u === n

      while (u === n) {
        umin++;
        nmin++;
        if (umin > umax || nmin > nmax) break fixes;
        u = us[umin];
        n = ns[nmin];
      } // common suffix, ux === nx


      while (ux === nx) {
        ul = nx;
        umax--;
        nmax--;
        if (umin > umax || nmin > nmax) break fixes;
        ux = us[umax];
        nx = ns[nmax];
      } // reversal u === nx, have to swap node forward


      while (u === nx) {
        loop = true;
        parent.insertBefore(nx, n);
        umin++;
        nmax--;
        if (umin > umax || nmin > nmax) break fixes;
        u = us[umin];
        nx = ns[nmax];
      } // reversal ux === n, have to swap node back


      while (ux === n) {
        loop = true;
        if (ul === null) parent.appendChild(n);else parent.insertBefore(n, ul);
        ul = n;
        umax--;
        nmin++;
        if (umin > umax || nmin > nmax) break fixes;
        ux = us[umax];
        n = ns[nmin];
      }
    } // if that covered all updates, just need to remove any remaining nodes and we're done


    if (umin > umax) {
      // remove any remaining nodes
      while (nmin <= nmax) {
        parent.removeChild(ns[nmax]);
        nmax--;
      }

      return;
    } // if that covered all current nodes, just need to insert any remaining updates and we're done


    if (nmin > nmax) {
      // insert any remaining nodes
      while (umin <= umax) {
        parent.insertBefore(us[umin], ul);
        umin++;
      }

      return;
    } // Positions for reusing nodes from current DOM state


    const P = new Array(umax - umin + 1),
          I = new Map();

    for (let i = umin; i <= umax; i++) {
      P[i] = NOMATCH;
      I.set(us[i], i);
    }

    let reusingNodes = umin + us.length - 1 - umax,
        toRemove = [];

    for (let i = nmin; i <= nmax; i++) {
      if (I.has(ns[i])) {
        P[I.get(ns[i])] = i;
        reusingNodes++;
      } else toRemove.push(i);
    } // Fast path for full replace


    if (reusingNodes === 0) {
      if (n !== parent.firstChild || nx !== parent.lastChild) {
        for (i = nmin; i <= nmax; i++) parent.removeChild(ns[i]);

        while (umin <= umax) {
          parent.insertBefore(us[umin], ul);
          umin++;
        }

        return;
      } // no nodes preserved, use fast clear and append


      parent.textContent = '';

      while (umin <= umax) {
        parent.appendChild(us[umin]);
        umin++;
      }

      return;
    } // find longest common sequence between ns and us, represented as the indices
    // of the longest increasing subsequence in src


    var lcs = longestPositiveIncreasingSubsequence(P, umin),
        nodes = [],
        tmp = ns[nmin],
        lisIdx = lcs.length - 1,
        tmpB;

    for (let i = nmin; i <= nmax; i++) {
      nodes[i] = tmp;
      tmp = tmp.nextSibling;
    }

    for (let i = 0; i < toRemove.length; i++) parent.removeChild(nodes[toRemove[i]]);

    for (let i = umax; i >= umin; i--) {
      if (lcs[lisIdx] === i) {
        ul = nodes[P[lcs[lisIdx]]];
        lisIdx--;
      } else {
        tmpB = P[i] === NOMATCH ? us[i] : nodes[P[i]];
        parent.insertBefore(tmpB, ul);
        ul = tmpB;
      }
    }
  } // return an array of the indices of ns that comprise the longest increasing subsequence within ns


  function longestPositiveIncreasingSubsequence(ns, newStart) {
    let seq = [],
        is = [],
        l = -1,
        pre = new Array(ns.length);

    for (let i = newStart, len = ns.length; i < len; i++) {
      let n = ns[i];
      if (n < 0) continue;
      let j = findGreatestIndexLEQ(seq, n);
      if (j !== -1) pre[i] = is[j];

      if (j === l) {
        l++;
        seq[l] = n;
        is[l] = i;
      } else if (n < seq[j + 1]) {
        seq[j + 1] = n;
        is[j + 1] = i;
      }
    }

    for (let i = is[l]; l >= 0; i = pre[i], l--) {
      seq[l] = i;
    }

    return seq;
  }

  function findGreatestIndexLEQ(seq, n) {
    // invariant: lo is guaranteed to be index of a value <= n, hi to be >
    // therefore, they actually start out of range: (-1, last + 1)
    var lo = -1,
        hi = seq.length; // fast path for simple increasing sequences

    if (hi > 0 && seq[hi - 1] <= n) return hi - 1;

    while (hi - lo > 1) {
      var mid = Math.floor((lo + hi) / 2);

      if (seq[mid] > n) {
        hi = mid;
      } else {
        lo = mid;
      }
    }

    return lo;
  }

  const equalFn = (a, b) => a === b;
  function Show(props) {
    const useFallback = "fallback" in props,
          condition = createMemo(() => props.when, undefined, equalFn),
          mapped = createMemo(() => condition() ? sample(() => props.children) : useFallback ? sample(() => props.fallback) : undefined);
    return props.transform ? props.transform(mapped, condition) : mapped;
  }

  const _tmpl$ = template(`<a></a>`);
  const Route = ({
    path,
    component,
    children
  }) => {
    const TheComponent = component;
    const [state] = useContext(RouterContext);
    return createComponent(Show, {
      when: () => path === state.currentRoute,
      children: () => TheComponent({})
    }, ["when", "children"]);
  };
  const RouterContext = createContext([{
    currentRoute: ''
  }, {}]); // this for some sort of init? Why? What?

  function RouterProvider(props) {
    const getCurrentRoute = () => {
      const fullPath = document.location.href;
      const routeArray = fullPath.split(document.location.host);
      const route = routeArray.length > 1 ? routeArray[1].replace('/', '') : '';
      return route;
    };

    const [state, setState] = createState({
      currentRoute: getCurrentRoute()
    });
    const store = [state, {
      setRoute(path) {
        setState({
          currentRoute: path
        });
      }

    }];
    return createComponent(RouterContext.Provider, {
      value: store,
      children: () => props.children
    }, ["children"]);
  }

  const navigate = (e, path, setRoute) => {
    e.preventDefault();
    path = path.indexOf('/') === 1 ? path.replace('/', '') : path;
    window.history.pushState("", "", `/${path}`);
    setRoute(path);
  };

  const RouterLink = props => {
    const [state, {
      setRoute
    }] = useContext(RouterContext);
    return function () {
      const _el$ = _tmpl$.cloneNode(true);

      _el$.__click = e => navigate(e, props.path, setRoute);

      insert(_el$, () => props.children);

      createEffect(() => _el$.setAttribute("href", props.path));

      return _el$;
    }();
  };

  delegateEvents(["click"]);

  exports.Route = Route;
  exports.RouterLink = RouterLink;
  exports.RouterProvider = RouterProvider;

  return exports;

}({}));
