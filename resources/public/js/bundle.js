
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
(function () {
    'use strict';

    /******************************************************************************
    Copyright (c) Microsoft Corporation.

    Permission to use, copy, modify, and/or distribute this software for any
    purpose with or without fee is hereby granted.

    THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
    REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
    AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
    INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
    LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
    OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
    PERFORMANCE OF THIS SOFTWARE.
    ***************************************************************************** */

    function __awaiter(thisArg, _arguments, P, generator) {
        function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
        return new (P || (P = Promise))(function (resolve, reject) {
            function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
            function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
            function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
            step((generator = generator.apply(thisArg, _arguments || [])).next());
        });
    }

    const USER_MEDIA_CONSTRAINTS = {
      audio: {
        mandatory: {
          googEchoCancellation: 'false',
          googAutoGainControl: 'false',
          googNoiseSuppression: 'false',
          googHighpassFilter: 'false',
        },
        optional: [],
      },
    };
    const FFT_SIZE = 2048;
    const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

    // Implements modified ACF2+ algorithm
    // Source: https://github.com/cwilso/PitchDetect
    const autoCorrelate = (buf, sampleRate) => {
      // Not enough signal check
      const RMS = Math.sqrt(buf.reduce((acc, el) => acc + el ** 2, 0) / buf.length);
      if (RMS < 0.001) return NaN

      const THRES = 0.2;
      let r1 = 0;
      let r2 = buf.length - 1;
      for (let i = 0; i < buf.length / 2; ++i) {
        if (Math.abs(buf[i]) < THRES) {
          r1 = i;
          break
        }
      }
      for (let i = 1; i < buf.length / 2; ++i) {
        if (Math.abs(buf[buf.length - i]) < THRES) {
          r2 = buf.length - i;
          break
        }
      }

      const buf2 = buf.slice(r1, r2);
      const c = new Array(buf2.length).fill(0);
      for (let i = 0; i < buf2.length; ++i) {
        for (let j = 0; j < buf2.length - i; ++j) {
          c[i] = c[i] + buf2[j] * buf2[j + i];
        }
      }

      let d = 0;
      for (; c[d] > c[d + 1]; ++d);

      let maxval = -1;
      let maxpos = -1;
      for (let i = d; i < buf2.length; ++i) {
        if (c[i] > maxval) {
          maxval = c[i];
          maxpos = i;
        }
      }
      let T0 = maxpos;

      let x1 = c[T0 - 1];
      let x2 = c[T0];
      let x3 = c[T0 + 1];
      let a = (x1 + x3 - 2 * x2) / 2;
      let b = (x3 - x1) / 2;

      return sampleRate / (a ? T0 - b / (2 * a) : T0)
    };

    // Information sources:

    const CONCERT_PITCH = 440; //frequency of a fixed note, which is used as a standard for tuning. It is usually a standard (also called concert) pitch of 440 Hz, which is called A440 or note A in the one-line (or fourth) octave (A4)
    const MIDI = 69; // the MIDI note number of A4
    const A$1 = 2 ** (1 / 12); // the twelth root of 2 = the number which when multiplied by itself 12 times equals 2 = 1.059463094359...
    const C0_PITCH = 16.35; // frequency of lowest note: C0

    var getDataFromFrequency = (frequency) => {
      const N = Math.round(12 * Math.log2(frequency / CONCERT_PITCH)); // the number of half steps away from the fixed note you are. If you are at a higher note, n is positive. If you are on a lower note, n is negative.
      const Fn = CONCERT_PITCH * A$1 ** N; // the frequency of the note n half steps away of concert pitch
      const noteIndex = (N + MIDI) % 12; // index of note letter from NOTES array
      const octave = Math.floor(Math.log2(Fn / C0_PITCH));

      return {
        frequency,
        note: NOTES[noteIndex],
        noteFrequency: Fn,
        deviation: frequency - Fn,
        octave,
      }
    };

    const freelizer = async () => {
      let rafID;
      let audioContext;
      let analyser;
      let callbacks = [];

      const init = async () => {
        const stream = await navigator.mediaDevices.getUserMedia(
          USER_MEDIA_CONSTRAINTS
        );
        audioContext = new AudioContext();
        analyser = audioContext.createAnalyser();
        analyser.fftSize = FFT_SIZE;
        audioContext.createMediaStreamSource(stream).connect(analyser);
      };

      const update = () => {
        const buffer = new Float32Array(FFT_SIZE);
        analyser.getFloatTimeDomainData(buffer);
        const frequency = autoCorrelate(buffer, audioContext.sampleRate);
        callbacks.forEach((fn) =>
          fn(frequency ? getDataFromFrequency(frequency) : {})
        );
        rafID = requestAnimationFrame(update);
      };

      await init();

      return {
        start: () => update(),
        stop: () => cancelAnimationFrame(rafID),
        subscribe: (fn) => (callbacks = [...callbacks, fn]),
        unsubscribe: (fn) => (callbacks = callbacks.filter((el) => el !== fn)),
      }
    };

    const tones = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
    function noteFreq(note, octave) {
        const Afreq = 440.0;
        let nDeltaNote = tones.indexOf(note) - tones.indexOf("A");
        let nDeltaOctave = (octave - 4) * 12;
        let n = nDeltaNote + nDeltaOctave;
        return Math.pow(2, n / 12) * Afreq;
    }

    /** Detect free variable `global` from Node.js. */
    var freeGlobal = typeof global == 'object' && global && global.Object === Object && global;

    /** Detect free variable `self`. */
    var freeSelf = typeof self == 'object' && self && self.Object === Object && self;

    /** Used as a reference to the global object. */
    var root$1 = freeGlobal || freeSelf || Function('return this')();

    /** Built-in value references. */
    var Symbol$2 = root$1.Symbol;

    /** Used for built-in method references. */
    var objectProto$e = Object.prototype;

    /** Used to check objects for own properties. */
    var hasOwnProperty$b = objectProto$e.hasOwnProperty;

    /**
     * Used to resolve the
     * [`toStringTag`](http://ecma-international.org/ecma-262/7.0/#sec-object.prototype.tostring)
     * of values.
     */
    var nativeObjectToString$1 = objectProto$e.toString;

    /** Built-in value references. */
    var symToStringTag$1 = Symbol$2 ? Symbol$2.toStringTag : undefined;

    /**
     * A specialized version of `baseGetTag` which ignores `Symbol.toStringTag` values.
     *
     * @private
     * @param {*} value The value to query.
     * @returns {string} Returns the raw `toStringTag`.
     */
    function getRawTag(value) {
      var isOwn = hasOwnProperty$b.call(value, symToStringTag$1),
          tag = value[symToStringTag$1];

      try {
        value[symToStringTag$1] = undefined;
        var unmasked = true;
      } catch (e) {}

      var result = nativeObjectToString$1.call(value);
      if (unmasked) {
        if (isOwn) {
          value[symToStringTag$1] = tag;
        } else {
          delete value[symToStringTag$1];
        }
      }
      return result;
    }

    /** Used for built-in method references. */
    var objectProto$d = Object.prototype;

    /**
     * Used to resolve the
     * [`toStringTag`](http://ecma-international.org/ecma-262/7.0/#sec-object.prototype.tostring)
     * of values.
     */
    var nativeObjectToString = objectProto$d.toString;

    /**
     * Converts `value` to a string using `Object.prototype.toString`.
     *
     * @private
     * @param {*} value The value to convert.
     * @returns {string} Returns the converted string.
     */
    function objectToString(value) {
      return nativeObjectToString.call(value);
    }

    /** `Object#toString` result references. */
    var nullTag = '[object Null]',
        undefinedTag = '[object Undefined]';

    /** Built-in value references. */
    var symToStringTag = Symbol$2 ? Symbol$2.toStringTag : undefined;

    /**
     * The base implementation of `getTag` without fallbacks for buggy environments.
     *
     * @private
     * @param {*} value The value to query.
     * @returns {string} Returns the `toStringTag`.
     */
    function baseGetTag(value) {
      if (value == null) {
        return value === undefined ? undefinedTag : nullTag;
      }
      return (symToStringTag && symToStringTag in Object(value))
        ? getRawTag(value)
        : objectToString(value);
    }

    /**
     * Checks if `value` is object-like. A value is object-like if it's not `null`
     * and has a `typeof` result of "object".
     *
     * @static
     * @memberOf _
     * @since 4.0.0
     * @category Lang
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is object-like, else `false`.
     * @example
     *
     * _.isObjectLike({});
     * // => true
     *
     * _.isObjectLike([1, 2, 3]);
     * // => true
     *
     * _.isObjectLike(_.noop);
     * // => false
     *
     * _.isObjectLike(null);
     * // => false
     */
    function isObjectLike(value) {
      return value != null && typeof value == 'object';
    }

    /** `Object#toString` result references. */
    var symbolTag$1 = '[object Symbol]';

    /**
     * Checks if `value` is classified as a `Symbol` primitive or object.
     *
     * @static
     * @memberOf _
     * @since 4.0.0
     * @category Lang
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is a symbol, else `false`.
     * @example
     *
     * _.isSymbol(Symbol.iterator);
     * // => true
     *
     * _.isSymbol('abc');
     * // => false
     */
    function isSymbol(value) {
      return typeof value == 'symbol' ||
        (isObjectLike(value) && baseGetTag(value) == symbolTag$1);
    }

    /**
     * A specialized version of `_.map` for arrays without support for iteratee
     * shorthands.
     *
     * @private
     * @param {Array} [array] The array to iterate over.
     * @param {Function} iteratee The function invoked per iteration.
     * @returns {Array} Returns the new mapped array.
     */
    function arrayMap(array, iteratee) {
      var index = -1,
          length = array == null ? 0 : array.length,
          result = Array(length);

      while (++index < length) {
        result[index] = iteratee(array[index], index, array);
      }
      return result;
    }

    /**
     * Checks if `value` is classified as an `Array` object.
     *
     * @static
     * @memberOf _
     * @since 0.1.0
     * @category Lang
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is an array, else `false`.
     * @example
     *
     * _.isArray([1, 2, 3]);
     * // => true
     *
     * _.isArray(document.body.children);
     * // => false
     *
     * _.isArray('abc');
     * // => false
     *
     * _.isArray(_.noop);
     * // => false
     */
    var isArray$1 = Array.isArray;

    var isArray$2 = isArray$1;

    /** Used as references for various `Number` constants. */
    var INFINITY$2 = 1 / 0;

    /** Used to convert symbols to primitives and strings. */
    var symbolProto$1 = Symbol$2 ? Symbol$2.prototype : undefined,
        symbolToString = symbolProto$1 ? symbolProto$1.toString : undefined;

    /**
     * The base implementation of `_.toString` which doesn't convert nullish
     * values to empty strings.
     *
     * @private
     * @param {*} value The value to process.
     * @returns {string} Returns the string.
     */
    function baseToString(value) {
      // Exit early for strings to avoid a performance hit in some environments.
      if (typeof value == 'string') {
        return value;
      }
      if (isArray$2(value)) {
        // Recursively convert values (susceptible to call stack limits).
        return arrayMap(value, baseToString) + '';
      }
      if (isSymbol(value)) {
        return symbolToString ? symbolToString.call(value) : '';
      }
      var result = (value + '');
      return (result == '0' && (1 / value) == -INFINITY$2) ? '-0' : result;
    }

    /** Used to match a single whitespace character. */
    var reWhitespace = /\s/;

    /**
     * Used by `_.trim` and `_.trimEnd` to get the index of the last non-whitespace
     * character of `string`.
     *
     * @private
     * @param {string} string The string to inspect.
     * @returns {number} Returns the index of the last non-whitespace character.
     */
    function trimmedEndIndex(string) {
      var index = string.length;

      while (index-- && reWhitespace.test(string.charAt(index))) {}
      return index;
    }

    /** Used to match leading whitespace. */
    var reTrimStart = /^\s+/;

    /**
     * The base implementation of `_.trim`.
     *
     * @private
     * @param {string} string The string to trim.
     * @returns {string} Returns the trimmed string.
     */
    function baseTrim(string) {
      return string
        ? string.slice(0, trimmedEndIndex(string) + 1).replace(reTrimStart, '')
        : string;
    }

    /**
     * Checks if `value` is the
     * [language type](http://www.ecma-international.org/ecma-262/7.0/#sec-ecmascript-language-types)
     * of `Object`. (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
     *
     * @static
     * @memberOf _
     * @since 0.1.0
     * @category Lang
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is an object, else `false`.
     * @example
     *
     * _.isObject({});
     * // => true
     *
     * _.isObject([1, 2, 3]);
     * // => true
     *
     * _.isObject(_.noop);
     * // => true
     *
     * _.isObject(null);
     * // => false
     */
    function isObject(value) {
      var type = typeof value;
      return value != null && (type == 'object' || type == 'function');
    }

    /** Used as references for various `Number` constants. */
    var NAN = 0 / 0;

    /** Used to detect bad signed hexadecimal string values. */
    var reIsBadHex = /^[-+]0x[0-9a-f]+$/i;

    /** Used to detect binary string values. */
    var reIsBinary = /^0b[01]+$/i;

    /** Used to detect octal string values. */
    var reIsOctal = /^0o[0-7]+$/i;

    /** Built-in method references without a dependency on `root`. */
    var freeParseInt = parseInt;

    /**
     * Converts `value` to a number.
     *
     * @static
     * @memberOf _
     * @since 4.0.0
     * @category Lang
     * @param {*} value The value to process.
     * @returns {number} Returns the number.
     * @example
     *
     * _.toNumber(3.2);
     * // => 3.2
     *
     * _.toNumber(Number.MIN_VALUE);
     * // => 5e-324
     *
     * _.toNumber(Infinity);
     * // => Infinity
     *
     * _.toNumber('3.2');
     * // => 3.2
     */
    function toNumber(value) {
      if (typeof value == 'number') {
        return value;
      }
      if (isSymbol(value)) {
        return NAN;
      }
      if (isObject(value)) {
        var other = typeof value.valueOf == 'function' ? value.valueOf() : value;
        value = isObject(other) ? (other + '') : other;
      }
      if (typeof value != 'string') {
        return value === 0 ? value : +value;
      }
      value = baseTrim(value);
      var isBinary = reIsBinary.test(value);
      return (isBinary || reIsOctal.test(value))
        ? freeParseInt(value.slice(2), isBinary ? 2 : 8)
        : (reIsBadHex.test(value) ? NAN : +value);
    }

    /** Used as references for various `Number` constants. */
    var INFINITY$1 = 1 / 0,
        MAX_INTEGER = 1.7976931348623157e+308;

    /**
     * Converts `value` to a finite number.
     *
     * @static
     * @memberOf _
     * @since 4.12.0
     * @category Lang
     * @param {*} value The value to convert.
     * @returns {number} Returns the converted number.
     * @example
     *
     * _.toFinite(3.2);
     * // => 3.2
     *
     * _.toFinite(Number.MIN_VALUE);
     * // => 5e-324
     *
     * _.toFinite(Infinity);
     * // => 1.7976931348623157e+308
     *
     * _.toFinite('3.2');
     * // => 3.2
     */
    function toFinite(value) {
      if (!value) {
        return value === 0 ? value : 0;
      }
      value = toNumber(value);
      if (value === INFINITY$1 || value === -INFINITY$1) {
        var sign = (value < 0 ? -1 : 1);
        return sign * MAX_INTEGER;
      }
      return value === value ? value : 0;
    }

    /**
     * Converts `value` to an integer.
     *
     * **Note:** This method is loosely based on
     * [`ToInteger`](http://www.ecma-international.org/ecma-262/7.0/#sec-tointeger).
     *
     * @static
     * @memberOf _
     * @since 4.0.0
     * @category Lang
     * @param {*} value The value to convert.
     * @returns {number} Returns the converted integer.
     * @example
     *
     * _.toInteger(3.2);
     * // => 3
     *
     * _.toInteger(Number.MIN_VALUE);
     * // => 0
     *
     * _.toInteger(Infinity);
     * // => 1.7976931348623157e+308
     *
     * _.toInteger('3.2');
     * // => 3
     */
    function toInteger(value) {
      var result = toFinite(value),
          remainder = result % 1;

      return result === result ? (remainder ? result - remainder : result) : 0;
    }

    /**
     * This method returns the first argument it receives.
     *
     * @static
     * @since 0.1.0
     * @memberOf _
     * @category Util
     * @param {*} value Any value.
     * @returns {*} Returns `value`.
     * @example
     *
     * var object = { 'a': 1 };
     *
     * console.log(_.identity(object) === object);
     * // => true
     */
    function identity(value) {
      return value;
    }

    /** `Object#toString` result references. */
    var asyncTag = '[object AsyncFunction]',
        funcTag$1 = '[object Function]',
        genTag = '[object GeneratorFunction]',
        proxyTag = '[object Proxy]';

    /**
     * Checks if `value` is classified as a `Function` object.
     *
     * @static
     * @memberOf _
     * @since 0.1.0
     * @category Lang
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is a function, else `false`.
     * @example
     *
     * _.isFunction(_);
     * // => true
     *
     * _.isFunction(/abc/);
     * // => false
     */
    function isFunction(value) {
      if (!isObject(value)) {
        return false;
      }
      // The use of `Object#toString` avoids issues with the `typeof` operator
      // in Safari 9 which returns 'object' for typed arrays and other constructors.
      var tag = baseGetTag(value);
      return tag == funcTag$1 || tag == genTag || tag == asyncTag || tag == proxyTag;
    }

    /** Used to detect overreaching core-js shims. */
    var coreJsData = root$1['__core-js_shared__'];

    /** Used to detect methods masquerading as native. */
    var maskSrcKey = (function() {
      var uid = /[^.]+$/.exec(coreJsData && coreJsData.keys && coreJsData.keys.IE_PROTO || '');
      return uid ? ('Symbol(src)_1.' + uid) : '';
    }());

    /**
     * Checks if `func` has its source masked.
     *
     * @private
     * @param {Function} func The function to check.
     * @returns {boolean} Returns `true` if `func` is masked, else `false`.
     */
    function isMasked(func) {
      return !!maskSrcKey && (maskSrcKey in func);
    }

    /** Used for built-in method references. */
    var funcProto$1 = Function.prototype;

    /** Used to resolve the decompiled source of functions. */
    var funcToString$1 = funcProto$1.toString;

    /**
     * Converts `func` to its source code.
     *
     * @private
     * @param {Function} func The function to convert.
     * @returns {string} Returns the source code.
     */
    function toSource(func) {
      if (func != null) {
        try {
          return funcToString$1.call(func);
        } catch (e) {}
        try {
          return (func + '');
        } catch (e) {}
      }
      return '';
    }

    /**
     * Used to match `RegExp`
     * [syntax characters](http://ecma-international.org/ecma-262/7.0/#sec-patterns).
     */
    var reRegExpChar = /[\\^$.*+?()[\]{}|]/g;

    /** Used to detect host constructors (Safari). */
    var reIsHostCtor = /^\[object .+?Constructor\]$/;

    /** Used for built-in method references. */
    var funcProto = Function.prototype,
        objectProto$c = Object.prototype;

    /** Used to resolve the decompiled source of functions. */
    var funcToString = funcProto.toString;

    /** Used to check objects for own properties. */
    var hasOwnProperty$a = objectProto$c.hasOwnProperty;

    /** Used to detect if a method is native. */
    var reIsNative = RegExp('^' +
      funcToString.call(hasOwnProperty$a).replace(reRegExpChar, '\\$&')
      .replace(/hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g, '$1.*?') + '$'
    );

    /**
     * The base implementation of `_.isNative` without bad shim checks.
     *
     * @private
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is a native function,
     *  else `false`.
     */
    function baseIsNative(value) {
      if (!isObject(value) || isMasked(value)) {
        return false;
      }
      var pattern = isFunction(value) ? reIsNative : reIsHostCtor;
      return pattern.test(toSource(value));
    }

    /**
     * Gets the value at `key` of `object`.
     *
     * @private
     * @param {Object} [object] The object to query.
     * @param {string} key The key of the property to get.
     * @returns {*} Returns the property value.
     */
    function getValue(object, key) {
      return object == null ? undefined : object[key];
    }

    /**
     * Gets the native function at `key` of `object`.
     *
     * @private
     * @param {Object} object The object to query.
     * @param {string} key The key of the method to get.
     * @returns {*} Returns the function if it's native, else `undefined`.
     */
    function getNative(object, key) {
      var value = getValue(object, key);
      return baseIsNative(value) ? value : undefined;
    }

    /* Built-in method references that are verified to be native. */
    var WeakMap$1 = getNative(root$1, 'WeakMap');

    /** Used to store function metadata. */
    var metaMap = WeakMap$1 && new WeakMap$1;

    /** Built-in value references. */
    var objectCreate = Object.create;

    /**
     * The base implementation of `_.create` without support for assigning
     * properties to the created object.
     *
     * @private
     * @param {Object} proto The object to inherit from.
     * @returns {Object} Returns the new object.
     */
    var baseCreate = (function() {
      function object() {}
      return function(proto) {
        if (!isObject(proto)) {
          return {};
        }
        if (objectCreate) {
          return objectCreate(proto);
        }
        object.prototype = proto;
        var result = new object;
        object.prototype = undefined;
        return result;
      };
    }());

    /**
     * A faster alternative to `Function#apply`, this function invokes `func`
     * with the `this` binding of `thisArg` and the arguments of `args`.
     *
     * @private
     * @param {Function} func The function to invoke.
     * @param {*} thisArg The `this` binding of `func`.
     * @param {Array} args The arguments to invoke `func` with.
     * @returns {*} Returns the result of `func`.
     */
    function apply(func, thisArg, args) {
      switch (args.length) {
        case 0: return func.call(thisArg);
        case 1: return func.call(thisArg, args[0]);
        case 2: return func.call(thisArg, args[0], args[1]);
        case 3: return func.call(thisArg, args[0], args[1], args[2]);
      }
      return func.apply(thisArg, args);
    }

    /**
     * The function whose prototype chain sequence wrappers inherit from.
     *
     * @private
     */
    function baseLodash() {
      // No operation performed.
    }

    /** Used as references for the maximum length and index of an array. */
    var MAX_ARRAY_LENGTH = 4294967295;

    /**
     * Creates a lazy wrapper object which wraps `value` to enable lazy evaluation.
     *
     * @private
     * @constructor
     * @param {*} value The value to wrap.
     */
    function LazyWrapper(value) {
      this.__wrapped__ = value;
      this.__actions__ = [];
      this.__dir__ = 1;
      this.__filtered__ = false;
      this.__iteratees__ = [];
      this.__takeCount__ = MAX_ARRAY_LENGTH;
      this.__views__ = [];
    }

    // Ensure `LazyWrapper` is an instance of `baseLodash`.
    LazyWrapper.prototype = baseCreate(baseLodash.prototype);
    LazyWrapper.prototype.constructor = LazyWrapper;

    /**
     * This method returns `undefined`.
     *
     * @static
     * @memberOf _
     * @since 2.3.0
     * @category Util
     * @example
     *
     * _.times(2, _.noop);
     * // => [undefined, undefined]
     */
    function noop$1() {
      // No operation performed.
    }

    /**
     * Gets metadata for `func`.
     *
     * @private
     * @param {Function} func The function to query.
     * @returns {*} Returns the metadata for `func`.
     */
    var getData = !metaMap ? noop$1 : function(func) {
      return metaMap.get(func);
    };

    /** Used to lookup unminified function names. */
    var realNames = {};

    /** Used for built-in method references. */
    var objectProto$b = Object.prototype;

    /** Used to check objects for own properties. */
    var hasOwnProperty$9 = objectProto$b.hasOwnProperty;

    /**
     * Gets the name of `func`.
     *
     * @private
     * @param {Function} func The function to query.
     * @returns {string} Returns the function name.
     */
    function getFuncName(func) {
      var result = (func.name + ''),
          array = realNames[result],
          length = hasOwnProperty$9.call(realNames, result) ? array.length : 0;

      while (length--) {
        var data = array[length],
            otherFunc = data.func;
        if (otherFunc == null || otherFunc == func) {
          return data.name;
        }
      }
      return result;
    }

    /**
     * The base constructor for creating `lodash` wrapper objects.
     *
     * @private
     * @param {*} value The value to wrap.
     * @param {boolean} [chainAll] Enable explicit method chain sequences.
     */
    function LodashWrapper(value, chainAll) {
      this.__wrapped__ = value;
      this.__actions__ = [];
      this.__chain__ = !!chainAll;
      this.__index__ = 0;
      this.__values__ = undefined;
    }

    LodashWrapper.prototype = baseCreate(baseLodash.prototype);
    LodashWrapper.prototype.constructor = LodashWrapper;

    /**
     * Copies the values of `source` to `array`.
     *
     * @private
     * @param {Array} source The array to copy values from.
     * @param {Array} [array=[]] The array to copy values to.
     * @returns {Array} Returns `array`.
     */
    function copyArray(source, array) {
      var index = -1,
          length = source.length;

      array || (array = Array(length));
      while (++index < length) {
        array[index] = source[index];
      }
      return array;
    }

    /**
     * Creates a clone of `wrapper`.
     *
     * @private
     * @param {Object} wrapper The wrapper to clone.
     * @returns {Object} Returns the cloned wrapper.
     */
    function wrapperClone(wrapper) {
      if (wrapper instanceof LazyWrapper) {
        return wrapper.clone();
      }
      var result = new LodashWrapper(wrapper.__wrapped__, wrapper.__chain__);
      result.__actions__ = copyArray(wrapper.__actions__);
      result.__index__  = wrapper.__index__;
      result.__values__ = wrapper.__values__;
      return result;
    }

    /** Used for built-in method references. */
    var objectProto$a = Object.prototype;

    /** Used to check objects for own properties. */
    var hasOwnProperty$8 = objectProto$a.hasOwnProperty;

    /**
     * Creates a `lodash` object which wraps `value` to enable implicit method
     * chain sequences. Methods that operate on and return arrays, collections,
     * and functions can be chained together. Methods that retrieve a single value
     * or may return a primitive value will automatically end the chain sequence
     * and return the unwrapped value. Otherwise, the value must be unwrapped
     * with `_#value`.
     *
     * Explicit chain sequences, which must be unwrapped with `_#value`, may be
     * enabled using `_.chain`.
     *
     * The execution of chained methods is lazy, that is, it's deferred until
     * `_#value` is implicitly or explicitly called.
     *
     * Lazy evaluation allows several methods to support shortcut fusion.
     * Shortcut fusion is an optimization to merge iteratee calls; this avoids
     * the creation of intermediate arrays and can greatly reduce the number of
     * iteratee executions. Sections of a chain sequence qualify for shortcut
     * fusion if the section is applied to an array and iteratees accept only
     * one argument. The heuristic for whether a section qualifies for shortcut
     * fusion is subject to change.
     *
     * Chaining is supported in custom builds as long as the `_#value` method is
     * directly or indirectly included in the build.
     *
     * In addition to lodash methods, wrappers have `Array` and `String` methods.
     *
     * The wrapper `Array` methods are:
     * `concat`, `join`, `pop`, `push`, `shift`, `sort`, `splice`, and `unshift`
     *
     * The wrapper `String` methods are:
     * `replace` and `split`
     *
     * The wrapper methods that support shortcut fusion are:
     * `at`, `compact`, `drop`, `dropRight`, `dropWhile`, `filter`, `find`,
     * `findLast`, `head`, `initial`, `last`, `map`, `reject`, `reverse`, `slice`,
     * `tail`, `take`, `takeRight`, `takeRightWhile`, `takeWhile`, and `toArray`
     *
     * The chainable wrapper methods are:
     * `after`, `ary`, `assign`, `assignIn`, `assignInWith`, `assignWith`, `at`,
     * `before`, `bind`, `bindAll`, `bindKey`, `castArray`, `chain`, `chunk`,
     * `commit`, `compact`, `concat`, `conforms`, `constant`, `countBy`, `create`,
     * `curry`, `debounce`, `defaults`, `defaultsDeep`, `defer`, `delay`,
     * `difference`, `differenceBy`, `differenceWith`, `drop`, `dropRight`,
     * `dropRightWhile`, `dropWhile`, `extend`, `extendWith`, `fill`, `filter`,
     * `flatMap`, `flatMapDeep`, `flatMapDepth`, `flatten`, `flattenDeep`,
     * `flattenDepth`, `flip`, `flow`, `flowRight`, `fromPairs`, `functions`,
     * `functionsIn`, `groupBy`, `initial`, `intersection`, `intersectionBy`,
     * `intersectionWith`, `invert`, `invertBy`, `invokeMap`, `iteratee`, `keyBy`,
     * `keys`, `keysIn`, `map`, `mapKeys`, `mapValues`, `matches`, `matchesProperty`,
     * `memoize`, `merge`, `mergeWith`, `method`, `methodOf`, `mixin`, `negate`,
     * `nthArg`, `omit`, `omitBy`, `once`, `orderBy`, `over`, `overArgs`,
     * `overEvery`, `overSome`, `partial`, `partialRight`, `partition`, `pick`,
     * `pickBy`, `plant`, `property`, `propertyOf`, `pull`, `pullAll`, `pullAllBy`,
     * `pullAllWith`, `pullAt`, `push`, `range`, `rangeRight`, `rearg`, `reject`,
     * `remove`, `rest`, `reverse`, `sampleSize`, `set`, `setWith`, `shuffle`,
     * `slice`, `sort`, `sortBy`, `splice`, `spread`, `tail`, `take`, `takeRight`,
     * `takeRightWhile`, `takeWhile`, `tap`, `throttle`, `thru`, `toArray`,
     * `toPairs`, `toPairsIn`, `toPath`, `toPlainObject`, `transform`, `unary`,
     * `union`, `unionBy`, `unionWith`, `uniq`, `uniqBy`, `uniqWith`, `unset`,
     * `unshift`, `unzip`, `unzipWith`, `update`, `updateWith`, `values`,
     * `valuesIn`, `without`, `wrap`, `xor`, `xorBy`, `xorWith`, `zip`,
     * `zipObject`, `zipObjectDeep`, and `zipWith`
     *
     * The wrapper methods that are **not** chainable by default are:
     * `add`, `attempt`, `camelCase`, `capitalize`, `ceil`, `clamp`, `clone`,
     * `cloneDeep`, `cloneDeepWith`, `cloneWith`, `conformsTo`, `deburr`,
     * `defaultTo`, `divide`, `each`, `eachRight`, `endsWith`, `eq`, `escape`,
     * `escapeRegExp`, `every`, `find`, `findIndex`, `findKey`, `findLast`,
     * `findLastIndex`, `findLastKey`, `first`, `floor`, `forEach`, `forEachRight`,
     * `forIn`, `forInRight`, `forOwn`, `forOwnRight`, `get`, `gt`, `gte`, `has`,
     * `hasIn`, `head`, `identity`, `includes`, `indexOf`, `inRange`, `invoke`,
     * `isArguments`, `isArray`, `isArrayBuffer`, `isArrayLike`, `isArrayLikeObject`,
     * `isBoolean`, `isBuffer`, `isDate`, `isElement`, `isEmpty`, `isEqual`,
     * `isEqualWith`, `isError`, `isFinite`, `isFunction`, `isInteger`, `isLength`,
     * `isMap`, `isMatch`, `isMatchWith`, `isNaN`, `isNative`, `isNil`, `isNull`,
     * `isNumber`, `isObject`, `isObjectLike`, `isPlainObject`, `isRegExp`,
     * `isSafeInteger`, `isSet`, `isString`, `isUndefined`, `isTypedArray`,
     * `isWeakMap`, `isWeakSet`, `join`, `kebabCase`, `last`, `lastIndexOf`,
     * `lowerCase`, `lowerFirst`, `lt`, `lte`, `max`, `maxBy`, `mean`, `meanBy`,
     * `min`, `minBy`, `multiply`, `noConflict`, `noop`, `now`, `nth`, `pad`,
     * `padEnd`, `padStart`, `parseInt`, `pop`, `random`, `reduce`, `reduceRight`,
     * `repeat`, `result`, `round`, `runInContext`, `sample`, `shift`, `size`,
     * `snakeCase`, `some`, `sortedIndex`, `sortedIndexBy`, `sortedLastIndex`,
     * `sortedLastIndexBy`, `startCase`, `startsWith`, `stubArray`, `stubFalse`,
     * `stubObject`, `stubString`, `stubTrue`, `subtract`, `sum`, `sumBy`,
     * `template`, `times`, `toFinite`, `toInteger`, `toJSON`, `toLength`,
     * `toLower`, `toNumber`, `toSafeInteger`, `toString`, `toUpper`, `trim`,
     * `trimEnd`, `trimStart`, `truncate`, `unescape`, `uniqueId`, `upperCase`,
     * `upperFirst`, `value`, and `words`
     *
     * @name _
     * @constructor
     * @category Seq
     * @param {*} value The value to wrap in a `lodash` instance.
     * @returns {Object} Returns the new `lodash` wrapper instance.
     * @example
     *
     * function square(n) {
     *   return n * n;
     * }
     *
     * var wrapped = _([1, 2, 3]);
     *
     * // Returns an unwrapped value.
     * wrapped.reduce(_.add);
     * // => 6
     *
     * // Returns a wrapped value.
     * var squares = wrapped.map(square);
     *
     * _.isArray(squares);
     * // => false
     *
     * _.isArray(squares.value());
     * // => true
     */
    function lodash(value) {
      if (isObjectLike(value) && !isArray$2(value) && !(value instanceof LazyWrapper)) {
        if (value instanceof LodashWrapper) {
          return value;
        }
        if (hasOwnProperty$8.call(value, '__wrapped__')) {
          return wrapperClone(value);
        }
      }
      return new LodashWrapper(value);
    }

    // Ensure wrappers are instances of `baseLodash`.
    lodash.prototype = baseLodash.prototype;
    lodash.prototype.constructor = lodash;

    /**
     * Checks if `func` has a lazy counterpart.
     *
     * @private
     * @param {Function} func The function to check.
     * @returns {boolean} Returns `true` if `func` has a lazy counterpart,
     *  else `false`.
     */
    function isLaziable(func) {
      var funcName = getFuncName(func),
          other = lodash[funcName];

      if (typeof other != 'function' || !(funcName in LazyWrapper.prototype)) {
        return false;
      }
      if (func === other) {
        return true;
      }
      var data = getData(other);
      return !!data && func === data[0];
    }

    /** Used to detect hot functions by number of calls within a span of milliseconds. */
    var HOT_COUNT = 800,
        HOT_SPAN = 16;

    /* Built-in method references for those with the same name as other `lodash` methods. */
    var nativeNow = Date.now;

    /**
     * Creates a function that'll short out and invoke `identity` instead
     * of `func` when it's called `HOT_COUNT` or more times in `HOT_SPAN`
     * milliseconds.
     *
     * @private
     * @param {Function} func The function to restrict.
     * @returns {Function} Returns the new shortable function.
     */
    function shortOut(func) {
      var count = 0,
          lastCalled = 0;

      return function() {
        var stamp = nativeNow(),
            remaining = HOT_SPAN - (stamp - lastCalled);

        lastCalled = stamp;
        if (remaining > 0) {
          if (++count >= HOT_COUNT) {
            return arguments[0];
          }
        } else {
          count = 0;
        }
        return func.apply(undefined, arguments);
      };
    }

    /**
     * Creates a function that returns `value`.
     *
     * @static
     * @memberOf _
     * @since 2.4.0
     * @category Util
     * @param {*} value The value to return from the new function.
     * @returns {Function} Returns the new constant function.
     * @example
     *
     * var objects = _.times(2, _.constant({ 'a': 1 }));
     *
     * console.log(objects);
     * // => [{ 'a': 1 }, { 'a': 1 }]
     *
     * console.log(objects[0] === objects[1]);
     * // => true
     */
    function constant(value) {
      return function() {
        return value;
      };
    }

    var defineProperty$1 = (function() {
      try {
        var func = getNative(Object, 'defineProperty');
        func({}, '', {});
        return func;
      } catch (e) {}
    }());

    /**
     * The base implementation of `setToString` without support for hot loop shorting.
     *
     * @private
     * @param {Function} func The function to modify.
     * @param {Function} string The `toString` result.
     * @returns {Function} Returns `func`.
     */
    var baseSetToString = !defineProperty$1 ? identity : function(func, string) {
      return defineProperty$1(func, 'toString', {
        'configurable': true,
        'enumerable': false,
        'value': constant(string),
        'writable': true
      });
    };

    /**
     * Sets the `toString` method of `func` to return `string`.
     *
     * @private
     * @param {Function} func The function to modify.
     * @param {Function} string The `toString` result.
     * @returns {Function} Returns `func`.
     */
    var setToString = shortOut(baseSetToString);

    /**
     * The base implementation of `_.findIndex` and `_.findLastIndex` without
     * support for iteratee shorthands.
     *
     * @private
     * @param {Array} array The array to inspect.
     * @param {Function} predicate The function invoked per iteration.
     * @param {number} fromIndex The index to search from.
     * @param {boolean} [fromRight] Specify iterating from right to left.
     * @returns {number} Returns the index of the matched value, else `-1`.
     */
    function baseFindIndex(array, predicate, fromIndex, fromRight) {
      var length = array.length,
          index = fromIndex + (fromRight ? 1 : -1);

      while ((fromRight ? index-- : ++index < length)) {
        if (predicate(array[index], index, array)) {
          return index;
        }
      }
      return -1;
    }

    /**
     * The base implementation of `_.isNaN` without support for number objects.
     *
     * @private
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is `NaN`, else `false`.
     */
    function baseIsNaN(value) {
      return value !== value;
    }

    /**
     * A specialized version of `_.indexOf` which performs strict equality
     * comparisons of values, i.e. `===`.
     *
     * @private
     * @param {Array} array The array to inspect.
     * @param {*} value The value to search for.
     * @param {number} fromIndex The index to search from.
     * @returns {number} Returns the index of the matched value, else `-1`.
     */
    function strictIndexOf(array, value, fromIndex) {
      var index = fromIndex - 1,
          length = array.length;

      while (++index < length) {
        if (array[index] === value) {
          return index;
        }
      }
      return -1;
    }

    /**
     * The base implementation of `_.indexOf` without `fromIndex` bounds checks.
     *
     * @private
     * @param {Array} array The array to inspect.
     * @param {*} value The value to search for.
     * @param {number} fromIndex The index to search from.
     * @returns {number} Returns the index of the matched value, else `-1`.
     */
    function baseIndexOf(array, value, fromIndex) {
      return value === value
        ? strictIndexOf(array, value, fromIndex)
        : baseFindIndex(array, baseIsNaN, fromIndex);
    }

    /** Used as references for various `Number` constants. */
    var MAX_SAFE_INTEGER$1 = 9007199254740991;

    /** Used to detect unsigned integer values. */
    var reIsUint = /^(?:0|[1-9]\d*)$/;

    /**
     * Checks if `value` is a valid array-like index.
     *
     * @private
     * @param {*} value The value to check.
     * @param {number} [length=MAX_SAFE_INTEGER] The upper bounds of a valid index.
     * @returns {boolean} Returns `true` if `value` is a valid index, else `false`.
     */
    function isIndex(value, length) {
      var type = typeof value;
      length = length == null ? MAX_SAFE_INTEGER$1 : length;

      return !!length &&
        (type == 'number' ||
          (type != 'symbol' && reIsUint.test(value))) &&
            (value > -1 && value % 1 == 0 && value < length);
    }

    /**
     * Performs a
     * [`SameValueZero`](http://ecma-international.org/ecma-262/7.0/#sec-samevaluezero)
     * comparison between two values to determine if they are equivalent.
     *
     * @static
     * @memberOf _
     * @since 4.0.0
     * @category Lang
     * @param {*} value The value to compare.
     * @param {*} other The other value to compare.
     * @returns {boolean} Returns `true` if the values are equivalent, else `false`.
     * @example
     *
     * var object = { 'a': 1 };
     * var other = { 'a': 1 };
     *
     * _.eq(object, object);
     * // => true
     *
     * _.eq(object, other);
     * // => false
     *
     * _.eq('a', 'a');
     * // => true
     *
     * _.eq('a', Object('a'));
     * // => false
     *
     * _.eq(NaN, NaN);
     * // => true
     */
    function eq(value, other) {
      return value === other || (value !== value && other !== other);
    }

    /* Built-in method references for those with the same name as other `lodash` methods. */
    var nativeMax$2 = Math.max;

    /**
     * A specialized version of `baseRest` which transforms the rest array.
     *
     * @private
     * @param {Function} func The function to apply a rest parameter to.
     * @param {number} [start=func.length-1] The start position of the rest parameter.
     * @param {Function} transform The rest array transform.
     * @returns {Function} Returns the new function.
     */
    function overRest(func, start, transform) {
      start = nativeMax$2(start === undefined ? (func.length - 1) : start, 0);
      return function() {
        var args = arguments,
            index = -1,
            length = nativeMax$2(args.length - start, 0),
            array = Array(length);

        while (++index < length) {
          array[index] = args[start + index];
        }
        index = -1;
        var otherArgs = Array(start + 1);
        while (++index < start) {
          otherArgs[index] = args[index];
        }
        otherArgs[start] = transform(array);
        return apply(func, this, otherArgs);
      };
    }

    /** Used as references for various `Number` constants. */
    var MAX_SAFE_INTEGER = 9007199254740991;

    /**
     * Checks if `value` is a valid array-like length.
     *
     * **Note:** This method is loosely based on
     * [`ToLength`](http://ecma-international.org/ecma-262/7.0/#sec-tolength).
     *
     * @static
     * @memberOf _
     * @since 4.0.0
     * @category Lang
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is a valid length, else `false`.
     * @example
     *
     * _.isLength(3);
     * // => true
     *
     * _.isLength(Number.MIN_VALUE);
     * // => false
     *
     * _.isLength(Infinity);
     * // => false
     *
     * _.isLength('3');
     * // => false
     */
    function isLength(value) {
      return typeof value == 'number' &&
        value > -1 && value % 1 == 0 && value <= MAX_SAFE_INTEGER;
    }

    /**
     * Checks if `value` is array-like. A value is considered array-like if it's
     * not a function and has a `value.length` that's an integer greater than or
     * equal to `0` and less than or equal to `Number.MAX_SAFE_INTEGER`.
     *
     * @static
     * @memberOf _
     * @since 4.0.0
     * @category Lang
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is array-like, else `false`.
     * @example
     *
     * _.isArrayLike([1, 2, 3]);
     * // => true
     *
     * _.isArrayLike(document.body.children);
     * // => true
     *
     * _.isArrayLike('abc');
     * // => true
     *
     * _.isArrayLike(_.noop);
     * // => false
     */
    function isArrayLike(value) {
      return value != null && isLength(value.length) && !isFunction(value);
    }

    /**
     * Checks if the given arguments are from an iteratee call.
     *
     * @private
     * @param {*} value The potential iteratee value argument.
     * @param {*} index The potential iteratee index or key argument.
     * @param {*} object The potential iteratee object argument.
     * @returns {boolean} Returns `true` if the arguments are from an iteratee call,
     *  else `false`.
     */
    function isIterateeCall(value, index, object) {
      if (!isObject(object)) {
        return false;
      }
      var type = typeof index;
      if (type == 'number'
            ? (isArrayLike(object) && isIndex(index, object.length))
            : (type == 'string' && index in object)
          ) {
        return eq(object[index], value);
      }
      return false;
    }

    /** Used for built-in method references. */
    var objectProto$9 = Object.prototype;

    /**
     * Checks if `value` is likely a prototype object.
     *
     * @private
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is a prototype, else `false`.
     */
    function isPrototype(value) {
      var Ctor = value && value.constructor,
          proto = (typeof Ctor == 'function' && Ctor.prototype) || objectProto$9;

      return value === proto;
    }

    /**
     * The base implementation of `_.times` without support for iteratee shorthands
     * or max array length checks.
     *
     * @private
     * @param {number} n The number of times to invoke `iteratee`.
     * @param {Function} iteratee The function invoked per iteration.
     * @returns {Array} Returns the array of results.
     */
    function baseTimes(n, iteratee) {
      var index = -1,
          result = Array(n);

      while (++index < n) {
        result[index] = iteratee(index);
      }
      return result;
    }

    /** `Object#toString` result references. */
    var argsTag$2 = '[object Arguments]';

    /**
     * The base implementation of `_.isArguments`.
     *
     * @private
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is an `arguments` object,
     */
    function baseIsArguments(value) {
      return isObjectLike(value) && baseGetTag(value) == argsTag$2;
    }

    /** Used for built-in method references. */
    var objectProto$8 = Object.prototype;

    /** Used to check objects for own properties. */
    var hasOwnProperty$7 = objectProto$8.hasOwnProperty;

    /** Built-in value references. */
    var propertyIsEnumerable$1 = objectProto$8.propertyIsEnumerable;

    /**
     * Checks if `value` is likely an `arguments` object.
     *
     * @static
     * @memberOf _
     * @since 0.1.0
     * @category Lang
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is an `arguments` object,
     *  else `false`.
     * @example
     *
     * _.isArguments(function() { return arguments; }());
     * // => true
     *
     * _.isArguments([1, 2, 3]);
     * // => false
     */
    var isArguments = baseIsArguments(function() { return arguments; }()) ? baseIsArguments : function(value) {
      return isObjectLike(value) && hasOwnProperty$7.call(value, 'callee') &&
        !propertyIsEnumerable$1.call(value, 'callee');
    };

    /**
     * This method returns `false`.
     *
     * @static
     * @memberOf _
     * @since 4.13.0
     * @category Util
     * @returns {boolean} Returns `false`.
     * @example
     *
     * _.times(2, _.stubFalse);
     * // => [false, false]
     */
    function stubFalse() {
      return false;
    }

    /** Detect free variable `exports`. */
    var freeExports$1 = typeof exports == 'object' && exports && !exports.nodeType && exports;

    /** Detect free variable `module`. */
    var freeModule$1 = freeExports$1 && typeof module == 'object' && module && !module.nodeType && module;

    /** Detect the popular CommonJS extension `module.exports`. */
    var moduleExports$1 = freeModule$1 && freeModule$1.exports === freeExports$1;

    /** Built-in value references. */
    var Buffer = moduleExports$1 ? root$1.Buffer : undefined;

    /* Built-in method references for those with the same name as other `lodash` methods. */
    var nativeIsBuffer = Buffer ? Buffer.isBuffer : undefined;

    /**
     * Checks if `value` is a buffer.
     *
     * @static
     * @memberOf _
     * @since 4.3.0
     * @category Lang
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is a buffer, else `false`.
     * @example
     *
     * _.isBuffer(new Buffer(2));
     * // => true
     *
     * _.isBuffer(new Uint8Array(2));
     * // => false
     */
    var isBuffer = nativeIsBuffer || stubFalse;

    /** `Object#toString` result references. */
    var argsTag$1 = '[object Arguments]',
        arrayTag$1 = '[object Array]',
        boolTag$1 = '[object Boolean]',
        dateTag$1 = '[object Date]',
        errorTag$1 = '[object Error]',
        funcTag = '[object Function]',
        mapTag$3 = '[object Map]',
        numberTag$1 = '[object Number]',
        objectTag$2 = '[object Object]',
        regexpTag$1 = '[object RegExp]',
        setTag$3 = '[object Set]',
        stringTag$2 = '[object String]',
        weakMapTag$1 = '[object WeakMap]';

    var arrayBufferTag$1 = '[object ArrayBuffer]',
        dataViewTag$2 = '[object DataView]',
        float32Tag = '[object Float32Array]',
        float64Tag = '[object Float64Array]',
        int8Tag = '[object Int8Array]',
        int16Tag = '[object Int16Array]',
        int32Tag = '[object Int32Array]',
        uint8Tag = '[object Uint8Array]',
        uint8ClampedTag = '[object Uint8ClampedArray]',
        uint16Tag = '[object Uint16Array]',
        uint32Tag = '[object Uint32Array]';

    /** Used to identify `toStringTag` values of typed arrays. */
    var typedArrayTags = {};
    typedArrayTags[float32Tag] = typedArrayTags[float64Tag] =
    typedArrayTags[int8Tag] = typedArrayTags[int16Tag] =
    typedArrayTags[int32Tag] = typedArrayTags[uint8Tag] =
    typedArrayTags[uint8ClampedTag] = typedArrayTags[uint16Tag] =
    typedArrayTags[uint32Tag] = true;
    typedArrayTags[argsTag$1] = typedArrayTags[arrayTag$1] =
    typedArrayTags[arrayBufferTag$1] = typedArrayTags[boolTag$1] =
    typedArrayTags[dataViewTag$2] = typedArrayTags[dateTag$1] =
    typedArrayTags[errorTag$1] = typedArrayTags[funcTag] =
    typedArrayTags[mapTag$3] = typedArrayTags[numberTag$1] =
    typedArrayTags[objectTag$2] = typedArrayTags[regexpTag$1] =
    typedArrayTags[setTag$3] = typedArrayTags[stringTag$2] =
    typedArrayTags[weakMapTag$1] = false;

    /**
     * The base implementation of `_.isTypedArray` without Node.js optimizations.
     *
     * @private
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is a typed array, else `false`.
     */
    function baseIsTypedArray(value) {
      return isObjectLike(value) &&
        isLength(value.length) && !!typedArrayTags[baseGetTag(value)];
    }

    /**
     * The base implementation of `_.unary` without support for storing metadata.
     *
     * @private
     * @param {Function} func The function to cap arguments for.
     * @returns {Function} Returns the new capped function.
     */
    function baseUnary(func) {
      return function(value) {
        return func(value);
      };
    }

    /** Detect free variable `exports`. */
    var freeExports = typeof exports == 'object' && exports && !exports.nodeType && exports;

    /** Detect free variable `module`. */
    var freeModule = freeExports && typeof module == 'object' && module && !module.nodeType && module;

    /** Detect the popular CommonJS extension `module.exports`. */
    var moduleExports = freeModule && freeModule.exports === freeExports;

    /** Detect free variable `process` from Node.js. */
    var freeProcess = moduleExports && freeGlobal.process;

    /** Used to access faster Node.js helpers. */
    var nodeUtil = (function() {
      try {
        // Use `util.types` for Node.js 10+.
        var types = freeModule && freeModule.require && freeModule.require('util').types;

        if (types) {
          return types;
        }

        // Legacy `process.binding('util')` for Node.js < 10.
        return freeProcess && freeProcess.binding && freeProcess.binding('util');
      } catch (e) {}
    }());

    /* Node.js helper references. */
    var nodeIsTypedArray = nodeUtil && nodeUtil.isTypedArray;

    /**
     * Checks if `value` is classified as a typed array.
     *
     * @static
     * @memberOf _
     * @since 3.0.0
     * @category Lang
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is a typed array, else `false`.
     * @example
     *
     * _.isTypedArray(new Uint8Array);
     * // => true
     *
     * _.isTypedArray([]);
     * // => false
     */
    var isTypedArray = nodeIsTypedArray ? baseUnary(nodeIsTypedArray) : baseIsTypedArray;

    /** Used for built-in method references. */
    var objectProto$7 = Object.prototype;

    /** Used to check objects for own properties. */
    var hasOwnProperty$6 = objectProto$7.hasOwnProperty;

    /**
     * Creates an array of the enumerable property names of the array-like `value`.
     *
     * @private
     * @param {*} value The value to query.
     * @param {boolean} inherited Specify returning inherited property names.
     * @returns {Array} Returns the array of property names.
     */
    function arrayLikeKeys(value, inherited) {
      var isArr = isArray$2(value),
          isArg = !isArr && isArguments(value),
          isBuff = !isArr && !isArg && isBuffer(value),
          isType = !isArr && !isArg && !isBuff && isTypedArray(value),
          skipIndexes = isArr || isArg || isBuff || isType,
          result = skipIndexes ? baseTimes(value.length, String) : [],
          length = result.length;

      for (var key in value) {
        if ((inherited || hasOwnProperty$6.call(value, key)) &&
            !(skipIndexes && (
               // Safari 9 has enumerable `arguments.length` in strict mode.
               key == 'length' ||
               // Node.js 0.10 has enumerable non-index properties on buffers.
               (isBuff && (key == 'offset' || key == 'parent')) ||
               // PhantomJS 2 has enumerable non-index properties on typed arrays.
               (isType && (key == 'buffer' || key == 'byteLength' || key == 'byteOffset')) ||
               // Skip index properties.
               isIndex(key, length)
            ))) {
          result.push(key);
        }
      }
      return result;
    }

    /**
     * Creates a unary function that invokes `func` with its argument transformed.
     *
     * @private
     * @param {Function} func The function to wrap.
     * @param {Function} transform The argument transform.
     * @returns {Function} Returns the new function.
     */
    function overArg(func, transform) {
      return function(arg) {
        return func(transform(arg));
      };
    }

    /* Built-in method references for those with the same name as other `lodash` methods. */
    var nativeKeys = overArg(Object.keys, Object);

    /** Used for built-in method references. */
    var objectProto$6 = Object.prototype;

    /** Used to check objects for own properties. */
    var hasOwnProperty$5 = objectProto$6.hasOwnProperty;

    /**
     * The base implementation of `_.keys` which doesn't treat sparse arrays as dense.
     *
     * @private
     * @param {Object} object The object to query.
     * @returns {Array} Returns the array of property names.
     */
    function baseKeys(object) {
      if (!isPrototype(object)) {
        return nativeKeys(object);
      }
      var result = [];
      for (var key in Object(object)) {
        if (hasOwnProperty$5.call(object, key) && key != 'constructor') {
          result.push(key);
        }
      }
      return result;
    }

    /**
     * Creates an array of the own enumerable property names of `object`.
     *
     * **Note:** Non-object values are coerced to objects. See the
     * [ES spec](http://ecma-international.org/ecma-262/7.0/#sec-object.keys)
     * for more details.
     *
     * @static
     * @since 0.1.0
     * @memberOf _
     * @category Object
     * @param {Object} object The object to query.
     * @returns {Array} Returns the array of property names.
     * @example
     *
     * function Foo() {
     *   this.a = 1;
     *   this.b = 2;
     * }
     *
     * Foo.prototype.c = 3;
     *
     * _.keys(new Foo);
     * // => ['a', 'b'] (iteration order is not guaranteed)
     *
     * _.keys('hi');
     * // => ['0', '1']
     */
    function keys$1(object) {
      return isArrayLike(object) ? arrayLikeKeys(object) : baseKeys(object);
    }

    /** Used to match property names within property paths. */
    var reIsDeepProp = /\.|\[(?:[^[\]]*|(["'])(?:(?!\1)[^\\]|\\.)*?\1)\]/,
        reIsPlainProp = /^\w*$/;

    /**
     * Checks if `value` is a property name and not a property path.
     *
     * @private
     * @param {*} value The value to check.
     * @param {Object} [object] The object to query keys on.
     * @returns {boolean} Returns `true` if `value` is a property name, else `false`.
     */
    function isKey(value, object) {
      if (isArray$2(value)) {
        return false;
      }
      var type = typeof value;
      if (type == 'number' || type == 'symbol' || type == 'boolean' ||
          value == null || isSymbol(value)) {
        return true;
      }
      return reIsPlainProp.test(value) || !reIsDeepProp.test(value) ||
        (object != null && value in Object(object));
    }

    /* Built-in method references that are verified to be native. */
    var nativeCreate = getNative(Object, 'create');

    /**
     * Removes all key-value entries from the hash.
     *
     * @private
     * @name clear
     * @memberOf Hash
     */
    function hashClear() {
      this.__data__ = nativeCreate ? nativeCreate(null) : {};
      this.size = 0;
    }

    /**
     * Removes `key` and its value from the hash.
     *
     * @private
     * @name delete
     * @memberOf Hash
     * @param {Object} hash The hash to modify.
     * @param {string} key The key of the value to remove.
     * @returns {boolean} Returns `true` if the entry was removed, else `false`.
     */
    function hashDelete(key) {
      var result = this.has(key) && delete this.__data__[key];
      this.size -= result ? 1 : 0;
      return result;
    }

    /** Used to stand-in for `undefined` hash values. */
    var HASH_UNDEFINED$2 = '__lodash_hash_undefined__';

    /** Used for built-in method references. */
    var objectProto$5 = Object.prototype;

    /** Used to check objects for own properties. */
    var hasOwnProperty$4 = objectProto$5.hasOwnProperty;

    /**
     * Gets the hash value for `key`.
     *
     * @private
     * @name get
     * @memberOf Hash
     * @param {string} key The key of the value to get.
     * @returns {*} Returns the entry value.
     */
    function hashGet(key) {
      var data = this.__data__;
      if (nativeCreate) {
        var result = data[key];
        return result === HASH_UNDEFINED$2 ? undefined : result;
      }
      return hasOwnProperty$4.call(data, key) ? data[key] : undefined;
    }

    /** Used for built-in method references. */
    var objectProto$4 = Object.prototype;

    /** Used to check objects for own properties. */
    var hasOwnProperty$3 = objectProto$4.hasOwnProperty;

    /**
     * Checks if a hash value for `key` exists.
     *
     * @private
     * @name has
     * @memberOf Hash
     * @param {string} key The key of the entry to check.
     * @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
     */
    function hashHas(key) {
      var data = this.__data__;
      return nativeCreate ? (data[key] !== undefined) : hasOwnProperty$3.call(data, key);
    }

    /** Used to stand-in for `undefined` hash values. */
    var HASH_UNDEFINED$1 = '__lodash_hash_undefined__';

    /**
     * Sets the hash `key` to `value`.
     *
     * @private
     * @name set
     * @memberOf Hash
     * @param {string} key The key of the value to set.
     * @param {*} value The value to set.
     * @returns {Object} Returns the hash instance.
     */
    function hashSet(key, value) {
      var data = this.__data__;
      this.size += this.has(key) ? 0 : 1;
      data[key] = (nativeCreate && value === undefined) ? HASH_UNDEFINED$1 : value;
      return this;
    }

    /**
     * Creates a hash object.
     *
     * @private
     * @constructor
     * @param {Array} [entries] The key-value pairs to cache.
     */
    function Hash(entries) {
      var index = -1,
          length = entries == null ? 0 : entries.length;

      this.clear();
      while (++index < length) {
        var entry = entries[index];
        this.set(entry[0], entry[1]);
      }
    }

    // Add methods to `Hash`.
    Hash.prototype.clear = hashClear;
    Hash.prototype['delete'] = hashDelete;
    Hash.prototype.get = hashGet;
    Hash.prototype.has = hashHas;
    Hash.prototype.set = hashSet;

    /**
     * Removes all key-value entries from the list cache.
     *
     * @private
     * @name clear
     * @memberOf ListCache
     */
    function listCacheClear() {
      this.__data__ = [];
      this.size = 0;
    }

    /**
     * Gets the index at which the `key` is found in `array` of key-value pairs.
     *
     * @private
     * @param {Array} array The array to inspect.
     * @param {*} key The key to search for.
     * @returns {number} Returns the index of the matched value, else `-1`.
     */
    function assocIndexOf(array, key) {
      var length = array.length;
      while (length--) {
        if (eq(array[length][0], key)) {
          return length;
        }
      }
      return -1;
    }

    /** Used for built-in method references. */
    var arrayProto = Array.prototype;

    /** Built-in value references. */
    var splice = arrayProto.splice;

    /**
     * Removes `key` and its value from the list cache.
     *
     * @private
     * @name delete
     * @memberOf ListCache
     * @param {string} key The key of the value to remove.
     * @returns {boolean} Returns `true` if the entry was removed, else `false`.
     */
    function listCacheDelete(key) {
      var data = this.__data__,
          index = assocIndexOf(data, key);

      if (index < 0) {
        return false;
      }
      var lastIndex = data.length - 1;
      if (index == lastIndex) {
        data.pop();
      } else {
        splice.call(data, index, 1);
      }
      --this.size;
      return true;
    }

    /**
     * Gets the list cache value for `key`.
     *
     * @private
     * @name get
     * @memberOf ListCache
     * @param {string} key The key of the value to get.
     * @returns {*} Returns the entry value.
     */
    function listCacheGet(key) {
      var data = this.__data__,
          index = assocIndexOf(data, key);

      return index < 0 ? undefined : data[index][1];
    }

    /**
     * Checks if a list cache value for `key` exists.
     *
     * @private
     * @name has
     * @memberOf ListCache
     * @param {string} key The key of the entry to check.
     * @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
     */
    function listCacheHas(key) {
      return assocIndexOf(this.__data__, key) > -1;
    }

    /**
     * Sets the list cache `key` to `value`.
     *
     * @private
     * @name set
     * @memberOf ListCache
     * @param {string} key The key of the value to set.
     * @param {*} value The value to set.
     * @returns {Object} Returns the list cache instance.
     */
    function listCacheSet(key, value) {
      var data = this.__data__,
          index = assocIndexOf(data, key);

      if (index < 0) {
        ++this.size;
        data.push([key, value]);
      } else {
        data[index][1] = value;
      }
      return this;
    }

    /**
     * Creates an list cache object.
     *
     * @private
     * @constructor
     * @param {Array} [entries] The key-value pairs to cache.
     */
    function ListCache(entries) {
      var index = -1,
          length = entries == null ? 0 : entries.length;

      this.clear();
      while (++index < length) {
        var entry = entries[index];
        this.set(entry[0], entry[1]);
      }
    }

    // Add methods to `ListCache`.
    ListCache.prototype.clear = listCacheClear;
    ListCache.prototype['delete'] = listCacheDelete;
    ListCache.prototype.get = listCacheGet;
    ListCache.prototype.has = listCacheHas;
    ListCache.prototype.set = listCacheSet;

    /* Built-in method references that are verified to be native. */
    var Map = getNative(root$1, 'Map');

    /**
     * Removes all key-value entries from the map.
     *
     * @private
     * @name clear
     * @memberOf MapCache
     */
    function mapCacheClear() {
      this.size = 0;
      this.__data__ = {
        'hash': new Hash,
        'map': new (Map || ListCache),
        'string': new Hash
      };
    }

    /**
     * Checks if `value` is suitable for use as unique object key.
     *
     * @private
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is suitable, else `false`.
     */
    function isKeyable(value) {
      var type = typeof value;
      return (type == 'string' || type == 'number' || type == 'symbol' || type == 'boolean')
        ? (value !== '__proto__')
        : (value === null);
    }

    /**
     * Gets the data for `map`.
     *
     * @private
     * @param {Object} map The map to query.
     * @param {string} key The reference key.
     * @returns {*} Returns the map data.
     */
    function getMapData(map, key) {
      var data = map.__data__;
      return isKeyable(key)
        ? data[typeof key == 'string' ? 'string' : 'hash']
        : data.map;
    }

    /**
     * Removes `key` and its value from the map.
     *
     * @private
     * @name delete
     * @memberOf MapCache
     * @param {string} key The key of the value to remove.
     * @returns {boolean} Returns `true` if the entry was removed, else `false`.
     */
    function mapCacheDelete(key) {
      var result = getMapData(this, key)['delete'](key);
      this.size -= result ? 1 : 0;
      return result;
    }

    /**
     * Gets the map value for `key`.
     *
     * @private
     * @name get
     * @memberOf MapCache
     * @param {string} key The key of the value to get.
     * @returns {*} Returns the entry value.
     */
    function mapCacheGet(key) {
      return getMapData(this, key).get(key);
    }

    /**
     * Checks if a map value for `key` exists.
     *
     * @private
     * @name has
     * @memberOf MapCache
     * @param {string} key The key of the entry to check.
     * @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
     */
    function mapCacheHas(key) {
      return getMapData(this, key).has(key);
    }

    /**
     * Sets the map `key` to `value`.
     *
     * @private
     * @name set
     * @memberOf MapCache
     * @param {string} key The key of the value to set.
     * @param {*} value The value to set.
     * @returns {Object} Returns the map cache instance.
     */
    function mapCacheSet(key, value) {
      var data = getMapData(this, key),
          size = data.size;

      data.set(key, value);
      this.size += data.size == size ? 0 : 1;
      return this;
    }

    /**
     * Creates a map cache object to store key-value pairs.
     *
     * @private
     * @constructor
     * @param {Array} [entries] The key-value pairs to cache.
     */
    function MapCache(entries) {
      var index = -1,
          length = entries == null ? 0 : entries.length;

      this.clear();
      while (++index < length) {
        var entry = entries[index];
        this.set(entry[0], entry[1]);
      }
    }

    // Add methods to `MapCache`.
    MapCache.prototype.clear = mapCacheClear;
    MapCache.prototype['delete'] = mapCacheDelete;
    MapCache.prototype.get = mapCacheGet;
    MapCache.prototype.has = mapCacheHas;
    MapCache.prototype.set = mapCacheSet;

    /** Error message constants. */
    var FUNC_ERROR_TEXT$1 = 'Expected a function';

    /**
     * Creates a function that memoizes the result of `func`. If `resolver` is
     * provided, it determines the cache key for storing the result based on the
     * arguments provided to the memoized function. By default, the first argument
     * provided to the memoized function is used as the map cache key. The `func`
     * is invoked with the `this` binding of the memoized function.
     *
     * **Note:** The cache is exposed as the `cache` property on the memoized
     * function. Its creation may be customized by replacing the `_.memoize.Cache`
     * constructor with one whose instances implement the
     * [`Map`](http://ecma-international.org/ecma-262/7.0/#sec-properties-of-the-map-prototype-object)
     * method interface of `clear`, `delete`, `get`, `has`, and `set`.
     *
     * @static
     * @memberOf _
     * @since 0.1.0
     * @category Function
     * @param {Function} func The function to have its output memoized.
     * @param {Function} [resolver] The function to resolve the cache key.
     * @returns {Function} Returns the new memoized function.
     * @example
     *
     * var object = { 'a': 1, 'b': 2 };
     * var other = { 'c': 3, 'd': 4 };
     *
     * var values = _.memoize(_.values);
     * values(object);
     * // => [1, 2]
     *
     * values(other);
     * // => [3, 4]
     *
     * object.a = 2;
     * values(object);
     * // => [1, 2]
     *
     * // Modify the result cache.
     * values.cache.set(object, ['a', 'b']);
     * values(object);
     * // => ['a', 'b']
     *
     * // Replace `_.memoize.Cache`.
     * _.memoize.Cache = WeakMap;
     */
    function memoize(func, resolver) {
      if (typeof func != 'function' || (resolver != null && typeof resolver != 'function')) {
        throw new TypeError(FUNC_ERROR_TEXT$1);
      }
      var memoized = function() {
        var args = arguments,
            key = resolver ? resolver.apply(this, args) : args[0],
            cache = memoized.cache;

        if (cache.has(key)) {
          return cache.get(key);
        }
        var result = func.apply(this, args);
        memoized.cache = cache.set(key, result) || cache;
        return result;
      };
      memoized.cache = new (memoize.Cache || MapCache);
      return memoized;
    }

    // Expose `MapCache`.
    memoize.Cache = MapCache;

    /** Used as the maximum memoize cache size. */
    var MAX_MEMOIZE_SIZE = 500;

    /**
     * A specialized version of `_.memoize` which clears the memoized function's
     * cache when it exceeds `MAX_MEMOIZE_SIZE`.
     *
     * @private
     * @param {Function} func The function to have its output memoized.
     * @returns {Function} Returns the new memoized function.
     */
    function memoizeCapped(func) {
      var result = memoize(func, function(key) {
        if (cache.size === MAX_MEMOIZE_SIZE) {
          cache.clear();
        }
        return key;
      });

      var cache = result.cache;
      return result;
    }

    /** Used to match property names within property paths. */
    var rePropName = /[^.[\]]+|\[(?:(-?\d+(?:\.\d+)?)|(["'])((?:(?!\2)[^\\]|\\.)*?)\2)\]|(?=(?:\.|\[\])(?:\.|\[\]|$))/g;

    /** Used to match backslashes in property paths. */
    var reEscapeChar = /\\(\\)?/g;

    /**
     * Converts `string` to a property path array.
     *
     * @private
     * @param {string} string The string to convert.
     * @returns {Array} Returns the property path array.
     */
    var stringToPath = memoizeCapped(function(string) {
      var result = [];
      if (string.charCodeAt(0) === 46 /* . */) {
        result.push('');
      }
      string.replace(rePropName, function(match, number, quote, subString) {
        result.push(quote ? subString.replace(reEscapeChar, '$1') : (number || match));
      });
      return result;
    });

    /**
     * Converts `value` to a string. An empty string is returned for `null`
     * and `undefined` values. The sign of `-0` is preserved.
     *
     * @static
     * @memberOf _
     * @since 4.0.0
     * @category Lang
     * @param {*} value The value to convert.
     * @returns {string} Returns the converted string.
     * @example
     *
     * _.toString(null);
     * // => ''
     *
     * _.toString(-0);
     * // => '-0'
     *
     * _.toString([1, 2, 3]);
     * // => '1,2,3'
     */
    function toString$1(value) {
      return value == null ? '' : baseToString(value);
    }

    /**
     * Casts `value` to a path array if it's not one.
     *
     * @private
     * @param {*} value The value to inspect.
     * @param {Object} [object] The object to query keys on.
     * @returns {Array} Returns the cast property path array.
     */
    function castPath(value, object) {
      if (isArray$2(value)) {
        return value;
      }
      return isKey(value, object) ? [value] : stringToPath(toString$1(value));
    }

    /** Used as references for various `Number` constants. */
    var INFINITY = 1 / 0;

    /**
     * Converts `value` to a string key if it's not a string or symbol.
     *
     * @private
     * @param {*} value The value to inspect.
     * @returns {string|symbol} Returns the key.
     */
    function toKey(value) {
      if (typeof value == 'string' || isSymbol(value)) {
        return value;
      }
      var result = (value + '');
      return (result == '0' && (1 / value) == -INFINITY) ? '-0' : result;
    }

    /**
     * The base implementation of `_.get` without support for default values.
     *
     * @private
     * @param {Object} object The object to query.
     * @param {Array|string} path The path of the property to get.
     * @returns {*} Returns the resolved value.
     */
    function baseGet(object, path) {
      path = castPath(path, object);

      var index = 0,
          length = path.length;

      while (object != null && index < length) {
        object = object[toKey(path[index++])];
      }
      return (index && index == length) ? object : undefined;
    }

    /**
     * Gets the value at `path` of `object`. If the resolved value is
     * `undefined`, the `defaultValue` is returned in its place.
     *
     * @static
     * @memberOf _
     * @since 3.7.0
     * @category Object
     * @param {Object} object The object to query.
     * @param {Array|string} path The path of the property to get.
     * @param {*} [defaultValue] The value returned for `undefined` resolved values.
     * @returns {*} Returns the resolved value.
     * @example
     *
     * var object = { 'a': [{ 'b': { 'c': 3 } }] };
     *
     * _.get(object, 'a[0].b.c');
     * // => 3
     *
     * _.get(object, ['a', '0', 'b', 'c']);
     * // => 3
     *
     * _.get(object, 'a.b.c', 'default');
     * // => 'default'
     */
    function get(object, path, defaultValue) {
      var result = object == null ? undefined : baseGet(object, path);
      return result === undefined ? defaultValue : result;
    }

    /**
     * Appends the elements of `values` to `array`.
     *
     * @private
     * @param {Array} array The array to modify.
     * @param {Array} values The values to append.
     * @returns {Array} Returns `array`.
     */
    function arrayPush(array, values) {
      var index = -1,
          length = values.length,
          offset = array.length;

      while (++index < length) {
        array[offset + index] = values[index];
      }
      return array;
    }

    /** Built-in value references. */
    var spreadableSymbol = Symbol$2 ? Symbol$2.isConcatSpreadable : undefined;

    /**
     * Checks if `value` is a flattenable `arguments` object or array.
     *
     * @private
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is flattenable, else `false`.
     */
    function isFlattenable(value) {
      return isArray$2(value) || isArguments(value) ||
        !!(spreadableSymbol && value && value[spreadableSymbol]);
    }

    /**
     * The base implementation of `_.flatten` with support for restricting flattening.
     *
     * @private
     * @param {Array} array The array to flatten.
     * @param {number} depth The maximum recursion depth.
     * @param {boolean} [predicate=isFlattenable] The function invoked per iteration.
     * @param {boolean} [isStrict] Restrict to values that pass `predicate` checks.
     * @param {Array} [result=[]] The initial result value.
     * @returns {Array} Returns the new flattened array.
     */
    function baseFlatten(array, depth, predicate, isStrict, result) {
      var index = -1,
          length = array.length;

      predicate || (predicate = isFlattenable);
      result || (result = []);

      while (++index < length) {
        var value = array[index];
        if (depth > 0 && predicate(value)) {
          if (depth > 1) {
            // Recursively flatten arrays (susceptible to call stack limits).
            baseFlatten(value, depth - 1, predicate, isStrict, result);
          } else {
            arrayPush(result, value);
          }
        } else if (!isStrict) {
          result[result.length] = value;
        }
      }
      return result;
    }

    /**
     * Flattens `array` a single level deep.
     *
     * @static
     * @memberOf _
     * @since 0.1.0
     * @category Array
     * @param {Array} array The array to flatten.
     * @returns {Array} Returns the new flattened array.
     * @example
     *
     * _.flatten([1, [2, [3, [4]], 5]]);
     * // => [1, 2, [3, [4]], 5]
     */
    function flatten$1(array) {
      var length = array == null ? 0 : array.length;
      return length ? baseFlatten(array, 1) : [];
    }

    /**
     * A specialized version of `baseRest` which flattens the rest array.
     *
     * @private
     * @param {Function} func The function to apply a rest parameter to.
     * @returns {Function} Returns the new function.
     */
    function flatRest(func) {
      return setToString(overRest(func, undefined, flatten$1), func + '');
    }

    /**
     * Removes all key-value entries from the stack.
     *
     * @private
     * @name clear
     * @memberOf Stack
     */
    function stackClear() {
      this.__data__ = new ListCache;
      this.size = 0;
    }

    /**
     * Removes `key` and its value from the stack.
     *
     * @private
     * @name delete
     * @memberOf Stack
     * @param {string} key The key of the value to remove.
     * @returns {boolean} Returns `true` if the entry was removed, else `false`.
     */
    function stackDelete(key) {
      var data = this.__data__,
          result = data['delete'](key);

      this.size = data.size;
      return result;
    }

    /**
     * Gets the stack value for `key`.
     *
     * @private
     * @name get
     * @memberOf Stack
     * @param {string} key The key of the value to get.
     * @returns {*} Returns the entry value.
     */
    function stackGet(key) {
      return this.__data__.get(key);
    }

    /**
     * Checks if a stack value for `key` exists.
     *
     * @private
     * @name has
     * @memberOf Stack
     * @param {string} key The key of the entry to check.
     * @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
     */
    function stackHas(key) {
      return this.__data__.has(key);
    }

    /** Used as the size to enable large array optimizations. */
    var LARGE_ARRAY_SIZE = 200;

    /**
     * Sets the stack `key` to `value`.
     *
     * @private
     * @name set
     * @memberOf Stack
     * @param {string} key The key of the value to set.
     * @param {*} value The value to set.
     * @returns {Object} Returns the stack cache instance.
     */
    function stackSet(key, value) {
      var data = this.__data__;
      if (data instanceof ListCache) {
        var pairs = data.__data__;
        if (!Map || (pairs.length < LARGE_ARRAY_SIZE - 1)) {
          pairs.push([key, value]);
          this.size = ++data.size;
          return this;
        }
        data = this.__data__ = new MapCache(pairs);
      }
      data.set(key, value);
      this.size = data.size;
      return this;
    }

    /**
     * Creates a stack cache object to store key-value pairs.
     *
     * @private
     * @constructor
     * @param {Array} [entries] The key-value pairs to cache.
     */
    function Stack(entries) {
      var data = this.__data__ = new ListCache(entries);
      this.size = data.size;
    }

    // Add methods to `Stack`.
    Stack.prototype.clear = stackClear;
    Stack.prototype['delete'] = stackDelete;
    Stack.prototype.get = stackGet;
    Stack.prototype.has = stackHas;
    Stack.prototype.set = stackSet;

    /**
     * A specialized version of `_.filter` for arrays without support for
     * iteratee shorthands.
     *
     * @private
     * @param {Array} [array] The array to iterate over.
     * @param {Function} predicate The function invoked per iteration.
     * @returns {Array} Returns the new filtered array.
     */
    function arrayFilter(array, predicate) {
      var index = -1,
          length = array == null ? 0 : array.length,
          resIndex = 0,
          result = [];

      while (++index < length) {
        var value = array[index];
        if (predicate(value, index, array)) {
          result[resIndex++] = value;
        }
      }
      return result;
    }

    /**
     * This method returns a new empty array.
     *
     * @static
     * @memberOf _
     * @since 4.13.0
     * @category Util
     * @returns {Array} Returns the new empty array.
     * @example
     *
     * var arrays = _.times(2, _.stubArray);
     *
     * console.log(arrays);
     * // => [[], []]
     *
     * console.log(arrays[0] === arrays[1]);
     * // => false
     */
    function stubArray() {
      return [];
    }

    /** Used for built-in method references. */
    var objectProto$3 = Object.prototype;

    /** Built-in value references. */
    var propertyIsEnumerable = objectProto$3.propertyIsEnumerable;

    /* Built-in method references for those with the same name as other `lodash` methods. */
    var nativeGetSymbols = Object.getOwnPropertySymbols;

    /**
     * Creates an array of the own enumerable symbols of `object`.
     *
     * @private
     * @param {Object} object The object to query.
     * @returns {Array} Returns the array of symbols.
     */
    var getSymbols = !nativeGetSymbols ? stubArray : function(object) {
      if (object == null) {
        return [];
      }
      object = Object(object);
      return arrayFilter(nativeGetSymbols(object), function(symbol) {
        return propertyIsEnumerable.call(object, symbol);
      });
    };

    /**
     * The base implementation of `getAllKeys` and `getAllKeysIn` which uses
     * `keysFunc` and `symbolsFunc` to get the enumerable property names and
     * symbols of `object`.
     *
     * @private
     * @param {Object} object The object to query.
     * @param {Function} keysFunc The function to get the keys of `object`.
     * @param {Function} symbolsFunc The function to get the symbols of `object`.
     * @returns {Array} Returns the array of property names and symbols.
     */
    function baseGetAllKeys(object, keysFunc, symbolsFunc) {
      var result = keysFunc(object);
      return isArray$2(object) ? result : arrayPush(result, symbolsFunc(object));
    }

    /**
     * Creates an array of own enumerable property names and symbols of `object`.
     *
     * @private
     * @param {Object} object The object to query.
     * @returns {Array} Returns the array of property names and symbols.
     */
    function getAllKeys(object) {
      return baseGetAllKeys(object, keys$1, getSymbols);
    }

    /* Built-in method references that are verified to be native. */
    var DataView = getNative(root$1, 'DataView');

    /* Built-in method references that are verified to be native. */
    var Promise$1 = getNative(root$1, 'Promise');

    /* Built-in method references that are verified to be native. */
    var Set$1 = getNative(root$1, 'Set');

    /** `Object#toString` result references. */
    var mapTag$2 = '[object Map]',
        objectTag$1 = '[object Object]',
        promiseTag = '[object Promise]',
        setTag$2 = '[object Set]',
        weakMapTag = '[object WeakMap]';

    var dataViewTag$1 = '[object DataView]';

    /** Used to detect maps, sets, and weakmaps. */
    var dataViewCtorString = toSource(DataView),
        mapCtorString = toSource(Map),
        promiseCtorString = toSource(Promise$1),
        setCtorString = toSource(Set$1),
        weakMapCtorString = toSource(WeakMap$1);

    /**
     * Gets the `toStringTag` of `value`.
     *
     * @private
     * @param {*} value The value to query.
     * @returns {string} Returns the `toStringTag`.
     */
    var getTag = baseGetTag;

    // Fallback for data views, maps, sets, and weak maps in IE 11 and promises in Node.js < 6.
    if ((DataView && getTag(new DataView(new ArrayBuffer(1))) != dataViewTag$1) ||
        (Map && getTag(new Map) != mapTag$2) ||
        (Promise$1 && getTag(Promise$1.resolve()) != promiseTag) ||
        (Set$1 && getTag(new Set$1) != setTag$2) ||
        (WeakMap$1 && getTag(new WeakMap$1) != weakMapTag)) {
      getTag = function(value) {
        var result = baseGetTag(value),
            Ctor = result == objectTag$1 ? value.constructor : undefined,
            ctorString = Ctor ? toSource(Ctor) : '';

        if (ctorString) {
          switch (ctorString) {
            case dataViewCtorString: return dataViewTag$1;
            case mapCtorString: return mapTag$2;
            case promiseCtorString: return promiseTag;
            case setCtorString: return setTag$2;
            case weakMapCtorString: return weakMapTag;
          }
        }
        return result;
      };
    }

    var getTag$1 = getTag;

    /** Built-in value references. */
    var Uint8Array$1 = root$1.Uint8Array;

    /** Used to stand-in for `undefined` hash values. */
    var HASH_UNDEFINED = '__lodash_hash_undefined__';

    /**
     * Adds `value` to the array cache.
     *
     * @private
     * @name add
     * @memberOf SetCache
     * @alias push
     * @param {*} value The value to cache.
     * @returns {Object} Returns the cache instance.
     */
    function setCacheAdd(value) {
      this.__data__.set(value, HASH_UNDEFINED);
      return this;
    }

    /**
     * Checks if `value` is in the array cache.
     *
     * @private
     * @name has
     * @memberOf SetCache
     * @param {*} value The value to search for.
     * @returns {number} Returns `true` if `value` is found, else `false`.
     */
    function setCacheHas(value) {
      return this.__data__.has(value);
    }

    /**
     *
     * Creates an array cache object to store unique values.
     *
     * @private
     * @constructor
     * @param {Array} [values] The values to cache.
     */
    function SetCache(values) {
      var index = -1,
          length = values == null ? 0 : values.length;

      this.__data__ = new MapCache;
      while (++index < length) {
        this.add(values[index]);
      }
    }

    // Add methods to `SetCache`.
    SetCache.prototype.add = SetCache.prototype.push = setCacheAdd;
    SetCache.prototype.has = setCacheHas;

    /**
     * A specialized version of `_.some` for arrays without support for iteratee
     * shorthands.
     *
     * @private
     * @param {Array} [array] The array to iterate over.
     * @param {Function} predicate The function invoked per iteration.
     * @returns {boolean} Returns `true` if any element passes the predicate check,
     *  else `false`.
     */
    function arraySome(array, predicate) {
      var index = -1,
          length = array == null ? 0 : array.length;

      while (++index < length) {
        if (predicate(array[index], index, array)) {
          return true;
        }
      }
      return false;
    }

    /**
     * Checks if a `cache` value for `key` exists.
     *
     * @private
     * @param {Object} cache The cache to query.
     * @param {string} key The key of the entry to check.
     * @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
     */
    function cacheHas(cache, key) {
      return cache.has(key);
    }

    /** Used to compose bitmasks for value comparisons. */
    var COMPARE_PARTIAL_FLAG$5 = 1,
        COMPARE_UNORDERED_FLAG$3 = 2;

    /**
     * A specialized version of `baseIsEqualDeep` for arrays with support for
     * partial deep comparisons.
     *
     * @private
     * @param {Array} array The array to compare.
     * @param {Array} other The other array to compare.
     * @param {number} bitmask The bitmask flags. See `baseIsEqual` for more details.
     * @param {Function} customizer The function to customize comparisons.
     * @param {Function} equalFunc The function to determine equivalents of values.
     * @param {Object} stack Tracks traversed `array` and `other` objects.
     * @returns {boolean} Returns `true` if the arrays are equivalent, else `false`.
     */
    function equalArrays(array, other, bitmask, customizer, equalFunc, stack) {
      var isPartial = bitmask & COMPARE_PARTIAL_FLAG$5,
          arrLength = array.length,
          othLength = other.length;

      if (arrLength != othLength && !(isPartial && othLength > arrLength)) {
        return false;
      }
      // Check that cyclic values are equal.
      var arrStacked = stack.get(array);
      var othStacked = stack.get(other);
      if (arrStacked && othStacked) {
        return arrStacked == other && othStacked == array;
      }
      var index = -1,
          result = true,
          seen = (bitmask & COMPARE_UNORDERED_FLAG$3) ? new SetCache : undefined;

      stack.set(array, other);
      stack.set(other, array);

      // Ignore non-index properties.
      while (++index < arrLength) {
        var arrValue = array[index],
            othValue = other[index];

        if (customizer) {
          var compared = isPartial
            ? customizer(othValue, arrValue, index, other, array, stack)
            : customizer(arrValue, othValue, index, array, other, stack);
        }
        if (compared !== undefined) {
          if (compared) {
            continue;
          }
          result = false;
          break;
        }
        // Recursively compare arrays (susceptible to call stack limits).
        if (seen) {
          if (!arraySome(other, function(othValue, othIndex) {
                if (!cacheHas(seen, othIndex) &&
                    (arrValue === othValue || equalFunc(arrValue, othValue, bitmask, customizer, stack))) {
                  return seen.push(othIndex);
                }
              })) {
            result = false;
            break;
          }
        } else if (!(
              arrValue === othValue ||
                equalFunc(arrValue, othValue, bitmask, customizer, stack)
            )) {
          result = false;
          break;
        }
      }
      stack['delete'](array);
      stack['delete'](other);
      return result;
    }

    /**
     * Converts `map` to its key-value pairs.
     *
     * @private
     * @param {Object} map The map to convert.
     * @returns {Array} Returns the key-value pairs.
     */
    function mapToArray(map) {
      var index = -1,
          result = Array(map.size);

      map.forEach(function(value, key) {
        result[++index] = [key, value];
      });
      return result;
    }

    /**
     * Converts `set` to an array of its values.
     *
     * @private
     * @param {Object} set The set to convert.
     * @returns {Array} Returns the values.
     */
    function setToArray(set) {
      var index = -1,
          result = Array(set.size);

      set.forEach(function(value) {
        result[++index] = value;
      });
      return result;
    }

    /** Used to compose bitmasks for value comparisons. */
    var COMPARE_PARTIAL_FLAG$4 = 1,
        COMPARE_UNORDERED_FLAG$2 = 2;

    /** `Object#toString` result references. */
    var boolTag = '[object Boolean]',
        dateTag = '[object Date]',
        errorTag = '[object Error]',
        mapTag$1 = '[object Map]',
        numberTag = '[object Number]',
        regexpTag = '[object RegExp]',
        setTag$1 = '[object Set]',
        stringTag$1 = '[object String]',
        symbolTag = '[object Symbol]';

    var arrayBufferTag = '[object ArrayBuffer]',
        dataViewTag = '[object DataView]';

    /** Used to convert symbols to primitives and strings. */
    var symbolProto = Symbol$2 ? Symbol$2.prototype : undefined,
        symbolValueOf = symbolProto ? symbolProto.valueOf : undefined;

    /**
     * A specialized version of `baseIsEqualDeep` for comparing objects of
     * the same `toStringTag`.
     *
     * **Note:** This function only supports comparing values with tags of
     * `Boolean`, `Date`, `Error`, `Number`, `RegExp`, or `String`.
     *
     * @private
     * @param {Object} object The object to compare.
     * @param {Object} other The other object to compare.
     * @param {string} tag The `toStringTag` of the objects to compare.
     * @param {number} bitmask The bitmask flags. See `baseIsEqual` for more details.
     * @param {Function} customizer The function to customize comparisons.
     * @param {Function} equalFunc The function to determine equivalents of values.
     * @param {Object} stack Tracks traversed `object` and `other` objects.
     * @returns {boolean} Returns `true` if the objects are equivalent, else `false`.
     */
    function equalByTag(object, other, tag, bitmask, customizer, equalFunc, stack) {
      switch (tag) {
        case dataViewTag:
          if ((object.byteLength != other.byteLength) ||
              (object.byteOffset != other.byteOffset)) {
            return false;
          }
          object = object.buffer;
          other = other.buffer;

        case arrayBufferTag:
          if ((object.byteLength != other.byteLength) ||
              !equalFunc(new Uint8Array$1(object), new Uint8Array$1(other))) {
            return false;
          }
          return true;

        case boolTag:
        case dateTag:
        case numberTag:
          // Coerce booleans to `1` or `0` and dates to milliseconds.
          // Invalid dates are coerced to `NaN`.
          return eq(+object, +other);

        case errorTag:
          return object.name == other.name && object.message == other.message;

        case regexpTag:
        case stringTag$1:
          // Coerce regexes to strings and treat strings, primitives and objects,
          // as equal. See http://www.ecma-international.org/ecma-262/7.0/#sec-regexp.prototype.tostring
          // for more details.
          return object == (other + '');

        case mapTag$1:
          var convert = mapToArray;

        case setTag$1:
          var isPartial = bitmask & COMPARE_PARTIAL_FLAG$4;
          convert || (convert = setToArray);

          if (object.size != other.size && !isPartial) {
            return false;
          }
          // Assume cyclic values are equal.
          var stacked = stack.get(object);
          if (stacked) {
            return stacked == other;
          }
          bitmask |= COMPARE_UNORDERED_FLAG$2;

          // Recursively compare objects (susceptible to call stack limits).
          stack.set(object, other);
          var result = equalArrays(convert(object), convert(other), bitmask, customizer, equalFunc, stack);
          stack['delete'](object);
          return result;

        case symbolTag:
          if (symbolValueOf) {
            return symbolValueOf.call(object) == symbolValueOf.call(other);
          }
      }
      return false;
    }

    /** Used to compose bitmasks for value comparisons. */
    var COMPARE_PARTIAL_FLAG$3 = 1;

    /** Used for built-in method references. */
    var objectProto$2 = Object.prototype;

    /** Used to check objects for own properties. */
    var hasOwnProperty$2 = objectProto$2.hasOwnProperty;

    /**
     * A specialized version of `baseIsEqualDeep` for objects with support for
     * partial deep comparisons.
     *
     * @private
     * @param {Object} object The object to compare.
     * @param {Object} other The other object to compare.
     * @param {number} bitmask The bitmask flags. See `baseIsEqual` for more details.
     * @param {Function} customizer The function to customize comparisons.
     * @param {Function} equalFunc The function to determine equivalents of values.
     * @param {Object} stack Tracks traversed `object` and `other` objects.
     * @returns {boolean} Returns `true` if the objects are equivalent, else `false`.
     */
    function equalObjects(object, other, bitmask, customizer, equalFunc, stack) {
      var isPartial = bitmask & COMPARE_PARTIAL_FLAG$3,
          objProps = getAllKeys(object),
          objLength = objProps.length,
          othProps = getAllKeys(other),
          othLength = othProps.length;

      if (objLength != othLength && !isPartial) {
        return false;
      }
      var index = objLength;
      while (index--) {
        var key = objProps[index];
        if (!(isPartial ? key in other : hasOwnProperty$2.call(other, key))) {
          return false;
        }
      }
      // Check that cyclic values are equal.
      var objStacked = stack.get(object);
      var othStacked = stack.get(other);
      if (objStacked && othStacked) {
        return objStacked == other && othStacked == object;
      }
      var result = true;
      stack.set(object, other);
      stack.set(other, object);

      var skipCtor = isPartial;
      while (++index < objLength) {
        key = objProps[index];
        var objValue = object[key],
            othValue = other[key];

        if (customizer) {
          var compared = isPartial
            ? customizer(othValue, objValue, key, other, object, stack)
            : customizer(objValue, othValue, key, object, other, stack);
        }
        // Recursively compare objects (susceptible to call stack limits).
        if (!(compared === undefined
              ? (objValue === othValue || equalFunc(objValue, othValue, bitmask, customizer, stack))
              : compared
            )) {
          result = false;
          break;
        }
        skipCtor || (skipCtor = key == 'constructor');
      }
      if (result && !skipCtor) {
        var objCtor = object.constructor,
            othCtor = other.constructor;

        // Non `Object` object instances with different constructors are not equal.
        if (objCtor != othCtor &&
            ('constructor' in object && 'constructor' in other) &&
            !(typeof objCtor == 'function' && objCtor instanceof objCtor &&
              typeof othCtor == 'function' && othCtor instanceof othCtor)) {
          result = false;
        }
      }
      stack['delete'](object);
      stack['delete'](other);
      return result;
    }

    /** Used to compose bitmasks for value comparisons. */
    var COMPARE_PARTIAL_FLAG$2 = 1;

    /** `Object#toString` result references. */
    var argsTag = '[object Arguments]',
        arrayTag = '[object Array]',
        objectTag = '[object Object]';

    /** Used for built-in method references. */
    var objectProto$1 = Object.prototype;

    /** Used to check objects for own properties. */
    var hasOwnProperty$1 = objectProto$1.hasOwnProperty;

    /**
     * A specialized version of `baseIsEqual` for arrays and objects which performs
     * deep comparisons and tracks traversed objects enabling objects with circular
     * references to be compared.
     *
     * @private
     * @param {Object} object The object to compare.
     * @param {Object} other The other object to compare.
     * @param {number} bitmask The bitmask flags. See `baseIsEqual` for more details.
     * @param {Function} customizer The function to customize comparisons.
     * @param {Function} equalFunc The function to determine equivalents of values.
     * @param {Object} [stack] Tracks traversed `object` and `other` objects.
     * @returns {boolean} Returns `true` if the objects are equivalent, else `false`.
     */
    function baseIsEqualDeep(object, other, bitmask, customizer, equalFunc, stack) {
      var objIsArr = isArray$2(object),
          othIsArr = isArray$2(other),
          objTag = objIsArr ? arrayTag : getTag$1(object),
          othTag = othIsArr ? arrayTag : getTag$1(other);

      objTag = objTag == argsTag ? objectTag : objTag;
      othTag = othTag == argsTag ? objectTag : othTag;

      var objIsObj = objTag == objectTag,
          othIsObj = othTag == objectTag,
          isSameTag = objTag == othTag;

      if (isSameTag && isBuffer(object)) {
        if (!isBuffer(other)) {
          return false;
        }
        objIsArr = true;
        objIsObj = false;
      }
      if (isSameTag && !objIsObj) {
        stack || (stack = new Stack);
        return (objIsArr || isTypedArray(object))
          ? equalArrays(object, other, bitmask, customizer, equalFunc, stack)
          : equalByTag(object, other, objTag, bitmask, customizer, equalFunc, stack);
      }
      if (!(bitmask & COMPARE_PARTIAL_FLAG$2)) {
        var objIsWrapped = objIsObj && hasOwnProperty$1.call(object, '__wrapped__'),
            othIsWrapped = othIsObj && hasOwnProperty$1.call(other, '__wrapped__');

        if (objIsWrapped || othIsWrapped) {
          var objUnwrapped = objIsWrapped ? object.value() : object,
              othUnwrapped = othIsWrapped ? other.value() : other;

          stack || (stack = new Stack);
          return equalFunc(objUnwrapped, othUnwrapped, bitmask, customizer, stack);
        }
      }
      if (!isSameTag) {
        return false;
      }
      stack || (stack = new Stack);
      return equalObjects(object, other, bitmask, customizer, equalFunc, stack);
    }

    /**
     * The base implementation of `_.isEqual` which supports partial comparisons
     * and tracks traversed objects.
     *
     * @private
     * @param {*} value The value to compare.
     * @param {*} other The other value to compare.
     * @param {boolean} bitmask The bitmask flags.
     *  1 - Unordered comparison
     *  2 - Partial comparison
     * @param {Function} [customizer] The function to customize comparisons.
     * @param {Object} [stack] Tracks traversed `value` and `other` objects.
     * @returns {boolean} Returns `true` if the values are equivalent, else `false`.
     */
    function baseIsEqual(value, other, bitmask, customizer, stack) {
      if (value === other) {
        return true;
      }
      if (value == null || other == null || (!isObjectLike(value) && !isObjectLike(other))) {
        return value !== value && other !== other;
      }
      return baseIsEqualDeep(value, other, bitmask, customizer, baseIsEqual, stack);
    }

    /** Used to compose bitmasks for value comparisons. */
    var COMPARE_PARTIAL_FLAG$1 = 1,
        COMPARE_UNORDERED_FLAG$1 = 2;

    /**
     * The base implementation of `_.isMatch` without support for iteratee shorthands.
     *
     * @private
     * @param {Object} object The object to inspect.
     * @param {Object} source The object of property values to match.
     * @param {Array} matchData The property names, values, and compare flags to match.
     * @param {Function} [customizer] The function to customize comparisons.
     * @returns {boolean} Returns `true` if `object` is a match, else `false`.
     */
    function baseIsMatch(object, source, matchData, customizer) {
      var index = matchData.length,
          length = index,
          noCustomizer = !customizer;

      if (object == null) {
        return !length;
      }
      object = Object(object);
      while (index--) {
        var data = matchData[index];
        if ((noCustomizer && data[2])
              ? data[1] !== object[data[0]]
              : !(data[0] in object)
            ) {
          return false;
        }
      }
      while (++index < length) {
        data = matchData[index];
        var key = data[0],
            objValue = object[key],
            srcValue = data[1];

        if (noCustomizer && data[2]) {
          if (objValue === undefined && !(key in object)) {
            return false;
          }
        } else {
          var stack = new Stack;
          if (customizer) {
            var result = customizer(objValue, srcValue, key, object, source, stack);
          }
          if (!(result === undefined
                ? baseIsEqual(srcValue, objValue, COMPARE_PARTIAL_FLAG$1 | COMPARE_UNORDERED_FLAG$1, customizer, stack)
                : result
              )) {
            return false;
          }
        }
      }
      return true;
    }

    /**
     * Checks if `value` is suitable for strict equality comparisons, i.e. `===`.
     *
     * @private
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` if suitable for strict
     *  equality comparisons, else `false`.
     */
    function isStrictComparable(value) {
      return value === value && !isObject(value);
    }

    /**
     * Gets the property names, values, and compare flags of `object`.
     *
     * @private
     * @param {Object} object The object to query.
     * @returns {Array} Returns the match data of `object`.
     */
    function getMatchData(object) {
      var result = keys$1(object),
          length = result.length;

      while (length--) {
        var key = result[length],
            value = object[key];

        result[length] = [key, value, isStrictComparable(value)];
      }
      return result;
    }

    /**
     * A specialized version of `matchesProperty` for source values suitable
     * for strict equality comparisons, i.e. `===`.
     *
     * @private
     * @param {string} key The key of the property to get.
     * @param {*} srcValue The value to match.
     * @returns {Function} Returns the new spec function.
     */
    function matchesStrictComparable(key, srcValue) {
      return function(object) {
        if (object == null) {
          return false;
        }
        return object[key] === srcValue &&
          (srcValue !== undefined || (key in Object(object)));
      };
    }

    /**
     * The base implementation of `_.matches` which doesn't clone `source`.
     *
     * @private
     * @param {Object} source The object of property values to match.
     * @returns {Function} Returns the new spec function.
     */
    function baseMatches(source) {
      var matchData = getMatchData(source);
      if (matchData.length == 1 && matchData[0][2]) {
        return matchesStrictComparable(matchData[0][0], matchData[0][1]);
      }
      return function(object) {
        return object === source || baseIsMatch(object, source, matchData);
      };
    }

    /**
     * The base implementation of `_.hasIn` without support for deep paths.
     *
     * @private
     * @param {Object} [object] The object to query.
     * @param {Array|string} key The key to check.
     * @returns {boolean} Returns `true` if `key` exists, else `false`.
     */
    function baseHasIn(object, key) {
      return object != null && key in Object(object);
    }

    /**
     * Checks if `path` exists on `object`.
     *
     * @private
     * @param {Object} object The object to query.
     * @param {Array|string} path The path to check.
     * @param {Function} hasFunc The function to check properties.
     * @returns {boolean} Returns `true` if `path` exists, else `false`.
     */
    function hasPath(object, path, hasFunc) {
      path = castPath(path, object);

      var index = -1,
          length = path.length,
          result = false;

      while (++index < length) {
        var key = toKey(path[index]);
        if (!(result = object != null && hasFunc(object, key))) {
          break;
        }
        object = object[key];
      }
      if (result || ++index != length) {
        return result;
      }
      length = object == null ? 0 : object.length;
      return !!length && isLength(length) && isIndex(key, length) &&
        (isArray$2(object) || isArguments(object));
    }

    /**
     * Checks if `path` is a direct or inherited property of `object`.
     *
     * @static
     * @memberOf _
     * @since 4.0.0
     * @category Object
     * @param {Object} object The object to query.
     * @param {Array|string} path The path to check.
     * @returns {boolean} Returns `true` if `path` exists, else `false`.
     * @example
     *
     * var object = _.create({ 'a': _.create({ 'b': 2 }) });
     *
     * _.hasIn(object, 'a');
     * // => true
     *
     * _.hasIn(object, 'a.b');
     * // => true
     *
     * _.hasIn(object, ['a', 'b']);
     * // => true
     *
     * _.hasIn(object, 'b');
     * // => false
     */
    function hasIn(object, path) {
      return object != null && hasPath(object, path, baseHasIn);
    }

    /** Used to compose bitmasks for value comparisons. */
    var COMPARE_PARTIAL_FLAG = 1,
        COMPARE_UNORDERED_FLAG = 2;

    /**
     * The base implementation of `_.matchesProperty` which doesn't clone `srcValue`.
     *
     * @private
     * @param {string} path The path of the property to get.
     * @param {*} srcValue The value to match.
     * @returns {Function} Returns the new spec function.
     */
    function baseMatchesProperty(path, srcValue) {
      if (isKey(path) && isStrictComparable(srcValue)) {
        return matchesStrictComparable(toKey(path), srcValue);
      }
      return function(object) {
        var objValue = get(object, path);
        return (objValue === undefined && objValue === srcValue)
          ? hasIn(object, path)
          : baseIsEqual(srcValue, objValue, COMPARE_PARTIAL_FLAG | COMPARE_UNORDERED_FLAG);
      };
    }

    /**
     * The base implementation of `_.property` without support for deep paths.
     *
     * @private
     * @param {string} key The key of the property to get.
     * @returns {Function} Returns the new accessor function.
     */
    function baseProperty(key) {
      return function(object) {
        return object == null ? undefined : object[key];
      };
    }

    /**
     * A specialized version of `baseProperty` which supports deep paths.
     *
     * @private
     * @param {Array|string} path The path of the property to get.
     * @returns {Function} Returns the new accessor function.
     */
    function basePropertyDeep(path) {
      return function(object) {
        return baseGet(object, path);
      };
    }

    /**
     * Creates a function that returns the value at `path` of a given object.
     *
     * @static
     * @memberOf _
     * @since 2.4.0
     * @category Util
     * @param {Array|string} path The path of the property to get.
     * @returns {Function} Returns the new accessor function.
     * @example
     *
     * var objects = [
     *   { 'a': { 'b': 2 } },
     *   { 'a': { 'b': 1 } }
     * ];
     *
     * _.map(objects, _.property('a.b'));
     * // => [2, 1]
     *
     * _.map(_.sortBy(objects, _.property(['a', 'b'])), 'a.b');
     * // => [1, 2]
     */
    function property(path) {
      return isKey(path) ? baseProperty(toKey(path)) : basePropertyDeep(path);
    }

    /**
     * The base implementation of `_.iteratee`.
     *
     * @private
     * @param {*} [value=_.identity] The value to convert to an iteratee.
     * @returns {Function} Returns the iteratee.
     */
    function baseIteratee(value) {
      // Don't store the `typeof` result in a variable to avoid a JIT bug in Safari 9.
      // See https://bugs.webkit.org/show_bug.cgi?id=156034 for more details.
      if (typeof value == 'function') {
        return value;
      }
      if (value == null) {
        return identity;
      }
      if (typeof value == 'object') {
        return isArray$2(value)
          ? baseMatchesProperty(value[0], value[1])
          : baseMatches(value);
      }
      return property(value);
    }

    /**
     * Creates a base function for methods like `_.forIn` and `_.forOwn`.
     *
     * @private
     * @param {boolean} [fromRight] Specify iterating from right to left.
     * @returns {Function} Returns the new base function.
     */
    function createBaseFor(fromRight) {
      return function(object, iteratee, keysFunc) {
        var index = -1,
            iterable = Object(object),
            props = keysFunc(object),
            length = props.length;

        while (length--) {
          var key = props[fromRight ? length : ++index];
          if (iteratee(iterable[key], key, iterable) === false) {
            break;
          }
        }
        return object;
      };
    }

    /**
     * The base implementation of `baseForOwn` which iterates over `object`
     * properties returned by `keysFunc` and invokes `iteratee` for each property.
     * Iteratee functions may exit iteration early by explicitly returning `false`.
     *
     * @private
     * @param {Object} object The object to iterate over.
     * @param {Function} iteratee The function invoked per iteration.
     * @param {Function} keysFunc The function to get the keys of `object`.
     * @returns {Object} Returns `object`.
     */
    var baseFor = createBaseFor();

    /**
     * The base implementation of `_.forOwn` without support for iteratee shorthands.
     *
     * @private
     * @param {Object} object The object to iterate over.
     * @param {Function} iteratee The function invoked per iteration.
     * @returns {Object} Returns `object`.
     */
    function baseForOwn(object, iteratee) {
      return object && baseFor(object, iteratee, keys$1);
    }

    /**
     * Creates a `baseEach` or `baseEachRight` function.
     *
     * @private
     * @param {Function} eachFunc The function to iterate over a collection.
     * @param {boolean} [fromRight] Specify iterating from right to left.
     * @returns {Function} Returns the new base function.
     */
    function createBaseEach(eachFunc, fromRight) {
      return function(collection, iteratee) {
        if (collection == null) {
          return collection;
        }
        if (!isArrayLike(collection)) {
          return eachFunc(collection, iteratee);
        }
        var length = collection.length,
            index = fromRight ? length : -1,
            iterable = Object(collection);

        while ((fromRight ? index-- : ++index < length)) {
          if (iteratee(iterable[index], index, iterable) === false) {
            break;
          }
        }
        return collection;
      };
    }

    /**
     * The base implementation of `_.forEach` without support for iteratee shorthands.
     *
     * @private
     * @param {Array|Object} collection The collection to iterate over.
     * @param {Function} iteratee The function invoked per iteration.
     * @returns {Array|Object} Returns `collection`.
     */
    var baseEach = createBaseEach(baseForOwn);

    /**
     * The base implementation of `_.filter` without support for iteratee shorthands.
     *
     * @private
     * @param {Array|Object} collection The collection to iterate over.
     * @param {Function} predicate The function invoked per iteration.
     * @returns {Array} Returns the new filtered array.
     */
    function baseFilter(collection, predicate) {
      var result = [];
      baseEach(collection, function(value, index, collection) {
        if (predicate(value, index, collection)) {
          result.push(value);
        }
      });
      return result;
    }

    /**
     * Iterates over elements of `collection`, returning an array of all elements
     * `predicate` returns truthy for. The predicate is invoked with three
     * arguments: (value, index|key, collection).
     *
     * **Note:** Unlike `_.remove`, this method returns a new array.
     *
     * @static
     * @memberOf _
     * @since 0.1.0
     * @category Collection
     * @param {Array|Object} collection The collection to iterate over.
     * @param {Function} [predicate=_.identity] The function invoked per iteration.
     * @returns {Array} Returns the new filtered array.
     * @see _.reject
     * @example
     *
     * var users = [
     *   { 'user': 'barney', 'age': 36, 'active': true },
     *   { 'user': 'fred',   'age': 40, 'active': false }
     * ];
     *
     * _.filter(users, function(o) { return !o.active; });
     * // => objects for ['fred']
     *
     * // The `_.matches` iteratee shorthand.
     * _.filter(users, { 'age': 36, 'active': true });
     * // => objects for ['barney']
     *
     * // The `_.matchesProperty` iteratee shorthand.
     * _.filter(users, ['active', false]);
     * // => objects for ['fred']
     *
     * // The `_.property` iteratee shorthand.
     * _.filter(users, 'active');
     * // => objects for ['barney']
     *
     * // Combining several predicates using `_.overEvery` or `_.overSome`.
     * _.filter(users, _.overSome([{ 'age': 36 }, ['age', 40]]));
     * // => objects for ['fred', 'barney']
     */
    function filter$1(collection, predicate) {
      var func = isArray$2(collection) ? arrayFilter : baseFilter;
      return func(collection, baseIteratee(predicate));
    }

    /**
     * The base implementation of `_.map` without support for iteratee shorthands.
     *
     * @private
     * @param {Array|Object} collection The collection to iterate over.
     * @param {Function} iteratee The function invoked per iteration.
     * @returns {Array} Returns the new mapped array.
     */
    function baseMap(collection, iteratee) {
      var index = -1,
          result = isArrayLike(collection) ? Array(collection.length) : [];

      baseEach(collection, function(value, key, collection) {
        result[++index] = iteratee(value, key, collection);
      });
      return result;
    }

    /**
     * Creates an array of values by running each element in `collection` thru
     * `iteratee`. The iteratee is invoked with three arguments:
     * (value, index|key, collection).
     *
     * Many lodash methods are guarded to work as iteratees for methods like
     * `_.every`, `_.filter`, `_.map`, `_.mapValues`, `_.reject`, and `_.some`.
     *
     * The guarded methods are:
     * `ary`, `chunk`, `curry`, `curryRight`, `drop`, `dropRight`, `every`,
     * `fill`, `invert`, `parseInt`, `random`, `range`, `rangeRight`, `repeat`,
     * `sampleSize`, `slice`, `some`, `sortBy`, `split`, `take`, `takeRight`,
     * `template`, `trim`, `trimEnd`, `trimStart`, and `words`
     *
     * @static
     * @memberOf _
     * @since 0.1.0
     * @category Collection
     * @param {Array|Object} collection The collection to iterate over.
     * @param {Function} [iteratee=_.identity] The function invoked per iteration.
     * @returns {Array} Returns the new mapped array.
     * @example
     *
     * function square(n) {
     *   return n * n;
     * }
     *
     * _.map([4, 8], square);
     * // => [16, 64]
     *
     * _.map({ 'a': 4, 'b': 8 }, square);
     * // => [16, 64] (iteration order is not guaranteed)
     *
     * var users = [
     *   { 'user': 'barney' },
     *   { 'user': 'fred' }
     * ];
     *
     * // The `_.property` iteratee shorthand.
     * _.map(users, 'user');
     * // => ['barney', 'fred']
     */
    function map$1(collection, iteratee) {
      var func = isArray$2(collection) ? arrayMap : baseMap;
      return func(collection, baseIteratee(iteratee));
    }

    /** Error message constants. */
    var FUNC_ERROR_TEXT = 'Expected a function';

    /** Used to compose bitmasks for function metadata. */
    var WRAP_CURRY_FLAG = 8,
        WRAP_PARTIAL_FLAG = 32,
        WRAP_ARY_FLAG = 128,
        WRAP_REARG_FLAG = 256;

    /**
     * Creates a `_.flow` or `_.flowRight` function.
     *
     * @private
     * @param {boolean} [fromRight] Specify iterating from right to left.
     * @returns {Function} Returns the new flow function.
     */
    function createFlow(fromRight) {
      return flatRest(function(funcs) {
        var length = funcs.length,
            index = length,
            prereq = LodashWrapper.prototype.thru;

        if (fromRight) {
          funcs.reverse();
        }
        while (index--) {
          var func = funcs[index];
          if (typeof func != 'function') {
            throw new TypeError(FUNC_ERROR_TEXT);
          }
          if (prereq && !wrapper && getFuncName(func) == 'wrapper') {
            var wrapper = new LodashWrapper([], true);
          }
        }
        index = wrapper ? index : length;
        while (++index < length) {
          func = funcs[index];

          var funcName = getFuncName(func),
              data = funcName == 'wrapper' ? getData(func) : undefined;

          if (data && isLaziable(data[0]) &&
                data[1] == (WRAP_ARY_FLAG | WRAP_CURRY_FLAG | WRAP_PARTIAL_FLAG | WRAP_REARG_FLAG) &&
                !data[4].length && data[9] == 1
              ) {
            wrapper = wrapper[getFuncName(data[0])].apply(wrapper, data[3]);
          } else {
            wrapper = (func.length == 1 && isLaziable(func))
              ? wrapper[funcName]()
              : wrapper.thru(func);
          }
        }
        return function() {
          var args = arguments,
              value = args[0];

          if (wrapper && args.length == 1 && isArray$2(value)) {
            return wrapper.plant(value).value();
          }
          var index = 0,
              result = length ? funcs[index].apply(this, args) : value;

          while (++index < length) {
            result = funcs[index].call(this, result);
          }
          return result;
        };
      });
    }

    /**
     * Creates a function that returns the result of invoking the given functions
     * with the `this` binding of the created function, where each successive
     * invocation is supplied the return value of the previous.
     *
     * @static
     * @memberOf _
     * @since 3.0.0
     * @category Util
     * @param {...(Function|Function[])} [funcs] The functions to invoke.
     * @returns {Function} Returns the new composite function.
     * @see _.flowRight
     * @example
     *
     * function square(n) {
     *   return n * n;
     * }
     *
     * var addSquare = _.flow([_.add, square]);
     * addSquare(1, 2);
     * // => 9
     */
    var flow = createFlow();

    var flow$1 = flow;

    /**
     * The base implementation of `_.gt` which doesn't coerce arguments.
     *
     * @private
     * @param {*} value The value to compare.
     * @param {*} other The other value to compare.
     * @returns {boolean} Returns `true` if `value` is greater than `other`,
     *  else `false`.
     */
    function baseGt(value, other) {
      return value > other;
    }

    /** `Object#toString` result references. */
    var stringTag = '[object String]';

    /**
     * Checks if `value` is classified as a `String` primitive or object.
     *
     * @static
     * @since 0.1.0
     * @memberOf _
     * @category Lang
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is a string, else `false`.
     * @example
     *
     * _.isString('abc');
     * // => true
     *
     * _.isString(1);
     * // => false
     */
    function isString(value) {
      return typeof value == 'string' ||
        (!isArray$2(value) && isObjectLike(value) && baseGetTag(value) == stringTag);
    }

    /**
     * The base implementation of `_.values` and `_.valuesIn` which creates an
     * array of `object` property values corresponding to the property names
     * of `props`.
     *
     * @private
     * @param {Object} object The object to query.
     * @param {Array} props The property names to get values for.
     * @returns {Object} Returns the array of property values.
     */
    function baseValues(object, props) {
      return arrayMap(props, function(key) {
        return object[key];
      });
    }

    /**
     * Creates an array of the own enumerable string keyed property values of `object`.
     *
     * **Note:** Non-object values are coerced to objects.
     *
     * @static
     * @since 0.1.0
     * @memberOf _
     * @category Object
     * @param {Object} object The object to query.
     * @returns {Array} Returns the array of property values.
     * @example
     *
     * function Foo() {
     *   this.a = 1;
     *   this.b = 2;
     * }
     *
     * Foo.prototype.c = 3;
     *
     * _.values(new Foo);
     * // => [1, 2] (iteration order is not guaranteed)
     *
     * _.values('hi');
     * // => ['h', 'i']
     */
    function values(object) {
      return object == null ? [] : baseValues(object, keys$1(object));
    }

    /* Built-in method references for those with the same name as other `lodash` methods. */
    var nativeMax$1 = Math.max;

    /**
     * Checks if `value` is in `collection`. If `collection` is a string, it's
     * checked for a substring of `value`, otherwise
     * [`SameValueZero`](http://ecma-international.org/ecma-262/7.0/#sec-samevaluezero)
     * is used for equality comparisons. If `fromIndex` is negative, it's used as
     * the offset from the end of `collection`.
     *
     * @static
     * @memberOf _
     * @since 0.1.0
     * @category Collection
     * @param {Array|Object|string} collection The collection to inspect.
     * @param {*} value The value to search for.
     * @param {number} [fromIndex=0] The index to search from.
     * @param- {Object} [guard] Enables use as an iteratee for methods like `_.reduce`.
     * @returns {boolean} Returns `true` if `value` is found, else `false`.
     * @example
     *
     * _.includes([1, 2, 3], 1);
     * // => true
     *
     * _.includes([1, 2, 3], 1, 2);
     * // => false
     *
     * _.includes({ 'a': 1, 'b': 2 }, 1);
     * // => true
     *
     * _.includes('abcd', 'bc');
     * // => true
     */
    function includes(collection, value, fromIndex, guard) {
      collection = isArrayLike(collection) ? collection : values(collection);
      fromIndex = (fromIndex && !guard) ? toInteger(fromIndex) : 0;

      var length = collection.length;
      if (fromIndex < 0) {
        fromIndex = nativeMax$1(length + fromIndex, 0);
      }
      return isString(collection)
        ? (fromIndex <= length && collection.indexOf(value, fromIndex) > -1)
        : (!!length && baseIndexOf(collection, value, fromIndex) > -1);
    }

    /** `Object#toString` result references. */
    var mapTag = '[object Map]',
        setTag = '[object Set]';

    /** Used for built-in method references. */
    var objectProto = Object.prototype;

    /** Used to check objects for own properties. */
    var hasOwnProperty = objectProto.hasOwnProperty;

    /**
     * Checks if `value` is an empty object, collection, map, or set.
     *
     * Objects are considered empty if they have no own enumerable string keyed
     * properties.
     *
     * Array-like values such as `arguments` objects, arrays, buffers, strings, or
     * jQuery-like collections are considered empty if they have a `length` of `0`.
     * Similarly, maps and sets are considered empty if they have a `size` of `0`.
     *
     * @static
     * @memberOf _
     * @since 0.1.0
     * @category Lang
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is empty, else `false`.
     * @example
     *
     * _.isEmpty(null);
     * // => true
     *
     * _.isEmpty(true);
     * // => true
     *
     * _.isEmpty(1);
     * // => true
     *
     * _.isEmpty([1, 2, 3]);
     * // => false
     *
     * _.isEmpty({ 'a': 1 });
     * // => false
     */
    function isEmpty(value) {
      if (value == null) {
        return true;
      }
      if (isArrayLike(value) &&
          (isArray$2(value) || typeof value == 'string' || typeof value.splice == 'function' ||
            isBuffer(value) || isTypedArray(value) || isArguments(value))) {
        return !value.length;
      }
      var tag = getTag$1(value);
      if (tag == mapTag || tag == setTag) {
        return !value.size;
      }
      if (isPrototype(value)) {
        return !baseKeys(value).length;
      }
      for (var key in value) {
        if (hasOwnProperty.call(value, key)) {
          return false;
        }
      }
      return true;
    }

    /**
     * Checks if `value` is `null`.
     *
     * @static
     * @memberOf _
     * @since 0.1.0
     * @category Lang
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is `null`, else `false`.
     * @example
     *
     * _.isNull(null);
     * // => true
     *
     * _.isNull(void 0);
     * // => false
     */
    function isNull(value) {
      return value === null;
    }

    /**
     * Checks if `value` is `undefined`.
     *
     * @static
     * @since 0.1.0
     * @memberOf _
     * @category Lang
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is `undefined`, else `false`.
     * @example
     *
     * _.isUndefined(void 0);
     * // => true
     *
     * _.isUndefined(null);
     * // => false
     */
    function isUndefined(value) {
      return value === undefined;
    }

    /**
     * The base implementation of methods like `_.max` and `_.min` which accepts a
     * `comparator` to determine the extremum value.
     *
     * @private
     * @param {Array} array The array to iterate over.
     * @param {Function} iteratee The iteratee invoked per iteration.
     * @param {Function} comparator The comparator used to compare values.
     * @returns {*} Returns the extremum value.
     */
    function baseExtremum(array, iteratee, comparator) {
      var index = -1,
          length = array.length;

      while (++index < length) {
        var value = array[index],
            current = iteratee(value);

        if (current != null && (computed === undefined
              ? (current === current && !isSymbol(current))
              : comparator(current, computed)
            )) {
          var computed = current,
              result = value;
        }
      }
      return result;
    }

    /**
     * Computes the maximum value of `array`. If `array` is empty or falsey,
     * `undefined` is returned.
     *
     * @static
     * @since 0.1.0
     * @memberOf _
     * @category Math
     * @param {Array} array The array to iterate over.
     * @returns {*} Returns the maximum value.
     * @example
     *
     * _.max([4, 2, 8, 6]);
     * // => 8
     *
     * _.max([]);
     * // => undefined
     */
    function max(array) {
      return (array && array.length)
        ? baseExtremum(array, identity, baseGt)
        : undefined;
    }

    /* Built-in method references for those with the same name as other `lodash` methods. */
    var nativeFloor = Math.floor,
        nativeRandom = Math.random;

    /**
     * The base implementation of `_.random` without support for returning
     * floating-point numbers.
     *
     * @private
     * @param {number} lower The lower bound.
     * @param {number} upper The upper bound.
     * @returns {number} Returns the random number.
     */
    function baseRandom(lower, upper) {
      return lower + nativeFloor(nativeRandom() * (upper - lower + 1));
    }

    /* Built-in method references for those with the same name as other `lodash` methods. */
    var nativeCeil = Math.ceil,
        nativeMax = Math.max;

    /**
     * The base implementation of `_.range` and `_.rangeRight` which doesn't
     * coerce arguments.
     *
     * @private
     * @param {number} start The start of the range.
     * @param {number} end The end of the range.
     * @param {number} step The value to increment or decrement by.
     * @param {boolean} [fromRight] Specify iterating from right to left.
     * @returns {Array} Returns the range of numbers.
     */
    function baseRange(start, end, step, fromRight) {
      var index = -1,
          length = nativeMax(nativeCeil((end - start) / (step || 1)), 0),
          result = Array(length);

      while (length--) {
        result[fromRight ? length : ++index] = start;
        start += step;
      }
      return result;
    }

    /**
     * Creates a `_.range` or `_.rangeRight` function.
     *
     * @private
     * @param {boolean} [fromRight] Specify iterating from right to left.
     * @returns {Function} Returns the new range function.
     */
    function createRange$1(fromRight) {
      return function(start, end, step) {
        if (step && typeof step != 'number' && isIterateeCall(start, end, step)) {
          end = step = undefined;
        }
        // Ensure the sign of `-0` is preserved.
        start = toFinite(start);
        if (end === undefined) {
          end = start;
          start = 0;
        } else {
          end = toFinite(end);
        }
        step = step === undefined ? (start < end ? 1 : -1) : toFinite(step);
        return baseRange(start, end, step, fromRight);
      };
    }

    /**
     * Creates an array of numbers (positive and/or negative) progressing from
     * `start` up to, but not including, `end`. A step of `-1` is used if a negative
     * `start` is specified without an `end` or `step`. If `end` is not specified,
     * it's set to `start` with `start` then set to `0`.
     *
     * **Note:** JavaScript follows the IEEE-754 standard for resolving
     * floating-point values which can produce unexpected results.
     *
     * @static
     * @since 0.1.0
     * @memberOf _
     * @category Util
     * @param {number} [start=0] The start of the range.
     * @param {number} end The end of the range.
     * @param {number} [step=1] The value to increment or decrement by.
     * @returns {Array} Returns the range of numbers.
     * @see _.inRange, _.rangeRight
     * @example
     *
     * _.range(4);
     * // => [0, 1, 2, 3]
     *
     * _.range(-4);
     * // => [0, -1, -2, -3]
     *
     * _.range(1, 5);
     * // => [1, 2, 3, 4]
     *
     * _.range(0, 20, 5);
     * // => [0, 5, 10, 15]
     *
     * _.range(0, -4, -1);
     * // => [0, -1, -2, -3]
     *
     * _.range(1, 4, 0);
     * // => [1, 1, 1]
     *
     * _.range(0);
     * // => []
     */
    var range = createRange$1();

    var range$1 = range;

    /**
     * A specialized version of `_.sample` for arrays.
     *
     * @private
     * @param {Array} array The array to sample.
     * @returns {*} Returns the random element.
     */
    function arraySample(array) {
      var length = array.length;
      return length ? array[baseRandom(0, length - 1)] : undefined;
    }

    /**
     * The base implementation of `_.sample`.
     *
     * @private
     * @param {Array|Object} collection The collection to sample.
     * @returns {*} Returns the random element.
     */
    function baseSample(collection) {
      return arraySample(values(collection));
    }

    /**
     * Gets a random element from `collection`.
     *
     * @static
     * @memberOf _
     * @since 2.0.0
     * @category Collection
     * @param {Array|Object} collection The collection to sample.
     * @returns {*} Returns the random element.
     * @example
     *
     * _.sample([1, 2, 3, 4]);
     * // => 2
     */
    function sample(collection) {
      var func = isArray$2(collection) ? arraySample : baseSample;
      return func(collection);
    }

    const standardTuning = [{ note: "E", octave: 4, string: 1 },
        { note: "B", octave: 3, string: 2 },
        { note: "G", octave: 3, string: 3 },
        { note: "D", octave: 3, string: 4 },
        { note: "A", octave: 2, string: 5 },
        { note: "E", octave: 2, string: 6 }];
    function fretCount(fretBoard) {
        return (flow$1(x => map$1(x, "fret"), max)(fretBoard));
    }
    function stringCount(fretBoard) {
        return (new Set(fretBoard.map(note => note.string)).size);
    }
    function createNote(stringTuning, fret) {
        let note = { note: stringTuning.note,
            octave: stringTuning.octave,
            string: stringTuning.string,
            fret: fret };
        return note;
    }
    function createStringNotes(stringTuning, frets) {
        let firstNote = createNote(stringTuning, 0);
        let stringNotes = [];
        let currentOctave = stringTuning.octave;
        stringNotes.push(firstNote);
        for (let i = 1; i < frets + 1; i++) {
            let tone = tones[(i + tones.indexOf(stringTuning.note)) % 12];
            if (tone == "C")
                currentOctave++;
            stringNotes.push(createNote({ note: tone,
                octave: currentOctave,
                string: stringTuning.string }, i));
        }
        return stringNotes;
    }
    function createFretBoard(tuning, frets) {
        let currentFretboard = [];
        for (let stringTuning of tuning) {
            currentFretboard.push(createStringNotes(stringTuning, frets));
        }
        return (currentFretboard.flat());
    }
    function noteName(note) {
        if (!isEmpty(note)) {
            return (`${note.note}${note.octave}`);
        }
        else {
            return null;
        }
    }

    function publishEvent(type, detail) {
        const event = new CustomEvent(type, { detail: detail });
        dispatchEvent(event);
    }

    let start, stop, subscribe;
    function startAudio() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (typeof start == "undefined") {
                    ({ start, stop, subscribe } = yield freelizer());
                }
                start();
                subscribe((e) => { publishEvent("audioSignal", e); });
            }
            catch (error) {
                console.log("There was an error trying to start the audio");
                console.log(error);
            }
        });
    }
    function stopAudio() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                console.log(stop);
                stop();
            }
            catch (error) {
                console.log("There was an error trying to stop the audio");
                console.log(error);
            }
        });
    }
    let currentNoteFirstSeenTimeStamp = 0;
    let currentNoteName = null;
    function currentNoteFirstSeenListener(e) {
        if (currentNoteName != noteName(e.detail)) {
            currentNoteFirstSeenTimeStamp = e.timeStamp;
        }
        currentNoteName = noteName(e.detail);
    }
    addEventListener('audioSignal', currentNoteFirstSeenListener);
    function logListener(e) {
        let { frequency, note, noteFrequency, deviation, octave } = e.detail;
        let audioEventLogElem = document.querySelector("#audio-event-log");
        if (frequency) {
            audioEventLogElem.innerHTML = `<p>frequency = ${frequency.toFixed(2)} note = ${note} octave=${octave} deviation=${deviation}<p>`;
        }
    }
    class audioMonitorToggleButton {
        constructor(parentDiv) {
            this.listening = false;
            this.parentDiv = null;
            this.listening = false;
            this.parentDiv = parentDiv;
            this.audioMonitorToggleButtonRender();
        }
        ;
        audioMonitorToggleButtonRender() {
            let message = this.listening ? "Stop" : "Start";
            let element = document.createElement('button');
            element.innerHTML = message;
            element.addEventListener('click', () => { this.audioMonitorToggleButton(); });
            this.parentDiv.innerHTML = '';
            this.parentDiv.append(element);
        }
        ;
        audioMonitorToggleButton() {
            if (this.listening) {
                stopAudio();
            }
            else {
                startAudio();
            }
            this.listening = !this.listening;
            this.audioMonitorToggleButtonRender();
        }
        ;
    }

    const methods$1 = {};
    const names = [];

    function registerMethods (name, m) {
      if (Array.isArray(name)) {
        for (const _name of name) {
          registerMethods(_name, m);
        }
        return
      }

      if (typeof name === 'object') {
        for (const _name in name) {
          registerMethods(_name, name[_name]);
        }
        return
      }

      addMethodNames(Object.getOwnPropertyNames(m));
      methods$1[name] = Object.assign(methods$1[name] || {}, m);
    }

    function getMethodsFor (name) {
      return methods$1[name] || {}
    }

    function getMethodNames () {
      return [ ...new Set(names) ]
    }

    function addMethodNames (_names) {
      names.push(..._names);
    }

    // Map function
    function map (array, block) {
      let i;
      const il = array.length;
      const result = [];

      for (i = 0; i < il; i++) {
        result.push(block(array[i]));
      }

      return result
    }

    // Filter function
    function filter (array, block) {
      let i;
      const il = array.length;
      const result = [];

      for (i = 0; i < il; i++) {
        if (block(array[i])) {
          result.push(array[i]);
        }
      }

      return result
    }

    // Degrees to radians
    function radians (d) {
      return d % 360 * Math.PI / 180
    }

    // Convert dash-separated-string to camelCase
    function camelCase (s) {
      return s.toLowerCase().replace(/-(.)/g, function (m, g) {
        return g.toUpperCase()
      })
    }

    // Convert camel cased string to dash separated
    function unCamelCase (s) {
      return s.replace(/([A-Z])/g, function (m, g) {
        return '-' + g.toLowerCase()
      })
    }

    // Capitalize first letter of a string
    function capitalize (s) {
      return s.charAt(0).toUpperCase() + s.slice(1)
    }

    // Calculate proportional width and height values when necessary
    function proportionalSize (element, width, height, box) {
      if (width == null || height == null) {
        box = box || element.bbox();

        if (width == null) {
          width = box.width / box.height * height;
        } else if (height == null) {
          height = box.height / box.width * width;
        }
      }

      return {
        width: width,
        height: height
      }
    }

    /**
     * This function adds support for string origins.
     * It searches for an origin in o.origin o.ox and o.originX.
     * This way, origin: {x: 'center', y: 50} can be passed as well as ox: 'center', oy: 50
    **/
    function getOrigin (o, element) {
      const origin = o.origin;
      // First check if origin is in ox or originX
      let ox = o.ox != null
        ? o.ox
        : o.originX != null
          ? o.originX
          : 'center';
      let oy = o.oy != null
        ? o.oy
        : o.originY != null
          ? o.originY
          : 'center';

      // Then check if origin was used and overwrite in that case
      if (origin != null) {
        [ ox, oy ] = Array.isArray(origin)
          ? origin
          : typeof origin === 'object'
            ? [ origin.x, origin.y ]
            : [ origin, origin ];
      }

      // Make sure to only call bbox when actually needed
      const condX = typeof ox === 'string';
      const condY = typeof oy === 'string';
      if (condX || condY) {
        const { height, width, x, y } = element.bbox();

        // And only overwrite if string was passed for this specific axis
        if (condX) {
          ox = ox.includes('left')
            ? x
            : ox.includes('right')
              ? x + width
              : x + width / 2;
        }

        if (condY) {
          oy = oy.includes('top')
            ? y
            : oy.includes('bottom')
              ? y + height
              : y + height / 2;
        }
      }

      // Return the origin as it is if it wasn't a string
      return [ ox, oy ]
    }

    // Default namespaces
    const svg = 'http://www.w3.org/2000/svg';
    const html = 'http://www.w3.org/1999/xhtml';
    const xmlns = 'http://www.w3.org/2000/xmlns/';
    const xlink = 'http://www.w3.org/1999/xlink';
    const svgjs = 'http://svgjs.dev/svgjs';

    const globals = {
      window: typeof window === 'undefined' ? null : window,
      document: typeof document === 'undefined' ? null : document
    };

    class Base {
      // constructor (node/*, {extensions = []} */) {
      //   // this.tags = []
      //   //
      //   // for (let extension of extensions) {
      //   //   extension.setup.call(this, node)
      //   //   this.tags.push(extension.name)
      //   // }
      // }
    }

    const elements = {};
    const root = '___SYMBOL___ROOT___';

    // Method for element creation
    function create (name, ns = svg) {
      // create element
      return globals.document.createElementNS(ns, name)
    }

    function makeInstance (element, isHTML = false) {
      if (element instanceof Base) return element

      if (typeof element === 'object') {
        return adopter(element)
      }

      if (element == null) {
        return new elements[root]()
      }

      if (typeof element === 'string' && element.charAt(0) !== '<') {
        return adopter(globals.document.querySelector(element))
      }

      // Make sure, that HTML elements are created with the correct namespace
      const wrapper = isHTML ? globals.document.createElement('div') : create('svg');
      wrapper.innerHTML = element;

      // We can use firstChild here because we know,
      // that the first char is < and thus an element
      element = adopter(wrapper.firstChild);

      // make sure, that element doesnt have its wrapper attached
      wrapper.removeChild(wrapper.firstChild);
      return element
    }

    function nodeOrNew (name, node) {
      return (node && node.ownerDocument && node instanceof node.ownerDocument.defaultView.Node) ? node : create(name)
    }

    // Adopt existing svg elements
    function adopt (node) {
      // check for presence of node
      if (!node) return null

      // make sure a node isn't already adopted
      if (node.instance instanceof Base) return node.instance

      if (node.nodeName === '#document-fragment') {
        return new elements.Fragment(node)
      }

      // initialize variables
      let className = capitalize(node.nodeName || 'Dom');

      // Make sure that gradients are adopted correctly
      if (className === 'LinearGradient' || className === 'RadialGradient') {
        className = 'Gradient';

      // Fallback to Dom if element is not known
      } else if (!elements[className]) {
        className = 'Dom';
      }

      return new elements[className](node)
    }

    let adopter = adopt;

    function register (element, name = element.name, asRoot = false) {
      elements[name] = element;
      if (asRoot) elements[root] = element;

      addMethodNames(Object.getOwnPropertyNames(element.prototype));

      return element
    }

    function getClass (name) {
      return elements[name]
    }

    // Element id sequence
    let did = 1000;

    // Get next named element id
    function eid (name) {
      return 'Svgjs' + capitalize(name) + (did++)
    }

    // Deep new id assignment
    function assignNewId (node) {
      // do the same for SVG child nodes as well
      for (let i = node.children.length - 1; i >= 0; i--) {
        assignNewId(node.children[i]);
      }

      if (node.id) {
        node.id = eid(node.nodeName);
        return node
      }

      return node
    }

    // Method for extending objects
    function extend$1 (modules, methods) {
      let key, i;

      modules = Array.isArray(modules) ? modules : [ modules ];

      for (i = modules.length - 1; i >= 0; i--) {
        for (key in methods) {
          modules[i].prototype[key] = methods[key];
        }
      }
    }

    function wrapWithAttrCheck (fn) {
      return function (...args) {
        const o = args[args.length - 1];

        if (o && o.constructor === Object && !(o instanceof Array)) {
          return fn.apply(this, args.slice(0, -1)).attr(o)
        } else {
          return fn.apply(this, args)
        }
      }
    }

    // Get all siblings, including myself
    function siblings () {
      return this.parent().children()
    }

    // Get the current position siblings
    function position () {
      return this.parent().index(this)
    }

    // Get the next element (will return null if there is none)
    function next () {
      return this.siblings()[this.position() + 1]
    }

    // Get the next element (will return null if there is none)
    function prev () {
      return this.siblings()[this.position() - 1]
    }

    // Send given element one step forward
    function forward () {
      const i = this.position();
      const p = this.parent();

      // move node one step forward
      p.add(this.remove(), i + 1);

      return this
    }

    // Send given element one step backward
    function backward () {
      const i = this.position();
      const p = this.parent();

      p.add(this.remove(), i ? i - 1 : 0);

      return this
    }

    // Send given element all the way to the front
    function front () {
      const p = this.parent();

      // Move node forward
      p.add(this.remove());

      return this
    }

    // Send given element all the way to the back
    function back () {
      const p = this.parent();

      // Move node back
      p.add(this.remove(), 0);

      return this
    }

    // Inserts a given element before the targeted element
    function before (element) {
      element = makeInstance(element);
      element.remove();

      const i = this.position();

      this.parent().add(element, i);

      return this
    }

    // Inserts a given element after the targeted element
    function after (element) {
      element = makeInstance(element);
      element.remove();

      const i = this.position();

      this.parent().add(element, i + 1);

      return this
    }

    function insertBefore (element) {
      element = makeInstance(element);
      element.before(this);
      return this
    }

    function insertAfter (element) {
      element = makeInstance(element);
      element.after(this);
      return this
    }

    registerMethods('Dom', {
      siblings,
      position,
      next,
      prev,
      forward,
      backward,
      front,
      back,
      before,
      after,
      insertBefore,
      insertAfter
    });

    // Parse unit value
    const numberAndUnit = /^([+-]?(\d+(\.\d*)?|\.\d+)(e[+-]?\d+)?)([a-z%]*)$/i;

    // Parse hex value
    const hex = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i;

    // Parse rgb value
    const rgb = /rgb\((\d+),(\d+),(\d+)\)/;

    // Parse reference id
    const reference = /(#[a-z_][a-z0-9\-_]*)/i;

    // splits a transformation chain
    const transforms = /\)\s*,?\s*/;

    // Whitespace
    const whitespace = /\s/g;

    // Test hex value
    const isHex = /^#[a-f0-9]{3}$|^#[a-f0-9]{6}$/i;

    // Test rgb value
    const isRgb = /^rgb\(/;

    // Test for blank string
    const isBlank = /^(\s+)?$/;

    // Test for numeric string
    const isNumber = /^[+-]?(\d+(\.\d*)?|\.\d+)(e[+-]?\d+)?$/i;

    // Test for image url
    const isImage = /\.(jpg|jpeg|png|gif|svg)(\?[^=]+.*)?/i;

    // split at whitespace and comma
    const delimiter = /[\s,]+/;

    // Test for path letter
    const isPathLetter = /[MLHVCSQTAZ]/i;

    // Return array of classes on the node
    function classes () {
      const attr = this.attr('class');
      return attr == null ? [] : attr.trim().split(delimiter)
    }

    // Return true if class exists on the node, false otherwise
    function hasClass (name) {
      return this.classes().indexOf(name) !== -1
    }

    // Add class to the node
    function addClass (name) {
      if (!this.hasClass(name)) {
        const array = this.classes();
        array.push(name);
        this.attr('class', array.join(' '));
      }

      return this
    }

    // Remove class from the node
    function removeClass (name) {
      if (this.hasClass(name)) {
        this.attr('class', this.classes().filter(function (c) {
          return c !== name
        }).join(' '));
      }

      return this
    }

    // Toggle the presence of a class on the node
    function toggleClass (name) {
      return this.hasClass(name) ? this.removeClass(name) : this.addClass(name)
    }

    registerMethods('Dom', {
      classes, hasClass, addClass, removeClass, toggleClass
    });

    // Dynamic style generator
    function css (style, val) {
      const ret = {};
      if (arguments.length === 0) {
        // get full style as object
        this.node.style.cssText.split(/\s*;\s*/)
          .filter(function (el) {
            return !!el.length
          })
          .forEach(function (el) {
            const t = el.split(/\s*:\s*/);
            ret[t[0]] = t[1];
          });
        return ret
      }

      if (arguments.length < 2) {
        // get style properties as array
        if (Array.isArray(style)) {
          for (const name of style) {
            const cased = camelCase(name);
            ret[name] = this.node.style[cased];
          }
          return ret
        }

        // get style for property
        if (typeof style === 'string') {
          return this.node.style[camelCase(style)]
        }

        // set styles in object
        if (typeof style === 'object') {
          for (const name in style) {
            // set empty string if null/undefined/'' was given
            this.node.style[camelCase(name)]
              = (style[name] == null || isBlank.test(style[name])) ? '' : style[name];
          }
        }
      }

      // set style for property
      if (arguments.length === 2) {
        this.node.style[camelCase(style)]
          = (val == null || isBlank.test(val)) ? '' : val;
      }

      return this
    }

    // Show element
    function show () {
      return this.css('display', '')
    }

    // Hide element
    function hide () {
      return this.css('display', 'none')
    }

    // Is element visible?
    function visible () {
      return this.css('display') !== 'none'
    }

    registerMethods('Dom', {
      css, show, hide, visible
    });

    // Store data values on svg nodes
    function data (a, v, r) {
      if (a == null) {
        // get an object of attributes
        return this.data(map(filter(this.node.attributes, (el) => el.nodeName.indexOf('data-') === 0), (el) => el.nodeName.slice(5)))
      } else if (a instanceof Array) {
        const data = {};
        for (const key of a) {
          data[key] = this.data(key);
        }
        return data
      } else if (typeof a === 'object') {
        for (v in a) {
          this.data(v, a[v]);
        }
      } else if (arguments.length < 2) {
        try {
          return JSON.parse(this.attr('data-' + a))
        } catch (e) {
          return this.attr('data-' + a)
        }
      } else {
        this.attr('data-' + a,
          v === null
            ? null
            : r === true || typeof v === 'string' || typeof v === 'number'
              ? v
              : JSON.stringify(v)
        );
      }

      return this
    }

    registerMethods('Dom', { data });

    // Remember arbitrary data
    function remember (k, v) {
      // remember every item in an object individually
      if (typeof arguments[0] === 'object') {
        for (const key in k) {
          this.remember(key, k[key]);
        }
      } else if (arguments.length === 1) {
        // retrieve memory
        return this.memory()[k]
      } else {
        // store memory
        this.memory()[k] = v;
      }

      return this
    }

    // Erase a given memory
    function forget () {
      if (arguments.length === 0) {
        this._memory = {};
      } else {
        for (let i = arguments.length - 1; i >= 0; i--) {
          delete this.memory()[arguments[i]];
        }
      }
      return this
    }

    // This triggers creation of a new hidden class which is not performant
    // However, this function is not rarely used so it will not happen frequently
    // Return local memory object
    function memory () {
      return (this._memory = this._memory || {})
    }

    registerMethods('Dom', { remember, forget, memory });

    function sixDigitHex (hex) {
      return hex.length === 4
        ? [ '#',
          hex.substring(1, 2), hex.substring(1, 2),
          hex.substring(2, 3), hex.substring(2, 3),
          hex.substring(3, 4), hex.substring(3, 4)
        ].join('')
        : hex
    }

    function componentHex (component) {
      const integer = Math.round(component);
      const bounded = Math.max(0, Math.min(255, integer));
      const hex = bounded.toString(16);
      return hex.length === 1 ? '0' + hex : hex
    }

    function is (object, space) {
      for (let i = space.length; i--;) {
        if (object[space[i]] == null) {
          return false
        }
      }
      return true
    }

    function getParameters (a, b) {
      const params = is(a, 'rgb')
        ? { _a: a.r, _b: a.g, _c: a.b, _d: 0, space: 'rgb' }
        : is(a, 'xyz')
          ? { _a: a.x, _b: a.y, _c: a.z, _d: 0, space: 'xyz' }
          : is(a, 'hsl')
            ? { _a: a.h, _b: a.s, _c: a.l, _d: 0, space: 'hsl' }
            : is(a, 'lab')
              ? { _a: a.l, _b: a.a, _c: a.b, _d: 0, space: 'lab' }
              : is(a, 'lch')
                ? { _a: a.l, _b: a.c, _c: a.h, _d: 0, space: 'lch' }
                : is(a, 'cmyk')
                  ? { _a: a.c, _b: a.m, _c: a.y, _d: a.k, space: 'cmyk' }
                  : { _a: 0, _b: 0, _c: 0, space: 'rgb' };

      params.space = b || params.space;
      return params
    }

    function cieSpace (space) {
      if (space === 'lab' || space === 'xyz' || space === 'lch') {
        return true
      } else {
        return false
      }
    }

    function hueToRgb (p, q, t) {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t
      if (t < 1 / 2) return q
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
      return p
    }

    class Color {
      constructor (...inputs) {
        this.init(...inputs);
      }

      // Test if given value is a color
      static isColor (color) {
        return color && (
          color instanceof Color
          || this.isRgb(color)
          || this.test(color)
        )
      }

      // Test if given value is an rgb object
      static isRgb (color) {
        return color && typeof color.r === 'number'
          && typeof color.g === 'number'
          && typeof color.b === 'number'
      }

      /*
      Generating random colors
      */
      static random (mode = 'vibrant', t, u) {

        // Get the math modules
        const { random, round, sin, PI: pi } = Math;

        // Run the correct generator
        if (mode === 'vibrant') {

          const l = (81 - 57) * random() + 57;
          const c = (83 - 45) * random() + 45;
          const h = 360 * random();
          const color = new Color(l, c, h, 'lch');
          return color

        } else if (mode === 'sine') {

          t = t == null ? random() : t;
          const r = round(80 * sin(2 * pi * t / 0.5 + 0.01) + 150);
          const g = round(50 * sin(2 * pi * t / 0.5 + 4.6) + 200);
          const b = round(100 * sin(2 * pi * t / 0.5 + 2.3) + 150);
          const color = new Color(r, g, b);
          return color

        } else if (mode === 'pastel') {

          const l = (94 - 86) * random() + 86;
          const c = (26 - 9) * random() + 9;
          const h = 360 * random();
          const color = new Color(l, c, h, 'lch');
          return color

        } else if (mode === 'dark') {

          const l = 10 + 10 * random();
          const c = (125 - 75) * random() + 86;
          const h = 360 * random();
          const color = new Color(l, c, h, 'lch');
          return color

        } else if (mode === 'rgb') {

          const r = 255 * random();
          const g = 255 * random();
          const b = 255 * random();
          const color = new Color(r, g, b);
          return color

        } else if (mode === 'lab') {

          const l = 100 * random();
          const a = 256 * random() - 128;
          const b = 256 * random() - 128;
          const color = new Color(l, a, b, 'lab');
          return color

        } else if (mode === 'grey') {

          const grey = 255 * random();
          const color = new Color(grey, grey, grey);
          return color

        } else {

          throw new Error('Unsupported random color mode')

        }
      }

      // Test if given value is a color string
      static test (color) {
        return (typeof color === 'string')
          && (isHex.test(color) || isRgb.test(color))
      }

      cmyk () {

        // Get the rgb values for the current color
        const { _a, _b, _c } = this.rgb();
        const [ r, g, b ] = [ _a, _b, _c ].map(v => v / 255);

        // Get the cmyk values in an unbounded format
        const k = Math.min(1 - r, 1 - g, 1 - b);

        if (k === 1) {
          // Catch the black case
          return new Color(0, 0, 0, 1, 'cmyk')
        }

        const c = (1 - r - k) / (1 - k);
        const m = (1 - g - k) / (1 - k);
        const y = (1 - b - k) / (1 - k);

        // Construct the new color
        const color = new Color(c, m, y, k, 'cmyk');
        return color
      }

      hsl () {

        // Get the rgb values
        const { _a, _b, _c } = this.rgb();
        const [ r, g, b ] = [ _a, _b, _c ].map(v => v / 255);

        // Find the maximum and minimum values to get the lightness
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const l = (max + min) / 2;

        // If the r, g, v values are identical then we are grey
        const isGrey = max === min;

        // Calculate the hue and saturation
        const delta = max - min;
        const s = isGrey
          ? 0
          : l > 0.5
            ? delta / (2 - max - min)
            : delta / (max + min);
        const h = isGrey
          ? 0
          : max === r
            ? ((g - b) / delta + (g < b ? 6 : 0)) / 6
            : max === g
              ? ((b - r) / delta + 2) / 6
              : max === b
                ? ((r - g) / delta + 4) / 6
                : 0;

        // Construct and return the new color
        const color = new Color(360 * h, 100 * s, 100 * l, 'hsl');
        return color
      }

      init (a = 0, b = 0, c = 0, d = 0, space = 'rgb') {
        // This catches the case when a falsy value is passed like ''
        a = !a ? 0 : a;

        // Reset all values in case the init function is rerun with new color space
        if (this.space) {
          for (const component in this.space) {
            delete this[this.space[component]];
          }
        }

        if (typeof a === 'number') {
          // Allow for the case that we don't need d...
          space = typeof d === 'string' ? d : space;
          d = typeof d === 'string' ? 0 : d;

          // Assign the values straight to the color
          Object.assign(this, { _a: a, _b: b, _c: c, _d: d, space });
        // If the user gave us an array, make the color from it
        } else if (a instanceof Array) {
          this.space = b || (typeof a[3] === 'string' ? a[3] : a[4]) || 'rgb';
          Object.assign(this, { _a: a[0], _b: a[1], _c: a[2], _d: a[3] || 0 });
        } else if (a instanceof Object) {
          // Set the object up and assign its values directly
          const values = getParameters(a, b);
          Object.assign(this, values);
        } else if (typeof a === 'string') {
          if (isRgb.test(a)) {
            const noWhitespace = a.replace(whitespace, '');
            const [ _a, _b, _c ] = rgb.exec(noWhitespace)
              .slice(1, 4).map(v => parseInt(v));
            Object.assign(this, { _a, _b, _c, _d: 0, space: 'rgb' });
          } else if (isHex.test(a)) {
            const hexParse = v => parseInt(v, 16);
            const [ , _a, _b, _c ] = hex.exec(sixDigitHex(a)).map(hexParse);
            Object.assign(this, { _a, _b, _c, _d: 0, space: 'rgb' });
          } else throw Error('Unsupported string format, can\'t construct Color')
        }

        // Now add the components as a convenience
        const { _a, _b, _c, _d } = this;
        const components = this.space === 'rgb'
          ? { r: _a, g: _b, b: _c }
          : this.space === 'xyz'
            ? { x: _a, y: _b, z: _c }
            : this.space === 'hsl'
              ? { h: _a, s: _b, l: _c }
              : this.space === 'lab'
                ? { l: _a, a: _b, b: _c }
                : this.space === 'lch'
                  ? { l: _a, c: _b, h: _c }
                  : this.space === 'cmyk'
                    ? { c: _a, m: _b, y: _c, k: _d }
                    : {};
        Object.assign(this, components);
      }

      lab () {
        // Get the xyz color
        const { x, y, z } = this.xyz();

        // Get the lab components
        const l = (116 * y) - 16;
        const a = 500 * (x - y);
        const b = 200 * (y - z);

        // Construct and return a new color
        const color = new Color(l, a, b, 'lab');
        return color
      }

      lch () {

        // Get the lab color directly
        const { l, a, b } = this.lab();

        // Get the chromaticity and the hue using polar coordinates
        const c = Math.sqrt(a ** 2 + b ** 2);
        let h = 180 * Math.atan2(b, a) / Math.PI;
        if (h < 0) {
          h *= -1;
          h = 360 - h;
        }

        // Make a new color and return it
        const color = new Color(l, c, h, 'lch');
        return color
      }
      /*
      Conversion Methods
      */

      rgb () {
        if (this.space === 'rgb') {
          return this
        } else if (cieSpace(this.space)) {
          // Convert to the xyz color space
          let { x, y, z } = this;
          if (this.space === 'lab' || this.space === 'lch') {
            // Get the values in the lab space
            let { l, a, b } = this;
            if (this.space === 'lch') {
              const { c, h } = this;
              const dToR = Math.PI / 180;
              a = c * Math.cos(dToR * h);
              b = c * Math.sin(dToR * h);
            }

            // Undo the nonlinear function
            const yL = (l + 16) / 116;
            const xL = a / 500 + yL;
            const zL = yL - b / 200;

            // Get the xyz values
            const ct = 16 / 116;
            const mx = 0.008856;
            const nm = 7.787;
            x = 0.95047 * ((xL ** 3 > mx) ? xL ** 3 : (xL - ct) / nm);
            y = 1.00000 * ((yL ** 3 > mx) ? yL ** 3 : (yL - ct) / nm);
            z = 1.08883 * ((zL ** 3 > mx) ? zL ** 3 : (zL - ct) / nm);
          }

          // Convert xyz to unbounded rgb values
          const rU = x * 3.2406 + y * -1.5372 + z * -0.4986;
          const gU = x * -0.9689 + y * 1.8758 + z * 0.0415;
          const bU = x * 0.0557 + y * -0.2040 + z * 1.0570;

          // Convert the values to true rgb values
          const pow = Math.pow;
          const bd = 0.0031308;
          const r = (rU > bd) ? (1.055 * pow(rU, 1 / 2.4) - 0.055) : 12.92 * rU;
          const g = (gU > bd) ? (1.055 * pow(gU, 1 / 2.4) - 0.055) : 12.92 * gU;
          const b = (bU > bd) ? (1.055 * pow(bU, 1 / 2.4) - 0.055) : 12.92 * bU;

          // Make and return the color
          const color = new Color(255 * r, 255 * g, 255 * b);
          return color
        } else if (this.space === 'hsl') {
          // https://bgrins.github.io/TinyColor/docs/tinycolor.html
          // Get the current hsl values
          let { h, s, l } = this;
          h /= 360;
          s /= 100;
          l /= 100;

          // If we are grey, then just make the color directly
          if (s === 0) {
            l *= 255;
            const color = new Color(l, l, l);
            return color
          }

          // TODO I have no idea what this does :D If you figure it out, tell me!
          const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
          const p = 2 * l - q;

          // Get the rgb values
          const r = 255 * hueToRgb(p, q, h + 1 / 3);
          const g = 255 * hueToRgb(p, q, h);
          const b = 255 * hueToRgb(p, q, h - 1 / 3);

          // Make a new color
          const color = new Color(r, g, b);
          return color
        } else if (this.space === 'cmyk') {
          // https://gist.github.com/felipesabino/5066336
          // Get the normalised cmyk values
          const { c, m, y, k } = this;

          // Get the rgb values
          const r = 255 * (1 - Math.min(1, c * (1 - k) + k));
          const g = 255 * (1 - Math.min(1, m * (1 - k) + k));
          const b = 255 * (1 - Math.min(1, y * (1 - k) + k));

          // Form the color and return it
          const color = new Color(r, g, b);
          return color
        } else {
          return this
        }
      }

      toArray () {
        const { _a, _b, _c, _d, space } = this;
        return [ _a, _b, _c, _d, space ]
      }

      toHex () {
        const [ r, g, b ] = this._clamped().map(componentHex);
        return `#${r}${g}${b}`
      }

      toRgb () {
        const [ rV, gV, bV ] = this._clamped();
        const string = `rgb(${rV},${gV},${bV})`;
        return string
      }

      toString () {
        return this.toHex()
      }

      xyz () {

        // Normalise the red, green and blue values
        const { _a: r255, _b: g255, _c: b255 } = this.rgb();
        const [ r, g, b ] = [ r255, g255, b255 ].map(v => v / 255);

        // Convert to the lab rgb space
        const rL = (r > 0.04045) ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
        const gL = (g > 0.04045) ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
        const bL = (b > 0.04045) ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;

        // Convert to the xyz color space without bounding the values
        const xU = (rL * 0.4124 + gL * 0.3576 + bL * 0.1805) / 0.95047;
        const yU = (rL * 0.2126 + gL * 0.7152 + bL * 0.0722) / 1.00000;
        const zU = (rL * 0.0193 + gL * 0.1192 + bL * 0.9505) / 1.08883;

        // Get the proper xyz values by applying the bounding
        const x = (xU > 0.008856) ? Math.pow(xU, 1 / 3) : (7.787 * xU) + 16 / 116;
        const y = (yU > 0.008856) ? Math.pow(yU, 1 / 3) : (7.787 * yU) + 16 / 116;
        const z = (zU > 0.008856) ? Math.pow(zU, 1 / 3) : (7.787 * zU) + 16 / 116;

        // Make and return the color
        const color = new Color(x, y, z, 'xyz');
        return color
      }

      /*
      Input and Output methods
      */

      _clamped () {
        const { _a, _b, _c } = this.rgb();
        const { max, min, round } = Math;
        const format = v => max(0, min(round(v), 255));
        return [ _a, _b, _c ].map(format)
      }

      /*
      Constructing colors
      */

    }

    class Point {
      // Initialize
      constructor (...args) {
        this.init(...args);
      }

      // Clone point
      clone () {
        return new Point(this)
      }

      init (x, y) {
        const base = { x: 0, y: 0 };

        // ensure source as object
        const source = Array.isArray(x)
          ? { x: x[0], y: x[1] }
          : typeof x === 'object'
            ? { x: x.x, y: x.y }
            : { x: x, y: y };

        // merge source
        this.x = source.x == null ? base.x : source.x;
        this.y = source.y == null ? base.y : source.y;

        return this
      }

      toArray () {
        return [ this.x, this.y ]
      }

      transform (m) {
        return this.clone().transformO(m)
      }

      // Transform point with matrix
      transformO (m) {
        if (!Matrix.isMatrixLike(m)) {
          m = new Matrix(m);
        }

        const { x, y } = this;

        // Perform the matrix multiplication
        this.x = m.a * x + m.c * y + m.e;
        this.y = m.b * x + m.d * y + m.f;

        return this
      }

    }

    function point (x, y) {
      return new Point(x, y).transform(this.screenCTM().inverse())
    }

    function closeEnough (a, b, threshold) {
      return Math.abs(b - a) < (threshold || 1e-6)
    }

    class Matrix {
      constructor (...args) {
        this.init(...args);
      }

      static formatTransforms (o) {
        // Get all of the parameters required to form the matrix
        const flipBoth = o.flip === 'both' || o.flip === true;
        const flipX = o.flip && (flipBoth || o.flip === 'x') ? -1 : 1;
        const flipY = o.flip && (flipBoth || o.flip === 'y') ? -1 : 1;
        const skewX = o.skew && o.skew.length
          ? o.skew[0]
          : isFinite(o.skew)
            ? o.skew
            : isFinite(o.skewX)
              ? o.skewX
              : 0;
        const skewY = o.skew && o.skew.length
          ? o.skew[1]
          : isFinite(o.skew)
            ? o.skew
            : isFinite(o.skewY)
              ? o.skewY
              : 0;
        const scaleX = o.scale && o.scale.length
          ? o.scale[0] * flipX
          : isFinite(o.scale)
            ? o.scale * flipX
            : isFinite(o.scaleX)
              ? o.scaleX * flipX
              : flipX;
        const scaleY = o.scale && o.scale.length
          ? o.scale[1] * flipY
          : isFinite(o.scale)
            ? o.scale * flipY
            : isFinite(o.scaleY)
              ? o.scaleY * flipY
              : flipY;
        const shear = o.shear || 0;
        const theta = o.rotate || o.theta || 0;
        const origin = new Point(o.origin || o.around || o.ox || o.originX, o.oy || o.originY);
        const ox = origin.x;
        const oy = origin.y;
        // We need Point to be invalid if nothing was passed because we cannot default to 0 here. Thats why NaN
        const position = new Point(o.position || o.px || o.positionX || NaN, o.py || o.positionY || NaN);
        const px = position.x;
        const py = position.y;
        const translate = new Point(o.translate || o.tx || o.translateX, o.ty || o.translateY);
        const tx = translate.x;
        const ty = translate.y;
        const relative = new Point(o.relative || o.rx || o.relativeX, o.ry || o.relativeY);
        const rx = relative.x;
        const ry = relative.y;

        // Populate all of the values
        return {
          scaleX, scaleY, skewX, skewY, shear, theta, rx, ry, tx, ty, ox, oy, px, py
        }
      }

      static fromArray (a) {
        return { a: a[0], b: a[1], c: a[2], d: a[3], e: a[4], f: a[5] }
      }

      static isMatrixLike (o) {
        return (
          o.a != null
          || o.b != null
          || o.c != null
          || o.d != null
          || o.e != null
          || o.f != null
        )
      }

      // left matrix, right matrix, target matrix which is overwritten
      static matrixMultiply (l, r, o) {
        // Work out the product directly
        const a = l.a * r.a + l.c * r.b;
        const b = l.b * r.a + l.d * r.b;
        const c = l.a * r.c + l.c * r.d;
        const d = l.b * r.c + l.d * r.d;
        const e = l.e + l.a * r.e + l.c * r.f;
        const f = l.f + l.b * r.e + l.d * r.f;

        // make sure to use local variables because l/r and o could be the same
        o.a = a;
        o.b = b;
        o.c = c;
        o.d = d;
        o.e = e;
        o.f = f;

        return o
      }

      around (cx, cy, matrix) {
        return this.clone().aroundO(cx, cy, matrix)
      }

      // Transform around a center point
      aroundO (cx, cy, matrix) {
        const dx = cx || 0;
        const dy = cy || 0;
        return this.translateO(-dx, -dy).lmultiplyO(matrix).translateO(dx, dy)
      }

      // Clones this matrix
      clone () {
        return new Matrix(this)
      }

      // Decomposes this matrix into its affine parameters
      decompose (cx = 0, cy = 0) {
        // Get the parameters from the matrix
        const a = this.a;
        const b = this.b;
        const c = this.c;
        const d = this.d;
        const e = this.e;
        const f = this.f;

        // Figure out if the winding direction is clockwise or counterclockwise
        const determinant = a * d - b * c;
        const ccw = determinant > 0 ? 1 : -1;

        // Since we only shear in x, we can use the x basis to get the x scale
        // and the rotation of the resulting matrix
        const sx = ccw * Math.sqrt(a * a + b * b);
        const thetaRad = Math.atan2(ccw * b, ccw * a);
        const theta = 180 / Math.PI * thetaRad;
        const ct = Math.cos(thetaRad);
        const st = Math.sin(thetaRad);

        // We can then solve the y basis vector simultaneously to get the other
        // two affine parameters directly from these parameters
        const lam = (a * c + b * d) / determinant;
        const sy = ((c * sx) / (lam * a - b)) || ((d * sx) / (lam * b + a));

        // Use the translations
        const tx = e - cx + cx * ct * sx + cy * (lam * ct * sx - st * sy);
        const ty = f - cy + cx * st * sx + cy * (lam * st * sx + ct * sy);

        // Construct the decomposition and return it
        return {
          // Return the affine parameters
          scaleX: sx,
          scaleY: sy,
          shear: lam,
          rotate: theta,
          translateX: tx,
          translateY: ty,
          originX: cx,
          originY: cy,

          // Return the matrix parameters
          a: this.a,
          b: this.b,
          c: this.c,
          d: this.d,
          e: this.e,
          f: this.f
        }
      }

      // Check if two matrices are equal
      equals (other) {
        if (other === this) return true
        const comp = new Matrix(other);
        return closeEnough(this.a, comp.a) && closeEnough(this.b, comp.b)
          && closeEnough(this.c, comp.c) && closeEnough(this.d, comp.d)
          && closeEnough(this.e, comp.e) && closeEnough(this.f, comp.f)
      }

      // Flip matrix on x or y, at a given offset
      flip (axis, around) {
        return this.clone().flipO(axis, around)
      }

      flipO (axis, around) {
        return axis === 'x'
          ? this.scaleO(-1, 1, around, 0)
          : axis === 'y'
            ? this.scaleO(1, -1, 0, around)
            : this.scaleO(-1, -1, axis, around || axis) // Define an x, y flip point
      }

      // Initialize
      init (source) {
        const base = Matrix.fromArray([ 1, 0, 0, 1, 0, 0 ]);

        // ensure source as object
        source = source instanceof Element
          ? source.matrixify()
          : typeof source === 'string'
            ? Matrix.fromArray(source.split(delimiter).map(parseFloat))
            : Array.isArray(source)
              ? Matrix.fromArray(source)
              : (typeof source === 'object' && Matrix.isMatrixLike(source))
                ? source
                : (typeof source === 'object')
                  ? new Matrix().transform(source)
                  : arguments.length === 6
                    ? Matrix.fromArray([].slice.call(arguments))
                    : base;

        // Merge the source matrix with the base matrix
        this.a = source.a != null ? source.a : base.a;
        this.b = source.b != null ? source.b : base.b;
        this.c = source.c != null ? source.c : base.c;
        this.d = source.d != null ? source.d : base.d;
        this.e = source.e != null ? source.e : base.e;
        this.f = source.f != null ? source.f : base.f;

        return this
      }

      inverse () {
        return this.clone().inverseO()
      }

      // Inverses matrix
      inverseO () {
        // Get the current parameters out of the matrix
        const a = this.a;
        const b = this.b;
        const c = this.c;
        const d = this.d;
        const e = this.e;
        const f = this.f;

        // Invert the 2x2 matrix in the top left
        const det = a * d - b * c;
        if (!det) throw new Error('Cannot invert ' + this)

        // Calculate the top 2x2 matrix
        const na = d / det;
        const nb = -b / det;
        const nc = -c / det;
        const nd = a / det;

        // Apply the inverted matrix to the top right
        const ne = -(na * e + nc * f);
        const nf = -(nb * e + nd * f);

        // Construct the inverted matrix
        this.a = na;
        this.b = nb;
        this.c = nc;
        this.d = nd;
        this.e = ne;
        this.f = nf;

        return this
      }

      lmultiply (matrix) {
        return this.clone().lmultiplyO(matrix)
      }

      lmultiplyO (matrix) {
        const r = this;
        const l = matrix instanceof Matrix
          ? matrix
          : new Matrix(matrix);

        return Matrix.matrixMultiply(l, r, this)
      }

      // Left multiplies by the given matrix
      multiply (matrix) {
        return this.clone().multiplyO(matrix)
      }

      multiplyO (matrix) {
        // Get the matrices
        const l = this;
        const r = matrix instanceof Matrix
          ? matrix
          : new Matrix(matrix);

        return Matrix.matrixMultiply(l, r, this)
      }

      // Rotate matrix
      rotate (r, cx, cy) {
        return this.clone().rotateO(r, cx, cy)
      }

      rotateO (r, cx = 0, cy = 0) {
        // Convert degrees to radians
        r = radians(r);

        const cos = Math.cos(r);
        const sin = Math.sin(r);

        const { a, b, c, d, e, f } = this;

        this.a = a * cos - b * sin;
        this.b = b * cos + a * sin;
        this.c = c * cos - d * sin;
        this.d = d * cos + c * sin;
        this.e = e * cos - f * sin + cy * sin - cx * cos + cx;
        this.f = f * cos + e * sin - cx * sin - cy * cos + cy;

        return this
      }

      // Scale matrix
      scale (x, y, cx, cy) {
        return this.clone().scaleO(...arguments)
      }

      scaleO (x, y = x, cx = 0, cy = 0) {
        // Support uniform scaling
        if (arguments.length === 3) {
          cy = cx;
          cx = y;
          y = x;
        }

        const { a, b, c, d, e, f } = this;

        this.a = a * x;
        this.b = b * y;
        this.c = c * x;
        this.d = d * y;
        this.e = e * x - cx * x + cx;
        this.f = f * y - cy * y + cy;

        return this
      }

      // Shear matrix
      shear (a, cx, cy) {
        return this.clone().shearO(a, cx, cy)
      }

      shearO (lx, cx = 0, cy = 0) {
        const { a, b, c, d, e, f } = this;

        this.a = a + b * lx;
        this.c = c + d * lx;
        this.e = e + f * lx - cy * lx;

        return this
      }

      // Skew Matrix
      skew (x, y, cx, cy) {
        return this.clone().skewO(...arguments)
      }

      skewO (x, y = x, cx = 0, cy = 0) {
        // support uniformal skew
        if (arguments.length === 3) {
          cy = cx;
          cx = y;
          y = x;
        }

        // Convert degrees to radians
        x = radians(x);
        y = radians(y);

        const lx = Math.tan(x);
        const ly = Math.tan(y);

        const { a, b, c, d, e, f } = this;

        this.a = a + b * lx;
        this.b = b + a * ly;
        this.c = c + d * lx;
        this.d = d + c * ly;
        this.e = e + f * lx - cy * lx;
        this.f = f + e * ly - cx * ly;

        return this
      }

      // SkewX
      skewX (x, cx, cy) {
        return this.skew(x, 0, cx, cy)
      }

      // SkewY
      skewY (y, cx, cy) {
        return this.skew(0, y, cx, cy)
      }

      toArray () {
        return [ this.a, this.b, this.c, this.d, this.e, this.f ]
      }

      // Convert matrix to string
      toString () {
        return 'matrix(' + this.a + ',' + this.b + ',' + this.c + ',' + this.d + ',' + this.e + ',' + this.f + ')'
      }

      // Transform a matrix into another matrix by manipulating the space
      transform (o) {
        // Check if o is a matrix and then left multiply it directly
        if (Matrix.isMatrixLike(o)) {
          const matrix = new Matrix(o);
          return matrix.multiplyO(this)
        }

        // Get the proposed transformations and the current transformations
        const t = Matrix.formatTransforms(o);
        const current = this;
        const { x: ox, y: oy } = new Point(t.ox, t.oy).transform(current);

        // Construct the resulting matrix
        const transformer = new Matrix()
          .translateO(t.rx, t.ry)
          .lmultiplyO(current)
          .translateO(-ox, -oy)
          .scaleO(t.scaleX, t.scaleY)
          .skewO(t.skewX, t.skewY)
          .shearO(t.shear)
          .rotateO(t.theta)
          .translateO(ox, oy);

        // If we want the origin at a particular place, we force it there
        if (isFinite(t.px) || isFinite(t.py)) {
          const origin = new Point(ox, oy).transform(transformer);
          // TODO: Replace t.px with isFinite(t.px)
          // Doesnt work because t.px is also 0 if it wasnt passed
          const dx = isFinite(t.px) ? t.px - origin.x : 0;
          const dy = isFinite(t.py) ? t.py - origin.y : 0;
          transformer.translateO(dx, dy);
        }

        // Translate now after positioning
        transformer.translateO(t.tx, t.ty);
        return transformer
      }

      // Translate matrix
      translate (x, y) {
        return this.clone().translateO(x, y)
      }

      translateO (x, y) {
        this.e += x || 0;
        this.f += y || 0;
        return this
      }

      valueOf () {
        return {
          a: this.a,
          b: this.b,
          c: this.c,
          d: this.d,
          e: this.e,
          f: this.f
        }
      }

    }

    function ctm () {
      return new Matrix(this.node.getCTM())
    }

    function screenCTM () {
      /* https://bugzilla.mozilla.org/show_bug.cgi?id=1344537
         This is needed because FF does not return the transformation matrix
         for the inner coordinate system when getScreenCTM() is called on nested svgs.
         However all other Browsers do that */
      if (typeof this.isRoot === 'function' && !this.isRoot()) {
        const rect = this.rect(1, 1);
        const m = rect.node.getScreenCTM();
        rect.remove();
        return new Matrix(m)
      }
      return new Matrix(this.node.getScreenCTM())
    }

    register(Matrix, 'Matrix');

    function parser () {
      // Reuse cached element if possible
      if (!parser.nodes) {
        const svg = makeInstance().size(2, 0);
        svg.node.style.cssText = [
          'opacity: 0',
          'position: absolute',
          'left: -100%',
          'top: -100%',
          'overflow: hidden'
        ].join(';');

        svg.attr('focusable', 'false');
        svg.attr('aria-hidden', 'true');

        const path = svg.path().node;

        parser.nodes = { svg, path };
      }

      if (!parser.nodes.svg.node.parentNode) {
        const b = globals.document.body || globals.document.documentElement;
        parser.nodes.svg.addTo(b);
      }

      return parser.nodes
    }

    function isNulledBox (box) {
      return !box.width && !box.height && !box.x && !box.y
    }

    function domContains (node) {
      return node === globals.document
        || (globals.document.documentElement.contains || function (node) {
          // This is IE - it does not support contains() for top-level SVGs
          while (node.parentNode) {
            node = node.parentNode;
          }
          return node === globals.document
        }).call(globals.document.documentElement, node)
    }

    class Box {
      constructor (...args) {
        this.init(...args);
      }

      addOffset () {
        // offset by window scroll position, because getBoundingClientRect changes when window is scrolled
        this.x += globals.window.pageXOffset;
        this.y += globals.window.pageYOffset;
        return new Box(this)
      }

      init (source) {
        const base = [ 0, 0, 0, 0 ];
        source = typeof source === 'string'
          ? source.split(delimiter).map(parseFloat)
          : Array.isArray(source)
            ? source
            : typeof source === 'object'
              ? [ source.left != null
                ? source.left
                : source.x, source.top != null ? source.top : source.y, source.width, source.height ]
              : arguments.length === 4
                ? [].slice.call(arguments)
                : base;

        this.x = source[0] || 0;
        this.y = source[1] || 0;
        this.width = this.w = source[2] || 0;
        this.height = this.h = source[3] || 0;

        // Add more bounding box properties
        this.x2 = this.x + this.w;
        this.y2 = this.y + this.h;
        this.cx = this.x + this.w / 2;
        this.cy = this.y + this.h / 2;

        return this
      }

      isNulled () {
        return isNulledBox(this)
      }

      // Merge rect box with another, return a new instance
      merge (box) {
        const x = Math.min(this.x, box.x);
        const y = Math.min(this.y, box.y);
        const width = Math.max(this.x + this.width, box.x + box.width) - x;
        const height = Math.max(this.y + this.height, box.y + box.height) - y;

        return new Box(x, y, width, height)
      }

      toArray () {
        return [ this.x, this.y, this.width, this.height ]
      }

      toString () {
        return this.x + ' ' + this.y + ' ' + this.width + ' ' + this.height
      }

      transform (m) {
        if (!(m instanceof Matrix)) {
          m = new Matrix(m);
        }

        let xMin = Infinity;
        let xMax = -Infinity;
        let yMin = Infinity;
        let yMax = -Infinity;

        const pts = [
          new Point(this.x, this.y),
          new Point(this.x2, this.y),
          new Point(this.x, this.y2),
          new Point(this.x2, this.y2)
        ];

        pts.forEach(function (p) {
          p = p.transform(m);
          xMin = Math.min(xMin, p.x);
          xMax = Math.max(xMax, p.x);
          yMin = Math.min(yMin, p.y);
          yMax = Math.max(yMax, p.y);
        });

        return new Box(
          xMin, yMin,
          xMax - xMin,
          yMax - yMin
        )
      }

    }

    function getBox (el, getBBoxFn, retry) {
      let box;

      try {
        // Try to get the box with the provided function
        box = getBBoxFn(el.node);

        // If the box is worthless and not even in the dom, retry
        // by throwing an error here...
        if (isNulledBox(box) && !domContains(el.node)) {
          throw new Error('Element not in the dom')
        }
      } catch (e) {
        // ... and calling the retry handler here
        box = retry(el);
      }

      return box
    }

    function bbox () {
      // Function to get bbox is getBBox()
      const getBBox = (node) => node.getBBox();

      // Take all measures so that a stupid browser renders the element
      // so we can get the bbox from it when we try again
      const retry = (el) => {
        try {
          const clone = el.clone().addTo(parser().svg).show();
          const box = clone.node.getBBox();
          clone.remove();
          return box
        } catch (e) {
          // We give up...
          throw new Error(`Getting bbox of element "${el.node.nodeName}" is not possible: ${e.toString()}`)
        }
      };

      const box = getBox(this, getBBox, retry);
      const bbox = new Box(box);

      return bbox
    }

    function rbox (el) {
      const getRBox = (node) => node.getBoundingClientRect();
      const retry = (el) => {
        // There is no point in trying tricks here because if we insert the element into the dom ourselves
        // it obviously will be at the wrong position
        throw new Error(`Getting rbox of element "${el.node.nodeName}" is not possible`)
      };

      const box = getBox(this, getRBox, retry);
      const rbox = new Box(box);

      // If an element was passed, we want the bbox in the coordinate system of that element
      if (el) {
        return rbox.transform(el.screenCTM().inverseO())
      }

      // Else we want it in absolute screen coordinates
      // Therefore we need to add the scrollOffset
      return rbox.addOffset()
    }

    // Checks whether the given point is inside the bounding box
    function inside (x, y) {
      const box = this.bbox();

      return x > box.x
        && y > box.y
        && x < box.x + box.width
        && y < box.y + box.height
    }

    registerMethods({
      viewbox: {
        viewbox (x, y, width, height) {
          // act as getter
          if (x == null) return new Box(this.attr('viewBox'))

          // act as setter
          return this.attr('viewBox', new Box(x, y, width, height))
        },

        zoom (level, point) {
          // Its best to rely on the attributes here and here is why:
          // clientXYZ: Doesn't work on non-root svgs because they dont have a CSSBox (silly!)
          // getBoundingClientRect: Doesn't work because Chrome just ignores width and height of nested svgs completely
          //                        that means, their clientRect is always as big as the content.
          //                        Furthermore this size is incorrect if the element is further transformed by its parents
          // computedStyle: Only returns meaningful values if css was used with px. We dont go this route here!
          // getBBox: returns the bounding box of its content - that doesnt help!
          let { width, height } = this.attr([ 'width', 'height' ]);

          // Width and height is a string when a number with a unit is present which we can't use
          // So we try clientXYZ
          if ((!width && !height) || (typeof width === 'string' || typeof height === 'string')) {
            width = this.node.clientWidth;
            height = this.node.clientHeight;
          }

          // Giving up...
          if (!width || !height) {
            throw new Error('Impossible to get absolute width and height. Please provide an absolute width and height attribute on the zooming element')
          }

          const v = this.viewbox();

          const zoomX = width / v.width;
          const zoomY = height / v.height;
          const zoom = Math.min(zoomX, zoomY);

          if (level == null) {
            return zoom
          }

          let zoomAmount = zoom / level;

          // Set the zoomAmount to the highest value which is safe to process and recover from
          // The * 100 is a bit of wiggle room for the matrix transformation
          if (zoomAmount === Infinity) zoomAmount = Number.MAX_SAFE_INTEGER / 100;

          point = point || new Point(width / 2 / zoomX + v.x, height / 2 / zoomY + v.y);

          const box = new Box(v).transform(
            new Matrix({ scale: zoomAmount, origin: point })
          );

          return this.viewbox(box)
        }
      }
    });

    register(Box, 'Box');

    // import { subClassArray } from './ArrayPolyfill.js'

    class List extends Array {
      constructor (arr = [], ...args) {
        super(arr, ...args);
        if (typeof arr === 'number') return this
        this.length = 0;
        this.push(...arr);
      }
    }

    extend$1([ List ], {
      each (fnOrMethodName, ...args) {
        if (typeof fnOrMethodName === 'function') {
          return this.map((el, i, arr) => {
            return fnOrMethodName.call(el, el, i, arr)
          })
        } else {
          return this.map(el => {
            return el[fnOrMethodName](...args)
          })
        }
      },

      toArray () {
        return Array.prototype.concat.apply([], this)
      }
    });

    const reserved = [ 'toArray', 'constructor', 'each' ];

    List.extend = function (methods) {
      methods = methods.reduce((obj, name) => {
        // Don't overwrite own methods
        if (reserved.includes(name)) return obj

        // Don't add private methods
        if (name[0] === '_') return obj

        // Relay every call to each()
        obj[name] = function (...attrs) {
          return this.each(name, ...attrs)
        };
        return obj
      }, {});

      extend$1([ List ], methods);
    };

    function baseFind (query, parent) {
      return new List(map((parent || globals.document).querySelectorAll(query), function (node) {
        return adopt(node)
      }))
    }

    // Scoped find method
    function find (query) {
      return baseFind(query, this.node)
    }

    function findOne (query) {
      return adopt(this.node.querySelector(query))
    }

    let listenerId = 0;
    const windowEvents = {};

    function getEvents (instance) {
      let n = instance.getEventHolder();

      // We dont want to save events in global space
      if (n === globals.window) n = windowEvents;
      if (!n.events) n.events = {};
      return n.events
    }

    function getEventTarget (instance) {
      return instance.getEventTarget()
    }

    function clearEvents (instance) {
      let n = instance.getEventHolder();
      if (n === globals.window) n = windowEvents;
      if (n.events) n.events = {};
    }

    // Add event binder in the SVG namespace
    function on (node, events, listener, binding, options) {
      const l = listener.bind(binding || node);
      const instance = makeInstance(node);
      const bag = getEvents(instance);
      const n = getEventTarget(instance);

      // events can be an array of events or a string of events
      events = Array.isArray(events) ? events : events.split(delimiter);

      // add id to listener
      if (!listener._svgjsListenerId) {
        listener._svgjsListenerId = ++listenerId;
      }

      events.forEach(function (event) {
        const ev = event.split('.')[0];
        const ns = event.split('.')[1] || '*';

        // ensure valid object
        bag[ev] = bag[ev] || {};
        bag[ev][ns] = bag[ev][ns] || {};

        // reference listener
        bag[ev][ns][listener._svgjsListenerId] = l;

        // add listener
        n.addEventListener(ev, l, options || false);
      });
    }

    // Add event unbinder in the SVG namespace
    function off (node, events, listener, options) {
      const instance = makeInstance(node);
      const bag = getEvents(instance);
      const n = getEventTarget(instance);

      // listener can be a function or a number
      if (typeof listener === 'function') {
        listener = listener._svgjsListenerId;
        if (!listener) return
      }

      // events can be an array of events or a string or undefined
      events = Array.isArray(events) ? events : (events || '').split(delimiter);

      events.forEach(function (event) {
        const ev = event && event.split('.')[0];
        const ns = event && event.split('.')[1];
        let namespace, l;

        if (listener) {
          // remove listener reference
          if (bag[ev] && bag[ev][ns || '*']) {
            // removeListener
            n.removeEventListener(ev, bag[ev][ns || '*'][listener], options || false);

            delete bag[ev][ns || '*'][listener];
          }
        } else if (ev && ns) {
          // remove all listeners for a namespaced event
          if (bag[ev] && bag[ev][ns]) {
            for (l in bag[ev][ns]) {
              off(n, [ ev, ns ].join('.'), l);
            }

            delete bag[ev][ns];
          }
        } else if (ns) {
          // remove all listeners for a specific namespace
          for (event in bag) {
            for (namespace in bag[event]) {
              if (ns === namespace) {
                off(n, [ event, ns ].join('.'));
              }
            }
          }
        } else if (ev) {
          // remove all listeners for the event
          if (bag[ev]) {
            for (namespace in bag[ev]) {
              off(n, [ ev, namespace ].join('.'));
            }

            delete bag[ev];
          }
        } else {
          // remove all listeners on a given node
          for (event in bag) {
            off(n, event);
          }

          clearEvents(instance);
        }
      });
    }

    function dispatch (node, event, data, options) {
      const n = getEventTarget(node);

      // Dispatch event
      if (event instanceof globals.window.Event) {
        n.dispatchEvent(event);
      } else {
        event = new globals.window.CustomEvent(event, { detail: data, cancelable: true, ...options });
        n.dispatchEvent(event);
      }
      return event
    }

    class EventTarget extends Base {
      addEventListener () {}

      dispatch (event, data, options) {
        return dispatch(this, event, data, options)
      }

      dispatchEvent (event) {
        const bag = this.getEventHolder().events;
        if (!bag) return true

        const events = bag[event.type];

        for (const i in events) {
          for (const j in events[i]) {
            events[i][j](event);
          }
        }

        return !event.defaultPrevented
      }

      // Fire given event
      fire (event, data, options) {
        this.dispatch(event, data, options);
        return this
      }

      getEventHolder () {
        return this
      }

      getEventTarget () {
        return this
      }

      // Unbind event from listener
      off (event, listener, options) {
        off(this, event, listener, options);
        return this
      }

      // Bind given event to listener
      on (event, listener, binding, options) {
        on(this, event, listener, binding, options);
        return this
      }

      removeEventListener () {}
    }

    register(EventTarget, 'EventTarget');

    function noop () {}

    // Default animation values
    const timeline = {
      duration: 400,
      ease: '>',
      delay: 0
    };

    // Default attribute values
    const attrs = {

      // fill and stroke
      'fill-opacity': 1,
      'stroke-opacity': 1,
      'stroke-width': 0,
      'stroke-linejoin': 'miter',
      'stroke-linecap': 'butt',
      fill: '#000000',
      stroke: '#000000',
      opacity: 1,

      // position
      x: 0,
      y: 0,
      cx: 0,
      cy: 0,

      // size
      width: 0,
      height: 0,

      // radius
      r: 0,
      rx: 0,
      ry: 0,

      // gradient
      offset: 0,
      'stop-opacity': 1,
      'stop-color': '#000000',

      // text
      'text-anchor': 'start'
    };

    class SVGArray extends Array {
      constructor (...args) {
        super(...args);
        this.init(...args);
      }

      clone () {
        return new this.constructor(this)
      }

      init (arr) {
        // This catches the case, that native map tries to create an array with new Array(1)
        if (typeof arr === 'number') return this
        this.length = 0;
        this.push(...this.parse(arr));
        return this
      }

      // Parse whitespace separated string
      parse (array = []) {
        // If already is an array, no need to parse it
        if (array instanceof Array) return array

        return array.trim().split(delimiter).map(parseFloat)
      }

      toArray () {
        return Array.prototype.concat.apply([], this)
      }

      toSet () {
        return new Set(this)
      }

      toString () {
        return this.join(' ')
      }

      // Flattens the array if needed
      valueOf () {
        const ret = [];
        ret.push(...this);
        return ret
      }

    }

    // Module for unit conversions
    class SVGNumber {
      // Initialize
      constructor (...args) {
        this.init(...args);
      }

      convert (unit) {
        return new SVGNumber(this.value, unit)
      }

      // Divide number
      divide (number) {
        number = new SVGNumber(number);
        return new SVGNumber(this / number, this.unit || number.unit)
      }

      init (value, unit) {
        unit = Array.isArray(value) ? value[1] : unit;
        value = Array.isArray(value) ? value[0] : value;

        // initialize defaults
        this.value = 0;
        this.unit = unit || '';

        // parse value
        if (typeof value === 'number') {
          // ensure a valid numeric value
          this.value = isNaN(value) ? 0 : !isFinite(value) ? (value < 0 ? -3.4e+38 : +3.4e+38) : value;
        } else if (typeof value === 'string') {
          unit = value.match(numberAndUnit);

          if (unit) {
            // make value numeric
            this.value = parseFloat(unit[1]);

            // normalize
            if (unit[5] === '%') {
              this.value /= 100;
            } else if (unit[5] === 's') {
              this.value *= 1000;
            }

            // store unit
            this.unit = unit[5];
          }
        } else {
          if (value instanceof SVGNumber) {
            this.value = value.valueOf();
            this.unit = value.unit;
          }
        }

        return this
      }

      // Subtract number
      minus (number) {
        number = new SVGNumber(number);
        return new SVGNumber(this - number, this.unit || number.unit)
      }

      // Add number
      plus (number) {
        number = new SVGNumber(number);
        return new SVGNumber(this + number, this.unit || number.unit)
      }

      // Multiply number
      times (number) {
        number = new SVGNumber(number);
        return new SVGNumber(this * number, this.unit || number.unit)
      }

      toArray () {
        return [ this.value, this.unit ]
      }

      toJSON () {
        return this.toString()
      }

      toString () {
        return (this.unit === '%'
          ? ~~(this.value * 1e8) / 1e6
          : this.unit === 's'
            ? this.value / 1e3
            : this.value
        ) + this.unit
      }

      valueOf () {
        return this.value
      }

    }

    const hooks = [];
    function registerAttrHook (fn) {
      hooks.push(fn);
    }

    // Set svg element attribute
    function attr (attr, val, ns) {
      // act as full getter
      if (attr == null) {
        // get an object of attributes
        attr = {};
        val = this.node.attributes;

        for (const node of val) {
          attr[node.nodeName] = isNumber.test(node.nodeValue)
            ? parseFloat(node.nodeValue)
            : node.nodeValue;
        }

        return attr
      } else if (attr instanceof Array) {
        // loop through array and get all values
        return attr.reduce((last, curr) => {
          last[curr] = this.attr(curr);
          return last
        }, {})
      } else if (typeof attr === 'object' && attr.constructor === Object) {
        // apply every attribute individually if an object is passed
        for (val in attr) this.attr(val, attr[val]);
      } else if (val === null) {
        // remove value
        this.node.removeAttribute(attr);
      } else if (val == null) {
        // act as a getter if the first and only argument is not an object
        val = this.node.getAttribute(attr);
        return val == null
          ? attrs[attr]
          : isNumber.test(val)
            ? parseFloat(val)
            : val
      } else {
        // Loop through hooks and execute them to convert value
        val = hooks.reduce((_val, hook) => {
          return hook(attr, _val, this)
        }, val);

        // ensure correct numeric values (also accepts NaN and Infinity)
        if (typeof val === 'number') {
          val = new SVGNumber(val);
        } else if (Color.isColor(val)) {
          // ensure full hex color
          val = new Color(val);
        } else if (val.constructor === Array) {
          // Check for plain arrays and parse array values
          val = new SVGArray(val);
        }

        // if the passed attribute is leading...
        if (attr === 'leading') {
          // ... call the leading method instead
          if (this.leading) {
            this.leading(val);
          }
        } else {
          // set given attribute on node
          typeof ns === 'string'
            ? this.node.setAttributeNS(ns, attr, val.toString())
            : this.node.setAttribute(attr, val.toString());
        }

        // rebuild if required
        if (this.rebuild && (attr === 'font-size' || attr === 'x')) {
          this.rebuild();
        }
      }

      return this
    }

    class Dom extends EventTarget {
      constructor (node, attrs) {
        super();
        this.node = node;
        this.type = node.nodeName;

        if (attrs && node !== attrs) {
          this.attr(attrs);
        }
      }

      // Add given element at a position
      add (element, i) {
        element = makeInstance(element);

        // If non-root svg nodes are added we have to remove their namespaces
        if (element.removeNamespace && this.node instanceof globals.window.SVGElement) {
          element.removeNamespace();
        }

        if (i == null) {
          this.node.appendChild(element.node);
        } else if (element.node !== this.node.childNodes[i]) {
          this.node.insertBefore(element.node, this.node.childNodes[i]);
        }

        return this
      }

      // Add element to given container and return self
      addTo (parent, i) {
        return makeInstance(parent).put(this, i)
      }

      // Returns all child elements
      children () {
        return new List(map(this.node.children, function (node) {
          return adopt(node)
        }))
      }

      // Remove all elements in this container
      clear () {
        // remove children
        while (this.node.hasChildNodes()) {
          this.node.removeChild(this.node.lastChild);
        }

        return this
      }

      // Clone element
      clone (deep = true) {
        // write dom data to the dom so the clone can pickup the data
        this.writeDataToDom();

        // clone element and assign new id
        return new this.constructor(assignNewId(this.node.cloneNode(deep)))
      }

      // Iterates over all children and invokes a given block
      each (block, deep) {
        const children = this.children();
        let i, il;

        for (i = 0, il = children.length; i < il; i++) {
          block.apply(children[i], [ i, children ]);

          if (deep) {
            children[i].each(block, deep);
          }
        }

        return this
      }

      element (nodeName, attrs) {
        return this.put(new Dom(create(nodeName), attrs))
      }

      // Get first child
      first () {
        return adopt(this.node.firstChild)
      }

      // Get a element at the given index
      get (i) {
        return adopt(this.node.childNodes[i])
      }

      getEventHolder () {
        return this.node
      }

      getEventTarget () {
        return this.node
      }

      // Checks if the given element is a child
      has (element) {
        return this.index(element) >= 0
      }

      html (htmlOrFn, outerHTML) {
        return this.xml(htmlOrFn, outerHTML, html)
      }

      // Get / set id
      id (id) {
        // generate new id if no id set
        if (typeof id === 'undefined' && !this.node.id) {
          this.node.id = eid(this.type);
        }

        // don't set directly with this.node.id to make `null` work correctly
        return this.attr('id', id)
      }

      // Gets index of given element
      index (element) {
        return [].slice.call(this.node.childNodes).indexOf(element.node)
      }

      // Get the last child
      last () {
        return adopt(this.node.lastChild)
      }

      // matches the element vs a css selector
      matches (selector) {
        const el = this.node;
        const matcher = el.matches || el.matchesSelector || el.msMatchesSelector || el.mozMatchesSelector || el.webkitMatchesSelector || el.oMatchesSelector || null;
        return matcher && matcher.call(el, selector)
      }

      // Returns the parent element instance
      parent (type) {
        let parent = this;

        // check for parent
        if (!parent.node.parentNode) return null

        // get parent element
        parent = adopt(parent.node.parentNode);

        if (!type) return parent

        // loop trough ancestors if type is given
        do {
          if (typeof type === 'string' ? parent.matches(type) : parent instanceof type) return parent
        } while ((parent = adopt(parent.node.parentNode)))

        return parent
      }

      // Basically does the same as `add()` but returns the added element instead
      put (element, i) {
        element = makeInstance(element);
        this.add(element, i);
        return element
      }

      // Add element to given container and return container
      putIn (parent, i) {
        return makeInstance(parent).add(this, i)
      }

      // Remove element
      remove () {
        if (this.parent()) {
          this.parent().removeElement(this);
        }

        return this
      }

      // Remove a given child
      removeElement (element) {
        this.node.removeChild(element.node);

        return this
      }

      // Replace this with element
      replace (element) {
        element = makeInstance(element);

        if (this.node.parentNode) {
          this.node.parentNode.replaceChild(element.node, this.node);
        }

        return element
      }

      round (precision = 2, map = null) {
        const factor = 10 ** precision;
        const attrs = this.attr(map);

        for (const i in attrs) {
          if (typeof attrs[i] === 'number') {
            attrs[i] = Math.round(attrs[i] * factor) / factor;
          }
        }

        this.attr(attrs);
        return this
      }

      // Import / Export raw svg
      svg (svgOrFn, outerSVG) {
        return this.xml(svgOrFn, outerSVG, svg)
      }

      // Return id on string conversion
      toString () {
        return this.id()
      }

      words (text) {
        // This is faster than removing all children and adding a new one
        this.node.textContent = text;
        return this
      }

      wrap (node) {
        const parent = this.parent();

        if (!parent) {
          return this.addTo(node)
        }

        const position = parent.index(this);
        return parent.put(node, position).put(this)
      }

      // write svgjs data to the dom
      writeDataToDom () {
        // dump variables recursively
        this.each(function () {
          this.writeDataToDom();
        });

        return this
      }

      // Import / Export raw svg
      xml (xmlOrFn, outerXML, ns) {
        if (typeof xmlOrFn === 'boolean') {
          ns = outerXML;
          outerXML = xmlOrFn;
          xmlOrFn = null;
        }

        // act as getter if no svg string is given
        if (xmlOrFn == null || typeof xmlOrFn === 'function') {
          // The default for exports is, that the outerNode is included
          outerXML = outerXML == null ? true : outerXML;

          // write svgjs data to the dom
          this.writeDataToDom();
          let current = this;

          // An export modifier was passed
          if (xmlOrFn != null) {
            current = adopt(current.node.cloneNode(true));

            // If the user wants outerHTML we need to process this node, too
            if (outerXML) {
              const result = xmlOrFn(current);
              current = result || current;

              // The user does not want this node? Well, then he gets nothing
              if (result === false) return ''
            }

            // Deep loop through all children and apply modifier
            current.each(function () {
              const result = xmlOrFn(this);
              const _this = result || this;

              // If modifier returns false, discard node
              if (result === false) {
                this.remove();

                // If modifier returns new node, use it
              } else if (result && this !== _this) {
                this.replace(_this);
              }
            }, true);
          }

          // Return outer or inner content
          return outerXML
            ? current.node.outerHTML
            : current.node.innerHTML
        }

        // Act as setter if we got a string

        // The default for import is, that the current node is not replaced
        outerXML = outerXML == null ? false : outerXML;

        // Create temporary holder
        const well = create('wrapper', ns);
        const fragment = globals.document.createDocumentFragment();

        // Dump raw svg
        well.innerHTML = xmlOrFn;

        // Transplant nodes into the fragment
        for (let len = well.children.length; len--;) {
          fragment.appendChild(well.firstElementChild);
        }

        const parent = this.parent();

        // Add the whole fragment at once
        return outerXML
          ? this.replace(fragment) && parent
          : this.add(fragment)
      }
    }

    extend$1(Dom, { attr, find, findOne });
    register(Dom, 'Dom');

    class Element extends Dom {
      constructor (node, attrs) {
        super(node, attrs);

        // initialize data object
        this.dom = {};

        // create circular reference
        this.node.instance = this;

        if (node.hasAttribute('svgjs:data')) {
          // pull svgjs data from the dom (getAttributeNS doesn't work in html5)
          this.setData(JSON.parse(node.getAttribute('svgjs:data')) || {});
        }
      }

      // Move element by its center
      center (x, y) {
        return this.cx(x).cy(y)
      }

      // Move by center over x-axis
      cx (x) {
        return x == null
          ? this.x() + this.width() / 2
          : this.x(x - this.width() / 2)
      }

      // Move by center over y-axis
      cy (y) {
        return y == null
          ? this.y() + this.height() / 2
          : this.y(y - this.height() / 2)
      }

      // Get defs
      defs () {
        const root = this.root();
        return root && root.defs()
      }

      // Relative move over x and y axes
      dmove (x, y) {
        return this.dx(x).dy(y)
      }

      // Relative move over x axis
      dx (x = 0) {
        return this.x(new SVGNumber(x).plus(this.x()))
      }

      // Relative move over y axis
      dy (y = 0) {
        return this.y(new SVGNumber(y).plus(this.y()))
      }

      getEventHolder () {
        return this
      }

      // Set height of element
      height (height) {
        return this.attr('height', height)
      }

      // Move element to given x and y values
      move (x, y) {
        return this.x(x).y(y)
      }

      // return array of all ancestors of given type up to the root svg
      parents (until = this.root()) {
        const isSelector = typeof until === 'string';
        if (!isSelector) {
          until = makeInstance(until);
        }
        const parents = new List();
        let parent = this;

        while (
          (parent = parent.parent())
          && parent.node !== globals.document
          && parent.nodeName !== '#document-fragment') {

          parents.push(parent);

          if (!isSelector && (parent.node === until.node)) {
            break
          }
          if (isSelector && parent.matches(until)) {
            break
          }
          if (parent.node === this.root().node) {
            // We worked our way to the root and didn't match `until`
            return null
          }
        }

        return parents
      }

      // Get referenced element form attribute value
      reference (attr) {
        attr = this.attr(attr);
        if (!attr) return null

        const m = (attr + '').match(reference);
        return m ? makeInstance(m[1]) : null
      }

      // Get parent document
      root () {
        const p = this.parent(getClass(root));
        return p && p.root()
      }

      // set given data to the elements data property
      setData (o) {
        this.dom = o;
        return this
      }

      // Set element size to given width and height
      size (width, height) {
        const p = proportionalSize(this, width, height);

        return this
          .width(new SVGNumber(p.width))
          .height(new SVGNumber(p.height))
      }

      // Set width of element
      width (width) {
        return this.attr('width', width)
      }

      // write svgjs data to the dom
      writeDataToDom () {
        // remove previously set data
        this.node.removeAttribute('svgjs:data');

        if (Object.keys(this.dom).length) {
          this.node.setAttribute('svgjs:data', JSON.stringify(this.dom)); // see #428
        }

        return super.writeDataToDom()
      }

      // Move over x-axis
      x (x) {
        return this.attr('x', x)
      }

      // Move over y-axis
      y (y) {
        return this.attr('y', y)
      }
    }

    extend$1(Element, {
      bbox, rbox, inside, point, ctm, screenCTM
    });

    register(Element, 'Element');

    // Define list of available attributes for stroke and fill
    const sugar = {
      stroke: [ 'color', 'width', 'opacity', 'linecap', 'linejoin', 'miterlimit', 'dasharray', 'dashoffset' ],
      fill: [ 'color', 'opacity', 'rule' ],
      prefix: function (t, a) {
        return a === 'color' ? t : t + '-' + a
      }
    }

    // Add sugar for fill and stroke
    ;[ 'fill', 'stroke' ].forEach(function (m) {
      const extension = {};
      let i;

      extension[m] = function (o) {
        if (typeof o === 'undefined') {
          return this.attr(m)
        }
        if (typeof o === 'string' || o instanceof Color || Color.isRgb(o) || (o instanceof Element)) {
          this.attr(m, o);
        } else {
          // set all attributes from sugar.fill and sugar.stroke list
          for (i = sugar[m].length - 1; i >= 0; i--) {
            if (o[sugar[m][i]] != null) {
              this.attr(sugar.prefix(m, sugar[m][i]), o[sugar[m][i]]);
            }
          }
        }

        return this
      };

      registerMethods([ 'Element', 'Runner' ], extension);
    });

    registerMethods([ 'Element', 'Runner' ], {
      // Let the user set the matrix directly
      matrix: function (mat, b, c, d, e, f) {
        // Act as a getter
        if (mat == null) {
          return new Matrix(this)
        }

        // Act as a setter, the user can pass a matrix or a set of numbers
        return this.attr('transform', new Matrix(mat, b, c, d, e, f))
      },

      // Map rotation to transform
      rotate: function (angle, cx, cy) {
        return this.transform({ rotate: angle, ox: cx, oy: cy }, true)
      },

      // Map skew to transform
      skew: function (x, y, cx, cy) {
        return arguments.length === 1 || arguments.length === 3
          ? this.transform({ skew: x, ox: y, oy: cx }, true)
          : this.transform({ skew: [ x, y ], ox: cx, oy: cy }, true)
      },

      shear: function (lam, cx, cy) {
        return this.transform({ shear: lam, ox: cx, oy: cy }, true)
      },

      // Map scale to transform
      scale: function (x, y, cx, cy) {
        return arguments.length === 1 || arguments.length === 3
          ? this.transform({ scale: x, ox: y, oy: cx }, true)
          : this.transform({ scale: [ x, y ], ox: cx, oy: cy }, true)
      },

      // Map translate to transform
      translate: function (x, y) {
        return this.transform({ translate: [ x, y ] }, true)
      },

      // Map relative translations to transform
      relative: function (x, y) {
        return this.transform({ relative: [ x, y ] }, true)
      },

      // Map flip to transform
      flip: function (direction = 'both', origin = 'center') {
        if ('xybothtrue'.indexOf(direction) === -1) {
          origin = direction;
          direction = 'both';
        }

        return this.transform({ flip: direction, origin: origin }, true)
      },

      // Opacity
      opacity: function (value) {
        return this.attr('opacity', value)
      }
    });

    registerMethods('radius', {
      // Add x and y radius
      radius: function (x, y = x) {
        const type = (this._element || this).type;
        return type === 'radialGradient'
          ? this.attr('r', new SVGNumber(x))
          : this.rx(x).ry(y)
      }
    });

    registerMethods('Path', {
      // Get path length
      length: function () {
        return this.node.getTotalLength()
      },
      // Get point at length
      pointAt: function (length) {
        return new Point(this.node.getPointAtLength(length))
      }
    });

    registerMethods([ 'Element', 'Runner' ], {
      // Set font
      font: function (a, v) {
        if (typeof a === 'object') {
          for (v in a) this.font(v, a[v]);
          return this
        }

        return a === 'leading'
          ? this.leading(v)
          : a === 'anchor'
            ? this.attr('text-anchor', v)
            : a === 'size' || a === 'family' || a === 'weight' || a === 'stretch' || a === 'variant' || a === 'style'
              ? this.attr('font-' + a, v)
              : this.attr(a, v)
      }
    });

    // Add events to elements
    const methods = [ 'click',
      'dblclick',
      'mousedown',
      'mouseup',
      'mouseover',
      'mouseout',
      'mousemove',
      'mouseenter',
      'mouseleave',
      'touchstart',
      'touchmove',
      'touchleave',
      'touchend',
      'touchcancel' ].reduce(function (last, event) {
      // add event to Element
      const fn = function (f) {
        if (f === null) {
          this.off(event);
        } else {
          this.on(event, f);
        }
        return this
      };

      last[event] = fn;
      return last
    }, {});

    registerMethods('Element', methods);

    // Reset all transformations
    function untransform () {
      return this.attr('transform', null)
    }

    // merge the whole transformation chain into one matrix and returns it
    function matrixify () {
      const matrix = (this.attr('transform') || '')
        // split transformations
        .split(transforms).slice(0, -1).map(function (str) {
          // generate key => value pairs
          const kv = str.trim().split('(');
          return [ kv[0],
            kv[1].split(delimiter)
              .map(function (str) {
                return parseFloat(str)
              })
          ]
        })
        .reverse()
        // merge every transformation into one matrix
        .reduce(function (matrix, transform) {
          if (transform[0] === 'matrix') {
            return matrix.lmultiply(Matrix.fromArray(transform[1]))
          }
          return matrix[transform[0]].apply(matrix, transform[1])
        }, new Matrix());

      return matrix
    }

    // add an element to another parent without changing the visual representation on the screen
    function toParent (parent, i) {
      if (this === parent) return this
      const ctm = this.screenCTM();
      const pCtm = parent.screenCTM().inverse();

      this.addTo(parent, i).untransform().transform(pCtm.multiply(ctm));

      return this
    }

    // same as above with parent equals root-svg
    function toRoot (i) {
      return this.toParent(this.root(), i)
    }

    // Add transformations
    function transform (o, relative) {
      // Act as a getter if no object was passed
      if (o == null || typeof o === 'string') {
        const decomposed = new Matrix(this).decompose();
        return o == null ? decomposed : decomposed[o]
      }

      if (!Matrix.isMatrixLike(o)) {
        // Set the origin according to the defined transform
        o = { ...o, origin: getOrigin(o, this) };
      }

      // The user can pass a boolean, an Element or an Matrix or nothing
      const cleanRelative = relative === true ? this : (relative || false);
      const result = new Matrix(cleanRelative).transform(o);
      return this.attr('transform', result)
    }

    registerMethods('Element', {
      untransform, matrixify, toParent, toRoot, transform
    });

    class Container extends Element {
      flatten (parent = this, index) {
        this.each(function () {
          if (this instanceof Container) {
            return this.flatten().ungroup()
          }
        });

        return this
      }

      ungroup (parent = this.parent(), index = parent.index(this)) {
        // when parent != this, we want append all elements to the end
        index = index === -1 ? parent.children().length : index;

        this.each(function (i, children) {
          // reverse each
          return children[children.length - i - 1].toParent(parent, index)
        });

        return this.remove()
      }
    }

    register(Container, 'Container');

    class Defs extends Container {
      constructor (node, attrs = node) {
        super(nodeOrNew('defs', node), attrs);
      }

      flatten () {
        return this
      }

      ungroup () {
        return this
      }
    }

    register(Defs, 'Defs');

    class Shape extends Element {}

    register(Shape, 'Shape');

    // Radius x value
    function rx (rx) {
      return this.attr('rx', rx)
    }

    // Radius y value
    function ry (ry) {
      return this.attr('ry', ry)
    }

    // Move over x-axis
    function x$3 (x) {
      return x == null
        ? this.cx() - this.rx()
        : this.cx(x + this.rx())
    }

    // Move over y-axis
    function y$3 (y) {
      return y == null
        ? this.cy() - this.ry()
        : this.cy(y + this.ry())
    }

    // Move by center over x-axis
    function cx$1 (x) {
      return this.attr('cx', x)
    }

    // Move by center over y-axis
    function cy$1 (y) {
      return this.attr('cy', y)
    }

    // Set width of element
    function width$2 (width) {
      return width == null
        ? this.rx() * 2
        : this.rx(new SVGNumber(width).divide(2))
    }

    // Set height of element
    function height$2 (height) {
      return height == null
        ? this.ry() * 2
        : this.ry(new SVGNumber(height).divide(2))
    }

    var circled = /*#__PURE__*/Object.freeze({
        __proto__: null,
        rx: rx,
        ry: ry,
        x: x$3,
        y: y$3,
        cx: cx$1,
        cy: cy$1,
        width: width$2,
        height: height$2
    });

    class Ellipse extends Shape {
      constructor (node, attrs = node) {
        super(nodeOrNew('ellipse', node), attrs);
      }

      size (width, height) {
        const p = proportionalSize(this, width, height);

        return this
          .rx(new SVGNumber(p.width).divide(2))
          .ry(new SVGNumber(p.height).divide(2))
      }
    }

    extend$1(Ellipse, circled);

    registerMethods('Container', {
      // Create an ellipse
      ellipse: wrapWithAttrCheck(function (width = 0, height = width) {
        return this.put(new Ellipse()).size(width, height).move(0, 0)
      })
    });

    register(Ellipse, 'Ellipse');

    class Fragment extends Dom {
      constructor (node = globals.document.createDocumentFragment()) {
        super(node);
      }

      // Import / Export raw xml
      xml (xmlOrFn, outerXML, ns) {
        if (typeof xmlOrFn === 'boolean') {
          ns = outerXML;
          outerXML = xmlOrFn;
          xmlOrFn = null;
        }

        // because this is a fragment we have to put all elements into a wrapper first
        // before we can get the innerXML from it
        if (xmlOrFn == null || typeof xmlOrFn === 'function') {
          const wrapper = new Dom(create('wrapper', ns));
          wrapper.add(this.node.cloneNode(true));

          return wrapper.xml(false, ns)
        }

        // Act as setter if we got a string
        return super.xml(xmlOrFn, false, ns)
      }

    }

    register(Fragment, 'Fragment');

    function from (x, y) {
      return (this._element || this).type === 'radialGradient'
        ? this.attr({ fx: new SVGNumber(x), fy: new SVGNumber(y) })
        : this.attr({ x1: new SVGNumber(x), y1: new SVGNumber(y) })
    }

    function to (x, y) {
      return (this._element || this).type === 'radialGradient'
        ? this.attr({ cx: new SVGNumber(x), cy: new SVGNumber(y) })
        : this.attr({ x2: new SVGNumber(x), y2: new SVGNumber(y) })
    }

    var gradiented = /*#__PURE__*/Object.freeze({
        __proto__: null,
        from: from,
        to: to
    });

    class Gradient extends Container {
      constructor (type, attrs) {
        super(
          nodeOrNew(type + 'Gradient', typeof type === 'string' ? null : type),
          attrs
        );
      }

      // custom attr to handle transform
      attr (a, b, c) {
        if (a === 'transform') a = 'gradientTransform';
        return super.attr(a, b, c)
      }

      bbox () {
        return new Box()
      }

      targets () {
        return baseFind('svg [fill*="' + this.id() + '"]')
      }

      // Alias string conversion to fill
      toString () {
        return this.url()
      }

      // Update gradient
      update (block) {
        // remove all stops
        this.clear();

        // invoke passed block
        if (typeof block === 'function') {
          block.call(this, this);
        }

        return this
      }

      // Return the fill id
      url () {
        return 'url("#' + this.id() + '")'
      }
    }

    extend$1(Gradient, gradiented);

    registerMethods({
      Container: {
        // Create gradient element in defs
        gradient (...args) {
          return this.defs().gradient(...args)
        }
      },
      // define gradient
      Defs: {
        gradient: wrapWithAttrCheck(function (type, block) {
          return this.put(new Gradient(type)).update(block)
        })
      }
    });

    register(Gradient, 'Gradient');

    class Pattern extends Container {
      // Initialize node
      constructor (node, attrs = node) {
        super(nodeOrNew('pattern', node), attrs);
      }

      // custom attr to handle transform
      attr (a, b, c) {
        if (a === 'transform') a = 'patternTransform';
        return super.attr(a, b, c)
      }

      bbox () {
        return new Box()
      }

      targets () {
        return baseFind('svg [fill*="' + this.id() + '"]')
      }

      // Alias string conversion to fill
      toString () {
        return this.url()
      }

      // Update pattern by rebuilding
      update (block) {
        // remove content
        this.clear();

        // invoke passed block
        if (typeof block === 'function') {
          block.call(this, this);
        }

        return this
      }

      // Return the fill id
      url () {
        return 'url("#' + this.id() + '")'
      }

    }

    registerMethods({
      Container: {
        // Create pattern element in defs
        pattern (...args) {
          return this.defs().pattern(...args)
        }
      },
      Defs: {
        pattern: wrapWithAttrCheck(function (width, height, block) {
          return this.put(new Pattern()).update(block).attr({
            x: 0,
            y: 0,
            width: width,
            height: height,
            patternUnits: 'userSpaceOnUse'
          })
        })
      }
    });

    register(Pattern, 'Pattern');

    class Image extends Shape {
      constructor (node, attrs = node) {
        super(nodeOrNew('image', node), attrs);
      }

      // (re)load image
      load (url, callback) {
        if (!url) return this

        const img = new globals.window.Image();

        on(img, 'load', function (e) {
          const p = this.parent(Pattern);

          // ensure image size
          if (this.width() === 0 && this.height() === 0) {
            this.size(img.width, img.height);
          }

          if (p instanceof Pattern) {
            // ensure pattern size if not set
            if (p.width() === 0 && p.height() === 0) {
              p.size(this.width(), this.height());
            }
          }

          if (typeof callback === 'function') {
            callback.call(this, e);
          }
        }, this);

        on(img, 'load error', function () {
          // dont forget to unbind memory leaking events
          off(img);
        });

        return this.attr('href', (img.src = url), xlink)
      }
    }

    registerAttrHook(function (attr, val, _this) {
      // convert image fill and stroke to patterns
      if (attr === 'fill' || attr === 'stroke') {
        if (isImage.test(val)) {
          val = _this.root().defs().image(val);
        }
      }

      if (val instanceof Image) {
        val = _this.root().defs().pattern(0, 0, (pattern) => {
          pattern.add(val);
        });
      }

      return val
    });

    registerMethods({
      Container: {
        // create image element, load image and set its size
        image: wrapWithAttrCheck(function (source, callback) {
          return this.put(new Image()).size(0, 0).load(source, callback)
        })
      }
    });

    register(Image, 'Image');

    class PointArray extends SVGArray {
      // Get bounding box of points
      bbox () {
        let maxX = -Infinity;
        let maxY = -Infinity;
        let minX = Infinity;
        let minY = Infinity;
        this.forEach(function (el) {
          maxX = Math.max(el[0], maxX);
          maxY = Math.max(el[1], maxY);
          minX = Math.min(el[0], minX);
          minY = Math.min(el[1], minY);
        });
        return new Box(minX, minY, maxX - minX, maxY - minY)
      }

      // Move point string
      move (x, y) {
        const box = this.bbox();

        // get relative offset
        x -= box.x;
        y -= box.y;

        // move every point
        if (!isNaN(x) && !isNaN(y)) {
          for (let i = this.length - 1; i >= 0; i--) {
            this[i] = [ this[i][0] + x, this[i][1] + y ];
          }
        }

        return this
      }

      // Parse point string and flat array
      parse (array = [ 0, 0 ]) {
        const points = [];

        // if it is an array, we flatten it and therefore clone it to 1 depths
        if (array instanceof Array) {
          array = Array.prototype.concat.apply([], array);
        } else { // Else, it is considered as a string
          // parse points
          array = array.trim().split(delimiter).map(parseFloat);
        }

        // validate points - https://svgwg.org/svg2-draft/shapes.html#DataTypePoints
        // Odd number of coordinates is an error. In such cases, drop the last odd coordinate.
        if (array.length % 2 !== 0) array.pop();

        // wrap points in two-tuples
        for (let i = 0, len = array.length; i < len; i = i + 2) {
          points.push([ array[i], array[i + 1] ]);
        }

        return points
      }

      // Resize poly string
      size (width, height) {
        let i;
        const box = this.bbox();

        // recalculate position of all points according to new size
        for (i = this.length - 1; i >= 0; i--) {
          if (box.width) this[i][0] = ((this[i][0] - box.x) * width) / box.width + box.x;
          if (box.height) this[i][1] = ((this[i][1] - box.y) * height) / box.height + box.y;
        }

        return this
      }

      // Convert array to line object
      toLine () {
        return {
          x1: this[0][0],
          y1: this[0][1],
          x2: this[1][0],
          y2: this[1][1]
        }
      }

      // Convert array to string
      toString () {
        const array = [];
        // convert to a poly point string
        for (let i = 0, il = this.length; i < il; i++) {
          array.push(this[i].join(','));
        }

        return array.join(' ')
      }

      transform (m) {
        return this.clone().transformO(m)
      }

      // transform points with matrix (similar to Point.transform)
      transformO (m) {
        if (!Matrix.isMatrixLike(m)) {
          m = new Matrix(m);
        }

        for (let i = this.length; i--;) {
          // Perform the matrix multiplication
          const [ x, y ] = this[i];
          this[i][0] = m.a * x + m.c * y + m.e;
          this[i][1] = m.b * x + m.d * y + m.f;
        }

        return this
      }

    }

    const MorphArray = PointArray;

    // Move by left top corner over x-axis
    function x$2 (x) {
      return x == null ? this.bbox().x : this.move(x, this.bbox().y)
    }

    // Move by left top corner over y-axis
    function y$2 (y) {
      return y == null ? this.bbox().y : this.move(this.bbox().x, y)
    }

    // Set width of element
    function width$1 (width) {
      const b = this.bbox();
      return width == null ? b.width : this.size(width, b.height)
    }

    // Set height of element
    function height$1 (height) {
      const b = this.bbox();
      return height == null ? b.height : this.size(b.width, height)
    }

    var pointed = /*#__PURE__*/Object.freeze({
        __proto__: null,
        MorphArray: MorphArray,
        x: x$2,
        y: y$2,
        width: width$1,
        height: height$1
    });

    class Line extends Shape {
      // Initialize node
      constructor (node, attrs = node) {
        super(nodeOrNew('line', node), attrs);
      }

      // Get array
      array () {
        return new PointArray([
          [ this.attr('x1'), this.attr('y1') ],
          [ this.attr('x2'), this.attr('y2') ]
        ])
      }

      // Move by left top corner
      move (x, y) {
        return this.attr(this.array().move(x, y).toLine())
      }

      // Overwrite native plot() method
      plot (x1, y1, x2, y2) {
        if (x1 == null) {
          return this.array()
        } else if (typeof y1 !== 'undefined') {
          x1 = { x1, y1, x2, y2 };
        } else {
          x1 = new PointArray(x1).toLine();
        }

        return this.attr(x1)
      }

      // Set element size to given width and height
      size (width, height) {
        const p = proportionalSize(this, width, height);
        return this.attr(this.array().size(p.width, p.height).toLine())
      }
    }

    extend$1(Line, pointed);

    registerMethods({
      Container: {
        // Create a line element
        line: wrapWithAttrCheck(function (...args) {
          // make sure plot is called as a setter
          // x1 is not necessarily a number, it can also be an array, a string and a PointArray
          return Line.prototype.plot.apply(
            this.put(new Line())
            , args[0] != null ? args : [ 0, 0, 0, 0 ]
          )
        })
      }
    });

    register(Line, 'Line');

    class Marker extends Container {
      // Initialize node
      constructor (node, attrs = node) {
        super(nodeOrNew('marker', node), attrs);
      }

      // Set height of element
      height (height) {
        return this.attr('markerHeight', height)
      }

      orient (orient) {
        return this.attr('orient', orient)
      }

      // Set marker refX and refY
      ref (x, y) {
        return this.attr('refX', x).attr('refY', y)
      }

      // Return the fill id
      toString () {
        return 'url(#' + this.id() + ')'
      }

      // Update marker
      update (block) {
        // remove all content
        this.clear();

        // invoke passed block
        if (typeof block === 'function') {
          block.call(this, this);
        }

        return this
      }

      // Set width of element
      width (width) {
        return this.attr('markerWidth', width)
      }

    }

    registerMethods({
      Container: {
        marker (...args) {
          // Create marker element in defs
          return this.defs().marker(...args)
        }
      },
      Defs: {
        // Create marker
        marker: wrapWithAttrCheck(function (width, height, block) {
          // Set default viewbox to match the width and height, set ref to cx and cy and set orient to auto
          return this.put(new Marker())
            .size(width, height)
            .ref(width / 2, height / 2)
            .viewbox(0, 0, width, height)
            .attr('orient', 'auto')
            .update(block)
        })
      },
      marker: {
        // Create and attach markers
        marker (marker, width, height, block) {
          let attr = [ 'marker' ];

          // Build attribute name
          if (marker !== 'all') attr.push(marker);
          attr = attr.join('-');

          // Set marker attribute
          marker = arguments[1] instanceof Marker
            ? arguments[1]
            : this.defs().marker(width, height, block);

          return this.attr(attr, marker)
        }
      }
    });

    register(Marker, 'Marker');

    /***
    Base Class
    ==========
    The base stepper class that will be
    ***/

    function makeSetterGetter (k, f) {
      return function (v) {
        if (v == null) return this[k]
        this[k] = v;
        if (f) f.call(this);
        return this
      }
    }

    const easing = {
      '-': function (pos) {
        return pos
      },
      '<>': function (pos) {
        return -Math.cos(pos * Math.PI) / 2 + 0.5
      },
      '>': function (pos) {
        return Math.sin(pos * Math.PI / 2)
      },
      '<': function (pos) {
        return -Math.cos(pos * Math.PI / 2) + 1
      },
      bezier: function (x1, y1, x2, y2) {
        // see https://www.w3.org/TR/css-easing-1/#cubic-bezier-algo
        return function (t) {
          if (t < 0) {
            if (x1 > 0) {
              return y1 / x1 * t
            } else if (x2 > 0) {
              return y2 / x2 * t
            } else {
              return 0
            }
          } else if (t > 1) {
            if (x2 < 1) {
              return (1 - y2) / (1 - x2) * t + (y2 - x2) / (1 - x2)
            } else if (x1 < 1) {
              return (1 - y1) / (1 - x1) * t + (y1 - x1) / (1 - x1)
            } else {
              return 1
            }
          } else {
            return 3 * t * (1 - t) ** 2 * y1 + 3 * t ** 2 * (1 - t) * y2 + t ** 3
          }
        }
      },
      // see https://www.w3.org/TR/css-easing-1/#step-timing-function-algo
      steps: function (steps, stepPosition = 'end') {
        // deal with "jump-" prefix
        stepPosition = stepPosition.split('-').reverse()[0];

        let jumps = steps;
        if (stepPosition === 'none') {
          --jumps;
        } else if (stepPosition === 'both') {
          ++jumps;
        }

        // The beforeFlag is essentially useless
        return (t, beforeFlag = false) => {
          // Step is called currentStep in referenced url
          let step = Math.floor(t * steps);
          const jumping = (t * step) % 1 === 0;

          if (stepPosition === 'start' || stepPosition === 'both') {
            ++step;
          }

          if (beforeFlag && jumping) {
            --step;
          }

          if (t >= 0 && step < 0) {
            step = 0;
          }

          if (t <= 1 && step > jumps) {
            step = jumps;
          }

          return step / jumps
        }
      }
    };

    class Stepper {
      done () {
        return false
      }
    }

    /***
    Easing Functions
    ================
    ***/

    class Ease extends Stepper {
      constructor (fn = timeline.ease) {
        super();
        this.ease = easing[fn] || fn;
      }

      step (from, to, pos) {
        if (typeof from !== 'number') {
          return pos < 1 ? from : to
        }
        return from + (to - from) * this.ease(pos)
      }
    }

    /***
    Controller Types
    ================
    ***/

    class Controller extends Stepper {
      constructor (fn) {
        super();
        this.stepper = fn;
      }

      done (c) {
        return c.done
      }

      step (current, target, dt, c) {
        return this.stepper(current, target, dt, c)
      }

    }

    function recalculate () {
      // Apply the default parameters
      const duration = (this._duration || 500) / 1000;
      const overshoot = this._overshoot || 0;

      // Calculate the PID natural response
      const eps = 1e-10;
      const pi = Math.PI;
      const os = Math.log(overshoot / 100 + eps);
      const zeta = -os / Math.sqrt(pi * pi + os * os);
      const wn = 3.9 / (zeta * duration);

      // Calculate the Spring values
      this.d = 2 * zeta * wn;
      this.k = wn * wn;
    }

    class Spring extends Controller {
      constructor (duration = 500, overshoot = 0) {
        super();
        this.duration(duration)
          .overshoot(overshoot);
      }

      step (current, target, dt, c) {
        if (typeof current === 'string') return current
        c.done = dt === Infinity;
        if (dt === Infinity) return target
        if (dt === 0) return current

        if (dt > 100) dt = 16;

        dt /= 1000;

        // Get the previous velocity
        const velocity = c.velocity || 0;

        // Apply the control to get the new position and store it
        const acceleration = -this.d * velocity - this.k * (current - target);
        const newPosition = current
          + velocity * dt
          + acceleration * dt * dt / 2;

        // Store the velocity
        c.velocity = velocity + acceleration * dt;

        // Figure out if we have converged, and if so, pass the value
        c.done = Math.abs(target - newPosition) + Math.abs(velocity) < 0.002;
        return c.done ? target : newPosition
      }
    }

    extend$1(Spring, {
      duration: makeSetterGetter('_duration', recalculate),
      overshoot: makeSetterGetter('_overshoot', recalculate)
    });

    class PID extends Controller {
      constructor (p = 0.1, i = 0.01, d = 0, windup = 1000) {
        super();
        this.p(p).i(i).d(d).windup(windup);
      }

      step (current, target, dt, c) {
        if (typeof current === 'string') return current
        c.done = dt === Infinity;

        if (dt === Infinity) return target
        if (dt === 0) return current

        const p = target - current;
        let i = (c.integral || 0) + p * dt;
        const d = (p - (c.error || 0)) / dt;
        const windup = this._windup;

        // antiwindup
        if (windup !== false) {
          i = Math.max(-windup, Math.min(i, windup));
        }

        c.error = p;
        c.integral = i;

        c.done = Math.abs(p) < 0.001;

        return c.done ? target : current + (this.P * p + this.I * i + this.D * d)
      }
    }

    extend$1(PID, {
      windup: makeSetterGetter('_windup'),
      p: makeSetterGetter('P'),
      i: makeSetterGetter('I'),
      d: makeSetterGetter('D')
    });

    const segmentParameters = { M: 2, L: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, T: 2, A: 7, Z: 0 };

    const pathHandlers = {
      M: function (c, p, p0) {
        p.x = p0.x = c[0];
        p.y = p0.y = c[1];

        return [ 'M', p.x, p.y ]
      },
      L: function (c, p) {
        p.x = c[0];
        p.y = c[1];
        return [ 'L', c[0], c[1] ]
      },
      H: function (c, p) {
        p.x = c[0];
        return [ 'H', c[0] ]
      },
      V: function (c, p) {
        p.y = c[0];
        return [ 'V', c[0] ]
      },
      C: function (c, p) {
        p.x = c[4];
        p.y = c[5];
        return [ 'C', c[0], c[1], c[2], c[3], c[4], c[5] ]
      },
      S: function (c, p) {
        p.x = c[2];
        p.y = c[3];
        return [ 'S', c[0], c[1], c[2], c[3] ]
      },
      Q: function (c, p) {
        p.x = c[2];
        p.y = c[3];
        return [ 'Q', c[0], c[1], c[2], c[3] ]
      },
      T: function (c, p) {
        p.x = c[0];
        p.y = c[1];
        return [ 'T', c[0], c[1] ]
      },
      Z: function (c, p, p0) {
        p.x = p0.x;
        p.y = p0.y;
        return [ 'Z' ]
      },
      A: function (c, p) {
        p.x = c[5];
        p.y = c[6];
        return [ 'A', c[0], c[1], c[2], c[3], c[4], c[5], c[6] ]
      }
    };

    const mlhvqtcsaz = 'mlhvqtcsaz'.split('');

    for (let i = 0, il = mlhvqtcsaz.length; i < il; ++i) {
      pathHandlers[mlhvqtcsaz[i]] = (function (i) {
        return function (c, p, p0) {
          if (i === 'H') c[0] = c[0] + p.x;
          else if (i === 'V') c[0] = c[0] + p.y;
          else if (i === 'A') {
            c[5] = c[5] + p.x;
            c[6] = c[6] + p.y;
          } else {
            for (let j = 0, jl = c.length; j < jl; ++j) {
              c[j] = c[j] + (j % 2 ? p.y : p.x);
            }
          }

          return pathHandlers[i](c, p, p0)
        }
      })(mlhvqtcsaz[i].toUpperCase());
    }

    function makeAbsolut (parser) {
      const command = parser.segment[0];
      return pathHandlers[command](parser.segment.slice(1), parser.p, parser.p0)
    }

    function segmentComplete (parser) {
      return parser.segment.length && parser.segment.length - 1 === segmentParameters[parser.segment[0].toUpperCase()]
    }

    function startNewSegment (parser, token) {
      parser.inNumber && finalizeNumber(parser, false);
      const pathLetter = isPathLetter.test(token);

      if (pathLetter) {
        parser.segment = [ token ];
      } else {
        const lastCommand = parser.lastCommand;
        const small = lastCommand.toLowerCase();
        const isSmall = lastCommand === small;
        parser.segment = [ small === 'm' ? (isSmall ? 'l' : 'L') : lastCommand ];
      }

      parser.inSegment = true;
      parser.lastCommand = parser.segment[0];

      return pathLetter
    }

    function finalizeNumber (parser, inNumber) {
      if (!parser.inNumber) throw new Error('Parser Error')
      parser.number && parser.segment.push(parseFloat(parser.number));
      parser.inNumber = inNumber;
      parser.number = '';
      parser.pointSeen = false;
      parser.hasExponent = false;

      if (segmentComplete(parser)) {
        finalizeSegment(parser);
      }
    }

    function finalizeSegment (parser) {
      parser.inSegment = false;
      if (parser.absolute) {
        parser.segment = makeAbsolut(parser);
      }
      parser.segments.push(parser.segment);
    }

    function isArcFlag (parser) {
      if (!parser.segment.length) return false
      const isArc = parser.segment[0].toUpperCase() === 'A';
      const length = parser.segment.length;

      return isArc && (length === 4 || length === 5)
    }

    function isExponential (parser) {
      return parser.lastToken.toUpperCase() === 'E'
    }

    function pathParser (d, toAbsolute = true) {

      let index = 0;
      let token = '';
      const parser = {
        segment: [],
        inNumber: false,
        number: '',
        lastToken: '',
        inSegment: false,
        segments: [],
        pointSeen: false,
        hasExponent: false,
        absolute: toAbsolute,
        p0: new Point(),
        p: new Point()
      };

      while ((parser.lastToken = token, token = d.charAt(index++))) {
        if (!parser.inSegment) {
          if (startNewSegment(parser, token)) {
            continue
          }
        }

        if (token === '.') {
          if (parser.pointSeen || parser.hasExponent) {
            finalizeNumber(parser, false);
            --index;
            continue
          }
          parser.inNumber = true;
          parser.pointSeen = true;
          parser.number += token;
          continue
        }

        if (!isNaN(parseInt(token))) {

          if (parser.number === '0' || isArcFlag(parser)) {
            parser.inNumber = true;
            parser.number = token;
            finalizeNumber(parser, true);
            continue
          }

          parser.inNumber = true;
          parser.number += token;
          continue
        }

        if (token === ' ' || token === ',') {
          if (parser.inNumber) {
            finalizeNumber(parser, false);
          }
          continue
        }

        if (token === '-') {
          if (parser.inNumber && !isExponential(parser)) {
            finalizeNumber(parser, false);
            --index;
            continue
          }
          parser.number += token;
          parser.inNumber = true;
          continue
        }

        if (token.toUpperCase() === 'E') {
          parser.number += token;
          parser.hasExponent = true;
          continue
        }

        if (isPathLetter.test(token)) {
          if (parser.inNumber) {
            finalizeNumber(parser, false);
          } else if (!segmentComplete(parser)) {
            throw new Error('parser Error')
          } else {
            finalizeSegment(parser);
          }
          --index;
        }
      }

      if (parser.inNumber) {
        finalizeNumber(parser, false);
      }

      if (parser.inSegment && segmentComplete(parser)) {
        finalizeSegment(parser);
      }

      return parser.segments

    }

    function arrayToString (a) {
      let s = '';
      for (let i = 0, il = a.length; i < il; i++) {
        s += a[i][0];

        if (a[i][1] != null) {
          s += a[i][1];

          if (a[i][2] != null) {
            s += ' ';
            s += a[i][2];

            if (a[i][3] != null) {
              s += ' ';
              s += a[i][3];
              s += ' ';
              s += a[i][4];

              if (a[i][5] != null) {
                s += ' ';
                s += a[i][5];
                s += ' ';
                s += a[i][6];

                if (a[i][7] != null) {
                  s += ' ';
                  s += a[i][7];
                }
              }
            }
          }
        }
      }

      return s + ' '
    }

    class PathArray extends SVGArray {
      // Get bounding box of path
      bbox () {
        parser().path.setAttribute('d', this.toString());
        return new Box(parser.nodes.path.getBBox())
      }

      // Move path string
      move (x, y) {
        // get bounding box of current situation
        const box = this.bbox();

        // get relative offset
        x -= box.x;
        y -= box.y;

        if (!isNaN(x) && !isNaN(y)) {
          // move every point
          for (let l, i = this.length - 1; i >= 0; i--) {
            l = this[i][0];

            if (l === 'M' || l === 'L' || l === 'T') {
              this[i][1] += x;
              this[i][2] += y;
            } else if (l === 'H') {
              this[i][1] += x;
            } else if (l === 'V') {
              this[i][1] += y;
            } else if (l === 'C' || l === 'S' || l === 'Q') {
              this[i][1] += x;
              this[i][2] += y;
              this[i][3] += x;
              this[i][4] += y;

              if (l === 'C') {
                this[i][5] += x;
                this[i][6] += y;
              }
            } else if (l === 'A') {
              this[i][6] += x;
              this[i][7] += y;
            }
          }
        }

        return this
      }

      // Absolutize and parse path to array
      parse (d = 'M0 0') {
        if (Array.isArray(d)) {
          d = Array.prototype.concat.apply([], d).toString();
        }

        return pathParser(d)
      }

      // Resize path string
      size (width, height) {
        // get bounding box of current situation
        const box = this.bbox();
        let i, l;

        // If the box width or height is 0 then we ignore
        // transformations on the respective axis
        box.width = box.width === 0 ? 1 : box.width;
        box.height = box.height === 0 ? 1 : box.height;

        // recalculate position of all points according to new size
        for (i = this.length - 1; i >= 0; i--) {
          l = this[i][0];

          if (l === 'M' || l === 'L' || l === 'T') {
            this[i][1] = ((this[i][1] - box.x) * width) / box.width + box.x;
            this[i][2] = ((this[i][2] - box.y) * height) / box.height + box.y;
          } else if (l === 'H') {
            this[i][1] = ((this[i][1] - box.x) * width) / box.width + box.x;
          } else if (l === 'V') {
            this[i][1] = ((this[i][1] - box.y) * height) / box.height + box.y;
          } else if (l === 'C' || l === 'S' || l === 'Q') {
            this[i][1] = ((this[i][1] - box.x) * width) / box.width + box.x;
            this[i][2] = ((this[i][2] - box.y) * height) / box.height + box.y;
            this[i][3] = ((this[i][3] - box.x) * width) / box.width + box.x;
            this[i][4] = ((this[i][4] - box.y) * height) / box.height + box.y;

            if (l === 'C') {
              this[i][5] = ((this[i][5] - box.x) * width) / box.width + box.x;
              this[i][6] = ((this[i][6] - box.y) * height) / box.height + box.y;
            }
          } else if (l === 'A') {
            // resize radii
            this[i][1] = (this[i][1] * width) / box.width;
            this[i][2] = (this[i][2] * height) / box.height;

            // move position values
            this[i][6] = ((this[i][6] - box.x) * width) / box.width + box.x;
            this[i][7] = ((this[i][7] - box.y) * height) / box.height + box.y;
          }
        }

        return this
      }

      // Convert array to string
      toString () {
        return arrayToString(this)
      }

    }

    const getClassForType = (value) => {
      const type = typeof value;

      if (type === 'number') {
        return SVGNumber
      } else if (type === 'string') {
        if (Color.isColor(value)) {
          return Color
        } else if (delimiter.test(value)) {
          return isPathLetter.test(value)
            ? PathArray
            : SVGArray
        } else if (numberAndUnit.test(value)) {
          return SVGNumber
        } else {
          return NonMorphable
        }
      } else if (morphableTypes.indexOf(value.constructor) > -1) {
        return value.constructor
      } else if (Array.isArray(value)) {
        return SVGArray
      } else if (type === 'object') {
        return ObjectBag
      } else {
        return NonMorphable
      }
    };

    class Morphable {
      constructor (stepper) {
        this._stepper = stepper || new Ease('-');

        this._from = null;
        this._to = null;
        this._type = null;
        this._context = null;
        this._morphObj = null;
      }

      at (pos) {
        return this._morphObj.morph(this._from, this._to, pos, this._stepper, this._context)

      }

      done () {
        const complete = this._context
          .map(this._stepper.done)
          .reduce(function (last, curr) {
            return last && curr
          }, true);
        return complete
      }

      from (val) {
        if (val == null) {
          return this._from
        }

        this._from = this._set(val);
        return this
      }

      stepper (stepper) {
        if (stepper == null) return this._stepper
        this._stepper = stepper;
        return this
      }

      to (val) {
        if (val == null) {
          return this._to
        }

        this._to = this._set(val);
        return this
      }

      type (type) {
        // getter
        if (type == null) {
          return this._type
        }

        // setter
        this._type = type;
        return this
      }

      _set (value) {
        if (!this._type) {
          this.type(getClassForType(value));
        }

        let result = (new this._type(value));
        if (this._type === Color) {
          result = this._to
            ? result[this._to[4]]()
            : this._from
              ? result[this._from[4]]()
              : result;
        }

        if (this._type === ObjectBag) {
          result = this._to
            ? result.align(this._to)
            : this._from
              ? result.align(this._from)
              : result;
        }

        result = result.toConsumable();

        this._morphObj = this._morphObj || new this._type();
        this._context = this._context
          || Array.apply(null, Array(result.length))
            .map(Object)
            .map(function (o) {
              o.done = true;
              return o
            });
        return result
      }

    }

    class NonMorphable {
      constructor (...args) {
        this.init(...args);
      }

      init (val) {
        val = Array.isArray(val) ? val[0] : val;
        this.value = val;
        return this
      }

      toArray () {
        return [ this.value ]
      }

      valueOf () {
        return this.value
      }

    }

    class TransformBag {
      constructor (...args) {
        this.init(...args);
      }

      init (obj) {
        if (Array.isArray(obj)) {
          obj = {
            scaleX: obj[0],
            scaleY: obj[1],
            shear: obj[2],
            rotate: obj[3],
            translateX: obj[4],
            translateY: obj[5],
            originX: obj[6],
            originY: obj[7]
          };
        }

        Object.assign(this, TransformBag.defaults, obj);
        return this
      }

      toArray () {
        const v = this;

        return [
          v.scaleX,
          v.scaleY,
          v.shear,
          v.rotate,
          v.translateX,
          v.translateY,
          v.originX,
          v.originY
        ]
      }
    }

    TransformBag.defaults = {
      scaleX: 1,
      scaleY: 1,
      shear: 0,
      rotate: 0,
      translateX: 0,
      translateY: 0,
      originX: 0,
      originY: 0
    };

    const sortByKey = (a, b) => {
      return (a[0] < b[0] ? -1 : (a[0] > b[0] ? 1 : 0))
    };

    class ObjectBag {
      constructor (...args) {
        this.init(...args);
      }

      align (other) {
        const values = this.values;
        for (let i = 0, il = values.length; i < il; ++i) {

          // If the type is the same we only need to check if the color is in the correct format
          if (values[i + 1] === other[i + 1]) {
            if (values[i + 1] === Color && other[i + 7] !== values[i + 7]) {
              const space = other[i + 7];
              const color = new Color(this.values.splice(i + 3, 5))[space]().toArray();
              this.values.splice(i + 3, 0, ...color);
            }

            i += values[i + 2] + 2;
            continue
          }

          if (!other[i + 1]) {
            return this
          }

          // The types differ, so we overwrite the new type with the old one
          // And initialize it with the types default (e.g. black for color or 0 for number)
          const defaultObject = new (other[i + 1])().toArray();

          // Than we fix the values array
          const toDelete = (values[i + 2]) + 3;

          values.splice(i, toDelete, other[i], other[i + 1], other[i + 2], ...defaultObject);

          i += values[i + 2] + 2;
        }
        return this
      }

      init (objOrArr) {
        this.values = [];

        if (Array.isArray(objOrArr)) {
          this.values = objOrArr.slice();
          return
        }

        objOrArr = objOrArr || {};
        const entries = [];

        for (const i in objOrArr) {
          const Type = getClassForType(objOrArr[i]);
          const val = new Type(objOrArr[i]).toArray();
          entries.push([ i, Type, val.length, ...val ]);
        }

        entries.sort(sortByKey);

        this.values = entries.reduce((last, curr) => last.concat(curr), []);
        return this
      }

      toArray () {
        return this.values
      }

      valueOf () {
        const obj = {};
        const arr = this.values;

        // for (var i = 0, len = arr.length; i < len; i += 2) {
        while (arr.length) {
          const key = arr.shift();
          const Type = arr.shift();
          const num = arr.shift();
          const values = arr.splice(0, num);
          obj[key] = new Type(values);// .valueOf()
        }

        return obj
      }

    }

    const morphableTypes = [
      NonMorphable,
      TransformBag,
      ObjectBag
    ];

    function registerMorphableType (type = []) {
      morphableTypes.push(...[].concat(type));
    }

    function makeMorphable () {
      extend$1(morphableTypes, {
        to (val) {
          return new Morphable()
            .type(this.constructor)
            .from(this.toArray())// this.valueOf())
            .to(val)
        },
        fromArray (arr) {
          this.init(arr);
          return this
        },
        toConsumable () {
          return this.toArray()
        },
        morph (from, to, pos, stepper, context) {
          const mapper = function (i, index) {
            return stepper.step(i, to[index], pos, context[index], context)
          };

          return this.fromArray(from.map(mapper))
        }
      });
    }

    class Path extends Shape {
      // Initialize node
      constructor (node, attrs = node) {
        super(nodeOrNew('path', node), attrs);
      }

      // Get array
      array () {
        return this._array || (this._array = new PathArray(this.attr('d')))
      }

      // Clear array cache
      clear () {
        delete this._array;
        return this
      }

      // Set height of element
      height (height) {
        return height == null ? this.bbox().height : this.size(this.bbox().width, height)
      }

      // Move by left top corner
      move (x, y) {
        return this.attr('d', this.array().move(x, y))
      }

      // Plot new path
      plot (d) {
        return (d == null)
          ? this.array()
          : this.clear().attr('d', typeof d === 'string' ? d : (this._array = new PathArray(d)))
      }

      // Set element size to given width and height
      size (width, height) {
        const p = proportionalSize(this, width, height);
        return this.attr('d', this.array().size(p.width, p.height))
      }

      // Set width of element
      width (width) {
        return width == null ? this.bbox().width : this.size(width, this.bbox().height)
      }

      // Move by left top corner over x-axis
      x (x) {
        return x == null ? this.bbox().x : this.move(x, this.bbox().y)
      }

      // Move by left top corner over y-axis
      y (y) {
        return y == null ? this.bbox().y : this.move(this.bbox().x, y)
      }

    }

    // Define morphable array
    Path.prototype.MorphArray = PathArray;

    // Add parent method
    registerMethods({
      Container: {
        // Create a wrapped path element
        path: wrapWithAttrCheck(function (d) {
          // make sure plot is called as a setter
          return this.put(new Path()).plot(d || new PathArray())
        })
      }
    });

    register(Path, 'Path');

    // Get array
    function array () {
      return this._array || (this._array = new PointArray(this.attr('points')))
    }

    // Clear array cache
    function clear () {
      delete this._array;
      return this
    }

    // Move by left top corner
    function move$2 (x, y) {
      return this.attr('points', this.array().move(x, y))
    }

    // Plot new path
    function plot (p) {
      return (p == null)
        ? this.array()
        : this.clear().attr('points', typeof p === 'string'
          ? p
          : (this._array = new PointArray(p)))
    }

    // Set element size to given width and height
    function size$1 (width, height) {
      const p = proportionalSize(this, width, height);
      return this.attr('points', this.array().size(p.width, p.height))
    }

    var poly = /*#__PURE__*/Object.freeze({
        __proto__: null,
        array: array,
        clear: clear,
        move: move$2,
        plot: plot,
        size: size$1
    });

    class Polygon extends Shape {
      // Initialize node
      constructor (node, attrs = node) {
        super(nodeOrNew('polygon', node), attrs);
      }
    }

    registerMethods({
      Container: {
        // Create a wrapped polygon element
        polygon: wrapWithAttrCheck(function (p) {
          // make sure plot is called as a setter
          return this.put(new Polygon()).plot(p || new PointArray())
        })
      }
    });

    extend$1(Polygon, pointed);
    extend$1(Polygon, poly);
    register(Polygon, 'Polygon');

    class Polyline extends Shape {
      // Initialize node
      constructor (node, attrs = node) {
        super(nodeOrNew('polyline', node), attrs);
      }
    }

    registerMethods({
      Container: {
        // Create a wrapped polygon element
        polyline: wrapWithAttrCheck(function (p) {
          // make sure plot is called as a setter
          return this.put(new Polyline()).plot(p || new PointArray())
        })
      }
    });

    extend$1(Polyline, pointed);
    extend$1(Polyline, poly);
    register(Polyline, 'Polyline');

    class Rect extends Shape {
      // Initialize node
      constructor (node, attrs = node) {
        super(nodeOrNew('rect', node), attrs);
      }
    }

    extend$1(Rect, { rx, ry });

    registerMethods({
      Container: {
        // Create a rect element
        rect: wrapWithAttrCheck(function (width, height) {
          return this.put(new Rect()).size(width, height)
        })
      }
    });

    register(Rect, 'Rect');

    class Queue {
      constructor () {
        this._first = null;
        this._last = null;
      }

      // Shows us the first item in the list
      first () {
        return this._first && this._first.value
      }

      // Shows us the last item in the list
      last () {
        return this._last && this._last.value
      }

      push (value) {
        // An item stores an id and the provided value
        const item = typeof value.next !== 'undefined' ? value : { value: value, next: null, prev: null };

        // Deal with the queue being empty or populated
        if (this._last) {
          item.prev = this._last;
          this._last.next = item;
          this._last = item;
        } else {
          this._last = item;
          this._first = item;
        }

        // Return the current item
        return item
      }

      // Removes the item that was returned from the push
      remove (item) {
        // Relink the previous item
        if (item.prev) item.prev.next = item.next;
        if (item.next) item.next.prev = item.prev;
        if (item === this._last) this._last = item.prev;
        if (item === this._first) this._first = item.next;

        // Invalidate item
        item.prev = null;
        item.next = null;
      }

      shift () {
        // Check if we have a value
        const remove = this._first;
        if (!remove) return null

        // If we do, remove it and relink things
        this._first = remove.next;
        if (this._first) this._first.prev = null;
        this._last = this._first ? this._last : null;
        return remove.value
      }

    }

    const Animator = {
      nextDraw: null,
      frames: new Queue(),
      timeouts: new Queue(),
      immediates: new Queue(),
      timer: () => globals.window.performance || globals.window.Date,
      transforms: [],

      frame (fn) {
        // Store the node
        const node = Animator.frames.push({ run: fn });

        // Request an animation frame if we don't have one
        if (Animator.nextDraw === null) {
          Animator.nextDraw = globals.window.requestAnimationFrame(Animator._draw);
        }

        // Return the node so we can remove it easily
        return node
      },

      timeout (fn, delay) {
        delay = delay || 0;

        // Work out when the event should fire
        const time = Animator.timer().now() + delay;

        // Add the timeout to the end of the queue
        const node = Animator.timeouts.push({ run: fn, time: time });

        // Request another animation frame if we need one
        if (Animator.nextDraw === null) {
          Animator.nextDraw = globals.window.requestAnimationFrame(Animator._draw);
        }

        return node
      },

      immediate (fn) {
        // Add the immediate fn to the end of the queue
        const node = Animator.immediates.push(fn);
        // Request another animation frame if we need one
        if (Animator.nextDraw === null) {
          Animator.nextDraw = globals.window.requestAnimationFrame(Animator._draw);
        }

        return node
      },

      cancelFrame (node) {
        node != null && Animator.frames.remove(node);
      },

      clearTimeout (node) {
        node != null && Animator.timeouts.remove(node);
      },

      cancelImmediate (node) {
        node != null && Animator.immediates.remove(node);
      },

      _draw (now) {
        // Run all the timeouts we can run, if they are not ready yet, add them
        // to the end of the queue immediately! (bad timeouts!!! [sarcasm])
        let nextTimeout = null;
        const lastTimeout = Animator.timeouts.last();
        while ((nextTimeout = Animator.timeouts.shift())) {
          // Run the timeout if its time, or push it to the end
          if (now >= nextTimeout.time) {
            nextTimeout.run();
          } else {
            Animator.timeouts.push(nextTimeout);
          }

          // If we hit the last item, we should stop shifting out more items
          if (nextTimeout === lastTimeout) break
        }

        // Run all of the animation frames
        let nextFrame = null;
        const lastFrame = Animator.frames.last();
        while ((nextFrame !== lastFrame) && (nextFrame = Animator.frames.shift())) {
          nextFrame.run(now);
        }

        let nextImmediate = null;
        while ((nextImmediate = Animator.immediates.shift())) {
          nextImmediate();
        }

        // If we have remaining timeouts or frames, draw until we don't anymore
        Animator.nextDraw = Animator.timeouts.first() || Animator.frames.first()
          ? globals.window.requestAnimationFrame(Animator._draw)
          : null;
      }
    };

    const makeSchedule = function (runnerInfo) {
      const start = runnerInfo.start;
      const duration = runnerInfo.runner.duration();
      const end = start + duration;
      return { start: start, duration: duration, end: end, runner: runnerInfo.runner }
    };

    const defaultSource = function () {
      const w = globals.window;
      return (w.performance || w.Date).now()
    };

    class Timeline extends EventTarget {
      // Construct a new timeline on the given element
      constructor (timeSource = defaultSource) {
        super();

        this._timeSource = timeSource;

        // Store the timing variables
        this._startTime = 0;
        this._speed = 1.0;

        // Determines how long a runner is hold in memory. Can be a dt or true/false
        this._persist = 0;

        // Keep track of the running animations and their starting parameters
        this._nextFrame = null;
        this._paused = true;
        this._runners = [];
        this._runnerIds = [];
        this._lastRunnerId = -1;
        this._time = 0;
        this._lastSourceTime = 0;
        this._lastStepTime = 0;

        // Make sure that step is always called in class context
        this._step = this._stepFn.bind(this, false);
        this._stepImmediate = this._stepFn.bind(this, true);
      }

      active () {
        return !!this._nextFrame
      }

      finish () {
        // Go to end and pause
        this.time(this.getEndTimeOfTimeline() + 1);
        return this.pause()
      }

      // Calculates the end of the timeline
      getEndTime () {
        const lastRunnerInfo = this.getLastRunnerInfo();
        const lastDuration = lastRunnerInfo ? lastRunnerInfo.runner.duration() : 0;
        const lastStartTime = lastRunnerInfo ? lastRunnerInfo.start : this._time;
        return lastStartTime + lastDuration
      }

      getEndTimeOfTimeline () {
        const endTimes = this._runners.map((i) => i.start + i.runner.duration());
        return Math.max(0, ...endTimes)
      }

      getLastRunnerInfo () {
        return this.getRunnerInfoById(this._lastRunnerId)
      }

      getRunnerInfoById (id) {
        return this._runners[this._runnerIds.indexOf(id)] || null
      }

      pause () {
        this._paused = true;
        return this._continue()
      }

      persist (dtOrForever) {
        if (dtOrForever == null) return this._persist
        this._persist = dtOrForever;
        return this
      }

      play () {
        // Now make sure we are not paused and continue the animation
        this._paused = false;
        return this.updateTime()._continue()
      }

      reverse (yes) {
        const currentSpeed = this.speed();
        if (yes == null) return this.speed(-currentSpeed)

        const positive = Math.abs(currentSpeed);
        return this.speed(yes ? -positive : positive)
      }

      // schedules a runner on the timeline
      schedule (runner, delay, when) {
        if (runner == null) {
          return this._runners.map(makeSchedule)
        }

        // The start time for the next animation can either be given explicitly,
        // derived from the current timeline time or it can be relative to the
        // last start time to chain animations directly

        let absoluteStartTime = 0;
        const endTime = this.getEndTime();
        delay = delay || 0;

        // Work out when to start the animation
        if (when == null || when === 'last' || when === 'after') {
          // Take the last time and increment
          absoluteStartTime = endTime;
        } else if (when === 'absolute' || when === 'start') {
          absoluteStartTime = delay;
          delay = 0;
        } else if (when === 'now') {
          absoluteStartTime = this._time;
        } else if (when === 'relative') {
          const runnerInfo = this.getRunnerInfoById(runner.id);
          if (runnerInfo) {
            absoluteStartTime = runnerInfo.start + delay;
            delay = 0;
          }
        } else if (when === 'with-last') {
          const lastRunnerInfo = this.getLastRunnerInfo();
          const lastStartTime = lastRunnerInfo ? lastRunnerInfo.start : this._time;
          absoluteStartTime = lastStartTime;
        } else {
          throw new Error('Invalid value for the "when" parameter')
        }

        // Manage runner
        runner.unschedule();
        runner.timeline(this);

        const persist = runner.persist();
        const runnerInfo = {
          persist: persist === null ? this._persist : persist,
          start: absoluteStartTime + delay,
          runner
        };

        this._lastRunnerId = runner.id;

        this._runners.push(runnerInfo);
        this._runners.sort((a, b) => a.start - b.start);
        this._runnerIds = this._runners.map(info => info.runner.id);

        this.updateTime()._continue();
        return this
      }

      seek (dt) {
        return this.time(this._time + dt)
      }

      source (fn) {
        if (fn == null) return this._timeSource
        this._timeSource = fn;
        return this
      }

      speed (speed) {
        if (speed == null) return this._speed
        this._speed = speed;
        return this
      }

      stop () {
        // Go to start and pause
        this.time(0);
        return this.pause()
      }

      time (time) {
        if (time == null) return this._time
        this._time = time;
        return this._continue(true)
      }

      // Remove the runner from this timeline
      unschedule (runner) {
        const index = this._runnerIds.indexOf(runner.id);
        if (index < 0) return this

        this._runners.splice(index, 1);
        this._runnerIds.splice(index, 1);

        runner.timeline(null);
        return this
      }

      // Makes sure, that after pausing the time doesn't jump
      updateTime () {
        if (!this.active()) {
          this._lastSourceTime = this._timeSource();
        }
        return this
      }

      // Checks if we are running and continues the animation
      _continue (immediateStep = false) {
        Animator.cancelFrame(this._nextFrame);
        this._nextFrame = null;

        if (immediateStep) return this._stepImmediate()
        if (this._paused) return this

        this._nextFrame = Animator.frame(this._step);
        return this
      }

      _stepFn (immediateStep = false) {
        // Get the time delta from the last time and update the time
        const time = this._timeSource();
        let dtSource = time - this._lastSourceTime;

        if (immediateStep) dtSource = 0;

        const dtTime = this._speed * dtSource + (this._time - this._lastStepTime);
        this._lastSourceTime = time;

        // Only update the time if we use the timeSource.
        // Otherwise use the current time
        if (!immediateStep) {
          // Update the time
          this._time += dtTime;
          this._time = this._time < 0 ? 0 : this._time;
        }
        this._lastStepTime = this._time;
        this.fire('time', this._time);

        // This is for the case that the timeline was seeked so that the time
        // is now before the startTime of the runner. Thats why we need to set
        // the runner to position 0

        // FIXME:
        // However, reseting in insertion order leads to bugs. Considering the case,
        // where 2 runners change the same attribute but in different times,
        // reseting both of them will lead to the case where the later defined
        // runner always wins the reset even if the other runner started earlier
        // and therefore should win the attribute battle
        // this can be solved by reseting them backwards
        for (let k = this._runners.length; k--;) {
          // Get and run the current runner and ignore it if its inactive
          const runnerInfo = this._runners[k];
          const runner = runnerInfo.runner;

          // Make sure that we give the actual difference
          // between runner start time and now
          const dtToStart = this._time - runnerInfo.start;

          // Dont run runner if not started yet
          // and try to reset it
          if (dtToStart <= 0) {
            runner.reset();
          }
        }

        // Run all of the runners directly
        let runnersLeft = false;
        for (let i = 0, len = this._runners.length; i < len; i++) {
          // Get and run the current runner and ignore it if its inactive
          const runnerInfo = this._runners[i];
          const runner = runnerInfo.runner;
          let dt = dtTime;

          // Make sure that we give the actual difference
          // between runner start time and now
          const dtToStart = this._time - runnerInfo.start;

          // Dont run runner if not started yet
          if (dtToStart <= 0) {
            runnersLeft = true;
            continue
          } else if (dtToStart < dt) {
            // Adjust dt to make sure that animation is on point
            dt = dtToStart;
          }

          if (!runner.active()) continue

          // If this runner is still going, signal that we need another animation
          // frame, otherwise, remove the completed runner
          const finished = runner.step(dt).done;
          if (!finished) {
            runnersLeft = true;
            // continue
          } else if (runnerInfo.persist !== true) {
            // runner is finished. And runner might get removed
            const endTime = runner.duration() - runner.time() + this._time;

            if (endTime + runnerInfo.persist < this._time) {
              // Delete runner and correct index
              runner.unschedule();
              --i;
              --len;
            }
          }
        }

        // Basically: we continue when there are runners right from us in time
        // when -->, and when runners are left from us when <--
        if ((runnersLeft && !(this._speed < 0 && this._time === 0)) || (this._runnerIds.length && this._speed < 0 && this._time > 0)) {
          this._continue();
        } else {
          this.pause();
          this.fire('finished');
        }

        return this
      }

    }

    registerMethods({
      Element: {
        timeline: function (timeline) {
          if (timeline == null) {
            this._timeline = (this._timeline || new Timeline());
            return this._timeline
          } else {
            this._timeline = timeline;
            return this
          }
        }
      }
    });

    class Runner extends EventTarget {
      constructor (options) {
        super();

        // Store a unique id on the runner, so that we can identify it later
        this.id = Runner.id++;

        // Ensure a default value
        options = options == null
          ? timeline.duration
          : options;

        // Ensure that we get a controller
        options = typeof options === 'function'
          ? new Controller(options)
          : options;

        // Declare all of the variables
        this._element = null;
        this._timeline = null;
        this.done = false;
        this._queue = [];

        // Work out the stepper and the duration
        this._duration = typeof options === 'number' && options;
        this._isDeclarative = options instanceof Controller;
        this._stepper = this._isDeclarative ? options : new Ease();

        // We copy the current values from the timeline because they can change
        this._history = {};

        // Store the state of the runner
        this.enabled = true;
        this._time = 0;
        this._lastTime = 0;

        // At creation, the runner is in reseted state
        this._reseted = true;

        // Save transforms applied to this runner
        this.transforms = new Matrix();
        this.transformId = 1;

        // Looping variables
        this._haveReversed = false;
        this._reverse = false;
        this._loopsDone = 0;
        this._swing = false;
        this._wait = 0;
        this._times = 1;

        this._frameId = null;

        // Stores how long a runner is stored after beeing done
        this._persist = this._isDeclarative ? true : null;
      }

      static sanitise (duration, delay, when) {
        // Initialise the default parameters
        let times = 1;
        let swing = false;
        let wait = 0;
        duration = duration || timeline.duration;
        delay = delay || timeline.delay;
        when = when || 'last';

        // If we have an object, unpack the values
        if (typeof duration === 'object' && !(duration instanceof Stepper)) {
          delay = duration.delay || delay;
          when = duration.when || when;
          swing = duration.swing || swing;
          times = duration.times || times;
          wait = duration.wait || wait;
          duration = duration.duration || timeline.duration;
        }

        return {
          duration: duration,
          delay: delay,
          swing: swing,
          times: times,
          wait: wait,
          when: when
        }
      }

      active (enabled) {
        if (enabled == null) return this.enabled
        this.enabled = enabled;
        return this
      }

      /*
      Private Methods
      ===============
      Methods that shouldn't be used externally
      */
      addTransform (transform, index) {
        this.transforms.lmultiplyO(transform);
        return this
      }

      after (fn) {
        return this.on('finished', fn)
      }

      animate (duration, delay, when) {
        const o = Runner.sanitise(duration, delay, when);
        const runner = new Runner(o.duration);
        if (this._timeline) runner.timeline(this._timeline);
        if (this._element) runner.element(this._element);
        return runner.loop(o).schedule(o.delay, o.when)
      }

      clearTransform () {
        this.transforms = new Matrix();
        return this
      }

      // TODO: Keep track of all transformations so that deletion is faster
      clearTransformsFromQueue () {
        if (!this.done || !this._timeline || !this._timeline._runnerIds.includes(this.id)) {
          this._queue = this._queue.filter((item) => {
            return !item.isTransform
          });
        }
      }

      delay (delay) {
        return this.animate(0, delay)
      }

      duration () {
        return this._times * (this._wait + this._duration) - this._wait
      }

      during (fn) {
        return this.queue(null, fn)
      }

      ease (fn) {
        this._stepper = new Ease(fn);
        return this
      }
      /*
      Runner Definitions
      ==================
      These methods help us define the runtime behaviour of the Runner or they
      help us make new runners from the current runner
      */

      element (element) {
        if (element == null) return this._element
        this._element = element;
        element._prepareRunner();
        return this
      }

      finish () {
        return this.step(Infinity)
      }

      loop (times, swing, wait) {
        // Deal with the user passing in an object
        if (typeof times === 'object') {
          swing = times.swing;
          wait = times.wait;
          times = times.times;
        }

        // Sanitise the values and store them
        this._times = times || Infinity;
        this._swing = swing || false;
        this._wait = wait || 0;

        // Allow true to be passed
        if (this._times === true) { this._times = Infinity; }

        return this
      }

      loops (p) {
        const loopDuration = this._duration + this._wait;
        if (p == null) {
          const loopsDone = Math.floor(this._time / loopDuration);
          const relativeTime = (this._time - loopsDone * loopDuration);
          const position = relativeTime / this._duration;
          return Math.min(loopsDone + position, this._times)
        }
        const whole = Math.floor(p);
        const partial = p % 1;
        const time = loopDuration * whole + this._duration * partial;
        return this.time(time)
      }

      persist (dtOrForever) {
        if (dtOrForever == null) return this._persist
        this._persist = dtOrForever;
        return this
      }

      position (p) {
        // Get all of the variables we need
        const x = this._time;
        const d = this._duration;
        const w = this._wait;
        const t = this._times;
        const s = this._swing;
        const r = this._reverse;
        let position;

        if (p == null) {
          /*
          This function converts a time to a position in the range [0, 1]
          The full explanation can be found in this desmos demonstration
            https://www.desmos.com/calculator/u4fbavgche
          The logic is slightly simplified here because we can use booleans
          */

          // Figure out the value without thinking about the start or end time
          const f = function (x) {
            const swinging = s * Math.floor(x % (2 * (w + d)) / (w + d));
            const backwards = (swinging && !r) || (!swinging && r);
            const uncliped = Math.pow(-1, backwards) * (x % (w + d)) / d + backwards;
            const clipped = Math.max(Math.min(uncliped, 1), 0);
            return clipped
          };

          // Figure out the value by incorporating the start time
          const endTime = t * (w + d) - w;
          position = x <= 0
            ? Math.round(f(1e-5))
            : x < endTime
              ? f(x)
              : Math.round(f(endTime - 1e-5));
          return position
        }

        // Work out the loops done and add the position to the loops done
        const loopsDone = Math.floor(this.loops());
        const swingForward = s && (loopsDone % 2 === 0);
        const forwards = (swingForward && !r) || (r && swingForward);
        position = loopsDone + (forwards ? p : 1 - p);
        return this.loops(position)
      }

      progress (p) {
        if (p == null) {
          return Math.min(1, this._time / this.duration())
        }
        return this.time(p * this.duration())
      }

      /*
      Basic Functionality
      ===================
      These methods allow us to attach basic functions to the runner directly
      */
      queue (initFn, runFn, retargetFn, isTransform) {
        this._queue.push({
          initialiser: initFn || noop,
          runner: runFn || noop,
          retarget: retargetFn,
          isTransform: isTransform,
          initialised: false,
          finished: false
        });
        const timeline = this.timeline();
        timeline && this.timeline()._continue();
        return this
      }

      reset () {
        if (this._reseted) return this
        this.time(0);
        this._reseted = true;
        return this
      }

      reverse (reverse) {
        this._reverse = reverse == null ? !this._reverse : reverse;
        return this
      }

      schedule (timeline, delay, when) {
        // The user doesn't need to pass a timeline if we already have one
        if (!(timeline instanceof Timeline)) {
          when = delay;
          delay = timeline;
          timeline = this.timeline();
        }

        // If there is no timeline, yell at the user...
        if (!timeline) {
          throw Error('Runner cannot be scheduled without timeline')
        }

        // Schedule the runner on the timeline provided
        timeline.schedule(this, delay, when);
        return this
      }

      step (dt) {
        // If we are inactive, this stepper just gets skipped
        if (!this.enabled) return this

        // Update the time and get the new position
        dt = dt == null ? 16 : dt;
        this._time += dt;
        const position = this.position();

        // Figure out if we need to run the stepper in this frame
        const running = this._lastPosition !== position && this._time >= 0;
        this._lastPosition = position;

        // Figure out if we just started
        const duration = this.duration();
        const justStarted = this._lastTime <= 0 && this._time > 0;
        const justFinished = this._lastTime < duration && this._time >= duration;

        this._lastTime = this._time;
        if (justStarted) {
          this.fire('start', this);
        }

        // Work out if the runner is finished set the done flag here so animations
        // know, that they are running in the last step (this is good for
        // transformations which can be merged)
        const declarative = this._isDeclarative;
        this.done = !declarative && !justFinished && this._time >= duration;

        // Runner is running. So its not in reseted state anymore
        this._reseted = false;

        let converged = false;
        // Call initialise and the run function
        if (running || declarative) {
          this._initialise(running);

          // clear the transforms on this runner so they dont get added again and again
          this.transforms = new Matrix();
          converged = this._run(declarative ? dt : position);

          this.fire('step', this);
        }
        // correct the done flag here
        // declaritive animations itself know when they converged
        this.done = this.done || (converged && declarative);
        if (justFinished) {
          this.fire('finished', this);
        }
        return this
      }

      /*
      Runner animation methods
      ========================
      Control how the animation plays
      */
      time (time) {
        if (time == null) {
          return this._time
        }
        const dt = time - this._time;
        this.step(dt);
        return this
      }

      timeline (timeline) {
        // check explicitly for undefined so we can set the timeline to null
        if (typeof timeline === 'undefined') return this._timeline
        this._timeline = timeline;
        return this
      }

      unschedule () {
        const timeline = this.timeline();
        timeline && timeline.unschedule(this);
        return this
      }

      // Run each initialise function in the runner if required
      _initialise (running) {
        // If we aren't running, we shouldn't initialise when not declarative
        if (!running && !this._isDeclarative) return

        // Loop through all of the initialisers
        for (let i = 0, len = this._queue.length; i < len; ++i) {
          // Get the current initialiser
          const current = this._queue[i];

          // Determine whether we need to initialise
          const needsIt = this._isDeclarative || (!current.initialised && running);
          running = !current.finished;

          // Call the initialiser if we need to
          if (needsIt && running) {
            current.initialiser.call(this);
            current.initialised = true;
          }
        }
      }

      // Save a morpher to the morpher list so that we can retarget it later
      _rememberMorpher (method, morpher) {
        this._history[method] = {
          morpher: morpher,
          caller: this._queue[this._queue.length - 1]
        };

        // We have to resume the timeline in case a controller
        // is already done without being ever run
        // This can happen when e.g. this is done:
        //    anim = el.animate(new SVG.Spring)
        // and later
        //    anim.move(...)
        if (this._isDeclarative) {
          const timeline = this.timeline();
          timeline && timeline.play();
        }
      }

      // Try to set the target for a morpher if the morpher exists, otherwise
      // Run each run function for the position or dt given
      _run (positionOrDt) {
        // Run all of the _queue directly
        let allfinished = true;
        for (let i = 0, len = this._queue.length; i < len; ++i) {
          // Get the current function to run
          const current = this._queue[i];

          // Run the function if its not finished, we keep track of the finished
          // flag for the sake of declarative _queue
          const converged = current.runner.call(this, positionOrDt);
          current.finished = current.finished || (converged === true);
          allfinished = allfinished && current.finished;
        }

        // We report when all of the constructors are finished
        return allfinished
      }

      // do nothing and return false
      _tryRetarget (method, target, extra) {
        if (this._history[method]) {
          // if the last method wasnt even initialised, throw it away
          if (!this._history[method].caller.initialised) {
            const index = this._queue.indexOf(this._history[method].caller);
            this._queue.splice(index, 1);
            return false
          }

          // for the case of transformations, we use the special retarget function
          // which has access to the outer scope
          if (this._history[method].caller.retarget) {
            this._history[method].caller.retarget.call(this, target, extra);
            // for everything else a simple morpher change is sufficient
          } else {
            this._history[method].morpher.to(target);
          }

          this._history[method].caller.finished = false;
          const timeline = this.timeline();
          timeline && timeline.play();
          return true
        }
        return false
      }

    }

    Runner.id = 0;

    class FakeRunner {
      constructor (transforms = new Matrix(), id = -1, done = true) {
        this.transforms = transforms;
        this.id = id;
        this.done = done;
      }

      clearTransformsFromQueue () { }
    }

    extend$1([ Runner, FakeRunner ], {
      mergeWith (runner) {
        return new FakeRunner(
          runner.transforms.lmultiply(this.transforms),
          runner.id
        )
      }
    });

    // FakeRunner.emptyRunner = new FakeRunner()

    const lmultiply = (last, curr) => last.lmultiplyO(curr);
    const getRunnerTransform = (runner) => runner.transforms;

    function mergeTransforms () {
      // Find the matrix to apply to the element and apply it
      const runners = this._transformationRunners.runners;
      const netTransform = runners
        .map(getRunnerTransform)
        .reduce(lmultiply, new Matrix());

      this.transform(netTransform);

      this._transformationRunners.merge();

      if (this._transformationRunners.length() === 1) {
        this._frameId = null;
      }
    }

    class RunnerArray {
      constructor () {
        this.runners = [];
        this.ids = [];
      }

      add (runner) {
        if (this.runners.includes(runner)) return
        const id = runner.id + 1;

        this.runners.push(runner);
        this.ids.push(id);

        return this
      }

      clearBefore (id) {
        const deleteCnt = this.ids.indexOf(id + 1) || 1;
        this.ids.splice(0, deleteCnt, 0);
        this.runners.splice(0, deleteCnt, new FakeRunner())
          .forEach((r) => r.clearTransformsFromQueue());
        return this
      }

      edit (id, newRunner) {
        const index = this.ids.indexOf(id + 1);
        this.ids.splice(index, 1, id + 1);
        this.runners.splice(index, 1, newRunner);
        return this
      }

      getByID (id) {
        return this.runners[this.ids.indexOf(id + 1)]
      }

      length () {
        return this.ids.length
      }

      merge () {
        let lastRunner = null;
        for (let i = 0; i < this.runners.length; ++i) {
          const runner = this.runners[i];

          const condition = lastRunner
            && runner.done && lastRunner.done
            // don't merge runner when persisted on timeline
            && (!runner._timeline || !runner._timeline._runnerIds.includes(runner.id))
            && (!lastRunner._timeline || !lastRunner._timeline._runnerIds.includes(lastRunner.id));

          if (condition) {
            // the +1 happens in the function
            this.remove(runner.id);
            const newRunner = runner.mergeWith(lastRunner);
            this.edit(lastRunner.id, newRunner);
            lastRunner = newRunner;
            --i;
          } else {
            lastRunner = runner;
          }
        }

        return this
      }

      remove (id) {
        const index = this.ids.indexOf(id + 1);
        this.ids.splice(index, 1);
        this.runners.splice(index, 1);
        return this
      }

    }

    registerMethods({
      Element: {
        animate (duration, delay, when) {
          const o = Runner.sanitise(duration, delay, when);
          const timeline = this.timeline();
          return new Runner(o.duration)
            .loop(o)
            .element(this)
            .timeline(timeline.play())
            .schedule(o.delay, o.when)
        },

        delay (by, when) {
          return this.animate(0, by, when)
        },

        // this function searches for all runners on the element and deletes the ones
        // which run before the current one. This is because absolute transformations
        // overwfrite anything anyway so there is no need to waste time computing
        // other runners
        _clearTransformRunnersBefore (currentRunner) {
          this._transformationRunners.clearBefore(currentRunner.id);
        },

        _currentTransform (current) {
          return this._transformationRunners.runners
            // we need the equal sign here to make sure, that also transformations
            // on the same runner which execute before the current transformation are
            // taken into account
            .filter((runner) => runner.id <= current.id)
            .map(getRunnerTransform)
            .reduce(lmultiply, new Matrix())
        },

        _addRunner (runner) {
          this._transformationRunners.add(runner);

          // Make sure that the runner merge is executed at the very end of
          // all Animator functions. Thats why we use immediate here to execute
          // the merge right after all frames are run
          Animator.cancelImmediate(this._frameId);
          this._frameId = Animator.immediate(mergeTransforms.bind(this));
        },

        _prepareRunner () {
          if (this._frameId == null) {
            this._transformationRunners = new RunnerArray()
              .add(new FakeRunner(new Matrix(this)));
          }
        }
      }
    });

    // Will output the elements from array A that are not in the array B
    const difference = (a, b) => a.filter(x => !b.includes(x));

    extend$1(Runner, {
      attr (a, v) {
        return this.styleAttr('attr', a, v)
      },

      // Add animatable styles
      css (s, v) {
        return this.styleAttr('css', s, v)
      },

      styleAttr (type, nameOrAttrs, val) {
        if (typeof nameOrAttrs === 'string') {
          return this.styleAttr(type, { [nameOrAttrs]: val })
        }

        let attrs = nameOrAttrs;
        if (this._tryRetarget(type, attrs)) return this

        let morpher = new Morphable(this._stepper).to(attrs);
        let keys = Object.keys(attrs);

        this.queue(function () {
          morpher = morpher.from(this.element()[type](keys));
        }, function (pos) {
          this.element()[type](morpher.at(pos).valueOf());
          return morpher.done()
        }, function (newToAttrs) {

          // Check if any new keys were added
          const newKeys = Object.keys(newToAttrs);
          const differences = difference(newKeys, keys);

          // If their are new keys, initialize them and add them to morpher
          if (differences.length) {
            // Get the values
            const addedFromAttrs = this.element()[type](differences);

            // Get the already initialized values
            const oldFromAttrs = new ObjectBag(morpher.from()).valueOf();

            // Merge old and new
            Object.assign(oldFromAttrs, addedFromAttrs);
            morpher.from(oldFromAttrs);
          }

          // Get the object from the morpher
          const oldToAttrs = new ObjectBag(morpher.to()).valueOf();

          // Merge in new attributes
          Object.assign(oldToAttrs, newToAttrs);

          // Change morpher target
          morpher.to(oldToAttrs);

          // Make sure that we save the work we did so we don't need it to do again
          keys = newKeys;
          attrs = newToAttrs;
        });

        this._rememberMorpher(type, morpher);
        return this
      },

      zoom (level, point) {
        if (this._tryRetarget('zoom', level, point)) return this

        let morpher = new Morphable(this._stepper).to(new SVGNumber(level));

        this.queue(function () {
          morpher = morpher.from(this.element().zoom());
        }, function (pos) {
          this.element().zoom(morpher.at(pos), point);
          return morpher.done()
        }, function (newLevel, newPoint) {
          point = newPoint;
          morpher.to(newLevel);
        });

        this._rememberMorpher('zoom', morpher);
        return this
      },

      /**
       ** absolute transformations
       **/

      //
      // M v -----|-----(D M v = F v)------|----->  T v
      //
      // 1. define the final state (T) and decompose it (once)
      //    t = [tx, ty, the, lam, sy, sx]
      // 2. on every frame: pull the current state of all previous transforms
      //    (M - m can change)
      //   and then write this as m = [tx0, ty0, the0, lam0, sy0, sx0]
      // 3. Find the interpolated matrix F(pos) = m + pos * (t - m)
      //   - Note F(0) = M
      //   - Note F(1) = T
      // 4. Now you get the delta matrix as a result: D = F * inv(M)

      transform (transforms, relative, affine) {
        // If we have a declarative function, we should retarget it if possible
        relative = transforms.relative || relative;
        if (this._isDeclarative && !relative && this._tryRetarget('transform', transforms)) {
          return this
        }

        // Parse the parameters
        const isMatrix = Matrix.isMatrixLike(transforms);
        affine = transforms.affine != null
          ? transforms.affine
          : (affine != null ? affine : !isMatrix);

        // Create a morepher and set its type
        const morpher = new Morphable(this._stepper)
          .type(affine ? TransformBag : Matrix);

        let origin;
        let element;
        let current;
        let currentAngle;
        let startTransform;

        function setup () {
          // make sure element and origin is defined
          element = element || this.element();
          origin = origin || getOrigin(transforms, element);

          startTransform = new Matrix(relative ? undefined : element);

          // add the runner to the element so it can merge transformations
          element._addRunner(this);

          // Deactivate all transforms that have run so far if we are absolute
          if (!relative) {
            element._clearTransformRunnersBefore(this);
          }
        }

        function run (pos) {
          // clear all other transforms before this in case something is saved
          // on this runner. We are absolute. We dont need these!
          if (!relative) this.clearTransform();

          const { x, y } = new Point(origin).transform(element._currentTransform(this));

          let target = new Matrix({ ...transforms, origin: [ x, y ] });
          let start = this._isDeclarative && current
            ? current
            : startTransform;

          if (affine) {
            target = target.decompose(x, y);
            start = start.decompose(x, y);

            // Get the current and target angle as it was set
            const rTarget = target.rotate;
            const rCurrent = start.rotate;

            // Figure out the shortest path to rotate directly
            const possibilities = [ rTarget - 360, rTarget, rTarget + 360 ];
            const distances = possibilities.map(a => Math.abs(a - rCurrent));
            const shortest = Math.min(...distances);
            const index = distances.indexOf(shortest);
            target.rotate = possibilities[index];
          }

          if (relative) {
            // we have to be careful here not to overwrite the rotation
            // with the rotate method of Matrix
            if (!isMatrix) {
              target.rotate = transforms.rotate || 0;
            }
            if (this._isDeclarative && currentAngle) {
              start.rotate = currentAngle;
            }
          }

          morpher.from(start);
          morpher.to(target);

          const affineParameters = morpher.at(pos);
          currentAngle = affineParameters.rotate;
          current = new Matrix(affineParameters);

          this.addTransform(current);
          element._addRunner(this);
          return morpher.done()
        }

        function retarget (newTransforms) {
          // only get a new origin if it changed since the last call
          if (
            (newTransforms.origin || 'center').toString()
            !== (transforms.origin || 'center').toString()
          ) {
            origin = getOrigin(newTransforms, element);
          }

          // overwrite the old transformations with the new ones
          transforms = { ...newTransforms, origin };
        }

        this.queue(setup, run, retarget, true);
        this._isDeclarative && this._rememberMorpher('transform', morpher);
        return this
      },

      // Animatable x-axis
      x (x, relative) {
        return this._queueNumber('x', x)
      },

      // Animatable y-axis
      y (y) {
        return this._queueNumber('y', y)
      },

      dx (x = 0) {
        return this._queueNumberDelta('x', x)
      },

      dy (y = 0) {
        return this._queueNumberDelta('y', y)
      },

      dmove (x, y) {
        return this.dx(x).dy(y)
      },

      _queueNumberDelta (method, to) {
        to = new SVGNumber(to);

        // Try to change the target if we have this method already registerd
        if (this._tryRetarget(method, to)) return this

        // Make a morpher and queue the animation
        const morpher = new Morphable(this._stepper).to(to);
        let from = null;
        this.queue(function () {
          from = this.element()[method]();
          morpher.from(from);
          morpher.to(from + to);
        }, function (pos) {
          this.element()[method](morpher.at(pos));
          return morpher.done()
        }, function (newTo) {
          morpher.to(from + new SVGNumber(newTo));
        });

        // Register the morpher so that if it is changed again, we can retarget it
        this._rememberMorpher(method, morpher);
        return this
      },

      _queueObject (method, to) {
        // Try to change the target if we have this method already registerd
        if (this._tryRetarget(method, to)) return this

        // Make a morpher and queue the animation
        const morpher = new Morphable(this._stepper).to(to);
        this.queue(function () {
          morpher.from(this.element()[method]());
        }, function (pos) {
          this.element()[method](morpher.at(pos));
          return morpher.done()
        });

        // Register the morpher so that if it is changed again, we can retarget it
        this._rememberMorpher(method, morpher);
        return this
      },

      _queueNumber (method, value) {
        return this._queueObject(method, new SVGNumber(value))
      },

      // Animatable center x-axis
      cx (x) {
        return this._queueNumber('cx', x)
      },

      // Animatable center y-axis
      cy (y) {
        return this._queueNumber('cy', y)
      },

      // Add animatable move
      move (x, y) {
        return this.x(x).y(y)
      },

      // Add animatable center
      center (x, y) {
        return this.cx(x).cy(y)
      },

      // Add animatable size
      size (width, height) {
        // animate bbox based size for all other elements
        let box;

        if (!width || !height) {
          box = this._element.bbox();
        }

        if (!width) {
          width = box.width / box.height * height;
        }

        if (!height) {
          height = box.height / box.width * width;
        }

        return this
          .width(width)
          .height(height)
      },

      // Add animatable width
      width (width) {
        return this._queueNumber('width', width)
      },

      // Add animatable height
      height (height) {
        return this._queueNumber('height', height)
      },

      // Add animatable plot
      plot (a, b, c, d) {
        // Lines can be plotted with 4 arguments
        if (arguments.length === 4) {
          return this.plot([ a, b, c, d ])
        }

        if (this._tryRetarget('plot', a)) return this

        const morpher = new Morphable(this._stepper)
          .type(this._element.MorphArray).to(a);

        this.queue(function () {
          morpher.from(this._element.array());
        }, function (pos) {
          this._element.plot(morpher.at(pos));
          return morpher.done()
        });

        this._rememberMorpher('plot', morpher);
        return this
      },

      // Add leading method
      leading (value) {
        return this._queueNumber('leading', value)
      },

      // Add animatable viewbox
      viewbox (x, y, width, height) {
        return this._queueObject('viewbox', new Box(x, y, width, height))
      },

      update (o) {
        if (typeof o !== 'object') {
          return this.update({
            offset: arguments[0],
            color: arguments[1],
            opacity: arguments[2]
          })
        }

        if (o.opacity != null) this.attr('stop-opacity', o.opacity);
        if (o.color != null) this.attr('stop-color', o.color);
        if (o.offset != null) this.attr('offset', o.offset);

        return this
      }
    });

    extend$1(Runner, { rx, ry, from, to });
    register(Runner, 'Runner');

    class Svg extends Container {
      constructor (node, attrs = node) {
        super(nodeOrNew('svg', node), attrs);
        this.namespace();
      }

      // Creates and returns defs element
      defs () {
        if (!this.isRoot()) return this.root().defs()

        return adopt(this.node.querySelector('defs'))
          || this.put(new Defs())
      }

      isRoot () {
        return !this.node.parentNode
          || (!(this.node.parentNode instanceof globals.window.SVGElement) && this.node.parentNode.nodeName !== '#document-fragment')
      }

      // Add namespaces
      namespace () {
        if (!this.isRoot()) return this.root().namespace()
        return this
          .attr({ xmlns: svg, version: '1.1' })
          .attr('xmlns:xlink', xlink, xmlns)
          .attr('xmlns:svgjs', svgjs, xmlns)
      }

      removeNamespace () {
        return this.attr({ xmlns: null, version: null })
          .attr('xmlns:xlink', null, xmlns)
          .attr('xmlns:svgjs', null, xmlns)
      }

      // Check if this is a root svg
      // If not, call root() from this element
      root () {
        if (this.isRoot()) return this
        return super.root()
      }

    }

    registerMethods({
      Container: {
        // Create nested svg document
        nested: wrapWithAttrCheck(function () {
          return this.put(new Svg())
        })
      }
    });

    register(Svg, 'Svg', true);

    class Symbol$1 extends Container {
      // Initialize node
      constructor (node, attrs = node) {
        super(nodeOrNew('symbol', node), attrs);
      }
    }

    registerMethods({
      Container: {
        symbol: wrapWithAttrCheck(function () {
          return this.put(new Symbol$1())
        })
      }
    });

    register(Symbol$1, 'Symbol');

    // Create plain text node
    function plain (text) {
      // clear if build mode is disabled
      if (this._build === false) {
        this.clear();
      }

      // create text node
      this.node.appendChild(globals.document.createTextNode(text));

      return this
    }

    // Get length of text element
    function length () {
      return this.node.getComputedTextLength()
    }

    // Move over x-axis
    // Text is moved by its bounding box
    // text-anchor does NOT matter
    function x$1 (x, box = this.bbox()) {
      if (x == null) {
        return box.x
      }

      return this.attr('x', this.attr('x') + x - box.x)
    }

    // Move over y-axis
    function y$1 (y, box = this.bbox()) {
      if (y == null) {
        return box.y
      }

      return this.attr('y', this.attr('y') + y - box.y)
    }

    function move$1 (x, y, box = this.bbox()) {
      return this.x(x, box).y(y, box)
    }

    // Move center over x-axis
    function cx (x, box = this.bbox()) {
      if (x == null) {
        return box.cx
      }

      return this.attr('x', this.attr('x') + x - box.cx)
    }

    // Move center over y-axis
    function cy (y, box = this.bbox()) {
      if (y == null) {
        return box.cy
      }

      return this.attr('y', this.attr('y') + y - box.cy)
    }

    function center (x, y, box = this.bbox()) {
      return this.cx(x, box).cy(y, box)
    }

    function ax (x) {
      return this.attr('x', x)
    }

    function ay (y) {
      return this.attr('y', y)
    }

    function amove (x, y) {
      return this.ax(x).ay(y)
    }

    // Enable / disable build mode
    function build (build) {
      this._build = !!build;
      return this
    }

    var textable = /*#__PURE__*/Object.freeze({
        __proto__: null,
        plain: plain,
        length: length,
        x: x$1,
        y: y$1,
        move: move$1,
        cx: cx,
        cy: cy,
        center: center,
        ax: ax,
        ay: ay,
        amove: amove,
        build: build
    });

    class Text extends Shape {
      // Initialize node
      constructor (node, attrs = node) {
        super(nodeOrNew('text', node), attrs);

        this.dom.leading = new SVGNumber(1.3); // store leading value for rebuilding
        this._rebuild = true; // enable automatic updating of dy values
        this._build = false; // disable build mode for adding multiple lines
      }

      // Set / get leading
      leading (value) {
        // act as getter
        if (value == null) {
          return this.dom.leading
        }

        // act as setter
        this.dom.leading = new SVGNumber(value);

        return this.rebuild()
      }

      // Rebuild appearance type
      rebuild (rebuild) {
        // store new rebuild flag if given
        if (typeof rebuild === 'boolean') {
          this._rebuild = rebuild;
        }

        // define position of all lines
        if (this._rebuild) {
          const self = this;
          let blankLineOffset = 0;
          const leading = this.dom.leading;

          this.each(function (i) {
            const fontSize = globals.window.getComputedStyle(this.node)
              .getPropertyValue('font-size');

            const dy = leading * new SVGNumber(fontSize);

            if (this.dom.newLined) {
              this.attr('x', self.attr('x'));

              if (this.text() === '\n') {
                blankLineOffset += dy;
              } else {
                this.attr('dy', i ? dy + blankLineOffset : 0);
                blankLineOffset = 0;
              }
            }
          });

          this.fire('rebuild');
        }

        return this
      }

      // overwrite method from parent to set data properly
      setData (o) {
        this.dom = o;
        this.dom.leading = new SVGNumber(o.leading || 1.3);
        return this
      }

      // Set the text content
      text (text) {
        // act as getter
        if (text === undefined) {
          const children = this.node.childNodes;
          let firstLine = 0;
          text = '';

          for (let i = 0, len = children.length; i < len; ++i) {
            // skip textPaths - they are no lines
            if (children[i].nodeName === 'textPath') {
              if (i === 0) firstLine = 1;
              continue
            }

            // add newline if its not the first child and newLined is set to true
            if (i !== firstLine && children[i].nodeType !== 3 && adopt(children[i]).dom.newLined === true) {
              text += '\n';
            }

            // add content of this node
            text += children[i].textContent;
          }

          return text
        }

        // remove existing content
        this.clear().build(true);

        if (typeof text === 'function') {
          // call block
          text.call(this, this);
        } else {
          // store text and make sure text is not blank
          text = (text + '').split('\n');

          // build new lines
          for (let j = 0, jl = text.length; j < jl; j++) {
            this.newLine(text[j]);
          }
        }

        // disable build mode and rebuild lines
        return this.build(false).rebuild()
      }

    }

    extend$1(Text, textable);

    registerMethods({
      Container: {
        // Create text element
        text: wrapWithAttrCheck(function (text = '') {
          return this.put(new Text()).text(text)
        }),

        // Create plain text element
        plain: wrapWithAttrCheck(function (text = '') {
          return this.put(new Text()).plain(text)
        })
      }
    });

    register(Text, 'Text');

    class Tspan extends Shape {
      // Initialize node
      constructor (node, attrs = node) {
        super(nodeOrNew('tspan', node), attrs);
        this._build = false; // disable build mode for adding multiple lines
      }

      // Shortcut dx
      dx (dx) {
        return this.attr('dx', dx)
      }

      // Shortcut dy
      dy (dy) {
        return this.attr('dy', dy)
      }

      // Create new line
      newLine () {
        // mark new line
        this.dom.newLined = true;

        // fetch parent
        const text = this.parent();

        // early return in case we are not in a text element
        if (!(text instanceof Text)) {
          return this
        }

        const i = text.index(this);

        const fontSize = globals.window.getComputedStyle(this.node)
          .getPropertyValue('font-size');
        const dy = text.dom.leading * new SVGNumber(fontSize);

        // apply new position
        return this.dy(i ? dy : 0).attr('x', text.x())
      }

      // Set text content
      text (text) {
        if (text == null) return this.node.textContent + (this.dom.newLined ? '\n' : '')

        if (typeof text === 'function') {
          this.clear().build(true);
          text.call(this, this);
          this.build(false);
        } else {
          this.plain(text);
        }

        return this
      }

    }

    extend$1(Tspan, textable);

    registerMethods({
      Tspan: {
        tspan: wrapWithAttrCheck(function (text = '') {
          const tspan = new Tspan();

          // clear if build mode is disabled
          if (!this._build) {
            this.clear();
          }

          // add new tspan
          return this.put(tspan).text(text)
        })
      },
      Text: {
        newLine: function (text = '') {
          return this.tspan(text).newLine()
        }
      }
    });

    register(Tspan, 'Tspan');

    class Circle extends Shape {
      constructor (node, attrs = node) {
        super(nodeOrNew('circle', node), attrs);
      }

      radius (r) {
        return this.attr('r', r)
      }

      // Radius x value
      rx (rx) {
        return this.attr('r', rx)
      }

      // Alias radius x value
      ry (ry) {
        return this.rx(ry)
      }

      size (size) {
        return this.radius(new SVGNumber(size).divide(2))
      }
    }

    extend$1(Circle, { x: x$3, y: y$3, cx: cx$1, cy: cy$1, width: width$2, height: height$2 });

    registerMethods({
      Container: {
        // Create circle element
        circle: wrapWithAttrCheck(function (size = 0) {
          return this.put(new Circle())
            .size(size)
            .move(0, 0)
        })
      }
    });

    register(Circle, 'Circle');

    class ClipPath extends Container {
      constructor (node, attrs = node) {
        super(nodeOrNew('clipPath', node), attrs);
      }

      // Unclip all clipped elements and remove itself
      remove () {
        // unclip all targets
        this.targets().forEach(function (el) {
          el.unclip();
        });

        // remove clipPath from parent
        return super.remove()
      }

      targets () {
        return baseFind('svg [clip-path*="' + this.id() + '"]')
      }
    }

    registerMethods({
      Container: {
        // Create clipping element
        clip: wrapWithAttrCheck(function () {
          return this.defs().put(new ClipPath())
        })
      },
      Element: {
        // Distribute clipPath to svg element
        clipper () {
          return this.reference('clip-path')
        },

        clipWith (element) {
          // use given clip or create a new one
          const clipper = element instanceof ClipPath
            ? element
            : this.parent().clip().add(element);

          // apply mask
          return this.attr('clip-path', 'url("#' + clipper.id() + '")')
        },

        // Unclip element
        unclip () {
          return this.attr('clip-path', null)
        }
      }
    });

    register(ClipPath, 'ClipPath');

    class ForeignObject extends Element {
      constructor (node, attrs = node) {
        super(nodeOrNew('foreignObject', node), attrs);
      }
    }

    registerMethods({
      Container: {
        foreignObject: wrapWithAttrCheck(function (width, height) {
          return this.put(new ForeignObject()).size(width, height)
        })
      }
    });

    register(ForeignObject, 'ForeignObject');

    function dmove (dx, dy) {
      this.children().forEach((child, i) => {

        let bbox;

        // We have to wrap this for elements that dont have a bbox
        // e.g. title and other descriptive elements
        try {
          // Get the childs bbox
          bbox = child.bbox();
        } catch (e) {
          return
        }

        // Get childs matrix
        const m = new Matrix(child);
        // Translate childs matrix by amount and
        // transform it back into parents space
        const matrix = m.translate(dx, dy).transform(m.inverse());
        // Calculate new x and y from old box
        const p = new Point(bbox.x, bbox.y).transform(matrix);
        // Move element
        child.move(p.x, p.y);
      });

      return this
    }

    function dx (dx) {
      return this.dmove(dx, 0)
    }

    function dy (dy) {
      return this.dmove(0, dy)
    }

    function height (height, box = this.bbox()) {
      if (height == null) return box.height
      return this.size(box.width, height, box)
    }

    function move (x = 0, y = 0, box = this.bbox()) {
      const dx = x - box.x;
      const dy = y - box.y;

      return this.dmove(dx, dy)
    }

    function size (width, height, box = this.bbox()) {
      const p = proportionalSize(this, width, height, box);
      const scaleX = p.width / box.width;
      const scaleY = p.height / box.height;

      this.children().forEach((child, i) => {
        const o = new Point(box).transform(new Matrix(child).inverse());
        child.scale(scaleX, scaleY, o.x, o.y);
      });

      return this
    }

    function width (width, box = this.bbox()) {
      if (width == null) return box.width
      return this.size(width, box.height, box)
    }

    function x (x, box = this.bbox()) {
      if (x == null) return box.x
      return this.move(x, box.y, box)
    }

    function y (y, box = this.bbox()) {
      if (y == null) return box.y
      return this.move(box.x, y, box)
    }

    var containerGeometry = /*#__PURE__*/Object.freeze({
        __proto__: null,
        dmove: dmove,
        dx: dx,
        dy: dy,
        height: height,
        move: move,
        size: size,
        width: width,
        x: x,
        y: y
    });

    class G extends Container {
      constructor (node, attrs = node) {
        super(nodeOrNew('g', node), attrs);
      }
    }

    extend$1(G, containerGeometry);

    registerMethods({
      Container: {
        // Create a group element
        group: wrapWithAttrCheck(function () {
          return this.put(new G())
        })
      }
    });

    register(G, 'G');

    class A extends Container {
      constructor (node, attrs = node) {
        super(nodeOrNew('a', node), attrs);
      }

      // Link target attribute
      target (target) {
        return this.attr('target', target)
      }

      // Link url
      to (url) {
        return this.attr('href', url, xlink)
      }

    }

    extend$1(A, containerGeometry);

    registerMethods({
      Container: {
        // Create a hyperlink element
        link: wrapWithAttrCheck(function (url) {
          return this.put(new A()).to(url)
        })
      },
      Element: {
        unlink () {
          const link = this.linker();

          if (!link) return this

          const parent = link.parent();

          if (!parent) {
            return this.remove()
          }

          const index = parent.index(link);
          parent.add(this, index);

          link.remove();
          return this
        },
        linkTo (url) {
          // reuse old link if possible
          let link = this.linker();

          if (!link) {
            link = new A();
            this.wrap(link);
          }

          if (typeof url === 'function') {
            url.call(link, link);
          } else {
            link.to(url);
          }

          return this
        },
        linker () {
          const link = this.parent();
          if (link && link.node.nodeName.toLowerCase() === 'a') {
            return link
          }

          return null
        }
      }
    });

    register(A, 'A');

    class Mask extends Container {
      // Initialize node
      constructor (node, attrs = node) {
        super(nodeOrNew('mask', node), attrs);
      }

      // Unmask all masked elements and remove itself
      remove () {
        // unmask all targets
        this.targets().forEach(function (el) {
          el.unmask();
        });

        // remove mask from parent
        return super.remove()
      }

      targets () {
        return baseFind('svg [mask*="' + this.id() + '"]')
      }
    }

    registerMethods({
      Container: {
        mask: wrapWithAttrCheck(function () {
          return this.defs().put(new Mask())
        })
      },
      Element: {
        // Distribute mask to svg element
        masker () {
          return this.reference('mask')
        },

        maskWith (element) {
          // use given mask or create a new one
          const masker = element instanceof Mask
            ? element
            : this.parent().mask().add(element);

          // apply mask
          return this.attr('mask', 'url("#' + masker.id() + '")')
        },

        // Unmask element
        unmask () {
          return this.attr('mask', null)
        }
      }
    });

    register(Mask, 'Mask');

    class Stop extends Element {
      constructor (node, attrs = node) {
        super(nodeOrNew('stop', node), attrs);
      }

      // add color stops
      update (o) {
        if (typeof o === 'number' || o instanceof SVGNumber) {
          o = {
            offset: arguments[0],
            color: arguments[1],
            opacity: arguments[2]
          };
        }

        // set attributes
        if (o.opacity != null) this.attr('stop-opacity', o.opacity);
        if (o.color != null) this.attr('stop-color', o.color);
        if (o.offset != null) this.attr('offset', new SVGNumber(o.offset));

        return this
      }
    }

    registerMethods({
      Gradient: {
        // Add a color stop
        stop: function (offset, color, opacity) {
          return this.put(new Stop()).update(offset, color, opacity)
        }
      }
    });

    register(Stop, 'Stop');

    function cssRule (selector, rule) {
      if (!selector) return ''
      if (!rule) return selector

      let ret = selector + '{';

      for (const i in rule) {
        ret += unCamelCase(i) + ':' + rule[i] + ';';
      }

      ret += '}';

      return ret
    }

    class Style extends Element {
      constructor (node, attrs = node) {
        super(nodeOrNew('style', node), attrs);
      }

      addText (w = '') {
        this.node.textContent += w;
        return this
      }

      font (name, src, params = {}) {
        return this.rule('@font-face', {
          fontFamily: name,
          src: src,
          ...params
        })
      }

      rule (selector, obj) {
        return this.addText(cssRule(selector, obj))
      }
    }

    registerMethods('Dom', {
      style (selector, obj) {
        return this.put(new Style()).rule(selector, obj)
      },
      fontface  (name, src, params) {
        return this.put(new Style()).font(name, src, params)
      }
    });

    register(Style, 'Style');

    class TextPath extends Text {
      // Initialize node
      constructor (node, attrs = node) {
        super(nodeOrNew('textPath', node), attrs);
      }

      // return the array of the path track element
      array () {
        const track = this.track();

        return track ? track.array() : null
      }

      // Plot path if any
      plot (d) {
        const track = this.track();
        let pathArray = null;

        if (track) {
          pathArray = track.plot(d);
        }

        return (d == null) ? pathArray : this
      }

      // Get the path element
      track () {
        return this.reference('href')
      }
    }

    registerMethods({
      Container: {
        textPath: wrapWithAttrCheck(function (text, path) {
          // Convert text to instance if needed
          if (!(text instanceof Text)) {
            text = this.text(text);
          }

          return text.path(path)
        })
      },
      Text: {
        // Create path for text to run on
        path: wrapWithAttrCheck(function (track, importNodes = true) {
          const textPath = new TextPath();

          // if track is a path, reuse it
          if (!(track instanceof Path)) {
            // create path element
            track = this.defs().path(track);
          }

          // link textPath to path and add content
          textPath.attr('href', '#' + track, xlink);

          // Transplant all nodes from text to textPath
          let node;
          if (importNodes) {
            while ((node = this.node.firstChild)) {
              textPath.node.appendChild(node);
            }
          }

          // add textPath element as child node and return textPath
          return this.put(textPath)
        }),

        // Get the textPath children
        textPath () {
          return this.findOne('textPath')
        }
      },
      Path: {
        // creates a textPath from this path
        text: wrapWithAttrCheck(function (text) {
          // Convert text to instance if needed
          if (!(text instanceof Text)) {
            text = new Text().addTo(this.parent()).text(text);
          }

          // Create textPath from text and path and return
          return text.path(this)
        }),

        targets () {
          return baseFind('svg textPath').filter((node) => {
            return (node.attr('href') || '').includes(this.id())
          })

          // Does not work in IE11. Use when IE support is dropped
          // return baseFind('svg textPath[*|href*="' + this.id() + '"]')
        }
      }
    });

    TextPath.prototype.MorphArray = PathArray;
    register(TextPath, 'TextPath');

    class Use extends Shape {
      constructor (node, attrs = node) {
        super(nodeOrNew('use', node), attrs);
      }

      // Use element as a reference
      use (element, file) {
        // Set lined element
        return this.attr('href', (file || '') + '#' + element, xlink)
      }
    }

    registerMethods({
      Container: {
        // Create a use element
        use: wrapWithAttrCheck(function (element, file) {
          return this.put(new Use()).use(element, file)
        })
      }
    });

    register(Use, 'Use');

    /* Optional Modules */
    const SVG = makeInstance;

    extend$1([
      Svg,
      Symbol$1,
      Image,
      Pattern,
      Marker
    ], getMethodsFor('viewbox'));

    extend$1([
      Line,
      Polyline,
      Polygon,
      Path
    ], getMethodsFor('marker'));

    extend$1(Text, getMethodsFor('Text'));
    extend$1(Path, getMethodsFor('Path'));

    extend$1(Defs, getMethodsFor('Defs'));

    extend$1([
      Text,
      Tspan
    ], getMethodsFor('Tspan'));

    extend$1([
      Rect,
      Ellipse,
      Gradient,
      Runner
    ], getMethodsFor('radius'));

    extend$1(EventTarget, getMethodsFor('EventTarget'));
    extend$1(Dom, getMethodsFor('Dom'));
    extend$1(Element, getMethodsFor('Element'));
    extend$1(Shape, getMethodsFor('Shape'));
    extend$1([ Container, Fragment ], getMethodsFor('Container'));
    extend$1(Gradient, getMethodsFor('Gradient'));

    extend$1(Runner, getMethodsFor('Runner'));

    List.extend(getMethodNames());

    registerMorphableType([
      SVGNumber,
      Color,
      Box,
      Matrix,
      SVGArray,
      PointArray,
      PathArray,
      Point
    ]);

    makeMorphable();

    const paulTolColors = ["#332288", "#6699cc", "#88ccee", "#44aa99", "#117733", "#999933", "#ddcc77", "#661100", "#cc6677", "#aa4466", "#882255", "#aa4499"];
    function drawStrings(svg, fretBoard, svgWidth) {
        for (let i = 0; i < stringCount(fretBoard); i++) {
            svg.line(0, 0, svgWidth, 0)
                .move(20, 20 + (i * 20))
                .stroke({ color: 'grey', width: 3, linecap: 'round' });
        }
    }
    function drawFrets(svg, fretBoard, fretSpacing) {
        for (let i = 0; i < fretCount(fretBoard) + 1; i++) {
            svg.line(0, 0, 0, 20 * (stringCount(fretBoard) - 1))
                .move(20 + (i * fretSpacing), 20)
                .stroke({ color: 'grey', width: 3, linecap: 'round' });
        }
    }
    function drawNut(svg, fretBoard) {
        svg.line(0, 0, 0, 20 * (stringCount(fretBoard) - 1))
            .move(25, 20)
            .stroke({ color: 'grey', width: 3, linecap: 'round' });
    }
    function drawInlays(svg, fretBoard, fretSpacing) {
        const stringHeight = stringCount(fretBoard) * 20;
        const diameter = 10;
        const radius = diameter / 2;
        const inlayVals = new Set();
        [3, 5, 7, 9, 15, 17, 19, 21, 27, 29, 31, 33].reduce((s, e) => s.add(e), inlayVals);
        const octaveVals = new Set();
        [12, 24, 36].reduce((s, e) => s.add(e), octaveVals);
        for (let i = 0; i < fretCount(fretBoard) + 1; i++) {
            if (octaveVals.has(i)) {
                svg.circle(diameter).move(fretSpacing * i - (fretSpacing / 4) + radius, (20 * 2) + radius);
                svg.circle(diameter).move(fretSpacing * i - (fretSpacing / 4) + radius, (stringHeight - (20 * 2)) + radius);
            }
            if (inlayVals.has(i)) {
                svg.circle(diameter).move(fretSpacing * i - (fretSpacing / 4) + radius, stringHeight / 2 + radius);
            }
        }
    }
    function noteColor(octave) {
        return paulTolColors[((octave + 3) * 2) % 12];
    }
    function drawNote(svg, currentNote, fretSpacing, diameter) {
        const { note, octave, string, fret } = currentNote;
        const radius = diameter / 2;
        const freq = Math.round(noteFreq(note, octave));
        const x = fretSpacing * fret;
        svg.circle(diameter)
            .move(x, (diameter * string) - radius)
            .stroke({ color: noteColor(octave) })
            .fill({ color: noteColor(octave) })
            .addClass(`note-${note}`)
            .addClass(`octave-${octave}`)
            .addClass(`freq-${freq}`);
        svg.text(`${note}${octave}`)
            .move(x, (diameter * string) - radius)
            .font({ family: 'Helvetica',
            size: '0.75em',
            weight: 'bold' })
            .addClass(`note-${note}`)
            .addClass(`octave-${octave}`)
            .addClass(`freq-${freq}`);
        svg.circle(diameter)
            .move(x, (diameter * string) - radius)
            .stroke({ color: "white",
            width: 2 })
            .fill({ color: "none" })
            .addClass(`plucked`)
            .addClass(`note-${note}`)
            .addClass(`octave-${octave}`)
            .addClass(`freq-${freq}`);
    }
    function drawNotes(svg, fretBoard, fretSpacing) {
        const diameter = 20;
        map$1(fretBoard, currentNote => drawNote(svg, currentNote, fretSpacing, diameter));
    }
    function drawGuitar(parentDiv, fretBoard, svgWidth = 1000) {
        const svgWidthPadding = 20;
        const frets = flow$1(x => map$1(x, "fret"), max)(fretBoard);
        const fretSpacing = Math.round(svgWidth / frets);
        let svg = SVG().addTo(parentDiv).size(svgWidth + svgWidthPadding, 300);
        drawInlays(svg, fretBoard, fretSpacing);
        drawFrets(svg, fretBoard, fretSpacing);
        drawNut(svg, fretBoard);
        drawStrings(svg, fretBoard, svgWidth);
        drawNotes(svg, fretBoard, fretSpacing);
    }

    function setAllAttributes(els, name, value) {
        if (els) {
            els.forEach(el => { el.setAttribute(name, value); });
        }
    }
    let previousTimeStamp;
    function processPluckedCircle(el, deltaT) {
        let strokeOpacity = el.getAttribute("stroke-opacity");
        let strokeOpacityNumber = parseFloat(strokeOpacity);
        const chi = 0.01;
        if (strokeOpacityNumber > 0) {
            strokeOpacityNumber -= deltaT * chi;
            strokeOpacityNumber = strokeOpacityNumber < 0 ? 0 : strokeOpacityNumber;
            el.setAttribute("stroke-opacity", strokeOpacityNumber.toString());
        }
    }
    function step(timestamp) {
        if (previousTimeStamp !== timestamp) {
            Array.from(document.querySelectorAll('.plucked')).map(el => processPluckedCircle(el, timestamp - previousTimeStamp));
        }
        previousTimeStamp = timestamp;
        window.requestAnimationFrame(step);
    }
    function notePluckListener(e) {
        if (e) {
            let { note, octave } = e.detail;
            let query = `.plucked.note-${note}.octave-${octave}`;
            query = query.replace("#", "\\#");
            setAllAttributes(document.querySelectorAll(query), "stroke-opacity", "1");
        }
    }
    function guitarController() {
        setAllAttributes(document.querySelectorAll("[class*='plucked']"), "stroke-opacity", "0");
    }

    function selectNotes(fretBoard, frets, strings) {
        const filterFret = (fretBoard) => filter$1(fretBoard, (note) => {
            if (isUndefined(frets) || isEmpty(frets)) {
                return true;
            }
            else {
                return (includes(frets, note.fret));
            }
        });
        const filterStrings = (fretBoard) => filter$1(fretBoard, (note) => {
            if (isUndefined(strings) || isEmpty(strings)) {
                return true;
            }
            else {
                return (includes(strings, note.string));
            }
        });
        return (flow$1(filterFret, filterStrings))(fretBoard);
    }

    function renderCurrentNote(note) {
        return (`<div id=guitar-note-trainer-current-note>${note.note}${note.octave}</div>`);
    }
    function renderIsGuessCorrect(correct) {
        let html = '';
        switch (correct) {
            case (null):
                html = `<div></div>`;
                break;
            case (false):
                html = `<div class='guitar-note-trainer-incorrect'>Incorrect Guess</div>`;
                break;
            case (true):
                html = `<div class='guitar-note-trainer-correct'>Correct!</div>`;
                break;
        }
        return html;
    }

    let currentNote = null;
    let guessIsCorrect = null;
    function createGuessNoteEventDetail(noteAsked, noteGiven) {
        return ({ noteAsked: noteAsked,
            noteGiven: noteGiven,
            timestamp: Date.now(),
            uuid: crypto.randomUUID(),
            correctGuess: (noteAsked === noteGiven),
            type: "guitar-note-trainer/guess-note" });
    }
    function guessNotes(parentDiv, fretBoard, frets, strings) {
        let timeSeenMin = 100;
        let deviationTolerance = 1;
        const subFretBoard = selectNotes(fretBoard, frets, strings);
        currentNote = sample(subFretBoard);
        render();
        function guessNotesAudioSignalListener(e) {
            let timeSeen = e.timeStamp - currentNoteFirstSeenTimeStamp;
            let deviation = Math.abs(e.detail.deviation);
            if (currentNoteName && (timeSeen > timeSeenMin) && isNull(guessIsCorrect) && (deviation < deviationTolerance)) {
                const signalNoteName = noteName(e.detail);
                if (signalNoteName === noteName(currentNote)) {
                    guessIsCorrect = true;
                    publishEvent("guitar-note-trainer/guess-note", createGuessNoteEventDetail(currentNote, e.detail));
                }
                else {
                    guessIsCorrect = false;
                    publishEvent("guitar-note-trainer/guess-note", createGuessNoteEventDetail(currentNote, e.detail));
                }
                render();
            }
            else if (!currentNoteName && (timeSeen > 300) && !isNull(guessIsCorrect)) {
                currentNote = sample(subFretBoard);
                guessIsCorrect = null;
                render();
            }
        }
        function render() {
            let selectedNoteHTML = renderCurrentNote(currentNote);
            let guessHTML = renderIsGuessCorrect(guessIsCorrect);
            parentDiv.innerHTML = `<div>${selectedNoteHTML} ${guessHTML}</div>`;
        }
        addEventListener('audioSignal', guessNotesAudioSignalListener);
    }

    /*
     * Dexie.js - a minimalistic wrapper for IndexedDB
     * ===============================================
     *
     * By David Fahlander, david.fahlander@gmail.com
     *
     * Version 3.2.2, Wed Apr 27 2022
     *
     * https://dexie.org
     *
     * Apache License Version 2.0, January 2004, http://www.apache.org/licenses/
     */
     
    const _global = typeof globalThis !== 'undefined' ? globalThis :
        typeof self !== 'undefined' ? self :
            typeof window !== 'undefined' ? window :
                global;

    const keys = Object.keys;
    const isArray = Array.isArray;
    if (typeof Promise !== 'undefined' && !_global.Promise) {
        _global.Promise = Promise;
    }
    function extend(obj, extension) {
        if (typeof extension !== 'object')
            return obj;
        keys(extension).forEach(function (key) {
            obj[key] = extension[key];
        });
        return obj;
    }
    const getProto = Object.getPrototypeOf;
    const _hasOwn = {}.hasOwnProperty;
    function hasOwn(obj, prop) {
        return _hasOwn.call(obj, prop);
    }
    function props(proto, extension) {
        if (typeof extension === 'function')
            extension = extension(getProto(proto));
        (typeof Reflect === "undefined" ? keys : Reflect.ownKeys)(extension).forEach(key => {
            setProp(proto, key, extension[key]);
        });
    }
    const defineProperty = Object.defineProperty;
    function setProp(obj, prop, functionOrGetSet, options) {
        defineProperty(obj, prop, extend(functionOrGetSet && hasOwn(functionOrGetSet, "get") && typeof functionOrGetSet.get === 'function' ?
            { get: functionOrGetSet.get, set: functionOrGetSet.set, configurable: true } :
            { value: functionOrGetSet, configurable: true, writable: true }, options));
    }
    function derive(Child) {
        return {
            from: function (Parent) {
                Child.prototype = Object.create(Parent.prototype);
                setProp(Child.prototype, "constructor", Child);
                return {
                    extend: props.bind(null, Child.prototype)
                };
            }
        };
    }
    const getOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;
    function getPropertyDescriptor(obj, prop) {
        const pd = getOwnPropertyDescriptor(obj, prop);
        let proto;
        return pd || (proto = getProto(obj)) && getPropertyDescriptor(proto, prop);
    }
    const _slice = [].slice;
    function slice(args, start, end) {
        return _slice.call(args, start, end);
    }
    function override(origFunc, overridedFactory) {
        return overridedFactory(origFunc);
    }
    function assert(b) {
        if (!b)
            throw new Error("Assertion Failed");
    }
    function asap$1(fn) {
        if (_global.setImmediate)
            setImmediate(fn);
        else
            setTimeout(fn, 0);
    }
    function arrayToObject(array, extractor) {
        return array.reduce((result, item, i) => {
            var nameAndValue = extractor(item, i);
            if (nameAndValue)
                result[nameAndValue[0]] = nameAndValue[1];
            return result;
        }, {});
    }
    function tryCatch(fn, onerror, args) {
        try {
            fn.apply(null, args);
        }
        catch (ex) {
            onerror && onerror(ex);
        }
    }
    function getByKeyPath(obj, keyPath) {
        if (hasOwn(obj, keyPath))
            return obj[keyPath];
        if (!keyPath)
            return obj;
        if (typeof keyPath !== 'string') {
            var rv = [];
            for (var i = 0, l = keyPath.length; i < l; ++i) {
                var val = getByKeyPath(obj, keyPath[i]);
                rv.push(val);
            }
            return rv;
        }
        var period = keyPath.indexOf('.');
        if (period !== -1) {
            var innerObj = obj[keyPath.substr(0, period)];
            return innerObj === undefined ? undefined : getByKeyPath(innerObj, keyPath.substr(period + 1));
        }
        return undefined;
    }
    function setByKeyPath(obj, keyPath, value) {
        if (!obj || keyPath === undefined)
            return;
        if ('isFrozen' in Object && Object.isFrozen(obj))
            return;
        if (typeof keyPath !== 'string' && 'length' in keyPath) {
            assert(typeof value !== 'string' && 'length' in value);
            for (var i = 0, l = keyPath.length; i < l; ++i) {
                setByKeyPath(obj, keyPath[i], value[i]);
            }
        }
        else {
            var period = keyPath.indexOf('.');
            if (period !== -1) {
                var currentKeyPath = keyPath.substr(0, period);
                var remainingKeyPath = keyPath.substr(period + 1);
                if (remainingKeyPath === "")
                    if (value === undefined) {
                        if (isArray(obj) && !isNaN(parseInt(currentKeyPath)))
                            obj.splice(currentKeyPath, 1);
                        else
                            delete obj[currentKeyPath];
                    }
                    else
                        obj[currentKeyPath] = value;
                else {
                    var innerObj = obj[currentKeyPath];
                    if (!innerObj || !hasOwn(obj, currentKeyPath))
                        innerObj = (obj[currentKeyPath] = {});
                    setByKeyPath(innerObj, remainingKeyPath, value);
                }
            }
            else {
                if (value === undefined) {
                    if (isArray(obj) && !isNaN(parseInt(keyPath)))
                        obj.splice(keyPath, 1);
                    else
                        delete obj[keyPath];
                }
                else
                    obj[keyPath] = value;
            }
        }
    }
    function delByKeyPath(obj, keyPath) {
        if (typeof keyPath === 'string')
            setByKeyPath(obj, keyPath, undefined);
        else if ('length' in keyPath)
            [].map.call(keyPath, function (kp) {
                setByKeyPath(obj, kp, undefined);
            });
    }
    function shallowClone(obj) {
        var rv = {};
        for (var m in obj) {
            if (hasOwn(obj, m))
                rv[m] = obj[m];
        }
        return rv;
    }
    const concat = [].concat;
    function flatten(a) {
        return concat.apply([], a);
    }
    const intrinsicTypeNames = "Boolean,String,Date,RegExp,Blob,File,FileList,FileSystemFileHandle,ArrayBuffer,DataView,Uint8ClampedArray,ImageBitmap,ImageData,Map,Set,CryptoKey"
        .split(',').concat(flatten([8, 16, 32, 64].map(num => ["Int", "Uint", "Float"].map(t => t + num + "Array")))).filter(t => _global[t]);
    const intrinsicTypes = intrinsicTypeNames.map(t => _global[t]);
    arrayToObject(intrinsicTypeNames, x => [x, true]);
    let circularRefs = null;
    function deepClone(any) {
        circularRefs = typeof WeakMap !== 'undefined' && new WeakMap();
        const rv = innerDeepClone(any);
        circularRefs = null;
        return rv;
    }
    function innerDeepClone(any) {
        if (!any || typeof any !== 'object')
            return any;
        let rv = circularRefs && circularRefs.get(any);
        if (rv)
            return rv;
        if (isArray(any)) {
            rv = [];
            circularRefs && circularRefs.set(any, rv);
            for (var i = 0, l = any.length; i < l; ++i) {
                rv.push(innerDeepClone(any[i]));
            }
        }
        else if (intrinsicTypes.indexOf(any.constructor) >= 0) {
            rv = any;
        }
        else {
            const proto = getProto(any);
            rv = proto === Object.prototype ? {} : Object.create(proto);
            circularRefs && circularRefs.set(any, rv);
            for (var prop in any) {
                if (hasOwn(any, prop)) {
                    rv[prop] = innerDeepClone(any[prop]);
                }
            }
        }
        return rv;
    }
    const { toString } = {};
    function toStringTag(o) {
        return toString.call(o).slice(8, -1);
    }
    const iteratorSymbol = typeof Symbol !== 'undefined' ?
        Symbol.iterator :
        '@@iterator';
    const getIteratorOf = typeof iteratorSymbol === "symbol" ? function (x) {
        var i;
        return x != null && (i = x[iteratorSymbol]) && i.apply(x);
    } : function () { return null; };
    const NO_CHAR_ARRAY = {};
    function getArrayOf(arrayLike) {
        var i, a, x, it;
        if (arguments.length === 1) {
            if (isArray(arrayLike))
                return arrayLike.slice();
            if (this === NO_CHAR_ARRAY && typeof arrayLike === 'string')
                return [arrayLike];
            if ((it = getIteratorOf(arrayLike))) {
                a = [];
                while ((x = it.next()), !x.done)
                    a.push(x.value);
                return a;
            }
            if (arrayLike == null)
                return [arrayLike];
            i = arrayLike.length;
            if (typeof i === 'number') {
                a = new Array(i);
                while (i--)
                    a[i] = arrayLike[i];
                return a;
            }
            return [arrayLike];
        }
        i = arguments.length;
        a = new Array(i);
        while (i--)
            a[i] = arguments[i];
        return a;
    }
    const isAsyncFunction = typeof Symbol !== 'undefined'
        ? (fn) => fn[Symbol.toStringTag] === 'AsyncFunction'
        : () => false;

    var debug = typeof location !== 'undefined' &&
        /^(http|https):\/\/(localhost|127\.0\.0\.1)/.test(location.href);
    function setDebug(value, filter) {
        debug = value;
        libraryFilter = filter;
    }
    var libraryFilter = () => true;
    const NEEDS_THROW_FOR_STACK = !new Error("").stack;
    function getErrorWithStack() {
        if (NEEDS_THROW_FOR_STACK)
            try {
                getErrorWithStack.arguments;
                throw new Error();
            }
            catch (e) {
                return e;
            }
        return new Error();
    }
    function prettyStack(exception, numIgnoredFrames) {
        var stack = exception.stack;
        if (!stack)
            return "";
        numIgnoredFrames = (numIgnoredFrames || 0);
        if (stack.indexOf(exception.name) === 0)
            numIgnoredFrames += (exception.name + exception.message).split('\n').length;
        return stack.split('\n')
            .slice(numIgnoredFrames)
            .filter(libraryFilter)
            .map(frame => "\n" + frame)
            .join('');
    }

    var dexieErrorNames = [
        'Modify',
        'Bulk',
        'OpenFailed',
        'VersionChange',
        'Schema',
        'Upgrade',
        'InvalidTable',
        'MissingAPI',
        'NoSuchDatabase',
        'InvalidArgument',
        'SubTransaction',
        'Unsupported',
        'Internal',
        'DatabaseClosed',
        'PrematureCommit',
        'ForeignAwait'
    ];
    var idbDomErrorNames = [
        'Unknown',
        'Constraint',
        'Data',
        'TransactionInactive',
        'ReadOnly',
        'Version',
        'NotFound',
        'InvalidState',
        'InvalidAccess',
        'Abort',
        'Timeout',
        'QuotaExceeded',
        'Syntax',
        'DataClone'
    ];
    var errorList = dexieErrorNames.concat(idbDomErrorNames);
    var defaultTexts = {
        VersionChanged: "Database version changed by other database connection",
        DatabaseClosed: "Database has been closed",
        Abort: "Transaction aborted",
        TransactionInactive: "Transaction has already completed or failed",
        MissingAPI: "IndexedDB API missing. Please visit https://tinyurl.com/y2uuvskb"
    };
    function DexieError(name, msg) {
        this._e = getErrorWithStack();
        this.name = name;
        this.message = msg;
    }
    derive(DexieError).from(Error).extend({
        stack: {
            get: function () {
                return this._stack ||
                    (this._stack = this.name + ": " + this.message + prettyStack(this._e, 2));
            }
        },
        toString: function () { return this.name + ": " + this.message; }
    });
    function getMultiErrorMessage(msg, failures) {
        return msg + ". Errors: " + Object.keys(failures)
            .map(key => failures[key].toString())
            .filter((v, i, s) => s.indexOf(v) === i)
            .join('\n');
    }
    function ModifyError(msg, failures, successCount, failedKeys) {
        this._e = getErrorWithStack();
        this.failures = failures;
        this.failedKeys = failedKeys;
        this.successCount = successCount;
        this.message = getMultiErrorMessage(msg, failures);
    }
    derive(ModifyError).from(DexieError);
    function BulkError(msg, failures) {
        this._e = getErrorWithStack();
        this.name = "BulkError";
        this.failures = Object.keys(failures).map(pos => failures[pos]);
        this.failuresByPos = failures;
        this.message = getMultiErrorMessage(msg, failures);
    }
    derive(BulkError).from(DexieError);
    var errnames = errorList.reduce((obj, name) => (obj[name] = name + "Error", obj), {});
    const BaseException = DexieError;
    var exceptions = errorList.reduce((obj, name) => {
        var fullName = name + "Error";
        function DexieError(msgOrInner, inner) {
            this._e = getErrorWithStack();
            this.name = fullName;
            if (!msgOrInner) {
                this.message = defaultTexts[name] || fullName;
                this.inner = null;
            }
            else if (typeof msgOrInner === 'string') {
                this.message = `${msgOrInner}${!inner ? '' : '\n ' + inner}`;
                this.inner = inner || null;
            }
            else if (typeof msgOrInner === 'object') {
                this.message = `${msgOrInner.name} ${msgOrInner.message}`;
                this.inner = msgOrInner;
            }
        }
        derive(DexieError).from(BaseException);
        obj[name] = DexieError;
        return obj;
    }, {});
    exceptions.Syntax = SyntaxError;
    exceptions.Type = TypeError;
    exceptions.Range = RangeError;
    var exceptionMap = idbDomErrorNames.reduce((obj, name) => {
        obj[name + "Error"] = exceptions[name];
        return obj;
    }, {});
    function mapError(domError, message) {
        if (!domError || domError instanceof DexieError || domError instanceof TypeError || domError instanceof SyntaxError || !domError.name || !exceptionMap[domError.name])
            return domError;
        var rv = new exceptionMap[domError.name](message || domError.message, domError);
        if ("stack" in domError) {
            setProp(rv, "stack", { get: function () {
                    return this.inner.stack;
                } });
        }
        return rv;
    }
    var fullNameExceptions = errorList.reduce((obj, name) => {
        if (["Syntax", "Type", "Range"].indexOf(name) === -1)
            obj[name + "Error"] = exceptions[name];
        return obj;
    }, {});
    fullNameExceptions.ModifyError = ModifyError;
    fullNameExceptions.DexieError = DexieError;
    fullNameExceptions.BulkError = BulkError;

    function nop() { }
    function mirror(val) { return val; }
    function pureFunctionChain(f1, f2) {
        if (f1 == null || f1 === mirror)
            return f2;
        return function (val) {
            return f2(f1(val));
        };
    }
    function callBoth(on1, on2) {
        return function () {
            on1.apply(this, arguments);
            on2.apply(this, arguments);
        };
    }
    function hookCreatingChain(f1, f2) {
        if (f1 === nop)
            return f2;
        return function () {
            var res = f1.apply(this, arguments);
            if (res !== undefined)
                arguments[0] = res;
            var onsuccess = this.onsuccess,
            onerror = this.onerror;
            this.onsuccess = null;
            this.onerror = null;
            var res2 = f2.apply(this, arguments);
            if (onsuccess)
                this.onsuccess = this.onsuccess ? callBoth(onsuccess, this.onsuccess) : onsuccess;
            if (onerror)
                this.onerror = this.onerror ? callBoth(onerror, this.onerror) : onerror;
            return res2 !== undefined ? res2 : res;
        };
    }
    function hookDeletingChain(f1, f2) {
        if (f1 === nop)
            return f2;
        return function () {
            f1.apply(this, arguments);
            var onsuccess = this.onsuccess,
            onerror = this.onerror;
            this.onsuccess = this.onerror = null;
            f2.apply(this, arguments);
            if (onsuccess)
                this.onsuccess = this.onsuccess ? callBoth(onsuccess, this.onsuccess) : onsuccess;
            if (onerror)
                this.onerror = this.onerror ? callBoth(onerror, this.onerror) : onerror;
        };
    }
    function hookUpdatingChain(f1, f2) {
        if (f1 === nop)
            return f2;
        return function (modifications) {
            var res = f1.apply(this, arguments);
            extend(modifications, res);
            var onsuccess = this.onsuccess,
            onerror = this.onerror;
            this.onsuccess = null;
            this.onerror = null;
            var res2 = f2.apply(this, arguments);
            if (onsuccess)
                this.onsuccess = this.onsuccess ? callBoth(onsuccess, this.onsuccess) : onsuccess;
            if (onerror)
                this.onerror = this.onerror ? callBoth(onerror, this.onerror) : onerror;
            return res === undefined ?
                (res2 === undefined ? undefined : res2) :
                (extend(res, res2));
        };
    }
    function reverseStoppableEventChain(f1, f2) {
        if (f1 === nop)
            return f2;
        return function () {
            if (f2.apply(this, arguments) === false)
                return false;
            return f1.apply(this, arguments);
        };
    }
    function promisableChain(f1, f2) {
        if (f1 === nop)
            return f2;
        return function () {
            var res = f1.apply(this, arguments);
            if (res && typeof res.then === 'function') {
                var thiz = this, i = arguments.length, args = new Array(i);
                while (i--)
                    args[i] = arguments[i];
                return res.then(function () {
                    return f2.apply(thiz, args);
                });
            }
            return f2.apply(this, arguments);
        };
    }

    var INTERNAL = {};
    const LONG_STACKS_CLIP_LIMIT = 100,
    MAX_LONG_STACKS = 20, ZONE_ECHO_LIMIT = 100, [resolvedNativePromise, nativePromiseProto, resolvedGlobalPromise] = typeof Promise === 'undefined' ?
        [] :
        (() => {
            let globalP = Promise.resolve();
            if (typeof crypto === 'undefined' || !crypto.subtle)
                return [globalP, getProto(globalP), globalP];
            const nativeP = crypto.subtle.digest("SHA-512", new Uint8Array([0]));
            return [
                nativeP,
                getProto(nativeP),
                globalP
            ];
        })(), nativePromiseThen = nativePromiseProto && nativePromiseProto.then;
    const NativePromise = resolvedNativePromise && resolvedNativePromise.constructor;
    const patchGlobalPromise = !!resolvedGlobalPromise;
    var stack_being_generated = false;
    var schedulePhysicalTick = resolvedGlobalPromise ?
        () => { resolvedGlobalPromise.then(physicalTick); }
        :
            _global.setImmediate ?
                setImmediate.bind(null, physicalTick) :
                _global.MutationObserver ?
                    () => {
                        var hiddenDiv = document.createElement("div");
                        (new MutationObserver(() => {
                            physicalTick();
                            hiddenDiv = null;
                        })).observe(hiddenDiv, { attributes: true });
                        hiddenDiv.setAttribute('i', '1');
                    } :
                    () => { setTimeout(physicalTick, 0); };
    var asap = function (callback, args) {
        microtickQueue.push([callback, args]);
        if (needsNewPhysicalTick) {
            schedulePhysicalTick();
            needsNewPhysicalTick = false;
        }
    };
    var isOutsideMicroTick = true,
    needsNewPhysicalTick = true,
    unhandledErrors = [],
    rejectingErrors = [],
    currentFulfiller = null, rejectionMapper = mirror;
    var globalPSD = {
        id: 'global',
        global: true,
        ref: 0,
        unhandleds: [],
        onunhandled: globalError,
        pgp: false,
        env: {},
        finalize: function () {
            this.unhandleds.forEach(uh => {
                try {
                    globalError(uh[0], uh[1]);
                }
                catch (e) { }
            });
        }
    };
    var PSD = globalPSD;
    var microtickQueue = [];
    var numScheduledCalls = 0;
    var tickFinalizers = [];
    function DexiePromise(fn) {
        if (typeof this !== 'object')
            throw new TypeError('Promises must be constructed via new');
        this._listeners = [];
        this.onuncatched = nop;
        this._lib = false;
        var psd = (this._PSD = PSD);
        if (debug) {
            this._stackHolder = getErrorWithStack();
            this._prev = null;
            this._numPrev = 0;
        }
        if (typeof fn !== 'function') {
            if (fn !== INTERNAL)
                throw new TypeError('Not a function');
            this._state = arguments[1];
            this._value = arguments[2];
            if (this._state === false)
                handleRejection(this, this._value);
            return;
        }
        this._state = null;
        this._value = null;
        ++psd.ref;
        executePromiseTask(this, fn);
    }
    const thenProp = {
        get: function () {
            var psd = PSD, microTaskId = totalEchoes;
            function then(onFulfilled, onRejected) {
                var possibleAwait = !psd.global && (psd !== PSD || microTaskId !== totalEchoes);
                const cleanup = possibleAwait && !decrementExpectedAwaits();
                var rv = new DexiePromise((resolve, reject) => {
                    propagateToListener(this, new Listener(nativeAwaitCompatibleWrap(onFulfilled, psd, possibleAwait, cleanup), nativeAwaitCompatibleWrap(onRejected, psd, possibleAwait, cleanup), resolve, reject, psd));
                });
                debug && linkToPreviousPromise(rv, this);
                return rv;
            }
            then.prototype = INTERNAL;
            return then;
        },
        set: function (value) {
            setProp(this, 'then', value && value.prototype === INTERNAL ?
                thenProp :
                {
                    get: function () {
                        return value;
                    },
                    set: thenProp.set
                });
        }
    };
    props(DexiePromise.prototype, {
        then: thenProp,
        _then: function (onFulfilled, onRejected) {
            propagateToListener(this, new Listener(null, null, onFulfilled, onRejected, PSD));
        },
        catch: function (onRejected) {
            if (arguments.length === 1)
                return this.then(null, onRejected);
            var type = arguments[0], handler = arguments[1];
            return typeof type === 'function' ? this.then(null, err =>
            err instanceof type ? handler(err) : PromiseReject(err))
                : this.then(null, err =>
                err && err.name === type ? handler(err) : PromiseReject(err));
        },
        finally: function (onFinally) {
            return this.then(value => {
                onFinally();
                return value;
            }, err => {
                onFinally();
                return PromiseReject(err);
            });
        },
        stack: {
            get: function () {
                if (this._stack)
                    return this._stack;
                try {
                    stack_being_generated = true;
                    var stacks = getStack(this, [], MAX_LONG_STACKS);
                    var stack = stacks.join("\nFrom previous: ");
                    if (this._state !== null)
                        this._stack = stack;
                    return stack;
                }
                finally {
                    stack_being_generated = false;
                }
            }
        },
        timeout: function (ms, msg) {
            return ms < Infinity ?
                new DexiePromise((resolve, reject) => {
                    var handle = setTimeout(() => reject(new exceptions.Timeout(msg)), ms);
                    this.then(resolve, reject).finally(clearTimeout.bind(null, handle));
                }) : this;
        }
    });
    if (typeof Symbol !== 'undefined' && Symbol.toStringTag)
        setProp(DexiePromise.prototype, Symbol.toStringTag, 'Dexie.Promise');
    globalPSD.env = snapShot();
    function Listener(onFulfilled, onRejected, resolve, reject, zone) {
        this.onFulfilled = typeof onFulfilled === 'function' ? onFulfilled : null;
        this.onRejected = typeof onRejected === 'function' ? onRejected : null;
        this.resolve = resolve;
        this.reject = reject;
        this.psd = zone;
    }
    props(DexiePromise, {
        all: function () {
            var values = getArrayOf.apply(null, arguments)
                .map(onPossibleParallellAsync);
            return new DexiePromise(function (resolve, reject) {
                if (values.length === 0)
                    resolve([]);
                var remaining = values.length;
                values.forEach((a, i) => DexiePromise.resolve(a).then(x => {
                    values[i] = x;
                    if (!--remaining)
                        resolve(values);
                }, reject));
            });
        },
        resolve: value => {
            if (value instanceof DexiePromise)
                return value;
            if (value && typeof value.then === 'function')
                return new DexiePromise((resolve, reject) => {
                    value.then(resolve, reject);
                });
            var rv = new DexiePromise(INTERNAL, true, value);
            linkToPreviousPromise(rv, currentFulfiller);
            return rv;
        },
        reject: PromiseReject,
        race: function () {
            var values = getArrayOf.apply(null, arguments).map(onPossibleParallellAsync);
            return new DexiePromise((resolve, reject) => {
                values.map(value => DexiePromise.resolve(value).then(resolve, reject));
            });
        },
        PSD: {
            get: () => PSD,
            set: value => PSD = value
        },
        totalEchoes: { get: () => totalEchoes },
        newPSD: newScope,
        usePSD: usePSD,
        scheduler: {
            get: () => asap,
            set: value => { asap = value; }
        },
        rejectionMapper: {
            get: () => rejectionMapper,
            set: value => { rejectionMapper = value; }
        },
        follow: (fn, zoneProps) => {
            return new DexiePromise((resolve, reject) => {
                return newScope((resolve, reject) => {
                    var psd = PSD;
                    psd.unhandleds = [];
                    psd.onunhandled = reject;
                    psd.finalize = callBoth(function () {
                        run_at_end_of_this_or_next_physical_tick(() => {
                            this.unhandleds.length === 0 ? resolve() : reject(this.unhandleds[0]);
                        });
                    }, psd.finalize);
                    fn();
                }, zoneProps, resolve, reject);
            });
        }
    });
    if (NativePromise) {
        if (NativePromise.allSettled)
            setProp(DexiePromise, "allSettled", function () {
                const possiblePromises = getArrayOf.apply(null, arguments).map(onPossibleParallellAsync);
                return new DexiePromise(resolve => {
                    if (possiblePromises.length === 0)
                        resolve([]);
                    let remaining = possiblePromises.length;
                    const results = new Array(remaining);
                    possiblePromises.forEach((p, i) => DexiePromise.resolve(p).then(value => results[i] = { status: "fulfilled", value }, reason => results[i] = { status: "rejected", reason })
                        .then(() => --remaining || resolve(results)));
                });
            });
        if (NativePromise.any && typeof AggregateError !== 'undefined')
            setProp(DexiePromise, "any", function () {
                const possiblePromises = getArrayOf.apply(null, arguments).map(onPossibleParallellAsync);
                return new DexiePromise((resolve, reject) => {
                    if (possiblePromises.length === 0)
                        reject(new AggregateError([]));
                    let remaining = possiblePromises.length;
                    const failures = new Array(remaining);
                    possiblePromises.forEach((p, i) => DexiePromise.resolve(p).then(value => resolve(value), failure => {
                        failures[i] = failure;
                        if (!--remaining)
                            reject(new AggregateError(failures));
                    }));
                });
            });
    }
    function executePromiseTask(promise, fn) {
        try {
            fn(value => {
                if (promise._state !== null)
                    return;
                if (value === promise)
                    throw new TypeError('A promise cannot be resolved with itself.');
                var shouldExecuteTick = promise._lib && beginMicroTickScope();
                if (value && typeof value.then === 'function') {
                    executePromiseTask(promise, (resolve, reject) => {
                        value instanceof DexiePromise ?
                            value._then(resolve, reject) :
                            value.then(resolve, reject);
                    });
                }
                else {
                    promise._state = true;
                    promise._value = value;
                    propagateAllListeners(promise);
                }
                if (shouldExecuteTick)
                    endMicroTickScope();
            }, handleRejection.bind(null, promise));
        }
        catch (ex) {
            handleRejection(promise, ex);
        }
    }
    function handleRejection(promise, reason) {
        rejectingErrors.push(reason);
        if (promise._state !== null)
            return;
        var shouldExecuteTick = promise._lib && beginMicroTickScope();
        reason = rejectionMapper(reason);
        promise._state = false;
        promise._value = reason;
        debug && reason !== null && typeof reason === 'object' && !reason._promise && tryCatch(() => {
            var origProp = getPropertyDescriptor(reason, "stack");
            reason._promise = promise;
            setProp(reason, "stack", {
                get: () => stack_being_generated ?
                    origProp && (origProp.get ?
                        origProp.get.apply(reason) :
                        origProp.value) :
                    promise.stack
            });
        });
        addPossiblyUnhandledError(promise);
        propagateAllListeners(promise);
        if (shouldExecuteTick)
            endMicroTickScope();
    }
    function propagateAllListeners(promise) {
        var listeners = promise._listeners;
        promise._listeners = [];
        for (var i = 0, len = listeners.length; i < len; ++i) {
            propagateToListener(promise, listeners[i]);
        }
        var psd = promise._PSD;
        --psd.ref || psd.finalize();
        if (numScheduledCalls === 0) {
            ++numScheduledCalls;
            asap(() => {
                if (--numScheduledCalls === 0)
                    finalizePhysicalTick();
            }, []);
        }
    }
    function propagateToListener(promise, listener) {
        if (promise._state === null) {
            promise._listeners.push(listener);
            return;
        }
        var cb = promise._state ? listener.onFulfilled : listener.onRejected;
        if (cb === null) {
            return (promise._state ? listener.resolve : listener.reject)(promise._value);
        }
        ++listener.psd.ref;
        ++numScheduledCalls;
        asap(callListener, [cb, promise, listener]);
    }
    function callListener(cb, promise, listener) {
        try {
            currentFulfiller = promise;
            var ret, value = promise._value;
            if (promise._state) {
                ret = cb(value);
            }
            else {
                if (rejectingErrors.length)
                    rejectingErrors = [];
                ret = cb(value);
                if (rejectingErrors.indexOf(value) === -1)
                    markErrorAsHandled(promise);
            }
            listener.resolve(ret);
        }
        catch (e) {
            listener.reject(e);
        }
        finally {
            currentFulfiller = null;
            if (--numScheduledCalls === 0)
                finalizePhysicalTick();
            --listener.psd.ref || listener.psd.finalize();
        }
    }
    function getStack(promise, stacks, limit) {
        if (stacks.length === limit)
            return stacks;
        var stack = "";
        if (promise._state === false) {
            var failure = promise._value, errorName, message;
            if (failure != null) {
                errorName = failure.name || "Error";
                message = failure.message || failure;
                stack = prettyStack(failure, 0);
            }
            else {
                errorName = failure;
                message = "";
            }
            stacks.push(errorName + (message ? ": " + message : "") + stack);
        }
        if (debug) {
            stack = prettyStack(promise._stackHolder, 2);
            if (stack && stacks.indexOf(stack) === -1)
                stacks.push(stack);
            if (promise._prev)
                getStack(promise._prev, stacks, limit);
        }
        return stacks;
    }
    function linkToPreviousPromise(promise, prev) {
        var numPrev = prev ? prev._numPrev + 1 : 0;
        if (numPrev < LONG_STACKS_CLIP_LIMIT) {
            promise._prev = prev;
            promise._numPrev = numPrev;
        }
    }
    function physicalTick() {
        beginMicroTickScope() && endMicroTickScope();
    }
    function beginMicroTickScope() {
        var wasRootExec = isOutsideMicroTick;
        isOutsideMicroTick = false;
        needsNewPhysicalTick = false;
        return wasRootExec;
    }
    function endMicroTickScope() {
        var callbacks, i, l;
        do {
            while (microtickQueue.length > 0) {
                callbacks = microtickQueue;
                microtickQueue = [];
                l = callbacks.length;
                for (i = 0; i < l; ++i) {
                    var item = callbacks[i];
                    item[0].apply(null, item[1]);
                }
            }
        } while (microtickQueue.length > 0);
        isOutsideMicroTick = true;
        needsNewPhysicalTick = true;
    }
    function finalizePhysicalTick() {
        var unhandledErrs = unhandledErrors;
        unhandledErrors = [];
        unhandledErrs.forEach(p => {
            p._PSD.onunhandled.call(null, p._value, p);
        });
        var finalizers = tickFinalizers.slice(0);
        var i = finalizers.length;
        while (i)
            finalizers[--i]();
    }
    function run_at_end_of_this_or_next_physical_tick(fn) {
        function finalizer() {
            fn();
            tickFinalizers.splice(tickFinalizers.indexOf(finalizer), 1);
        }
        tickFinalizers.push(finalizer);
        ++numScheduledCalls;
        asap(() => {
            if (--numScheduledCalls === 0)
                finalizePhysicalTick();
        }, []);
    }
    function addPossiblyUnhandledError(promise) {
        if (!unhandledErrors.some(p => p._value === promise._value))
            unhandledErrors.push(promise);
    }
    function markErrorAsHandled(promise) {
        var i = unhandledErrors.length;
        while (i)
            if (unhandledErrors[--i]._value === promise._value) {
                unhandledErrors.splice(i, 1);
                return;
            }
    }
    function PromiseReject(reason) {
        return new DexiePromise(INTERNAL, false, reason);
    }
    function wrap(fn, errorCatcher) {
        var psd = PSD;
        return function () {
            var wasRootExec = beginMicroTickScope(), outerScope = PSD;
            try {
                switchToZone(psd, true);
                return fn.apply(this, arguments);
            }
            catch (e) {
                errorCatcher && errorCatcher(e);
            }
            finally {
                switchToZone(outerScope, false);
                if (wasRootExec)
                    endMicroTickScope();
            }
        };
    }
    const task = { awaits: 0, echoes: 0, id: 0 };
    var taskCounter = 0;
    var zoneStack = [];
    var zoneEchoes = 0;
    var totalEchoes = 0;
    var zone_id_counter = 0;
    function newScope(fn, props, a1, a2) {
        var parent = PSD, psd = Object.create(parent);
        psd.parent = parent;
        psd.ref = 0;
        psd.global = false;
        psd.id = ++zone_id_counter;
        var globalEnv = globalPSD.env;
        psd.env = patchGlobalPromise ? {
            Promise: DexiePromise,
            PromiseProp: { value: DexiePromise, configurable: true, writable: true },
            all: DexiePromise.all,
            race: DexiePromise.race,
            allSettled: DexiePromise.allSettled,
            any: DexiePromise.any,
            resolve: DexiePromise.resolve,
            reject: DexiePromise.reject,
            nthen: getPatchedPromiseThen(globalEnv.nthen, psd),
            gthen: getPatchedPromiseThen(globalEnv.gthen, psd)
        } : {};
        if (props)
            extend(psd, props);
        ++parent.ref;
        psd.finalize = function () {
            --this.parent.ref || this.parent.finalize();
        };
        var rv = usePSD(psd, fn, a1, a2);
        if (psd.ref === 0)
            psd.finalize();
        return rv;
    }
    function incrementExpectedAwaits() {
        if (!task.id)
            task.id = ++taskCounter;
        ++task.awaits;
        task.echoes += ZONE_ECHO_LIMIT;
        return task.id;
    }
    function decrementExpectedAwaits() {
        if (!task.awaits)
            return false;
        if (--task.awaits === 0)
            task.id = 0;
        task.echoes = task.awaits * ZONE_ECHO_LIMIT;
        return true;
    }
    if (('' + nativePromiseThen).indexOf('[native code]') === -1) {
        incrementExpectedAwaits = decrementExpectedAwaits = nop;
    }
    function onPossibleParallellAsync(possiblePromise) {
        if (task.echoes && possiblePromise && possiblePromise.constructor === NativePromise) {
            incrementExpectedAwaits();
            return possiblePromise.then(x => {
                decrementExpectedAwaits();
                return x;
            }, e => {
                decrementExpectedAwaits();
                return rejection(e);
            });
        }
        return possiblePromise;
    }
    function zoneEnterEcho(targetZone) {
        ++totalEchoes;
        if (!task.echoes || --task.echoes === 0) {
            task.echoes = task.id = 0;
        }
        zoneStack.push(PSD);
        switchToZone(targetZone, true);
    }
    function zoneLeaveEcho() {
        var zone = zoneStack[zoneStack.length - 1];
        zoneStack.pop();
        switchToZone(zone, false);
    }
    function switchToZone(targetZone, bEnteringZone) {
        var currentZone = PSD;
        if (bEnteringZone ? task.echoes && (!zoneEchoes++ || targetZone !== PSD) : zoneEchoes && (!--zoneEchoes || targetZone !== PSD)) {
            enqueueNativeMicroTask(bEnteringZone ? zoneEnterEcho.bind(null, targetZone) : zoneLeaveEcho);
        }
        if (targetZone === PSD)
            return;
        PSD = targetZone;
        if (currentZone === globalPSD)
            globalPSD.env = snapShot();
        if (patchGlobalPromise) {
            var GlobalPromise = globalPSD.env.Promise;
            var targetEnv = targetZone.env;
            nativePromiseProto.then = targetEnv.nthen;
            GlobalPromise.prototype.then = targetEnv.gthen;
            if (currentZone.global || targetZone.global) {
                Object.defineProperty(_global, 'Promise', targetEnv.PromiseProp);
                GlobalPromise.all = targetEnv.all;
                GlobalPromise.race = targetEnv.race;
                GlobalPromise.resolve = targetEnv.resolve;
                GlobalPromise.reject = targetEnv.reject;
                if (targetEnv.allSettled)
                    GlobalPromise.allSettled = targetEnv.allSettled;
                if (targetEnv.any)
                    GlobalPromise.any = targetEnv.any;
            }
        }
    }
    function snapShot() {
        var GlobalPromise = _global.Promise;
        return patchGlobalPromise ? {
            Promise: GlobalPromise,
            PromiseProp: Object.getOwnPropertyDescriptor(_global, "Promise"),
            all: GlobalPromise.all,
            race: GlobalPromise.race,
            allSettled: GlobalPromise.allSettled,
            any: GlobalPromise.any,
            resolve: GlobalPromise.resolve,
            reject: GlobalPromise.reject,
            nthen: nativePromiseProto.then,
            gthen: GlobalPromise.prototype.then
        } : {};
    }
    function usePSD(psd, fn, a1, a2, a3) {
        var outerScope = PSD;
        try {
            switchToZone(psd, true);
            return fn(a1, a2, a3);
        }
        finally {
            switchToZone(outerScope, false);
        }
    }
    function enqueueNativeMicroTask(job) {
        nativePromiseThen.call(resolvedNativePromise, job);
    }
    function nativeAwaitCompatibleWrap(fn, zone, possibleAwait, cleanup) {
        return typeof fn !== 'function' ? fn : function () {
            var outerZone = PSD;
            if (possibleAwait)
                incrementExpectedAwaits();
            switchToZone(zone, true);
            try {
                return fn.apply(this, arguments);
            }
            finally {
                switchToZone(outerZone, false);
                if (cleanup)
                    enqueueNativeMicroTask(decrementExpectedAwaits);
            }
        };
    }
    function getPatchedPromiseThen(origThen, zone) {
        return function (onResolved, onRejected) {
            return origThen.call(this, nativeAwaitCompatibleWrap(onResolved, zone), nativeAwaitCompatibleWrap(onRejected, zone));
        };
    }
    const UNHANDLEDREJECTION = "unhandledrejection";
    function globalError(err, promise) {
        var rv;
        try {
            rv = promise.onuncatched(err);
        }
        catch (e) { }
        if (rv !== false)
            try {
                var event, eventData = { promise: promise, reason: err };
                if (_global.document && document.createEvent) {
                    event = document.createEvent('Event');
                    event.initEvent(UNHANDLEDREJECTION, true, true);
                    extend(event, eventData);
                }
                else if (_global.CustomEvent) {
                    event = new CustomEvent(UNHANDLEDREJECTION, { detail: eventData });
                    extend(event, eventData);
                }
                if (event && _global.dispatchEvent) {
                    dispatchEvent(event);
                    if (!_global.PromiseRejectionEvent && _global.onunhandledrejection)
                        try {
                            _global.onunhandledrejection(event);
                        }
                        catch (_) { }
                }
                if (debug && event && !event.defaultPrevented) {
                    console.warn(`Unhandled rejection: ${err.stack || err}`);
                }
            }
            catch (e) { }
    }
    var rejection = DexiePromise.reject;

    function tempTransaction(db, mode, storeNames, fn) {
        if (!db.idbdb || (!db._state.openComplete && (!PSD.letThrough && !db._vip))) {
            if (db._state.openComplete) {
                return rejection(new exceptions.DatabaseClosed(db._state.dbOpenError));
            }
            if (!db._state.isBeingOpened) {
                if (!db._options.autoOpen)
                    return rejection(new exceptions.DatabaseClosed());
                db.open().catch(nop);
            }
            return db._state.dbReadyPromise.then(() => tempTransaction(db, mode, storeNames, fn));
        }
        else {
            var trans = db._createTransaction(mode, storeNames, db._dbSchema);
            try {
                trans.create();
                db._state.PR1398_maxLoop = 3;
            }
            catch (ex) {
                if (ex.name === errnames.InvalidState && db.isOpen() && --db._state.PR1398_maxLoop > 0) {
                    console.warn('Dexie: Need to reopen db');
                    db._close();
                    return db.open().then(() => tempTransaction(db, mode, storeNames, fn));
                }
                return rejection(ex);
            }
            return trans._promise(mode, (resolve, reject) => {
                return newScope(() => {
                    PSD.trans = trans;
                    return fn(resolve, reject, trans);
                });
            }).then(result => {
                return trans._completion.then(() => result);
            });
        }
    }

    const DEXIE_VERSION = '3.2.2';
    const maxString = String.fromCharCode(65535);
    const minKey = -Infinity;
    const INVALID_KEY_ARGUMENT = "Invalid key provided. Keys must be of type string, number, Date or Array<string | number | Date>.";
    const STRING_EXPECTED = "String expected.";
    const connections = [];
    const isIEOrEdge = typeof navigator !== 'undefined' && /(MSIE|Trident|Edge)/.test(navigator.userAgent);
    const hasIEDeleteObjectStoreBug = isIEOrEdge;
    const hangsOnDeleteLargeKeyRange = isIEOrEdge;
    const dexieStackFrameFilter = frame => !/(dexie\.js|dexie\.min\.js)/.test(frame);
    const DBNAMES_DB = '__dbnames';
    const READONLY = 'readonly';
    const READWRITE = 'readwrite';

    function combine(filter1, filter2) {
        return filter1 ?
            filter2 ?
                function () { return filter1.apply(this, arguments) && filter2.apply(this, arguments); } :
                filter1 :
            filter2;
    }

    const AnyRange = {
        type: 3 ,
        lower: -Infinity,
        lowerOpen: false,
        upper: [[]],
        upperOpen: false
    };

    function workaroundForUndefinedPrimKey(keyPath) {
        return typeof keyPath === "string" && !/\./.test(keyPath)
            ? (obj) => {
                if (obj[keyPath] === undefined && (keyPath in obj)) {
                    obj = deepClone(obj);
                    delete obj[keyPath];
                }
                return obj;
            }
            : (obj) => obj;
    }

    class Table {
        _trans(mode, fn, writeLocked) {
            const trans = this._tx || PSD.trans;
            const tableName = this.name;
            function checkTableInTransaction(resolve, reject, trans) {
                if (!trans.schema[tableName])
                    throw new exceptions.NotFound("Table " + tableName + " not part of transaction");
                return fn(trans.idbtrans, trans);
            }
            const wasRootExec = beginMicroTickScope();
            try {
                return trans && trans.db === this.db ?
                    trans === PSD.trans ?
                        trans._promise(mode, checkTableInTransaction, writeLocked) :
                        newScope(() => trans._promise(mode, checkTableInTransaction, writeLocked), { trans: trans, transless: PSD.transless || PSD }) :
                    tempTransaction(this.db, mode, [this.name], checkTableInTransaction);
            }
            finally {
                if (wasRootExec)
                    endMicroTickScope();
            }
        }
        get(keyOrCrit, cb) {
            if (keyOrCrit && keyOrCrit.constructor === Object)
                return this.where(keyOrCrit).first(cb);
            return this._trans('readonly', (trans) => {
                return this.core.get({ trans, key: keyOrCrit })
                    .then(res => this.hook.reading.fire(res));
            }).then(cb);
        }
        where(indexOrCrit) {
            if (typeof indexOrCrit === 'string')
                return new this.db.WhereClause(this, indexOrCrit);
            if (isArray(indexOrCrit))
                return new this.db.WhereClause(this, `[${indexOrCrit.join('+')}]`);
            const keyPaths = keys(indexOrCrit);
            if (keyPaths.length === 1)
                return this
                    .where(keyPaths[0])
                    .equals(indexOrCrit[keyPaths[0]]);
            const compoundIndex = this.schema.indexes.concat(this.schema.primKey).filter(ix => ix.compound &&
                keyPaths.every(keyPath => ix.keyPath.indexOf(keyPath) >= 0) &&
                ix.keyPath.every(keyPath => keyPaths.indexOf(keyPath) >= 0))[0];
            if (compoundIndex && this.db._maxKey !== maxString)
                return this
                    .where(compoundIndex.name)
                    .equals(compoundIndex.keyPath.map(kp => indexOrCrit[kp]));
            if (!compoundIndex && debug)
                console.warn(`The query ${JSON.stringify(indexOrCrit)} on ${this.name} would benefit of a ` +
                    `compound index [${keyPaths.join('+')}]`);
            const { idxByName } = this.schema;
            const idb = this.db._deps.indexedDB;
            function equals(a, b) {
                try {
                    return idb.cmp(a, b) === 0;
                }
                catch (e) {
                    return false;
                }
            }
            const [idx, filterFunction] = keyPaths.reduce(([prevIndex, prevFilterFn], keyPath) => {
                const index = idxByName[keyPath];
                const value = indexOrCrit[keyPath];
                return [
                    prevIndex || index,
                    prevIndex || !index ?
                        combine(prevFilterFn, index && index.multi ?
                            x => {
                                const prop = getByKeyPath(x, keyPath);
                                return isArray(prop) && prop.some(item => equals(value, item));
                            } : x => equals(value, getByKeyPath(x, keyPath)))
                        : prevFilterFn
                ];
            }, [null, null]);
            return idx ?
                this.where(idx.name).equals(indexOrCrit[idx.keyPath])
                    .filter(filterFunction) :
                compoundIndex ?
                    this.filter(filterFunction) :
                    this.where(keyPaths).equals('');
        }
        filter(filterFunction) {
            return this.toCollection().and(filterFunction);
        }
        count(thenShortcut) {
            return this.toCollection().count(thenShortcut);
        }
        offset(offset) {
            return this.toCollection().offset(offset);
        }
        limit(numRows) {
            return this.toCollection().limit(numRows);
        }
        each(callback) {
            return this.toCollection().each(callback);
        }
        toArray(thenShortcut) {
            return this.toCollection().toArray(thenShortcut);
        }
        toCollection() {
            return new this.db.Collection(new this.db.WhereClause(this));
        }
        orderBy(index) {
            return new this.db.Collection(new this.db.WhereClause(this, isArray(index) ?
                `[${index.join('+')}]` :
                index));
        }
        reverse() {
            return this.toCollection().reverse();
        }
        mapToClass(constructor) {
            this.schema.mappedClass = constructor;
            const readHook = obj => {
                if (!obj)
                    return obj;
                const res = Object.create(constructor.prototype);
                for (var m in obj)
                    if (hasOwn(obj, m))
                        try {
                            res[m] = obj[m];
                        }
                        catch (_) { }
                return res;
            };
            if (this.schema.readHook) {
                this.hook.reading.unsubscribe(this.schema.readHook);
            }
            this.schema.readHook = readHook;
            this.hook("reading", readHook);
            return constructor;
        }
        defineClass() {
            function Class(content) {
                extend(this, content);
            }
            return this.mapToClass(Class);
        }
        add(obj, key) {
            const { auto, keyPath } = this.schema.primKey;
            let objToAdd = obj;
            if (keyPath && auto) {
                objToAdd = workaroundForUndefinedPrimKey(keyPath)(obj);
            }
            return this._trans('readwrite', trans => {
                return this.core.mutate({ trans, type: 'add', keys: key != null ? [key] : null, values: [objToAdd] });
            }).then(res => res.numFailures ? DexiePromise.reject(res.failures[0]) : res.lastResult)
                .then(lastResult => {
                if (keyPath) {
                    try {
                        setByKeyPath(obj, keyPath, lastResult);
                    }
                    catch (_) { }
                }
                return lastResult;
            });
        }
        update(keyOrObject, modifications) {
            if (typeof keyOrObject === 'object' && !isArray(keyOrObject)) {
                const key = getByKeyPath(keyOrObject, this.schema.primKey.keyPath);
                if (key === undefined)
                    return rejection(new exceptions.InvalidArgument("Given object does not contain its primary key"));
                try {
                    if (typeof modifications !== "function") {
                        keys(modifications).forEach(keyPath => {
                            setByKeyPath(keyOrObject, keyPath, modifications[keyPath]);
                        });
                    }
                    else {
                        modifications(keyOrObject, { value: keyOrObject, primKey: key });
                    }
                }
                catch (_a) {
                }
                return this.where(":id").equals(key).modify(modifications);
            }
            else {
                return this.where(":id").equals(keyOrObject).modify(modifications);
            }
        }
        put(obj, key) {
            const { auto, keyPath } = this.schema.primKey;
            let objToAdd = obj;
            if (keyPath && auto) {
                objToAdd = workaroundForUndefinedPrimKey(keyPath)(obj);
            }
            return this._trans('readwrite', trans => this.core.mutate({ trans, type: 'put', values: [objToAdd], keys: key != null ? [key] : null }))
                .then(res => res.numFailures ? DexiePromise.reject(res.failures[0]) : res.lastResult)
                .then(lastResult => {
                if (keyPath) {
                    try {
                        setByKeyPath(obj, keyPath, lastResult);
                    }
                    catch (_) { }
                }
                return lastResult;
            });
        }
        delete(key) {
            return this._trans('readwrite', trans => this.core.mutate({ trans, type: 'delete', keys: [key] }))
                .then(res => res.numFailures ? DexiePromise.reject(res.failures[0]) : undefined);
        }
        clear() {
            return this._trans('readwrite', trans => this.core.mutate({ trans, type: 'deleteRange', range: AnyRange }))
                .then(res => res.numFailures ? DexiePromise.reject(res.failures[0]) : undefined);
        }
        bulkGet(keys) {
            return this._trans('readonly', trans => {
                return this.core.getMany({
                    keys,
                    trans
                }).then(result => result.map(res => this.hook.reading.fire(res)));
            });
        }
        bulkAdd(objects, keysOrOptions, options) {
            const keys = Array.isArray(keysOrOptions) ? keysOrOptions : undefined;
            options = options || (keys ? undefined : keysOrOptions);
            const wantResults = options ? options.allKeys : undefined;
            return this._trans('readwrite', trans => {
                const { auto, keyPath } = this.schema.primKey;
                if (keyPath && keys)
                    throw new exceptions.InvalidArgument("bulkAdd(): keys argument invalid on tables with inbound keys");
                if (keys && keys.length !== objects.length)
                    throw new exceptions.InvalidArgument("Arguments objects and keys must have the same length");
                const numObjects = objects.length;
                let objectsToAdd = keyPath && auto ?
                    objects.map(workaroundForUndefinedPrimKey(keyPath)) :
                    objects;
                return this.core.mutate({ trans, type: 'add', keys: keys, values: objectsToAdd, wantResults })
                    .then(({ numFailures, results, lastResult, failures }) => {
                    const result = wantResults ? results : lastResult;
                    if (numFailures === 0)
                        return result;
                    throw new BulkError(`${this.name}.bulkAdd(): ${numFailures} of ${numObjects} operations failed`, failures);
                });
            });
        }
        bulkPut(objects, keysOrOptions, options) {
            const keys = Array.isArray(keysOrOptions) ? keysOrOptions : undefined;
            options = options || (keys ? undefined : keysOrOptions);
            const wantResults = options ? options.allKeys : undefined;
            return this._trans('readwrite', trans => {
                const { auto, keyPath } = this.schema.primKey;
                if (keyPath && keys)
                    throw new exceptions.InvalidArgument("bulkPut(): keys argument invalid on tables with inbound keys");
                if (keys && keys.length !== objects.length)
                    throw new exceptions.InvalidArgument("Arguments objects and keys must have the same length");
                const numObjects = objects.length;
                let objectsToPut = keyPath && auto ?
                    objects.map(workaroundForUndefinedPrimKey(keyPath)) :
                    objects;
                return this.core.mutate({ trans, type: 'put', keys: keys, values: objectsToPut, wantResults })
                    .then(({ numFailures, results, lastResult, failures }) => {
                    const result = wantResults ? results : lastResult;
                    if (numFailures === 0)
                        return result;
                    throw new BulkError(`${this.name}.bulkPut(): ${numFailures} of ${numObjects} operations failed`, failures);
                });
            });
        }
        bulkDelete(keys) {
            const numKeys = keys.length;
            return this._trans('readwrite', trans => {
                return this.core.mutate({ trans, type: 'delete', keys: keys });
            }).then(({ numFailures, lastResult, failures }) => {
                if (numFailures === 0)
                    return lastResult;
                throw new BulkError(`${this.name}.bulkDelete(): ${numFailures} of ${numKeys} operations failed`, failures);
            });
        }
    }

    function Events(ctx) {
        var evs = {};
        var rv = function (eventName, subscriber) {
            if (subscriber) {
                var i = arguments.length, args = new Array(i - 1);
                while (--i)
                    args[i - 1] = arguments[i];
                evs[eventName].subscribe.apply(null, args);
                return ctx;
            }
            else if (typeof (eventName) === 'string') {
                return evs[eventName];
            }
        };
        rv.addEventType = add;
        for (var i = 1, l = arguments.length; i < l; ++i) {
            add(arguments[i]);
        }
        return rv;
        function add(eventName, chainFunction, defaultFunction) {
            if (typeof eventName === 'object')
                return addConfiguredEvents(eventName);
            if (!chainFunction)
                chainFunction = reverseStoppableEventChain;
            if (!defaultFunction)
                defaultFunction = nop;
            var context = {
                subscribers: [],
                fire: defaultFunction,
                subscribe: function (cb) {
                    if (context.subscribers.indexOf(cb) === -1) {
                        context.subscribers.push(cb);
                        context.fire = chainFunction(context.fire, cb);
                    }
                },
                unsubscribe: function (cb) {
                    context.subscribers = context.subscribers.filter(function (fn) { return fn !== cb; });
                    context.fire = context.subscribers.reduce(chainFunction, defaultFunction);
                }
            };
            evs[eventName] = rv[eventName] = context;
            return context;
        }
        function addConfiguredEvents(cfg) {
            keys(cfg).forEach(function (eventName) {
                var args = cfg[eventName];
                if (isArray(args)) {
                    add(eventName, cfg[eventName][0], cfg[eventName][1]);
                }
                else if (args === 'asap') {
                    var context = add(eventName, mirror, function fire() {
                        var i = arguments.length, args = new Array(i);
                        while (i--)
                            args[i] = arguments[i];
                        context.subscribers.forEach(function (fn) {
                            asap$1(function fireEvent() {
                                fn.apply(null, args);
                            });
                        });
                    });
                }
                else
                    throw new exceptions.InvalidArgument("Invalid event config");
            });
        }
    }

    function makeClassConstructor(prototype, constructor) {
        derive(constructor).from({ prototype });
        return constructor;
    }

    function createTableConstructor(db) {
        return makeClassConstructor(Table.prototype, function Table(name, tableSchema, trans) {
            this.db = db;
            this._tx = trans;
            this.name = name;
            this.schema = tableSchema;
            this.hook = db._allTables[name] ? db._allTables[name].hook : Events(null, {
                "creating": [hookCreatingChain, nop],
                "reading": [pureFunctionChain, mirror],
                "updating": [hookUpdatingChain, nop],
                "deleting": [hookDeletingChain, nop]
            });
        });
    }

    function isPlainKeyRange(ctx, ignoreLimitFilter) {
        return !(ctx.filter || ctx.algorithm || ctx.or) &&
            (ignoreLimitFilter ? ctx.justLimit : !ctx.replayFilter);
    }
    function addFilter(ctx, fn) {
        ctx.filter = combine(ctx.filter, fn);
    }
    function addReplayFilter(ctx, factory, isLimitFilter) {
        var curr = ctx.replayFilter;
        ctx.replayFilter = curr ? () => combine(curr(), factory()) : factory;
        ctx.justLimit = isLimitFilter && !curr;
    }
    function addMatchFilter(ctx, fn) {
        ctx.isMatch = combine(ctx.isMatch, fn);
    }
    function getIndexOrStore(ctx, coreSchema) {
        if (ctx.isPrimKey)
            return coreSchema.primaryKey;
        const index = coreSchema.getIndexByKeyPath(ctx.index);
        if (!index)
            throw new exceptions.Schema("KeyPath " + ctx.index + " on object store " + coreSchema.name + " is not indexed");
        return index;
    }
    function openCursor(ctx, coreTable, trans) {
        const index = getIndexOrStore(ctx, coreTable.schema);
        return coreTable.openCursor({
            trans,
            values: !ctx.keysOnly,
            reverse: ctx.dir === 'prev',
            unique: !!ctx.unique,
            query: {
                index,
                range: ctx.range
            }
        });
    }
    function iter(ctx, fn, coreTrans, coreTable) {
        const filter = ctx.replayFilter ? combine(ctx.filter, ctx.replayFilter()) : ctx.filter;
        if (!ctx.or) {
            return iterate(openCursor(ctx, coreTable, coreTrans), combine(ctx.algorithm, filter), fn, !ctx.keysOnly && ctx.valueMapper);
        }
        else {
            const set = {};
            const union = (item, cursor, advance) => {
                if (!filter || filter(cursor, advance, result => cursor.stop(result), err => cursor.fail(err))) {
                    var primaryKey = cursor.primaryKey;
                    var key = '' + primaryKey;
                    if (key === '[object ArrayBuffer]')
                        key = '' + new Uint8Array(primaryKey);
                    if (!hasOwn(set, key)) {
                        set[key] = true;
                        fn(item, cursor, advance);
                    }
                }
            };
            return Promise.all([
                ctx.or._iterate(union, coreTrans),
                iterate(openCursor(ctx, coreTable, coreTrans), ctx.algorithm, union, !ctx.keysOnly && ctx.valueMapper)
            ]);
        }
    }
    function iterate(cursorPromise, filter, fn, valueMapper) {
        var mappedFn = valueMapper ? (x, c, a) => fn(valueMapper(x), c, a) : fn;
        var wrappedFn = wrap(mappedFn);
        return cursorPromise.then(cursor => {
            if (cursor) {
                return cursor.start(() => {
                    var c = () => cursor.continue();
                    if (!filter || filter(cursor, advancer => c = advancer, val => { cursor.stop(val); c = nop; }, e => { cursor.fail(e); c = nop; }))
                        wrappedFn(cursor.value, cursor, advancer => c = advancer);
                    c();
                });
            }
        });
    }

    function cmp(a, b) {
        try {
            const ta = type(a);
            const tb = type(b);
            if (ta !== tb) {
                if (ta === 'Array')
                    return 1;
                if (tb === 'Array')
                    return -1;
                if (ta === 'binary')
                    return 1;
                if (tb === 'binary')
                    return -1;
                if (ta === 'string')
                    return 1;
                if (tb === 'string')
                    return -1;
                if (ta === 'Date')
                    return 1;
                if (tb !== 'Date')
                    return NaN;
                return -1;
            }
            switch (ta) {
                case 'number':
                case 'Date':
                case 'string':
                    return a > b ? 1 : a < b ? -1 : 0;
                case 'binary': {
                    return compareUint8Arrays(getUint8Array(a), getUint8Array(b));
                }
                case 'Array':
                    return compareArrays(a, b);
            }
        }
        catch (_a) { }
        return NaN;
    }
    function compareArrays(a, b) {
        const al = a.length;
        const bl = b.length;
        const l = al < bl ? al : bl;
        for (let i = 0; i < l; ++i) {
            const res = cmp(a[i], b[i]);
            if (res !== 0)
                return res;
        }
        return al === bl ? 0 : al < bl ? -1 : 1;
    }
    function compareUint8Arrays(a, b) {
        const al = a.length;
        const bl = b.length;
        const l = al < bl ? al : bl;
        for (let i = 0; i < l; ++i) {
            if (a[i] !== b[i])
                return a[i] < b[i] ? -1 : 1;
        }
        return al === bl ? 0 : al < bl ? -1 : 1;
    }
    function type(x) {
        const t = typeof x;
        if (t !== 'object')
            return t;
        if (ArrayBuffer.isView(x))
            return 'binary';
        const tsTag = toStringTag(x);
        return tsTag === 'ArrayBuffer' ? 'binary' : tsTag;
    }
    function getUint8Array(a) {
        if (a instanceof Uint8Array)
            return a;
        if (ArrayBuffer.isView(a))
            return new Uint8Array(a.buffer, a.byteOffset, a.byteLength);
        return new Uint8Array(a);
    }

    class Collection {
        _read(fn, cb) {
            var ctx = this._ctx;
            return ctx.error ?
                ctx.table._trans(null, rejection.bind(null, ctx.error)) :
                ctx.table._trans('readonly', fn).then(cb);
        }
        _write(fn) {
            var ctx = this._ctx;
            return ctx.error ?
                ctx.table._trans(null, rejection.bind(null, ctx.error)) :
                ctx.table._trans('readwrite', fn, "locked");
        }
        _addAlgorithm(fn) {
            var ctx = this._ctx;
            ctx.algorithm = combine(ctx.algorithm, fn);
        }
        _iterate(fn, coreTrans) {
            return iter(this._ctx, fn, coreTrans, this._ctx.table.core);
        }
        clone(props) {
            var rv = Object.create(this.constructor.prototype), ctx = Object.create(this._ctx);
            if (props)
                extend(ctx, props);
            rv._ctx = ctx;
            return rv;
        }
        raw() {
            this._ctx.valueMapper = null;
            return this;
        }
        each(fn) {
            var ctx = this._ctx;
            return this._read(trans => iter(ctx, fn, trans, ctx.table.core));
        }
        count(cb) {
            return this._read(trans => {
                const ctx = this._ctx;
                const coreTable = ctx.table.core;
                if (isPlainKeyRange(ctx, true)) {
                    return coreTable.count({
                        trans,
                        query: {
                            index: getIndexOrStore(ctx, coreTable.schema),
                            range: ctx.range
                        }
                    }).then(count => Math.min(count, ctx.limit));
                }
                else {
                    var count = 0;
                    return iter(ctx, () => { ++count; return false; }, trans, coreTable)
                        .then(() => count);
                }
            }).then(cb);
        }
        sortBy(keyPath, cb) {
            const parts = keyPath.split('.').reverse(), lastPart = parts[0], lastIndex = parts.length - 1;
            function getval(obj, i) {
                if (i)
                    return getval(obj[parts[i]], i - 1);
                return obj[lastPart];
            }
            var order = this._ctx.dir === "next" ? 1 : -1;
            function sorter(a, b) {
                var aVal = getval(a, lastIndex), bVal = getval(b, lastIndex);
                return aVal < bVal ? -order : aVal > bVal ? order : 0;
            }
            return this.toArray(function (a) {
                return a.sort(sorter);
            }).then(cb);
        }
        toArray(cb) {
            return this._read(trans => {
                var ctx = this._ctx;
                if (ctx.dir === 'next' && isPlainKeyRange(ctx, true) && ctx.limit > 0) {
                    const { valueMapper } = ctx;
                    const index = getIndexOrStore(ctx, ctx.table.core.schema);
                    return ctx.table.core.query({
                        trans,
                        limit: ctx.limit,
                        values: true,
                        query: {
                            index,
                            range: ctx.range
                        }
                    }).then(({ result }) => valueMapper ? result.map(valueMapper) : result);
                }
                else {
                    const a = [];
                    return iter(ctx, item => a.push(item), trans, ctx.table.core).then(() => a);
                }
            }, cb);
        }
        offset(offset) {
            var ctx = this._ctx;
            if (offset <= 0)
                return this;
            ctx.offset += offset;
            if (isPlainKeyRange(ctx)) {
                addReplayFilter(ctx, () => {
                    var offsetLeft = offset;
                    return (cursor, advance) => {
                        if (offsetLeft === 0)
                            return true;
                        if (offsetLeft === 1) {
                            --offsetLeft;
                            return false;
                        }
                        advance(() => {
                            cursor.advance(offsetLeft);
                            offsetLeft = 0;
                        });
                        return false;
                    };
                });
            }
            else {
                addReplayFilter(ctx, () => {
                    var offsetLeft = offset;
                    return () => (--offsetLeft < 0);
                });
            }
            return this;
        }
        limit(numRows) {
            this._ctx.limit = Math.min(this._ctx.limit, numRows);
            addReplayFilter(this._ctx, () => {
                var rowsLeft = numRows;
                return function (cursor, advance, resolve) {
                    if (--rowsLeft <= 0)
                        advance(resolve);
                    return rowsLeft >= 0;
                };
            }, true);
            return this;
        }
        until(filterFunction, bIncludeStopEntry) {
            addFilter(this._ctx, function (cursor, advance, resolve) {
                if (filterFunction(cursor.value)) {
                    advance(resolve);
                    return bIncludeStopEntry;
                }
                else {
                    return true;
                }
            });
            return this;
        }
        first(cb) {
            return this.limit(1).toArray(function (a) { return a[0]; }).then(cb);
        }
        last(cb) {
            return this.reverse().first(cb);
        }
        filter(filterFunction) {
            addFilter(this._ctx, function (cursor) {
                return filterFunction(cursor.value);
            });
            addMatchFilter(this._ctx, filterFunction);
            return this;
        }
        and(filter) {
            return this.filter(filter);
        }
        or(indexName) {
            return new this.db.WhereClause(this._ctx.table, indexName, this);
        }
        reverse() {
            this._ctx.dir = (this._ctx.dir === "prev" ? "next" : "prev");
            if (this._ondirectionchange)
                this._ondirectionchange(this._ctx.dir);
            return this;
        }
        desc() {
            return this.reverse();
        }
        eachKey(cb) {
            var ctx = this._ctx;
            ctx.keysOnly = !ctx.isMatch;
            return this.each(function (val, cursor) { cb(cursor.key, cursor); });
        }
        eachUniqueKey(cb) {
            this._ctx.unique = "unique";
            return this.eachKey(cb);
        }
        eachPrimaryKey(cb) {
            var ctx = this._ctx;
            ctx.keysOnly = !ctx.isMatch;
            return this.each(function (val, cursor) { cb(cursor.primaryKey, cursor); });
        }
        keys(cb) {
            var ctx = this._ctx;
            ctx.keysOnly = !ctx.isMatch;
            var a = [];
            return this.each(function (item, cursor) {
                a.push(cursor.key);
            }).then(function () {
                return a;
            }).then(cb);
        }
        primaryKeys(cb) {
            var ctx = this._ctx;
            if (ctx.dir === 'next' && isPlainKeyRange(ctx, true) && ctx.limit > 0) {
                return this._read(trans => {
                    var index = getIndexOrStore(ctx, ctx.table.core.schema);
                    return ctx.table.core.query({
                        trans,
                        values: false,
                        limit: ctx.limit,
                        query: {
                            index,
                            range: ctx.range
                        }
                    });
                }).then(({ result }) => result).then(cb);
            }
            ctx.keysOnly = !ctx.isMatch;
            var a = [];
            return this.each(function (item, cursor) {
                a.push(cursor.primaryKey);
            }).then(function () {
                return a;
            }).then(cb);
        }
        uniqueKeys(cb) {
            this._ctx.unique = "unique";
            return this.keys(cb);
        }
        firstKey(cb) {
            return this.limit(1).keys(function (a) { return a[0]; }).then(cb);
        }
        lastKey(cb) {
            return this.reverse().firstKey(cb);
        }
        distinct() {
            var ctx = this._ctx, idx = ctx.index && ctx.table.schema.idxByName[ctx.index];
            if (!idx || !idx.multi)
                return this;
            var set = {};
            addFilter(this._ctx, function (cursor) {
                var strKey = cursor.primaryKey.toString();
                var found = hasOwn(set, strKey);
                set[strKey] = true;
                return !found;
            });
            return this;
        }
        modify(changes) {
            var ctx = this._ctx;
            return this._write(trans => {
                var modifyer;
                if (typeof changes === 'function') {
                    modifyer = changes;
                }
                else {
                    var keyPaths = keys(changes);
                    var numKeys = keyPaths.length;
                    modifyer = function (item) {
                        var anythingModified = false;
                        for (var i = 0; i < numKeys; ++i) {
                            var keyPath = keyPaths[i], val = changes[keyPath];
                            if (getByKeyPath(item, keyPath) !== val) {
                                setByKeyPath(item, keyPath, val);
                                anythingModified = true;
                            }
                        }
                        return anythingModified;
                    };
                }
                const coreTable = ctx.table.core;
                const { outbound, extractKey } = coreTable.schema.primaryKey;
                const limit = this.db._options.modifyChunkSize || 200;
                const totalFailures = [];
                let successCount = 0;
                const failedKeys = [];
                const applyMutateResult = (expectedCount, res) => {
                    const { failures, numFailures } = res;
                    successCount += expectedCount - numFailures;
                    for (let pos of keys(failures)) {
                        totalFailures.push(failures[pos]);
                    }
                };
                return this.clone().primaryKeys().then(keys => {
                    const nextChunk = (offset) => {
                        const count = Math.min(limit, keys.length - offset);
                        return coreTable.getMany({
                            trans,
                            keys: keys.slice(offset, offset + count),
                            cache: "immutable"
                        }).then(values => {
                            const addValues = [];
                            const putValues = [];
                            const putKeys = outbound ? [] : null;
                            const deleteKeys = [];
                            for (let i = 0; i < count; ++i) {
                                const origValue = values[i];
                                const ctx = {
                                    value: deepClone(origValue),
                                    primKey: keys[offset + i]
                                };
                                if (modifyer.call(ctx, ctx.value, ctx) !== false) {
                                    if (ctx.value == null) {
                                        deleteKeys.push(keys[offset + i]);
                                    }
                                    else if (!outbound && cmp(extractKey(origValue), extractKey(ctx.value)) !== 0) {
                                        deleteKeys.push(keys[offset + i]);
                                        addValues.push(ctx.value);
                                    }
                                    else {
                                        putValues.push(ctx.value);
                                        if (outbound)
                                            putKeys.push(keys[offset + i]);
                                    }
                                }
                            }
                            const criteria = isPlainKeyRange(ctx) &&
                                ctx.limit === Infinity &&
                                (typeof changes !== 'function' || changes === deleteCallback) && {
                                index: ctx.index,
                                range: ctx.range
                            };
                            return Promise.resolve(addValues.length > 0 &&
                                coreTable.mutate({ trans, type: 'add', values: addValues })
                                    .then(res => {
                                    for (let pos in res.failures) {
                                        deleteKeys.splice(parseInt(pos), 1);
                                    }
                                    applyMutateResult(addValues.length, res);
                                })).then(() => (putValues.length > 0 || (criteria && typeof changes === 'object')) &&
                                coreTable.mutate({
                                    trans,
                                    type: 'put',
                                    keys: putKeys,
                                    values: putValues,
                                    criteria,
                                    changeSpec: typeof changes !== 'function'
                                        && changes
                                }).then(res => applyMutateResult(putValues.length, res))).then(() => (deleteKeys.length > 0 || (criteria && changes === deleteCallback)) &&
                                coreTable.mutate({
                                    trans,
                                    type: 'delete',
                                    keys: deleteKeys,
                                    criteria
                                }).then(res => applyMutateResult(deleteKeys.length, res))).then(() => {
                                return keys.length > offset + count && nextChunk(offset + limit);
                            });
                        });
                    };
                    return nextChunk(0).then(() => {
                        if (totalFailures.length > 0)
                            throw new ModifyError("Error modifying one or more objects", totalFailures, successCount, failedKeys);
                        return keys.length;
                    });
                });
            });
        }
        delete() {
            var ctx = this._ctx, range = ctx.range;
            if (isPlainKeyRange(ctx) &&
                ((ctx.isPrimKey && !hangsOnDeleteLargeKeyRange) || range.type === 3 ))
             {
                return this._write(trans => {
                    const { primaryKey } = ctx.table.core.schema;
                    const coreRange = range;
                    return ctx.table.core.count({ trans, query: { index: primaryKey, range: coreRange } }).then(count => {
                        return ctx.table.core.mutate({ trans, type: 'deleteRange', range: coreRange })
                            .then(({ failures, lastResult, results, numFailures }) => {
                            if (numFailures)
                                throw new ModifyError("Could not delete some values", Object.keys(failures).map(pos => failures[pos]), count - numFailures);
                            return count - numFailures;
                        });
                    });
                });
            }
            return this.modify(deleteCallback);
        }
    }
    const deleteCallback = (value, ctx) => ctx.value = null;

    function createCollectionConstructor(db) {
        return makeClassConstructor(Collection.prototype, function Collection(whereClause, keyRangeGenerator) {
            this.db = db;
            let keyRange = AnyRange, error = null;
            if (keyRangeGenerator)
                try {
                    keyRange = keyRangeGenerator();
                }
                catch (ex) {
                    error = ex;
                }
            const whereCtx = whereClause._ctx;
            const table = whereCtx.table;
            const readingHook = table.hook.reading.fire;
            this._ctx = {
                table: table,
                index: whereCtx.index,
                isPrimKey: (!whereCtx.index || (table.schema.primKey.keyPath && whereCtx.index === table.schema.primKey.name)),
                range: keyRange,
                keysOnly: false,
                dir: "next",
                unique: "",
                algorithm: null,
                filter: null,
                replayFilter: null,
                justLimit: true,
                isMatch: null,
                offset: 0,
                limit: Infinity,
                error: error,
                or: whereCtx.or,
                valueMapper: readingHook !== mirror ? readingHook : null
            };
        });
    }

    function simpleCompare(a, b) {
        return a < b ? -1 : a === b ? 0 : 1;
    }
    function simpleCompareReverse(a, b) {
        return a > b ? -1 : a === b ? 0 : 1;
    }

    function fail(collectionOrWhereClause, err, T) {
        var collection = collectionOrWhereClause instanceof WhereClause ?
            new collectionOrWhereClause.Collection(collectionOrWhereClause) :
            collectionOrWhereClause;
        collection._ctx.error = T ? new T(err) : new TypeError(err);
        return collection;
    }
    function emptyCollection(whereClause) {
        return new whereClause.Collection(whereClause, () => rangeEqual("")).limit(0);
    }
    function upperFactory(dir) {
        return dir === "next" ?
            (s) => s.toUpperCase() :
            (s) => s.toLowerCase();
    }
    function lowerFactory(dir) {
        return dir === "next" ?
            (s) => s.toLowerCase() :
            (s) => s.toUpperCase();
    }
    function nextCasing(key, lowerKey, upperNeedle, lowerNeedle, cmp, dir) {
        var length = Math.min(key.length, lowerNeedle.length);
        var llp = -1;
        for (var i = 0; i < length; ++i) {
            var lwrKeyChar = lowerKey[i];
            if (lwrKeyChar !== lowerNeedle[i]) {
                if (cmp(key[i], upperNeedle[i]) < 0)
                    return key.substr(0, i) + upperNeedle[i] + upperNeedle.substr(i + 1);
                if (cmp(key[i], lowerNeedle[i]) < 0)
                    return key.substr(0, i) + lowerNeedle[i] + upperNeedle.substr(i + 1);
                if (llp >= 0)
                    return key.substr(0, llp) + lowerKey[llp] + upperNeedle.substr(llp + 1);
                return null;
            }
            if (cmp(key[i], lwrKeyChar) < 0)
                llp = i;
        }
        if (length < lowerNeedle.length && dir === "next")
            return key + upperNeedle.substr(key.length);
        if (length < key.length && dir === "prev")
            return key.substr(0, upperNeedle.length);
        return (llp < 0 ? null : key.substr(0, llp) + lowerNeedle[llp] + upperNeedle.substr(llp + 1));
    }
    function addIgnoreCaseAlgorithm(whereClause, match, needles, suffix) {
        var upper, lower, compare, upperNeedles, lowerNeedles, direction, nextKeySuffix, needlesLen = needles.length;
        if (!needles.every(s => typeof s === 'string')) {
            return fail(whereClause, STRING_EXPECTED);
        }
        function initDirection(dir) {
            upper = upperFactory(dir);
            lower = lowerFactory(dir);
            compare = (dir === "next" ? simpleCompare : simpleCompareReverse);
            var needleBounds = needles.map(function (needle) {
                return { lower: lower(needle), upper: upper(needle) };
            }).sort(function (a, b) {
                return compare(a.lower, b.lower);
            });
            upperNeedles = needleBounds.map(function (nb) { return nb.upper; });
            lowerNeedles = needleBounds.map(function (nb) { return nb.lower; });
            direction = dir;
            nextKeySuffix = (dir === "next" ? "" : suffix);
        }
        initDirection("next");
        var c = new whereClause.Collection(whereClause, () => createRange(upperNeedles[0], lowerNeedles[needlesLen - 1] + suffix));
        c._ondirectionchange = function (direction) {
            initDirection(direction);
        };
        var firstPossibleNeedle = 0;
        c._addAlgorithm(function (cursor, advance, resolve) {
            var key = cursor.key;
            if (typeof key !== 'string')
                return false;
            var lowerKey = lower(key);
            if (match(lowerKey, lowerNeedles, firstPossibleNeedle)) {
                return true;
            }
            else {
                var lowestPossibleCasing = null;
                for (var i = firstPossibleNeedle; i < needlesLen; ++i) {
                    var casing = nextCasing(key, lowerKey, upperNeedles[i], lowerNeedles[i], compare, direction);
                    if (casing === null && lowestPossibleCasing === null)
                        firstPossibleNeedle = i + 1;
                    else if (lowestPossibleCasing === null || compare(lowestPossibleCasing, casing) > 0) {
                        lowestPossibleCasing = casing;
                    }
                }
                if (lowestPossibleCasing !== null) {
                    advance(function () { cursor.continue(lowestPossibleCasing + nextKeySuffix); });
                }
                else {
                    advance(resolve);
                }
                return false;
            }
        });
        return c;
    }
    function createRange(lower, upper, lowerOpen, upperOpen) {
        return {
            type: 2 ,
            lower,
            upper,
            lowerOpen,
            upperOpen
        };
    }
    function rangeEqual(value) {
        return {
            type: 1 ,
            lower: value,
            upper: value
        };
    }

    class WhereClause {
        get Collection() {
            return this._ctx.table.db.Collection;
        }
        between(lower, upper, includeLower, includeUpper) {
            includeLower = includeLower !== false;
            includeUpper = includeUpper === true;
            try {
                if ((this._cmp(lower, upper) > 0) ||
                    (this._cmp(lower, upper) === 0 && (includeLower || includeUpper) && !(includeLower && includeUpper)))
                    return emptyCollection(this);
                return new this.Collection(this, () => createRange(lower, upper, !includeLower, !includeUpper));
            }
            catch (e) {
                return fail(this, INVALID_KEY_ARGUMENT);
            }
        }
        equals(value) {
            if (value == null)
                return fail(this, INVALID_KEY_ARGUMENT);
            return new this.Collection(this, () => rangeEqual(value));
        }
        above(value) {
            if (value == null)
                return fail(this, INVALID_KEY_ARGUMENT);
            return new this.Collection(this, () => createRange(value, undefined, true));
        }
        aboveOrEqual(value) {
            if (value == null)
                return fail(this, INVALID_KEY_ARGUMENT);
            return new this.Collection(this, () => createRange(value, undefined, false));
        }
        below(value) {
            if (value == null)
                return fail(this, INVALID_KEY_ARGUMENT);
            return new this.Collection(this, () => createRange(undefined, value, false, true));
        }
        belowOrEqual(value) {
            if (value == null)
                return fail(this, INVALID_KEY_ARGUMENT);
            return new this.Collection(this, () => createRange(undefined, value));
        }
        startsWith(str) {
            if (typeof str !== 'string')
                return fail(this, STRING_EXPECTED);
            return this.between(str, str + maxString, true, true);
        }
        startsWithIgnoreCase(str) {
            if (str === "")
                return this.startsWith(str);
            return addIgnoreCaseAlgorithm(this, (x, a) => x.indexOf(a[0]) === 0, [str], maxString);
        }
        equalsIgnoreCase(str) {
            return addIgnoreCaseAlgorithm(this, (x, a) => x === a[0], [str], "");
        }
        anyOfIgnoreCase() {
            var set = getArrayOf.apply(NO_CHAR_ARRAY, arguments);
            if (set.length === 0)
                return emptyCollection(this);
            return addIgnoreCaseAlgorithm(this, (x, a) => a.indexOf(x) !== -1, set, "");
        }
        startsWithAnyOfIgnoreCase() {
            var set = getArrayOf.apply(NO_CHAR_ARRAY, arguments);
            if (set.length === 0)
                return emptyCollection(this);
            return addIgnoreCaseAlgorithm(this, (x, a) => a.some(n => x.indexOf(n) === 0), set, maxString);
        }
        anyOf() {
            const set = getArrayOf.apply(NO_CHAR_ARRAY, arguments);
            let compare = this._cmp;
            try {
                set.sort(compare);
            }
            catch (e) {
                return fail(this, INVALID_KEY_ARGUMENT);
            }
            if (set.length === 0)
                return emptyCollection(this);
            const c = new this.Collection(this, () => createRange(set[0], set[set.length - 1]));
            c._ondirectionchange = direction => {
                compare = (direction === "next" ?
                    this._ascending :
                    this._descending);
                set.sort(compare);
            };
            let i = 0;
            c._addAlgorithm((cursor, advance, resolve) => {
                const key = cursor.key;
                while (compare(key, set[i]) > 0) {
                    ++i;
                    if (i === set.length) {
                        advance(resolve);
                        return false;
                    }
                }
                if (compare(key, set[i]) === 0) {
                    return true;
                }
                else {
                    advance(() => { cursor.continue(set[i]); });
                    return false;
                }
            });
            return c;
        }
        notEqual(value) {
            return this.inAnyRange([[minKey, value], [value, this.db._maxKey]], { includeLowers: false, includeUppers: false });
        }
        noneOf() {
            const set = getArrayOf.apply(NO_CHAR_ARRAY, arguments);
            if (set.length === 0)
                return new this.Collection(this);
            try {
                set.sort(this._ascending);
            }
            catch (e) {
                return fail(this, INVALID_KEY_ARGUMENT);
            }
            const ranges = set.reduce((res, val) => res ?
                res.concat([[res[res.length - 1][1], val]]) :
                [[minKey, val]], null);
            ranges.push([set[set.length - 1], this.db._maxKey]);
            return this.inAnyRange(ranges, { includeLowers: false, includeUppers: false });
        }
        inAnyRange(ranges, options) {
            const cmp = this._cmp, ascending = this._ascending, descending = this._descending, min = this._min, max = this._max;
            if (ranges.length === 0)
                return emptyCollection(this);
            if (!ranges.every(range => range[0] !== undefined &&
                range[1] !== undefined &&
                ascending(range[0], range[1]) <= 0)) {
                return fail(this, "First argument to inAnyRange() must be an Array of two-value Arrays [lower,upper] where upper must not be lower than lower", exceptions.InvalidArgument);
            }
            const includeLowers = !options || options.includeLowers !== false;
            const includeUppers = options && options.includeUppers === true;
            function addRange(ranges, newRange) {
                let i = 0, l = ranges.length;
                for (; i < l; ++i) {
                    const range = ranges[i];
                    if (cmp(newRange[0], range[1]) < 0 && cmp(newRange[1], range[0]) > 0) {
                        range[0] = min(range[0], newRange[0]);
                        range[1] = max(range[1], newRange[1]);
                        break;
                    }
                }
                if (i === l)
                    ranges.push(newRange);
                return ranges;
            }
            let sortDirection = ascending;
            function rangeSorter(a, b) { return sortDirection(a[0], b[0]); }
            let set;
            try {
                set = ranges.reduce(addRange, []);
                set.sort(rangeSorter);
            }
            catch (ex) {
                return fail(this, INVALID_KEY_ARGUMENT);
            }
            let rangePos = 0;
            const keyIsBeyondCurrentEntry = includeUppers ?
                key => ascending(key, set[rangePos][1]) > 0 :
                key => ascending(key, set[rangePos][1]) >= 0;
            const keyIsBeforeCurrentEntry = includeLowers ?
                key => descending(key, set[rangePos][0]) > 0 :
                key => descending(key, set[rangePos][0]) >= 0;
            function keyWithinCurrentRange(key) {
                return !keyIsBeyondCurrentEntry(key) && !keyIsBeforeCurrentEntry(key);
            }
            let checkKey = keyIsBeyondCurrentEntry;
            const c = new this.Collection(this, () => createRange(set[0][0], set[set.length - 1][1], !includeLowers, !includeUppers));
            c._ondirectionchange = direction => {
                if (direction === "next") {
                    checkKey = keyIsBeyondCurrentEntry;
                    sortDirection = ascending;
                }
                else {
                    checkKey = keyIsBeforeCurrentEntry;
                    sortDirection = descending;
                }
                set.sort(rangeSorter);
            };
            c._addAlgorithm((cursor, advance, resolve) => {
                var key = cursor.key;
                while (checkKey(key)) {
                    ++rangePos;
                    if (rangePos === set.length) {
                        advance(resolve);
                        return false;
                    }
                }
                if (keyWithinCurrentRange(key)) {
                    return true;
                }
                else if (this._cmp(key, set[rangePos][1]) === 0 || this._cmp(key, set[rangePos][0]) === 0) {
                    return false;
                }
                else {
                    advance(() => {
                        if (sortDirection === ascending)
                            cursor.continue(set[rangePos][0]);
                        else
                            cursor.continue(set[rangePos][1]);
                    });
                    return false;
                }
            });
            return c;
        }
        startsWithAnyOf() {
            const set = getArrayOf.apply(NO_CHAR_ARRAY, arguments);
            if (!set.every(s => typeof s === 'string')) {
                return fail(this, "startsWithAnyOf() only works with strings");
            }
            if (set.length === 0)
                return emptyCollection(this);
            return this.inAnyRange(set.map((str) => [str, str + maxString]));
        }
    }

    function createWhereClauseConstructor(db) {
        return makeClassConstructor(WhereClause.prototype, function WhereClause(table, index, orCollection) {
            this.db = db;
            this._ctx = {
                table: table,
                index: index === ":id" ? null : index,
                or: orCollection
            };
            const indexedDB = db._deps.indexedDB;
            if (!indexedDB)
                throw new exceptions.MissingAPI();
            this._cmp = this._ascending = indexedDB.cmp.bind(indexedDB);
            this._descending = (a, b) => indexedDB.cmp(b, a);
            this._max = (a, b) => indexedDB.cmp(a, b) > 0 ? a : b;
            this._min = (a, b) => indexedDB.cmp(a, b) < 0 ? a : b;
            this._IDBKeyRange = db._deps.IDBKeyRange;
        });
    }

    function eventRejectHandler(reject) {
        return wrap(function (event) {
            preventDefault(event);
            reject(event.target.error);
            return false;
        });
    }
    function preventDefault(event) {
        if (event.stopPropagation)
            event.stopPropagation();
        if (event.preventDefault)
            event.preventDefault();
    }

    const DEXIE_STORAGE_MUTATED_EVENT_NAME = 'storagemutated';
    const STORAGE_MUTATED_DOM_EVENT_NAME = 'x-storagemutated-1';
    const globalEvents = Events(null, DEXIE_STORAGE_MUTATED_EVENT_NAME);

    class Transaction {
        _lock() {
            assert(!PSD.global);
            ++this._reculock;
            if (this._reculock === 1 && !PSD.global)
                PSD.lockOwnerFor = this;
            return this;
        }
        _unlock() {
            assert(!PSD.global);
            if (--this._reculock === 0) {
                if (!PSD.global)
                    PSD.lockOwnerFor = null;
                while (this._blockedFuncs.length > 0 && !this._locked()) {
                    var fnAndPSD = this._blockedFuncs.shift();
                    try {
                        usePSD(fnAndPSD[1], fnAndPSD[0]);
                    }
                    catch (e) { }
                }
            }
            return this;
        }
        _locked() {
            return this._reculock && PSD.lockOwnerFor !== this;
        }
        create(idbtrans) {
            if (!this.mode)
                return this;
            const idbdb = this.db.idbdb;
            const dbOpenError = this.db._state.dbOpenError;
            assert(!this.idbtrans);
            if (!idbtrans && !idbdb) {
                switch (dbOpenError && dbOpenError.name) {
                    case "DatabaseClosedError":
                        throw new exceptions.DatabaseClosed(dbOpenError);
                    case "MissingAPIError":
                        throw new exceptions.MissingAPI(dbOpenError.message, dbOpenError);
                    default:
                        throw new exceptions.OpenFailed(dbOpenError);
                }
            }
            if (!this.active)
                throw new exceptions.TransactionInactive();
            assert(this._completion._state === null);
            idbtrans = this.idbtrans = idbtrans ||
                (this.db.core
                    ? this.db.core.transaction(this.storeNames, this.mode, { durability: this.chromeTransactionDurability })
                    : idbdb.transaction(this.storeNames, this.mode, { durability: this.chromeTransactionDurability }));
            idbtrans.onerror = wrap(ev => {
                preventDefault(ev);
                this._reject(idbtrans.error);
            });
            idbtrans.onabort = wrap(ev => {
                preventDefault(ev);
                this.active && this._reject(new exceptions.Abort(idbtrans.error));
                this.active = false;
                this.on("abort").fire(ev);
            });
            idbtrans.oncomplete = wrap(() => {
                this.active = false;
                this._resolve();
                if ('mutatedParts' in idbtrans) {
                    globalEvents.storagemutated.fire(idbtrans["mutatedParts"]);
                }
            });
            return this;
        }
        _promise(mode, fn, bWriteLock) {
            if (mode === 'readwrite' && this.mode !== 'readwrite')
                return rejection(new exceptions.ReadOnly("Transaction is readonly"));
            if (!this.active)
                return rejection(new exceptions.TransactionInactive());
            if (this._locked()) {
                return new DexiePromise((resolve, reject) => {
                    this._blockedFuncs.push([() => {
                            this._promise(mode, fn, bWriteLock).then(resolve, reject);
                        }, PSD]);
                });
            }
            else if (bWriteLock) {
                return newScope(() => {
                    var p = new DexiePromise((resolve, reject) => {
                        this._lock();
                        const rv = fn(resolve, reject, this);
                        if (rv && rv.then)
                            rv.then(resolve, reject);
                    });
                    p.finally(() => this._unlock());
                    p._lib = true;
                    return p;
                });
            }
            else {
                var p = new DexiePromise((resolve, reject) => {
                    var rv = fn(resolve, reject, this);
                    if (rv && rv.then)
                        rv.then(resolve, reject);
                });
                p._lib = true;
                return p;
            }
        }
        _root() {
            return this.parent ? this.parent._root() : this;
        }
        waitFor(promiseLike) {
            var root = this._root();
            const promise = DexiePromise.resolve(promiseLike);
            if (root._waitingFor) {
                root._waitingFor = root._waitingFor.then(() => promise);
            }
            else {
                root._waitingFor = promise;
                root._waitingQueue = [];
                var store = root.idbtrans.objectStore(root.storeNames[0]);
                (function spin() {
                    ++root._spinCount;
                    while (root._waitingQueue.length)
                        (root._waitingQueue.shift())();
                    if (root._waitingFor)
                        store.get(-Infinity).onsuccess = spin;
                }());
            }
            var currentWaitPromise = root._waitingFor;
            return new DexiePromise((resolve, reject) => {
                promise.then(res => root._waitingQueue.push(wrap(resolve.bind(null, res))), err => root._waitingQueue.push(wrap(reject.bind(null, err)))).finally(() => {
                    if (root._waitingFor === currentWaitPromise) {
                        root._waitingFor = null;
                    }
                });
            });
        }
        abort() {
            if (this.active) {
                this.active = false;
                if (this.idbtrans)
                    this.idbtrans.abort();
                this._reject(new exceptions.Abort());
            }
        }
        table(tableName) {
            const memoizedTables = (this._memoizedTables || (this._memoizedTables = {}));
            if (hasOwn(memoizedTables, tableName))
                return memoizedTables[tableName];
            const tableSchema = this.schema[tableName];
            if (!tableSchema) {
                throw new exceptions.NotFound("Table " + tableName + " not part of transaction");
            }
            const transactionBoundTable = new this.db.Table(tableName, tableSchema, this);
            transactionBoundTable.core = this.db.core.table(tableName);
            memoizedTables[tableName] = transactionBoundTable;
            return transactionBoundTable;
        }
    }

    function createTransactionConstructor(db) {
        return makeClassConstructor(Transaction.prototype, function Transaction(mode, storeNames, dbschema, chromeTransactionDurability, parent) {
            this.db = db;
            this.mode = mode;
            this.storeNames = storeNames;
            this.schema = dbschema;
            this.chromeTransactionDurability = chromeTransactionDurability;
            this.idbtrans = null;
            this.on = Events(this, "complete", "error", "abort");
            this.parent = parent || null;
            this.active = true;
            this._reculock = 0;
            this._blockedFuncs = [];
            this._resolve = null;
            this._reject = null;
            this._waitingFor = null;
            this._waitingQueue = null;
            this._spinCount = 0;
            this._completion = new DexiePromise((resolve, reject) => {
                this._resolve = resolve;
                this._reject = reject;
            });
            this._completion.then(() => {
                this.active = false;
                this.on.complete.fire();
            }, e => {
                var wasActive = this.active;
                this.active = false;
                this.on.error.fire(e);
                this.parent ?
                    this.parent._reject(e) :
                    wasActive && this.idbtrans && this.idbtrans.abort();
                return rejection(e);
            });
        });
    }

    function createIndexSpec(name, keyPath, unique, multi, auto, compound, isPrimKey) {
        return {
            name,
            keyPath,
            unique,
            multi,
            auto,
            compound,
            src: (unique && !isPrimKey ? '&' : '') + (multi ? '*' : '') + (auto ? "++" : "") + nameFromKeyPath(keyPath)
        };
    }
    function nameFromKeyPath(keyPath) {
        return typeof keyPath === 'string' ?
            keyPath :
            keyPath ? ('[' + [].join.call(keyPath, '+') + ']') : "";
    }

    function createTableSchema(name, primKey, indexes) {
        return {
            name,
            primKey,
            indexes,
            mappedClass: null,
            idxByName: arrayToObject(indexes, index => [index.name, index])
        };
    }

    function safariMultiStoreFix(storeNames) {
        return storeNames.length === 1 ? storeNames[0] : storeNames;
    }
    let getMaxKey = (IdbKeyRange) => {
        try {
            IdbKeyRange.only([[]]);
            getMaxKey = () => [[]];
            return [[]];
        }
        catch (e) {
            getMaxKey = () => maxString;
            return maxString;
        }
    };

    function getKeyExtractor(keyPath) {
        if (keyPath == null) {
            return () => undefined;
        }
        else if (typeof keyPath === 'string') {
            return getSinglePathKeyExtractor(keyPath);
        }
        else {
            return obj => getByKeyPath(obj, keyPath);
        }
    }
    function getSinglePathKeyExtractor(keyPath) {
        const split = keyPath.split('.');
        if (split.length === 1) {
            return obj => obj[keyPath];
        }
        else {
            return obj => getByKeyPath(obj, keyPath);
        }
    }

    function arrayify(arrayLike) {
        return [].slice.call(arrayLike);
    }
    let _id_counter = 0;
    function getKeyPathAlias(keyPath) {
        return keyPath == null ?
            ":id" :
            typeof keyPath === 'string' ?
                keyPath :
                `[${keyPath.join('+')}]`;
    }
    function createDBCore(db, IdbKeyRange, tmpTrans) {
        function extractSchema(db, trans) {
            const tables = arrayify(db.objectStoreNames);
            return {
                schema: {
                    name: db.name,
                    tables: tables.map(table => trans.objectStore(table)).map(store => {
                        const { keyPath, autoIncrement } = store;
                        const compound = isArray(keyPath);
                        const outbound = keyPath == null;
                        const indexByKeyPath = {};
                        const result = {
                            name: store.name,
                            primaryKey: {
                                name: null,
                                isPrimaryKey: true,
                                outbound,
                                compound,
                                keyPath,
                                autoIncrement,
                                unique: true,
                                extractKey: getKeyExtractor(keyPath)
                            },
                            indexes: arrayify(store.indexNames).map(indexName => store.index(indexName))
                                .map(index => {
                                const { name, unique, multiEntry, keyPath } = index;
                                const compound = isArray(keyPath);
                                const result = {
                                    name,
                                    compound,
                                    keyPath,
                                    unique,
                                    multiEntry,
                                    extractKey: getKeyExtractor(keyPath)
                                };
                                indexByKeyPath[getKeyPathAlias(keyPath)] = result;
                                return result;
                            }),
                            getIndexByKeyPath: (keyPath) => indexByKeyPath[getKeyPathAlias(keyPath)]
                        };
                        indexByKeyPath[":id"] = result.primaryKey;
                        if (keyPath != null) {
                            indexByKeyPath[getKeyPathAlias(keyPath)] = result.primaryKey;
                        }
                        return result;
                    })
                },
                hasGetAll: tables.length > 0 && ('getAll' in trans.objectStore(tables[0])) &&
                    !(typeof navigator !== 'undefined' && /Safari/.test(navigator.userAgent) &&
                        !/(Chrome\/|Edge\/)/.test(navigator.userAgent) &&
                        [].concat(navigator.userAgent.match(/Safari\/(\d*)/))[1] < 604)
            };
        }
        function makeIDBKeyRange(range) {
            if (range.type === 3 )
                return null;
            if (range.type === 4 )
                throw new Error("Cannot convert never type to IDBKeyRange");
            const { lower, upper, lowerOpen, upperOpen } = range;
            const idbRange = lower === undefined ?
                upper === undefined ?
                    null :
                    IdbKeyRange.upperBound(upper, !!upperOpen) :
                upper === undefined ?
                    IdbKeyRange.lowerBound(lower, !!lowerOpen) :
                    IdbKeyRange.bound(lower, upper, !!lowerOpen, !!upperOpen);
            return idbRange;
        }
        function createDbCoreTable(tableSchema) {
            const tableName = tableSchema.name;
            function mutate({ trans, type, keys, values, range }) {
                return new Promise((resolve, reject) => {
                    resolve = wrap(resolve);
                    const store = trans.objectStore(tableName);
                    const outbound = store.keyPath == null;
                    const isAddOrPut = type === "put" || type === "add";
                    if (!isAddOrPut && type !== 'delete' && type !== 'deleteRange')
                        throw new Error("Invalid operation type: " + type);
                    const { length } = keys || values || { length: 1 };
                    if (keys && values && keys.length !== values.length) {
                        throw new Error("Given keys array must have same length as given values array.");
                    }
                    if (length === 0)
                        return resolve({ numFailures: 0, failures: {}, results: [], lastResult: undefined });
                    let req;
                    const reqs = [];
                    const failures = [];
                    let numFailures = 0;
                    const errorHandler = event => {
                        ++numFailures;
                        preventDefault(event);
                    };
                    if (type === 'deleteRange') {
                        if (range.type === 4 )
                            return resolve({ numFailures, failures, results: [], lastResult: undefined });
                        if (range.type === 3 )
                            reqs.push(req = store.clear());
                        else
                            reqs.push(req = store.delete(makeIDBKeyRange(range)));
                    }
                    else {
                        const [args1, args2] = isAddOrPut ?
                            outbound ?
                                [values, keys] :
                                [values, null] :
                            [keys, null];
                        if (isAddOrPut) {
                            for (let i = 0; i < length; ++i) {
                                reqs.push(req = (args2 && args2[i] !== undefined ?
                                    store[type](args1[i], args2[i]) :
                                    store[type](args1[i])));
                                req.onerror = errorHandler;
                            }
                        }
                        else {
                            for (let i = 0; i < length; ++i) {
                                reqs.push(req = store[type](args1[i]));
                                req.onerror = errorHandler;
                            }
                        }
                    }
                    const done = event => {
                        const lastResult = event.target.result;
                        reqs.forEach((req, i) => req.error != null && (failures[i] = req.error));
                        resolve({
                            numFailures,
                            failures,
                            results: type === "delete" ? keys : reqs.map(req => req.result),
                            lastResult
                        });
                    };
                    req.onerror = event => {
                        errorHandler(event);
                        done(event);
                    };
                    req.onsuccess = done;
                });
            }
            function openCursor({ trans, values, query, reverse, unique }) {
                return new Promise((resolve, reject) => {
                    resolve = wrap(resolve);
                    const { index, range } = query;
                    const store = trans.objectStore(tableName);
                    const source = index.isPrimaryKey ?
                        store :
                        store.index(index.name);
                    const direction = reverse ?
                        unique ?
                            "prevunique" :
                            "prev" :
                        unique ?
                            "nextunique" :
                            "next";
                    const req = values || !('openKeyCursor' in source) ?
                        source.openCursor(makeIDBKeyRange(range), direction) :
                        source.openKeyCursor(makeIDBKeyRange(range), direction);
                    req.onerror = eventRejectHandler(reject);
                    req.onsuccess = wrap(ev => {
                        const cursor = req.result;
                        if (!cursor) {
                            resolve(null);
                            return;
                        }
                        cursor.___id = ++_id_counter;
                        cursor.done = false;
                        const _cursorContinue = cursor.continue.bind(cursor);
                        let _cursorContinuePrimaryKey = cursor.continuePrimaryKey;
                        if (_cursorContinuePrimaryKey)
                            _cursorContinuePrimaryKey = _cursorContinuePrimaryKey.bind(cursor);
                        const _cursorAdvance = cursor.advance.bind(cursor);
                        const doThrowCursorIsNotStarted = () => { throw new Error("Cursor not started"); };
                        const doThrowCursorIsStopped = () => { throw new Error("Cursor not stopped"); };
                        cursor.trans = trans;
                        cursor.stop = cursor.continue = cursor.continuePrimaryKey = cursor.advance = doThrowCursorIsNotStarted;
                        cursor.fail = wrap(reject);
                        cursor.next = function () {
                            let gotOne = 1;
                            return this.start(() => gotOne-- ? this.continue() : this.stop()).then(() => this);
                        };
                        cursor.start = (callback) => {
                            const iterationPromise = new Promise((resolveIteration, rejectIteration) => {
                                resolveIteration = wrap(resolveIteration);
                                req.onerror = eventRejectHandler(rejectIteration);
                                cursor.fail = rejectIteration;
                                cursor.stop = value => {
                                    cursor.stop = cursor.continue = cursor.continuePrimaryKey = cursor.advance = doThrowCursorIsStopped;
                                    resolveIteration(value);
                                };
                            });
                            const guardedCallback = () => {
                                if (req.result) {
                                    try {
                                        callback();
                                    }
                                    catch (err) {
                                        cursor.fail(err);
                                    }
                                }
                                else {
                                    cursor.done = true;
                                    cursor.start = () => { throw new Error("Cursor behind last entry"); };
                                    cursor.stop();
                                }
                            };
                            req.onsuccess = wrap(ev => {
                                req.onsuccess = guardedCallback;
                                guardedCallback();
                            });
                            cursor.continue = _cursorContinue;
                            cursor.continuePrimaryKey = _cursorContinuePrimaryKey;
                            cursor.advance = _cursorAdvance;
                            guardedCallback();
                            return iterationPromise;
                        };
                        resolve(cursor);
                    }, reject);
                });
            }
            function query(hasGetAll) {
                return (request) => {
                    return new Promise((resolve, reject) => {
                        resolve = wrap(resolve);
                        const { trans, values, limit, query } = request;
                        const nonInfinitLimit = limit === Infinity ? undefined : limit;
                        const { index, range } = query;
                        const store = trans.objectStore(tableName);
                        const source = index.isPrimaryKey ? store : store.index(index.name);
                        const idbKeyRange = makeIDBKeyRange(range);
                        if (limit === 0)
                            return resolve({ result: [] });
                        if (hasGetAll) {
                            const req = values ?
                                source.getAll(idbKeyRange, nonInfinitLimit) :
                                source.getAllKeys(idbKeyRange, nonInfinitLimit);
                            req.onsuccess = event => resolve({ result: event.target.result });
                            req.onerror = eventRejectHandler(reject);
                        }
                        else {
                            let count = 0;
                            const req = values || !('openKeyCursor' in source) ?
                                source.openCursor(idbKeyRange) :
                                source.openKeyCursor(idbKeyRange);
                            const result = [];
                            req.onsuccess = event => {
                                const cursor = req.result;
                                if (!cursor)
                                    return resolve({ result });
                                result.push(values ? cursor.value : cursor.primaryKey);
                                if (++count === limit)
                                    return resolve({ result });
                                cursor.continue();
                            };
                            req.onerror = eventRejectHandler(reject);
                        }
                    });
                };
            }
            return {
                name: tableName,
                schema: tableSchema,
                mutate,
                getMany({ trans, keys }) {
                    return new Promise((resolve, reject) => {
                        resolve = wrap(resolve);
                        const store = trans.objectStore(tableName);
                        const length = keys.length;
                        const result = new Array(length);
                        let keyCount = 0;
                        let callbackCount = 0;
                        let req;
                        const successHandler = event => {
                            const req = event.target;
                            if ((result[req._pos] = req.result) != null)
                                ;
                            if (++callbackCount === keyCount)
                                resolve(result);
                        };
                        const errorHandler = eventRejectHandler(reject);
                        for (let i = 0; i < length; ++i) {
                            const key = keys[i];
                            if (key != null) {
                                req = store.get(keys[i]);
                                req._pos = i;
                                req.onsuccess = successHandler;
                                req.onerror = errorHandler;
                                ++keyCount;
                            }
                        }
                        if (keyCount === 0)
                            resolve(result);
                    });
                },
                get({ trans, key }) {
                    return new Promise((resolve, reject) => {
                        resolve = wrap(resolve);
                        const store = trans.objectStore(tableName);
                        const req = store.get(key);
                        req.onsuccess = event => resolve(event.target.result);
                        req.onerror = eventRejectHandler(reject);
                    });
                },
                query: query(hasGetAll),
                openCursor,
                count({ query, trans }) {
                    const { index, range } = query;
                    return new Promise((resolve, reject) => {
                        const store = trans.objectStore(tableName);
                        const source = index.isPrimaryKey ? store : store.index(index.name);
                        const idbKeyRange = makeIDBKeyRange(range);
                        const req = idbKeyRange ? source.count(idbKeyRange) : source.count();
                        req.onsuccess = wrap(ev => resolve(ev.target.result));
                        req.onerror = eventRejectHandler(reject);
                    });
                }
            };
        }
        const { schema, hasGetAll } = extractSchema(db, tmpTrans);
        const tables = schema.tables.map(tableSchema => createDbCoreTable(tableSchema));
        const tableMap = {};
        tables.forEach(table => tableMap[table.name] = table);
        return {
            stack: "dbcore",
            transaction: db.transaction.bind(db),
            table(name) {
                const result = tableMap[name];
                if (!result)
                    throw new Error(`Table '${name}' not found`);
                return tableMap[name];
            },
            MIN_KEY: -Infinity,
            MAX_KEY: getMaxKey(IdbKeyRange),
            schema
        };
    }

    function createMiddlewareStack(stackImpl, middlewares) {
        return middlewares.reduce((down, { create }) => ({ ...down, ...create(down) }), stackImpl);
    }
    function createMiddlewareStacks(middlewares, idbdb, { IDBKeyRange, indexedDB }, tmpTrans) {
        const dbcore = createMiddlewareStack(createDBCore(idbdb, IDBKeyRange, tmpTrans), middlewares.dbcore);
        return {
            dbcore
        };
    }
    function generateMiddlewareStacks({ _novip: db }, tmpTrans) {
        const idbdb = tmpTrans.db;
        const stacks = createMiddlewareStacks(db._middlewares, idbdb, db._deps, tmpTrans);
        db.core = stacks.dbcore;
        db.tables.forEach(table => {
            const tableName = table.name;
            if (db.core.schema.tables.some(tbl => tbl.name === tableName)) {
                table.core = db.core.table(tableName);
                if (db[tableName] instanceof db.Table) {
                    db[tableName].core = table.core;
                }
            }
        });
    }

    function setApiOnPlace({ _novip: db }, objs, tableNames, dbschema) {
        tableNames.forEach(tableName => {
            const schema = dbschema[tableName];
            objs.forEach(obj => {
                const propDesc = getPropertyDescriptor(obj, tableName);
                if (!propDesc || ("value" in propDesc && propDesc.value === undefined)) {
                    if (obj === db.Transaction.prototype || obj instanceof db.Transaction) {
                        setProp(obj, tableName, {
                            get() { return this.table(tableName); },
                            set(value) {
                                defineProperty(this, tableName, { value, writable: true, configurable: true, enumerable: true });
                            }
                        });
                    }
                    else {
                        obj[tableName] = new db.Table(tableName, schema);
                    }
                }
            });
        });
    }
    function removeTablesApi({ _novip: db }, objs) {
        objs.forEach(obj => {
            for (let key in obj) {
                if (obj[key] instanceof db.Table)
                    delete obj[key];
            }
        });
    }
    function lowerVersionFirst(a, b) {
        return a._cfg.version - b._cfg.version;
    }
    function runUpgraders(db, oldVersion, idbUpgradeTrans, reject) {
        const globalSchema = db._dbSchema;
        const trans = db._createTransaction('readwrite', db._storeNames, globalSchema);
        trans.create(idbUpgradeTrans);
        trans._completion.catch(reject);
        const rejectTransaction = trans._reject.bind(trans);
        const transless = PSD.transless || PSD;
        newScope(() => {
            PSD.trans = trans;
            PSD.transless = transless;
            if (oldVersion === 0) {
                keys(globalSchema).forEach(tableName => {
                    createTable(idbUpgradeTrans, tableName, globalSchema[tableName].primKey, globalSchema[tableName].indexes);
                });
                generateMiddlewareStacks(db, idbUpgradeTrans);
                DexiePromise.follow(() => db.on.populate.fire(trans)).catch(rejectTransaction);
            }
            else
                updateTablesAndIndexes(db, oldVersion, trans, idbUpgradeTrans).catch(rejectTransaction);
        });
    }
    function updateTablesAndIndexes({ _novip: db }, oldVersion, trans, idbUpgradeTrans) {
        const queue = [];
        const versions = db._versions;
        let globalSchema = db._dbSchema = buildGlobalSchema(db, db.idbdb, idbUpgradeTrans);
        let anyContentUpgraderHasRun = false;
        const versToRun = versions.filter(v => v._cfg.version >= oldVersion);
        versToRun.forEach(version => {
            queue.push(() => {
                const oldSchema = globalSchema;
                const newSchema = version._cfg.dbschema;
                adjustToExistingIndexNames(db, oldSchema, idbUpgradeTrans);
                adjustToExistingIndexNames(db, newSchema, idbUpgradeTrans);
                globalSchema = db._dbSchema = newSchema;
                const diff = getSchemaDiff(oldSchema, newSchema);
                diff.add.forEach(tuple => {
                    createTable(idbUpgradeTrans, tuple[0], tuple[1].primKey, tuple[1].indexes);
                });
                diff.change.forEach(change => {
                    if (change.recreate) {
                        throw new exceptions.Upgrade("Not yet support for changing primary key");
                    }
                    else {
                        const store = idbUpgradeTrans.objectStore(change.name);
                        change.add.forEach(idx => addIndex(store, idx));
                        change.change.forEach(idx => {
                            store.deleteIndex(idx.name);
                            addIndex(store, idx);
                        });
                        change.del.forEach(idxName => store.deleteIndex(idxName));
                    }
                });
                const contentUpgrade = version._cfg.contentUpgrade;
                if (contentUpgrade && version._cfg.version > oldVersion) {
                    generateMiddlewareStacks(db, idbUpgradeTrans);
                    trans._memoizedTables = {};
                    anyContentUpgraderHasRun = true;
                    let upgradeSchema = shallowClone(newSchema);
                    diff.del.forEach(table => {
                        upgradeSchema[table] = oldSchema[table];
                    });
                    removeTablesApi(db, [db.Transaction.prototype]);
                    setApiOnPlace(db, [db.Transaction.prototype], keys(upgradeSchema), upgradeSchema);
                    trans.schema = upgradeSchema;
                    const contentUpgradeIsAsync = isAsyncFunction(contentUpgrade);
                    if (contentUpgradeIsAsync) {
                        incrementExpectedAwaits();
                    }
                    let returnValue;
                    const promiseFollowed = DexiePromise.follow(() => {
                        returnValue = contentUpgrade(trans);
                        if (returnValue) {
                            if (contentUpgradeIsAsync) {
                                var decrementor = decrementExpectedAwaits.bind(null, null);
                                returnValue.then(decrementor, decrementor);
                            }
                        }
                    });
                    return (returnValue && typeof returnValue.then === 'function' ?
                        DexiePromise.resolve(returnValue) : promiseFollowed.then(() => returnValue));
                }
            });
            queue.push(idbtrans => {
                if (!anyContentUpgraderHasRun || !hasIEDeleteObjectStoreBug) {
                    const newSchema = version._cfg.dbschema;
                    deleteRemovedTables(newSchema, idbtrans);
                }
                removeTablesApi(db, [db.Transaction.prototype]);
                setApiOnPlace(db, [db.Transaction.prototype], db._storeNames, db._dbSchema);
                trans.schema = db._dbSchema;
            });
        });
        function runQueue() {
            return queue.length ? DexiePromise.resolve(queue.shift()(trans.idbtrans)).then(runQueue) :
                DexiePromise.resolve();
        }
        return runQueue().then(() => {
            createMissingTables(globalSchema, idbUpgradeTrans);
        });
    }
    function getSchemaDiff(oldSchema, newSchema) {
        const diff = {
            del: [],
            add: [],
            change: []
        };
        let table;
        for (table in oldSchema) {
            if (!newSchema[table])
                diff.del.push(table);
        }
        for (table in newSchema) {
            const oldDef = oldSchema[table], newDef = newSchema[table];
            if (!oldDef) {
                diff.add.push([table, newDef]);
            }
            else {
                const change = {
                    name: table,
                    def: newDef,
                    recreate: false,
                    del: [],
                    add: [],
                    change: []
                };
                if ((
                '' + (oldDef.primKey.keyPath || '')) !== ('' + (newDef.primKey.keyPath || '')) ||
                    (oldDef.primKey.auto !== newDef.primKey.auto && !isIEOrEdge))
                 {
                    change.recreate = true;
                    diff.change.push(change);
                }
                else {
                    const oldIndexes = oldDef.idxByName;
                    const newIndexes = newDef.idxByName;
                    let idxName;
                    for (idxName in oldIndexes) {
                        if (!newIndexes[idxName])
                            change.del.push(idxName);
                    }
                    for (idxName in newIndexes) {
                        const oldIdx = oldIndexes[idxName], newIdx = newIndexes[idxName];
                        if (!oldIdx)
                            change.add.push(newIdx);
                        else if (oldIdx.src !== newIdx.src)
                            change.change.push(newIdx);
                    }
                    if (change.del.length > 0 || change.add.length > 0 || change.change.length > 0) {
                        diff.change.push(change);
                    }
                }
            }
        }
        return diff;
    }
    function createTable(idbtrans, tableName, primKey, indexes) {
        const store = idbtrans.db.createObjectStore(tableName, primKey.keyPath ?
            { keyPath: primKey.keyPath, autoIncrement: primKey.auto } :
            { autoIncrement: primKey.auto });
        indexes.forEach(idx => addIndex(store, idx));
        return store;
    }
    function createMissingTables(newSchema, idbtrans) {
        keys(newSchema).forEach(tableName => {
            if (!idbtrans.db.objectStoreNames.contains(tableName)) {
                createTable(idbtrans, tableName, newSchema[tableName].primKey, newSchema[tableName].indexes);
            }
        });
    }
    function deleteRemovedTables(newSchema, idbtrans) {
        [].slice.call(idbtrans.db.objectStoreNames).forEach(storeName => newSchema[storeName] == null && idbtrans.db.deleteObjectStore(storeName));
    }
    function addIndex(store, idx) {
        store.createIndex(idx.name, idx.keyPath, { unique: idx.unique, multiEntry: idx.multi });
    }
    function buildGlobalSchema(db, idbdb, tmpTrans) {
        const globalSchema = {};
        const dbStoreNames = slice(idbdb.objectStoreNames, 0);
        dbStoreNames.forEach(storeName => {
            const store = tmpTrans.objectStore(storeName);
            let keyPath = store.keyPath;
            const primKey = createIndexSpec(nameFromKeyPath(keyPath), keyPath || "", false, false, !!store.autoIncrement, keyPath && typeof keyPath !== "string", true);
            const indexes = [];
            for (let j = 0; j < store.indexNames.length; ++j) {
                const idbindex = store.index(store.indexNames[j]);
                keyPath = idbindex.keyPath;
                var index = createIndexSpec(idbindex.name, keyPath, !!idbindex.unique, !!idbindex.multiEntry, false, keyPath && typeof keyPath !== "string", false);
                indexes.push(index);
            }
            globalSchema[storeName] = createTableSchema(storeName, primKey, indexes);
        });
        return globalSchema;
    }
    function readGlobalSchema({ _novip: db }, idbdb, tmpTrans) {
        db.verno = idbdb.version / 10;
        const globalSchema = db._dbSchema = buildGlobalSchema(db, idbdb, tmpTrans);
        db._storeNames = slice(idbdb.objectStoreNames, 0);
        setApiOnPlace(db, [db._allTables], keys(globalSchema), globalSchema);
    }
    function verifyInstalledSchema(db, tmpTrans) {
        const installedSchema = buildGlobalSchema(db, db.idbdb, tmpTrans);
        const diff = getSchemaDiff(installedSchema, db._dbSchema);
        return !(diff.add.length || diff.change.some(ch => ch.add.length || ch.change.length));
    }
    function adjustToExistingIndexNames({ _novip: db }, schema, idbtrans) {
        const storeNames = idbtrans.db.objectStoreNames;
        for (let i = 0; i < storeNames.length; ++i) {
            const storeName = storeNames[i];
            const store = idbtrans.objectStore(storeName);
            db._hasGetAll = 'getAll' in store;
            for (let j = 0; j < store.indexNames.length; ++j) {
                const indexName = store.indexNames[j];
                const keyPath = store.index(indexName).keyPath;
                const dexieName = typeof keyPath === 'string' ? keyPath : "[" + slice(keyPath).join('+') + "]";
                if (schema[storeName]) {
                    const indexSpec = schema[storeName].idxByName[dexieName];
                    if (indexSpec) {
                        indexSpec.name = indexName;
                        delete schema[storeName].idxByName[dexieName];
                        schema[storeName].idxByName[indexName] = indexSpec;
                    }
                }
            }
        }
        if (typeof navigator !== 'undefined' && /Safari/.test(navigator.userAgent) &&
            !/(Chrome\/|Edge\/)/.test(navigator.userAgent) &&
            _global.WorkerGlobalScope && _global instanceof _global.WorkerGlobalScope &&
            [].concat(navigator.userAgent.match(/Safari\/(\d*)/))[1] < 604) {
            db._hasGetAll = false;
        }
    }
    function parseIndexSyntax(primKeyAndIndexes) {
        return primKeyAndIndexes.split(',').map((index, indexNum) => {
            index = index.trim();
            const name = index.replace(/([&*]|\+\+)/g, "");
            const keyPath = /^\[/.test(name) ? name.match(/^\[(.*)\]$/)[1].split('+') : name;
            return createIndexSpec(name, keyPath || null, /\&/.test(index), /\*/.test(index), /\+\+/.test(index), isArray(keyPath), indexNum === 0);
        });
    }

    class Version {
        _parseStoresSpec(stores, outSchema) {
            keys(stores).forEach(tableName => {
                if (stores[tableName] !== null) {
                    var indexes = parseIndexSyntax(stores[tableName]);
                    var primKey = indexes.shift();
                    if (primKey.multi)
                        throw new exceptions.Schema("Primary key cannot be multi-valued");
                    indexes.forEach(idx => {
                        if (idx.auto)
                            throw new exceptions.Schema("Only primary key can be marked as autoIncrement (++)");
                        if (!idx.keyPath)
                            throw new exceptions.Schema("Index must have a name and cannot be an empty string");
                    });
                    outSchema[tableName] = createTableSchema(tableName, primKey, indexes);
                }
            });
        }
        stores(stores) {
            const db = this.db;
            this._cfg.storesSource = this._cfg.storesSource ?
                extend(this._cfg.storesSource, stores) :
                stores;
            const versions = db._versions;
            const storesSpec = {};
            let dbschema = {};
            versions.forEach(version => {
                extend(storesSpec, version._cfg.storesSource);
                dbschema = (version._cfg.dbschema = {});
                version._parseStoresSpec(storesSpec, dbschema);
            });
            db._dbSchema = dbschema;
            removeTablesApi(db, [db._allTables, db, db.Transaction.prototype]);
            setApiOnPlace(db, [db._allTables, db, db.Transaction.prototype, this._cfg.tables], keys(dbschema), dbschema);
            db._storeNames = keys(dbschema);
            return this;
        }
        upgrade(upgradeFunction) {
            this._cfg.contentUpgrade = promisableChain(this._cfg.contentUpgrade || nop, upgradeFunction);
            return this;
        }
    }

    function createVersionConstructor(db) {
        return makeClassConstructor(Version.prototype, function Version(versionNumber) {
            this.db = db;
            this._cfg = {
                version: versionNumber,
                storesSource: null,
                dbschema: {},
                tables: {},
                contentUpgrade: null
            };
        });
    }

    function getDbNamesTable(indexedDB, IDBKeyRange) {
        let dbNamesDB = indexedDB["_dbNamesDB"];
        if (!dbNamesDB) {
            dbNamesDB = indexedDB["_dbNamesDB"] = new Dexie$1(DBNAMES_DB, {
                addons: [],
                indexedDB,
                IDBKeyRange,
            });
            dbNamesDB.version(1).stores({ dbnames: "name" });
        }
        return dbNamesDB.table("dbnames");
    }
    function hasDatabasesNative(indexedDB) {
        return indexedDB && typeof indexedDB.databases === "function";
    }
    function getDatabaseNames({ indexedDB, IDBKeyRange, }) {
        return hasDatabasesNative(indexedDB)
            ? Promise.resolve(indexedDB.databases()).then((infos) => infos
                .map((info) => info.name)
                .filter((name) => name !== DBNAMES_DB))
            : getDbNamesTable(indexedDB, IDBKeyRange).toCollection().primaryKeys();
    }
    function _onDatabaseCreated({ indexedDB, IDBKeyRange }, name) {
        !hasDatabasesNative(indexedDB) &&
            name !== DBNAMES_DB &&
            getDbNamesTable(indexedDB, IDBKeyRange).put({ name }).catch(nop);
    }
    function _onDatabaseDeleted({ indexedDB, IDBKeyRange }, name) {
        !hasDatabasesNative(indexedDB) &&
            name !== DBNAMES_DB &&
            getDbNamesTable(indexedDB, IDBKeyRange).delete(name).catch(nop);
    }

    function vip(fn) {
        return newScope(function () {
            PSD.letThrough = true;
            return fn();
        });
    }

    function idbReady() {
        var isSafari = !navigator.userAgentData &&
            /Safari\//.test(navigator.userAgent) &&
            !/Chrom(e|ium)\//.test(navigator.userAgent);
        if (!isSafari || !indexedDB.databases)
            return Promise.resolve();
        var intervalId;
        return new Promise(function (resolve) {
            var tryIdb = function () { return indexedDB.databases().finally(resolve); };
            intervalId = setInterval(tryIdb, 100);
            tryIdb();
        }).finally(function () { return clearInterval(intervalId); });
    }

    function dexieOpen(db) {
        const state = db._state;
        const { indexedDB } = db._deps;
        if (state.isBeingOpened || db.idbdb)
            return state.dbReadyPromise.then(() => state.dbOpenError ?
                rejection(state.dbOpenError) :
                db);
        debug && (state.openCanceller._stackHolder = getErrorWithStack());
        state.isBeingOpened = true;
        state.dbOpenError = null;
        state.openComplete = false;
        const openCanceller = state.openCanceller;
        function throwIfCancelled() {
            if (state.openCanceller !== openCanceller)
                throw new exceptions.DatabaseClosed('db.open() was cancelled');
        }
        let resolveDbReady = state.dbReadyResolve,
        upgradeTransaction = null, wasCreated = false;
        return DexiePromise.race([openCanceller, (typeof navigator === 'undefined' ? DexiePromise.resolve() : idbReady()).then(() => new DexiePromise((resolve, reject) => {
                throwIfCancelled();
                if (!indexedDB)
                    throw new exceptions.MissingAPI();
                const dbName = db.name;
                const req = state.autoSchema ?
                    indexedDB.open(dbName) :
                    indexedDB.open(dbName, Math.round(db.verno * 10));
                if (!req)
                    throw new exceptions.MissingAPI();
                req.onerror = eventRejectHandler(reject);
                req.onblocked = wrap(db._fireOnBlocked);
                req.onupgradeneeded = wrap(e => {
                    upgradeTransaction = req.transaction;
                    if (state.autoSchema && !db._options.allowEmptyDB) {
                        req.onerror = preventDefault;
                        upgradeTransaction.abort();
                        req.result.close();
                        const delreq = indexedDB.deleteDatabase(dbName);
                        delreq.onsuccess = delreq.onerror = wrap(() => {
                            reject(new exceptions.NoSuchDatabase(`Database ${dbName} doesnt exist`));
                        });
                    }
                    else {
                        upgradeTransaction.onerror = eventRejectHandler(reject);
                        var oldVer = e.oldVersion > Math.pow(2, 62) ? 0 : e.oldVersion;
                        wasCreated = oldVer < 1;
                        db._novip.idbdb = req.result;
                        runUpgraders(db, oldVer / 10, upgradeTransaction, reject);
                    }
                }, reject);
                req.onsuccess = wrap(() => {
                    upgradeTransaction = null;
                    const idbdb = db._novip.idbdb = req.result;
                    const objectStoreNames = slice(idbdb.objectStoreNames);
                    if (objectStoreNames.length > 0)
                        try {
                            const tmpTrans = idbdb.transaction(safariMultiStoreFix(objectStoreNames), 'readonly');
                            if (state.autoSchema)
                                readGlobalSchema(db, idbdb, tmpTrans);
                            else {
                                adjustToExistingIndexNames(db, db._dbSchema, tmpTrans);
                                if (!verifyInstalledSchema(db, tmpTrans)) {
                                    console.warn(`Dexie SchemaDiff: Schema was extended without increasing the number passed to db.version(). Some queries may fail.`);
                                }
                            }
                            generateMiddlewareStacks(db, tmpTrans);
                        }
                        catch (e) {
                        }
                    connections.push(db);
                    idbdb.onversionchange = wrap(ev => {
                        state.vcFired = true;
                        db.on("versionchange").fire(ev);
                    });
                    idbdb.onclose = wrap(ev => {
                        db.on("close").fire(ev);
                    });
                    if (wasCreated)
                        _onDatabaseCreated(db._deps, dbName);
                    resolve();
                }, reject);
            }))]).then(() => {
            throwIfCancelled();
            state.onReadyBeingFired = [];
            return DexiePromise.resolve(vip(() => db.on.ready.fire(db.vip))).then(function fireRemainders() {
                if (state.onReadyBeingFired.length > 0) {
                    let remainders = state.onReadyBeingFired.reduce(promisableChain, nop);
                    state.onReadyBeingFired = [];
                    return DexiePromise.resolve(vip(() => remainders(db.vip))).then(fireRemainders);
                }
            });
        }).finally(() => {
            state.onReadyBeingFired = null;
            state.isBeingOpened = false;
        }).then(() => {
            return db;
        }).catch(err => {
            state.dbOpenError = err;
            try {
                upgradeTransaction && upgradeTransaction.abort();
            }
            catch (_a) { }
            if (openCanceller === state.openCanceller) {
                db._close();
            }
            return rejection(err);
        }).finally(() => {
            state.openComplete = true;
            resolveDbReady();
        });
    }

    function awaitIterator(iterator) {
        var callNext = result => iterator.next(result), doThrow = error => iterator.throw(error), onSuccess = step(callNext), onError = step(doThrow);
        function step(getNext) {
            return (val) => {
                var next = getNext(val), value = next.value;
                return next.done ? value :
                    (!value || typeof value.then !== 'function' ?
                        isArray(value) ? Promise.all(value).then(onSuccess, onError) : onSuccess(value) :
                        value.then(onSuccess, onError));
            };
        }
        return step(callNext)();
    }

    function extractTransactionArgs(mode, _tableArgs_, scopeFunc) {
        var i = arguments.length;
        if (i < 2)
            throw new exceptions.InvalidArgument("Too few arguments");
        var args = new Array(i - 1);
        while (--i)
            args[i - 1] = arguments[i];
        scopeFunc = args.pop();
        var tables = flatten(args);
        return [mode, tables, scopeFunc];
    }
    function enterTransactionScope(db, mode, storeNames, parentTransaction, scopeFunc) {
        return DexiePromise.resolve().then(() => {
            const transless = PSD.transless || PSD;
            const trans = db._createTransaction(mode, storeNames, db._dbSchema, parentTransaction);
            const zoneProps = {
                trans: trans,
                transless: transless
            };
            if (parentTransaction) {
                trans.idbtrans = parentTransaction.idbtrans;
            }
            else {
                try {
                    trans.create();
                    db._state.PR1398_maxLoop = 3;
                }
                catch (ex) {
                    if (ex.name === errnames.InvalidState && db.isOpen() && --db._state.PR1398_maxLoop > 0) {
                        console.warn('Dexie: Need to reopen db');
                        db._close();
                        return db.open().then(() => enterTransactionScope(db, mode, storeNames, null, scopeFunc));
                    }
                    return rejection(ex);
                }
            }
            const scopeFuncIsAsync = isAsyncFunction(scopeFunc);
            if (scopeFuncIsAsync) {
                incrementExpectedAwaits();
            }
            let returnValue;
            const promiseFollowed = DexiePromise.follow(() => {
                returnValue = scopeFunc.call(trans, trans);
                if (returnValue) {
                    if (scopeFuncIsAsync) {
                        var decrementor = decrementExpectedAwaits.bind(null, null);
                        returnValue.then(decrementor, decrementor);
                    }
                    else if (typeof returnValue.next === 'function' && typeof returnValue.throw === 'function') {
                        returnValue = awaitIterator(returnValue);
                    }
                }
            }, zoneProps);
            return (returnValue && typeof returnValue.then === 'function' ?
                DexiePromise.resolve(returnValue).then(x => trans.active ?
                    x
                    : rejection(new exceptions.PrematureCommit("Transaction committed too early. See http://bit.ly/2kdckMn")))
                : promiseFollowed.then(() => returnValue)).then(x => {
                if (parentTransaction)
                    trans._resolve();
                return trans._completion.then(() => x);
            }).catch(e => {
                trans._reject(e);
                return rejection(e);
            });
        });
    }

    function pad(a, value, count) {
        const result = isArray(a) ? a.slice() : [a];
        for (let i = 0; i < count; ++i)
            result.push(value);
        return result;
    }
    function createVirtualIndexMiddleware(down) {
        return {
            ...down,
            table(tableName) {
                const table = down.table(tableName);
                const { schema } = table;
                const indexLookup = {};
                const allVirtualIndexes = [];
                function addVirtualIndexes(keyPath, keyTail, lowLevelIndex) {
                    const keyPathAlias = getKeyPathAlias(keyPath);
                    const indexList = (indexLookup[keyPathAlias] = indexLookup[keyPathAlias] || []);
                    const keyLength = keyPath == null ? 0 : typeof keyPath === 'string' ? 1 : keyPath.length;
                    const isVirtual = keyTail > 0;
                    const virtualIndex = {
                        ...lowLevelIndex,
                        isVirtual,
                        keyTail,
                        keyLength,
                        extractKey: getKeyExtractor(keyPath),
                        unique: !isVirtual && lowLevelIndex.unique
                    };
                    indexList.push(virtualIndex);
                    if (!virtualIndex.isPrimaryKey) {
                        allVirtualIndexes.push(virtualIndex);
                    }
                    if (keyLength > 1) {
                        const virtualKeyPath = keyLength === 2 ?
                            keyPath[0] :
                            keyPath.slice(0, keyLength - 1);
                        addVirtualIndexes(virtualKeyPath, keyTail + 1, lowLevelIndex);
                    }
                    indexList.sort((a, b) => a.keyTail - b.keyTail);
                    return virtualIndex;
                }
                const primaryKey = addVirtualIndexes(schema.primaryKey.keyPath, 0, schema.primaryKey);
                indexLookup[":id"] = [primaryKey];
                for (const index of schema.indexes) {
                    addVirtualIndexes(index.keyPath, 0, index);
                }
                function findBestIndex(keyPath) {
                    const result = indexLookup[getKeyPathAlias(keyPath)];
                    return result && result[0];
                }
                function translateRange(range, keyTail) {
                    return {
                        type: range.type === 1  ?
                            2  :
                            range.type,
                        lower: pad(range.lower, range.lowerOpen ? down.MAX_KEY : down.MIN_KEY, keyTail),
                        lowerOpen: true,
                        upper: pad(range.upper, range.upperOpen ? down.MIN_KEY : down.MAX_KEY, keyTail),
                        upperOpen: true
                    };
                }
                function translateRequest(req) {
                    const index = req.query.index;
                    return index.isVirtual ? {
                        ...req,
                        query: {
                            index,
                            range: translateRange(req.query.range, index.keyTail)
                        }
                    } : req;
                }
                const result = {
                    ...table,
                    schema: {
                        ...schema,
                        primaryKey,
                        indexes: allVirtualIndexes,
                        getIndexByKeyPath: findBestIndex
                    },
                    count(req) {
                        return table.count(translateRequest(req));
                    },
                    query(req) {
                        return table.query(translateRequest(req));
                    },
                    openCursor(req) {
                        const { keyTail, isVirtual, keyLength } = req.query.index;
                        if (!isVirtual)
                            return table.openCursor(req);
                        function createVirtualCursor(cursor) {
                            function _continue(key) {
                                key != null ?
                                    cursor.continue(pad(key, req.reverse ? down.MAX_KEY : down.MIN_KEY, keyTail)) :
                                    req.unique ?
                                        cursor.continue(cursor.key.slice(0, keyLength)
                                            .concat(req.reverse
                                            ? down.MIN_KEY
                                            : down.MAX_KEY, keyTail)) :
                                        cursor.continue();
                            }
                            const virtualCursor = Object.create(cursor, {
                                continue: { value: _continue },
                                continuePrimaryKey: {
                                    value(key, primaryKey) {
                                        cursor.continuePrimaryKey(pad(key, down.MAX_KEY, keyTail), primaryKey);
                                    }
                                },
                                primaryKey: {
                                    get() {
                                        return cursor.primaryKey;
                                    }
                                },
                                key: {
                                    get() {
                                        const key = cursor.key;
                                        return keyLength === 1 ?
                                            key[0] :
                                            key.slice(0, keyLength);
                                    }
                                },
                                value: {
                                    get() {
                                        return cursor.value;
                                    }
                                }
                            });
                            return virtualCursor;
                        }
                        return table.openCursor(translateRequest(req))
                            .then(cursor => cursor && createVirtualCursor(cursor));
                    }
                };
                return result;
            }
        };
    }
    const virtualIndexMiddleware = {
        stack: "dbcore",
        name: "VirtualIndexMiddleware",
        level: 1,
        create: createVirtualIndexMiddleware
    };

    function getObjectDiff(a, b, rv, prfx) {
        rv = rv || {};
        prfx = prfx || '';
        keys(a).forEach((prop) => {
            if (!hasOwn(b, prop)) {
                rv[prfx + prop] = undefined;
            }
            else {
                var ap = a[prop], bp = b[prop];
                if (typeof ap === 'object' && typeof bp === 'object' && ap && bp) {
                    const apTypeName = toStringTag(ap);
                    const bpTypeName = toStringTag(bp);
                    if (apTypeName !== bpTypeName) {
                        rv[prfx + prop] = b[prop];
                    }
                    else if (apTypeName === 'Object') {
                        getObjectDiff(ap, bp, rv, prfx + prop + '.');
                    }
                    else if (ap !== bp) {
                        rv[prfx + prop] = b[prop];
                    }
                }
                else if (ap !== bp)
                    rv[prfx + prop] = b[prop];
            }
        });
        keys(b).forEach((prop) => {
            if (!hasOwn(a, prop)) {
                rv[prfx + prop] = b[prop];
            }
        });
        return rv;
    }

    function getEffectiveKeys(primaryKey, req) {
        if (req.type === 'delete')
            return req.keys;
        return req.keys || req.values.map(primaryKey.extractKey);
    }

    const hooksMiddleware = {
        stack: "dbcore",
        name: "HooksMiddleware",
        level: 2,
        create: (downCore) => ({
            ...downCore,
            table(tableName) {
                const downTable = downCore.table(tableName);
                const { primaryKey } = downTable.schema;
                const tableMiddleware = {
                    ...downTable,
                    mutate(req) {
                        const dxTrans = PSD.trans;
                        const { deleting, creating, updating } = dxTrans.table(tableName).hook;
                        switch (req.type) {
                            case 'add':
                                if (creating.fire === nop)
                                    break;
                                return dxTrans._promise('readwrite', () => addPutOrDelete(req), true);
                            case 'put':
                                if (creating.fire === nop && updating.fire === nop)
                                    break;
                                return dxTrans._promise('readwrite', () => addPutOrDelete(req), true);
                            case 'delete':
                                if (deleting.fire === nop)
                                    break;
                                return dxTrans._promise('readwrite', () => addPutOrDelete(req), true);
                            case 'deleteRange':
                                if (deleting.fire === nop)
                                    break;
                                return dxTrans._promise('readwrite', () => deleteRange(req), true);
                        }
                        return downTable.mutate(req);
                        function addPutOrDelete(req) {
                            const dxTrans = PSD.trans;
                            const keys = req.keys || getEffectiveKeys(primaryKey, req);
                            if (!keys)
                                throw new Error("Keys missing");
                            req = req.type === 'add' || req.type === 'put' ?
                                { ...req, keys } :
                                { ...req };
                            if (req.type !== 'delete')
                                req.values = [...req.values];
                            if (req.keys)
                                req.keys = [...req.keys];
                            return getExistingValues(downTable, req, keys).then(existingValues => {
                                const contexts = keys.map((key, i) => {
                                    const existingValue = existingValues[i];
                                    const ctx = { onerror: null, onsuccess: null };
                                    if (req.type === 'delete') {
                                        deleting.fire.call(ctx, key, existingValue, dxTrans);
                                    }
                                    else if (req.type === 'add' || existingValue === undefined) {
                                        const generatedPrimaryKey = creating.fire.call(ctx, key, req.values[i], dxTrans);
                                        if (key == null && generatedPrimaryKey != null) {
                                            key = generatedPrimaryKey;
                                            req.keys[i] = key;
                                            if (!primaryKey.outbound) {
                                                setByKeyPath(req.values[i], primaryKey.keyPath, key);
                                            }
                                        }
                                    }
                                    else {
                                        const objectDiff = getObjectDiff(existingValue, req.values[i]);
                                        const additionalChanges = updating.fire.call(ctx, objectDiff, key, existingValue, dxTrans);
                                        if (additionalChanges) {
                                            const requestedValue = req.values[i];
                                            Object.keys(additionalChanges).forEach(keyPath => {
                                                if (hasOwn(requestedValue, keyPath)) {
                                                    requestedValue[keyPath] = additionalChanges[keyPath];
                                                }
                                                else {
                                                    setByKeyPath(requestedValue, keyPath, additionalChanges[keyPath]);
                                                }
                                            });
                                        }
                                    }
                                    return ctx;
                                });
                                return downTable.mutate(req).then(({ failures, results, numFailures, lastResult }) => {
                                    for (let i = 0; i < keys.length; ++i) {
                                        const primKey = results ? results[i] : keys[i];
                                        const ctx = contexts[i];
                                        if (primKey == null) {
                                            ctx.onerror && ctx.onerror(failures[i]);
                                        }
                                        else {
                                            ctx.onsuccess && ctx.onsuccess(req.type === 'put' && existingValues[i] ?
                                                req.values[i] :
                                                primKey
                                            );
                                        }
                                    }
                                    return { failures, results, numFailures, lastResult };
                                }).catch(error => {
                                    contexts.forEach(ctx => ctx.onerror && ctx.onerror(error));
                                    return Promise.reject(error);
                                });
                            });
                        }
                        function deleteRange(req) {
                            return deleteNextChunk(req.trans, req.range, 10000);
                        }
                        function deleteNextChunk(trans, range, limit) {
                            return downTable.query({ trans, values: false, query: { index: primaryKey, range }, limit })
                                .then(({ result }) => {
                                return addPutOrDelete({ type: 'delete', keys: result, trans }).then(res => {
                                    if (res.numFailures > 0)
                                        return Promise.reject(res.failures[0]);
                                    if (result.length < limit) {
                                        return { failures: [], numFailures: 0, lastResult: undefined };
                                    }
                                    else {
                                        return deleteNextChunk(trans, { ...range, lower: result[result.length - 1], lowerOpen: true }, limit);
                                    }
                                });
                            });
                        }
                    }
                };
                return tableMiddleware;
            },
        })
    };
    function getExistingValues(table, req, effectiveKeys) {
        return req.type === "add"
            ? Promise.resolve([])
            : table.getMany({ trans: req.trans, keys: effectiveKeys, cache: "immutable" });
    }

    function getFromTransactionCache(keys, cache, clone) {
        try {
            if (!cache)
                return null;
            if (cache.keys.length < keys.length)
                return null;
            const result = [];
            for (let i = 0, j = 0; i < cache.keys.length && j < keys.length; ++i) {
                if (cmp(cache.keys[i], keys[j]) !== 0)
                    continue;
                result.push(clone ? deepClone(cache.values[i]) : cache.values[i]);
                ++j;
            }
            return result.length === keys.length ? result : null;
        }
        catch (_a) {
            return null;
        }
    }
    const cacheExistingValuesMiddleware = {
        stack: "dbcore",
        level: -1,
        create: (core) => {
            return {
                table: (tableName) => {
                    const table = core.table(tableName);
                    return {
                        ...table,
                        getMany: (req) => {
                            if (!req.cache) {
                                return table.getMany(req);
                            }
                            const cachedResult = getFromTransactionCache(req.keys, req.trans["_cache"], req.cache === "clone");
                            if (cachedResult) {
                                return DexiePromise.resolve(cachedResult);
                            }
                            return table.getMany(req).then((res) => {
                                req.trans["_cache"] = {
                                    keys: req.keys,
                                    values: req.cache === "clone" ? deepClone(res) : res,
                                };
                                return res;
                            });
                        },
                        mutate: (req) => {
                            if (req.type !== "add")
                                req.trans["_cache"] = null;
                            return table.mutate(req);
                        },
                    };
                },
            };
        },
    };

    function isEmptyRange(node) {
        return !("from" in node);
    }
    const RangeSet = function (fromOrTree, to) {
        if (this) {
            extend(this, arguments.length ? { d: 1, from: fromOrTree, to: arguments.length > 1 ? to : fromOrTree } : { d: 0 });
        }
        else {
            const rv = new RangeSet();
            if (fromOrTree && ("d" in fromOrTree)) {
                extend(rv, fromOrTree);
            }
            return rv;
        }
    };
    props(RangeSet.prototype, {
        add(rangeSet) {
            mergeRanges(this, rangeSet);
            return this;
        },
        addKey(key) {
            addRange(this, key, key);
            return this;
        },
        addKeys(keys) {
            keys.forEach(key => addRange(this, key, key));
            return this;
        },
        [iteratorSymbol]() {
            return getRangeSetIterator(this);
        }
    });
    function addRange(target, from, to) {
        const diff = cmp(from, to);
        if (isNaN(diff))
            return;
        if (diff > 0)
            throw RangeError();
        if (isEmptyRange(target))
            return extend(target, { from, to, d: 1 });
        const left = target.l;
        const right = target.r;
        if (cmp(to, target.from) < 0) {
            left
                ? addRange(left, from, to)
                : (target.l = { from, to, d: 1, l: null, r: null });
            return rebalance(target);
        }
        if (cmp(from, target.to) > 0) {
            right
                ? addRange(right, from, to)
                : (target.r = { from, to, d: 1, l: null, r: null });
            return rebalance(target);
        }
        if (cmp(from, target.from) < 0) {
            target.from = from;
            target.l = null;
            target.d = right ? right.d + 1 : 1;
        }
        if (cmp(to, target.to) > 0) {
            target.to = to;
            target.r = null;
            target.d = target.l ? target.l.d + 1 : 1;
        }
        const rightWasCutOff = !target.r;
        if (left && !target.l) {
            mergeRanges(target, left);
        }
        if (right && rightWasCutOff) {
            mergeRanges(target, right);
        }
    }
    function mergeRanges(target, newSet) {
        function _addRangeSet(target, { from, to, l, r }) {
            addRange(target, from, to);
            if (l)
                _addRangeSet(target, l);
            if (r)
                _addRangeSet(target, r);
        }
        if (!isEmptyRange(newSet))
            _addRangeSet(target, newSet);
    }
    function rangesOverlap(rangeSet1, rangeSet2) {
        const i1 = getRangeSetIterator(rangeSet2);
        let nextResult1 = i1.next();
        if (nextResult1.done)
            return false;
        let a = nextResult1.value;
        const i2 = getRangeSetIterator(rangeSet1);
        let nextResult2 = i2.next(a.from);
        let b = nextResult2.value;
        while (!nextResult1.done && !nextResult2.done) {
            if (cmp(b.from, a.to) <= 0 && cmp(b.to, a.from) >= 0)
                return true;
            cmp(a.from, b.from) < 0
                ? (a = (nextResult1 = i1.next(b.from)).value)
                : (b = (nextResult2 = i2.next(a.from)).value);
        }
        return false;
    }
    function getRangeSetIterator(node) {
        let state = isEmptyRange(node) ? null : { s: 0, n: node };
        return {
            next(key) {
                const keyProvided = arguments.length > 0;
                while (state) {
                    switch (state.s) {
                        case 0:
                            state.s = 1;
                            if (keyProvided) {
                                while (state.n.l && cmp(key, state.n.from) < 0)
                                    state = { up: state, n: state.n.l, s: 1 };
                            }
                            else {
                                while (state.n.l)
                                    state = { up: state, n: state.n.l, s: 1 };
                            }
                        case 1:
                            state.s = 2;
                            if (!keyProvided || cmp(key, state.n.to) <= 0)
                                return { value: state.n, done: false };
                        case 2:
                            if (state.n.r) {
                                state.s = 3;
                                state = { up: state, n: state.n.r, s: 0 };
                                continue;
                            }
                        case 3:
                            state = state.up;
                    }
                }
                return { done: true };
            },
        };
    }
    function rebalance(target) {
        var _a, _b;
        const diff = (((_a = target.r) === null || _a === void 0 ? void 0 : _a.d) || 0) - (((_b = target.l) === null || _b === void 0 ? void 0 : _b.d) || 0);
        const r = diff > 1 ? "r" : diff < -1 ? "l" : "";
        if (r) {
            const l = r === "r" ? "l" : "r";
            const rootClone = { ...target };
            const oldRootRight = target[r];
            target.from = oldRootRight.from;
            target.to = oldRootRight.to;
            target[r] = oldRootRight[r];
            rootClone[r] = oldRootRight[l];
            target[l] = rootClone;
            rootClone.d = computeDepth(rootClone);
        }
        target.d = computeDepth(target);
    }
    function computeDepth({ r, l }) {
        return (r ? (l ? Math.max(r.d, l.d) : r.d) : l ? l.d : 0) + 1;
    }

    const observabilityMiddleware = {
        stack: "dbcore",
        level: 0,
        create: (core) => {
            const dbName = core.schema.name;
            const FULL_RANGE = new RangeSet(core.MIN_KEY, core.MAX_KEY);
            return {
                ...core,
                table: (tableName) => {
                    const table = core.table(tableName);
                    const { schema } = table;
                    const { primaryKey } = schema;
                    const { extractKey, outbound } = primaryKey;
                    const tableClone = {
                        ...table,
                        mutate: (req) => {
                            const trans = req.trans;
                            const mutatedParts = trans.mutatedParts || (trans.mutatedParts = {});
                            const getRangeSet = (indexName) => {
                                const part = `idb://${dbName}/${tableName}/${indexName}`;
                                return (mutatedParts[part] ||
                                    (mutatedParts[part] = new RangeSet()));
                            };
                            const pkRangeSet = getRangeSet("");
                            const delsRangeSet = getRangeSet(":dels");
                            const { type } = req;
                            let [keys, newObjs] = req.type === "deleteRange"
                                ? [req.range]
                                : req.type === "delete"
                                    ? [req.keys]
                                    : req.values.length < 50
                                        ? [[], req.values]
                                        : [];
                            const oldCache = req.trans["_cache"];
                            return table.mutate(req).then((res) => {
                                if (isArray(keys)) {
                                    if (type !== "delete")
                                        keys = res.results;
                                    pkRangeSet.addKeys(keys);
                                    const oldObjs = getFromTransactionCache(keys, oldCache);
                                    if (!oldObjs && type !== "add") {
                                        delsRangeSet.addKeys(keys);
                                    }
                                    if (oldObjs || newObjs) {
                                        trackAffectedIndexes(getRangeSet, schema, oldObjs, newObjs);
                                    }
                                }
                                else if (keys) {
                                    const range = { from: keys.lower, to: keys.upper };
                                    delsRangeSet.add(range);
                                    pkRangeSet.add(range);
                                }
                                else {
                                    pkRangeSet.add(FULL_RANGE);
                                    delsRangeSet.add(FULL_RANGE);
                                    schema.indexes.forEach(idx => getRangeSet(idx.name).add(FULL_RANGE));
                                }
                                return res;
                            });
                        },
                    };
                    const getRange = ({ query: { index, range }, }) => {
                        var _a, _b;
                        return [
                            index,
                            new RangeSet((_a = range.lower) !== null && _a !== void 0 ? _a : core.MIN_KEY, (_b = range.upper) !== null && _b !== void 0 ? _b : core.MAX_KEY),
                        ];
                    };
                    const readSubscribers = {
                        get: (req) => [primaryKey, new RangeSet(req.key)],
                        getMany: (req) => [primaryKey, new RangeSet().addKeys(req.keys)],
                        count: getRange,
                        query: getRange,
                        openCursor: getRange,
                    };
                    keys(readSubscribers).forEach(method => {
                        tableClone[method] = function (req) {
                            const { subscr } = PSD;
                            if (subscr) {
                                const getRangeSet = (indexName) => {
                                    const part = `idb://${dbName}/${tableName}/${indexName}`;
                                    return (subscr[part] ||
                                        (subscr[part] = new RangeSet()));
                                };
                                const pkRangeSet = getRangeSet("");
                                const delsRangeSet = getRangeSet(":dels");
                                const [queriedIndex, queriedRanges] = readSubscribers[method](req);
                                getRangeSet(queriedIndex.name || "").add(queriedRanges);
                                if (!queriedIndex.isPrimaryKey) {
                                    if (method === "count") {
                                        delsRangeSet.add(FULL_RANGE);
                                    }
                                    else {
                                        const keysPromise = method === "query" &&
                                            outbound &&
                                            req.values &&
                                            table.query({
                                                ...req,
                                                values: false,
                                            });
                                        return table[method].apply(this, arguments).then((res) => {
                                            if (method === "query") {
                                                if (outbound && req.values) {
                                                    return keysPromise.then(({ result: resultingKeys }) => {
                                                        pkRangeSet.addKeys(resultingKeys);
                                                        return res;
                                                    });
                                                }
                                                const pKeys = req.values
                                                    ? res.result.map(extractKey)
                                                    : res.result;
                                                if (req.values) {
                                                    pkRangeSet.addKeys(pKeys);
                                                }
                                                else {
                                                    delsRangeSet.addKeys(pKeys);
                                                }
                                            }
                                            else if (method === "openCursor") {
                                                const cursor = res;
                                                const wantValues = req.values;
                                                return (cursor &&
                                                    Object.create(cursor, {
                                                        key: {
                                                            get() {
                                                                delsRangeSet.addKey(cursor.primaryKey);
                                                                return cursor.key;
                                                            },
                                                        },
                                                        primaryKey: {
                                                            get() {
                                                                const pkey = cursor.primaryKey;
                                                                delsRangeSet.addKey(pkey);
                                                                return pkey;
                                                            },
                                                        },
                                                        value: {
                                                            get() {
                                                                wantValues && pkRangeSet.addKey(cursor.primaryKey);
                                                                return cursor.value;
                                                            },
                                                        },
                                                    }));
                                            }
                                            return res;
                                        });
                                    }
                                }
                            }
                            return table[method].apply(this, arguments);
                        };
                    });
                    return tableClone;
                },
            };
        },
    };
    function trackAffectedIndexes(getRangeSet, schema, oldObjs, newObjs) {
        function addAffectedIndex(ix) {
            const rangeSet = getRangeSet(ix.name || "");
            function extractKey(obj) {
                return obj != null ? ix.extractKey(obj) : null;
            }
            const addKeyOrKeys = (key) => ix.multiEntry && isArray(key)
                ? key.forEach(key => rangeSet.addKey(key))
                : rangeSet.addKey(key);
            (oldObjs || newObjs).forEach((_, i) => {
                const oldKey = oldObjs && extractKey(oldObjs[i]);
                const newKey = newObjs && extractKey(newObjs[i]);
                if (cmp(oldKey, newKey) !== 0) {
                    if (oldKey != null)
                        addKeyOrKeys(oldKey);
                    if (newKey != null)
                        addKeyOrKeys(newKey);
                }
            });
        }
        schema.indexes.forEach(addAffectedIndex);
    }

    class Dexie$1 {
        constructor(name, options) {
            this._middlewares = {};
            this.verno = 0;
            const deps = Dexie$1.dependencies;
            this._options = options = {
                addons: Dexie$1.addons,
                autoOpen: true,
                indexedDB: deps.indexedDB,
                IDBKeyRange: deps.IDBKeyRange,
                ...options
            };
            this._deps = {
                indexedDB: options.indexedDB,
                IDBKeyRange: options.IDBKeyRange
            };
            const { addons, } = options;
            this._dbSchema = {};
            this._versions = [];
            this._storeNames = [];
            this._allTables = {};
            this.idbdb = null;
            this._novip = this;
            const state = {
                dbOpenError: null,
                isBeingOpened: false,
                onReadyBeingFired: null,
                openComplete: false,
                dbReadyResolve: nop,
                dbReadyPromise: null,
                cancelOpen: nop,
                openCanceller: null,
                autoSchema: true,
                PR1398_maxLoop: 3
            };
            state.dbReadyPromise = new DexiePromise(resolve => {
                state.dbReadyResolve = resolve;
            });
            state.openCanceller = new DexiePromise((_, reject) => {
                state.cancelOpen = reject;
            });
            this._state = state;
            this.name = name;
            this.on = Events(this, "populate", "blocked", "versionchange", "close", { ready: [promisableChain, nop] });
            this.on.ready.subscribe = override(this.on.ready.subscribe, subscribe => {
                return (subscriber, bSticky) => {
                    Dexie$1.vip(() => {
                        const state = this._state;
                        if (state.openComplete) {
                            if (!state.dbOpenError)
                                DexiePromise.resolve().then(subscriber);
                            if (bSticky)
                                subscribe(subscriber);
                        }
                        else if (state.onReadyBeingFired) {
                            state.onReadyBeingFired.push(subscriber);
                            if (bSticky)
                                subscribe(subscriber);
                        }
                        else {
                            subscribe(subscriber);
                            const db = this;
                            if (!bSticky)
                                subscribe(function unsubscribe() {
                                    db.on.ready.unsubscribe(subscriber);
                                    db.on.ready.unsubscribe(unsubscribe);
                                });
                        }
                    });
                };
            });
            this.Collection = createCollectionConstructor(this);
            this.Table = createTableConstructor(this);
            this.Transaction = createTransactionConstructor(this);
            this.Version = createVersionConstructor(this);
            this.WhereClause = createWhereClauseConstructor(this);
            this.on("versionchange", ev => {
                if (ev.newVersion > 0)
                    console.warn(`Another connection wants to upgrade database '${this.name}'. Closing db now to resume the upgrade.`);
                else
                    console.warn(`Another connection wants to delete database '${this.name}'. Closing db now to resume the delete request.`);
                this.close();
            });
            this.on("blocked", ev => {
                if (!ev.newVersion || ev.newVersion < ev.oldVersion)
                    console.warn(`Dexie.delete('${this.name}') was blocked`);
                else
                    console.warn(`Upgrade '${this.name}' blocked by other connection holding version ${ev.oldVersion / 10}`);
            });
            this._maxKey = getMaxKey(options.IDBKeyRange);
            this._createTransaction = (mode, storeNames, dbschema, parentTransaction) => new this.Transaction(mode, storeNames, dbschema, this._options.chromeTransactionDurability, parentTransaction);
            this._fireOnBlocked = ev => {
                this.on("blocked").fire(ev);
                connections
                    .filter(c => c.name === this.name && c !== this && !c._state.vcFired)
                    .map(c => c.on("versionchange").fire(ev));
            };
            this.use(virtualIndexMiddleware);
            this.use(hooksMiddleware);
            this.use(observabilityMiddleware);
            this.use(cacheExistingValuesMiddleware);
            this.vip = Object.create(this, { _vip: { value: true } });
            addons.forEach(addon => addon(this));
        }
        version(versionNumber) {
            if (isNaN(versionNumber) || versionNumber < 0.1)
                throw new exceptions.Type(`Given version is not a positive number`);
            versionNumber = Math.round(versionNumber * 10) / 10;
            if (this.idbdb || this._state.isBeingOpened)
                throw new exceptions.Schema("Cannot add version when database is open");
            this.verno = Math.max(this.verno, versionNumber);
            const versions = this._versions;
            var versionInstance = versions.filter(v => v._cfg.version === versionNumber)[0];
            if (versionInstance)
                return versionInstance;
            versionInstance = new this.Version(versionNumber);
            versions.push(versionInstance);
            versions.sort(lowerVersionFirst);
            versionInstance.stores({});
            this._state.autoSchema = false;
            return versionInstance;
        }
        _whenReady(fn) {
            return (this.idbdb && (this._state.openComplete || PSD.letThrough || this._vip)) ? fn() : new DexiePromise((resolve, reject) => {
                if (this._state.openComplete) {
                    return reject(new exceptions.DatabaseClosed(this._state.dbOpenError));
                }
                if (!this._state.isBeingOpened) {
                    if (!this._options.autoOpen) {
                        reject(new exceptions.DatabaseClosed());
                        return;
                    }
                    this.open().catch(nop);
                }
                this._state.dbReadyPromise.then(resolve, reject);
            }).then(fn);
        }
        use({ stack, create, level, name }) {
            if (name)
                this.unuse({ stack, name });
            const middlewares = this._middlewares[stack] || (this._middlewares[stack] = []);
            middlewares.push({ stack, create, level: level == null ? 10 : level, name });
            middlewares.sort((a, b) => a.level - b.level);
            return this;
        }
        unuse({ stack, name, create }) {
            if (stack && this._middlewares[stack]) {
                this._middlewares[stack] = this._middlewares[stack].filter(mw => create ? mw.create !== create :
                    name ? mw.name !== name :
                        false);
            }
            return this;
        }
        open() {
            return dexieOpen(this);
        }
        _close() {
            const state = this._state;
            const idx = connections.indexOf(this);
            if (idx >= 0)
                connections.splice(idx, 1);
            if (this.idbdb) {
                try {
                    this.idbdb.close();
                }
                catch (e) { }
                this._novip.idbdb = null;
            }
            state.dbReadyPromise = new DexiePromise(resolve => {
                state.dbReadyResolve = resolve;
            });
            state.openCanceller = new DexiePromise((_, reject) => {
                state.cancelOpen = reject;
            });
        }
        close() {
            this._close();
            const state = this._state;
            this._options.autoOpen = false;
            state.dbOpenError = new exceptions.DatabaseClosed();
            if (state.isBeingOpened)
                state.cancelOpen(state.dbOpenError);
        }
        delete() {
            const hasArguments = arguments.length > 0;
            const state = this._state;
            return new DexiePromise((resolve, reject) => {
                const doDelete = () => {
                    this.close();
                    var req = this._deps.indexedDB.deleteDatabase(this.name);
                    req.onsuccess = wrap(() => {
                        _onDatabaseDeleted(this._deps, this.name);
                        resolve();
                    });
                    req.onerror = eventRejectHandler(reject);
                    req.onblocked = this._fireOnBlocked;
                };
                if (hasArguments)
                    throw new exceptions.InvalidArgument("Arguments not allowed in db.delete()");
                if (state.isBeingOpened) {
                    state.dbReadyPromise.then(doDelete);
                }
                else {
                    doDelete();
                }
            });
        }
        backendDB() {
            return this.idbdb;
        }
        isOpen() {
            return this.idbdb !== null;
        }
        hasBeenClosed() {
            const dbOpenError = this._state.dbOpenError;
            return dbOpenError && (dbOpenError.name === 'DatabaseClosed');
        }
        hasFailed() {
            return this._state.dbOpenError !== null;
        }
        dynamicallyOpened() {
            return this._state.autoSchema;
        }
        get tables() {
            return keys(this._allTables).map(name => this._allTables[name]);
        }
        transaction() {
            const args = extractTransactionArgs.apply(this, arguments);
            return this._transaction.apply(this, args);
        }
        _transaction(mode, tables, scopeFunc) {
            let parentTransaction = PSD.trans;
            if (!parentTransaction || parentTransaction.db !== this || mode.indexOf('!') !== -1)
                parentTransaction = null;
            const onlyIfCompatible = mode.indexOf('?') !== -1;
            mode = mode.replace('!', '').replace('?', '');
            let idbMode, storeNames;
            try {
                storeNames = tables.map(table => {
                    var storeName = table instanceof this.Table ? table.name : table;
                    if (typeof storeName !== 'string')
                        throw new TypeError("Invalid table argument to Dexie.transaction(). Only Table or String are allowed");
                    return storeName;
                });
                if (mode == "r" || mode === READONLY)
                    idbMode = READONLY;
                else if (mode == "rw" || mode == READWRITE)
                    idbMode = READWRITE;
                else
                    throw new exceptions.InvalidArgument("Invalid transaction mode: " + mode);
                if (parentTransaction) {
                    if (parentTransaction.mode === READONLY && idbMode === READWRITE) {
                        if (onlyIfCompatible) {
                            parentTransaction = null;
                        }
                        else
                            throw new exceptions.SubTransaction("Cannot enter a sub-transaction with READWRITE mode when parent transaction is READONLY");
                    }
                    if (parentTransaction) {
                        storeNames.forEach(storeName => {
                            if (parentTransaction && parentTransaction.storeNames.indexOf(storeName) === -1) {
                                if (onlyIfCompatible) {
                                    parentTransaction = null;
                                }
                                else
                                    throw new exceptions.SubTransaction("Table " + storeName +
                                        " not included in parent transaction.");
                            }
                        });
                    }
                    if (onlyIfCompatible && parentTransaction && !parentTransaction.active) {
                        parentTransaction = null;
                    }
                }
            }
            catch (e) {
                return parentTransaction ?
                    parentTransaction._promise(null, (_, reject) => { reject(e); }) :
                    rejection(e);
            }
            const enterTransaction = enterTransactionScope.bind(null, this, idbMode, storeNames, parentTransaction, scopeFunc);
            return (parentTransaction ?
                parentTransaction._promise(idbMode, enterTransaction, "lock") :
                PSD.trans ?
                    usePSD(PSD.transless, () => this._whenReady(enterTransaction)) :
                    this._whenReady(enterTransaction));
        }
        table(tableName) {
            if (!hasOwn(this._allTables, tableName)) {
                throw new exceptions.InvalidTable(`Table ${tableName} does not exist`);
            }
            return this._allTables[tableName];
        }
    }

    const symbolObservable = typeof Symbol !== "undefined" && "observable" in Symbol
        ? Symbol.observable
        : "@@observable";
    class Observable {
        constructor(subscribe) {
            this._subscribe = subscribe;
        }
        subscribe(x, error, complete) {
            return this._subscribe(!x || typeof x === "function" ? { next: x, error, complete } : x);
        }
        [symbolObservable]() {
            return this;
        }
    }

    function extendObservabilitySet(target, newSet) {
        keys(newSet).forEach(part => {
            const rangeSet = target[part] || (target[part] = new RangeSet());
            mergeRanges(rangeSet, newSet[part]);
        });
        return target;
    }

    function liveQuery(querier) {
        return new Observable((observer) => {
            const scopeFuncIsAsync = isAsyncFunction(querier);
            function execute(subscr) {
                if (scopeFuncIsAsync) {
                    incrementExpectedAwaits();
                }
                const exec = () => newScope(querier, { subscr, trans: null });
                const rv = PSD.trans
                    ?
                        usePSD(PSD.transless, exec)
                    : exec();
                if (scopeFuncIsAsync) {
                    rv.then(decrementExpectedAwaits, decrementExpectedAwaits);
                }
                return rv;
            }
            let closed = false;
            let accumMuts = {};
            let currentObs = {};
            const subscription = {
                get closed() {
                    return closed;
                },
                unsubscribe: () => {
                    closed = true;
                    globalEvents.storagemutated.unsubscribe(mutationListener);
                },
            };
            observer.start && observer.start(subscription);
            let querying = false, startedListening = false;
            function shouldNotify() {
                return keys(currentObs).some((key) => accumMuts[key] && rangesOverlap(accumMuts[key], currentObs[key]));
            }
            const mutationListener = (parts) => {
                extendObservabilitySet(accumMuts, parts);
                if (shouldNotify()) {
                    doQuery();
                }
            };
            const doQuery = () => {
                if (querying || closed)
                    return;
                accumMuts = {};
                const subscr = {};
                const ret = execute(subscr);
                if (!startedListening) {
                    globalEvents(DEXIE_STORAGE_MUTATED_EVENT_NAME, mutationListener);
                    startedListening = true;
                }
                querying = true;
                Promise.resolve(ret).then((result) => {
                    querying = false;
                    if (closed)
                        return;
                    if (shouldNotify()) {
                        doQuery();
                    }
                    else {
                        accumMuts = {};
                        currentObs = subscr;
                        observer.next && observer.next(result);
                    }
                }, (err) => {
                    querying = false;
                    observer.error && observer.error(err);
                    subscription.unsubscribe();
                });
            };
            doQuery();
            return subscription;
        });
    }

    let domDeps;
    try {
        domDeps = {
            indexedDB: _global.indexedDB || _global.mozIndexedDB || _global.webkitIndexedDB || _global.msIndexedDB,
            IDBKeyRange: _global.IDBKeyRange || _global.webkitIDBKeyRange
        };
    }
    catch (e) {
        domDeps = { indexedDB: null, IDBKeyRange: null };
    }

    const Dexie = Dexie$1;
    props(Dexie, {
        ...fullNameExceptions,
        delete(databaseName) {
            const db = new Dexie(databaseName, { addons: [] });
            return db.delete();
        },
        exists(name) {
            return new Dexie(name, { addons: [] }).open().then(db => {
                db.close();
                return true;
            }).catch('NoSuchDatabaseError', () => false);
        },
        getDatabaseNames(cb) {
            try {
                return getDatabaseNames(Dexie.dependencies).then(cb);
            }
            catch (_a) {
                return rejection(new exceptions.MissingAPI());
            }
        },
        defineClass() {
            function Class(content) {
                extend(this, content);
            }
            return Class;
        },
        ignoreTransaction(scopeFunc) {
            return PSD.trans ?
                usePSD(PSD.transless, scopeFunc) :
                scopeFunc();
        },
        vip,
        async: function (generatorFn) {
            return function () {
                try {
                    var rv = awaitIterator(generatorFn.apply(this, arguments));
                    if (!rv || typeof rv.then !== 'function')
                        return DexiePromise.resolve(rv);
                    return rv;
                }
                catch (e) {
                    return rejection(e);
                }
            };
        },
        spawn: function (generatorFn, args, thiz) {
            try {
                var rv = awaitIterator(generatorFn.apply(thiz, args || []));
                if (!rv || typeof rv.then !== 'function')
                    return DexiePromise.resolve(rv);
                return rv;
            }
            catch (e) {
                return rejection(e);
            }
        },
        currentTransaction: {
            get: () => PSD.trans || null
        },
        waitFor: function (promiseOrFunction, optionalTimeout) {
            const promise = DexiePromise.resolve(typeof promiseOrFunction === 'function' ?
                Dexie.ignoreTransaction(promiseOrFunction) :
                promiseOrFunction)
                .timeout(optionalTimeout || 60000);
            return PSD.trans ?
                PSD.trans.waitFor(promise) :
                promise;
        },
        Promise: DexiePromise,
        debug: {
            get: () => debug,
            set: value => {
                setDebug(value, value === 'dexie' ? () => true : dexieStackFrameFilter);
            }
        },
        derive: derive,
        extend: extend,
        props: props,
        override: override,
        Events: Events,
        on: globalEvents,
        liveQuery,
        extendObservabilitySet,
        getByKeyPath: getByKeyPath,
        setByKeyPath: setByKeyPath,
        delByKeyPath: delByKeyPath,
        shallowClone: shallowClone,
        deepClone: deepClone,
        getObjectDiff: getObjectDiff,
        cmp,
        asap: asap$1,
        minKey: minKey,
        addons: [],
        connections: connections,
        errnames: errnames,
        dependencies: domDeps,
        semVer: DEXIE_VERSION,
        version: DEXIE_VERSION.split('.')
            .map(n => parseInt(n))
            .reduce((p, c, i) => p + (c / Math.pow(10, i * 2))),
    });
    Dexie.maxKey = getMaxKey(Dexie.dependencies.IDBKeyRange);

    if (typeof dispatchEvent !== 'undefined' && typeof addEventListener !== 'undefined') {
        globalEvents(DEXIE_STORAGE_MUTATED_EVENT_NAME, updatedParts => {
            if (!propagatingLocally) {
                let event;
                if (isIEOrEdge) {
                    event = document.createEvent('CustomEvent');
                    event.initCustomEvent(STORAGE_MUTATED_DOM_EVENT_NAME, true, true, updatedParts);
                }
                else {
                    event = new CustomEvent(STORAGE_MUTATED_DOM_EVENT_NAME, {
                        detail: updatedParts
                    });
                }
                propagatingLocally = true;
                dispatchEvent(event);
                propagatingLocally = false;
            }
        });
        addEventListener(STORAGE_MUTATED_DOM_EVENT_NAME, ({ detail }) => {
            if (!propagatingLocally) {
                propagateLocally(detail);
            }
        });
    }
    function propagateLocally(updateParts) {
        let wasMe = propagatingLocally;
        try {
            propagatingLocally = true;
            globalEvents.storagemutated.fire(updateParts);
        }
        finally {
            propagatingLocally = wasMe;
        }
    }
    let propagatingLocally = false;

    if (typeof BroadcastChannel !== 'undefined') {
        const bc = new BroadcastChannel(STORAGE_MUTATED_DOM_EVENT_NAME);
        globalEvents(DEXIE_STORAGE_MUTATED_EVENT_NAME, (changedParts) => {
            if (!propagatingLocally) {
                bc.postMessage(changedParts);
            }
        });
        bc.onmessage = (ev) => {
            if (ev.data)
                propagateLocally(ev.data);
        };
    }
    else if (typeof self !== 'undefined' && typeof navigator !== 'undefined') {
        globalEvents(DEXIE_STORAGE_MUTATED_EVENT_NAME, (changedParts) => {
            try {
                if (!propagatingLocally) {
                    if (typeof localStorage !== 'undefined') {
                        localStorage.setItem(STORAGE_MUTATED_DOM_EVENT_NAME, JSON.stringify({
                            trig: Math.random(),
                            changedParts,
                        }));
                    }
                    if (typeof self['clients'] === 'object') {
                        [...self['clients'].matchAll({ includeUncontrolled: true })].forEach((client) => client.postMessage({
                            type: STORAGE_MUTATED_DOM_EVENT_NAME,
                            changedParts,
                        }));
                    }
                }
            }
            catch (_a) { }
        });
        if (typeof addEventListener !== 'undefined') {
            addEventListener('storage', (ev) => {
                if (ev.key === STORAGE_MUTATED_DOM_EVENT_NAME) {
                    const data = JSON.parse(ev.newValue);
                    if (data)
                        propagateLocally(data.changedParts);
                }
            });
        }
        const swContainer = self.document && navigator.serviceWorker;
        if (swContainer) {
            swContainer.addEventListener('message', propagateMessageLocally);
        }
    }
    function propagateMessageLocally({ data }) {
        if (data && data.type === STORAGE_MUTATED_DOM_EVENT_NAME) {
            propagateLocally(data.changedParts);
        }
    }

    DexiePromise.rejectionMapper = mapError;
    setDebug(debug, dexieStackFrameFilter);

    class MyAppDatabase extends Dexie$1 {
        constructor() {
            super("MyAppDatabase");
            this.version(1).stores({
                guitarNoteTrainerEvent: "uuid, type, timestamp, noteAsked, noteGiven "
            });
        }
    }
    let db = new MyAppDatabase();
    function showEvents() {
        db.transaction('r', [db.guitarNoteTrainerEvent], () => __awaiter(this, void 0, void 0, function* () {
            return yield db.guitarNoteTrainerEvent.where({ type: "guitar-note-trainer/guess-note" }).toArray();
        })).then((result) => console.log(result));
    }
    function newGuitarNoteTrainerEvent(detail) {
        return (db.table("guitarNoteTrainerEvent").put(detail));
    }

    exports = { startAudio, stopAudio };
    addEventListener('audioSignal', logListener);
    addEventListener('audioSignal', notePluckListener);
    const fretBoard = createFretBoard(standardTuning, 12);
    const guessNotesFretsRange = range$1(0, 1);
    const guessNotesStringRange = range$1(0, 7);
    drawGuitar(document.querySelector("#guitar"), fretBoard);
    guitarController();
    guessNotes(document.querySelector("#guitar-note-trainer"), fretBoard, guessNotesFretsRange, guessNotesStringRange);
    window.requestAnimationFrame(step);
    let toggleButton = new audioMonitorToggleButton(document.querySelector("#audio-monitor-toggle-button"));
    addEventListener('guitar-note-trainer/guess-note', (e) => { newGuitarNoteTrainerEvent(e.detail); });
    addEventListener('keyup', (event) => { if (event.key === " ") {
        toggleButton.audioMonitorToggleButton();
    } });
    showEvents();

})();
//# sourceMappingURL=bundle.js.map
