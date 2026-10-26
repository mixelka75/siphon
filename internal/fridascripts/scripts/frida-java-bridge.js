(() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __commonJS = (cb, mod) => function __require() {
    try {
      return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
    } catch (e2) {
      throw mod = 0, e2;
    }
  };
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to2, from2, except, desc) => {
    if (from2 && typeof from2 === "object" || typeof from2 === "function") {
      for (let key of __getOwnPropNames(from2))
        if (!__hasOwnProp.call(to2, key) && key !== except)
          __defProp(to2, key, { get: () => from2[key], enumerable: !(desc = __getOwnPropDesc(from2, key)) || desc.enumerable });
    }
    return to2;
  };
  var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
    // If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
    mod
  ));

  // node_modules/base64-js/index.js
  var require_base64_js = __commonJS({
    "node_modules/base64-js/index.js"(exports) {
      "use strict";
      exports.byteLength = byteLength2;
      exports.toByteArray = toByteArray2;
      exports.fromByteArray = fromByteArray2;
      var lookup = [];
      var revLookup = [];
      var Arr = typeof Uint8Array !== "undefined" ? Uint8Array : Array;
      var code2 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
      for (i2 = 0, len = code2.length; i2 < len; ++i2) {
        lookup[i2] = code2[i2];
        revLookup[code2.charCodeAt(i2)] = i2;
      }
      var i2;
      var len;
      revLookup["-".charCodeAt(0)] = 62;
      revLookup["_".charCodeAt(0)] = 63;
      function getLens(b64) {
        var len2 = b64.length;
        if (len2 % 4 > 0) {
          throw new Error("Invalid string. Length must be a multiple of 4");
        }
        var validLen = b64.indexOf("=");
        if (validLen === -1) validLen = len2;
        var placeHoldersLen = validLen === len2 ? 0 : 4 - validLen % 4;
        return [validLen, placeHoldersLen];
      }
      function byteLength2(b64) {
        var lens = getLens(b64);
        var validLen = lens[0];
        var placeHoldersLen = lens[1];
        return (validLen + placeHoldersLen) * 3 / 4 - placeHoldersLen;
      }
      function _byteLength(b64, validLen, placeHoldersLen) {
        return (validLen + placeHoldersLen) * 3 / 4 - placeHoldersLen;
      }
      function toByteArray2(b64) {
        var tmp;
        var lens = getLens(b64);
        var validLen = lens[0];
        var placeHoldersLen = lens[1];
        var arr = new Arr(_byteLength(b64, validLen, placeHoldersLen));
        var curByte = 0;
        var len2 = placeHoldersLen > 0 ? validLen - 4 : validLen;
        var i3;
        for (i3 = 0; i3 < len2; i3 += 4) {
          tmp = revLookup[b64.charCodeAt(i3)] << 18 | revLookup[b64.charCodeAt(i3 + 1)] << 12 | revLookup[b64.charCodeAt(i3 + 2)] << 6 | revLookup[b64.charCodeAt(i3 + 3)];
          arr[curByte++] = tmp >> 16 & 255;
          arr[curByte++] = tmp >> 8 & 255;
          arr[curByte++] = tmp & 255;
        }
        if (placeHoldersLen === 2) {
          tmp = revLookup[b64.charCodeAt(i3)] << 2 | revLookup[b64.charCodeAt(i3 + 1)] >> 4;
          arr[curByte++] = tmp & 255;
        }
        if (placeHoldersLen === 1) {
          tmp = revLookup[b64.charCodeAt(i3)] << 10 | revLookup[b64.charCodeAt(i3 + 1)] << 4 | revLookup[b64.charCodeAt(i3 + 2)] >> 2;
          arr[curByte++] = tmp >> 8 & 255;
          arr[curByte++] = tmp & 255;
        }
        return arr;
      }
      function tripletToBase64(num) {
        return lookup[num >> 18 & 63] + lookup[num >> 12 & 63] + lookup[num >> 6 & 63] + lookup[num & 63];
      }
      function encodeChunk(uint8, start, end) {
        var tmp;
        var output = [];
        for (var i3 = start; i3 < end; i3 += 3) {
          tmp = (uint8[i3] << 16 & 16711680) + (uint8[i3 + 1] << 8 & 65280) + (uint8[i3 + 2] & 255);
          output.push(tripletToBase64(tmp));
        }
        return output.join("");
      }
      function fromByteArray2(uint8) {
        var tmp;
        var len2 = uint8.length;
        var extraBytes = len2 % 3;
        var parts = [];
        var maxChunkLength = 16383;
        for (var i3 = 0, len22 = len2 - extraBytes; i3 < len22; i3 += maxChunkLength) {
          parts.push(encodeChunk(uint8, i3, i3 + maxChunkLength > len22 ? len22 : i3 + maxChunkLength));
        }
        if (extraBytes === 1) {
          tmp = uint8[len2 - 1];
          parts.push(
            lookup[tmp >> 2] + lookup[tmp << 4 & 63] + "=="
          );
        } else if (extraBytes === 2) {
          tmp = (uint8[len2 - 2] << 8) + uint8[len2 - 1];
          parts.push(
            lookup[tmp >> 10] + lookup[tmp >> 4 & 63] + lookup[tmp << 2 & 63] + "="
          );
        }
        return parts.join("");
      }
    }
  });

  // node_modules/ieee754/index.js
  var require_ieee754 = __commonJS({
    "node_modules/ieee754/index.js"(exports) {
      exports.read = function(buffer, offset, isLE, mLen, nBytes) {
        var e2, m2;
        var eLen = nBytes * 8 - mLen - 1;
        var eMax = (1 << eLen) - 1;
        var eBias = eMax >> 1;
        var nBits = -7;
        var i2 = isLE ? nBytes - 1 : 0;
        var d2 = isLE ? -1 : 1;
        var s2 = buffer[offset + i2];
        i2 += d2;
        e2 = s2 & (1 << -nBits) - 1;
        s2 >>= -nBits;
        nBits += eLen;
        for (; nBits > 0; e2 = e2 * 256 + buffer[offset + i2], i2 += d2, nBits -= 8) {
        }
        m2 = e2 & (1 << -nBits) - 1;
        e2 >>= -nBits;
        nBits += mLen;
        for (; nBits > 0; m2 = m2 * 256 + buffer[offset + i2], i2 += d2, nBits -= 8) {
        }
        if (e2 === 0) {
          e2 = 1 - eBias;
        } else if (e2 === eMax) {
          return m2 ? NaN : (s2 ? -1 : 1) * Infinity;
        } else {
          m2 = m2 + Math.pow(2, mLen);
          e2 = e2 - eBias;
        }
        return (s2 ? -1 : 1) * m2 * Math.pow(2, e2 - mLen);
      };
      exports.write = function(buffer, value, offset, isLE, mLen, nBytes) {
        var e2, m2, c2;
        var eLen = nBytes * 8 - mLen - 1;
        var eMax = (1 << eLen) - 1;
        var eBias = eMax >> 1;
        var rt2 = mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0;
        var i2 = isLE ? 0 : nBytes - 1;
        var d2 = isLE ? 1 : -1;
        var s2 = value < 0 || value === 0 && 1 / value < 0 ? 1 : 0;
        value = Math.abs(value);
        if (isNaN(value) || value === Infinity) {
          m2 = isNaN(value) ? 1 : 0;
          e2 = eMax;
        } else {
          e2 = Math.floor(Math.log(value) / Math.LN2);
          if (value * (c2 = Math.pow(2, -e2)) < 1) {
            e2--;
            c2 *= 2;
          }
          if (e2 + eBias >= 1) {
            value += rt2 / c2;
          } else {
            value += rt2 * Math.pow(2, 1 - eBias);
          }
          if (value * c2 >= 2) {
            e2++;
            c2 /= 2;
          }
          if (e2 + eBias >= eMax) {
            m2 = 0;
            e2 = eMax;
          } else if (e2 + eBias >= 1) {
            m2 = (value * c2 - 1) * Math.pow(2, mLen);
            e2 = e2 + eBias;
          } else {
            m2 = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen);
            e2 = 0;
          }
        }
        for (; mLen >= 8; buffer[offset + i2] = m2 & 255, i2 += d2, m2 /= 256, mLen -= 8) {
        }
        e2 = e2 << mLen | m2;
        eLen += mLen;
        for (; eLen > 0; buffer[offset + i2] = e2 & 255, i2 += d2, e2 /= 256, eLen -= 8) {
        }
        buffer[offset + i2 - d2] |= s2 * 128;
      };
    }
  });

  // node_modules/frida-java-bridge/lib/android.js
  var android_exports = {};
  __export(android_exports, {
    ArtMethod: () => ArtMethod,
    ArtStackVisitor: () => ArtStackVisitor,
    DVM_JNI_ENV_OFFSET_SELF: () => DVM_JNI_ENV_OFFSET_SELF,
    HandleVector: () => HandleVector,
    VariableSizedHandleScope: () => VariableSizedHandleScope,
    backtrace: () => backtrace,
    deoptimizeBootImage: () => deoptimizeBootImage,
    deoptimizeEverything: () => deoptimizeEverything,
    deoptimizeMethod: () => deoptimizeMethod,
    ensureClassInitialized: () => ensureClassInitialized,
    getAndroidApiLevel: () => getAndroidApiLevel,
    getAndroidVersion: () => getAndroidVersion,
    getApi: () => getApi,
    getArtApexVersion: () => getArtApexVersion,
    getArtClassSpec: () => getArtClassSpec,
    getArtFieldSpec: () => getArtFieldSpec,
    getArtMethodSpec: () => getArtMethodSpec,
    getArtThreadFromEnv: () => getArtThreadFromEnv,
    getArtThreadSpec: () => getArtThreadSpec,
    makeArtClassLoaderVisitor: () => makeArtClassLoaderVisitor,
    makeArtClassVisitor: () => makeArtClassVisitor,
    makeMethodMangler: () => makeMethodMangler,
    makeObjectVisitorPredicate: () => makeObjectVisitorPredicate,
    revertGlobalPatches: () => revertGlobalPatches,
    translateMethod: () => translateMethod,
    withAllArtThreadsSuspended: () => withAllArtThreadsSuspended,
    withRunnableArtThread: () => withRunnableArtThread
  });

  // node_modules/frida-java-bridge/lib/alloc.js
  var {
    pageSize,
    pointerSize
  } = Process;
  var CodeAllocator = class {
    constructor(sliceSize) {
      this.sliceSize = sliceSize;
      this.slicesPerPage = pageSize / sliceSize;
      this.pages = [];
      this.free = [];
    }
    allocateSlice(spec, alignment) {
      const anyLocation = spec.near === void 0;
      const anyAlignment = alignment === 1;
      if (anyLocation && anyAlignment) {
        const slice2 = this.free.pop();
        if (slice2 !== void 0) {
          return slice2;
        }
      } else if (alignment < pageSize) {
        const { free } = this;
        const n2 = free.length;
        const alignMask = anyAlignment ? null : ptr(alignment - 1);
        for (let i2 = 0; i2 !== n2; i2++) {
          const slice2 = free[i2];
          const satisfiesLocation = anyLocation || this._isSliceNear(slice2, spec);
          const satisfiesAlignment = anyAlignment || slice2.and(alignMask).isNull();
          if (satisfiesLocation && satisfiesAlignment) {
            return free.splice(i2, 1)[0];
          }
        }
      }
      return this._allocatePage(spec);
    }
    _allocatePage(spec) {
      const page = Memory.alloc(pageSize, spec);
      const { sliceSize, slicesPerPage } = this;
      for (let i2 = 1; i2 !== slicesPerPage; i2++) {
        const slice2 = page.add(i2 * sliceSize);
        this.free.push(slice2);
      }
      this.pages.push(page);
      return page;
    }
    _isSliceNear(slice2, spec) {
      const sliceEnd = slice2.add(this.sliceSize);
      const { near, maxDistance } = spec;
      const startDistance = abs(near.sub(slice2));
      const endDistance = abs(near.sub(sliceEnd));
      return startDistance.compare(maxDistance) <= 0 && endDistance.compare(maxDistance) <= 0;
    }
    freeSlice(slice2) {
      this.free.push(slice2);
    }
  };
  function abs(nptr) {
    const shmt = pointerSize === 4 ? 31 : 63;
    const mask = ptr(1).shl(shmt).not();
    return nptr.and(mask);
  }
  function makeAllocator(sliceSize) {
    return new CodeAllocator(sliceSize);
  }

  // node_modules/frida-java-bridge/lib/result.js
  var JNI_OK = 0;
  function checkJniResult(name, result) {
    if (result !== JNI_OK) {
      throw new Error(name + " failed: " + result);
    }
  }

  // node_modules/frida-java-bridge/lib/jvmti.js
  var jvmtiVersion = {
    v1_0: 805371904,
    v1_2: 805372416
  };
  var jvmtiCapabilities = {
    canTagObjects: 1
  };
  var { pointerSize: pointerSize2 } = Process;
  var nativeFunctionOptions = {
    exceptions: "propagate"
  };
  function EnvJvmti(handle, vm3) {
    this.handle = handle;
    this.vm = vm3;
    this.vtable = handle.readPointer();
  }
  EnvJvmti.prototype.deallocate = proxy(47, "int32", ["pointer", "pointer"], function(impl, mem) {
    return impl(this.handle, mem);
  });
  EnvJvmti.prototype.getLoadedClasses = proxy(78, "int32", ["pointer", "pointer", "pointer"], function(impl, classCountPtr, classesPtr) {
    const result = impl(this.handle, classCountPtr, classesPtr);
    checkJniResult("EnvJvmti::getLoadedClasses", result);
  });
  EnvJvmti.prototype.iterateOverInstancesOfClass = proxy(112, "int32", ["pointer", "pointer", "int", "pointer", "pointer"], function(impl, klass, objectFilter, heapObjectCallback, userData) {
    const result = impl(this.handle, klass, objectFilter, heapObjectCallback, userData);
    checkJniResult("EnvJvmti::iterateOverInstancesOfClass", result);
  });
  EnvJvmti.prototype.getObjectsWithTags = proxy(114, "int32", ["pointer", "int", "pointer", "pointer", "pointer", "pointer"], function(impl, tagCount, tags, countPtr, objectResultPtr, tagResultPtr) {
    const result = impl(this.handle, tagCount, tags, countPtr, objectResultPtr, tagResultPtr);
    checkJniResult("EnvJvmti::getObjectsWithTags", result);
  });
  EnvJvmti.prototype.addCapabilities = proxy(142, "int32", ["pointer", "pointer"], function(impl, capabilitiesPtr) {
    return impl(this.handle, capabilitiesPtr);
  });
  function proxy(offset, retType, argTypes, wrapper) {
    let impl = null;
    return function() {
      if (impl === null) {
        impl = new NativeFunction(this.vtable.add((offset - 1) * pointerSize2).readPointer(), retType, argTypes, nativeFunctionOptions);
      }
      let args = [impl];
      args = args.concat.apply(args, arguments);
      return wrapper.apply(this, args);
    };
  }

  // node_modules/frida-java-bridge/lib/machine-code.js
  function parseInstructionsAt(address, tryParse, { limit }) {
    let cursor = address;
    let prevInsn = null;
    for (let i2 = 0; i2 !== limit; i2++) {
      const insn = Instruction.parse(cursor);
      const value = tryParse(insn, prevInsn);
      if (value !== null) {
        return value;
      }
      cursor = insn.next;
      prevInsn = insn;
    }
    return null;
  }

  // node_modules/frida-java-bridge/lib/memoize.js
  function memoize(compute) {
    let value = null;
    let computed = false;
    return function(...args) {
      if (!computed) {
        value = compute(...args);
        computed = true;
      }
      return value;
    };
  }

  // node_modules/frida-java-bridge/lib/env.js
  function Env(handle, vm3) {
    this.handle = handle;
    this.vm = vm3;
  }
  var pointerSize3 = Process.pointerSize;
  var JNI_ABORT = 2;
  var CALL_CONSTRUCTOR_METHOD_OFFSET = 28;
  var CALL_OBJECT_METHOD_OFFSET = 34;
  var CALL_BOOLEAN_METHOD_OFFSET = 37;
  var CALL_BYTE_METHOD_OFFSET = 40;
  var CALL_CHAR_METHOD_OFFSET = 43;
  var CALL_SHORT_METHOD_OFFSET = 46;
  var CALL_INT_METHOD_OFFSET = 49;
  var CALL_LONG_METHOD_OFFSET = 52;
  var CALL_FLOAT_METHOD_OFFSET = 55;
  var CALL_DOUBLE_METHOD_OFFSET = 58;
  var CALL_VOID_METHOD_OFFSET = 61;
  var CALL_NONVIRTUAL_OBJECT_METHOD_OFFSET = 64;
  var CALL_NONVIRTUAL_BOOLEAN_METHOD_OFFSET = 67;
  var CALL_NONVIRTUAL_BYTE_METHOD_OFFSET = 70;
  var CALL_NONVIRTUAL_CHAR_METHOD_OFFSET = 73;
  var CALL_NONVIRTUAL_SHORT_METHOD_OFFSET = 76;
  var CALL_NONVIRTUAL_INT_METHOD_OFFSET = 79;
  var CALL_NONVIRTUAL_LONG_METHOD_OFFSET = 82;
  var CALL_NONVIRTUAL_FLOAT_METHOD_OFFSET = 85;
  var CALL_NONVIRTUAL_DOUBLE_METHOD_OFFSET = 88;
  var CALL_NONVIRTUAL_VOID_METHOD_OFFSET = 91;
  var CALL_STATIC_OBJECT_METHOD_OFFSET = 114;
  var CALL_STATIC_BOOLEAN_METHOD_OFFSET = 117;
  var CALL_STATIC_BYTE_METHOD_OFFSET = 120;
  var CALL_STATIC_CHAR_METHOD_OFFSET = 123;
  var CALL_STATIC_SHORT_METHOD_OFFSET = 126;
  var CALL_STATIC_INT_METHOD_OFFSET = 129;
  var CALL_STATIC_LONG_METHOD_OFFSET = 132;
  var CALL_STATIC_FLOAT_METHOD_OFFSET = 135;
  var CALL_STATIC_DOUBLE_METHOD_OFFSET = 138;
  var CALL_STATIC_VOID_METHOD_OFFSET = 141;
  var GET_OBJECT_FIELD_OFFSET = 95;
  var GET_BOOLEAN_FIELD_OFFSET = 96;
  var GET_BYTE_FIELD_OFFSET = 97;
  var GET_CHAR_FIELD_OFFSET = 98;
  var GET_SHORT_FIELD_OFFSET = 99;
  var GET_INT_FIELD_OFFSET = 100;
  var GET_LONG_FIELD_OFFSET = 101;
  var GET_FLOAT_FIELD_OFFSET = 102;
  var GET_DOUBLE_FIELD_OFFSET = 103;
  var SET_OBJECT_FIELD_OFFSET = 104;
  var SET_BOOLEAN_FIELD_OFFSET = 105;
  var SET_BYTE_FIELD_OFFSET = 106;
  var SET_CHAR_FIELD_OFFSET = 107;
  var SET_SHORT_FIELD_OFFSET = 108;
  var SET_INT_FIELD_OFFSET = 109;
  var SET_LONG_FIELD_OFFSET = 110;
  var SET_FLOAT_FIELD_OFFSET = 111;
  var SET_DOUBLE_FIELD_OFFSET = 112;
  var GET_STATIC_OBJECT_FIELD_OFFSET = 145;
  var GET_STATIC_BOOLEAN_FIELD_OFFSET = 146;
  var GET_STATIC_BYTE_FIELD_OFFSET = 147;
  var GET_STATIC_CHAR_FIELD_OFFSET = 148;
  var GET_STATIC_SHORT_FIELD_OFFSET = 149;
  var GET_STATIC_INT_FIELD_OFFSET = 150;
  var GET_STATIC_LONG_FIELD_OFFSET = 151;
  var GET_STATIC_FLOAT_FIELD_OFFSET = 152;
  var GET_STATIC_DOUBLE_FIELD_OFFSET = 153;
  var SET_STATIC_OBJECT_FIELD_OFFSET = 154;
  var SET_STATIC_BOOLEAN_FIELD_OFFSET = 155;
  var SET_STATIC_BYTE_FIELD_OFFSET = 156;
  var SET_STATIC_CHAR_FIELD_OFFSET = 157;
  var SET_STATIC_SHORT_FIELD_OFFSET = 158;
  var SET_STATIC_INT_FIELD_OFFSET = 159;
  var SET_STATIC_LONG_FIELD_OFFSET = 160;
  var SET_STATIC_FLOAT_FIELD_OFFSET = 161;
  var SET_STATIC_DOUBLE_FIELD_OFFSET = 162;
  var callMethodOffset = {
    pointer: CALL_OBJECT_METHOD_OFFSET,
    uint8: CALL_BOOLEAN_METHOD_OFFSET,
    int8: CALL_BYTE_METHOD_OFFSET,
    uint16: CALL_CHAR_METHOD_OFFSET,
    int16: CALL_SHORT_METHOD_OFFSET,
    int32: CALL_INT_METHOD_OFFSET,
    int64: CALL_LONG_METHOD_OFFSET,
    float: CALL_FLOAT_METHOD_OFFSET,
    double: CALL_DOUBLE_METHOD_OFFSET,
    void: CALL_VOID_METHOD_OFFSET
  };
  var callNonvirtualMethodOffset = {
    pointer: CALL_NONVIRTUAL_OBJECT_METHOD_OFFSET,
    uint8: CALL_NONVIRTUAL_BOOLEAN_METHOD_OFFSET,
    int8: CALL_NONVIRTUAL_BYTE_METHOD_OFFSET,
    uint16: CALL_NONVIRTUAL_CHAR_METHOD_OFFSET,
    int16: CALL_NONVIRTUAL_SHORT_METHOD_OFFSET,
    int32: CALL_NONVIRTUAL_INT_METHOD_OFFSET,
    int64: CALL_NONVIRTUAL_LONG_METHOD_OFFSET,
    float: CALL_NONVIRTUAL_FLOAT_METHOD_OFFSET,
    double: CALL_NONVIRTUAL_DOUBLE_METHOD_OFFSET,
    void: CALL_NONVIRTUAL_VOID_METHOD_OFFSET
  };
  var callStaticMethodOffset = {
    pointer: CALL_STATIC_OBJECT_METHOD_OFFSET,
    uint8: CALL_STATIC_BOOLEAN_METHOD_OFFSET,
    int8: CALL_STATIC_BYTE_METHOD_OFFSET,
    uint16: CALL_STATIC_CHAR_METHOD_OFFSET,
    int16: CALL_STATIC_SHORT_METHOD_OFFSET,
    int32: CALL_STATIC_INT_METHOD_OFFSET,
    int64: CALL_STATIC_LONG_METHOD_OFFSET,
    float: CALL_STATIC_FLOAT_METHOD_OFFSET,
    double: CALL_STATIC_DOUBLE_METHOD_OFFSET,
    void: CALL_STATIC_VOID_METHOD_OFFSET
  };
  var getFieldOffset = {
    pointer: GET_OBJECT_FIELD_OFFSET,
    uint8: GET_BOOLEAN_FIELD_OFFSET,
    int8: GET_BYTE_FIELD_OFFSET,
    uint16: GET_CHAR_FIELD_OFFSET,
    int16: GET_SHORT_FIELD_OFFSET,
    int32: GET_INT_FIELD_OFFSET,
    int64: GET_LONG_FIELD_OFFSET,
    float: GET_FLOAT_FIELD_OFFSET,
    double: GET_DOUBLE_FIELD_OFFSET
  };
  var setFieldOffset = {
    pointer: SET_OBJECT_FIELD_OFFSET,
    uint8: SET_BOOLEAN_FIELD_OFFSET,
    int8: SET_BYTE_FIELD_OFFSET,
    uint16: SET_CHAR_FIELD_OFFSET,
    int16: SET_SHORT_FIELD_OFFSET,
    int32: SET_INT_FIELD_OFFSET,
    int64: SET_LONG_FIELD_OFFSET,
    float: SET_FLOAT_FIELD_OFFSET,
    double: SET_DOUBLE_FIELD_OFFSET
  };
  var getStaticFieldOffset = {
    pointer: GET_STATIC_OBJECT_FIELD_OFFSET,
    uint8: GET_STATIC_BOOLEAN_FIELD_OFFSET,
    int8: GET_STATIC_BYTE_FIELD_OFFSET,
    uint16: GET_STATIC_CHAR_FIELD_OFFSET,
    int16: GET_STATIC_SHORT_FIELD_OFFSET,
    int32: GET_STATIC_INT_FIELD_OFFSET,
    int64: GET_STATIC_LONG_FIELD_OFFSET,
    float: GET_STATIC_FLOAT_FIELD_OFFSET,
    double: GET_STATIC_DOUBLE_FIELD_OFFSET
  };
  var setStaticFieldOffset = {
    pointer: SET_STATIC_OBJECT_FIELD_OFFSET,
    uint8: SET_STATIC_BOOLEAN_FIELD_OFFSET,
    int8: SET_STATIC_BYTE_FIELD_OFFSET,
    uint16: SET_STATIC_CHAR_FIELD_OFFSET,
    int16: SET_STATIC_SHORT_FIELD_OFFSET,
    int32: SET_STATIC_INT_FIELD_OFFSET,
    int64: SET_STATIC_LONG_FIELD_OFFSET,
    float: SET_STATIC_FLOAT_FIELD_OFFSET,
    double: SET_STATIC_DOUBLE_FIELD_OFFSET
  };
  var nativeFunctionOptions2 = {
    exceptions: "propagate"
  };
  var cachedVtable = null;
  var globalRefs = [];
  Env.dispose = function(env) {
    globalRefs.forEach(env.deleteGlobalRef, env);
    globalRefs = [];
  };
  function register(globalRef) {
    globalRefs.push(globalRef);
    return globalRef;
  }
  function vtable(instance) {
    if (cachedVtable === null) {
      cachedVtable = instance.handle.readPointer();
    }
    return cachedVtable;
  }
  function proxy2(offset, retType, argTypes, wrapper) {
    let impl = null;
    return function() {
      if (impl === null) {
        impl = new NativeFunction(vtable(this).add(offset * pointerSize3).readPointer(), retType, argTypes, nativeFunctionOptions2);
      }
      let args = [impl];
      args = args.concat.apply(args, arguments);
      return wrapper.apply(this, args);
    };
  }
  Env.prototype.getVersion = proxy2(4, "int32", ["pointer"], function(impl) {
    return impl(this.handle);
  });
  Env.prototype.findClass = proxy2(6, "pointer", ["pointer", "pointer"], function(impl, name) {
    const result = impl(this.handle, Memory.allocUtf8String(name));
    this.throwIfExceptionPending();
    return result;
  });
  Env.prototype.throwIfExceptionPending = function() {
    const throwable = this.exceptionOccurred();
    if (throwable.isNull()) {
      return;
    }
    this.exceptionClear();
    const handle = this.newGlobalRef(throwable);
    this.deleteLocalRef(throwable);
    const description = this.vaMethod("pointer", [])(this.handle, handle, this.javaLangObject().toString);
    const descriptionStr = this.stringFromJni(description);
    this.deleteLocalRef(description);
    const error = new Error(descriptionStr);
    error.$h = handle;
    Script.bindWeak(error, makeErrorHandleDestructor(this.vm, handle));
    throw error;
  };
  function makeErrorHandleDestructor(vm3, handle) {
    return function() {
      vm3.perform((env) => {
        env.deleteGlobalRef(handle);
      });
    };
  }
  Env.prototype.fromReflectedMethod = proxy2(7, "pointer", ["pointer", "pointer"], function(impl, method) {
    return impl(this.handle, method);
  });
  Env.prototype.fromReflectedField = proxy2(8, "pointer", ["pointer", "pointer"], function(impl, method) {
    return impl(this.handle, method);
  });
  Env.prototype.toReflectedMethod = proxy2(9, "pointer", ["pointer", "pointer", "pointer", "uint8"], function(impl, klass, methodId, isStatic) {
    return impl(this.handle, klass, methodId, isStatic);
  });
  Env.prototype.getSuperclass = proxy2(10, "pointer", ["pointer", "pointer"], function(impl, klass) {
    return impl(this.handle, klass);
  });
  Env.prototype.isAssignableFrom = proxy2(11, "uint8", ["pointer", "pointer", "pointer"], function(impl, klass1, klass2) {
    return !!impl(this.handle, klass1, klass2);
  });
  Env.prototype.toReflectedField = proxy2(12, "pointer", ["pointer", "pointer", "pointer", "uint8"], function(impl, klass, fieldId, isStatic) {
    return impl(this.handle, klass, fieldId, isStatic);
  });
  Env.prototype.throw = proxy2(13, "int32", ["pointer", "pointer"], function(impl, obj) {
    return impl(this.handle, obj);
  });
  Env.prototype.exceptionOccurred = proxy2(15, "pointer", ["pointer"], function(impl) {
    return impl(this.handle);
  });
  Env.prototype.exceptionDescribe = proxy2(16, "void", ["pointer"], function(impl) {
    impl(this.handle);
  });
  Env.prototype.exceptionClear = proxy2(17, "void", ["pointer"], function(impl) {
    impl(this.handle);
  });
  Env.prototype.pushLocalFrame = proxy2(19, "int32", ["pointer", "int32"], function(impl, capacity) {
    return impl(this.handle, capacity);
  });
  Env.prototype.popLocalFrame = proxy2(20, "pointer", ["pointer", "pointer"], function(impl, result) {
    return impl(this.handle, result);
  });
  Env.prototype.newGlobalRef = proxy2(21, "pointer", ["pointer", "pointer"], function(impl, obj) {
    return impl(this.handle, obj);
  });
  Env.prototype.deleteGlobalRef = proxy2(22, "void", ["pointer", "pointer"], function(impl, globalRef) {
    impl(this.handle, globalRef);
  });
  Env.prototype.deleteLocalRef = proxy2(23, "void", ["pointer", "pointer"], function(impl, localRef) {
    impl(this.handle, localRef);
  });
  Env.prototype.isSameObject = proxy2(24, "uint8", ["pointer", "pointer", "pointer"], function(impl, ref1, ref2) {
    return !!impl(this.handle, ref1, ref2);
  });
  Env.prototype.newLocalRef = proxy2(25, "pointer", ["pointer", "pointer"], function(impl, obj) {
    return impl(this.handle, obj);
  });
  Env.prototype.allocObject = proxy2(27, "pointer", ["pointer", "pointer"], function(impl, clazz) {
    return impl(this.handle, clazz);
  });
  Env.prototype.getObjectClass = proxy2(31, "pointer", ["pointer", "pointer"], function(impl, obj) {
    return impl(this.handle, obj);
  });
  Env.prototype.isInstanceOf = proxy2(32, "uint8", ["pointer", "pointer", "pointer"], function(impl, obj, klass) {
    return !!impl(this.handle, obj, klass);
  });
  Env.prototype.getMethodId = proxy2(33, "pointer", ["pointer", "pointer", "pointer", "pointer"], function(impl, klass, name, sig) {
    return impl(this.handle, klass, Memory.allocUtf8String(name), Memory.allocUtf8String(sig));
  });
  Env.prototype.getFieldId = proxy2(94, "pointer", ["pointer", "pointer", "pointer", "pointer"], function(impl, klass, name, sig) {
    return impl(this.handle, klass, Memory.allocUtf8String(name), Memory.allocUtf8String(sig));
  });
  Env.prototype.getIntField = proxy2(100, "int32", ["pointer", "pointer", "pointer"], function(impl, obj, fieldId) {
    return impl(this.handle, obj, fieldId);
  });
  Env.prototype.getStaticMethodId = proxy2(113, "pointer", ["pointer", "pointer", "pointer", "pointer"], function(impl, klass, name, sig) {
    return impl(this.handle, klass, Memory.allocUtf8String(name), Memory.allocUtf8String(sig));
  });
  Env.prototype.getStaticFieldId = proxy2(144, "pointer", ["pointer", "pointer", "pointer", "pointer"], function(impl, klass, name, sig) {
    return impl(this.handle, klass, Memory.allocUtf8String(name), Memory.allocUtf8String(sig));
  });
  Env.prototype.getStaticIntField = proxy2(150, "int32", ["pointer", "pointer", "pointer"], function(impl, obj, fieldId) {
    return impl(this.handle, obj, fieldId);
  });
  Env.prototype.getStringLength = proxy2(164, "int32", ["pointer", "pointer"], function(impl, str) {
    return impl(this.handle, str);
  });
  Env.prototype.getStringChars = proxy2(165, "pointer", ["pointer", "pointer", "pointer"], function(impl, str) {
    return impl(this.handle, str, NULL);
  });
  Env.prototype.releaseStringChars = proxy2(166, "void", ["pointer", "pointer", "pointer"], function(impl, str, utf) {
    impl(this.handle, str, utf);
  });
  Env.prototype.newStringUtf = proxy2(167, "pointer", ["pointer", "pointer"], function(impl, str) {
    const utf = Memory.allocUtf8String(str);
    return impl(this.handle, utf);
  });
  Env.prototype.getStringUtfChars = proxy2(169, "pointer", ["pointer", "pointer", "pointer"], function(impl, str) {
    return impl(this.handle, str, NULL);
  });
  Env.prototype.releaseStringUtfChars = proxy2(170, "void", ["pointer", "pointer", "pointer"], function(impl, str, utf) {
    impl(this.handle, str, utf);
  });
  Env.prototype.getArrayLength = proxy2(171, "int32", ["pointer", "pointer"], function(impl, array) {
    return impl(this.handle, array);
  });
  Env.prototype.newObjectArray = proxy2(172, "pointer", ["pointer", "int32", "pointer", "pointer"], function(impl, length, elementClass, initialElement) {
    return impl(this.handle, length, elementClass, initialElement);
  });
  Env.prototype.getObjectArrayElement = proxy2(173, "pointer", ["pointer", "pointer", "int32"], function(impl, array, index) {
    return impl(this.handle, array, index);
  });
  Env.prototype.setObjectArrayElement = proxy2(174, "void", ["pointer", "pointer", "int32", "pointer"], function(impl, array, index, value) {
    impl(this.handle, array, index, value);
  });
  Env.prototype.newBooleanArray = proxy2(175, "pointer", ["pointer", "int32"], function(impl, length) {
    return impl(this.handle, length);
  });
  Env.prototype.newByteArray = proxy2(176, "pointer", ["pointer", "int32"], function(impl, length) {
    return impl(this.handle, length);
  });
  Env.prototype.newCharArray = proxy2(177, "pointer", ["pointer", "int32"], function(impl, length) {
    return impl(this.handle, length);
  });
  Env.prototype.newShortArray = proxy2(178, "pointer", ["pointer", "int32"], function(impl, length) {
    return impl(this.handle, length);
  });
  Env.prototype.newIntArray = proxy2(179, "pointer", ["pointer", "int32"], function(impl, length) {
    return impl(this.handle, length);
  });
  Env.prototype.newLongArray = proxy2(180, "pointer", ["pointer", "int32"], function(impl, length) {
    return impl(this.handle, length);
  });
  Env.prototype.newFloatArray = proxy2(181, "pointer", ["pointer", "int32"], function(impl, length) {
    return impl(this.handle, length);
  });
  Env.prototype.newDoubleArray = proxy2(182, "pointer", ["pointer", "int32"], function(impl, length) {
    return impl(this.handle, length);
  });
  Env.prototype.getBooleanArrayElements = proxy2(183, "pointer", ["pointer", "pointer", "pointer"], function(impl, array) {
    return impl(this.handle, array, NULL);
  });
  Env.prototype.getByteArrayElements = proxy2(184, "pointer", ["pointer", "pointer", "pointer"], function(impl, array) {
    return impl(this.handle, array, NULL);
  });
  Env.prototype.getCharArrayElements = proxy2(185, "pointer", ["pointer", "pointer", "pointer"], function(impl, array) {
    return impl(this.handle, array, NULL);
  });
  Env.prototype.getShortArrayElements = proxy2(186, "pointer", ["pointer", "pointer", "pointer"], function(impl, array) {
    return impl(this.handle, array, NULL);
  });
  Env.prototype.getIntArrayElements = proxy2(187, "pointer", ["pointer", "pointer", "pointer"], function(impl, array) {
    return impl(this.handle, array, NULL);
  });
  Env.prototype.getLongArrayElements = proxy2(188, "pointer", ["pointer", "pointer", "pointer"], function(impl, array) {
    return impl(this.handle, array, NULL);
  });
  Env.prototype.getFloatArrayElements = proxy2(189, "pointer", ["pointer", "pointer", "pointer"], function(impl, array) {
    return impl(this.handle, array, NULL);
  });
  Env.prototype.getDoubleArrayElements = proxy2(190, "pointer", ["pointer", "pointer", "pointer"], function(impl, array) {
    return impl(this.handle, array, NULL);
  });
  Env.prototype.releaseBooleanArrayElements = proxy2(191, "pointer", ["pointer", "pointer", "pointer", "int32"], function(impl, array, cArray) {
    impl(this.handle, array, cArray, JNI_ABORT);
  });
  Env.prototype.releaseByteArrayElements = proxy2(192, "pointer", ["pointer", "pointer", "pointer", "int32"], function(impl, array, cArray) {
    impl(this.handle, array, cArray, JNI_ABORT);
  });
  Env.prototype.releaseCharArrayElements = proxy2(193, "pointer", ["pointer", "pointer", "pointer", "int32"], function(impl, array, cArray) {
    impl(this.handle, array, cArray, JNI_ABORT);
  });
  Env.prototype.releaseShortArrayElements = proxy2(194, "pointer", ["pointer", "pointer", "pointer", "int32"], function(impl, array, cArray) {
    impl(this.handle, array, cArray, JNI_ABORT);
  });
  Env.prototype.releaseIntArrayElements = proxy2(195, "pointer", ["pointer", "pointer", "pointer", "int32"], function(impl, array, cArray) {
    impl(this.handle, array, cArray, JNI_ABORT);
  });
  Env.prototype.releaseLongArrayElements = proxy2(196, "pointer", ["pointer", "pointer", "pointer", "int32"], function(impl, array, cArray) {
    impl(this.handle, array, cArray, JNI_ABORT);
  });
  Env.prototype.releaseFloatArrayElements = proxy2(197, "pointer", ["pointer", "pointer", "pointer", "int32"], function(impl, array, cArray) {
    impl(this.handle, array, cArray, JNI_ABORT);
  });
  Env.prototype.releaseDoubleArrayElements = proxy2(198, "pointer", ["pointer", "pointer", "pointer", "int32"], function(impl, array, cArray) {
    impl(this.handle, array, cArray, JNI_ABORT);
  });
  Env.prototype.getByteArrayRegion = proxy2(200, "void", ["pointer", "pointer", "int", "int", "pointer"], function(impl, array, start, length, cArray) {
    impl(this.handle, array, start, length, cArray);
  });
  Env.prototype.setBooleanArrayRegion = proxy2(207, "void", ["pointer", "pointer", "int32", "int32", "pointer"], function(impl, array, start, length, cArray) {
    impl(this.handle, array, start, length, cArray);
  });
  Env.prototype.setByteArrayRegion = proxy2(208, "void", ["pointer", "pointer", "int32", "int32", "pointer"], function(impl, array, start, length, cArray) {
    impl(this.handle, array, start, length, cArray);
  });
  Env.prototype.setCharArrayRegion = proxy2(209, "void", ["pointer", "pointer", "int32", "int32", "pointer"], function(impl, array, start, length, cArray) {
    impl(this.handle, array, start, length, cArray);
  });
  Env.prototype.setShortArrayRegion = proxy2(210, "void", ["pointer", "pointer", "int32", "int32", "pointer"], function(impl, array, start, length, cArray) {
    impl(this.handle, array, start, length, cArray);
  });
  Env.prototype.setIntArrayRegion = proxy2(211, "void", ["pointer", "pointer", "int32", "int32", "pointer"], function(impl, array, start, length, cArray) {
    impl(this.handle, array, start, length, cArray);
  });
  Env.prototype.setLongArrayRegion = proxy2(212, "void", ["pointer", "pointer", "int32", "int32", "pointer"], function(impl, array, start, length, cArray) {
    impl(this.handle, array, start, length, cArray);
  });
  Env.prototype.setFloatArrayRegion = proxy2(213, "void", ["pointer", "pointer", "int32", "int32", "pointer"], function(impl, array, start, length, cArray) {
    impl(this.handle, array, start, length, cArray);
  });
  Env.prototype.setDoubleArrayRegion = proxy2(214, "void", ["pointer", "pointer", "int32", "int32", "pointer"], function(impl, array, start, length, cArray) {
    impl(this.handle, array, start, length, cArray);
  });
  Env.prototype.registerNatives = proxy2(215, "int32", ["pointer", "pointer", "pointer", "int32"], function(impl, klass, methods, numMethods) {
    return impl(this.handle, klass, methods, numMethods);
  });
  Env.prototype.monitorEnter = proxy2(217, "int32", ["pointer", "pointer"], function(impl, obj) {
    return impl(this.handle, obj);
  });
  Env.prototype.monitorExit = proxy2(218, "int32", ["pointer", "pointer"], function(impl, obj) {
    return impl(this.handle, obj);
  });
  Env.prototype.getDirectBufferAddress = proxy2(230, "pointer", ["pointer", "pointer"], function(impl, obj) {
    return impl(this.handle, obj);
  });
  Env.prototype.getObjectRefType = proxy2(232, "int32", ["pointer", "pointer"], function(impl, ref) {
    return impl(this.handle, ref);
  });
  var cachedMethods = /* @__PURE__ */ new Map();
  function plainMethod(offset, retType, argTypes, options) {
    return getOrMakeMethod(this, "p", makePlainMethod, offset, retType, argTypes, options);
  }
  function vaMethod(offset, retType, argTypes, options) {
    return getOrMakeMethod(this, "v", makeVaMethod, offset, retType, argTypes, options);
  }
  function nonvirtualVaMethod(offset, retType, argTypes, options) {
    return getOrMakeMethod(this, "n", makeNonvirtualVaMethod, offset, retType, argTypes, options);
  }
  function getOrMakeMethod(env, flavor, construct, offset, retType, argTypes, options) {
    if (options !== void 0) {
      return construct(env, offset, retType, argTypes, options);
    }
    const key = [offset, flavor, retType].concat(argTypes).join("|");
    let m2 = cachedMethods.get(key);
    if (m2 === void 0) {
      m2 = construct(env, offset, retType, argTypes, nativeFunctionOptions2);
      cachedMethods.set(key, m2);
    }
    return m2;
  }
  function makePlainMethod(env, offset, retType, argTypes, options) {
    return new NativeFunction(
      vtable(env).add(offset * pointerSize3).readPointer(),
      retType,
      ["pointer", "pointer", "pointer"].concat(argTypes),
      options
    );
  }
  function makeVaMethod(env, offset, retType, argTypes, options) {
    return new NativeFunction(
      vtable(env).add(offset * pointerSize3).readPointer(),
      retType,
      ["pointer", "pointer", "pointer", "..."].concat(argTypes),
      options
    );
  }
  function makeNonvirtualVaMethod(env, offset, retType, argTypes, options) {
    return new NativeFunction(
      vtable(env).add(offset * pointerSize3).readPointer(),
      retType,
      ["pointer", "pointer", "pointer", "pointer", "..."].concat(argTypes),
      options
    );
  }
  Env.prototype.constructor = function(argTypes, options) {
    return vaMethod.call(this, CALL_CONSTRUCTOR_METHOD_OFFSET, "pointer", argTypes, options);
  };
  Env.prototype.vaMethod = function(retType, argTypes, options) {
    const offset = callMethodOffset[retType];
    if (offset === void 0) {
      throw new Error("Unsupported type: " + retType);
    }
    return vaMethod.call(this, offset, retType, argTypes, options);
  };
  Env.prototype.nonvirtualVaMethod = function(retType, argTypes, options) {
    const offset = callNonvirtualMethodOffset[retType];
    if (offset === void 0) {
      throw new Error("Unsupported type: " + retType);
    }
    return nonvirtualVaMethod.call(this, offset, retType, argTypes, options);
  };
  Env.prototype.staticVaMethod = function(retType, argTypes, options) {
    const offset = callStaticMethodOffset[retType];
    if (offset === void 0) {
      throw new Error("Unsupported type: " + retType);
    }
    return vaMethod.call(this, offset, retType, argTypes, options);
  };
  Env.prototype.getField = function(fieldType) {
    const offset = getFieldOffset[fieldType];
    if (offset === void 0) {
      throw new Error("Unsupported type: " + fieldType);
    }
    return plainMethod.call(this, offset, fieldType, []);
  };
  Env.prototype.getStaticField = function(fieldType) {
    const offset = getStaticFieldOffset[fieldType];
    if (offset === void 0) {
      throw new Error("Unsupported type: " + fieldType);
    }
    return plainMethod.call(this, offset, fieldType, []);
  };
  Env.prototype.setField = function(fieldType) {
    const offset = setFieldOffset[fieldType];
    if (offset === void 0) {
      throw new Error("Unsupported type: " + fieldType);
    }
    return plainMethod.call(this, offset, "void", [fieldType]);
  };
  Env.prototype.setStaticField = function(fieldType) {
    const offset = setStaticFieldOffset[fieldType];
    if (offset === void 0) {
      throw new Error("Unsupported type: " + fieldType);
    }
    return plainMethod.call(this, offset, "void", [fieldType]);
  };
  var javaLangClass = null;
  Env.prototype.javaLangClass = function() {
    if (javaLangClass === null) {
      const handle = this.findClass("java/lang/Class");
      try {
        const get = this.getMethodId.bind(this, handle);
        javaLangClass = {
          handle: register(this.newGlobalRef(handle)),
          getName: get("getName", "()Ljava/lang/String;"),
          getSimpleName: get("getSimpleName", "()Ljava/lang/String;"),
          getGenericSuperclass: get("getGenericSuperclass", "()Ljava/lang/reflect/Type;"),
          getDeclaredConstructors: get("getDeclaredConstructors", "()[Ljava/lang/reflect/Constructor;"),
          getDeclaredMethods: get("getDeclaredMethods", "()[Ljava/lang/reflect/Method;"),
          getDeclaredFields: get("getDeclaredFields", "()[Ljava/lang/reflect/Field;"),
          isArray: get("isArray", "()Z"),
          isPrimitive: get("isPrimitive", "()Z"),
          isInterface: get("isInterface", "()Z"),
          getComponentType: get("getComponentType", "()Ljava/lang/Class;")
        };
      } finally {
        this.deleteLocalRef(handle);
      }
    }
    return javaLangClass;
  };
  var javaLangObject = null;
  Env.prototype.javaLangObject = function() {
    if (javaLangObject === null) {
      const handle = this.findClass("java/lang/Object");
      try {
        const get = this.getMethodId.bind(this, handle);
        javaLangObject = {
          handle: register(this.newGlobalRef(handle)),
          toString: get("toString", "()Ljava/lang/String;"),
          getClass: get("getClass", "()Ljava/lang/Class;")
        };
      } finally {
        this.deleteLocalRef(handle);
      }
    }
    return javaLangObject;
  };
  var javaLangReflectConstructor = null;
  Env.prototype.javaLangReflectConstructor = function() {
    if (javaLangReflectConstructor === null) {
      const handle = this.findClass("java/lang/reflect/Constructor");
      try {
        javaLangReflectConstructor = {
          getGenericParameterTypes: this.getMethodId(handle, "getGenericParameterTypes", "()[Ljava/lang/reflect/Type;")
        };
      } finally {
        this.deleteLocalRef(handle);
      }
    }
    return javaLangReflectConstructor;
  };
  var javaLangReflectMethod = null;
  Env.prototype.javaLangReflectMethod = function() {
    if (javaLangReflectMethod === null) {
      const handle = this.findClass("java/lang/reflect/Method");
      try {
        const get = this.getMethodId.bind(this, handle);
        javaLangReflectMethod = {
          getName: get("getName", "()Ljava/lang/String;"),
          getGenericParameterTypes: get("getGenericParameterTypes", "()[Ljava/lang/reflect/Type;"),
          getParameterTypes: get("getParameterTypes", "()[Ljava/lang/Class;"),
          getGenericReturnType: get("getGenericReturnType", "()Ljava/lang/reflect/Type;"),
          getGenericExceptionTypes: get("getGenericExceptionTypes", "()[Ljava/lang/reflect/Type;"),
          getModifiers: get("getModifiers", "()I"),
          isVarArgs: get("isVarArgs", "()Z")
        };
      } finally {
        this.deleteLocalRef(handle);
      }
    }
    return javaLangReflectMethod;
  };
  var javaLangReflectField = null;
  Env.prototype.javaLangReflectField = function() {
    if (javaLangReflectField === null) {
      const handle = this.findClass("java/lang/reflect/Field");
      try {
        const get = this.getMethodId.bind(this, handle);
        javaLangReflectField = {
          getName: get("getName", "()Ljava/lang/String;"),
          getType: get("getType", "()Ljava/lang/Class;"),
          getGenericType: get("getGenericType", "()Ljava/lang/reflect/Type;"),
          getModifiers: get("getModifiers", "()I"),
          toString: get("toString", "()Ljava/lang/String;")
        };
      } finally {
        this.deleteLocalRef(handle);
      }
    }
    return javaLangReflectField;
  };
  var javaLangReflectTypeVariable = null;
  Env.prototype.javaLangReflectTypeVariable = function() {
    if (javaLangReflectTypeVariable === null) {
      const handle = this.findClass("java/lang/reflect/TypeVariable");
      try {
        const get = this.getMethodId.bind(this, handle);
        javaLangReflectTypeVariable = {
          handle: register(this.newGlobalRef(handle)),
          getName: get("getName", "()Ljava/lang/String;"),
          getBounds: get("getBounds", "()[Ljava/lang/reflect/Type;"),
          getGenericDeclaration: get("getGenericDeclaration", "()Ljava/lang/reflect/GenericDeclaration;")
        };
      } finally {
        this.deleteLocalRef(handle);
      }
    }
    return javaLangReflectTypeVariable;
  };
  var javaLangReflectWildcardType = null;
  Env.prototype.javaLangReflectWildcardType = function() {
    if (javaLangReflectWildcardType === null) {
      const handle = this.findClass("java/lang/reflect/WildcardType");
      try {
        const get = this.getMethodId.bind(this, handle);
        javaLangReflectWildcardType = {
          handle: register(this.newGlobalRef(handle)),
          getLowerBounds: get("getLowerBounds", "()[Ljava/lang/reflect/Type;"),
          getUpperBounds: get("getUpperBounds", "()[Ljava/lang/reflect/Type;")
        };
      } finally {
        this.deleteLocalRef(handle);
      }
    }
    return javaLangReflectWildcardType;
  };
  var javaLangReflectGenericArrayType = null;
  Env.prototype.javaLangReflectGenericArrayType = function() {
    if (javaLangReflectGenericArrayType === null) {
      const handle = this.findClass("java/lang/reflect/GenericArrayType");
      try {
        javaLangReflectGenericArrayType = {
          handle: register(this.newGlobalRef(handle)),
          getGenericComponentType: this.getMethodId(handle, "getGenericComponentType", "()Ljava/lang/reflect/Type;")
        };
      } finally {
        this.deleteLocalRef(handle);
      }
    }
    return javaLangReflectGenericArrayType;
  };
  var javaLangReflectParameterizedType = null;
  Env.prototype.javaLangReflectParameterizedType = function() {
    if (javaLangReflectParameterizedType === null) {
      const handle = this.findClass("java/lang/reflect/ParameterizedType");
      try {
        const get = this.getMethodId.bind(this, handle);
        javaLangReflectParameterizedType = {
          handle: register(this.newGlobalRef(handle)),
          getActualTypeArguments: get("getActualTypeArguments", "()[Ljava/lang/reflect/Type;"),
          getRawType: get("getRawType", "()Ljava/lang/reflect/Type;"),
          getOwnerType: get("getOwnerType", "()Ljava/lang/reflect/Type;")
        };
      } finally {
        this.deleteLocalRef(handle);
      }
    }
    return javaLangReflectParameterizedType;
  };
  var javaLangString = null;
  Env.prototype.javaLangString = function() {
    if (javaLangString === null) {
      const handle = this.findClass("java/lang/String");
      try {
        javaLangString = {
          handle: register(this.newGlobalRef(handle))
        };
      } finally {
        this.deleteLocalRef(handle);
      }
    }
    return javaLangString;
  };
  Env.prototype.getClassName = function(classHandle) {
    const name = this.vaMethod("pointer", [])(this.handle, classHandle, this.javaLangClass().getName);
    try {
      return this.stringFromJni(name);
    } finally {
      this.deleteLocalRef(name);
    }
  };
  Env.prototype.getObjectClassName = function(objHandle) {
    const jklass = this.getObjectClass(objHandle);
    try {
      return this.getClassName(jklass);
    } finally {
      this.deleteLocalRef(jklass);
    }
  };
  Env.prototype.getActualTypeArgument = function(type) {
    const actualTypeArguments = this.vaMethod("pointer", [])(this.handle, type, this.javaLangReflectParameterizedType().getActualTypeArguments);
    this.throwIfExceptionPending();
    if (!actualTypeArguments.isNull()) {
      try {
        return this.getTypeNameFromFirstTypeElement(actualTypeArguments);
      } finally {
        this.deleteLocalRef(actualTypeArguments);
      }
    }
  };
  Env.prototype.getTypeNameFromFirstTypeElement = function(typeArray) {
    const length = this.getArrayLength(typeArray);
    if (length > 0) {
      const typeArgument0 = this.getObjectArrayElement(typeArray, 0);
      try {
        return this.getTypeName(typeArgument0);
      } finally {
        this.deleteLocalRef(typeArgument0);
      }
    } else {
      return "java.lang.Object";
    }
  };
  Env.prototype.getTypeName = function(type, getGenericsInformation) {
    const invokeObjectMethodNoArgs = this.vaMethod("pointer", []);
    if (this.isInstanceOf(type, this.javaLangClass().handle)) {
      return this.getClassName(type);
    } else if (this.isInstanceOf(type, this.javaLangReflectGenericArrayType().handle)) {
      return this.getArrayTypeName(type);
    } else if (this.isInstanceOf(type, this.javaLangReflectParameterizedType().handle)) {
      const rawType = invokeObjectMethodNoArgs(this.handle, type, this.javaLangReflectParameterizedType().getRawType);
      this.throwIfExceptionPending();
      let result;
      try {
        result = this.getTypeName(rawType);
      } finally {
        this.deleteLocalRef(rawType);
      }
      if (getGenericsInformation) {
        result += "<" + this.getActualTypeArgument(type) + ">";
      }
      return result;
    } else if (this.isInstanceOf(type, this.javaLangReflectTypeVariable().handle)) {
      return "java.lang.Object";
    } else if (this.isInstanceOf(type, this.javaLangReflectWildcardType().handle)) {
      return "java.lang.Object";
    } else {
      return "java.lang.Object";
    }
  };
  Env.prototype.getArrayTypeName = function(type) {
    const invokeObjectMethodNoArgs = this.vaMethod("pointer", []);
    if (this.isInstanceOf(type, this.javaLangClass().handle)) {
      return this.getClassName(type);
    } else if (this.isInstanceOf(type, this.javaLangReflectGenericArrayType().handle)) {
      const componentType = invokeObjectMethodNoArgs(this.handle, type, this.javaLangReflectGenericArrayType().getGenericComponentType);
      this.throwIfExceptionPending();
      try {
        return "[L" + this.getTypeName(componentType) + ";";
      } finally {
        this.deleteLocalRef(componentType);
      }
    } else {
      return "[Ljava.lang.Object;";
    }
  };
  Env.prototype.stringFromJni = function(str) {
    const utf = this.getStringChars(str);
    if (utf.isNull()) {
      throw new Error("Unable to access string");
    }
    try {
      const length = this.getStringLength(str);
      return utf.readUtf16String(length);
    } finally {
      this.releaseStringChars(str, utf);
    }
  };

  // node_modules/frida-java-bridge/lib/vm.js
  var JNI_VERSION_1_6 = 65542;
  var pointerSize4 = Process.pointerSize;
  var jsThreadID = Process.getCurrentThreadId();
  var attachedThreads = /* @__PURE__ */ new Map();
  var activeEnvs = /* @__PURE__ */ new Map();
  function VM(api2) {
    const handle = api2.vm;
    let attachCurrentThread = null;
    let detachCurrentThread = null;
    let getEnv = null;
    function initialize2() {
      const vtable2 = handle.readPointer();
      const options = {
        exceptions: "propagate"
      };
      attachCurrentThread = new NativeFunction(vtable2.add(4 * pointerSize4).readPointer(), "int32", ["pointer", "pointer", "pointer"], options);
      detachCurrentThread = new NativeFunction(vtable2.add(5 * pointerSize4).readPointer(), "int32", ["pointer"], options);
      getEnv = new NativeFunction(vtable2.add(6 * pointerSize4).readPointer(), "int32", ["pointer", "pointer", "int32"], options);
    }
    this.handle = handle;
    this.perform = function(fn) {
      const threadId = Process.getCurrentThreadId();
      const cachedEnv = tryGetCachedEnv(threadId);
      if (cachedEnv !== null) {
        return fn(cachedEnv);
      }
      let env = this._tryGetEnv();
      const alreadyAttached = env !== null;
      if (!alreadyAttached) {
        env = this.attachCurrentThread();
        attachedThreads.set(threadId, true);
      }
      this.link(threadId, env);
      try {
        return fn(env);
      } finally {
        const isJsThread = threadId === jsThreadID;
        if (!isJsThread) {
          this.unlink(threadId);
        }
        if (!alreadyAttached && !isJsThread) {
          const allowedToDetach = attachedThreads.get(threadId);
          attachedThreads.delete(threadId);
          if (allowedToDetach) {
            this.detachCurrentThread();
          }
        }
      }
    };
    this.attachCurrentThread = function() {
      const envBuf = Memory.alloc(pointerSize4);
      checkJniResult("VM::AttachCurrentThread", attachCurrentThread(handle, envBuf, NULL));
      return new Env(envBuf.readPointer(), this);
    };
    this.detachCurrentThread = function() {
      checkJniResult("VM::DetachCurrentThread", detachCurrentThread(handle));
    };
    this.preventDetachDueToClassLoader = function() {
      const threadId = Process.getCurrentThreadId();
      if (attachedThreads.has(threadId)) {
        attachedThreads.set(threadId, false);
      }
    };
    this.getEnv = function() {
      const cachedEnv = tryGetCachedEnv(Process.getCurrentThreadId());
      if (cachedEnv !== null) {
        return cachedEnv;
      }
      const envBuf = Memory.alloc(pointerSize4);
      const result = getEnv(handle, envBuf, JNI_VERSION_1_6);
      if (result === -2) {
        throw new Error("Current thread is not attached to the Java VM; please move this code inside a Java.perform() callback");
      }
      checkJniResult("VM::GetEnv", result);
      return new Env(envBuf.readPointer(), this);
    };
    this.tryGetEnv = function() {
      const cachedEnv = tryGetCachedEnv(Process.getCurrentThreadId());
      if (cachedEnv !== null) {
        return cachedEnv;
      }
      return this._tryGetEnv();
    };
    this._tryGetEnv = function() {
      const h2 = this.tryGetEnvHandle(JNI_VERSION_1_6);
      if (h2 === null) {
        return null;
      }
      return new Env(h2, this);
    };
    this.tryGetEnvHandle = function(version) {
      const envBuf = Memory.alloc(pointerSize4);
      const result = getEnv(handle, envBuf, version);
      if (result !== JNI_OK) {
        return null;
      }
      return envBuf.readPointer();
    };
    this.makeHandleDestructor = function(handle2) {
      return () => {
        this.perform((env) => {
          env.deleteGlobalRef(handle2);
        });
      };
    };
    this.link = function(tid, env) {
      const entry = activeEnvs.get(tid);
      if (entry === void 0) {
        activeEnvs.set(tid, [env, 1]);
      } else {
        entry[1]++;
      }
    };
    this.unlink = function(tid) {
      const entry = activeEnvs.get(tid);
      if (entry[1] === 1) {
        activeEnvs.delete(tid);
      } else {
        entry[1]--;
      }
    };
    function tryGetCachedEnv(threadId) {
      const entry = activeEnvs.get(threadId);
      if (entry === void 0) {
        return null;
      }
      return entry[0];
    }
    initialize2.call(this);
  }
  VM.dispose = function(vm3) {
    if (attachedThreads.get(jsThreadID) === true) {
      attachedThreads.delete(jsThreadID);
      vm3.detachCurrentThread();
    }
  };

  // node_modules/frida-java-bridge/lib/android.js
  var jsizeSize = 4;
  var pointerSize5 = Process.pointerSize;
  var {
    readU32,
    readPointer,
    writeU32,
    writePointer
  } = NativePointer.prototype;
  var kAccPublic = 1;
  var kAccStatic = 8;
  var kAccFinal = 16;
  var kAccNative = 256;
  var kAccFastNative = 524288;
  var kAccCriticalNative = 2097152;
  var kAccFastInterpreterToInterpreterInvoke = 1073741824;
  var kAccSkipAccessChecks = 524288;
  var kAccSingleImplementation = 134217728;
  var kAccNterpEntryPointFastPathFlag = 1048576;
  var kAccNterpInvokeFastPathFlag = 2097152;
  var kAccPublicApi = 268435456;
  var kAccXposedHookedMethod = 268435456;
  var kPointer = 0;
  var kFullDeoptimization = 3;
  var kSelectiveDeoptimization = 5;
  var THUMB_BIT_REMOVAL_MASK = ptr(1).not();
  var X86_JMP_MAX_DISTANCE = 2147467263;
  var ARM64_ADRP_MAX_DISTANCE = 4294963200;
  var ENV_VTABLE_OFFSET_EXCEPTION_CLEAR = 17 * pointerSize5;
  var ENV_VTABLE_OFFSET_FATAL_ERROR = 18 * pointerSize5;
  var DVM_JNI_ENV_OFFSET_SELF = 12;
  var DVM_CLASS_OBJECT_OFFSET_VTABLE_COUNT = 112;
  var DVM_CLASS_OBJECT_OFFSET_VTABLE = 116;
  var DVM_OBJECT_OFFSET_CLAZZ = 0;
  var DVM_METHOD_SIZE = 56;
  var DVM_METHOD_OFFSET_ACCESS_FLAGS = 4;
  var DVM_METHOD_OFFSET_METHOD_INDEX = 8;
  var DVM_METHOD_OFFSET_REGISTERS_SIZE = 10;
  var DVM_METHOD_OFFSET_OUTS_SIZE = 12;
  var DVM_METHOD_OFFSET_INS_SIZE = 14;
  var DVM_METHOD_OFFSET_SHORTY = 28;
  var DVM_METHOD_OFFSET_JNI_ARG_INFO = 36;
  var DALVIK_JNI_RETURN_VOID = 0;
  var DALVIK_JNI_RETURN_FLOAT = 1;
  var DALVIK_JNI_RETURN_DOUBLE = 2;
  var DALVIK_JNI_RETURN_S8 = 3;
  var DALVIK_JNI_RETURN_S4 = 4;
  var DALVIK_JNI_RETURN_S2 = 5;
  var DALVIK_JNI_RETURN_U2 = 6;
  var DALVIK_JNI_RETURN_S1 = 7;
  var DALVIK_JNI_NO_ARG_INFO = 2147483648;
  var DALVIK_JNI_RETURN_SHIFT = 28;
  var STD_STRING_SIZE = 3 * pointerSize5;
  var STD_VECTOR_SIZE = 3 * pointerSize5;
  var AF_UNIX = 1;
  var SOCK_STREAM = 1;
  var getArtRuntimeSpec = memoize(_getArtRuntimeSpec);
  var getArtInstrumentationSpec = memoize(_getArtInstrumentationSpec);
  var getArtMethodSpec = memoize(_getArtMethodSpec);
  var getArtThreadSpec = memoize(_getArtThreadSpec);
  var getArtManagedStackSpec = memoize(_getArtManagedStackSpec);
  var getArtThreadStateTransitionImpl = memoize(_getArtThreadStateTransitionImpl);
  var getAndroidVersion = memoize(_getAndroidVersion);
  var getAndroidCodename = memoize(_getAndroidCodename);
  var getAndroidApiLevel = memoize(_getAndroidApiLevel);
  var getArtApexVersion = memoize(_getArtApexVersion);
  var getArtQuickFrameInfoGetterThunk = memoize(_getArtQuickFrameInfoGetterThunk);
  var makeCxxMethodWrapperReturningPointerByValue = Process.arch === "ia32" ? makeCxxMethodWrapperReturningPointerByValueInFirstArg : makeCxxMethodWrapperReturningPointerByValueGeneric;
  var nativeFunctionOptions3 = {
    exceptions: "propagate"
  };
  var artThreadStateTransitions = {};
  var cachedApi = null;
  var cachedArtClassLinkerSpec = null;
  var MethodMangler = null;
  var artController = null;
  var inlineHooks = [];
  var patchedClasses = /* @__PURE__ */ new Map();
  var artQuickInterceptors = [];
  var thunkPage = null;
  var thunkOffset = 0;
  var taughtArtAboutReplacementMethods = false;
  var taughtArtAboutMethodInstrumentation = false;
  var backtraceModule = null;
  var jdwpSessions = [];
  var socketpair = null;
  var trampolineAllocator = null;
  function getApi() {
    if (cachedApi === null) {
      cachedApi = _getApi();
    }
    return cachedApi;
  }
  function _getApi() {
    const vmModules = Process.enumerateModules().filter((m2) => /^lib(art|dvm).so$/.test(m2.name)).filter((m2) => !/\/system\/fake-libs/.test(m2.path));
    if (vmModules.length === 0) {
      return null;
    }
    const vmModule = vmModules[0];
    const flavor = vmModule.name.indexOf("art") !== -1 ? "art" : "dalvik";
    const isArt = flavor === "art";
    const temporaryApi = {
      module: vmModule,
      find(name) {
        const { module } = this;
        let address = module.findExportByName(name);
        if (address === null) {
          address = module.findSymbolByName(name);
        }
        return address;
      },
      flavor,
      addLocalReference: null
    };
    temporaryApi.isApiLevel34OrApexEquivalent = isArt && (temporaryApi.find("_ZN3art7AppInfo29GetPrimaryApkReferenceProfileEv") !== null || temporaryApi.find("_ZN3art6Thread15RunFlipFunctionEPS0_") !== null);
    const pending = isArt ? {
      functions: {
        JNI_GetCreatedJavaVMs: ["JNI_GetCreatedJavaVMs", "int", ["pointer", "int", "pointer"]],
        // Android < 7
        artInterpreterToCompiledCodeBridge: function(address) {
          this.artInterpreterToCompiledCodeBridge = address;
        },
        // Android >= 8
        _ZN3art9JavaVMExt12AddGlobalRefEPNS_6ThreadENS_6ObjPtrINS_6mirror6ObjectEEE: ["art::JavaVMExt::AddGlobalRef", "pointer", ["pointer", "pointer", "pointer"]],
        // Android >= 6
        _ZN3art9JavaVMExt12AddGlobalRefEPNS_6ThreadEPNS_6mirror6ObjectE: ["art::JavaVMExt::AddGlobalRef", "pointer", ["pointer", "pointer", "pointer"]],
        // Android < 6: makeAddGlobalRefFallbackForAndroid5() needs these:
        _ZN3art17ReaderWriterMutex13ExclusiveLockEPNS_6ThreadE: ["art::ReaderWriterMutex::ExclusiveLock", "void", ["pointer", "pointer"]],
        _ZN3art17ReaderWriterMutex15ExclusiveUnlockEPNS_6ThreadE: ["art::ReaderWriterMutex::ExclusiveUnlock", "void", ["pointer", "pointer"]],
        // Android <= 7
        _ZN3art22IndirectReferenceTable3AddEjPNS_6mirror6ObjectE: function(address) {
          this["art::IndirectReferenceTable::Add"] = new NativeFunction(address, "pointer", ["pointer", "uint", "pointer"], nativeFunctionOptions3);
        },
        // Android > 7
        _ZN3art22IndirectReferenceTable3AddENS_15IRTSegmentStateENS_6ObjPtrINS_6mirror6ObjectEEE: function(address) {
          this["art::IndirectReferenceTable::Add"] = new NativeFunction(address, "pointer", ["pointer", "uint", "pointer"], nativeFunctionOptions3);
        },
        // Android >= 7
        _ZN3art9JavaVMExt12DecodeGlobalEPv: function(address) {
          let decodeGlobal;
          if (getAndroidApiLevel() >= 26) {
            decodeGlobal = makeCxxMethodWrapperReturningPointerByValue(address, ["pointer", "pointer"]);
          } else {
            decodeGlobal = new NativeFunction(address, "pointer", ["pointer", "pointer"], nativeFunctionOptions3);
          }
          this["art::JavaVMExt::DecodeGlobal"] = function(vm3, thread, ref) {
            return decodeGlobal(vm3, ref);
          };
        },
        // Android >= 6
        _ZN3art9JavaVMExt12DecodeGlobalEPNS_6ThreadEPv: ["art::JavaVMExt::DecodeGlobal", "pointer", ["pointer", "pointer", "pointer"]],
        // makeDecodeGlobalFallback() uses:
        // Android >= 15
        _ZNK3art6Thread19DecodeGlobalJObjectEP8_jobject: ["art::Thread::DecodeJObject", "pointer", ["pointer", "pointer"]],
        // Android < 6
        _ZNK3art6Thread13DecodeJObjectEP8_jobject: ["art::Thread::DecodeJObject", "pointer", ["pointer", "pointer"]],
        // Android >= 6
        _ZN3art10ThreadList10SuspendAllEPKcb: ["art::ThreadList::SuspendAll", "void", ["pointer", "pointer", "bool"]],
        // or fallback:
        _ZN3art10ThreadList10SuspendAllEv: function(address) {
          const suspendAll = new NativeFunction(address, "void", ["pointer"], nativeFunctionOptions3);
          this["art::ThreadList::SuspendAll"] = function(threadList, cause, longSuspend) {
            return suspendAll(threadList);
          };
        },
        _ZN3art10ThreadList9ResumeAllEv: ["art::ThreadList::ResumeAll", "void", ["pointer"]],
        // Android >= 7
        _ZN3art11ClassLinker12VisitClassesEPNS_12ClassVisitorE: ["art::ClassLinker::VisitClasses", "void", ["pointer", "pointer"]],
        // Android < 7
        _ZN3art11ClassLinker12VisitClassesEPFbPNS_6mirror5ClassEPvES4_: function(address) {
          const visitClasses = new NativeFunction(address, "void", ["pointer", "pointer", "pointer"], nativeFunctionOptions3);
          this["art::ClassLinker::VisitClasses"] = function(classLinker, visitor) {
            visitClasses(classLinker, visitor, NULL);
          };
        },
        _ZNK3art11ClassLinker17VisitClassLoadersEPNS_18ClassLoaderVisitorE: ["art::ClassLinker::VisitClassLoaders", "void", ["pointer", "pointer"]],
        _ZN3art2gc4Heap12VisitObjectsEPFvPNS_6mirror6ObjectEPvES5_: ["art::gc::Heap::VisitObjects", "void", ["pointer", "pointer", "pointer"]],
        _ZN3art2gc4Heap12GetInstancesERNS_24VariableSizedHandleScopeENS_6HandleINS_6mirror5ClassEEEiRNSt3__16vectorINS4_INS5_6ObjectEEENS8_9allocatorISB_EEEE: ["art::gc::Heap::GetInstances", "void", ["pointer", "pointer", "pointer", "int", "pointer"]],
        // Android >= 9
        _ZN3art2gc4Heap12GetInstancesERNS_24VariableSizedHandleScopeENS_6HandleINS_6mirror5ClassEEEbiRNSt3__16vectorINS4_INS5_6ObjectEEENS8_9allocatorISB_EEEE: function(address) {
          const getInstances = new NativeFunction(address, "void", ["pointer", "pointer", "pointer", "bool", "int", "pointer"], nativeFunctionOptions3);
          this["art::gc::Heap::GetInstances"] = function(instance, scope, hClass, maxCount, instances) {
            const useIsAssignableFrom = 0;
            getInstances(instance, scope, hClass, useIsAssignableFrom, maxCount, instances);
          };
        },
        _ZN3art12StackVisitorC2EPNS_6ThreadEPNS_7ContextENS0_13StackWalkKindEjb: ["art::StackVisitor::StackVisitor", "void", ["pointer", "pointer", "pointer", "uint", "uint", "bool"]],
        _ZN3art12StackVisitorC2EPNS_6ThreadEPNS_7ContextENS0_13StackWalkKindEmb: ["art::StackVisitor::StackVisitor", "void", ["pointer", "pointer", "pointer", "uint", "size_t", "bool"]],
        _ZN3art12StackVisitor9WalkStackILNS0_16CountTransitionsE0EEEvb: ["art::StackVisitor::WalkStack", "void", ["pointer", "bool"]],
        _ZNK3art12StackVisitor9GetMethodEv: ["art::StackVisitor::GetMethod", "pointer", ["pointer"]],
        _ZNK3art12StackVisitor16DescribeLocationEv: function(address) {
          this["art::StackVisitor::DescribeLocation"] = makeCxxMethodWrapperReturningStdStringByValue(address, ["pointer"]);
        },
        _ZNK3art12StackVisitor24GetCurrentQuickFrameInfoEv: function(address) {
          this["art::StackVisitor::GetCurrentQuickFrameInfo"] = makeArtQuickFrameInfoGetter(address);
        },
        _ZN3art7Context6CreateEv: ["art::Context::Create", "pointer", []],
        _ZN3art6Thread18GetLongJumpContextEv: ["art::Thread::GetLongJumpContext", "pointer", ["pointer"]],
        _ZN3art6mirror5Class13GetDescriptorEPNSt3__112basic_stringIcNS2_11char_traitsIcEENS2_9allocatorIcEEEE: function(address) {
          this["art::mirror::Class::GetDescriptor"] = address;
        },
        _ZN3art6mirror5Class11GetLocationEv: function(address) {
          this["art::mirror::Class::GetLocation"] = makeCxxMethodWrapperReturningStdStringByValue(address, ["pointer"]);
        },
        _ZN3art9ArtMethod12PrettyMethodEb: function(address) {
          this["art::ArtMethod::PrettyMethod"] = makeCxxMethodWrapperReturningStdStringByValue(address, ["pointer", "bool"]);
        },
        _ZN3art12PrettyMethodEPNS_9ArtMethodEb: function(address) {
          this["art::ArtMethod::PrettyMethodNullSafe"] = makeCxxMethodWrapperReturningStdStringByValue(address, ["pointer", "bool"]);
        },
        // Android < 6 for cloneArtMethod()
        _ZN3art6Thread14CurrentFromGdbEv: ["art::Thread::CurrentFromGdb", "pointer", []],
        _ZN3art6mirror6Object5CloneEPNS_6ThreadE: function(address) {
          this["art::mirror::Object::Clone"] = new NativeFunction(address, "pointer", ["pointer", "pointer"], nativeFunctionOptions3);
        },
        _ZN3art6mirror6Object5CloneEPNS_6ThreadEm: function(address) {
          const clone = new NativeFunction(address, "pointer", ["pointer", "pointer", "pointer"], nativeFunctionOptions3);
          this["art::mirror::Object::Clone"] = function(thisPtr, threadPtr) {
            const numTargetBytes = NULL;
            return clone(thisPtr, threadPtr, numTargetBytes);
          };
        },
        _ZN3art6mirror6Object5CloneEPNS_6ThreadEj: function(address) {
          const clone = new NativeFunction(address, "pointer", ["pointer", "pointer", "uint"], nativeFunctionOptions3);
          this["art::mirror::Object::Clone"] = function(thisPtr, threadPtr) {
            const numTargetBytes = 0;
            return clone(thisPtr, threadPtr, numTargetBytes);
          };
        },
        _ZN3art3Dbg14SetJdwpAllowedEb: ["art::Dbg::SetJdwpAllowed", "void", ["bool"]],
        _ZN3art3Dbg13ConfigureJdwpERKNS_4JDWP11JdwpOptionsE: ["art::Dbg::ConfigureJdwp", "void", ["pointer"]],
        _ZN3art31InternalDebuggerControlCallback13StartDebuggerEv: ["art::InternalDebuggerControlCallback::StartDebugger", "void", ["pointer"]],
        _ZN3art3Dbg9StartJdwpEv: ["art::Dbg::StartJdwp", "void", []],
        _ZN3art3Dbg8GoActiveEv: ["art::Dbg::GoActive", "void", []],
        _ZN3art3Dbg21RequestDeoptimizationERKNS_21DeoptimizationRequestE: ["art::Dbg::RequestDeoptimization", "void", ["pointer"]],
        _ZN3art3Dbg20ManageDeoptimizationEv: ["art::Dbg::ManageDeoptimization", "void", []],
        _ZN3art15instrumentation15Instrumentation20EnableDeoptimizationEv: ["art::Instrumentation::EnableDeoptimization", "void", ["pointer"]],
        // Android >= 6
        _ZN3art15instrumentation15Instrumentation20DeoptimizeEverythingEPKc: ["art::Instrumentation::DeoptimizeEverything", "void", ["pointer", "pointer"]],
        // Android < 6
        _ZN3art15instrumentation15Instrumentation20DeoptimizeEverythingEv: function(address) {
          const deoptimize = new NativeFunction(address, "void", ["pointer"], nativeFunctionOptions3);
          this["art::Instrumentation::DeoptimizeEverything"] = function(instrumentation, key) {
            deoptimize(instrumentation);
          };
        },
        _ZN3art7Runtime19DeoptimizeBootImageEv: ["art::Runtime::DeoptimizeBootImage", "void", ["pointer"]],
        _ZN3art15instrumentation15Instrumentation10DeoptimizeEPNS_9ArtMethodE: ["art::Instrumentation::Deoptimize", "void", ["pointer", "pointer"]],
        // Android >= 11
        _ZN3art3jni12JniIdManager14DecodeMethodIdEP10_jmethodID: ["art::jni::JniIdManager::DecodeMethodId", "pointer", ["pointer", "pointer"]],
        _ZN3art3jni12JniIdManager13DecodeFieldIdEP9_jfieldID: ["art::jni::JniIdManager::DecodeFieldId", "pointer", ["pointer", "pointer"]],
        _ZN3art11interpreter18GetNterpEntryPointEv: ["art::interpreter::GetNterpEntryPoint", "pointer", []],
        _ZN3art7Monitor17TranslateLocationEPNS_9ArtMethodEjPPKcPi: ["art::Monitor::TranslateLocation", "void", ["pointer", "uint32", "pointer", "pointer"]]
      },
      variables: {
        _ZN3art3Dbg9gRegistryE: function(address) {
          this.isJdwpStarted = () => !address.readPointer().isNull();
        },
        _ZN3art3Dbg15gDebuggerActiveE: function(address) {
          this.isDebuggerActive = () => !!address.readU8();
        }
      },
      optionals: /* @__PURE__ */ new Set([
        "artInterpreterToCompiledCodeBridge",
        "_ZN3art9JavaVMExt12AddGlobalRefEPNS_6ThreadENS_6ObjPtrINS_6mirror6ObjectEEE",
        "_ZN3art9JavaVMExt12AddGlobalRefEPNS_6ThreadEPNS_6mirror6ObjectE",
        "_ZN3art9JavaVMExt12DecodeGlobalEPv",
        "_ZN3art9JavaVMExt12DecodeGlobalEPNS_6ThreadEPv",
        "_ZNK3art6Thread19DecodeGlobalJObjectEP8_jobject",
        "_ZNK3art6Thread13DecodeJObjectEP8_jobject",
        "_ZN3art10ThreadList10SuspendAllEPKcb",
        "_ZN3art10ThreadList10SuspendAllEv",
        "_ZN3art11ClassLinker12VisitClassesEPNS_12ClassVisitorE",
        "_ZN3art11ClassLinker12VisitClassesEPFbPNS_6mirror5ClassEPvES4_",
        "_ZNK3art11ClassLinker17VisitClassLoadersEPNS_18ClassLoaderVisitorE",
        "_ZN3art6mirror6Object5CloneEPNS_6ThreadE",
        "_ZN3art6mirror6Object5CloneEPNS_6ThreadEm",
        "_ZN3art6mirror6Object5CloneEPNS_6ThreadEj",
        "_ZN3art22IndirectReferenceTable3AddEjPNS_6mirror6ObjectE",
        "_ZN3art22IndirectReferenceTable3AddENS_15IRTSegmentStateENS_6ObjPtrINS_6mirror6ObjectEEE",
        "_ZN3art2gc4Heap12VisitObjectsEPFvPNS_6mirror6ObjectEPvES5_",
        "_ZN3art2gc4Heap12GetInstancesERNS_24VariableSizedHandleScopeENS_6HandleINS_6mirror5ClassEEEiRNSt3__16vectorINS4_INS5_6ObjectEEENS8_9allocatorISB_EEEE",
        "_ZN3art2gc4Heap12GetInstancesERNS_24VariableSizedHandleScopeENS_6HandleINS_6mirror5ClassEEEbiRNSt3__16vectorINS4_INS5_6ObjectEEENS8_9allocatorISB_EEEE",
        "_ZN3art12StackVisitorC2EPNS_6ThreadEPNS_7ContextENS0_13StackWalkKindEjb",
        "_ZN3art12StackVisitorC2EPNS_6ThreadEPNS_7ContextENS0_13StackWalkKindEmb",
        "_ZN3art12StackVisitor9WalkStackILNS0_16CountTransitionsE0EEEvb",
        "_ZNK3art12StackVisitor9GetMethodEv",
        "_ZNK3art12StackVisitor16DescribeLocationEv",
        "_ZNK3art12StackVisitor24GetCurrentQuickFrameInfoEv",
        "_ZN3art7Context6CreateEv",
        "_ZN3art6Thread18GetLongJumpContextEv",
        "_ZN3art6mirror5Class13GetDescriptorEPNSt3__112basic_stringIcNS2_11char_traitsIcEENS2_9allocatorIcEEEE",
        "_ZN3art6mirror5Class11GetLocationEv",
        "_ZN3art9ArtMethod12PrettyMethodEb",
        "_ZN3art12PrettyMethodEPNS_9ArtMethodEb",
        "_ZN3art3Dbg13ConfigureJdwpERKNS_4JDWP11JdwpOptionsE",
        "_ZN3art31InternalDebuggerControlCallback13StartDebuggerEv",
        "_ZN3art3Dbg15gDebuggerActiveE",
        "_ZN3art15instrumentation15Instrumentation20EnableDeoptimizationEv",
        "_ZN3art15instrumentation15Instrumentation20DeoptimizeEverythingEPKc",
        "_ZN3art15instrumentation15Instrumentation20DeoptimizeEverythingEv",
        "_ZN3art7Runtime19DeoptimizeBootImageEv",
        "_ZN3art15instrumentation15Instrumentation10DeoptimizeEPNS_9ArtMethodE",
        "_ZN3art3Dbg9StartJdwpEv",
        "_ZN3art3Dbg8GoActiveEv",
        "_ZN3art3Dbg21RequestDeoptimizationERKNS_21DeoptimizationRequestE",
        "_ZN3art3Dbg20ManageDeoptimizationEv",
        "_ZN3art3Dbg9gRegistryE",
        "_ZN3art3jni12JniIdManager14DecodeMethodIdEP10_jmethodID",
        "_ZN3art3jni12JniIdManager13DecodeFieldIdEP9_jfieldID",
        "_ZN3art11interpreter18GetNterpEntryPointEv",
        "_ZN3art7Monitor17TranslateLocationEPNS_9ArtMethodEjPPKcPi"
      ])
    } : {
      functions: {
        _Z20dvmDecodeIndirectRefP6ThreadP8_jobject: ["dvmDecodeIndirectRef", "pointer", ["pointer", "pointer"]],
        _Z15dvmUseJNIBridgeP6MethodPv: ["dvmUseJNIBridge", "void", ["pointer", "pointer"]],
        _Z20dvmHeapSourceGetBasev: ["dvmHeapSourceGetBase", "pointer", []],
        _Z21dvmHeapSourceGetLimitv: ["dvmHeapSourceGetLimit", "pointer", []],
        _Z16dvmIsValidObjectPK6Object: ["dvmIsValidObject", "uint8", ["pointer"]],
        JNI_GetCreatedJavaVMs: ["JNI_GetCreatedJavaVMs", "int", ["pointer", "int", "pointer"]]
      },
      variables: {
        gDvmJni: function(address) {
          this.gDvmJni = address;
        },
        gDvm: function(address) {
          this.gDvm = address;
        }
      }
    };
    const {
      functions = {},
      variables = {},
      optionals = /* @__PURE__ */ new Set()
    } = pending;
    const missing = [];
    for (const [name, signature] of Object.entries(functions)) {
      const address = temporaryApi.find(name);
      if (address !== null) {
        if (typeof signature === "function") {
          signature.call(temporaryApi, address);
        } else {
          temporaryApi[signature[0]] = new NativeFunction(address, signature[1], signature[2], nativeFunctionOptions3);
        }
      } else {
        if (!optionals.has(name)) {
          missing.push(name);
        }
      }
    }
    for (const [name, handler] of Object.entries(variables)) {
      const address = temporaryApi.find(name);
      if (address !== null) {
        handler.call(temporaryApi, address);
      } else {
        if (!optionals.has(name)) {
          missing.push(name);
        }
      }
    }
    if (missing.length > 0) {
      throw new Error("Java API only partially available; please file a bug. Missing: " + missing.join(", "));
    }
    const vms = Memory.alloc(pointerSize5);
    const vmCount = Memory.alloc(jsizeSize);
    checkJniResult("JNI_GetCreatedJavaVMs", temporaryApi.JNI_GetCreatedJavaVMs(vms, 1, vmCount));
    if (vmCount.readInt() === 0) {
      return null;
    }
    temporaryApi.vm = vms.readPointer();
    if (isArt) {
      const apiLevel = getAndroidApiLevel();
      let kAccCompileDontBother;
      if (apiLevel >= 27) {
        kAccCompileDontBother = 33554432;
      } else if (apiLevel >= 24) {
        kAccCompileDontBother = 16777216;
      } else {
        kAccCompileDontBother = 0;
      }
      temporaryApi.kAccCompileDontBother = kAccCompileDontBother;
      const artRuntime = temporaryApi.vm.add(pointerSize5).readPointer();
      temporaryApi.artRuntime = artRuntime;
      const runtimeSpec = getArtRuntimeSpec(temporaryApi);
      const runtimeOffset = runtimeSpec.offset;
      const instrumentationOffset = runtimeOffset.instrumentation;
      temporaryApi.artInstrumentation = instrumentationOffset !== null ? artRuntime.add(instrumentationOffset) : null;
      const instrumentationIsPointer = getArtApexVersion() >= 36e7;
      if (instrumentationIsPointer && temporaryApi.artInstrumentation != null) {
        temporaryApi.artInstrumentation = temporaryApi.artInstrumentation.readPointer();
      }
      temporaryApi.artHeap = artRuntime.add(runtimeOffset.heap).readPointer();
      temporaryApi.artThreadList = artRuntime.add(runtimeOffset.threadList).readPointer();
      const classLinker = artRuntime.add(runtimeOffset.classLinker).readPointer();
      const classLinkerOffsets = getArtClassLinkerSpec(artRuntime, runtimeSpec).offset;
      const quickResolutionTrampoline = classLinker.add(classLinkerOffsets.quickResolutionTrampoline).readPointer();
      const quickImtConflictTrampoline = classLinker.add(classLinkerOffsets.quickImtConflictTrampoline).readPointer();
      const quickGenericJniTrampoline = classLinker.add(classLinkerOffsets.quickGenericJniTrampoline).readPointer();
      const quickToInterpreterBridgeTrampoline = classLinker.add(classLinkerOffsets.quickToInterpreterBridgeTrampoline).readPointer();
      temporaryApi.artClassLinker = {
        address: classLinker,
        quickResolutionTrampoline,
        quickImtConflictTrampoline,
        quickGenericJniTrampoline,
        quickToInterpreterBridgeTrampoline
      };
      const vm3 = new VM(temporaryApi);
      temporaryApi.artQuickGenericJniTrampoline = getArtQuickEntrypointFromTrampoline(quickGenericJniTrampoline, vm3);
      temporaryApi.artQuickToInterpreterBridge = getArtQuickEntrypointFromTrampoline(quickToInterpreterBridgeTrampoline, vm3);
      temporaryApi.artQuickResolutionTrampoline = getArtQuickEntrypointFromTrampoline(quickResolutionTrampoline, vm3);
      if (temporaryApi["art::JavaVMExt::AddGlobalRef"] === void 0) {
        temporaryApi["art::JavaVMExt::AddGlobalRef"] = makeAddGlobalRefFallbackForAndroid5(temporaryApi);
      }
      if (temporaryApi["art::JavaVMExt::DecodeGlobal"] === void 0) {
        temporaryApi["art::JavaVMExt::DecodeGlobal"] = makeDecodeGlobalFallback(temporaryApi);
      }
      if (temporaryApi["art::ArtMethod::PrettyMethod"] === void 0) {
        temporaryApi["art::ArtMethod::PrettyMethod"] = temporaryApi["art::ArtMethod::PrettyMethodNullSafe"];
      }
      if (temporaryApi["art::interpreter::GetNterpEntryPoint"] !== void 0) {
        temporaryApi.artNterpEntryPoint = temporaryApi["art::interpreter::GetNterpEntryPoint"]();
      } else {
        temporaryApi.artNterpEntryPoint = temporaryApi.find("ExecuteNterpImpl");
      }
      artController = makeArtController(temporaryApi, vm3);
      fixupArtQuickDeliverExceptionBug(temporaryApi);
      let cachedJvmti = null;
      Object.defineProperty(temporaryApi, "jvmti", {
        get() {
          if (cachedJvmti === null) {
            cachedJvmti = [tryGetEnvJvmti(vm3, this.artRuntime)];
          }
          return cachedJvmti[0];
        }
      });
    }
    const cxxImports = vmModule.enumerateImports().filter((imp) => imp.name.indexOf("_Z") === 0).reduce((result, imp) => {
      result[imp.name] = imp.address;
      return result;
    }, {});
    temporaryApi.$new = new NativeFunction(cxxImports._Znwm || cxxImports._Znwj, "pointer", ["ulong"], nativeFunctionOptions3);
    temporaryApi.$delete = new NativeFunction(cxxImports._ZdlPv, "void", ["pointer"], nativeFunctionOptions3);
    MethodMangler = isArt ? ArtMethodMangler : DalvikMethodMangler;
    return temporaryApi;
  }
  function tryGetEnvJvmti(vm3, runtime2) {
    let env = null;
    vm3.perform(() => {
      const ensurePluginLoadedAddr = getApi().find("_ZN3art7Runtime18EnsurePluginLoadedEPKcPNSt3__112basic_stringIcNS3_11char_traitsIcEENS3_9allocatorIcEEEE");
      if (ensurePluginLoadedAddr === null) {
        return;
      }
      const ensurePluginLoaded = new NativeFunction(
        ensurePluginLoadedAddr,
        "bool",
        ["pointer", "pointer", "pointer"]
      );
      const errorPtr = Memory.alloc(pointerSize5);
      const success = ensurePluginLoaded(runtime2, Memory.allocUtf8String("libopenjdkjvmti.so"), errorPtr);
      if (!success) {
        return;
      }
      const kArtTiVersion = jvmtiVersion.v1_2 | 1073741824;
      const handle = vm3.tryGetEnvHandle(kArtTiVersion);
      if (handle === null) {
        return;
      }
      env = new EnvJvmti(handle, vm3);
      const capaBuf = Memory.alloc(8);
      capaBuf.writeU64(jvmtiCapabilities.canTagObjects);
      const result = env.addCapabilities(capaBuf);
      if (result !== JNI_OK) {
        env = null;
      }
    });
    return env;
  }
  function ensureClassInitialized(env, classRef) {
    const api2 = getApi();
    if (api2.flavor !== "art") {
      return;
    }
    env.getClassName(classRef);
  }
  function getArtVMSpec(api2) {
    return {
      offset: pointerSize5 === 4 ? {
        globalsLock: 32,
        globals: 72
      } : {
        globalsLock: 64,
        globals: 112
      }
    };
  }
  function _getArtRuntimeSpec(api2) {
    const vm3 = api2.vm;
    const runtime2 = api2.artRuntime;
    const startOffset = pointerSize5 === 4 ? 200 : 384;
    const endOffset = startOffset + 100 * pointerSize5;
    const apiLevel = getAndroidApiLevel();
    const codename = getAndroidCodename();
    const { isApiLevel34OrApexEquivalent } = api2;
    let spec = null;
    for (let offset = startOffset; offset !== endOffset; offset += pointerSize5) {
      const value = runtime2.add(offset).readPointer();
      if (value.equals(vm3)) {
        let classLinkerOffsets;
        let jniIdManagerOffset = null;
        if (apiLevel >= 33 || codename === "Tiramisu" || isApiLevel34OrApexEquivalent) {
          classLinkerOffsets = [offset - 4 * pointerSize5];
          jniIdManagerOffset = offset - pointerSize5;
        } else if (apiLevel >= 30 || codename === "R") {
          classLinkerOffsets = [offset - 3 * pointerSize5, offset - 4 * pointerSize5];
          jniIdManagerOffset = offset - pointerSize5;
        } else if (apiLevel >= 29) {
          classLinkerOffsets = [offset - 2 * pointerSize5];
        } else if (apiLevel >= 27) {
          classLinkerOffsets = [offset - STD_STRING_SIZE - 3 * pointerSize5];
        } else {
          classLinkerOffsets = [offset - STD_STRING_SIZE - 2 * pointerSize5];
        }
        for (const classLinkerOffset of classLinkerOffsets) {
          const internTableOffset = classLinkerOffset - pointerSize5;
          const threadListOffset = internTableOffset - pointerSize5;
          let heapOffset;
          if (isApiLevel34OrApexEquivalent) {
            heapOffset = threadListOffset - 9 * pointerSize5;
          } else if (apiLevel >= 24) {
            heapOffset = threadListOffset - 8 * pointerSize5;
          } else if (apiLevel >= 23) {
            heapOffset = threadListOffset - 7 * pointerSize5;
          } else {
            heapOffset = threadListOffset - 4 * pointerSize5;
          }
          const candidate = {
            offset: {
              heap: heapOffset,
              threadList: threadListOffset,
              internTable: internTableOffset,
              classLinker: classLinkerOffset,
              jniIdManager: jniIdManagerOffset
            }
          };
          if (tryGetArtClassLinkerSpec(runtime2, candidate) !== null) {
            spec = candidate;
            break;
          }
        }
        break;
      }
    }
    if (spec === null) {
      throw new Error("Unable to determine Runtime field offsets");
    }
    const instrumentationIsPointer = getArtApexVersion() >= 36e7;
    spec.offset.instrumentation = instrumentationIsPointer ? tryDetectInstrumentationPointer(api2) : tryDetectInstrumentationOffset(api2);
    spec.offset.jniIdsIndirection = tryDetectJniIdsIndirectionOffset(api2);
    return spec;
  }
  var instrumentationOffsetParsers = {
    ia32: parsex86InstrumentationOffset,
    x64: parsex86InstrumentationOffset,
    arm: parseArmInstrumentationOffset,
    arm64: parseArm64InstrumentationOffset
  };
  function tryDetectInstrumentationOffset(api2) {
    const impl = api2["art::Runtime::DeoptimizeBootImage"];
    if (impl === void 0) {
      return null;
    }
    return parseInstructionsAt(impl, instrumentationOffsetParsers[Process.arch], { limit: 30 });
  }
  function parsex86InstrumentationOffset(insn) {
    if (insn.mnemonic !== "lea") {
      return null;
    }
    const offset = insn.operands[1].value.disp;
    if (offset < 256 || offset > 1024) {
      return null;
    }
    return offset;
  }
  function parseArmInstrumentationOffset(insn) {
    if (insn.mnemonic !== "add.w") {
      return null;
    }
    const ops = insn.operands;
    if (ops.length !== 3) {
      return null;
    }
    const op2 = ops[2];
    if (op2.type !== "imm") {
      return null;
    }
    return op2.value;
  }
  function parseArm64InstrumentationOffset(insn) {
    if (insn.mnemonic !== "add") {
      return null;
    }
    const ops = insn.operands;
    if (ops.length !== 3) {
      return null;
    }
    if (ops[0].value === "sp" || ops[1].value === "sp") {
      return null;
    }
    const op2 = ops[2];
    if (op2.type !== "imm") {
      return null;
    }
    const offset = op2.value.valueOf();
    if (offset < 256 || offset > 1024) {
      return null;
    }
    return offset;
  }
  var instrumentationPointerParser = {
    ia32: parsex86InstrumentationPointer,
    x64: parsex86InstrumentationPointer,
    arm: parseArmInstrumentationPointer,
    arm64: parseArm64InstrumentationPointer
  };
  function tryDetectInstrumentationPointer(api2) {
    const impl = api2["art::Runtime::DeoptimizeBootImage"];
    if (impl === void 0) {
      return null;
    }
    return parseInstructionsAt(impl, instrumentationPointerParser[Process.arch], { limit: 30 });
  }
  function parsex86InstrumentationPointer(insn) {
    if (insn.mnemonic !== "mov") {
      return null;
    }
    const ops = insn.operands;
    const dst = ops[0];
    if (dst.value !== "rax") {
      return null;
    }
    const src = ops[1];
    if (src.type !== "mem") {
      return null;
    }
    const mem = src.value;
    if (mem.base !== "rdi") {
      return null;
    }
    const offset = mem.disp;
    if (offset < 256 || offset > 1024) {
      return null;
    }
    return offset;
  }
  function parseArmInstrumentationPointer(insn) {
    return null;
  }
  function parseArm64InstrumentationPointer(insn) {
    if (insn.mnemonic !== "ldr") {
      return null;
    }
    const ops = insn.operands;
    if (ops[0].value === "x0") {
      return null;
    }
    const mem = ops[1].value;
    if (mem.base !== "x0") {
      return null;
    }
    const offset = mem.disp;
    if (offset < 256 || offset > 1024) {
      return null;
    }
    return offset;
  }
  var jniIdsIndirectionOffsetParsers = {
    ia32: parsex86JniIdsIndirectionOffset,
    x64: parsex86JniIdsIndirectionOffset,
    arm: parseArmJniIdsIndirectionOffset,
    arm64: parseArm64JniIdsIndirectionOffset
  };
  function tryDetectJniIdsIndirectionOffset(api2) {
    const impl = api2.find("_ZN3art7Runtime12SetJniIdTypeENS_9JniIdTypeE");
    if (impl === null) {
      return null;
    }
    const offset = parseInstructionsAt(impl, jniIdsIndirectionOffsetParsers[Process.arch], { limit: 20 });
    if (offset === null) {
      throw new Error("Unable to determine Runtime.jni_ids_indirection_ offset");
    }
    return offset;
  }
  function parsex86JniIdsIndirectionOffset(insn) {
    if (insn.mnemonic === "cmp") {
      return insn.operands[0].value.disp;
    }
    return null;
  }
  function parseArmJniIdsIndirectionOffset(insn) {
    if (insn.mnemonic === "ldr.w") {
      return insn.operands[1].value.disp;
    }
    return null;
  }
  function parseArm64JniIdsIndirectionOffset(insn, prevInsn) {
    if (prevInsn === null) {
      return null;
    }
    const { mnemonic } = insn;
    const { mnemonic: prevMnemonic } = prevInsn;
    if (mnemonic === "cmp" && prevMnemonic === "ldr" || mnemonic === "bl" && prevMnemonic === "str") {
      return prevInsn.operands[1].value.disp;
    }
    return null;
  }
  function _getArtInstrumentationSpec() {
    const deoptimizationEnabledOffsets = {
      "4-21": 136,
      "4-22": 136,
      "4-23": 172,
      "4-24": 196,
      "4-25": 196,
      "4-26": 196,
      "4-27": 196,
      "4-28": 212,
      "4-29": 172,
      "4-30": 180,
      "4-31": 180,
      "8-21": 224,
      "8-22": 224,
      "8-23": 296,
      "8-24": 344,
      "8-25": 344,
      "8-26": 352,
      "8-27": 352,
      "8-28": 392,
      "8-29": 328,
      "8-30": 336,
      "8-31": 336
    };
    const deoptEnabledOffset = deoptimizationEnabledOffsets[`${pointerSize5}-${getAndroidApiLevel()}`];
    if (deoptEnabledOffset === void 0) {
      throw new Error("Unable to determine Instrumentation field offsets");
    }
    return {
      offset: {
        forcedInterpretOnly: 4,
        deoptimizationEnabled: deoptEnabledOffset
      }
    };
  }
  function getArtClassLinkerSpec(runtime2, runtimeSpec) {
    const spec = tryGetArtClassLinkerSpec(runtime2, runtimeSpec);
    if (spec === null) {
      throw new Error("Unable to determine ClassLinker field offsets");
    }
    return spec;
  }
  function tryGetArtClassLinkerSpec(runtime2, runtimeSpec) {
    if (cachedArtClassLinkerSpec !== null) {
      return cachedArtClassLinkerSpec;
    }
    const { classLinker: classLinkerOffset, internTable: internTableOffset } = runtimeSpec.offset;
    const classLinker = runtime2.add(classLinkerOffset).readPointer();
    const internTable = runtime2.add(internTableOffset).readPointer();
    const startOffset = pointerSize5 === 4 ? 100 : 200;
    const endOffset = startOffset + 100 * pointerSize5;
    const apiLevel = getAndroidApiLevel();
    let spec = null;
    for (let offset = startOffset; offset !== endOffset; offset += pointerSize5) {
      const value = classLinker.add(offset).readPointer();
      if (value.equals(internTable)) {
        let delta;
        if (apiLevel >= 30 || getAndroidCodename() === "R") {
          delta = 6;
        } else if (apiLevel >= 29) {
          delta = 4;
        } else if (apiLevel >= 23) {
          delta = 3;
        } else {
          delta = 5;
        }
        const quickGenericJniTrampolineOffset = offset + delta * pointerSize5;
        let quickResolutionTrampolineOffset;
        if (apiLevel >= 23) {
          quickResolutionTrampolineOffset = quickGenericJniTrampolineOffset - 2 * pointerSize5;
        } else {
          quickResolutionTrampolineOffset = quickGenericJniTrampolineOffset - 3 * pointerSize5;
        }
        spec = {
          offset: {
            quickResolutionTrampoline: quickResolutionTrampolineOffset,
            quickImtConflictTrampoline: quickGenericJniTrampolineOffset - pointerSize5,
            quickGenericJniTrampoline: quickGenericJniTrampolineOffset,
            quickToInterpreterBridgeTrampoline: quickGenericJniTrampolineOffset + pointerSize5
          }
        };
        break;
      }
    }
    if (spec !== null) {
      cachedArtClassLinkerSpec = spec;
    }
    return spec;
  }
  function getArtClassSpec(vm3) {
    const MAX_OFFSET = 256;
    let spec = null;
    vm3.perform((env) => {
      const fieldSpec = getArtFieldSpec(vm3);
      const methodSpec = getArtMethodSpec(vm3);
      const fInfo = {
        artArrayLengthSize: 4,
        artArrayEntrySize: fieldSpec.size,
        // java/lang/Thread has 36 fields on Android 16.
        artArrayMax: 50
      };
      const mInfo = {
        artArrayLengthSize: pointerSize5,
        artArrayEntrySize: methodSpec.size,
        // java/lang/Thread has 79 methods on Android 16.
        artArrayMax: 100
      };
      const readArtArray = (objectBase, fieldOffset, lengthSize) => {
        const header = objectBase.add(fieldOffset).readPointer();
        if (header.isNull()) {
          return null;
        }
        const length = lengthSize === 4 ? header.readU32() : header.readU64().valueOf();
        if (length <= 0) {
          return null;
        }
        return {
          length,
          data: header.add(lengthSize)
        };
      };
      const hasEntry = (objectBase, offset, needle, info) => {
        try {
          const artArray = readArtArray(objectBase, offset, info.artArrayLengthSize);
          if (artArray === null) {
            return false;
          }
          const artArrayEnd = Math.min(artArray.length, info.artArrayMax);
          for (let i2 = 0; i2 !== artArrayEnd; i2++) {
            const fieldPtr = artArray.data.add(i2 * info.artArrayEntrySize);
            if (fieldPtr.equals(needle)) {
              return true;
            }
          }
        } catch {
        }
        return false;
      };
      const clazz = env.findClass("java/lang/Thread");
      const clazzRef = env.newGlobalRef(clazz);
      try {
        let object;
        withRunnableArtThread(vm3, env, (thread) => {
          object = getApi()["art::JavaVMExt::DecodeGlobal"](vm3, thread, clazzRef);
        });
        const fieldInstance = unwrapFieldId(env.getFieldId(clazzRef, "name", "Ljava/lang/String;"));
        const fieldStatic = unwrapFieldId(env.getStaticFieldId(clazzRef, "MAX_PRIORITY", "I"));
        let offsetStatic = -1;
        let offsetInstance = -1;
        for (let offset = 0; offset !== MAX_OFFSET; offset += 4) {
          if (offsetStatic === -1 && hasEntry(object, offset, fieldStatic, fInfo)) {
            offsetStatic = offset;
          }
          if (offsetInstance === -1 && hasEntry(object, offset, fieldInstance, fInfo)) {
            offsetInstance = offset;
          }
        }
        if (offsetInstance === -1 || offsetStatic === -1) {
          throw new Error("Unable to find fields in java/lang/Thread; please file a bug");
        }
        const sfieldOffset = offsetInstance !== offsetStatic ? offsetStatic : 0;
        const ifieldOffset = offsetInstance;
        let offsetMethods = -1;
        const methodInstance = unwrapMethodId(env.getMethodId(clazzRef, "getName", "()Ljava/lang/String;"));
        for (let offset = 0; offset !== MAX_OFFSET; offset += 4) {
          if (offsetMethods === -1 && hasEntry(object, offset, methodInstance, mInfo)) {
            offsetMethods = offset;
          }
        }
        if (offsetMethods === -1) {
          throw new Error("Unable to find methods in java/lang/Thread; please file a bug");
        }
        let offsetCopiedMethods = -1;
        const methodsArray = readArtArray(object, offsetMethods, mInfo.artArrayLengthSize);
        const methodsArraySize = methodsArray.length;
        for (let offset = offsetMethods; offset !== MAX_OFFSET; offset += 4) {
          if (object.add(offset).readU16() === methodsArraySize) {
            offsetCopiedMethods = offset;
            break;
          }
        }
        if (offsetCopiedMethods === -1) {
          throw new Error("Unable to find copied methods in java/lang/Thread; please file a bug");
        }
        spec = {
          offset: {
            ifields: ifieldOffset,
            methods: offsetMethods,
            sfields: sfieldOffset,
            copiedMethodsOffset: offsetCopiedMethods
          }
        };
      } finally {
        env.deleteLocalRef(clazz);
        env.deleteGlobalRef(clazzRef);
      }
    });
    return spec;
  }
  function _getArtMethodSpec(vm3) {
    const api2 = getApi();
    let spec;
    vm3.perform((env) => {
      const process = env.findClass("android/os/Process");
      const getElapsedCpuTime = unwrapMethodId(env.getStaticMethodId(process, "getElapsedCpuTime", "()J"));
      env.deleteLocalRef(process);
      const runtimeModule = Process.getModuleByName("libandroid_runtime.so");
      const runtimeStart = runtimeModule.base;
      const runtimeEnd = runtimeStart.add(runtimeModule.size);
      const apiLevel = getAndroidApiLevel();
      const entrypointFieldSize = apiLevel <= 21 ? 8 : pointerSize5;
      const expectedAccessFlags = kAccPublic | kAccStatic | kAccFinal | kAccNative;
      const relevantAccessFlagsMask = ~(kAccFastInterpreterToInterpreterInvoke | kAccPublicApi | kAccNterpInvokeFastPathFlag) >>> 0;
      let jniCodeOffset = null;
      let accessFlagsOffset = null;
      let remaining = 2;
      for (let offset = 0; offset !== 64 && remaining !== 0; offset += 4) {
        const field = getElapsedCpuTime.add(offset);
        if (jniCodeOffset === null) {
          const address = field.readPointer();
          if (address.compare(runtimeStart) >= 0 && address.compare(runtimeEnd) < 0) {
            jniCodeOffset = offset;
            remaining--;
          }
        }
        if (accessFlagsOffset === null) {
          const flags = field.readU32();
          if ((flags & relevantAccessFlagsMask) === expectedAccessFlags) {
            accessFlagsOffset = offset;
            remaining--;
          }
        }
      }
      if (remaining !== 0) {
        throw new Error("Unable to determine ArtMethod field offsets");
      }
      const quickCodeOffset = jniCodeOffset + entrypointFieldSize;
      const size = apiLevel <= 21 ? quickCodeOffset + 32 : quickCodeOffset + pointerSize5;
      spec = {
        size,
        offset: {
          jniCode: jniCodeOffset,
          quickCode: quickCodeOffset,
          accessFlags: accessFlagsOffset
        }
      };
      if ("artInterpreterToCompiledCodeBridge" in api2) {
        spec.offset.interpreterCode = jniCodeOffset - entrypointFieldSize;
      }
    });
    return spec;
  }
  function getArtFieldSpec(vm3) {
    const apiLevel = getAndroidApiLevel();
    if (apiLevel >= 23) {
      return {
        size: 16,
        offset: {
          accessFlags: 4
        }
      };
    }
    if (apiLevel >= 21) {
      return {
        size: 24,
        offset: {
          accessFlags: 12
        }
      };
    }
    return null;
  }
  function _getArtThreadSpec(vm3) {
    const apiLevel = getAndroidApiLevel();
    let spec;
    vm3.perform((env) => {
      const threadHandle = getArtThreadFromEnv(env);
      const envHandle = env.handle;
      let isExceptionReportedOffset = null;
      let exceptionOffset = null;
      let throwLocationOffset = null;
      let topHandleScopeOffset = null;
      let managedStackOffset = null;
      let selfOffset = null;
      for (let offset = 144; offset !== 256; offset += pointerSize5) {
        const field = threadHandle.add(offset);
        const value = field.readPointer();
        if (value.equals(envHandle)) {
          exceptionOffset = offset - 6 * pointerSize5;
          managedStackOffset = offset - 4 * pointerSize5;
          selfOffset = offset + 2 * pointerSize5;
          if (apiLevel <= 22) {
            exceptionOffset -= pointerSize5;
            isExceptionReportedOffset = exceptionOffset - pointerSize5 - 9 * 8 - 3 * 4;
            throwLocationOffset = offset + 6 * pointerSize5;
            managedStackOffset -= pointerSize5;
            selfOffset -= pointerSize5;
          }
          topHandleScopeOffset = offset + 9 * pointerSize5;
          if (apiLevel <= 22) {
            topHandleScopeOffset += 2 * pointerSize5 + 4;
            if (pointerSize5 === 8) {
              topHandleScopeOffset += 4;
            }
          }
          if (apiLevel >= 23) {
            topHandleScopeOffset += pointerSize5;
          }
          break;
        }
      }
      if (topHandleScopeOffset === null) {
        throw new Error("Unable to determine ArtThread field offsets");
      }
      spec = {
        offset: {
          isExceptionReportedToInstrumentation: isExceptionReportedOffset,
          exception: exceptionOffset,
          throwLocation: throwLocationOffset,
          topHandleScope: topHandleScopeOffset,
          managedStack: managedStackOffset,
          self: selfOffset
        }
      };
    });
    return spec;
  }
  function _getArtManagedStackSpec() {
    const apiLevel = getAndroidApiLevel();
    if (apiLevel >= 23) {
      return {
        offset: {
          topQuickFrame: 0,
          link: pointerSize5
        }
      };
    } else {
      return {
        offset: {
          topQuickFrame: 2 * pointerSize5,
          link: 0
        }
      };
    }
  }
  var artQuickTrampolineParsers = {
    ia32: parseArtQuickTrampolineX86,
    x64: parseArtQuickTrampolineX86,
    arm: parseArtQuickTrampolineArm,
    arm64: parseArtQuickTrampolineArm64
  };
  function getArtQuickEntrypointFromTrampoline(trampoline, vm3) {
    let address;
    vm3.perform((env) => {
      const thread = getArtThreadFromEnv(env);
      const tryParse = artQuickTrampolineParsers[Process.arch];
      const insn = Instruction.parse(trampoline);
      const offset = tryParse(insn);
      if (offset !== null) {
        address = thread.add(offset).readPointer();
      } else {
        address = trampoline;
      }
    });
    return address;
  }
  function parseArtQuickTrampolineX86(insn) {
    if (insn.mnemonic === "jmp") {
      return insn.operands[0].value.disp;
    }
    return null;
  }
  function parseArtQuickTrampolineArm(insn) {
    if (insn.mnemonic === "ldr.w") {
      return insn.operands[1].value.disp;
    }
    return null;
  }
  function parseArtQuickTrampolineArm64(insn) {
    if (insn.mnemonic === "ldr") {
      return insn.operands[1].value.disp;
    }
    return null;
  }
  function getArtThreadFromEnv(env) {
    return env.handle.add(pointerSize5).readPointer();
  }
  function _getAndroidVersion() {
    return getAndroidSystemProperty("ro.build.version.release");
  }
  function _getAndroidCodename() {
    return getAndroidSystemProperty("ro.build.version.codename");
  }
  function _getAndroidApiLevel() {
    return parseInt(getAndroidSystemProperty("ro.build.version.sdk"), 10);
  }
  function _getArtApexVersion() {
    try {
      const mountInfo = File.readAllText("/proc/self/mountinfo");
      let artSource = null;
      const sourceVersions = /* @__PURE__ */ new Map();
      for (const line of mountInfo.trimEnd().split("\n")) {
        const elements = line.split(" ");
        const mountRoot = elements[4];
        if (!mountRoot.startsWith("/apex/com.android.art")) {
          continue;
        }
        const mountSource = elements[10];
        if (mountRoot.includes("@")) {
          sourceVersions.set(mountSource, mountRoot.split("@")[1]);
        } else {
          artSource = mountSource;
        }
      }
      const strVersion = sourceVersions.get(artSource);
      return strVersion !== void 0 ? parseInt(strVersion) : computeArtApexVersionFromApiLevel();
    } catch {
      return computeArtApexVersionFromApiLevel();
    }
  }
  function computeArtApexVersionFromApiLevel() {
    return getAndroidApiLevel() * 1e7;
  }
  var systemPropertyGet = null;
  var PROP_VALUE_MAX = 92;
  function getAndroidSystemProperty(name) {
    if (systemPropertyGet === null) {
      systemPropertyGet = new NativeFunction(
        Process.getModuleByName("libc.so").getExportByName("__system_property_get"),
        "int",
        ["pointer", "pointer"],
        nativeFunctionOptions3
      );
    }
    const buf = Memory.alloc(PROP_VALUE_MAX);
    systemPropertyGet(Memory.allocUtf8String(name), buf);
    return buf.readUtf8String();
  }
  function withRunnableArtThread(vm3, env, fn) {
    const perform = getArtThreadStateTransitionImpl(vm3, env);
    const id = getArtThreadFromEnv(env).toString();
    artThreadStateTransitions[id] = fn;
    perform(env.handle);
    if (artThreadStateTransitions[id] !== void 0) {
      delete artThreadStateTransitions[id];
      throw new Error("Unable to perform state transition; please file a bug");
    }
  }
  function _getArtThreadStateTransitionImpl(vm3, env) {
    const callback = new NativeCallback(onThreadStateTransitionComplete, "void", ["pointer"]);
    return makeArtThreadStateTransitionImpl(vm3, env, callback);
  }
  function onThreadStateTransitionComplete(thread) {
    const id = thread.toString();
    const fn = artThreadStateTransitions[id];
    delete artThreadStateTransitions[id];
    fn(thread);
  }
  function withAllArtThreadsSuspended(fn) {
    const api2 = getApi();
    const threadList = api2.artThreadList;
    const longSuspend = false;
    api2["art::ThreadList::SuspendAll"](threadList, Memory.allocUtf8String("frida"), longSuspend ? 1 : 0);
    try {
      fn();
    } finally {
      api2["art::ThreadList::ResumeAll"](threadList);
    }
  }
  var ArtClassVisitor = class {
    constructor(visit) {
      const visitor = Memory.alloc(4 * pointerSize5);
      const vtable2 = visitor.add(pointerSize5);
      visitor.writePointer(vtable2);
      const onVisit = new NativeCallback((self2, klass) => {
        return visit(klass) === true ? 1 : 0;
      }, "bool", ["pointer", "pointer"]);
      vtable2.add(2 * pointerSize5).writePointer(onVisit);
      this.handle = visitor;
      this._onVisit = onVisit;
    }
  };
  function makeArtClassVisitor(visit) {
    const api2 = getApi();
    if (api2["art::ClassLinker::VisitClasses"] instanceof NativeFunction) {
      return new ArtClassVisitor(visit);
    }
    return new NativeCallback((klass) => {
      return visit(klass) === true ? 1 : 0;
    }, "bool", ["pointer", "pointer"]);
  }
  var ArtClassLoaderVisitor = class {
    constructor(visit) {
      const visitor = Memory.alloc(4 * pointerSize5);
      const vtable2 = visitor.add(pointerSize5);
      visitor.writePointer(vtable2);
      const onVisit = new NativeCallback((self2, klass) => {
        visit(klass);
      }, "void", ["pointer", "pointer"]);
      vtable2.add(2 * pointerSize5).writePointer(onVisit);
      this.handle = visitor;
      this._onVisit = onVisit;
    }
  };
  function makeArtClassLoaderVisitor(visit) {
    return new ArtClassLoaderVisitor(visit);
  }
  var WalkKind = {
    "include-inlined-frames": 0,
    "skip-inlined-frames": 1
  };
  var ArtStackVisitor = class {
    constructor(thread, context, walkKind, numFrames = 0, checkSuspended = true) {
      const api2 = getApi();
      const baseSize = 512;
      const vtableSize = 3 * pointerSize5;
      const visitor = Memory.alloc(baseSize + vtableSize);
      api2["art::StackVisitor::StackVisitor"](
        visitor,
        thread,
        context,
        WalkKind[walkKind],
        numFrames,
        checkSuspended ? 1 : 0
      );
      const vtable2 = visitor.add(baseSize);
      visitor.writePointer(vtable2);
      const onVisitFrame = new NativeCallback(this._visitFrame.bind(this), "bool", ["pointer"]);
      vtable2.add(2 * pointerSize5).writePointer(onVisitFrame);
      this.handle = visitor;
      this._onVisitFrame = onVisitFrame;
      const curShadowFrame = visitor.add(pointerSize5 === 4 ? 12 : 24);
      this._curShadowFrame = curShadowFrame;
      this._curQuickFrame = curShadowFrame.add(pointerSize5);
      this._curQuickFramePc = curShadowFrame.add(2 * pointerSize5);
      this._curOatQuickMethodHeader = curShadowFrame.add(3 * pointerSize5);
      this._getMethodImpl = api2["art::StackVisitor::GetMethod"];
      this._descLocImpl = api2["art::StackVisitor::DescribeLocation"];
      this._getCQFIImpl = api2["art::StackVisitor::GetCurrentQuickFrameInfo"];
    }
    walkStack(includeTransitions = false) {
      getApi()["art::StackVisitor::WalkStack"](this.handle, includeTransitions ? 1 : 0);
    }
    _visitFrame() {
      return this.visitFrame() ? 1 : 0;
    }
    visitFrame() {
      throw new Error("Subclass must implement visitFrame");
    }
    getMethod() {
      const methodHandle = this._getMethodImpl(this.handle);
      if (methodHandle.isNull()) {
        return null;
      }
      return new ArtMethod(methodHandle);
    }
    getCurrentQuickFramePc() {
      return this._curQuickFramePc.readPointer();
    }
    getCurrentQuickFrame() {
      return this._curQuickFrame.readPointer();
    }
    getCurrentShadowFrame() {
      return this._curShadowFrame.readPointer();
    }
    describeLocation() {
      const result = new StdString();
      this._descLocImpl(result, this.handle);
      return result.disposeToString();
    }
    getCurrentOatQuickMethodHeader() {
      return this._curOatQuickMethodHeader.readPointer();
    }
    getCurrentQuickFrameInfo() {
      return this._getCQFIImpl(this.handle);
    }
  };
  var ArtMethod = class {
    constructor(handle) {
      this.handle = handle;
    }
    prettyMethod(withSignature = true) {
      const result = new StdString();
      getApi()["art::ArtMethod::PrettyMethod"](result, this.handle, withSignature ? 1 : 0);
      return result.disposeToString();
    }
    toString() {
      return `ArtMethod(handle=${this.handle})`;
    }
  };
  function makeArtQuickFrameInfoGetter(impl) {
    return function(self2) {
      const result = Memory.alloc(12);
      getArtQuickFrameInfoGetterThunk(impl)(result, self2);
      return {
        frameSizeInBytes: result.readU32(),
        coreSpillMask: result.add(4).readU32(),
        fpSpillMask: result.add(8).readU32()
      };
    };
  }
  function _getArtQuickFrameInfoGetterThunk(impl) {
    let thunk = NULL;
    switch (Process.arch) {
      case "ia32":
        thunk = makeThunk(32, (writer) => {
          writer.putMovRegRegOffsetPtr("ecx", "esp", 4);
          writer.putMovRegRegOffsetPtr("edx", "esp", 8);
          writer.putCallAddressWithArguments(impl, ["ecx", "edx"]);
          writer.putMovRegReg("esp", "ebp");
          writer.putPopReg("ebp");
          writer.putRet();
        });
        break;
      case "x64":
        thunk = makeThunk(32, (writer) => {
          writer.putPushReg("rdi");
          writer.putCallAddressWithArguments(impl, ["rsi"]);
          writer.putPopReg("rdi");
          writer.putMovRegPtrReg("rdi", "rax");
          writer.putMovRegOffsetPtrReg("rdi", 8, "edx");
          writer.putRet();
        });
        break;
      case "arm":
        thunk = makeThunk(16, (writer) => {
          writer.putCallAddressWithArguments(impl, ["r0", "r1"]);
          writer.putPopRegs(["r0", "lr"]);
          writer.putMovRegReg("pc", "lr");
        });
        break;
      case "arm64":
        thunk = makeThunk(64, (writer) => {
          writer.putPushRegReg("x0", "lr");
          writer.putCallAddressWithArguments(impl, ["x1"]);
          writer.putPopRegReg("x2", "lr");
          writer.putStrRegRegOffset("x0", "x2", 0);
          writer.putStrRegRegOffset("w1", "x2", 8);
          writer.putRet();
        });
        break;
    }
    return new NativeFunction(thunk, "void", ["pointer", "pointer"], nativeFunctionOptions3);
  }
  var thunkRelocators = {
    ia32: globalThis.X86Relocator,
    x64: globalThis.X86Relocator,
    arm: globalThis.ThumbRelocator,
    arm64: globalThis.Arm64Relocator
  };
  var thunkWriters = {
    ia32: globalThis.X86Writer,
    x64: globalThis.X86Writer,
    arm: globalThis.ThumbWriter,
    arm64: globalThis.Arm64Writer
  };
  function makeThunk(size, write3) {
    if (thunkPage === null) {
      thunkPage = Memory.alloc(Process.pageSize);
    }
    const thunk = thunkPage.add(thunkOffset);
    const arch = Process.arch;
    const Writer = thunkWriters[arch];
    Memory.patchCode(thunk, size, (code2) => {
      const writer = new Writer(code2, { pc: thunk });
      write3(writer);
      writer.flush();
      if (writer.offset > size) {
        throw new Error(`Wrote ${writer.offset}, exceeding maximum of ${size}`);
      }
    });
    thunkOffset += size;
    return arch === "arm" ? thunk.or(1) : thunk;
  }
  function notifyArtMethodHooked(method, vm3) {
    ensureArtKnowsHowToHandleMethodInstrumentation(vm3);
    ensureArtKnowsHowToHandleReplacementMethods(vm3);
  }
  function makeArtController(api2, vm3) {
    const threadOffsets = getArtThreadSpec(vm3).offset;
    const managedStackOffsets = getArtManagedStackSpec().offset;
    const code2 = `
#include <gum/guminterceptor.h>

extern GMutex lock;
extern GHashTable * methods;
extern GHashTable * replacements;
extern gpointer last_seen_art_method;

extern gpointer get_oat_quick_method_header_impl (gpointer method, gpointer pc);

void
init (void)
{
  g_mutex_init (&lock);
  methods = g_hash_table_new_full (NULL, NULL, NULL, NULL);
  replacements = g_hash_table_new_full (NULL, NULL, NULL, NULL);
}

void
finalize (void)
{
  g_hash_table_unref (replacements);
  g_hash_table_unref (methods);
  g_mutex_clear (&lock);
}

gboolean
is_replacement_method (gpointer method)
{
  gboolean is_replacement;

  g_mutex_lock (&lock);

  is_replacement = g_hash_table_contains (replacements, method);

  g_mutex_unlock (&lock);

  return is_replacement;
}

gpointer
get_replacement_method (gpointer original_method)
{
  gpointer replacement_method;

  g_mutex_lock (&lock);

  replacement_method = g_hash_table_lookup (methods, original_method);

  g_mutex_unlock (&lock);

  return replacement_method;
}

void
set_replacement_method (gpointer original_method,
                        gpointer replacement_method)
{
  g_mutex_lock (&lock);

  g_hash_table_insert (methods, original_method, replacement_method);
  g_hash_table_insert (replacements, replacement_method, original_method);

  g_mutex_unlock (&lock);
}

void
synchronize_replacement_methods (guint quick_code_offset,
                                 void * nterp_entrypoint,
                                 void * quick_to_interpreter_bridge)
{
  GHashTableIter iter;
  gpointer hooked_method, replacement_method;

  g_mutex_lock (&lock);

  g_hash_table_iter_init (&iter, methods);
  while (g_hash_table_iter_next (&iter, &hooked_method, &replacement_method))
  {
    void ** quick_code;

    *((uint32_t *) replacement_method) = *((uint32_t *) hooked_method);

    quick_code = hooked_method + quick_code_offset;
    if (*quick_code == nterp_entrypoint)
      *quick_code = quick_to_interpreter_bridge;
  }

  g_mutex_unlock (&lock);
}

void
delete_replacement_method (gpointer original_method)
{
  gpointer replacement_method;

  g_mutex_lock (&lock);

  replacement_method = g_hash_table_lookup (methods, original_method);
  if (replacement_method != NULL)
  {
    g_hash_table_remove (methods, original_method);
    g_hash_table_remove (replacements, replacement_method);
  }

  g_mutex_unlock (&lock);
}

gpointer
translate_method (gpointer method)
{
  gpointer translated_method;

  g_mutex_lock (&lock);

  translated_method = g_hash_table_lookup (replacements, method);

  g_mutex_unlock (&lock);

  return (translated_method != NULL) ? translated_method : method;
}

gpointer
find_replacement_method_from_quick_code (gpointer method,
                                         gpointer thread)
{
  gpointer replacement_method;
  gpointer managed_stack;
  gpointer top_quick_frame;
  gpointer link_managed_stack;
  gpointer * link_top_quick_frame;

  replacement_method = get_replacement_method (method);
  if (replacement_method == NULL)
    return NULL;

  /*
   * Stack check.
   *
   * Return NULL to indicate that the original method should be invoked, otherwise
   * return a pointer to the replacement ArtMethod.
   *
   * If the caller is our own JNI replacement stub, then a stack transition must
   * have been pushed onto the current thread's linked list.
   *
   * Therefore, we invoke the original method if the following conditions are met:
   *   1- The current managed stack is empty.
   *   2- The ArtMethod * inside the linked managed stack's top quick frame is the
   *      same as our replacement.
   */
  managed_stack = thread + ${threadOffsets.managedStack};
  top_quick_frame = *((gpointer *) (managed_stack + ${managedStackOffsets.topQuickFrame}));
  if (top_quick_frame != NULL)
    return replacement_method;

  link_managed_stack = *((gpointer *) (managed_stack + ${managedStackOffsets.link}));
  if (link_managed_stack == NULL)
    return replacement_method;

  link_top_quick_frame = GSIZE_TO_POINTER (*((gsize *) (link_managed_stack + ${managedStackOffsets.topQuickFrame})) & ~((gsize) 1));
  if (link_top_quick_frame == NULL || *link_top_quick_frame != replacement_method)
    return replacement_method;

  return NULL;
}

void
on_interpreter_do_call (GumInvocationContext * ic)
{
  gpointer method, replacement_method;

  method = gum_invocation_context_get_nth_argument (ic, 0);

  replacement_method = get_replacement_method (method);
  if (replacement_method != NULL)
    gum_invocation_context_replace_nth_argument (ic, 0, replacement_method);
}

gpointer
on_art_method_get_oat_quick_method_header (gpointer method,
                                           gpointer pc)
{
  if (is_replacement_method (method))
    return NULL;

  return get_oat_quick_method_header_impl (method, pc);
}

void
on_art_method_pretty_method (GumInvocationContext * ic)
{
  const guint this_arg_index = ${Process.arch === "arm64" ? 0 : 1};
  gpointer method;

  method = gum_invocation_context_get_nth_argument (ic, this_arg_index);
  if (method == NULL)
    gum_invocation_context_replace_nth_argument (ic, this_arg_index, last_seen_art_method);
  else
    last_seen_art_method = method;
}

void
on_leave_gc_concurrent_copying_copying_phase (GumInvocationContext * ic)
{
  GHashTableIter iter;
  gpointer hooked_method, replacement_method;

  g_mutex_lock (&lock);

  g_hash_table_iter_init (&iter, methods);
  while (g_hash_table_iter_next (&iter, &hooked_method, &replacement_method))
    *((uint32_t *) replacement_method) = *((uint32_t *) hooked_method);

  g_mutex_unlock (&lock);
}
`;
    const lockSize = 8;
    const methodsSize = pointerSize5;
    const replacementsSize = pointerSize5;
    const lastSeenArtMethodSize = pointerSize5;
    const data = Memory.alloc(lockSize + methodsSize + replacementsSize + lastSeenArtMethodSize);
    const lock = data;
    const methods = lock.add(lockSize);
    const replacements = methods.add(methodsSize);
    const lastSeenArtMethod = replacements.add(replacementsSize);
    const getOatQuickMethodHeaderImpl = api2.find(pointerSize5 === 4 ? "_ZN3art9ArtMethod23GetOatQuickMethodHeaderEj" : "_ZN3art9ArtMethod23GetOatQuickMethodHeaderEm");
    const cm2 = new CModule(code2, {
      lock,
      methods,
      replacements,
      last_seen_art_method: lastSeenArtMethod,
      get_oat_quick_method_header_impl: getOatQuickMethodHeaderImpl ?? ptr("0xdeadbeef")
    });
    const fastOptions = { exceptions: "propagate", scheduling: "exclusive" };
    return {
      handle: cm2,
      replacedMethods: {
        isReplacement: new NativeFunction(cm2.is_replacement_method, "bool", ["pointer"], fastOptions),
        get: new NativeFunction(cm2.get_replacement_method, "pointer", ["pointer"], fastOptions),
        set: new NativeFunction(cm2.set_replacement_method, "void", ["pointer", "pointer"], fastOptions),
        synchronize: new NativeFunction(cm2.synchronize_replacement_methods, "void", ["uint", "pointer", "pointer"], fastOptions),
        delete: new NativeFunction(cm2.delete_replacement_method, "void", ["pointer"], fastOptions),
        translate: new NativeFunction(cm2.translate_method, "pointer", ["pointer"], fastOptions),
        findReplacementFromQuickCode: cm2.find_replacement_method_from_quick_code
      },
      getOatQuickMethodHeaderImpl,
      hooks: {
        Interpreter: {
          doCall: cm2.on_interpreter_do_call
        },
        ArtMethod: {
          getOatQuickMethodHeader: cm2.on_art_method_get_oat_quick_method_header,
          prettyMethod: cm2.on_art_method_pretty_method
        },
        Gc: {
          copyingPhase: {
            onLeave: cm2.on_leave_gc_concurrent_copying_copying_phase
          },
          runFlip: {
            onEnter: cm2.on_leave_gc_concurrent_copying_copying_phase
          }
        }
      }
    };
  }
  function ensureArtKnowsHowToHandleMethodInstrumentation(vm3) {
    if (taughtArtAboutMethodInstrumentation) {
      return;
    }
    taughtArtAboutMethodInstrumentation = true;
    instrumentArtQuickEntrypoints(vm3);
    instrumentArtMethodInvocationFromInterpreter();
    instrumentArtGarbageCollection();
    instrumentArtFixupStaticTrampolines();
  }
  function instrumentArtQuickEntrypoints(vm3) {
    const api2 = getApi();
    const quickEntrypoints = [
      api2.artQuickGenericJniTrampoline,
      api2.artQuickToInterpreterBridge,
      api2.artQuickResolutionTrampoline
    ];
    quickEntrypoints.forEach((entrypoint) => {
      Memory.protect(entrypoint, 32, "rwx");
      const interceptor = new ArtQuickCodeInterceptor(entrypoint);
      interceptor.activate(vm3);
      artQuickInterceptors.push(interceptor);
    });
  }
  function instrumentArtMethodInvocationFromInterpreter() {
    const api2 = getApi();
    const apiLevel = getAndroidApiLevel();
    const { isApiLevel34OrApexEquivalent } = api2;
    let artInterpreterDoCallExportRegex;
    if (apiLevel <= 22) {
      artInterpreterDoCallExportRegex = /^_ZN3art11interpreter6DoCallILb[0-1]ELb[0-1]EEEbPNS_6mirror9ArtMethodEPNS_6ThreadERNS_11ShadowFrameEPKNS_11InstructionEtPNS_6JValueE$/;
    } else if (apiLevel <= 33 && !isApiLevel34OrApexEquivalent) {
      artInterpreterDoCallExportRegex = /^_ZN3art11interpreter6DoCallILb[0-1]ELb[0-1]EEEbPNS_9ArtMethodEPNS_6ThreadERNS_11ShadowFrameEPKNS_11InstructionEtPNS_6JValueE$/;
    } else if (isApiLevel34OrApexEquivalent) {
      artInterpreterDoCallExportRegex = /^_ZN3art11interpreter6DoCallILb[0-1]EEEbPNS_9ArtMethodEPNS_6ThreadERNS_11ShadowFrameEPKNS_11InstructionEtbPNS_6JValueE$/;
    } else {
      throw new Error("Unable to find method invocation in ART; please file a bug");
    }
    const art = api2.module;
    const entries = [...art.enumerateExports(), ...art.enumerateSymbols()].filter((entry) => artInterpreterDoCallExportRegex.test(entry.name));
    if (entries.length === 0) {
      throw new Error("Unable to find method invocation in ART; please file a bug");
    }
    for (const entry of entries) {
      Interceptor.attach(entry.address, artController.hooks.Interpreter.doCall);
    }
  }
  function instrumentArtGarbageCollection() {
    const api2 = getApi();
    const art = api2.module;
    const gc = art.findSymbolByName("_ZN3art2gc4Heap22CollectGarbageInternalENS0_9collector6GcTypeENS0_7GcCauseEbj");
    if (gc === null) {
      return;
    }
    const { artNterpEntryPoint, artQuickToInterpreterBridge } = api2;
    const quickCodeOffset = getArtMethodSpec(api2.vm).offset.quickCode;
    Interceptor.attach(gc, {
      onLeave() {
        artController.replacedMethods.synchronize(quickCodeOffset, artNterpEntryPoint, artQuickToInterpreterBridge);
      }
    });
  }
  function instrumentArtFixupStaticTrampolines() {
    const patterns = [
      ["_ZN3art11ClassLinker26VisiblyInitializedCallback22MarkVisiblyInitializedEPNS_6ThreadE", "e90340f8 : ff0ff0ff"],
      ["_ZN3art11ClassLinker26VisiblyInitializedCallback29AdjustThreadVisibilityCounterEPNS_6ThreadEl", "7f0f00f9 : 1ffcffff"]
    ];
    const api2 = getApi();
    const art = api2.module;
    for (const [name, pattern] of patterns) {
      const base = art.findSymbolByName(name);
      if (base === null) {
        continue;
      }
      const matches = Memory.scanSync(base, 8192, pattern);
      if (matches.length === 0) {
        return;
      }
      const { artNterpEntryPoint, artQuickToInterpreterBridge } = api2;
      const quickCodeOffset = getArtMethodSpec(api2.vm).offset.quickCode;
      Interceptor.attach(matches[0].address, function() {
        artController.replacedMethods.synchronize(quickCodeOffset, artNterpEntryPoint, artQuickToInterpreterBridge);
      });
      return;
    }
  }
  function ensureArtKnowsHowToHandleReplacementMethods(vm3) {
    if (taughtArtAboutReplacementMethods) {
      return;
    }
    taughtArtAboutReplacementMethods = true;
    if (!maybeInstrumentGetOatQuickMethodHeaderInlineCopies()) {
      const { getOatQuickMethodHeaderImpl } = artController;
      if (getOatQuickMethodHeaderImpl === null) {
        return;
      }
      try {
        Interceptor.replace(getOatQuickMethodHeaderImpl, artController.hooks.ArtMethod.getOatQuickMethodHeader);
      } catch (e2) {
      }
    }
    const apiLevel = getAndroidApiLevel();
    let copyingPhase = null;
    const api2 = getApi();
    if (apiLevel > 28) {
      copyingPhase = api2.find("_ZN3art2gc9collector17ConcurrentCopying12CopyingPhaseEv");
    } else if (apiLevel > 22) {
      copyingPhase = api2.find("_ZN3art2gc9collector17ConcurrentCopying12MarkingPhaseEv");
    }
    if (copyingPhase !== null) {
      Interceptor.attach(copyingPhase, artController.hooks.Gc.copyingPhase);
    }
    let runFlip = null;
    runFlip = api2.find("_ZN3art6Thread15RunFlipFunctionEPS0_");
    if (runFlip === null) {
      runFlip = api2.find("_ZN3art6Thread15RunFlipFunctionEPS0_b");
    }
    if (runFlip !== null) {
      Interceptor.attach(runFlip, artController.hooks.Gc.runFlip);
    }
  }
  var artGetOatQuickMethodHeaderInlinedCopyHandler = {
    arm: {
      signatures: [
        {
          pattern: [
            "b0 68",
            // ldr r0, [r6, #8]
            "01 30",
            // adds r0, #1
            "0c d0",
            // beq #0x16fcd4
            "1b 98",
            // ldr r0, [sp, #0x6c]
            ":",
            "c0 ff",
            "c0 ff",
            "00 ff",
            "00 2f"
          ],
          validateMatch: validateGetOatQuickMethodHeaderInlinedMatchArm
        },
        {
          pattern: [
            "d8 f8 08 00",
            // ldr r0, [r8, #8]
            "01 30",
            // adds r0, #1
            "0c d0",
            // beq #0x16fcd4
            "1b 98",
            // ldr r0, [sp, #0x6c]
            ":",
            "f0 ff ff 0f",
            "ff ff",
            "00 ff",
            "00 2f"
          ],
          validateMatch: validateGetOatQuickMethodHeaderInlinedMatchArm
        },
        {
          pattern: [
            "b0 68",
            // ldr r0, [r6, #8]
            "01 30",
            // adds r0, #1
            "40 f0 c3 80",
            // bne #0x203bf0
            "00 25",
            // movs r5, #0
            ":",
            "c0 ff",
            "c0 ff",
            "c0 fb 00 d0",
            "ff f8"
          ],
          validateMatch: validateGetOatQuickMethodHeaderInlinedMatchArm
        }
      ],
      instrument: instrumentGetOatQuickMethodHeaderInlinedCopyArm
    },
    arm64: {
      signatures: [
        {
          pattern: [
            /* e8 */
            "0a 40 b9",
            // ldr w8, [x23, #0x8]
            "1f 05 00 31",
            // cmn w8, #0x1
            "40 01 00 54",
            // b.eq 0x2e4204
            "88 39 00 f0",
            // adrp x8, 0xa17000
            ":",
            /* 00 */
            "fc ff ff",
            "1f fc ff ff",
            "1f 00 00 ff",
            "00 00 00 9f"
          ],
          offset: 1,
          validateMatch: validateGetOatQuickMethodHeaderInlinedMatchArm64
        },
        {
          pattern: [
            /* e8 */
            "0a 40 b9",
            // ldr w8, [x?, #0x8]
            "1f 05 00 31",
            // cmn w8, #0x1
            "40 01 00 54",
            // b.eq <target>
            "00 0e 40 f9",
            // ldr x?, [x?, #0x18]
            ":",
            /* 00 */
            "fc ff ff",
            "1f fc ff ff",
            "1f 00 00 ff",
            "00 fc ff ff"
          ],
          offset: 1,
          validateMatch: validateGetOatQuickMethodHeaderInlinedMatchArm64
        },
        {
          pattern: [
            /* e8 */
            "0a 40 b9",
            // ldr w8, [x23, #0x8]
            "1f 05 00 31",
            // cmn w8, #0x1
            "01 34 00 54",
            // b.ne 0x3d8e50
            "e0 03 1f aa",
            // mov x0, xzr
            ":",
            /* 00 */
            "fc ff ff",
            "1f fc ff ff",
            "1f 00 00 ff",
            "e0 ff ff ff"
          ],
          offset: 1,
          validateMatch: validateGetOatQuickMethodHeaderInlinedMatchArm64
        }
      ],
      instrument: instrumentGetOatQuickMethodHeaderInlinedCopyArm64
    }
  };
  function validateGetOatQuickMethodHeaderInlinedMatchArm({ address, size }) {
    const ldr = Instruction.parse(address.or(1));
    const [ldrDst, ldrSrc] = ldr.operands;
    const methodReg = ldrSrc.value.base;
    const scratchReg = ldrDst.value;
    const branch = Instruction.parse(ldr.next.add(2));
    const targetWhenTrue = ptr(branch.operands[0].value);
    const targetWhenFalse = branch.address.add(branch.size);
    let targetWhenRegularMethod, targetWhenRuntimeMethod;
    if (branch.mnemonic === "beq") {
      targetWhenRegularMethod = targetWhenFalse;
      targetWhenRuntimeMethod = targetWhenTrue;
    } else {
      targetWhenRegularMethod = targetWhenTrue;
      targetWhenRuntimeMethod = targetWhenFalse;
    }
    return parseInstructionsAt(targetWhenRegularMethod.or(1), tryParse, { limit: 3 });
    function tryParse(insn) {
      const { mnemonic } = insn;
      if (!(mnemonic === "ldr" || mnemonic === "ldr.w")) {
        return null;
      }
      const { base, disp } = insn.operands[1].value;
      if (!(base === methodReg && disp === 20)) {
        return null;
      }
      return {
        methodReg,
        scratchReg,
        target: {
          whenTrue: targetWhenTrue,
          whenRegularMethod: targetWhenRegularMethod,
          whenRuntimeMethod: targetWhenRuntimeMethod
        }
      };
    }
  }
  function validateGetOatQuickMethodHeaderInlinedMatchArm64({ address, size }) {
    const [ldrDst, ldrSrc] = Instruction.parse(address).operands;
    const methodReg = ldrSrc.value.base;
    const scratchReg = "x" + ldrDst.value.substring(1);
    const branch = Instruction.parse(address.add(8));
    const targetWhenTrue = ptr(branch.operands[0].value);
    const targetWhenFalse = address.add(12);
    let targetWhenRegularMethod, targetWhenRuntimeMethod;
    if (branch.mnemonic === "b.eq") {
      targetWhenRegularMethod = targetWhenFalse;
      targetWhenRuntimeMethod = targetWhenTrue;
    } else {
      targetWhenRegularMethod = targetWhenTrue;
      targetWhenRuntimeMethod = targetWhenFalse;
    }
    return parseInstructionsAt(targetWhenRegularMethod, tryParse, { limit: 3 });
    function tryParse(insn) {
      if (insn.mnemonic !== "ldr") {
        return null;
      }
      const { base, disp } = insn.operands[1].value;
      if (!(base === methodReg && disp === 24)) {
        return null;
      }
      return {
        methodReg,
        scratchReg,
        target: {
          whenTrue: targetWhenTrue,
          whenRegularMethod: targetWhenRegularMethod,
          whenRuntimeMethod: targetWhenRuntimeMethod
        }
      };
    }
  }
  function maybeInstrumentGetOatQuickMethodHeaderInlineCopies() {
    if (getAndroidApiLevel() < 31) {
      return false;
    }
    const handler = artGetOatQuickMethodHeaderInlinedCopyHandler[Process.arch];
    if (handler === void 0) {
      return false;
    }
    const signatures = handler.signatures.map(({ pattern, offset = 0, validateMatch = returnEmptyObject }) => {
      return {
        pattern: new MatchPattern(pattern.join("")),
        offset,
        validateMatch
      };
    });
    const impls = [];
    for (const { base, size } of getApi().module.enumerateRanges("--x")) {
      for (const { pattern, offset, validateMatch } of signatures) {
        const matches = Memory.scanSync(base, size, pattern).map(({ address, size: size2 }) => {
          return { address: address.sub(offset), size: size2 + offset };
        }).filter((match) => {
          const validationResult = validateMatch(match);
          if (validationResult === null) {
            return false;
          }
          match.validationResult = validationResult;
          return true;
        });
        impls.push(...matches);
      }
    }
    if (impls.length === 0) {
      return false;
    }
    impls.forEach(handler.instrument);
    return true;
  }
  function returnEmptyObject() {
    return {};
  }
  var InlineHook = class {
    constructor(address, size, trampoline) {
      this.address = address;
      this.size = size;
      this.originalCode = address.readByteArray(size);
      this.trampoline = trampoline;
    }
    revert() {
      Memory.patchCode(this.address, this.size, (code2) => {
        code2.writeByteArray(this.originalCode);
      });
    }
  };
  function instrumentGetOatQuickMethodHeaderInlinedCopyArm({ address, size, validationResult }) {
    const { methodReg, target } = validationResult;
    const trampoline = Memory.alloc(Process.pageSize);
    let redirectCapacity = size;
    Memory.patchCode(trampoline, 256, (code2) => {
      const writer = new ThumbWriter(code2, { pc: trampoline });
      const relocator = new ThumbRelocator(address, writer);
      for (let i2 = 0; i2 !== 2; i2++) {
        relocator.readOne();
      }
      relocator.writeAll();
      relocator.readOne();
      relocator.skipOne();
      writer.putBCondLabel("eq", "runtime_or_replacement_method");
      const vpushFpRegs = [45, 237, 16, 10];
      writer.putBytes(vpushFpRegs);
      const savedRegs = ["r0", "r1", "r2", "r3"];
      writer.putPushRegs(savedRegs);
      writer.putCallAddressWithArguments(artController.replacedMethods.isReplacement, [methodReg]);
      writer.putCmpRegImm("r0", 0);
      writer.putPopRegs(savedRegs);
      const vpopFpRegs = [189, 236, 16, 10];
      writer.putBytes(vpopFpRegs);
      writer.putBCondLabel("ne", "runtime_or_replacement_method");
      writer.putBLabel("regular_method");
      relocator.readOne();
      const tailIsRegular = relocator.input.address.equals(target.whenRegularMethod);
      writer.putLabel(tailIsRegular ? "regular_method" : "runtime_or_replacement_method");
      relocator.writeOne();
      while (redirectCapacity < 10) {
        const offset = relocator.readOne();
        if (offset === 0) {
          redirectCapacity = 10;
          break;
        }
        redirectCapacity = offset;
      }
      relocator.writeAll();
      writer.putBranchAddress(address.add(redirectCapacity + 1));
      writer.putLabel(tailIsRegular ? "runtime_or_replacement_method" : "regular_method");
      writer.putBranchAddress(target.whenTrue);
      writer.flush();
    });
    inlineHooks.push(new InlineHook(address, redirectCapacity, trampoline));
    Memory.patchCode(address, redirectCapacity, (code2) => {
      const writer = new ThumbWriter(code2, { pc: address });
      writer.putLdrRegAddress("pc", trampoline.or(1));
      writer.flush();
    });
  }
  function instrumentGetOatQuickMethodHeaderInlinedCopyArm64({ address, size, validationResult }) {
    const { methodReg, scratchReg, target } = validationResult;
    const trampoline = Memory.alloc(Process.pageSize);
    Memory.patchCode(trampoline, 256, (code2) => {
      const writer = new Arm64Writer(code2, { pc: trampoline });
      const relocator = new Arm64Relocator(address, writer);
      for (let i2 = 0; i2 !== 2; i2++) {
        relocator.readOne();
      }
      relocator.writeAll();
      relocator.readOne();
      relocator.skipOne();
      writer.putBCondLabel("eq", "runtime_or_replacement_method");
      const savedRegs = [
        "d0",
        "d1",
        "d2",
        "d3",
        "d4",
        "d5",
        "d6",
        "d7",
        "x0",
        "x1",
        "x2",
        "x3",
        "x4",
        "x5",
        "x6",
        "x7",
        "x8",
        "x9",
        "x10",
        "x11",
        "x12",
        "x13",
        "x14",
        "x15",
        "x16",
        "x17"
      ];
      const numSavedRegs = savedRegs.length;
      for (let i2 = 0; i2 !== numSavedRegs; i2 += 2) {
        writer.putPushRegReg(savedRegs[i2], savedRegs[i2 + 1]);
      }
      writer.putCallAddressWithArguments(artController.replacedMethods.isReplacement, [methodReg]);
      writer.putCmpRegReg("x0", "xzr");
      for (let i2 = numSavedRegs - 2; i2 >= 0; i2 -= 2) {
        writer.putPopRegReg(savedRegs[i2], savedRegs[i2 + 1]);
      }
      writer.putBCondLabel("ne", "runtime_or_replacement_method");
      writer.putBLabel("regular_method");
      relocator.readOne();
      const tailInstruction = relocator.input;
      const tailIsRegular = tailInstruction.address.equals(target.whenRegularMethod);
      writer.putLabel(tailIsRegular ? "regular_method" : "runtime_or_replacement_method");
      relocator.writeOne();
      writer.putBranchAddress(tailInstruction.next);
      writer.putLabel(tailIsRegular ? "runtime_or_replacement_method" : "regular_method");
      writer.putBranchAddress(target.whenTrue);
      writer.flush();
    });
    inlineHooks.push(new InlineHook(address, size, trampoline));
    Memory.patchCode(address, size, (code2) => {
      const writer = new Arm64Writer(code2, { pc: address });
      writer.putLdrRegAddress(scratchReg, trampoline);
      writer.putBrReg(scratchReg);
      writer.flush();
    });
  }
  function makeMethodMangler(methodId) {
    return new MethodMangler(methodId);
  }
  function translateMethod(methodId) {
    return artController.replacedMethods.translate(methodId);
  }
  function backtrace(vm3, options = {}) {
    const { limit = 16 } = options;
    const env = vm3.getEnv();
    if (backtraceModule === null) {
      backtraceModule = makeBacktraceModule(vm3, env);
    }
    return backtraceModule.backtrace(env, limit);
  }
  function makeBacktraceModule(vm3, env) {
    const api2 = getApi();
    const performImpl = Memory.alloc(Process.pointerSize);
    const cm2 = new CModule(`
#include <glib.h>
#include <stdbool.h>
#include <string.h>
#include <gum/gumtls.h>
#include <json-glib/json-glib.h>

typedef struct _ArtBacktrace ArtBacktrace;
typedef struct _ArtStackFrame ArtStackFrame;

typedef struct _ArtStackVisitor ArtStackVisitor;
typedef struct _ArtStackVisitorVTable ArtStackVisitorVTable;

typedef struct _ArtClass ArtClass;
typedef struct _ArtMethod ArtMethod;
typedef struct _ArtThread ArtThread;
typedef struct _ArtContext ArtContext;

typedef struct _JNIEnv JNIEnv;

typedef struct _StdString StdString;
typedef struct _StdTinyString StdTinyString;
typedef struct _StdLargeString StdLargeString;

typedef enum {
  STACK_WALK_INCLUDE_INLINED_FRAMES,
  STACK_WALK_SKIP_INLINED_FRAMES,
} StackWalkKind;

struct _StdTinyString
{
  guint8 unused;
  gchar data[(3 * sizeof (gpointer)) - 1];
};

struct _StdLargeString
{
  gsize capacity;
  gsize size;
  gchar * data;
};

struct _StdString
{
  union
  {
    guint8 flags;
    StdTinyString tiny;
    StdLargeString large;
  };
};

struct _ArtBacktrace
{
  GChecksum * id;
  GArray * frames;
  gchar * frames_json;
};

struct _ArtStackFrame
{
  ArtMethod * method;
  gsize dexpc;
  StdString description;
};

struct _ArtStackVisitorVTable
{
  void (* unused1) (void);
  void (* unused2) (void);
  bool (* visit) (ArtStackVisitor * visitor);
};

struct _ArtStackVisitor
{
  ArtStackVisitorVTable * vtable;

  guint8 padding[512];

  ArtStackVisitorVTable vtable_storage;

  ArtBacktrace * backtrace;
};

struct _ArtMethod
{
  guint32 declaring_class;
  guint32 access_flags;
};

extern GumTlsKey current_backtrace;

extern void (* perform_art_thread_state_transition) (JNIEnv * env);

extern ArtContext * art_make_context (ArtThread * thread);

extern void art_stack_visitor_init (ArtStackVisitor * visitor, ArtThread * thread, void * context, StackWalkKind walk_kind,
    size_t num_frames, bool check_suspended);
extern void art_stack_visitor_walk_stack (ArtStackVisitor * visitor, bool include_transitions);
extern ArtMethod * art_stack_visitor_get_method (ArtStackVisitor * visitor);
extern void art_stack_visitor_describe_location (StdString * description, ArtStackVisitor * visitor);
extern ArtMethod * translate_method (ArtMethod * method);
extern void translate_location (ArtMethod * method, guint32 pc, const gchar ** source_file, gint32 * line_number);
extern void get_class_location (StdString * result, ArtClass * klass);
extern void cxx_delete (void * mem);
extern unsigned long strtoul (const char * str, char ** endptr, int base);

static bool visit_frame (ArtStackVisitor * visitor);
static void art_stack_frame_destroy (ArtStackFrame * frame);

static void append_jni_type_name (GString * s, const gchar * name, gsize length);

static void std_string_destroy (StdString * str);
static gchar * std_string_get_data (StdString * str);

void
init (void)
{
  current_backtrace = gum_tls_key_new ();
}

void
finalize (void)
{
  gum_tls_key_free (current_backtrace);
}

ArtBacktrace *
_create (JNIEnv * env,
         guint limit)
{
  ArtBacktrace * bt;

  bt = g_new (ArtBacktrace, 1);
  bt->id = g_checksum_new (G_CHECKSUM_SHA1);
  bt->frames = (limit != 0)
      ? g_array_sized_new (FALSE, FALSE, sizeof (ArtStackFrame), limit)
      : g_array_new (FALSE, FALSE, sizeof (ArtStackFrame));
  g_array_set_clear_func (bt->frames, (GDestroyNotify) art_stack_frame_destroy);
  bt->frames_json = NULL;

  gum_tls_key_set_value (current_backtrace, bt);

  perform_art_thread_state_transition (env);

  gum_tls_key_set_value (current_backtrace, NULL);

  return bt;
}

void
_on_thread_state_transition_complete (ArtThread * thread)
{
  ArtContext * context;
  ArtStackVisitor visitor = {
    .vtable_storage = {
      .visit = visit_frame,
    },
  };

  context = art_make_context (thread);

  art_stack_visitor_init (&visitor, thread, context, STACK_WALK_SKIP_INLINED_FRAMES, 0, true);
  visitor.vtable = &visitor.vtable_storage;
  visitor.backtrace = gum_tls_key_get_value (current_backtrace);

  art_stack_visitor_walk_stack (&visitor, false);

  cxx_delete (context);
}

static bool
visit_frame (ArtStackVisitor * visitor)
{
  ArtBacktrace * bt = visitor->backtrace;
  ArtStackFrame frame;
  const gchar * description, * dexpc_part;

  frame.method = art_stack_visitor_get_method (visitor);

  art_stack_visitor_describe_location (&frame.description, visitor);

  description = std_string_get_data (&frame.description);
  if (strstr (description, " '<") != NULL)
    goto skip;

  dexpc_part = strstr (description, " at dex PC 0x");
  if (dexpc_part == NULL)
    goto skip;
  frame.dexpc = strtoul (dexpc_part + 13, NULL, 16);

  g_array_append_val (bt->frames, frame);

  g_checksum_update (bt->id, (guchar *) &frame.method, sizeof (frame.method));
  g_checksum_update (bt->id, (guchar *) &frame.dexpc, sizeof (frame.dexpc));

  return true;

skip:
  std_string_destroy (&frame.description);
  return true;
}

static void
art_stack_frame_destroy (ArtStackFrame * frame)
{
  std_string_destroy (&frame->description);
}

void
_destroy (ArtBacktrace * backtrace)
{
  g_free (backtrace->frames_json);
  g_array_free (backtrace->frames, TRUE);
  g_checksum_free (backtrace->id);
  g_free (backtrace);
}

const gchar *
_get_id (ArtBacktrace * backtrace)
{
  return g_checksum_get_string (backtrace->id);
}

const gchar *
_get_frames (ArtBacktrace * backtrace)
{
  GArray * frames = backtrace->frames;
  JsonBuilder * b;
  guint i;
  JsonNode * root;

  if (backtrace->frames_json != NULL)
    return backtrace->frames_json;

  b = json_builder_new_immutable ();

  json_builder_begin_array (b);

  for (i = 0; i != frames->len; i++)
  {
    ArtStackFrame * frame = &g_array_index (frames, ArtStackFrame, i);
    gchar * description, * ret_type, * paren_open, * paren_close, * arg_types, * token, * method_name, * class_name;
    GString * signature;
    gchar * cursor;
    ArtMethod * translated_method;
    StdString location;
    gsize dexpc;
    const gchar * source_file;
    gint32 line_number;

    description = std_string_get_data (&frame->description);

    ret_type = strchr (description, '\\'') + 1;

    paren_open = strchr (ret_type, '(');
    paren_close = strchr (paren_open, ')');
    *paren_open = '\\0';
    *paren_close = '\\0';

    arg_types = paren_open + 1;

    token = strrchr (ret_type, '.');
    *token = '\\0';

    method_name = token + 1;

    token = strrchr (ret_type, ' ');
    *token = '\\0';

    class_name = token + 1;

    signature = g_string_sized_new (128);

    append_jni_type_name (signature, class_name, method_name - class_name - 1);
    g_string_append_c (signature, ',');
    g_string_append (signature, method_name);
    g_string_append (signature, ",(");

    if (arg_types != paren_close)
    {
      for (cursor = arg_types; cursor != NULL;)
      {
        gsize length;
        gchar * next;

        token = strstr (cursor, ", ");
        if (token != NULL)
        {
          length = token - cursor;
          next = token + 2;
        }
        else
        {
          length = paren_close - cursor;
          next = NULL;
        }

        append_jni_type_name (signature, cursor, length);

        cursor = next;
      }
    }

    g_string_append_c (signature, ')');

    append_jni_type_name (signature, ret_type, class_name - ret_type - 1);

    translated_method = translate_method (frame->method);
    dexpc = (translated_method == frame->method) ? frame->dexpc : 0;

    get_class_location (&location, GSIZE_TO_POINTER (translated_method->declaring_class));

    translate_location (translated_method, dexpc, &source_file, &line_number);

    json_builder_begin_object (b);

    json_builder_set_member_name (b, "signature");
    json_builder_add_string_value (b, signature->str);

    json_builder_set_member_name (b, "origin");
    json_builder_add_string_value (b, std_string_get_data (&location));

    json_builder_set_member_name (b, "className");
    json_builder_add_string_value (b, class_name);

    json_builder_set_member_name (b, "methodName");
    json_builder_add_string_value (b, method_name);

    json_builder_set_member_name (b, "methodFlags");
    json_builder_add_int_value (b, translated_method->access_flags);

    json_builder_set_member_name (b, "fileName");
    json_builder_add_string_value (b, source_file);

    json_builder_set_member_name (b, "lineNumber");
    json_builder_add_int_value (b, line_number);

    json_builder_end_object (b);

    std_string_destroy (&location);
    g_string_free (signature, TRUE);
  }

  json_builder_end_array (b);

  root = json_builder_get_root (b);
  backtrace->frames_json = json_to_string (root, FALSE);
  json_node_unref (root);

  return backtrace->frames_json;
}

static void
append_jni_type_name (GString * s,
                      const gchar * name,
                      gsize length)
{
  gchar shorty = '\\0';
  gsize i;

  switch (name[0])
  {
    case 'b':
      if (strncmp (name, "boolean", length) == 0)
        shorty = 'Z';
      else if (strncmp (name, "byte", length) == 0)
        shorty = 'B';
      break;
    case 'c':
      if (strncmp (name, "char", length) == 0)
        shorty = 'C';
      break;
    case 'd':
      if (strncmp (name, "double", length) == 0)
        shorty = 'D';
      break;
    case 'f':
      if (strncmp (name, "float", length) == 0)
        shorty = 'F';
      break;
    case 'i':
      if (strncmp (name, "int", length) == 0)
        shorty = 'I';
      break;
    case 'l':
      if (strncmp (name, "long", length) == 0)
        shorty = 'J';
      break;
    case 's':
      if (strncmp (name, "short", length) == 0)
        shorty = 'S';
      break;
    case 'v':
      if (strncmp (name, "void", length) == 0)
        shorty = 'V';
      break;
  }

  if (shorty != '\\0')
  {
    g_string_append_c (s, shorty);

    return;
  }

  if (length > 2 && name[length - 2] == '[' && name[length - 1] == ']')
  {
    g_string_append_c (s, '[');
    append_jni_type_name (s, name, length - 2);

    return;
  }

  g_string_append_c (s, 'L');

  for (i = 0; i != length; i++)
  {
    gchar ch = name[i];
    if (ch != '.')
      g_string_append_c (s, ch);
    else
      g_string_append_c (s, '/');
  }

  g_string_append_c (s, ';');
}

static void
std_string_destroy (StdString * str)
{
  bool is_large = (str->flags & 1) != 0;
  if (is_large)
    cxx_delete (str->large.data);
}

static gchar *
std_string_get_data (StdString * str)
{
  bool is_large = (str->flags & 1) != 0;
  return is_large ? str->large.data : str->tiny.data;
}
`, {
      current_backtrace: Memory.alloc(Process.pointerSize),
      perform_art_thread_state_transition: performImpl,
      art_make_context: api2["art::Thread::GetLongJumpContext"] ?? api2["art::Context::Create"],
      art_stack_visitor_init: api2["art::StackVisitor::StackVisitor"],
      art_stack_visitor_walk_stack: api2["art::StackVisitor::WalkStack"],
      art_stack_visitor_get_method: api2["art::StackVisitor::GetMethod"],
      art_stack_visitor_describe_location: api2["art::StackVisitor::DescribeLocation"],
      translate_method: artController.replacedMethods.translate,
      translate_location: api2["art::Monitor::TranslateLocation"],
      get_class_location: api2["art::mirror::Class::GetLocation"],
      cxx_delete: api2.$delete,
      strtoul: Process.getModuleByName("libc.so").getExportByName("strtoul")
    });
    const _create = new NativeFunction(cm2._create, "pointer", ["pointer", "uint"], nativeFunctionOptions3);
    const _destroy = new NativeFunction(cm2._destroy, "void", ["pointer"], nativeFunctionOptions3);
    const fastOptions = { exceptions: "propagate", scheduling: "exclusive" };
    const _getId = new NativeFunction(cm2._get_id, "pointer", ["pointer"], fastOptions);
    const _getFrames = new NativeFunction(cm2._get_frames, "pointer", ["pointer"], fastOptions);
    const performThreadStateTransition = makeArtThreadStateTransitionImpl(vm3, env, cm2._on_thread_state_transition_complete);
    cm2._performData = performThreadStateTransition;
    performImpl.writePointer(performThreadStateTransition);
    cm2.backtrace = (env2, limit) => {
      const handle = _create(env2, limit);
      const bt2 = new Backtrace(handle);
      Script.bindWeak(bt2, destroy.bind(null, handle));
      return bt2;
    };
    function destroy(handle) {
      _destroy(handle);
    }
    cm2.getId = (handle) => {
      return _getId(handle).readUtf8String();
    };
    cm2.getFrames = (handle) => {
      return JSON.parse(_getFrames(handle).readUtf8String());
    };
    return cm2;
  }
  var Backtrace = class {
    constructor(handle) {
      this.handle = handle;
    }
    get id() {
      return backtraceModule.getId(this.handle);
    }
    get frames() {
      return backtraceModule.getFrames(this.handle);
    }
  };
  function revertGlobalPatches() {
    patchedClasses.forEach((entry) => {
      entry.vtablePtr.writePointer(entry.vtable);
      entry.vtableCountPtr.writeS32(entry.vtableCount);
    });
    patchedClasses.clear();
    for (const interceptor of artQuickInterceptors.splice(0)) {
      interceptor.deactivate();
    }
    for (const hook of inlineHooks.splice(0)) {
      hook.revert();
    }
  }
  function unwrapMethodId(methodId) {
    return unwrapGenericId(methodId, "art::jni::JniIdManager::DecodeMethodId");
  }
  function unwrapFieldId(fieldId) {
    return unwrapGenericId(fieldId, "art::jni::JniIdManager::DecodeFieldId");
  }
  function unwrapGenericId(genericId, apiMethod) {
    const api2 = getApi();
    const runtimeOffset = getArtRuntimeSpec(api2).offset;
    const jniIdManagerOffset = runtimeOffset.jniIdManager;
    const jniIdsIndirectionOffset = runtimeOffset.jniIdsIndirection;
    if (jniIdManagerOffset !== null && jniIdsIndirectionOffset !== null) {
      const runtime2 = api2.artRuntime;
      const jniIdsIndirection = runtime2.add(jniIdsIndirectionOffset).readInt();
      if (jniIdsIndirection !== kPointer) {
        const jniIdManager = runtime2.add(jniIdManagerOffset).readPointer();
        return api2[apiMethod](jniIdManager, genericId);
      }
    }
    return genericId;
  }
  var artQuickCodeReplacementTrampolineWriters = {
    ia32: writeArtQuickCodeReplacementTrampolineIA32,
    x64: writeArtQuickCodeReplacementTrampolineX64,
    arm: writeArtQuickCodeReplacementTrampolineArm,
    arm64: writeArtQuickCodeReplacementTrampolineArm64
  };
  function writeArtQuickCodeReplacementTrampolineIA32(trampoline, target, redirectSize, constraints, vm3) {
    const threadOffsets = getArtThreadSpec(vm3).offset;
    const artMethodOffsets = getArtMethodSpec(vm3).offset;
    let offset;
    Memory.patchCode(trampoline, 128, (code2) => {
      const writer = new X86Writer(code2, { pc: trampoline });
      const relocator = new X86Relocator(target, writer);
      const fxsave = [15, 174, 4, 36];
      const fxrstor = [15, 174, 12, 36];
      writer.putPushax();
      writer.putMovRegReg("ebp", "esp");
      writer.putAndRegU32("esp", 4294967280);
      writer.putSubRegImm("esp", 512);
      writer.putBytes(fxsave);
      writer.putMovRegFsU32Ptr("ebx", threadOffsets.self);
      writer.putCallAddressWithAlignedArguments(artController.replacedMethods.findReplacementFromQuickCode, ["eax", "ebx"]);
      writer.putTestRegReg("eax", "eax");
      writer.putJccShortLabel("je", "restore_registers", "no-hint");
      writer.putMovRegOffsetPtrReg("ebp", 7 * 4, "eax");
      writer.putLabel("restore_registers");
      writer.putBytes(fxrstor);
      writer.putMovRegReg("esp", "ebp");
      writer.putPopax();
      writer.putJccShortLabel("jne", "invoke_replacement", "no-hint");
      do {
        offset = relocator.readOne();
      } while (offset < redirectSize && !relocator.eoi);
      relocator.writeAll();
      if (!relocator.eoi) {
        writer.putJmpAddress(target.add(offset));
      }
      writer.putLabel("invoke_replacement");
      writer.putJmpRegOffsetPtr("eax", artMethodOffsets.quickCode);
      writer.flush();
    });
    return offset;
  }
  function writeArtQuickCodeReplacementTrampolineX64(trampoline, target, redirectSize, constraints, vm3) {
    const threadOffsets = getArtThreadSpec(vm3).offset;
    const artMethodOffsets = getArtMethodSpec(vm3).offset;
    let offset;
    Memory.patchCode(trampoline, 256, (code2) => {
      const writer = new X86Writer(code2, { pc: trampoline });
      const relocator = new X86Relocator(target, writer);
      const fxsave = [15, 174, 4, 36];
      const fxrstor = [15, 174, 12, 36];
      writer.putPushax();
      writer.putMovRegReg("rbp", "rsp");
      writer.putAndRegU32("rsp", 4294967280);
      writer.putSubRegImm("rsp", 512);
      writer.putBytes(fxsave);
      writer.putMovRegGsU32Ptr("rbx", threadOffsets.self);
      writer.putCallAddressWithAlignedArguments(artController.replacedMethods.findReplacementFromQuickCode, ["rdi", "rbx"]);
      writer.putTestRegReg("rax", "rax");
      writer.putJccShortLabel("je", "restore_registers", "no-hint");
      writer.putMovRegOffsetPtrReg("rbp", 8 * 8, "rax");
      writer.putLabel("restore_registers");
      writer.putBytes(fxrstor);
      writer.putMovRegReg("rsp", "rbp");
      writer.putPopax();
      writer.putJccShortLabel("jne", "invoke_replacement", "no-hint");
      do {
        offset = relocator.readOne();
      } while (offset < redirectSize && !relocator.eoi);
      relocator.writeAll();
      if (!relocator.eoi) {
        writer.putJmpAddress(target.add(offset));
      }
      writer.putLabel("invoke_replacement");
      writer.putJmpRegOffsetPtr("rdi", artMethodOffsets.quickCode);
      writer.flush();
    });
    return offset;
  }
  function writeArtQuickCodeReplacementTrampolineArm(trampoline, target, redirectSize, constraints, vm3) {
    const artMethodOffsets = getArtMethodSpec(vm3).offset;
    const targetAddress = target.and(THUMB_BIT_REMOVAL_MASK);
    let offset;
    Memory.patchCode(trampoline, 128, (code2) => {
      const writer = new ThumbWriter(code2, { pc: trampoline });
      const relocator = new ThumbRelocator(targetAddress, writer);
      const vpushFpRegs = [45, 237, 16, 10];
      const vpopFpRegs = [189, 236, 16, 10];
      writer.putPushRegs([
        "r1",
        "r2",
        "r3",
        "r5",
        "r6",
        "r7",
        "r8",
        "r10",
        "r11",
        "lr"
      ]);
      writer.putBytes(vpushFpRegs);
      writer.putSubRegRegImm("sp", "sp", 8);
      writer.putStrRegRegOffset("r0", "sp", 0);
      writer.putCallAddressWithArguments(artController.replacedMethods.findReplacementFromQuickCode, ["r0", "r9"]);
      writer.putCmpRegImm("r0", 0);
      writer.putBCondLabel("eq", "restore_registers");
      writer.putStrRegRegOffset("r0", "sp", 0);
      writer.putLabel("restore_registers");
      writer.putLdrRegRegOffset("r0", "sp", 0);
      writer.putAddRegRegImm("sp", "sp", 8);
      writer.putBytes(vpopFpRegs);
      writer.putPopRegs([
        "lr",
        "r11",
        "r10",
        "r8",
        "r7",
        "r6",
        "r5",
        "r3",
        "r2",
        "r1"
      ]);
      writer.putBCondLabel("ne", "invoke_replacement");
      do {
        offset = relocator.readOne();
      } while (offset < redirectSize && !relocator.eoi);
      relocator.writeAll();
      if (!relocator.eoi) {
        writer.putLdrRegAddress("pc", target.add(offset));
      }
      writer.putLabel("invoke_replacement");
      writer.putLdrRegRegOffset("pc", "r0", artMethodOffsets.quickCode);
      writer.flush();
    });
    return offset;
  }
  function writeArtQuickCodeReplacementTrampolineArm64(trampoline, target, redirectSize, { availableScratchRegs }, vm3) {
    const artMethodOffsets = getArtMethodSpec(vm3).offset;
    let offset;
    Memory.patchCode(trampoline, 256, (code2) => {
      const writer = new Arm64Writer(code2, { pc: trampoline });
      const relocator = new Arm64Relocator(target, writer);
      writer.putPushRegReg("d0", "d1");
      writer.putPushRegReg("d2", "d3");
      writer.putPushRegReg("d4", "d5");
      writer.putPushRegReg("d6", "d7");
      writer.putPushRegReg("x1", "x2");
      writer.putPushRegReg("x3", "x4");
      writer.putPushRegReg("x5", "x6");
      writer.putPushRegReg("x7", "x20");
      writer.putPushRegReg("x21", "x22");
      writer.putPushRegReg("x23", "x24");
      writer.putPushRegReg("x25", "x26");
      writer.putPushRegReg("x27", "x28");
      writer.putPushRegReg("x29", "lr");
      writer.putSubRegRegImm("sp", "sp", 16);
      writer.putStrRegRegOffset("x0", "sp", 0);
      writer.putCallAddressWithArguments(artController.replacedMethods.findReplacementFromQuickCode, ["x0", "x19"]);
      writer.putCmpRegReg("x0", "xzr");
      writer.putBCondLabel("eq", "restore_registers");
      writer.putStrRegRegOffset("x0", "sp", 0);
      writer.putLabel("restore_registers");
      writer.putLdrRegRegOffset("x0", "sp", 0);
      writer.putAddRegRegImm("sp", "sp", 16);
      writer.putPopRegReg("x29", "lr");
      writer.putPopRegReg("x27", "x28");
      writer.putPopRegReg("x25", "x26");
      writer.putPopRegReg("x23", "x24");
      writer.putPopRegReg("x21", "x22");
      writer.putPopRegReg("x7", "x20");
      writer.putPopRegReg("x5", "x6");
      writer.putPopRegReg("x3", "x4");
      writer.putPopRegReg("x1", "x2");
      writer.putPopRegReg("d6", "d7");
      writer.putPopRegReg("d4", "d5");
      writer.putPopRegReg("d2", "d3");
      writer.putPopRegReg("d0", "d1");
      writer.putBCondLabel("ne", "invoke_replacement");
      do {
        offset = relocator.readOne();
      } while (offset < redirectSize && !relocator.eoi);
      relocator.writeAll();
      if (!relocator.eoi) {
        const scratchReg = Array.from(availableScratchRegs)[0];
        writer.putLdrRegAddress(scratchReg, target.add(offset));
        writer.putBrReg(scratchReg);
      }
      writer.putLabel("invoke_replacement");
      writer.putLdrRegRegOffset("x16", "x0", artMethodOffsets.quickCode);
      writer.putBrReg("x16");
      writer.flush();
    });
    return offset;
  }
  var artQuickCodePrologueWriters = {
    ia32: writeArtQuickCodePrologueX86,
    x64: writeArtQuickCodePrologueX86,
    arm: writeArtQuickCodePrologueArm,
    arm64: writeArtQuickCodePrologueArm64
  };
  function writeArtQuickCodePrologueX86(target, trampoline, redirectSize) {
    Memory.patchCode(target, 16, (code2) => {
      const writer = new X86Writer(code2, { pc: target });
      writer.putJmpAddress(trampoline);
      writer.flush();
    });
  }
  function writeArtQuickCodePrologueArm(target, trampoline, redirectSize) {
    const targetAddress = target.and(THUMB_BIT_REMOVAL_MASK);
    Memory.patchCode(targetAddress, 16, (code2) => {
      const writer = new ThumbWriter(code2, { pc: targetAddress });
      writer.putLdrRegAddress("pc", trampoline.or(1));
      writer.flush();
    });
  }
  function writeArtQuickCodePrologueArm64(target, trampoline, redirectSize) {
    Memory.patchCode(target, 16, (code2) => {
      const writer = new Arm64Writer(code2, { pc: target });
      if (redirectSize === 16) {
        writer.putLdrRegAddress("x16", trampoline);
      } else {
        writer.putAdrpRegAddress("x16", trampoline);
      }
      writer.putBrReg("x16");
      writer.flush();
    });
  }
  var artQuickCodeHookRedirectSize = {
    ia32: 5,
    x64: 16,
    arm: 8,
    arm64: 16
  };
  var ArtQuickCodeInterceptor = class {
    constructor(quickCode) {
      this.quickCode = quickCode;
      this.quickCodeAddress = Process.arch === "arm" ? quickCode.and(THUMB_BIT_REMOVAL_MASK) : quickCode;
      this.redirectSize = 0;
      this.trampoline = null;
      this.overwrittenPrologue = null;
      this.overwrittenPrologueLength = 0;
    }
    _canRelocateCode(relocationSize, constraints) {
      const Writer = thunkWriters[Process.arch];
      const Relocator = thunkRelocators[Process.arch];
      const { quickCodeAddress } = this;
      const writer = new Writer(quickCodeAddress);
      const relocator = new Relocator(quickCodeAddress, writer);
      let offset;
      if (Process.arch === "arm64") {
        let availableScratchRegs = /* @__PURE__ */ new Set(["x16", "x17"]);
        do {
          const nextOffset = relocator.readOne();
          const nextScratchRegs = new Set(availableScratchRegs);
          const { read: read2, written } = relocator.input.regsAccessed;
          for (const regs of [read2, written]) {
            for (const reg of regs) {
              let name;
              if (reg.startsWith("w")) {
                name = "x" + reg.substring(1);
              } else {
                name = reg;
              }
              nextScratchRegs.delete(name);
            }
          }
          if (nextScratchRegs.size === 0) {
            break;
          }
          offset = nextOffset;
          availableScratchRegs = nextScratchRegs;
        } while (offset < relocationSize && !relocator.eoi);
        constraints.availableScratchRegs = availableScratchRegs;
      } else {
        do {
          offset = relocator.readOne();
        } while (offset < relocationSize && !relocator.eoi);
      }
      return offset >= relocationSize;
    }
    _allocateTrampoline() {
      if (trampolineAllocator === null) {
        const trampolineSize = pointerSize5 === 4 ? 128 : 256;
        trampolineAllocator = makeAllocator(trampolineSize);
      }
      const maxRedirectSize = artQuickCodeHookRedirectSize[Process.arch];
      let redirectSize, spec;
      let alignment = 1;
      const constraints = {};
      if (pointerSize5 === 4 || this._canRelocateCode(maxRedirectSize, constraints)) {
        redirectSize = maxRedirectSize;
        spec = {};
      } else {
        let maxDistance;
        if (Process.arch === "x64") {
          redirectSize = 5;
          maxDistance = X86_JMP_MAX_DISTANCE;
        } else if (Process.arch === "arm64") {
          redirectSize = 8;
          maxDistance = ARM64_ADRP_MAX_DISTANCE;
          alignment = 4096;
        }
        spec = { near: this.quickCodeAddress, maxDistance };
      }
      this.redirectSize = redirectSize;
      this.trampoline = trampolineAllocator.allocateSlice(spec, alignment);
      return constraints;
    }
    _destroyTrampoline() {
      trampolineAllocator.freeSlice(this.trampoline);
    }
    activate(vm3) {
      const constraints = this._allocateTrampoline();
      const { trampoline, quickCode, redirectSize } = this;
      const writeTrampoline = artQuickCodeReplacementTrampolineWriters[Process.arch];
      const prologueLength = writeTrampoline(trampoline, quickCode, redirectSize, constraints, vm3);
      this.overwrittenPrologueLength = prologueLength;
      this.overwrittenPrologue = Memory.dup(this.quickCodeAddress, prologueLength);
      const writePrologue = artQuickCodePrologueWriters[Process.arch];
      writePrologue(quickCode, trampoline, redirectSize);
    }
    deactivate() {
      const { quickCodeAddress, overwrittenPrologueLength: prologueLength } = this;
      const Writer = thunkWriters[Process.arch];
      Memory.patchCode(quickCodeAddress, prologueLength, (code2) => {
        const writer = new Writer(code2, { pc: quickCodeAddress });
        const { overwrittenPrologue } = this;
        writer.putBytes(overwrittenPrologue.readByteArray(prologueLength));
        writer.flush();
      });
      this._destroyTrampoline();
    }
  };
  function isArtQuickEntrypoint(address) {
    const api2 = getApi();
    const { module: m2, artClassLinker } = api2;
    return address.equals(artClassLinker.quickGenericJniTrampoline) || address.equals(artClassLinker.quickToInterpreterBridgeTrampoline) || address.equals(artClassLinker.quickResolutionTrampoline) || address.equals(artClassLinker.quickImtConflictTrampoline) || address.compare(m2.base) >= 0 && address.compare(m2.base.add(m2.size)) < 0;
  }
  var ArtMethodMangler = class {
    constructor(opaqueMethodId) {
      const methodId = unwrapMethodId(opaqueMethodId);
      this.methodId = methodId;
      this.originalMethod = null;
      this.hookedMethodId = methodId;
      this.replacementMethodId = null;
      this.interceptor = null;
    }
    replace(impl, isInstanceMethod, argTypes, vm3, api2) {
      const { kAccCompileDontBother, artNterpEntryPoint } = api2;
      this.originalMethod = fetchArtMethod(this.methodId, vm3);
      const originalFlags = this.originalMethod.accessFlags;
      if ((originalFlags & kAccXposedHookedMethod) !== 0 && xposedIsSupported()) {
        const hookInfo = this.originalMethod.jniCode;
        this.hookedMethodId = hookInfo.add(2 * pointerSize5).readPointer();
        this.originalMethod = fetchArtMethod(this.hookedMethodId, vm3);
      }
      const { hookedMethodId } = this;
      const replacementMethodId = cloneArtMethod(hookedMethodId, vm3);
      this.replacementMethodId = replacementMethodId;
      patchArtMethod(replacementMethodId, {
        jniCode: impl,
        accessFlags: (originalFlags & ~(kAccCriticalNative | kAccFastNative | kAccNterpEntryPointFastPathFlag) | kAccNative | kAccCompileDontBother) >>> 0,
        quickCode: api2.artClassLinker.quickGenericJniTrampoline,
        interpreterCode: api2.artInterpreterToCompiledCodeBridge
      }, vm3);
      let hookedMethodRemovedFlags = kAccFastInterpreterToInterpreterInvoke | kAccSingleImplementation | kAccNterpEntryPointFastPathFlag;
      if ((originalFlags & kAccNative) === 0) {
        hookedMethodRemovedFlags |= kAccSkipAccessChecks;
      }
      patchArtMethod(hookedMethodId, {
        accessFlags: (originalFlags & ~hookedMethodRemovedFlags | kAccCompileDontBother) >>> 0
      }, vm3);
      const quickCode = this.originalMethod.quickCode;
      if (artNterpEntryPoint !== null && quickCode.equals(artNterpEntryPoint)) {
        patchArtMethod(hookedMethodId, {
          quickCode: api2.artQuickToInterpreterBridge
        }, vm3);
      }
      if (!isArtQuickEntrypoint(quickCode)) {
        const interceptor = new ArtQuickCodeInterceptor(quickCode);
        interceptor.activate(vm3);
        this.interceptor = interceptor;
      }
      artController.replacedMethods.set(hookedMethodId, replacementMethodId);
      notifyArtMethodHooked(hookedMethodId, vm3);
    }
    revert(vm3) {
      const { hookedMethodId, interceptor } = this;
      patchArtMethod(hookedMethodId, this.originalMethod, vm3);
      artController.replacedMethods.delete(hookedMethodId);
      if (interceptor !== null) {
        interceptor.deactivate();
        this.interceptor = null;
      }
    }
    resolveTarget(wrapper, isInstanceMethod, env, api2) {
      return this.hookedMethodId;
    }
  };
  function xposedIsSupported() {
    return getAndroidApiLevel() < 28;
  }
  function fetchArtMethod(methodId, vm3) {
    const artMethodSpec = getArtMethodSpec(vm3);
    const artMethodOffset = artMethodSpec.offset;
    return ["jniCode", "accessFlags", "quickCode", "interpreterCode"].reduce((original, name) => {
      const offset = artMethodOffset[name];
      if (offset === void 0) {
        return original;
      }
      const address = methodId.add(offset);
      const read2 = name === "accessFlags" ? readU32 : readPointer;
      original[name] = read2.call(address);
      return original;
    }, {});
  }
  function patchArtMethod(methodId, patches, vm3) {
    const artMethodSpec = getArtMethodSpec(vm3);
    const artMethodOffset = artMethodSpec.offset;
    Object.keys(patches).forEach((name) => {
      const offset = artMethodOffset[name];
      if (offset === void 0) {
        return;
      }
      const address = methodId.add(offset);
      const write3 = name === "accessFlags" ? writeU32 : writePointer;
      write3.call(address, patches[name]);
    });
  }
  var DalvikMethodMangler = class {
    constructor(methodId) {
      this.methodId = methodId;
      this.originalMethod = null;
    }
    replace(impl, isInstanceMethod, argTypes, vm3, api2) {
      const { methodId } = this;
      this.originalMethod = Memory.dup(methodId, DVM_METHOD_SIZE);
      let argsSize = argTypes.reduce((acc, t2) => acc + t2.size, 0);
      if (isInstanceMethod) {
        argsSize++;
      }
      const accessFlags = (methodId.add(DVM_METHOD_OFFSET_ACCESS_FLAGS).readU32() | kAccNative) >>> 0;
      const registersSize = argsSize;
      const outsSize = 0;
      const insSize = argsSize;
      methodId.add(DVM_METHOD_OFFSET_ACCESS_FLAGS).writeU32(accessFlags);
      methodId.add(DVM_METHOD_OFFSET_REGISTERS_SIZE).writeU16(registersSize);
      methodId.add(DVM_METHOD_OFFSET_OUTS_SIZE).writeU16(outsSize);
      methodId.add(DVM_METHOD_OFFSET_INS_SIZE).writeU16(insSize);
      methodId.add(DVM_METHOD_OFFSET_JNI_ARG_INFO).writeU32(computeDalvikJniArgInfo(methodId));
      api2.dvmUseJNIBridge(methodId, impl);
    }
    revert(vm3) {
      Memory.copy(this.methodId, this.originalMethod, DVM_METHOD_SIZE);
    }
    resolveTarget(wrapper, isInstanceMethod, env, api2) {
      const thread = env.handle.add(DVM_JNI_ENV_OFFSET_SELF).readPointer();
      let objectPtr;
      if (isInstanceMethod) {
        objectPtr = api2.dvmDecodeIndirectRef(thread, wrapper.$h);
      } else {
        const h2 = wrapper.$borrowClassHandle(env);
        objectPtr = api2.dvmDecodeIndirectRef(thread, h2.value);
        h2.unref(env);
      }
      let classObject;
      if (isInstanceMethod) {
        classObject = objectPtr.add(DVM_OBJECT_OFFSET_CLAZZ).readPointer();
      } else {
        classObject = objectPtr;
      }
      const classKey = classObject.toString(16);
      let entry = patchedClasses.get(classKey);
      if (entry === void 0) {
        const vtablePtr = classObject.add(DVM_CLASS_OBJECT_OFFSET_VTABLE);
        const vtableCountPtr = classObject.add(DVM_CLASS_OBJECT_OFFSET_VTABLE_COUNT);
        const vtable2 = vtablePtr.readPointer();
        const vtableCount = vtableCountPtr.readS32();
        const vtableSize = vtableCount * pointerSize5;
        const shadowVtable = Memory.alloc(2 * vtableSize);
        Memory.copy(shadowVtable, vtable2, vtableSize);
        vtablePtr.writePointer(shadowVtable);
        entry = {
          classObject,
          vtablePtr,
          vtableCountPtr,
          vtable: vtable2,
          vtableCount,
          shadowVtable,
          shadowVtableCount: vtableCount,
          targetMethods: /* @__PURE__ */ new Map()
        };
        patchedClasses.set(classKey, entry);
      }
      const methodKey = this.methodId.toString(16);
      let targetMethod = entry.targetMethods.get(methodKey);
      if (targetMethod === void 0) {
        targetMethod = Memory.dup(this.originalMethod, DVM_METHOD_SIZE);
        const methodIndex = entry.shadowVtableCount++;
        entry.shadowVtable.add(methodIndex * pointerSize5).writePointer(targetMethod);
        targetMethod.add(DVM_METHOD_OFFSET_METHOD_INDEX).writeU16(methodIndex);
        entry.vtableCountPtr.writeS32(entry.shadowVtableCount);
        entry.targetMethods.set(methodKey, targetMethod);
      }
      return targetMethod;
    }
  };
  function computeDalvikJniArgInfo(methodId) {
    if (Process.arch !== "ia32") {
      return DALVIK_JNI_NO_ARG_INFO;
    }
    const shorty = methodId.add(DVM_METHOD_OFFSET_SHORTY).readPointer().readCString();
    if (shorty === null || shorty.length === 0 || shorty.length > 65535) {
      return DALVIK_JNI_NO_ARG_INFO;
    }
    let returnType;
    switch (shorty[0]) {
      case "V":
        returnType = DALVIK_JNI_RETURN_VOID;
        break;
      case "F":
        returnType = DALVIK_JNI_RETURN_FLOAT;
        break;
      case "D":
        returnType = DALVIK_JNI_RETURN_DOUBLE;
        break;
      case "J":
        returnType = DALVIK_JNI_RETURN_S8;
        break;
      case "Z":
      case "B":
        returnType = DALVIK_JNI_RETURN_S1;
        break;
      case "C":
        returnType = DALVIK_JNI_RETURN_U2;
        break;
      case "S":
        returnType = DALVIK_JNI_RETURN_S2;
        break;
      default:
        returnType = DALVIK_JNI_RETURN_S4;
        break;
    }
    let hints = 0;
    for (let i2 = shorty.length - 1; i2 > 0; i2--) {
      const ch = shorty[i2];
      hints += ch === "D" || ch === "J" ? 2 : 1;
    }
    return returnType << DALVIK_JNI_RETURN_SHIFT | hints;
  }
  function cloneArtMethod(method, vm3) {
    const api2 = getApi();
    if (getAndroidApiLevel() < 23) {
      const thread = api2["art::Thread::CurrentFromGdb"]();
      return api2["art::mirror::Object::Clone"](method, thread);
    }
    return Memory.dup(method, getArtMethodSpec(vm3).size);
  }
  function deoptimizeMethod(vm3, env, method) {
    requestDeoptimization(vm3, env, kSelectiveDeoptimization, method);
  }
  function deoptimizeEverything(vm3, env) {
    requestDeoptimization(vm3, env, kFullDeoptimization);
  }
  function deoptimizeBootImage(vm3, env) {
    const api2 = getApi();
    if (getAndroidApiLevel() < 26) {
      throw new Error("This API is only available on Android >= 8.0");
    }
    withRunnableArtThread(vm3, env, (thread) => {
      api2["art::Runtime::DeoptimizeBootImage"](api2.artRuntime);
    });
  }
  function requestDeoptimization(vm3, env, kind, method) {
    const api2 = getApi();
    if (getAndroidApiLevel() < 24) {
      throw new Error("This API is only available on Android >= 7.0");
    }
    withRunnableArtThread(vm3, env, (thread) => {
      if (getAndroidApiLevel() < 30) {
        if (!api2.isJdwpStarted()) {
          const session = startJdwp(api2);
          jdwpSessions.push(session);
        }
        if (!api2.isDebuggerActive()) {
          api2["art::Dbg::GoActive"]();
        }
        const request = Memory.alloc(8 + pointerSize5);
        request.writeU32(kind);
        switch (kind) {
          case kFullDeoptimization:
            break;
          case kSelectiveDeoptimization:
            request.add(8).writePointer(method);
            break;
          default:
            throw new Error("Unsupported deoptimization kind");
        }
        api2["art::Dbg::RequestDeoptimization"](request);
        api2["art::Dbg::ManageDeoptimization"]();
      } else {
        const instrumentation = api2.artInstrumentation;
        if (instrumentation === null) {
          throw new Error("Unable to find Instrumentation class in ART; please file a bug");
        }
        const enableDeopt = api2["art::Instrumentation::EnableDeoptimization"];
        if (enableDeopt !== void 0) {
          const deoptimizationEnabled = !!instrumentation.add(getArtInstrumentationSpec().offset.deoptimizationEnabled).readU8();
          if (!deoptimizationEnabled) {
            enableDeopt(instrumentation);
          }
        }
        switch (kind) {
          case kFullDeoptimization:
            api2["art::Instrumentation::DeoptimizeEverything"](instrumentation, Memory.allocUtf8String("frida"));
            break;
          case kSelectiveDeoptimization:
            api2["art::Instrumentation::Deoptimize"](instrumentation, method);
            break;
          default:
            throw new Error("Unsupported deoptimization kind");
        }
      }
    });
  }
  var JdwpSession = class {
    constructor() {
      const libart = Process.getModuleByName("libart.so");
      const acceptImpl = libart.getExportByName("_ZN3art4JDWP12JdwpAdbState6AcceptEv");
      const receiveClientFdImpl = libart.getExportByName("_ZN3art4JDWP12JdwpAdbState15ReceiveClientFdEv");
      const controlPair = makeSocketPair();
      const clientPair = makeSocketPair();
      this._controlFd = controlPair[0];
      this._clientFd = clientPair[0];
      let acceptListener = null;
      acceptListener = Interceptor.attach(acceptImpl, function(args) {
        const state = args[0];
        const controlSockPtr = Memory.scanSync(state.add(8252), 256, "00 ff ff ff ff 00")[0].address.add(1);
        controlSockPtr.writeS32(controlPair[1]);
        acceptListener.detach();
      });
      Interceptor.replace(receiveClientFdImpl, new NativeCallback(function(state) {
        Interceptor.revert(receiveClientFdImpl);
        return clientPair[1];
      }, "int", ["pointer"]));
      Interceptor.flush();
      this._handshakeRequest = this._performHandshake();
    }
    async _performHandshake() {
      const input = new UnixInputStream(this._clientFd, { autoClose: false });
      const output = new UnixOutputStream(this._clientFd, { autoClose: false });
      const handshakePacket = [74, 68, 87, 80, 45, 72, 97, 110, 100, 115, 104, 97, 107, 101];
      try {
        await output.writeAll(handshakePacket);
        await input.readAll(handshakePacket.length);
      } catch (e2) {
      }
    }
  };
  function startJdwp(api2) {
    const session = new JdwpSession();
    api2["art::Dbg::SetJdwpAllowed"](1);
    const options = makeJdwpOptions();
    api2["art::Dbg::ConfigureJdwp"](options);
    const startDebugger = api2["art::InternalDebuggerControlCallback::StartDebugger"];
    if (startDebugger !== void 0) {
      startDebugger(NULL);
    } else {
      api2["art::Dbg::StartJdwp"]();
    }
    return session;
  }
  function makeJdwpOptions() {
    const kJdwpTransportAndroidAdb = getAndroidApiLevel() < 28 ? 2 : 3;
    const kJdwpPortFirstAvailable = 0;
    const transport = kJdwpTransportAndroidAdb;
    const server = true;
    const suspend = false;
    const port = kJdwpPortFirstAvailable;
    const size = 8 + STD_STRING_SIZE + 2;
    const result = Memory.alloc(size);
    result.writeU32(transport).add(4).writeU8(server ? 1 : 0).add(1).writeU8(suspend ? 1 : 0).add(1).add(STD_STRING_SIZE).writeU16(port);
    return result;
  }
  function makeSocketPair() {
    if (socketpair === null) {
      socketpair = new NativeFunction(
        Process.getModuleByName("libc.so").getExportByName("socketpair"),
        "int",
        ["int", "int", "int", "pointer"]
      );
    }
    const buf = Memory.alloc(8);
    if (socketpair(AF_UNIX, SOCK_STREAM, 0, buf) === -1) {
      throw new Error("Unable to create socketpair for JDWP");
    }
    return [
      buf.readS32(),
      buf.add(4).readS32()
    ];
  }
  function makeAddGlobalRefFallbackForAndroid5(api2) {
    const offset = getArtVMSpec().offset;
    const lock = api2.vm.add(offset.globalsLock);
    const table = api2.vm.add(offset.globals);
    const add = api2["art::IndirectReferenceTable::Add"];
    const acquire = api2["art::ReaderWriterMutex::ExclusiveLock"];
    const release = api2["art::ReaderWriterMutex::ExclusiveUnlock"];
    const IRT_FIRST_SEGMENT = 0;
    return function(vm3, thread, obj) {
      acquire(lock, thread);
      try {
        return add(table, IRT_FIRST_SEGMENT, obj);
      } finally {
        release(lock, thread);
      }
    };
  }
  function makeDecodeGlobalFallback(api2) {
    const decode = api2["art::Thread::DecodeJObject"];
    if (decode === void 0) {
      throw new Error("art::Thread::DecodeJObject is not available; please file a bug");
    }
    return function(vm3, thread, ref) {
      return decode(thread, ref);
    };
  }
  var threadStateTransitionRecompilers = {
    ia32: recompileExceptionClearForX86,
    x64: recompileExceptionClearForX86,
    arm: recompileExceptionClearForArm,
    arm64: recompileExceptionClearForArm64
  };
  function makeArtThreadStateTransitionImpl(vm3, env, callback) {
    const api2 = getApi();
    const envVtable = env.handle.readPointer();
    let exceptionClearImpl;
    const innerExceptionClearImpl = api2.find("_ZN3art3JNIILb1EE14ExceptionClearEP7_JNIEnv");
    if (innerExceptionClearImpl !== null) {
      exceptionClearImpl = innerExceptionClearImpl;
    } else {
      exceptionClearImpl = envVtable.add(ENV_VTABLE_OFFSET_EXCEPTION_CLEAR).readPointer();
    }
    let nextFuncImpl;
    const innerNextFuncImpl = api2.find("_ZN3art3JNIILb1EE10FatalErrorEP7_JNIEnvPKc");
    if (innerNextFuncImpl !== null) {
      nextFuncImpl = innerNextFuncImpl;
    } else {
      nextFuncImpl = envVtable.add(ENV_VTABLE_OFFSET_FATAL_ERROR).readPointer();
    }
    const recompile = threadStateTransitionRecompilers[Process.arch];
    if (recompile === void 0) {
      throw new Error("Not yet implemented for " + Process.arch);
    }
    let perform = null;
    const threadOffsets = getArtThreadSpec(vm3).offset;
    const exceptionOffset = threadOffsets.exception;
    const neuteredOffsets = /* @__PURE__ */ new Set();
    const isReportedOffset = threadOffsets.isExceptionReportedToInstrumentation;
    if (isReportedOffset !== null) {
      neuteredOffsets.add(isReportedOffset);
    }
    const throwLocationStartOffset = threadOffsets.throwLocation;
    if (throwLocationStartOffset !== null) {
      neuteredOffsets.add(throwLocationStartOffset);
      neuteredOffsets.add(throwLocationStartOffset + pointerSize5);
      neuteredOffsets.add(throwLocationStartOffset + 2 * pointerSize5);
    }
    const codeSize = 65536;
    const code2 = Memory.alloc(codeSize);
    Memory.patchCode(code2, codeSize, (buffer) => {
      perform = recompile(buffer, code2, exceptionClearImpl, nextFuncImpl, exceptionOffset, neuteredOffsets, callback);
    });
    perform._code = code2;
    perform._callback = callback;
    return perform;
  }
  function recompileExceptionClearForX86(buffer, pc, exceptionClearImpl, nextFuncImpl, exceptionOffset, neuteredOffsets, callback) {
    const blocks = {};
    const branchTargets = /* @__PURE__ */ new Set();
    const pending = [exceptionClearImpl];
    while (pending.length > 0) {
      let current = pending.shift();
      const alreadyCovered = Object.values(blocks).some(({ begin, end }) => current.compare(begin) >= 0 && current.compare(end) < 0);
      if (alreadyCovered) {
        continue;
      }
      const blockAddressKey = current.toString();
      let block = {
        begin: current
      };
      let lastInsn = null;
      let reachedEndOfBlock = false;
      do {
        if (current.equals(nextFuncImpl)) {
          reachedEndOfBlock = true;
          break;
        }
        const insn = Instruction.parse(current);
        lastInsn = insn;
        const existingBlock = blocks[insn.address.toString()];
        if (existingBlock !== void 0) {
          delete blocks[existingBlock.begin.toString()];
          blocks[blockAddressKey] = existingBlock;
          existingBlock.begin = block.begin;
          block = null;
          break;
        }
        let branchTarget = null;
        switch (insn.mnemonic) {
          case "jmp":
            branchTarget = ptr(insn.operands[0].value);
            reachedEndOfBlock = true;
            break;
          case "je":
          case "jg":
          case "jle":
          case "jne":
          case "js":
            branchTarget = ptr(insn.operands[0].value);
            break;
          case "ret":
            reachedEndOfBlock = true;
            break;
        }
        if (branchTarget !== null) {
          branchTargets.add(branchTarget.toString());
          pending.push(branchTarget);
          pending.sort((a2, b2) => a2.compare(b2));
        }
        current = insn.next;
      } while (!reachedEndOfBlock);
      if (block !== null) {
        block.end = lastInsn.address.add(lastInsn.size);
        blocks[blockAddressKey] = block;
      }
    }
    const blocksOrdered = Object.keys(blocks).map((key) => blocks[key]);
    blocksOrdered.sort((a2, b2) => a2.begin.compare(b2.begin));
    const entryBlock = blocks[exceptionClearImpl.toString()];
    blocksOrdered.splice(blocksOrdered.indexOf(entryBlock), 1);
    blocksOrdered.unshift(entryBlock);
    const writer = new X86Writer(buffer, { pc });
    let foundCore = false;
    let threadReg = null;
    blocksOrdered.forEach((block) => {
      const size = block.end.sub(block.begin).toInt32();
      const relocator = new X86Relocator(block.begin, writer);
      let offset;
      while ((offset = relocator.readOne()) !== 0) {
        const insn = relocator.input;
        const { mnemonic } = insn;
        const insnAddressId = insn.address.toString();
        if (branchTargets.has(insnAddressId)) {
          writer.putLabel(insnAddressId);
        }
        let keep = true;
        switch (mnemonic) {
          case "jmp":
            writer.putJmpNearLabel(branchLabelFromOperand(insn.operands[0]));
            keep = false;
            break;
          case "je":
          case "jg":
          case "jle":
          case "jne":
          case "js":
            writer.putJccNearLabel(mnemonic, branchLabelFromOperand(insn.operands[0]), "no-hint");
            keep = false;
            break;
          /*
           * JNI::ExceptionClear(), when checked JNI is off.
           */
          case "mov": {
            const [dst, src] = insn.operands;
            if (dst.type === "mem" && src.type === "imm") {
              const dstValue = dst.value;
              const dstOffset = dstValue.disp;
              if (dstOffset === exceptionOffset && src.value.valueOf() === 0) {
                threadReg = dstValue.base;
                writer.putPushfx();
                writer.putPushax();
                writer.putMovRegReg("xbp", "xsp");
                if (pointerSize5 === 4) {
                  writer.putAndRegU32("esp", 4294967280);
                } else {
                  const scratchReg = threadReg !== "rdi" ? "rdi" : "rsi";
                  writer.putMovRegU64(scratchReg, uint64("0xfffffffffffffff0"));
                  writer.putAndRegReg("rsp", scratchReg);
                }
                writer.putCallAddressWithAlignedArguments(callback, [threadReg]);
                writer.putMovRegReg("xsp", "xbp");
                writer.putPopax();
                writer.putPopfx();
                foundCore = true;
                keep = false;
              } else if (neuteredOffsets.has(dstOffset) && dstValue.base === threadReg) {
                keep = false;
              }
            }
            break;
          }
          /*
           * CheckJNI::ExceptionClear, when checked JNI is on. Wrapper that calls JNI::ExceptionClear().
           */
          case "call": {
            const target = insn.operands[0];
            if (target.type === "mem" && target.value.disp === ENV_VTABLE_OFFSET_EXCEPTION_CLEAR) {
              if (pointerSize5 === 4) {
                writer.putPopReg("eax");
                writer.putMovRegRegOffsetPtr("eax", "eax", 4);
                writer.putPushReg("eax");
              } else {
                writer.putMovRegRegOffsetPtr("rdi", "rdi", 8);
              }
              writer.putCallAddressWithArguments(callback, []);
              foundCore = true;
              keep = false;
            }
            break;
          }
        }
        if (keep) {
          relocator.writeAll();
        } else {
          relocator.skipOne();
        }
        if (offset === size) {
          break;
        }
      }
      relocator.dispose();
    });
    writer.dispose();
    if (!foundCore) {
      throwThreadStateTransitionParseError();
    }
    return new NativeFunction(pc, "void", ["pointer"], nativeFunctionOptions3);
  }
  function recompileExceptionClearForArm(buffer, pc, exceptionClearImpl, nextFuncImpl, exceptionOffset, neuteredOffsets, callback) {
    const blocks = {};
    const branchTargets = /* @__PURE__ */ new Set();
    const thumbBitRemovalMask = ptr(1).not();
    const pending = [exceptionClearImpl];
    while (pending.length > 0) {
      let current = pending.shift();
      const alreadyCovered = Object.values(blocks).some(({ begin: begin2, end }) => current.compare(begin2) >= 0 && current.compare(end) < 0);
      if (alreadyCovered) {
        continue;
      }
      const begin = current.and(thumbBitRemovalMask);
      const blockId = begin.toString();
      const thumbBit = current.and(1);
      let block = {
        begin
      };
      let lastInsn = null;
      let reachedEndOfBlock = false;
      let ifThenBlockRemaining = 0;
      do {
        if (current.equals(nextFuncImpl)) {
          reachedEndOfBlock = true;
          break;
        }
        const insn = Instruction.parse(current);
        const { mnemonic } = insn;
        lastInsn = insn;
        const currentAddress = current.and(thumbBitRemovalMask);
        const insnId = currentAddress.toString();
        const existingBlock = blocks[insnId];
        if (existingBlock !== void 0) {
          delete blocks[existingBlock.begin.toString()];
          blocks[blockId] = existingBlock;
          existingBlock.begin = block.begin;
          block = null;
          break;
        }
        const isOutsideIfThenBlock = ifThenBlockRemaining === 0;
        let branchTarget = null;
        switch (mnemonic) {
          case "b":
            branchTarget = ptr(insn.operands[0].value);
            reachedEndOfBlock = isOutsideIfThenBlock;
            break;
          case "beq.w":
          case "beq":
          case "bne":
          case "bne.w":
          case "bgt":
            branchTarget = ptr(insn.operands[0].value);
            break;
          case "cbz":
          case "cbnz":
            branchTarget = ptr(insn.operands[1].value);
            break;
          case "pop.w":
            if (isOutsideIfThenBlock) {
              reachedEndOfBlock = insn.operands.filter((op) => op.value === "pc").length === 1;
            }
            break;
        }
        switch (mnemonic) {
          case "it":
            ifThenBlockRemaining = 1;
            break;
          case "itt":
            ifThenBlockRemaining = 2;
            break;
          case "ittt":
            ifThenBlockRemaining = 3;
            break;
          case "itttt":
            ifThenBlockRemaining = 4;
            break;
          default:
            if (ifThenBlockRemaining > 0) {
              ifThenBlockRemaining--;
            }
            break;
        }
        if (branchTarget !== null) {
          branchTargets.add(branchTarget.toString());
          pending.push(branchTarget.or(thumbBit));
          pending.sort((a2, b2) => a2.compare(b2));
        }
        current = insn.next;
      } while (!reachedEndOfBlock);
      if (block !== null) {
        block.end = lastInsn.address.add(lastInsn.size);
        blocks[blockId] = block;
      }
    }
    const blocksOrdered = Object.keys(blocks).map((key) => blocks[key]);
    blocksOrdered.sort((a2, b2) => a2.begin.compare(b2.begin));
    const entryBlock = blocks[exceptionClearImpl.and(thumbBitRemovalMask).toString()];
    blocksOrdered.splice(blocksOrdered.indexOf(entryBlock), 1);
    blocksOrdered.unshift(entryBlock);
    const writer = new ThumbWriter(buffer, { pc });
    let foundCore = false;
    let threadReg = null;
    let realImplReg = null;
    blocksOrdered.forEach((block) => {
      const relocator = new ThumbRelocator(block.begin, writer);
      let address = block.begin;
      const end = block.end;
      let size = 0;
      do {
        const offset = relocator.readOne();
        if (offset === 0) {
          throw new Error("Unexpected end of block");
        }
        const insn = relocator.input;
        address = insn.address;
        size = insn.size;
        const { mnemonic } = insn;
        const insnAddressId = address.toString();
        if (branchTargets.has(insnAddressId)) {
          writer.putLabel(insnAddressId);
        }
        let keep = true;
        switch (mnemonic) {
          case "b":
            writer.putBLabel(branchLabelFromOperand(insn.operands[0]));
            keep = false;
            break;
          case "beq.w":
            writer.putBCondLabelWide("eq", branchLabelFromOperand(insn.operands[0]));
            keep = false;
            break;
          case "bne.w":
            writer.putBCondLabelWide("ne", branchLabelFromOperand(insn.operands[0]));
            keep = false;
            break;
          case "beq":
          case "bne":
          case "bgt":
            writer.putBCondLabelWide(mnemonic.substr(1), branchLabelFromOperand(insn.operands[0]));
            keep = false;
            break;
          case "cbz": {
            const ops = insn.operands;
            writer.putCbzRegLabel(ops[0].value, branchLabelFromOperand(ops[1]));
            keep = false;
            break;
          }
          case "cbnz": {
            const ops = insn.operands;
            writer.putCbnzRegLabel(ops[0].value, branchLabelFromOperand(ops[1]));
            keep = false;
            break;
          }
          /*
           * JNI::ExceptionClear(), when checked JNI is off.
           */
          case "str":
          case "str.w": {
            const dstValue = insn.operands[1].value;
            const dstOffset = dstValue.disp;
            if (dstOffset === exceptionOffset) {
              threadReg = dstValue.base;
              const nzcvqReg = threadReg !== "r4" ? "r4" : "r5";
              const clobberedRegs = ["r0", "r1", "r2", "r3", nzcvqReg, "r9", "r12", "lr"];
              writer.putPushRegs(clobberedRegs);
              writer.putMrsRegReg(nzcvqReg, "apsr-nzcvq");
              writer.putCallAddressWithArguments(callback, [threadReg]);
              writer.putMsrRegReg("apsr-nzcvq", nzcvqReg);
              writer.putPopRegs(clobberedRegs);
              foundCore = true;
              keep = false;
            } else if (neuteredOffsets.has(dstOffset) && dstValue.base === threadReg) {
              keep = false;
            }
            break;
          }
          /*
           * CheckJNI::ExceptionClear, when checked JNI is on. Wrapper that calls JNI::ExceptionClear().
           */
          case "ldr": {
            const [dstOp, srcOp] = insn.operands;
            if (srcOp.type === "mem") {
              const src = srcOp.value;
              if (src.base[0] === "r" && src.disp === ENV_VTABLE_OFFSET_EXCEPTION_CLEAR) {
                realImplReg = dstOp.value;
              }
            }
            break;
          }
          case "blx":
            if (insn.operands[0].value === realImplReg) {
              writer.putLdrRegRegOffset("r0", "r0", 4);
              writer.putCallAddressWithArguments(callback, ["r0"]);
              foundCore = true;
              realImplReg = null;
              keep = false;
            }
            break;
        }
        if (keep) {
          relocator.writeAll();
        } else {
          relocator.skipOne();
        }
      } while (!address.add(size).equals(end));
      relocator.dispose();
    });
    writer.dispose();
    if (!foundCore) {
      throwThreadStateTransitionParseError();
    }
    return new NativeFunction(pc.or(1), "void", ["pointer"], nativeFunctionOptions3);
  }
  function recompileExceptionClearForArm64(buffer, pc, exceptionClearImpl, nextFuncImpl, exceptionOffset, neuteredOffsets, callback) {
    const blocks = {};
    const branchTargets = /* @__PURE__ */ new Set();
    const pending = [exceptionClearImpl];
    while (pending.length > 0) {
      let current = pending.shift();
      const alreadyCovered = Object.values(blocks).some(({ begin, end }) => current.compare(begin) >= 0 && current.compare(end) < 0);
      if (alreadyCovered) {
        continue;
      }
      const blockAddressKey = current.toString();
      let block = {
        begin: current
      };
      let lastInsn = null;
      let reachedEndOfBlock = false;
      do {
        if (current.equals(nextFuncImpl)) {
          reachedEndOfBlock = true;
          break;
        }
        let insn;
        try {
          insn = Instruction.parse(current);
        } catch (e2) {
          if (current.readU32() === 0) {
            reachedEndOfBlock = true;
            break;
          } else {
            throw e2;
          }
        }
        lastInsn = insn;
        const existingBlock = blocks[insn.address.toString()];
        if (existingBlock !== void 0) {
          delete blocks[existingBlock.begin.toString()];
          blocks[blockAddressKey] = existingBlock;
          existingBlock.begin = block.begin;
          block = null;
          break;
        }
        let branchTarget = null;
        switch (insn.mnemonic) {
          case "b":
            branchTarget = ptr(insn.operands[0].value);
            reachedEndOfBlock = true;
            break;
          case "b.eq":
          case "b.ne":
          case "b.le":
          case "b.gt":
            branchTarget = ptr(insn.operands[0].value);
            break;
          case "cbz":
          case "cbnz":
            branchTarget = ptr(insn.operands[1].value);
            break;
          case "tbz":
          case "tbnz":
            branchTarget = ptr(insn.operands[2].value);
            break;
          case "ret":
            reachedEndOfBlock = true;
            break;
        }
        if (branchTarget !== null) {
          branchTargets.add(branchTarget.toString());
          pending.push(branchTarget);
          pending.sort((a2, b2) => a2.compare(b2));
        }
        current = insn.next;
      } while (!reachedEndOfBlock);
      if (block !== null) {
        block.end = lastInsn.address.add(lastInsn.size);
        blocks[blockAddressKey] = block;
      }
    }
    const blocksOrdered = Object.keys(blocks).map((key) => blocks[key]);
    blocksOrdered.sort((a2, b2) => a2.begin.compare(b2.begin));
    const entryBlock = blocks[exceptionClearImpl.toString()];
    blocksOrdered.splice(blocksOrdered.indexOf(entryBlock), 1);
    blocksOrdered.unshift(entryBlock);
    const writer = new Arm64Writer(buffer, { pc });
    writer.putBLabel("performTransition");
    const invokeCallback = pc.add(writer.offset);
    writer.putPushAllXRegisters();
    writer.putCallAddressWithArguments(callback, ["x0"]);
    writer.putPopAllXRegisters();
    writer.putRet();
    writer.putLabel("performTransition");
    let foundCore = false;
    let threadReg = null;
    let realImplReg = null;
    blocksOrdered.forEach((block) => {
      const size = block.end.sub(block.begin).toInt32();
      const relocator = new Arm64Relocator(block.begin, writer);
      let offset;
      while ((offset = relocator.readOne()) !== 0) {
        const insn = relocator.input;
        const { mnemonic } = insn;
        const insnAddressId = insn.address.toString();
        if (branchTargets.has(insnAddressId)) {
          writer.putLabel(insnAddressId);
        }
        let keep = true;
        switch (mnemonic) {
          case "b":
            writer.putBLabel(branchLabelFromOperand(insn.operands[0]));
            keep = false;
            break;
          case "b.eq":
          case "b.ne":
          case "b.le":
          case "b.gt":
            writer.putBCondLabel(mnemonic.substr(2), branchLabelFromOperand(insn.operands[0]));
            keep = false;
            break;
          case "cbz": {
            const ops = insn.operands;
            writer.putCbzRegLabel(ops[0].value, branchLabelFromOperand(ops[1]));
            keep = false;
            break;
          }
          case "cbnz": {
            const ops = insn.operands;
            writer.putCbnzRegLabel(ops[0].value, branchLabelFromOperand(ops[1]));
            keep = false;
            break;
          }
          case "tbz": {
            const ops = insn.operands;
            writer.putTbzRegImmLabel(ops[0].value, ops[1].value.valueOf(), branchLabelFromOperand(ops[2]));
            keep = false;
            break;
          }
          case "tbnz": {
            const ops = insn.operands;
            writer.putTbnzRegImmLabel(ops[0].value, ops[1].value.valueOf(), branchLabelFromOperand(ops[2]));
            keep = false;
            break;
          }
          /*
           * JNI::ExceptionClear(), when checked JNI is off.
           */
          case "str": {
            const ops = insn.operands;
            const srcReg = ops[0].value;
            const dstValue = ops[1].value;
            const dstOffset = dstValue.disp;
            if (srcReg === "xzr" && dstOffset === exceptionOffset) {
              threadReg = dstValue.base;
              writer.putPushRegReg("x0", "lr");
              writer.putMovRegReg("x0", threadReg);
              writer.putBlImm(invokeCallback);
              writer.putPopRegReg("x0", "lr");
              foundCore = true;
              keep = false;
            } else if (neuteredOffsets.has(dstOffset) && dstValue.base === threadReg) {
              keep = false;
            }
            break;
          }
          /*
           * CheckJNI::ExceptionClear, when checked JNI is on. Wrapper that calls JNI::ExceptionClear().
           */
          case "ldr": {
            const ops = insn.operands;
            const src = ops[1].value;
            if (src.base[0] === "x" && src.disp === ENV_VTABLE_OFFSET_EXCEPTION_CLEAR) {
              realImplReg = ops[0].value;
            }
            break;
          }
          case "blr":
            if (insn.operands[0].value === realImplReg) {
              writer.putLdrRegRegOffset("x0", "x0", 8);
              writer.putCallAddressWithArguments(callback, ["x0"]);
              foundCore = true;
              realImplReg = null;
              keep = false;
            }
            break;
        }
        if (keep) {
          relocator.writeAll();
        } else {
          relocator.skipOne();
        }
        if (offset === size) {
          break;
        }
      }
      relocator.dispose();
    });
    writer.dispose();
    if (!foundCore) {
      throwThreadStateTransitionParseError();
    }
    return new NativeFunction(pc, "void", ["pointer"], nativeFunctionOptions3);
  }
  function throwThreadStateTransitionParseError() {
    throw new Error("Unable to parse ART internals; please file a bug");
  }
  function fixupArtQuickDeliverExceptionBug(api2) {
    const prettyMethod = api2["art::ArtMethod::PrettyMethod"];
    if (prettyMethod === void 0) {
      return;
    }
    Interceptor.attach(prettyMethod.impl, artController.hooks.ArtMethod.prettyMethod);
    Interceptor.flush();
  }
  function branchLabelFromOperand(op) {
    return ptr(op.value).toString();
  }
  function makeCxxMethodWrapperReturningPointerByValueGeneric(address, argTypes) {
    return new NativeFunction(address, "pointer", argTypes, nativeFunctionOptions3);
  }
  function makeCxxMethodWrapperReturningPointerByValueInFirstArg(address, argTypes) {
    const impl = new NativeFunction(address, "void", ["pointer"].concat(argTypes), nativeFunctionOptions3);
    return function() {
      const resultPtr = Memory.alloc(pointerSize5);
      impl(resultPtr, ...arguments);
      return resultPtr.readPointer();
    };
  }
  function makeCxxMethodWrapperReturningStdStringByValue(impl, argTypes) {
    const { arch } = Process;
    switch (arch) {
      case "ia32":
      case "arm64": {
        let thunk;
        if (arch === "ia32") {
          thunk = makeThunk(64, (writer) => {
            const argCount = 1 + argTypes.length;
            const argvSize = argCount * 4;
            writer.putSubRegImm("esp", argvSize);
            for (let i2 = 0; i2 !== argCount; i2++) {
              const offset = i2 * 4;
              writer.putMovRegRegOffsetPtr("eax", "esp", argvSize + 4 + offset);
              writer.putMovRegOffsetPtrReg("esp", offset, "eax");
            }
            writer.putCallAddress(impl);
            writer.putAddRegImm("esp", argvSize - 4);
            writer.putRet();
          });
        } else {
          thunk = makeThunk(32, (writer) => {
            writer.putMovRegReg("x8", "x0");
            argTypes.forEach((t2, i2) => {
              writer.putMovRegReg("x" + i2, "x" + (i2 + 1));
            });
            writer.putLdrRegAddress("x7", impl);
            writer.putBrReg("x7");
          });
        }
        const invokeThunk = new NativeFunction(thunk, "void", ["pointer"].concat(argTypes), nativeFunctionOptions3);
        const wrapper = function(...args) {
          invokeThunk(...args);
        };
        wrapper.handle = thunk;
        wrapper.impl = impl;
        return wrapper;
      }
      default: {
        const result = new NativeFunction(impl, "void", ["pointer"].concat(argTypes), nativeFunctionOptions3);
        result.impl = impl;
        return result;
      }
    }
  }
  var StdString = class {
    constructor() {
      this.handle = Memory.alloc(STD_STRING_SIZE);
    }
    dispose() {
      const [data, isTiny] = this._getData();
      if (!isTiny) {
        getApi().$delete(data);
      }
    }
    disposeToString() {
      const result = this.toString();
      this.dispose();
      return result;
    }
    toString() {
      const [data] = this._getData();
      return data.readUtf8String();
    }
    _getData() {
      const str = this.handle;
      const isTiny = (str.readU8() & 1) === 0;
      const data = isTiny ? str.add(1) : str.add(2 * pointerSize5).readPointer();
      return [data, isTiny];
    }
  };
  var StdVector = class {
    $delete() {
      this.dispose();
      getApi().$delete(this);
    }
    constructor(storage, elementSize) {
      this.handle = storage;
      this._begin = storage;
      this._end = storage.add(pointerSize5);
      this._storage = storage.add(2 * pointerSize5);
      this._elementSize = elementSize;
    }
    init() {
      this.begin = NULL;
      this.end = NULL;
      this.storage = NULL;
    }
    dispose() {
      getApi().$delete(this.begin);
    }
    get begin() {
      return this._begin.readPointer();
    }
    set begin(value) {
      this._begin.writePointer(value);
    }
    get end() {
      return this._end.readPointer();
    }
    set end(value) {
      this._end.writePointer(value);
    }
    get storage() {
      return this._storage.readPointer();
    }
    set storage(value) {
      this._storage.writePointer(value);
    }
    get size() {
      return this.end.sub(this.begin).toInt32() / this._elementSize;
    }
  };
  var HandleVector = class _HandleVector extends StdVector {
    static $new() {
      const vector = new _HandleVector(getApi().$new(STD_VECTOR_SIZE));
      vector.init();
      return vector;
    }
    constructor(storage) {
      super(storage, pointerSize5);
    }
    get handles() {
      const result = [];
      let cur = this.begin;
      const end = this.end;
      while (!cur.equals(end)) {
        result.push(cur.readPointer());
        cur = cur.add(pointerSize5);
      }
      return result;
    }
  };
  var BHS_OFFSET_LINK = 0;
  var BHS_OFFSET_NUM_REFS = pointerSize5;
  var BHS_SIZE = BHS_OFFSET_NUM_REFS + 4;
  var kNumReferencesVariableSized = -1;
  var BaseHandleScope = class _BaseHandleScope {
    $delete() {
      this.dispose();
      getApi().$delete(this);
    }
    constructor(storage) {
      this.handle = storage;
      this._link = storage.add(BHS_OFFSET_LINK);
      this._numberOfReferences = storage.add(BHS_OFFSET_NUM_REFS);
    }
    init(link, numberOfReferences) {
      this.link = link;
      this.numberOfReferences = numberOfReferences;
    }
    dispose() {
    }
    get link() {
      return new _BaseHandleScope(this._link.readPointer());
    }
    set link(value) {
      this._link.writePointer(value);
    }
    get numberOfReferences() {
      return this._numberOfReferences.readS32();
    }
    set numberOfReferences(value) {
      this._numberOfReferences.writeS32(value);
    }
  };
  var VSHS_OFFSET_SELF = alignPointerOffset(BHS_SIZE);
  var VSHS_OFFSET_CURRENT_SCOPE = VSHS_OFFSET_SELF + pointerSize5;
  var VSHS_SIZE = VSHS_OFFSET_CURRENT_SCOPE + pointerSize5;
  var VariableSizedHandleScope = class _VariableSizedHandleScope extends BaseHandleScope {
    static $new(thread, vm3) {
      const scope = new _VariableSizedHandleScope(getApi().$new(VSHS_SIZE));
      scope.init(thread, vm3);
      return scope;
    }
    constructor(storage) {
      super(storage);
      this._self = storage.add(VSHS_OFFSET_SELF);
      this._currentScope = storage.add(VSHS_OFFSET_CURRENT_SCOPE);
      const kLocalScopeSize = 64;
      const kSizeOfReferencesPerScope = kLocalScopeSize - pointerSize5 - 4 - 4;
      const kNumReferencesPerScope = kSizeOfReferencesPerScope / 4;
      this._scopeLayout = FixedSizeHandleScope.layoutForCapacity(kNumReferencesPerScope);
      this._topHandleScopePtr = null;
    }
    init(thread, vm3) {
      const topHandleScopePtr = thread.add(getArtThreadSpec(vm3).offset.topHandleScope);
      this._topHandleScopePtr = topHandleScopePtr;
      super.init(topHandleScopePtr.readPointer(), kNumReferencesVariableSized);
      this.self = thread;
      this.currentScope = FixedSizeHandleScope.$new(this._scopeLayout);
      topHandleScopePtr.writePointer(this);
    }
    dispose() {
      this._topHandleScopePtr.writePointer(this.link);
      let scope;
      while ((scope = this.currentScope) !== null) {
        const next = scope.link;
        scope.$delete();
        this.currentScope = next;
      }
    }
    get self() {
      return this._self.readPointer();
    }
    set self(value) {
      this._self.writePointer(value);
    }
    get currentScope() {
      const storage = this._currentScope.readPointer();
      if (storage.isNull()) {
        return null;
      }
      return new FixedSizeHandleScope(storage, this._scopeLayout);
    }
    set currentScope(value) {
      this._currentScope.writePointer(value);
    }
    newHandle(object) {
      return this.currentScope.newHandle(object);
    }
  };
  var FixedSizeHandleScope = class _FixedSizeHandleScope extends BaseHandleScope {
    static $new(layout) {
      const scope = new _FixedSizeHandleScope(getApi().$new(layout.size), layout);
      scope.init();
      return scope;
    }
    constructor(storage, layout) {
      super(storage);
      const { offset } = layout;
      this._refsStorage = storage.add(offset.refsStorage);
      this._pos = storage.add(offset.pos);
      this._layout = layout;
    }
    init() {
      super.init(NULL, this._layout.numberOfReferences);
      this.pos = 0;
    }
    get pos() {
      return this._pos.readU32();
    }
    set pos(value) {
      this._pos.writeU32(value);
    }
    newHandle(object) {
      const pos = this.pos;
      const handle = this._refsStorage.add(pos * 4);
      handle.writeS32(object.toInt32());
      this.pos = pos + 1;
      return handle;
    }
    static layoutForCapacity(numRefs) {
      const refsStorage = BHS_SIZE;
      const pos = refsStorage + numRefs * 4;
      return {
        size: pos + 4,
        numberOfReferences: numRefs,
        offset: {
          refsStorage,
          pos
        }
      };
    }
  };
  var objectVisitorPredicateFactories = {
    arm: function(needle, onMatch) {
      const size = Process.pageSize;
      const predicate = Memory.alloc(size);
      Memory.protect(predicate, size, "rwx");
      const onMatchCallback = new NativeCallback(onMatch, "void", ["pointer"]);
      predicate._onMatchCallback = onMatchCallback;
      const instructions = [
        26625,
        // ldr r1, [r0]
        18947,
        // ldr r2, =needle
        17041,
        // cmp r1, r2
        53505,
        // bne mismatch
        19202,
        // ldr r3, =onMatch
        18200,
        // bx r3
        18288,
        // bx lr
        48896
        // nop
      ];
      const needleOffset = instructions.length * 2;
      const onMatchOffset = needleOffset + 4;
      const codeSize = onMatchOffset + 4;
      Memory.patchCode(predicate, codeSize, function(address) {
        instructions.forEach((instruction, index) => {
          address.add(index * 2).writeU16(instruction);
        });
        address.add(needleOffset).writeS32(needle);
        address.add(onMatchOffset).writePointer(onMatchCallback);
      });
      return predicate.or(1);
    },
    arm64: function(needle, onMatch) {
      const size = Process.pageSize;
      const predicate = Memory.alloc(size);
      Memory.protect(predicate, size, "rwx");
      const onMatchCallback = new NativeCallback(onMatch, "void", ["pointer"]);
      predicate._onMatchCallback = onMatchCallback;
      const instructions = [
        3107979265,
        // ldr w1, [x0]
        402653378,
        // ldr w2, =needle
        1795293247,
        // cmp w1, w2
        1409286241,
        // b.ne mismatch
        1476395139,
        // ldr x3, =onMatch
        3592355936,
        // br x3
        3596551104
        // ret
      ];
      const needleOffset = instructions.length * 4;
      const onMatchOffset = needleOffset + 4;
      const codeSize = onMatchOffset + 8;
      Memory.patchCode(predicate, codeSize, function(address) {
        instructions.forEach((instruction, index) => {
          address.add(index * 4).writeU32(instruction);
        });
        address.add(needleOffset).writeS32(needle);
        address.add(onMatchOffset).writePointer(onMatchCallback);
      });
      return predicate;
    }
  };
  function makeObjectVisitorPredicate(needle, onMatch) {
    const factory = objectVisitorPredicateFactories[Process.arch] || makeGenericObjectVisitorPredicate;
    return factory(needle, onMatch);
  }
  function makeGenericObjectVisitorPredicate(needle, onMatch) {
    return new NativeCallback((object) => {
      const klass = object.readS32();
      if (klass === needle) {
        onMatch(object);
      }
    }, "void", ["pointer", "pointer"]);
  }
  function alignPointerOffset(offset) {
    const remainder = offset % pointerSize5;
    if (remainder !== 0) {
      return offset + pointerSize5 - remainder;
    }
    return offset;
  }

  // node_modules/frida-java-bridge/lib/jvm.js
  var jsizeSize2 = 4;
  var { pointerSize: pointerSize6 } = Process;
  var JVM_ACC_NATIVE = 256;
  var JVM_ACC_IS_OLD = 65536;
  var JVM_ACC_IS_OBSOLETE = 131072;
  var JVM_ACC_NOT_C2_COMPILABLE = 33554432;
  var JVM_ACC_NOT_C1_COMPILABLE = 67108864;
  var JVM_ACC_NOT_C2_OSR_COMPILABLE = 134217728;
  var nativeFunctionOptions4 = {
    exceptions: "propagate"
  };
  var getJvmMethodSpec = memoize(_getJvmMethodSpec);
  var getJvmInstanceKlassSpec = memoize(_getJvmInstanceKlassSpec);
  var getJvmThreadSpec = memoize(_getJvmThreadSpec);
  var cachedApi2 = null;
  var manglersScheduled = false;
  var replaceManglers = /* @__PURE__ */ new Map();
  var revertManglers = /* @__PURE__ */ new Map();
  function getApi2() {
    if (cachedApi2 === null) {
      cachedApi2 = _getApi2();
    }
    return cachedApi2;
  }
  function _getApi2() {
    const vmModules = Process.enumerateModules().filter((m2) => /jvm.(dll|dylib|so)$/.test(m2.name));
    if (vmModules.length === 0) {
      return null;
    }
    const vmModule = vmModules[0];
    const temporaryApi = {
      flavor: "jvm"
    };
    const pending = Process.platform === "windows" ? [{
      module: vmModule,
      functions: {
        JNI_GetCreatedJavaVMs: ["JNI_GetCreatedJavaVMs", "int", ["pointer", "int", "pointer"]],
        JVM_Sleep: ["JVM_Sleep", "void", ["pointer", "pointer", "long"]],
        "VMThread::execute": ["VMThread::execute", "void", ["pointer"]],
        "Method::size": ["Method::size", "int", ["int"]],
        "Method::set_native_function": ["Method::set_native_function", "void", ["pointer", "pointer", "int"]],
        "Method::clear_native_function": ["Method::clear_native_function", "void", ["pointer"]],
        "Method::jmethod_id": ["Method::jmethod_id", "pointer", ["pointer"]],
        "ClassLoaderDataGraph::classes_do": ["ClassLoaderDataGraph::classes_do", "void", ["pointer"]],
        "NMethodSweeper::sweep_code_cache": ["NMethodSweeper::sweep_code_cache", "void", []],
        "OopMapCache::flush_obsolete_entries": ["OopMapCache::flush_obsolete_entries", "void", ["pointer"]]
      },
      variables: {
        "VM_RedefineClasses::`vftable'": function(address) {
          this.vtableRedefineClasses = address;
        },
        "VM_RedefineClasses::doit": function(address) {
          this.redefineClassesDoIt = address;
        },
        "VM_RedefineClasses::doit_prologue": function(address) {
          this.redefineClassesDoItPrologue = address;
        },
        "VM_RedefineClasses::doit_epilogue": function(address) {
          this.redefineClassesDoItEpilogue = address;
        },
        "VM_RedefineClasses::allow_nested_vm_operations": function(address) {
          this.redefineClassesAllow = address;
        },
        "NMethodSweeper::_traversals": function(address) {
          this.traversals = address;
        },
        "NMethodSweeper::_should_sweep": function(address) {
          this.shouldSweep = address;
        }
      },
      optionals: []
    }] : [{
      module: vmModule,
      functions: {
        JNI_GetCreatedJavaVMs: ["JNI_GetCreatedJavaVMs", "int", ["pointer", "int", "pointer"]],
        _ZN6Method4sizeEb: ["Method::size", "int", ["int"]],
        _ZN6Method19set_native_functionEPhb: ["Method::set_native_function", "void", ["pointer", "pointer", "int"]],
        _ZN6Method21clear_native_functionEv: ["Method::clear_native_function", "void", ["pointer"]],
        // JDK >= 17
        _ZN6Method24restore_unshareable_infoEP10JavaThread: ["Method::restore_unshareable_info", "void", ["pointer", "pointer"]],
        // JDK < 17
        _ZN6Method24restore_unshareable_infoEP6Thread: ["Method::restore_unshareable_info", "void", ["pointer", "pointer"]],
        _ZN6Method11link_methodERK12methodHandleP10JavaThread: ["Method::link_method", "void", ["pointer", "pointer", "pointer"]],
        _ZN6Method10jmethod_idEv: ["Method::jmethod_id", "pointer", ["pointer"]],
        _ZN6Method10clear_codeEv: function(address) {
          const clearCode = new NativeFunction(address, "void", ["pointer"], nativeFunctionOptions4);
          this["Method::clear_code"] = function(thisPtr) {
            clearCode(thisPtr);
          };
        },
        _ZN6Method10clear_codeEb: function(address) {
          const clearCode = new NativeFunction(address, "void", ["pointer", "int"], nativeFunctionOptions4);
          const lock = 0;
          this["Method::clear_code"] = function(thisPtr) {
            clearCode(thisPtr, lock);
          };
        },
        // JDK >= 13
        _ZN18VM_RedefineClasses19mark_dependent_codeEP13InstanceKlass: ["VM_RedefineClasses::mark_dependent_code", "void", ["pointer", "pointer"]],
        _ZN18VM_RedefineClasses20flush_dependent_codeEv: ["VM_RedefineClasses::flush_dependent_code", "void", []],
        // JDK < 13
        _ZN18VM_RedefineClasses20flush_dependent_codeEP13InstanceKlassP6Thread: ["VM_RedefineClasses::flush_dependent_code", "void", ["pointer", "pointer", "pointer"]],
        // JDK < 10
        _ZN18VM_RedefineClasses20flush_dependent_codeE19instanceKlassHandleP6Thread: ["VM_RedefineClasses::flush_dependent_code", "void", ["pointer", "pointer", "pointer"]],
        _ZN19ResolvedMethodTable21adjust_method_entriesEPb: ["ResolvedMethodTable::adjust_method_entries", "void", ["pointer"]],
        // JDK < 10
        _ZN15MemberNameTable21adjust_method_entriesEP13InstanceKlassPb: ["MemberNameTable::adjust_method_entries", "void", ["pointer", "pointer", "pointer"]],
        _ZN17ConstantPoolCache21adjust_method_entriesEPb: function(address) {
          const adjustMethod = new NativeFunction(address, "void", ["pointer", "pointer"], nativeFunctionOptions4);
          this["ConstantPoolCache::adjust_method_entries"] = function(thisPtr, holderPtr, tracePtr) {
            adjustMethod(thisPtr, tracePtr);
          };
        },
        // JDK < 13
        _ZN17ConstantPoolCache21adjust_method_entriesEP13InstanceKlassPb: function(address) {
          const adjustMethod = new NativeFunction(address, "void", ["pointer", "pointer", "pointer"], nativeFunctionOptions4);
          this["ConstantPoolCache::adjust_method_entries"] = function(thisPtr, holderPtr, tracePtr) {
            adjustMethod(thisPtr, holderPtr, tracePtr);
          };
        },
        _ZN20ClassLoaderDataGraph10classes_doEP12KlassClosure: ["ClassLoaderDataGraph::classes_do", "void", ["pointer"]],
        _ZN20ClassLoaderDataGraph22clean_deallocate_listsEb: ["ClassLoaderDataGraph::clean_deallocate_lists", "void", ["int"]],
        _ZN10JavaThread27thread_from_jni_environmentEP7JNIEnv_: ["JavaThread::thread_from_jni_environment", "pointer", ["pointer"]],
        _ZN8VMThread7executeEP12VM_Operation: ["VMThread::execute", "void", ["pointer"]],
        _ZN11OopMapCache22flush_obsolete_entriesEv: ["OopMapCache::flush_obsolete_entries", "void", ["pointer"]],
        _ZN14NMethodSweeper11force_sweepEv: ["NMethodSweeper::force_sweep", "void", []],
        _ZN14NMethodSweeper16sweep_code_cacheEv: ["NMethodSweeper::sweep_code_cache", "void", []],
        _ZN14NMethodSweeper17sweep_in_progressEv: ["NMethodSweeper::sweep_in_progress", "bool", []],
        JVM_Sleep: ["JVM_Sleep", "void", ["pointer", "pointer", "long"]]
      },
      variables: {
        // JDK <= 9
        _ZN18VM_RedefineClasses14_the_class_oopE: function(address) {
          this.redefineClass = address;
        },
        // 9 < JDK < 13
        _ZN18VM_RedefineClasses10_the_classE: function(address) {
          this.redefineClass = address;
        },
        // JDK < 13
        _ZN18VM_RedefineClasses25AdjustCpoolCacheAndVtable8do_klassEP5Klass: function(address) {
          this.doKlass = address;
        },
        // JDK >= 13
        _ZN18VM_RedefineClasses22AdjustAndCleanMetadata8do_klassEP5Klass: function(address) {
          this.doKlass = address;
        },
        _ZTV18VM_RedefineClasses: function(address) {
          this.vtableRedefineClasses = address;
        },
        _ZN18VM_RedefineClasses4doitEv: function(address) {
          this.redefineClassesDoIt = address;
        },
        _ZN18VM_RedefineClasses13doit_prologueEv: function(address) {
          this.redefineClassesDoItPrologue = address;
        },
        _ZN18VM_RedefineClasses13doit_epilogueEv: function(address) {
          this.redefineClassesDoItEpilogue = address;
        },
        _ZN18VM_RedefineClassesD0Ev: function(address) {
          this.redefineClassesDispose0 = address;
        },
        _ZN18VM_RedefineClassesD1Ev: function(address) {
          this.redefineClassesDispose1 = address;
        },
        _ZNK18VM_RedefineClasses26allow_nested_vm_operationsEv: function(address) {
          this.redefineClassesAllow = address;
        },
        _ZNK18VM_RedefineClasses14print_on_errorEP12outputStream: function(address) {
          this.redefineClassesOnError = address;
        },
        // JDK >= 17
        _ZN13InstanceKlass33create_new_default_vtable_indicesEiP10JavaThread: function(address) {
          this.createNewDefaultVtableIndices = address;
        },
        // JDK < 17
        _ZN13InstanceKlass33create_new_default_vtable_indicesEiP6Thread: function(address) {
          this.createNewDefaultVtableIndices = address;
        },
        _ZN19Abstract_VM_Version19jre_release_versionEv: function(address) {
          const getVersion = new NativeFunction(address, "pointer", [], nativeFunctionOptions4);
          const versionS = getVersion().readCString();
          this.version = versionS.startsWith("1.8") ? 8 : versionS.startsWith("9.") ? 9 : parseInt(versionS.slice(0, 2), 10);
          this.versionS = versionS;
        },
        _ZN14NMethodSweeper11_traversalsE: function(address) {
          this.traversals = address;
        },
        _ZN14NMethodSweeper21_sweep_fractions_leftE: function(address) {
          this.fractions = address;
        },
        _ZN14NMethodSweeper13_should_sweepE: function(address) {
          this.shouldSweep = address;
        }
      },
      optionals: [
        "_ZN6Method24restore_unshareable_infoEP10JavaThread",
        "_ZN6Method24restore_unshareable_infoEP6Thread",
        "_ZN6Method11link_methodERK12methodHandleP10JavaThread",
        "_ZN6Method10clear_codeEv",
        "_ZN6Method10clear_codeEb",
        "_ZN18VM_RedefineClasses19mark_dependent_codeEP13InstanceKlass",
        "_ZN18VM_RedefineClasses20flush_dependent_codeEv",
        "_ZN18VM_RedefineClasses20flush_dependent_codeEP13InstanceKlassP6Thread",
        "_ZN18VM_RedefineClasses20flush_dependent_codeE19instanceKlassHandleP6Thread",
        "_ZN19ResolvedMethodTable21adjust_method_entriesEPb",
        "_ZN15MemberNameTable21adjust_method_entriesEP13InstanceKlassPb",
        "_ZN17ConstantPoolCache21adjust_method_entriesEPb",
        "_ZN17ConstantPoolCache21adjust_method_entriesEP13InstanceKlassPb",
        "_ZN20ClassLoaderDataGraph22clean_deallocate_listsEb",
        "_ZN10JavaThread27thread_from_jni_environmentEP7JNIEnv_",
        "_ZN14NMethodSweeper11force_sweepEv",
        "_ZN14NMethodSweeper17sweep_in_progressEv",
        "_ZN18VM_RedefineClasses14_the_class_oopE",
        "_ZN18VM_RedefineClasses10_the_classE",
        "_ZN18VM_RedefineClasses25AdjustCpoolCacheAndVtable8do_klassEP5Klass",
        "_ZN18VM_RedefineClasses22AdjustAndCleanMetadata8do_klassEP5Klass",
        "_ZN18VM_RedefineClassesD0Ev",
        "_ZN18VM_RedefineClassesD1Ev",
        "_ZNK18VM_RedefineClasses14print_on_errorEP12outputStream",
        "_ZN13InstanceKlass33create_new_default_vtable_indicesEiP10JavaThread",
        "_ZN13InstanceKlass33create_new_default_vtable_indicesEiP6Thread",
        "_ZN14NMethodSweeper21_sweep_fractions_leftE"
      ]
    }];
    const missing = [];
    pending.forEach(function(api2) {
      const module = api2.module;
      const functions = api2.functions || {};
      const variables = api2.variables || {};
      const optionals = new Set(api2.optionals || []);
      const tmp = module.enumerateExports().reduce(function(result, exp) {
        result[exp.name] = exp;
        return result;
      }, {});
      const exportByName = module.enumerateSymbols().reduce(function(result, exp) {
        result[exp.name] = exp;
        return result;
      }, tmp);
      Object.keys(functions).forEach(function(name) {
        const exp = exportByName[name];
        if (exp !== void 0) {
          const signature = functions[name];
          if (typeof signature === "function") {
            signature.call(temporaryApi, exp.address);
          } else {
            temporaryApi[signature[0]] = new NativeFunction(exp.address, signature[1], signature[2], nativeFunctionOptions4);
          }
        } else {
          if (!optionals.has(name)) {
            missing.push(name);
          }
        }
      });
      Object.keys(variables).forEach(function(name) {
        const exp = exportByName[name];
        if (exp !== void 0) {
          const handler = variables[name];
          handler.call(temporaryApi, exp.address);
        } else {
          if (!optionals.has(name)) {
            missing.push(name);
          }
        }
      });
    });
    if (missing.length > 0) {
      throw new Error("Java API only partially available; please file a bug. Missing: " + missing.join(", "));
    }
    const vms = Memory.alloc(pointerSize6);
    const vmCount = Memory.alloc(jsizeSize2);
    checkJniResult("JNI_GetCreatedJavaVMs", temporaryApi.JNI_GetCreatedJavaVMs(vms, 1, vmCount));
    if (vmCount.readInt() === 0) {
      return null;
    }
    temporaryApi.vm = vms.readPointer();
    const allocatorFunctions = Process.platform === "windows" ? {
      $new: ["??2@YAPEAX_K@Z", "pointer", ["ulong"]],
      $delete: ["??3@YAXPEAX@Z", "void", ["pointer"]]
    } : {
      $new: ["_Znwm", "pointer", ["ulong"]],
      $delete: ["_ZdlPv", "void", ["pointer"]]
    };
    for (const [name, [rawName, retType, argTypes]] of Object.entries(allocatorFunctions)) {
      let address = Module.findGlobalExportByName(rawName);
      if (address === null) {
        address = DebugSymbol.fromName(rawName).address;
        if (address.isNull()) {
          throw new Error(`unable to find C++ allocator API, missing: '${rawName}'`);
        }
      }
      temporaryApi[name] = new NativeFunction(address, retType, argTypes, nativeFunctionOptions4);
    }
    temporaryApi.jvmti = getEnvJvmti(temporaryApi);
    if (temporaryApi["JavaThread::thread_from_jni_environment"] === void 0) {
      temporaryApi["JavaThread::thread_from_jni_environment"] = makeThreadFromJniHelper(temporaryApi);
    }
    return temporaryApi;
  }
  function getEnvJvmti(api2) {
    const vm3 = new VM(api2);
    let env;
    vm3.perform(() => {
      const handle = vm3.tryGetEnvHandle(jvmtiVersion.v1_0);
      if (handle === null) {
        throw new Error("JVMTI not available");
      }
      env = new EnvJvmti(handle, vm3);
      const capaBuf = Memory.alloc(8);
      capaBuf.writeU64(jvmtiCapabilities.canTagObjects);
      const result = env.addCapabilities(capaBuf);
      checkJniResult("getEnvJvmti::AddCapabilities", result);
    });
    return env;
  }
  var threadOffsetParsers = {
    x64: parseX64ThreadOffset
  };
  function makeThreadFromJniHelper(api2) {
    let offset = null;
    const tryParse = threadOffsetParsers[Process.arch];
    if (tryParse !== void 0) {
      const vm3 = new VM(api2);
      const findClassImpl = vm3.perform((env) => env.handle.readPointer().add(6 * pointerSize6).readPointer());
      offset = parseInstructionsAt(findClassImpl, tryParse, { limit: 11 });
    }
    if (offset === null) {
      return () => {
        throw new Error("Unable to make thread_from_jni_environment() helper for the current architecture");
      };
    }
    return (env) => {
      return env.add(offset);
    };
  }
  function parseX64ThreadOffset(insn) {
    if (insn.mnemonic !== "lea") {
      return null;
    }
    const { base, disp } = insn.operands[1].value;
    if (!(base === "rdi" && disp < 0)) {
      return null;
    }
    return disp;
  }
  function ensureClassInitialized2(env, classRef) {
  }
  var JvmMethodMangler = class {
    constructor(methodId) {
      this.methodId = methodId;
      this.method = methodId.readPointer();
      this.originalMethod = null;
      this.newMethod = null;
      this.resolved = null;
      this.impl = null;
      this.key = methodId.toString(16);
    }
    replace(impl, isInstanceMethod, argTypes, vm3, api2) {
      const { key } = this;
      const mangler = revertManglers.get(key);
      if (mangler !== void 0) {
        revertManglers.delete(key);
        this.method = mangler.method;
        this.originalMethod = mangler.originalMethod;
        this.newMethod = mangler.newMethod;
        this.resolved = mangler.resolved;
      }
      this.impl = impl;
      replaceManglers.set(key, this);
      ensureManglersScheduled(vm3);
    }
    revert(vm3) {
      const { key } = this;
      replaceManglers.delete(key);
      revertManglers.set(key, this);
      ensureManglersScheduled(vm3);
    }
    resolveTarget(wrapper, isInstanceMethod, env, api2) {
      const { resolved, originalMethod, methodId } = this;
      if (resolved !== null) {
        return resolved;
      }
      if (originalMethod === null) {
        return methodId;
      }
      const vip = originalMethod.oldMethod.vtableIndexPtr;
      vip.writeS32(-2);
      const jmethodID = Memory.alloc(pointerSize6);
      jmethodID.writePointer(this.method);
      this.resolved = jmethodID;
      return jmethodID;
    }
  };
  function ensureManglersScheduled(vm3) {
    if (!manglersScheduled) {
      manglersScheduled = true;
      Script.nextTick(doManglers, vm3);
    }
  }
  function doManglers(vm3) {
    const localReplaceManglers = new Map(replaceManglers);
    const localRevertManglers = new Map(revertManglers);
    replaceManglers.clear();
    revertManglers.clear();
    manglersScheduled = false;
    vm3.perform((env) => {
      const api2 = getApi2();
      const thread = api2["JavaThread::thread_from_jni_environment"](env.handle);
      let force = false;
      withJvmThread(() => {
        localReplaceManglers.forEach((mangler) => {
          const { method, originalMethod, impl, methodId, newMethod } = mangler;
          if (originalMethod === null) {
            mangler.originalMethod = fetchJvmMethod(method);
            mangler.newMethod = nativeJvmMethod(method, impl, thread);
            installJvmMethod(mangler.newMethod, methodId, thread);
          } else {
            api2["Method::set_native_function"](newMethod.method, impl, 0);
          }
        });
        localRevertManglers.forEach((mangler) => {
          const { originalMethod, methodId, newMethod } = mangler;
          if (originalMethod !== null) {
            revertJvmMethod(originalMethod);
            const revert = originalMethod.oldMethod;
            revert.oldMethod = newMethod;
            installJvmMethod(revert, methodId, thread);
            force = true;
          }
        });
      });
      if (force) {
        forceSweep(env.handle);
      }
    });
  }
  function forceSweep(env) {
    const {
      fractions,
      shouldSweep,
      traversals,
      "NMethodSweeper::sweep_code_cache": sweep,
      "NMethodSweeper::sweep_in_progress": inProgress,
      "NMethodSweeper::force_sweep": force,
      JVM_Sleep: sleep
    } = getApi2();
    if (force !== void 0) {
      Thread.sleep(0.05);
      force();
      Thread.sleep(0.05);
      force();
    } else {
      let trav = traversals.readS64();
      const endTrav = trav + 2;
      while (endTrav > trav) {
        fractions.writeS32(1);
        sleep(env, NULL, 50);
        if (!inProgress()) {
          withJvmThread(() => {
            Thread.sleep(0.05);
          });
        }
        const sweepNotAlreadyInProgress = shouldSweep.readU8() === 0;
        if (sweepNotAlreadyInProgress) {
          fractions.writeS32(1);
          sweep();
        }
        trav = traversals.readS64();
      }
    }
  }
  function withJvmThread(fn, fnPrologue, fnEpilogue) {
    const {
      execute,
      vtable: vtable2,
      vtableSize,
      doItOffset,
      prologueOffset,
      epilogueOffset
    } = getJvmThreadSpec();
    const vtableDup = Memory.dup(vtable2, vtableSize);
    const vmOperation = Memory.alloc(pointerSize6 * 25);
    vmOperation.writePointer(vtableDup);
    const doIt = new NativeCallback(fn, "void", ["pointer"]);
    vtableDup.add(doItOffset).writePointer(doIt);
    let prologue = null;
    if (fnPrologue !== void 0) {
      prologue = new NativeCallback(fnPrologue, "int", ["pointer"]);
      vtableDup.add(prologueOffset).writePointer(prologue);
    }
    let epilogue = null;
    if (fnEpilogue !== void 0) {
      epilogue = new NativeCallback(fnEpilogue, "void", ["pointer"]);
      vtableDup.add(epilogueOffset).writePointer(epilogue);
    }
    execute(vmOperation);
  }
  function _getJvmThreadSpec() {
    const {
      vtableRedefineClasses,
      redefineClassesDoIt,
      redefineClassesDoItPrologue,
      redefineClassesDoItEpilogue,
      redefineClassesOnError,
      redefineClassesAllow,
      redefineClassesDispose0,
      redefineClassesDispose1,
      "VMThread::execute": execute
    } = getApi2();
    const vtablePtr = vtableRedefineClasses.add(2 * pointerSize6);
    const vtableSize = 15 * pointerSize6;
    const vtable2 = Memory.dup(vtablePtr, vtableSize);
    const emptyCallback = new NativeCallback(() => {
    }, "void", ["pointer"]);
    let doItOffset, prologueOffset, epilogueOffset;
    for (let offset = 0; offset !== vtableSize; offset += pointerSize6) {
      const element = vtable2.add(offset);
      const value = element.readPointer();
      if (redefineClassesOnError !== void 0 && value.equals(redefineClassesOnError) || redefineClassesDispose0 !== void 0 && value.equals(redefineClassesDispose0) || redefineClassesDispose1 !== void 0 && value.equals(redefineClassesDispose1)) {
        element.writePointer(emptyCallback);
      } else if (value.equals(redefineClassesDoIt)) {
        doItOffset = offset;
      } else if (value.equals(redefineClassesDoItPrologue)) {
        prologueOffset = offset;
        element.writePointer(redefineClassesAllow);
      } else if (value.equals(redefineClassesDoItEpilogue)) {
        epilogueOffset = offset;
        element.writePointer(emptyCallback);
      }
    }
    return {
      execute,
      emptyCallback,
      vtable: vtable2,
      vtableSize,
      doItOffset,
      prologueOffset,
      epilogueOffset
    };
  }
  function makeMethodMangler2(methodId) {
    return new JvmMethodMangler(methodId);
  }
  function installJvmMethod(method, methodId, thread) {
    const { method: handle, oldMethod: old } = method;
    const api2 = getApi2();
    method.methodsArray.add(method.methodIndex * pointerSize6).writePointer(handle);
    if (method.vtableIndex >= 0) {
      method.vtable.add(method.vtableIndex * pointerSize6).writePointer(handle);
    }
    methodId.writePointer(handle);
    old.accessFlagsPtr.writeU32((old.accessFlags | JVM_ACC_IS_OLD | JVM_ACC_IS_OBSOLETE) >>> 0);
    const flushObs = api2["OopMapCache::flush_obsolete_entries"];
    if (flushObs !== void 0) {
      const { oopMapCache } = method;
      if (!oopMapCache.isNull()) {
        flushObs(oopMapCache);
      }
    }
    const mark = api2["VM_RedefineClasses::mark_dependent_code"];
    const flush = api2["VM_RedefineClasses::flush_dependent_code"];
    if (mark !== void 0) {
      mark(NULL, method.instanceKlass);
      flush();
    } else {
      flush(NULL, method.instanceKlass, thread);
    }
    const traceNamePrinted = Memory.alloc(1);
    traceNamePrinted.writeU8(1);
    api2["ConstantPoolCache::adjust_method_entries"](method.cache, method.instanceKlass, traceNamePrinted);
    const klassClosure = Memory.alloc(3 * pointerSize6);
    const doKlassPtr = Memory.alloc(pointerSize6);
    doKlassPtr.writePointer(api2.doKlass);
    klassClosure.writePointer(doKlassPtr);
    klassClosure.add(pointerSize6).writePointer(thread);
    klassClosure.add(2 * pointerSize6).writePointer(thread);
    if (api2.redefineClass !== void 0) {
      api2.redefineClass.writePointer(method.instanceKlass);
    }
    api2["ClassLoaderDataGraph::classes_do"](klassClosure);
    const rmtAdjustMethodEntries = api2["ResolvedMethodTable::adjust_method_entries"];
    if (rmtAdjustMethodEntries !== void 0) {
      rmtAdjustMethodEntries(traceNamePrinted);
    } else {
      const { memberNames } = method;
      if (!memberNames.isNull()) {
        const mntAdjustMethodEntries = api2["MemberNameTable::adjust_method_entries"];
        if (mntAdjustMethodEntries !== void 0) {
          mntAdjustMethodEntries(memberNames, method.instanceKlass, traceNamePrinted);
        }
      }
    }
    const clean = api2["ClassLoaderDataGraph::clean_deallocate_lists"];
    if (clean !== void 0) {
      clean(0);
    }
  }
  function nativeJvmMethod(method, impl, thread) {
    const api2 = getApi2();
    const newMethod = fetchJvmMethod(method);
    newMethod.constPtr.writePointer(newMethod.const);
    const flags = (newMethod.accessFlags | JVM_ACC_NATIVE | JVM_ACC_NOT_C2_COMPILABLE | JVM_ACC_NOT_C1_COMPILABLE | JVM_ACC_NOT_C2_OSR_COMPILABLE) >>> 0;
    newMethod.accessFlagsPtr.writeU32(flags);
    newMethod.signatureHandler.writePointer(NULL);
    newMethod.adapter.writePointer(NULL);
    newMethod.i2iEntry.writePointer(NULL);
    api2["Method::clear_code"](newMethod.method);
    newMethod.dataPtr.writePointer(NULL);
    newMethod.countersPtr.writePointer(NULL);
    newMethod.stackmapPtr.writePointer(NULL);
    api2["Method::clear_native_function"](newMethod.method);
    api2["Method::set_native_function"](newMethod.method, impl, 0);
    api2["Method::restore_unshareable_info"](newMethod.method, thread);
    if (api2.version >= 17) {
      const methodHandle = Memory.alloc(2 * pointerSize6);
      methodHandle.writePointer(newMethod.method);
      methodHandle.add(pointerSize6).writePointer(thread);
      api2["Method::link_method"](newMethod.method, methodHandle, thread);
    }
    return newMethod;
  }
  function fetchJvmMethod(method) {
    const spec = getJvmMethodSpec();
    const constMethod = method.add(spec.method.constMethodOffset).readPointer();
    const constMethodSize = constMethod.add(spec.constMethod.sizeOffset).readS32() * pointerSize6;
    const newConstMethod = Memory.alloc(constMethodSize + spec.method.size);
    Memory.copy(newConstMethod, constMethod, constMethodSize);
    const newMethod = newConstMethod.add(constMethodSize);
    Memory.copy(newMethod, method, spec.method.size);
    const result = readJvmMethod(newMethod, newConstMethod, constMethodSize);
    const oldMethod = readJvmMethod(method, constMethod, constMethodSize);
    result.oldMethod = oldMethod;
    return result;
  }
  function readJvmMethod(method, constMethod, constMethodSize) {
    const api2 = getApi2();
    const spec = getJvmMethodSpec();
    const constPtr = method.add(spec.method.constMethodOffset);
    const dataPtr = method.add(spec.method.methodDataOffset);
    const countersPtr = method.add(spec.method.methodCountersOffset);
    const accessFlagsPtr = method.add(spec.method.accessFlagsOffset);
    const accessFlags = accessFlagsPtr.readU32();
    const adapter = spec.getAdapterPointer(method, constMethod);
    const i2iEntry = method.add(spec.method.i2iEntryOffset);
    const signatureHandler = method.add(spec.method.signatureHandlerOffset);
    const constantPool = constMethod.add(spec.constMethod.constantPoolOffset).readPointer();
    const stackmapPtr = constMethod.add(spec.constMethod.stackmapDataOffset);
    const instanceKlass = constantPool.add(spec.constantPool.instanceKlassOffset).readPointer();
    const cache = constantPool.add(spec.constantPool.cacheOffset).readPointer();
    const instanceKlassSpec = getJvmInstanceKlassSpec();
    const methods = instanceKlass.add(instanceKlassSpec.methodsOffset).readPointer();
    const methodsCount = methods.readS32();
    const methodsArray = methods.add(pointerSize6);
    const methodIndex = constMethod.add(spec.constMethod.methodIdnumOffset).readU16();
    const vtableIndexPtr = method.add(spec.method.vtableIndexOffset);
    const vtableIndex = vtableIndexPtr.readS32();
    const vtable2 = instanceKlass.add(instanceKlassSpec.vtableOffset);
    const oopMapCache = instanceKlass.add(instanceKlassSpec.oopMapCacheOffset).readPointer();
    const memberNames = api2.version >= 10 ? instanceKlass.add(instanceKlassSpec.memberNamesOffset).readPointer() : NULL;
    return {
      method,
      methodSize: spec.method.size,
      const: constMethod,
      constSize: constMethodSize,
      constPtr,
      dataPtr,
      countersPtr,
      stackmapPtr,
      instanceKlass,
      methodsArray,
      methodsCount,
      methodIndex,
      vtableIndex,
      vtableIndexPtr,
      vtable: vtable2,
      accessFlags,
      accessFlagsPtr,
      adapter,
      i2iEntry,
      signatureHandler,
      memberNames,
      cache,
      oopMapCache
    };
  }
  function revertJvmMethod(method) {
    const { oldMethod: old } = method;
    old.accessFlagsPtr.writeU32(old.accessFlags);
    old.vtableIndexPtr.writeS32(old.vtableIndex);
  }
  function _getJvmMethodSpec() {
    const api2 = getApi2();
    const { version } = api2;
    let adapterHandlerLocation;
    if (version >= 17) {
      adapterHandlerLocation = "method:early";
    } else if (version >= 9 && version <= 16) {
      adapterHandlerLocation = "const-method";
    } else {
      adapterHandlerLocation = "method:late";
    }
    const isNative = 1;
    const methodSize = api2["Method::size"](isNative) * pointerSize6;
    const constMethodOffset = pointerSize6;
    const methodDataOffset = 2 * pointerSize6;
    const methodCountersOffset = 3 * pointerSize6;
    const adapterInMethodEarlyOffset = 4 * pointerSize6;
    const adapterInMethodEarlySize = adapterHandlerLocation === "method:early" ? pointerSize6 : 0;
    const accessFlagsOffset = adapterInMethodEarlyOffset + adapterInMethodEarlySize;
    const vtableIndexOffset = accessFlagsOffset + 4;
    const i2iEntryOffset = vtableIndexOffset + 4 + 8;
    const adapterInMethodLateOffset = i2iEntryOffset + pointerSize6;
    const adapterInMethodOffset = adapterInMethodEarlySize !== 0 ? adapterInMethodEarlyOffset : adapterInMethodLateOffset;
    const nativeFunctionOffset = methodSize - 2 * pointerSize6;
    const signatureHandlerOffset = methodSize - pointerSize6;
    const constantPoolOffset = 8;
    const stackmapDataOffset = constantPoolOffset + pointerSize6;
    const adapterInConstMethodOffset = stackmapDataOffset + pointerSize6;
    const adapterInConstMethodSize = adapterHandlerLocation === "const-method" ? pointerSize6 : 0;
    const constMethodSizeOffset = adapterInConstMethodOffset + adapterInConstMethodSize;
    const methodIdnumOffset = constMethodSizeOffset + 14;
    const cacheOffset = 2 * pointerSize6;
    const instanceKlassOffset = 3 * pointerSize6;
    const getAdapterPointer = adapterInConstMethodSize !== 0 ? function(method, constMethod) {
      return constMethod.add(adapterInConstMethodOffset);
    } : function(method, constMethod) {
      return method.add(adapterInMethodOffset);
    };
    return {
      getAdapterPointer,
      method: {
        size: methodSize,
        constMethodOffset,
        methodDataOffset,
        methodCountersOffset,
        accessFlagsOffset,
        vtableIndexOffset,
        i2iEntryOffset,
        nativeFunctionOffset,
        signatureHandlerOffset
      },
      constMethod: {
        constantPoolOffset,
        stackmapDataOffset,
        sizeOffset: constMethodSizeOffset,
        methodIdnumOffset
      },
      constantPool: {
        cacheOffset,
        instanceKlassOffset
      }
    };
  }
  var vtableOffsetParsers = {
    x64: parseX64VTableOffset
  };
  function _getJvmInstanceKlassSpec() {
    const { version: jvmVersion, createNewDefaultVtableIndices } = getApi2();
    const tryParse = vtableOffsetParsers[Process.arch];
    if (tryParse === void 0) {
      throw new Error(`Missing vtable offset parser for ${Process.arch}`);
    }
    const vtableOffset = parseInstructionsAt(createNewDefaultVtableIndices, tryParse, { limit: 32 });
    if (vtableOffset === null) {
      throw new Error("Unable to deduce vtable offset");
    }
    const oopMultiplier = jvmVersion >= 10 && jvmVersion <= 11 || jvmVersion >= 15 ? 17 : 18;
    const methodsOffset = vtableOffset - 7 * pointerSize6;
    const memberNamesOffset = vtableOffset - 17 * pointerSize6;
    const oopMapCacheOffset = vtableOffset - oopMultiplier * pointerSize6;
    return {
      vtableOffset,
      methodsOffset,
      memberNamesOffset,
      oopMapCacheOffset
    };
  }
  function parseX64VTableOffset(insn) {
    if (insn.mnemonic !== "mov") {
      return null;
    }
    const dst = insn.operands[0];
    if (dst.type !== "mem") {
      return null;
    }
    const { value: dstValue } = dst;
    if (dstValue.scale !== 1) {
      return null;
    }
    const { disp } = dstValue;
    if (disp < 256) {
      return null;
    }
    const defaultVtableIndicesOffset = disp;
    return defaultVtableIndicesOffset + 16;
  }

  // node_modules/frida-java-bridge/lib/api.js
  var getApi3 = getApi;
  try {
    getAndroidVersion();
  } catch (e2) {
    getApi3 = getApi2;
  }
  var api_default = getApi3;

  // node_modules/frida-java-bridge/lib/class-model.js
  var code = `#include <json-glib/json-glib.h>
#include <string.h>

#define kAccStatic 0x0008
#define kAccConstructor 0x00010000

typedef struct _Model Model;
typedef struct _EnumerateMethodsContext EnumerateMethodsContext;

typedef struct _JavaApi JavaApi;
typedef struct _JavaClassApi JavaClassApi;
typedef struct _JavaMethodApi JavaMethodApi;
typedef struct _JavaFieldApi JavaFieldApi;

typedef struct _JNIEnv JNIEnv;
typedef guint8 jboolean;
typedef gint32 jint;
typedef jint jsize;
typedef gpointer jobject;
typedef jobject jclass;
typedef jobject jstring;
typedef jobject jarray;
typedef jarray jobjectArray;
typedef gpointer jfieldID;
typedef gpointer jmethodID;

typedef struct _jvmtiEnv jvmtiEnv;
typedef enum
{
  JVMTI_ERROR_NONE = 0
} jvmtiError;

typedef struct _ArtApi ArtApi;
typedef guint32 ArtHeapReference;
typedef struct _ArtObject ArtObject;
typedef struct _ArtClass ArtClass;
typedef struct _ArtClassLinker ArtClassLinker;
typedef struct _ArtClassVisitor ArtClassVisitor;
typedef struct _ArtClassVisitorVTable ArtClassVisitorVTable;
typedef struct _ArtMethod ArtMethod;
typedef struct _ArtString ArtString;

typedef union _StdString StdString;
typedef struct _StdStringShort StdStringShort;
typedef struct _StdStringLong StdStringLong;

typedef void (* ArtVisitClassesFunc) (ArtClassLinker * linker, ArtClassVisitor * visitor);
typedef const char * (* ArtGetClassDescriptorFunc) (ArtClass * klass, StdString * storage);
typedef void (* ArtPrettyMethodFunc) (StdString * result, ArtMethod * method, jboolean with_signature);

struct _Model
{
  GHashTable * members;
};

struct _EnumerateMethodsContext
{
  GPatternSpec * class_query;
  GPatternSpec * method_query;
  jboolean include_signature;
  jboolean ignore_case;
  jboolean skip_system_classes;
  GHashTable * groups;
};

struct _JavaClassApi
{
  jmethodID get_declared_methods;
  jmethodID get_declared_fields;
};

struct _JavaMethodApi
{
  jmethodID get_name;
  jmethodID get_modifiers;
};

struct _JavaFieldApi
{
  jmethodID get_name;
  jmethodID get_modifiers;
};

struct _JavaApi
{
  jvmtiEnv * jvmti;
  JavaClassApi clazz;
  JavaMethodApi method;
  JavaFieldApi field;
};

struct _JNIEnv
{
  gpointer * functions;
};

struct _jvmtiEnv
{
  gpointer * functions;
};

struct _ArtApi
{
  gboolean available;

  guint class_offset_ifields;
  guint class_offset_methods;
  guint class_offset_sfields;
  guint class_offset_copied_methods_offset;

  guint method_size;
  guint method_offset_access_flags;

  guint field_size;
  guint field_offset_access_flags;

  guint alignment_padding;

  ArtClassLinker * linker;
  ArtVisitClassesFunc visit_classes;
  ArtGetClassDescriptorFunc get_class_descriptor;
  ArtPrettyMethodFunc pretty_method;

  void (* free) (gpointer mem);
};

struct _ArtObject
{
  ArtHeapReference klass;
  ArtHeapReference monitor;
};

struct _ArtClass
{
  ArtObject parent;

  ArtHeapReference class_loader;
};

struct _ArtClassVisitor
{
  ArtClassVisitorVTable * vtable;
  gpointer user_data;
};

struct _ArtClassVisitorVTable
{
  void (* reserved1) (ArtClassVisitor * self);
  void (* reserved2) (ArtClassVisitor * self);
  jboolean (* visit) (ArtClassVisitor * self, ArtClass * klass);
};

struct _ArtString
{
  ArtObject parent;

  gint32 count;
  guint32 hash_code;

  union
  {
    guint16 value[0];
    guint8 value_compressed[0];
  };
};

struct _StdStringShort
{
  guint8 size;
  gchar data[(3 * sizeof (gpointer)) - sizeof (guint8)];
};

struct _StdStringLong
{
  gsize capacity;
  gsize size;
  gchar * data;
};

union _StdString
{
  StdStringShort s;
  StdStringLong l;
};

static void model_add_method (Model * self, const gchar * name, jmethodID id, jint modifiers);
static void model_add_field (Model * self, const gchar * name, jfieldID id, jint modifiers);
static void model_free (Model * model);

static jboolean collect_matching_class_methods (ArtClassVisitor * self, ArtClass * klass);
static gchar * finalize_method_groups_to_json (GHashTable * groups);
static GPatternSpec * make_pattern_spec (const gchar * pattern, jboolean ignore_case);
static gchar * class_name_from_signature (const gchar * signature);
static gchar * format_method_signature (const gchar * name, const gchar * signature);
static void append_type (GString * output, const gchar ** type);

static gpointer read_art_array (gpointer object_base, guint field_offset, guint length_size, guint * length);

static void std_string_destroy (StdString * str);
static gchar * std_string_c_str (StdString * self);

extern GMutex lock;
extern GArray * models;
extern JavaApi java_api;
extern ArtApi art_api;

void
init (void)
{
  g_mutex_init (&lock);
  models = g_array_new (FALSE, FALSE, sizeof (Model *));
}

void
finalize (void)
{
  guint n, i;

  n = models->len;
  for (i = 0; i != n; i++)
  {
    Model * model = g_array_index (models, Model *, i);
    model_free (model);
  }

  g_array_unref (models);
  g_mutex_clear (&lock);
}

Model *
model_new (jclass class_handle,
           gpointer class_object,
           JNIEnv * env)
{
  Model * model;
  GHashTable * members;
  jvmtiEnv * jvmti = java_api.jvmti;
  gpointer * funcs = env->functions;
  jmethodID (* from_reflected_method) (JNIEnv *, jobject) = funcs[7];
  jfieldID (* from_reflected_field) (JNIEnv *, jobject) = funcs[8];
  jobject (* to_reflected_method) (JNIEnv *, jclass, jmethodID, jboolean) = funcs[9];
  jobject (* to_reflected_field) (JNIEnv *, jclass, jfieldID, jboolean) = funcs[12];
  void (* delete_local_ref) (JNIEnv *, jobject) = funcs[23];
  jobject (* call_object_method) (JNIEnv *, jobject, jmethodID, ...) = funcs[34];
  jint (* call_int_method) (JNIEnv *, jobject, jmethodID, ...) = funcs[49];
  const char * (* get_string_utf_chars) (JNIEnv *, jstring, jboolean *) = funcs[169];
  void (* release_string_utf_chars) (JNIEnv *, jstring, const char *) = funcs[170];
  jsize (* get_array_length) (JNIEnv *, jarray) = funcs[171];
  jobject (* get_object_array_element) (JNIEnv *, jobjectArray, jsize) = funcs[173];
  jsize n, i;

  model = g_new (Model, 1);

  members = g_hash_table_new_full (g_str_hash, g_str_equal, g_free, g_free);
  model->members = members;

  if (jvmti != NULL)
  {
    gpointer * jf = jvmti->functions - 1;
    jvmtiError (* deallocate) (jvmtiEnv *, void * mem) = jf[47];
    jvmtiError (* get_class_methods) (jvmtiEnv *, jclass, jint *, jmethodID **) = jf[52];
    jvmtiError (* get_class_fields) (jvmtiEnv *, jclass, jint *, jfieldID **) = jf[53];
    jvmtiError (* get_field_name) (jvmtiEnv *, jclass, jfieldID, char **, char **, char **) = jf[60];
    jvmtiError (* get_field_modifiers) (jvmtiEnv *, jclass, jfieldID, jint *) = jf[62];
    jvmtiError (* get_method_name) (jvmtiEnv *, jmethodID, char **, char **, char **) = jf[64];
    jvmtiError (* get_method_modifiers) (jvmtiEnv *, jmethodID, jint *) = jf[66];
    jint method_count;
    jmethodID * methods;
    jint field_count;
    jfieldID * fields;
    char * name;
    jint modifiers;

    get_class_methods (jvmti, class_handle, &method_count, &methods);
    for (i = 0; i != method_count; i++)
    {
      jmethodID method = methods[i];

      get_method_name (jvmti, method, &name, NULL, NULL);
      get_method_modifiers (jvmti, method, &modifiers);

      model_add_method (model, name, method, modifiers);

      deallocate (jvmti, name);
    }
    deallocate (jvmti, methods);

    get_class_fields (jvmti, class_handle, &field_count, &fields);
    for (i = 0; i != field_count; i++)
    {
      jfieldID field = fields[i];

      get_field_name (jvmti, class_handle, field, &name, NULL, NULL);
      get_field_modifiers (jvmti, class_handle, field, &modifiers);

      model_add_field (model, name, field, modifiers);

      deallocate (jvmti, name);
    }
    deallocate (jvmti, fields);
  }
  else if (art_api.available)
  {
    gpointer elements;
    guint n, i;
    const guint field_arrays[] = {
      art_api.class_offset_ifields,
      art_api.class_offset_sfields
    };
    guint field_array_cursor;
    gboolean merged_fields = art_api.class_offset_sfields == 0;

    elements = read_art_array (class_object, art_api.class_offset_methods, sizeof (gsize), NULL);
    n = *(guint16 *) (class_object + art_api.class_offset_copied_methods_offset);
    for (i = 0; i != n; i++)
    {
      jmethodID id;
      guint32 access_flags;
      jboolean is_static;
      jobject method, name;
      const char * name_str;
      jint modifiers;

      id = elements + (i * art_api.method_size);

      access_flags = *(guint32 *) (id + art_api.method_offset_access_flags);
      if ((access_flags & kAccConstructor) != 0)
        continue;
      is_static = (access_flags & kAccStatic) != 0;
      method = to_reflected_method (env, class_handle, id, is_static);
      name = call_object_method (env, method, java_api.method.get_name);
      name_str = get_string_utf_chars (env, name, NULL);
      modifiers = access_flags & 0xffff;

      model_add_method (model, name_str, id, modifiers);

      release_string_utf_chars (env, name, name_str);
      delete_local_ref (env, name);
      delete_local_ref (env, method);
    }

    for (field_array_cursor = 0; field_array_cursor != G_N_ELEMENTS (field_arrays); field_array_cursor++)
    {
      jboolean is_static;

      if (field_arrays[field_array_cursor] == 0)
        continue;

      if (!merged_fields)
        is_static = field_array_cursor == 1;

      elements = read_art_array (class_object, field_arrays[field_array_cursor], sizeof (guint32), &n);
      for (i = 0; i != n; i++)
      {
        jfieldID id;
        guint32 access_flags;
        jobject field, name;
        const char * name_str;
        jint modifiers;

        id = elements + (i * art_api.field_size);

        access_flags = *(guint32 *) (id + art_api.field_offset_access_flags);
        if (merged_fields)
          is_static = (access_flags & kAccStatic) != 0;
        field = to_reflected_field (env, class_handle, id, is_static);
        name = call_object_method (env, field, java_api.field.get_name);
        name_str = get_string_utf_chars (env, name, NULL);
        modifiers = access_flags & 0xffff;

        model_add_field (model, name_str, id, modifiers);

        release_string_utf_chars (env, name, name_str);
        delete_local_ref (env, name);
        delete_local_ref (env, field);
      }
    }
  }
  else
  {
    jobject elements;

    elements = call_object_method (env, class_handle, java_api.clazz.get_declared_methods);
    n = get_array_length (env, elements);
    for (i = 0; i != n; i++)
    {
      jobject method, name;
      const char * name_str;
      jmethodID id;
      jint modifiers;

      method = get_object_array_element (env, elements, i);
      name = call_object_method (env, method, java_api.method.get_name);
      name_str = get_string_utf_chars (env, name, NULL);
      id = from_reflected_method (env, method);
      modifiers = call_int_method (env, method, java_api.method.get_modifiers);

      model_add_method (model, name_str, id, modifiers);

      release_string_utf_chars (env, name, name_str);
      delete_local_ref (env, name);
      delete_local_ref (env, method);
    }
    delete_local_ref (env, elements);

    elements = call_object_method (env, class_handle, java_api.clazz.get_declared_fields);
    n = get_array_length (env, elements);
    for (i = 0; i != n; i++)
    {
      jobject field, name;
      const char * name_str;
      jfieldID id;
      jint modifiers;

      field = get_object_array_element (env, elements, i);
      name = call_object_method (env, field, java_api.field.get_name);
      name_str = get_string_utf_chars (env, name, NULL);
      id = from_reflected_field (env, field);
      modifiers = call_int_method (env, field, java_api.field.get_modifiers);

      model_add_field (model, name_str, id, modifiers);

      release_string_utf_chars (env, name, name_str);
      delete_local_ref (env, name);
      delete_local_ref (env, field);
    }
    delete_local_ref (env, elements);
  }

  g_mutex_lock (&lock);
  g_array_append_val (models, model);
  g_mutex_unlock (&lock);

  return model;
}

static void
model_add_method (Model * self,
                  const gchar * name,
                  jmethodID id,
                  jint modifiers)
{
  GHashTable * members = self->members;
  gchar * key, type;
  const gchar * value;

  if (name[0] == '$')
    key = g_strdup_printf ("_%s", name);
  else
    key = g_strdup (name);

  type = (modifiers & kAccStatic) != 0 ? 's' : 'i';

  value = g_hash_table_lookup (members, key);
  if (value == NULL)
    g_hash_table_insert (members, key, g_strdup_printf ("m:%c0x%zx", type, id));
  else
    g_hash_table_insert (members, key, g_strdup_printf ("%s:%c0x%zx", value, type, id));
}

static void
model_add_field (Model * self,
                 const gchar * name,
                 jfieldID id,
                 jint modifiers)
{
  GHashTable * members = self->members;
  gchar * key, type;

  if (name[0] == '$')
    key = g_strdup_printf ("_%s", name);
  else
    key = g_strdup (name);
  while (g_hash_table_contains (members, key))
  {
    gchar * new_key = g_strdup_printf ("_%s", key);
    g_free (key);
    key = new_key;
  }

  type = (modifiers & kAccStatic) != 0 ? 's' : 'i';

  g_hash_table_insert (members, key, g_strdup_printf ("f:%c0x%zx", type, id));
}

static void
model_free (Model * model)
{
  g_hash_table_unref (model->members);

  g_free (model);
}

gboolean
model_has (Model * self,
           const gchar * member)
{
  return g_hash_table_contains (self->members, member);
}

const gchar *
model_find (Model * self,
            const gchar * member)
{
  return g_hash_table_lookup (self->members, member);
}

gchar *
model_list (Model * self)
{
  GString * result;
  GHashTableIter iter;
  guint i;
  const gchar * name;

  result = g_string_sized_new (128);

  g_string_append_c (result, '[');

  g_hash_table_iter_init (&iter, self->members);
  for (i = 0; g_hash_table_iter_next (&iter, (gpointer *) &name, NULL); i++)
  {
    if (i > 0)
      g_string_append_c (result, ',');

    g_string_append_c (result, '"');
    g_string_append (result, name);
    g_string_append_c (result, '"');
  }

  g_string_append_c (result, ']');

  return g_string_free (result, FALSE);
}

gchar *
enumerate_methods_art (const gchar * class_query,
                       const gchar * method_query,
                       jboolean include_signature,
                       jboolean ignore_case,
                       jboolean skip_system_classes)
{
  gchar * result;
  EnumerateMethodsContext ctx;
  ArtClassVisitor visitor;
  ArtClassVisitorVTable visitor_vtable = { NULL, };

  ctx.class_query = make_pattern_spec (class_query, ignore_case);
  ctx.method_query = make_pattern_spec (method_query, ignore_case);
  ctx.include_signature = include_signature;
  ctx.ignore_case = ignore_case;
  ctx.skip_system_classes = skip_system_classes;
  ctx.groups = g_hash_table_new_full (NULL, NULL, NULL, NULL);

  visitor.vtable = &visitor_vtable;
  visitor.user_data = &ctx;

  visitor_vtable.visit = collect_matching_class_methods;

  art_api.visit_classes (art_api.linker, &visitor);

  result = finalize_method_groups_to_json (ctx.groups);

  g_hash_table_unref (ctx.groups);
  g_pattern_spec_free (ctx.method_query);
  g_pattern_spec_free (ctx.class_query);

  return result;
}

static jboolean
collect_matching_class_methods (ArtClassVisitor * self,
                                ArtClass * klass)
{
  EnumerateMethodsContext * ctx = self->user_data;
  const char * descriptor;
  StdString descriptor_storage = { 0, };
  gchar * class_name = NULL;
  gchar * class_name_copy = NULL;
  const gchar * normalized_class_name;
  JsonBuilder * group;
  size_t class_name_length;
  GHashTable * seen_method_names;
  gpointer elements;
  guint n, i;

  if (ctx->skip_system_classes && klass->class_loader == 0)
    goto skip_class;

  descriptor = art_api.get_class_descriptor (klass, &descriptor_storage);
  if (descriptor[0] != 'L')
    goto skip_class;

  class_name = class_name_from_signature (descriptor);

  if (ctx->ignore_case)
  {
    class_name_copy = g_utf8_strdown (class_name, -1);
    normalized_class_name = class_name_copy;
  }
  else
  {
    normalized_class_name = class_name;
  }

  if (!g_pattern_match_string (ctx->class_query, normalized_class_name))
    goto skip_class;

  group = NULL;
  class_name_length = strlen (class_name);
  seen_method_names = ctx->include_signature ? NULL : g_hash_table_new_full (g_str_hash, g_str_equal, g_free, NULL);

  elements = read_art_array (klass, art_api.class_offset_methods, sizeof (gsize), NULL);
  n = *(guint16 *) ((gpointer) klass + art_api.class_offset_copied_methods_offset);
  for (i = 0; i != n; i++)
  {
    ArtMethod * method;
    guint32 access_flags;
    jboolean is_constructor;
    StdString method_name = { 0, };
    const gchar * bare_method_name;
    gchar * bare_method_name_copy = NULL;
    const gchar * normalized_method_name;
    gchar * normalized_method_name_copy = NULL;

    method = elements + (i * art_api.method_size);

    access_flags = *(guint32 *) ((gpointer) method + art_api.method_offset_access_flags);
    is_constructor = (access_flags & kAccConstructor) != 0;

    art_api.pretty_method (&method_name, method, ctx->include_signature);
    bare_method_name = std_string_c_str (&method_name);
    if (ctx->include_signature)
    {
      const gchar * return_type_end, * name_begin;
      GString * name;

      return_type_end = strchr (bare_method_name, ' ');
      name_begin = return_type_end + 1 + class_name_length + 1;
      if (is_constructor && g_str_has_prefix (name_begin, "<clinit>"))
        goto skip_method;

      name = g_string_sized_new (64);

      if (is_constructor)
      {
        g_string_append (name, "$init");
        g_string_append (name, strchr (name_begin, '>') + 1);
      }
      else
      {
        g_string_append (name, name_begin);
      }
      g_string_append (name, ": ");
      g_string_append_len (name, bare_method_name, return_type_end - bare_method_name);

      bare_method_name_copy = g_string_free (name, FALSE);
      bare_method_name = bare_method_name_copy;
    }
    else
    {
      const gchar * name_begin;

      name_begin = bare_method_name + class_name_length + 1;
      if (is_constructor && strcmp (name_begin, "<clinit>") == 0)
        goto skip_method;

      if (is_constructor)
        bare_method_name = "$init";
      else
        bare_method_name += class_name_length + 1;
    }

    if (seen_method_names != NULL && g_hash_table_contains (seen_method_names, bare_method_name))
      goto skip_method;

    if (ctx->ignore_case)
    {
      normalized_method_name_copy = g_utf8_strdown (bare_method_name, -1);
      normalized_method_name = normalized_method_name_copy;
    }
    else
    {
      normalized_method_name = bare_method_name;
    }

    if (!g_pattern_match_string (ctx->method_query, normalized_method_name))
      goto skip_method;

    if (group == NULL)
    {
      group = g_hash_table_lookup (ctx->groups, GUINT_TO_POINTER (klass->class_loader));
      if (group == NULL)
      {
        group = json_builder_new_immutable ();
        g_hash_table_insert (ctx->groups, GUINT_TO_POINTER (klass->class_loader), group);

        json_builder_begin_object (group);

        json_builder_set_member_name (group, "loader");
        json_builder_add_int_value (group, klass->class_loader);

        json_builder_set_member_name (group, "classes");
        json_builder_begin_array (group);
      }

      json_builder_begin_object (group);

      json_builder_set_member_name (group, "name");
      json_builder_add_string_value (group, class_name);

      json_builder_set_member_name (group, "methods");
      json_builder_begin_array (group);
    }

    json_builder_add_string_value (group, bare_method_name);

    if (seen_method_names != NULL)
      g_hash_table_add (seen_method_names, g_strdup (bare_method_name));

skip_method:
    g_free (normalized_method_name_copy);
    g_free (bare_method_name_copy);
    std_string_destroy (&method_name);
  }

  if (seen_method_names != NULL)
    g_hash_table_unref (seen_method_names);

  if (group == NULL)
    goto skip_class;

  json_builder_end_array (group);
  json_builder_end_object (group);

skip_class:
  g_free (class_name_copy);
  g_free (class_name);
  std_string_destroy (&descriptor_storage);

  return TRUE;
}

gchar *
enumerate_methods_jvm (const gchar * class_query,
                       const gchar * method_query,
                       jboolean include_signature,
                       jboolean ignore_case,
                       jboolean skip_system_classes,
                       JNIEnv * env)
{
  gchar * result;
  GPatternSpec * class_pattern, * method_pattern;
  GHashTable * groups;
  gpointer * ef = env->functions;
  jobject (* new_global_ref) (JNIEnv *, jobject) = ef[21];
  void (* delete_local_ref) (JNIEnv *, jobject) = ef[23];
  jboolean (* is_same_object) (JNIEnv *, jobject, jobject) = ef[24];
  jvmtiEnv * jvmti = java_api.jvmti;
  gpointer * jf = jvmti->functions - 1;
  jvmtiError (* deallocate) (jvmtiEnv *, void * mem) = jf[47];
  jvmtiError (* get_class_signature) (jvmtiEnv *, jclass, char **, char **) = jf[48];
  jvmtiError (* get_class_methods) (jvmtiEnv *, jclass, jint *, jmethodID **) = jf[52];
  jvmtiError (* get_class_loader) (jvmtiEnv *, jclass, jobject *) = jf[57];
  jvmtiError (* get_method_name) (jvmtiEnv *, jmethodID, char **, char **, char **) = jf[64];
  jvmtiError (* get_loaded_classes) (jvmtiEnv *, jint *, jclass **) = jf[78];
  jint class_count, class_index;
  jclass * classes;

  class_pattern = make_pattern_spec (class_query, ignore_case);
  method_pattern = make_pattern_spec (method_query, ignore_case);
  groups = g_hash_table_new_full (NULL, NULL, NULL, NULL);

  if (get_loaded_classes (jvmti, &class_count, &classes) != JVMTI_ERROR_NONE)
    goto emit_results;

  for (class_index = 0; class_index != class_count; class_index++)
  {
    jclass klass = classes[class_index];
    jobject loader = NULL;
    gboolean have_loader = FALSE;
    char * signature = NULL;
    gchar * class_name = NULL;
    gchar * class_name_copy = NULL;
    const gchar * normalized_class_name;
    jint method_count, method_index;
    jmethodID * methods = NULL;
    JsonBuilder * group = NULL;
    GHashTable * seen_method_names = NULL;

    if (skip_system_classes)
    {
      if (get_class_loader (jvmti, klass, &loader) != JVMTI_ERROR_NONE)
        goto skip_class;
      have_loader = TRUE;

      if (loader == NULL)
        goto skip_class;
    }

    if (get_class_signature (jvmti, klass, &signature, NULL) != JVMTI_ERROR_NONE)
      goto skip_class;

    class_name = class_name_from_signature (signature);

    if (ignore_case)
    {
      class_name_copy = g_utf8_strdown (class_name, -1);
      normalized_class_name = class_name_copy;
    }
    else
    {
      normalized_class_name = class_name;
    }

    if (!g_pattern_match_string (class_pattern, normalized_class_name))
      goto skip_class;

    if (get_class_methods (jvmti, klass, &method_count, &methods) != JVMTI_ERROR_NONE)
      goto skip_class;

    if (!include_signature)
      seen_method_names = g_hash_table_new_full (g_str_hash, g_str_equal, g_free, NULL);

    for (method_index = 0; method_index != method_count; method_index++)
    {
      jmethodID method = methods[method_index];
      const gchar * method_name;
      char * method_name_value = NULL;
      char * method_signature_value = NULL;
      gchar * method_name_copy = NULL;
      const gchar * normalized_method_name;
      gchar * normalized_method_name_copy = NULL;

      if (get_method_name (jvmti, method, &method_name_value, include_signature ? &method_signature_value : NULL, NULL) != JVMTI_ERROR_NONE)
        goto skip_method;
      method_name = method_name_value;

      if (method_name[0] == '<')
      {
        if (strcmp (method_name, "<init>") == 0)
          method_name = "$init";
        else if (strcmp (method_name, "<clinit>") == 0)
          goto skip_method;
      }

      if (include_signature)
      {
        method_name_copy = format_method_signature (method_name, method_signature_value);
        method_name = method_name_copy;
      }

      if (seen_method_names != NULL && g_hash_table_contains (seen_method_names, method_name))
        goto skip_method;

      if (ignore_case)
      {
        normalized_method_name_copy = g_utf8_strdown (method_name, -1);
        normalized_method_name = normalized_method_name_copy;
      }
      else
      {
        normalized_method_name = method_name;
      }

      if (!g_pattern_match_string (method_pattern, normalized_method_name))
        goto skip_method;

      if (group == NULL)
      {
        if (!have_loader && get_class_loader (jvmti, klass, &loader) != JVMTI_ERROR_NONE)
          goto skip_method;

        if (loader == NULL)
        {
          group = g_hash_table_lookup (groups, NULL);
        }
        else
        {
          GHashTableIter iter;
          jobject cur_loader;
          JsonBuilder * cur_group;

          g_hash_table_iter_init (&iter, groups);
          while (g_hash_table_iter_next (&iter, (gpointer *) &cur_loader, (gpointer *) &cur_group))
          {
            if (cur_loader != NULL && is_same_object (env, cur_loader, loader))
            {
              group = cur_group;
              break;
            }
          }
        }

        if (group == NULL)
        {
          jobject l;
          gchar * str;

          l = (loader != NULL) ? new_global_ref (env, loader) : NULL;

          group = json_builder_new_immutable ();
          g_hash_table_insert (groups, l, group);

          json_builder_begin_object (group);

          json_builder_set_member_name (group, "loader");
          str = g_strdup_printf ("0x%" G_GSIZE_MODIFIER "x", GPOINTER_TO_SIZE (l));
          json_builder_add_string_value (group, str);
          g_free (str);

          json_builder_set_member_name (group, "classes");
          json_builder_begin_array (group);
        }

        json_builder_begin_object (group);

        json_builder_set_member_name (group, "name");
        json_builder_add_string_value (group, class_name);

        json_builder_set_member_name (group, "methods");
        json_builder_begin_array (group);
      }

      json_builder_add_string_value (group, method_name);

      if (seen_method_names != NULL)
        g_hash_table_add (seen_method_names, g_strdup (method_name));

skip_method:
      g_free (normalized_method_name_copy);
      g_free (method_name_copy);
      deallocate (jvmti, method_signature_value);
      deallocate (jvmti, method_name_value);
    }

skip_class:
    if (group != NULL)
    {
      json_builder_end_array (group);
      json_builder_end_object (group);
    }

    if (seen_method_names != NULL)
      g_hash_table_unref (seen_method_names);

    deallocate (jvmti, methods);

    g_free (class_name_copy);
    g_free (class_name);
    deallocate (jvmti, signature);

    if (loader != NULL)
      delete_local_ref (env, loader);

    delete_local_ref (env, klass);
  }

  deallocate (jvmti, classes);

emit_results:
  result = finalize_method_groups_to_json (groups);

  g_hash_table_unref (groups);
  g_pattern_spec_free (method_pattern);
  g_pattern_spec_free (class_pattern);

  return result;
}

static gchar *
finalize_method_groups_to_json (GHashTable * groups)
{
  GString * result;
  GHashTableIter iter;
  guint i;
  JsonBuilder * group;

  result = g_string_sized_new (1024);

  g_string_append_c (result, '[');

  g_hash_table_iter_init (&iter, groups);
  for (i = 0; g_hash_table_iter_next (&iter, NULL, (gpointer *) &group); i++)
  {
    JsonNode * root;
    gchar * json;

    if (i > 0)
      g_string_append_c (result, ',');

    json_builder_end_array (group);
    json_builder_end_object (group);

    root = json_builder_get_root (group);
    json = json_to_string (root, FALSE);
    g_string_append (result, json);
    g_free (json);
    json_node_unref (root);

    g_object_unref (group);
  }

  g_string_append_c (result, ']');

  return g_string_free (result, FALSE);
}

static GPatternSpec *
make_pattern_spec (const gchar * pattern,
                   jboolean ignore_case)
{
  GPatternSpec * spec;

  if (ignore_case)
  {
    gchar * str = g_utf8_strdown (pattern, -1);
    spec = g_pattern_spec_new (str);
    g_free (str);
  }
  else
  {
    spec = g_pattern_spec_new (pattern);
  }

  return spec;
}

static gchar *
class_name_from_signature (const gchar * descriptor)
{
  gchar * result, * c;

  result = g_strdup (descriptor + 1);

  for (c = result; *c != '\\0'; c++)
  {
    if (*c == '/')
      *c = '.';
  }

  c[-1] = '\\0';

  return result;
}

static gchar *
format_method_signature (const gchar * name,
                         const gchar * signature)
{
  GString * sig;
  const gchar * cursor;
  gint arg_index;

  sig = g_string_sized_new (128);

  g_string_append (sig, name);

  cursor = signature;
  arg_index = -1;
  while (TRUE)
  {
    const gchar c = *cursor;

    if (c == '(')
    {
      g_string_append_c (sig, c);
      cursor++;
      arg_index = 0;
    }
    else if (c == ')')
    {
      g_string_append_c (sig, c);
      cursor++;
      break;
    }
    else
    {
      if (arg_index >= 1)
        g_string_append (sig, ", ");

      append_type (sig, &cursor);

      if (arg_index != -1)
        arg_index++;
    }
  }

  g_string_append (sig, ": ");
  append_type (sig, &cursor);

  return g_string_free (sig, FALSE);
}

static void
append_type (GString * output,
             const gchar ** type)
{
  const gchar * cursor = *type;

  switch (*cursor)
  {
    case 'Z':
      g_string_append (output, "boolean");
      cursor++;
      break;
    case 'B':
      g_string_append (output, "byte");
      cursor++;
      break;
    case 'C':
      g_string_append (output, "char");
      cursor++;
      break;
    case 'S':
      g_string_append (output, "short");
      cursor++;
      break;
    case 'I':
      g_string_append (output, "int");
      cursor++;
      break;
    case 'J':
      g_string_append (output, "long");
      cursor++;
      break;
    case 'F':
      g_string_append (output, "float");
      cursor++;
      break;
    case 'D':
      g_string_append (output, "double");
      cursor++;
      break;
    case 'V':
      g_string_append (output, "void");
      cursor++;
      break;
    case 'L':
    {
      gchar ch;

      cursor++;
      for (; (ch = *cursor) != ';'; cursor++)
      {
        g_string_append_c (output, (ch != '/') ? ch : '.');
      }
      cursor++;

      break;
    }
    case '[':
      *type = cursor + 1;
      append_type (output, type);
      g_string_append (output, "[]");
      return;
    default:
      g_string_append (output, "BUG");
      cursor++;
  }

  *type = cursor;
}

void
dealloc (gpointer mem)
{
  g_free (mem);
}

static gpointer
read_art_array (gpointer object_base,
                guint field_offset,
                guint length_size,
                guint * length)
{
  gpointer result, header;
  guint n;

  header = GSIZE_TO_POINTER (*(guint64 *) (object_base + field_offset));
  if (header != NULL)
  {
    result = header + length_size;
    if (length_size == sizeof (guint32))
      n = *(guint32 *) header;
    else
      n = *(guint64 *) header;
  }
  else
  {
    result = NULL;
    n = 0;
  }

  if (length != NULL)
    *length = n;

  return result;
}

static void
std_string_destroy (StdString * str)
{
  if ((str->l.capacity & 1) != 0)
    art_api.free (str->l.data);
}

static gchar *
std_string_c_str (StdString * self)
{
  if ((self->l.capacity & 1) != 0)
    return self->l.data;

  return self->s.data;
}
`;
  var methodQueryPattern = /(.+)!([^/]+)\/?([isu]+)?/;
  var cm = null;
  var unwrap = null;
  var Model = class _Model {
    static build(handle, env) {
      ensureInitialized(env);
      return unwrap(handle, env, (object) => {
        return new _Model(cm.new(handle, object, env));
      });
    }
    static enumerateMethods(query, api2, env) {
      ensureInitialized(env);
      const params = query.match(methodQueryPattern);
      if (params === null) {
        throw new Error("Invalid query; format is: class!method -- see documentation of Java.enumerateMethods(query) for details");
      }
      const classQuery = Memory.allocUtf8String(params[1]);
      const methodQuery = Memory.allocUtf8String(params[2]);
      let includeSignature = false;
      let ignoreCase = false;
      let skipSystemClasses = false;
      const modifiers = params[3];
      if (modifiers !== void 0) {
        includeSignature = modifiers.indexOf("s") !== -1;
        ignoreCase = modifiers.indexOf("i") !== -1;
        skipSystemClasses = modifiers.indexOf("u") !== -1;
      }
      let result;
      if (api2.jvmti !== null) {
        const json = cm.enumerateMethodsJvm(
          classQuery,
          methodQuery,
          boolToNative(includeSignature),
          boolToNative(ignoreCase),
          boolToNative(skipSystemClasses),
          env
        );
        try {
          result = JSON.parse(json.readUtf8String()).map((group) => {
            const loaderRef = ptr(group.loader);
            group.loader = !loaderRef.isNull() ? loaderRef : null;
            return group;
          });
        } finally {
          cm.dealloc(json);
        }
      } else {
        withRunnableArtThread(env.vm, env, (thread) => {
          const json = cm.enumerateMethodsArt(
            classQuery,
            methodQuery,
            boolToNative(includeSignature),
            boolToNative(ignoreCase),
            boolToNative(skipSystemClasses)
          );
          try {
            const addGlobalReference = api2["art::JavaVMExt::AddGlobalRef"];
            const { vm: vmHandle } = api2;
            result = JSON.parse(json.readUtf8String()).map((group) => {
              const loaderObj = group.loader;
              group.loader = loaderObj !== 0 ? addGlobalReference(vmHandle, thread, ptr(loaderObj)) : null;
              return group;
            });
          } finally {
            cm.dealloc(json);
          }
        });
      }
      return result;
    }
    constructor(handle) {
      this.handle = handle;
    }
    has(member) {
      return cm.has(this.handle, Memory.allocUtf8String(member)) !== 0;
    }
    find(member) {
      return cm.find(this.handle, Memory.allocUtf8String(member)).readUtf8String();
    }
    list() {
      const str = cm.list(this.handle);
      try {
        return JSON.parse(str.readUtf8String());
      } finally {
        cm.dealloc(str);
      }
    }
  };
  function ensureInitialized(env) {
    if (cm === null) {
      cm = compileModule(env);
      unwrap = makeHandleUnwrapper(cm, env.vm);
    }
  }
  function compileModule(env) {
    const api2 = api_default();
    const { jvmti = null } = api2;
    const { pointerSize: pointerSize9 } = Process;
    const lockSize = 8;
    const modelsSize = pointerSize9;
    const javaApiSize = 7 * pointerSize9;
    const artApiSize = 10 * 4 + 5 * pointerSize9;
    const dataSize = lockSize + modelsSize + javaApiSize + artApiSize;
    const data = Memory.alloc(dataSize);
    const lock = data;
    const models = lock.add(lockSize);
    const javaApi = models.add(modelsSize);
    const { getDeclaredMethods, getDeclaredFields } = env.javaLangClass();
    const method = env.javaLangReflectMethod();
    const field = env.javaLangReflectField();
    let j2 = javaApi;
    [
      jvmti !== null ? jvmti : NULL,
      getDeclaredMethods,
      getDeclaredFields,
      method.getName,
      method.getModifiers,
      field.getName,
      field.getModifiers
    ].forEach((value) => {
      j2 = j2.writePointer(value).add(pointerSize9);
    });
    const artApi = javaApi.add(javaApiSize);
    const { vm: vm3 } = env;
    if (api2.flavor === "art") {
      let artClassOffsets;
      if (jvmti !== null) {
        artClassOffsets = [0, 0, 0, 0];
      } else {
        const c2 = getArtClassSpec(vm3).offset;
        artClassOffsets = [c2.ifields, c2.methods, c2.sfields, c2.copiedMethodsOffset];
      }
      const m2 = getArtMethodSpec(vm3);
      const f2 = getArtFieldSpec(vm3);
      let s2 = artApi;
      [
        1,
        ...artClassOffsets,
        m2.size,
        m2.offset.accessFlags,
        f2.size,
        f2.offset.accessFlags,
        4294967295
      ].forEach((value) => {
        s2 = s2.writeUInt(value).add(4);
      });
      [
        api2.artClassLinker.address,
        api2["art::ClassLinker::VisitClasses"],
        api2["art::mirror::Class::GetDescriptor"],
        api2["art::ArtMethod::PrettyMethod"],
        Process.getModuleByName("libc.so").getExportByName("free")
      ].forEach((value, i2) => {
        if (value === void 0) {
          value = NULL;
        }
        s2 = s2.writePointer(value).add(pointerSize9);
      });
    }
    const cm2 = new CModule(code, {
      lock,
      models,
      java_api: javaApi,
      art_api: artApi
    });
    const reentrantOptions = { exceptions: "propagate" };
    const fastOptions = { exceptions: "propagate", scheduling: "exclusive" };
    return {
      handle: cm2,
      new: new NativeFunction(cm2.model_new, "pointer", ["pointer", "pointer", "pointer"], reentrantOptions),
      has: new NativeFunction(cm2.model_has, "bool", ["pointer", "pointer"], fastOptions),
      find: new NativeFunction(cm2.model_find, "pointer", ["pointer", "pointer"], fastOptions),
      list: new NativeFunction(cm2.model_list, "pointer", ["pointer"], fastOptions),
      enumerateMethodsArt: new NativeFunction(
        cm2.enumerate_methods_art,
        "pointer",
        ["pointer", "pointer", "bool", "bool", "bool"],
        reentrantOptions
      ),
      enumerateMethodsJvm: new NativeFunction(cm2.enumerate_methods_jvm, "pointer", [
        "pointer",
        "pointer",
        "bool",
        "bool",
        "bool",
        "pointer"
      ], reentrantOptions),
      dealloc: new NativeFunction(cm2.dealloc, "void", ["pointer"], fastOptions)
    };
  }
  function makeHandleUnwrapper(cm2, vm3) {
    const api2 = api_default();
    if (api2.flavor !== "art") {
      return nullUnwrap;
    }
    const decodeGlobal = api2["art::JavaVMExt::DecodeGlobal"];
    return function(handle, env, fn) {
      let result;
      withRunnableArtThread(vm3, env, (thread) => {
        const object = decodeGlobal(vm3, thread, handle);
        result = fn(object);
      });
      return result;
    };
  }
  function nullUnwrap(handle, env, fn) {
    return fn(NULL);
  }
  function boolToNative(val) {
    return val ? 1 : 0;
  }

  // node_modules/frida-java-bridge/lib/lru.js
  var LRU = class {
    constructor(capacity, destroy) {
      this.items = /* @__PURE__ */ new Map();
      this.capacity = capacity;
      this.destroy = destroy;
    }
    dispose(env) {
      const { items, destroy } = this;
      items.forEach((val) => {
        destroy(val, env);
      });
      items.clear();
    }
    get(key) {
      const { items } = this;
      const item = items.get(key);
      if (item !== void 0) {
        items.delete(key);
        items.set(key, item);
      }
      return item;
    }
    set(key, val, env) {
      const { items } = this;
      const existingVal = items.get(key);
      if (existingVal !== void 0) {
        items.delete(key);
        this.destroy(existingVal, env);
      } else if (items.size === this.capacity) {
        const oldestKey = items.keys().next().value;
        const oldestVal = items.get(oldestKey);
        items.delete(oldestKey);
        this.destroy(oldestVal, env);
      }
      items.set(key, val);
    }
  };

  // node_modules/@frida/buffer/index.js
  var base64 = __toESM(require_base64_js(), 1);
  var ieee754 = __toESM(require_ieee754(), 1);

  // node_modules/@frida/web-streams/ponyfill.js
  function e() {
  }
  function t(e2) {
    return "object" == typeof e2 && null !== e2 || "function" == typeof e2;
  }
  var r = e;
  function o(e2, t2) {
    try {
      Object.defineProperty(e2, "name", { value: t2, configurable: true });
    } catch (e3) {
    }
  }
  var n = Promise;
  var i = Promise.resolve.bind(n);
  var a = Promise.prototype.then;
  var s = Promise.reject.bind(n);
  var l = i;
  function u(e2) {
    return new n(e2);
  }
  function c(e2) {
    return u((t2) => t2(e2));
  }
  function d(e2) {
    return s(e2);
  }
  function f(e2, t2, r2) {
    return a.call(e2, t2, r2);
  }
  function h(e2, t2, o2) {
    f(f(e2, t2, o2), void 0, r);
  }
  function b(e2, t2) {
    h(e2, t2);
  }
  function _(e2, t2) {
    h(e2, void 0, t2);
  }
  function m(e2, t2, r2) {
    return f(e2, t2, r2);
  }
  function p(e2) {
    f(e2, void 0, r);
  }
  var y = (e2) => {
    if ("function" == typeof queueMicrotask) y = queueMicrotask;
    else {
      const e3 = c(void 0);
      y = (t2) => f(e3, t2);
    }
    return y(e2);
  };
  function S(e2, t2, r2) {
    if ("function" != typeof e2) throw new TypeError("Argument is not a function");
    return Function.prototype.apply.call(e2, t2, r2);
  }
  function g(e2, t2, r2) {
    try {
      return c(S(e2, t2, r2));
    } catch (e3) {
      return d(e3);
    }
  }
  var v = class {
    constructor() {
      this._cursor = 0, this._size = 0, this._front = { _elements: [], _next: void 0 }, this._back = this._front, this._cursor = 0, this._size = 0;
    }
    get length() {
      return this._size;
    }
    push(e2) {
      const t2 = this._back;
      let r2 = t2;
      16383 === t2._elements.length && (r2 = { _elements: [], _next: void 0 }), t2._elements.push(e2), r2 !== t2 && (this._back = r2, t2._next = r2), ++this._size;
    }
    shift() {
      const e2 = this._front;
      let t2 = e2;
      const r2 = this._cursor;
      let o2 = r2 + 1;
      const n2 = e2._elements, i2 = n2[r2];
      return 16384 === o2 && (t2 = e2._next, o2 = 0), --this._size, this._cursor = o2, e2 !== t2 && (this._front = t2), n2[r2] = void 0, i2;
    }
    forEach(e2) {
      let t2 = this._cursor, r2 = this._front, o2 = r2._elements;
      for (; !(t2 === o2.length && void 0 === r2._next || t2 === o2.length && (r2 = r2._next, o2 = r2._elements, t2 = 0, 0 === o2.length)); ) e2(o2[t2]), ++t2;
    }
    peek() {
      const e2 = this._front, t2 = this._cursor;
      return e2._elements[t2];
    }
  };
  var w = /* @__PURE__ */ Symbol("[[AbortSteps]]");
  var R = /* @__PURE__ */ Symbol("[[ErrorSteps]]");
  var T = /* @__PURE__ */ Symbol("[[CancelSteps]]");
  var P = /* @__PURE__ */ Symbol("[[PullSteps]]");
  var C = /* @__PURE__ */ Symbol("[[CanPullSyncSteps]]");
  var q = /* @__PURE__ */ Symbol("[[ReleaseSteps]]");
  function E(e2, t2) {
    e2._ownerReadableStream = t2, t2._reader = e2, "readable" === t2._state ? j(e2) : "closed" === t2._state ? (function(e3) {
      j(e3), z(e3);
    })(e2) : k(e2, t2._storedError);
  }
  function W(e2, t2) {
    return Mr(e2._ownerReadableStream, t2);
  }
  function O(e2) {
    const t2 = e2._ownerReadableStream;
    "readable" === t2._state ? A(e2, new TypeError("Reader was released and can no longer be used to monitor the stream's closedness")) : (function(e3, t3) {
      k(e3, t3);
    })(e2, new TypeError("Reader was released and can no longer be used to monitor the stream's closedness")), t2._readableStreamController[q](), t2._reader = void 0, e2._ownerReadableStream = void 0;
  }
  function B(e2) {
    return new TypeError("Cannot " + e2 + " a stream using a released reader");
  }
  function j(e2) {
    e2._closedPromise = u((t2, r2) => {
      e2._closedPromise_resolve = t2, e2._closedPromise_reject = r2;
    });
  }
  function k(e2, t2) {
    j(e2), A(e2, t2);
  }
  function A(e2, t2) {
    void 0 !== e2._closedPromise_reject && (p(e2._closedPromise), e2._closedPromise_reject(t2), e2._closedPromise_resolve = void 0, e2._closedPromise_reject = void 0);
  }
  function z(e2) {
    void 0 !== e2._closedPromise_resolve && (e2._closedPromise_resolve(void 0), e2._closedPromise_resolve = void 0, e2._closedPromise_reject = void 0);
  }
  var D = Number.isFinite || function(e2) {
    return "number" == typeof e2 && isFinite(e2);
  };
  var F = Math.trunc || function(e2) {
    return e2 < 0 ? Math.ceil(e2) : Math.floor(e2);
  };
  function L(e2, t2) {
    if (void 0 !== e2 && ("object" != typeof (r2 = e2) && "function" != typeof r2)) throw new TypeError(`${t2} is not an object.`);
    var r2;
  }
  function I(e2, t2) {
    if ("function" != typeof e2) throw new TypeError(`${t2} is not a function.`);
  }
  function $(e2, t2) {
    if (!/* @__PURE__ */ (function(e3) {
      return "object" == typeof e3 && null !== e3 || "function" == typeof e3;
    })(e2)) throw new TypeError(`${t2} is not an object.`);
  }
  function M(e2, t2, r2) {
    if (void 0 === e2) throw new TypeError(`Parameter ${t2} is required in '${r2}'.`);
  }
  function Y(e2, t2, r2) {
    if (void 0 === e2) throw new TypeError(`${t2} is required in '${r2}'.`);
  }
  function x(e2) {
    return Number(e2);
  }
  function Q(e2) {
    return 0 === e2 ? 0 : e2;
  }
  function N(e2, t2) {
    const r2 = Number.MAX_SAFE_INTEGER;
    let o2 = Number(e2);
    if (o2 = Q(o2), !D(o2)) throw new TypeError(`${t2} is not a finite number`);
    if (o2 = (function(e3) {
      return Q(F(e3));
    })(o2), o2 < 0 || o2 > r2) throw new TypeError(`${t2} is outside the accepted range of 0 to ${r2}, inclusive`);
    return D(o2) && 0 !== o2 ? o2 : 0;
  }
  function H(e2, t2) {
    if (!Ir(e2)) throw new TypeError(`${t2} is not a ReadableStream.`);
  }
  function V(e2) {
    return new ReadableStreamDefaultReader(e2);
  }
  function U(e2, t2) {
    e2._reader._readRequests.push(t2);
  }
  function G(e2, t2, r2) {
    const o2 = e2._reader._readRequests.shift();
    r2 ? o2._closeSteps() : o2._chunkSteps(t2);
  }
  function X(e2) {
    return e2._reader._readRequests.length;
  }
  function J(e2) {
    const t2 = e2._reader;
    return void 0 !== t2 && !!ee(t2);
  }
  var ReadableStreamDefaultReader = class {
    constructor(e2) {
      if (M(e2, 1, "ReadableStreamDefaultReader"), H(e2, "First parameter"), $r(e2)) throw new TypeError("This stream has already been locked for exclusive reading by another reader");
      E(this, e2), this._readRequests = new v();
    }
    get closed() {
      return ee(this) ? this._closedPromise : d(ne("closed"));
    }
    cancel(e2 = void 0) {
      return ee(this) ? void 0 === this._ownerReadableStream ? d(B("cancel")) : W(this, e2) : d(ne("cancel"));
    }
    read() {
      if (!ee(this)) return d(ne("read"));
      if (void 0 === this._ownerReadableStream) return d(B("read from"));
      const e2 = re(this) ? new Z() : new K();
      return te(this, e2), e2._promise;
    }
    releaseLock() {
      if (!ee(this)) throw ne("releaseLock");
      void 0 !== this._ownerReadableStream && (function(e2) {
        O(e2);
        const t2 = new TypeError("Reader was released");
        oe(e2, t2);
      })(this);
    }
  };
  Object.defineProperties(ReadableStreamDefaultReader.prototype, { cancel: { enumerable: true }, read: { enumerable: true }, releaseLock: { enumerable: true }, closed: { enumerable: true } }), o(ReadableStreamDefaultReader.prototype.cancel, "cancel"), o(ReadableStreamDefaultReader.prototype.read, "read"), o(ReadableStreamDefaultReader.prototype.releaseLock, "releaseLock"), "symbol" == typeof Symbol.toStringTag && Object.defineProperty(ReadableStreamDefaultReader.prototype, Symbol.toStringTag, { value: "ReadableStreamDefaultReader", configurable: true });
  var K = class {
    constructor() {
      this._promise = u((e2, t2) => {
        this._resolvePromise = e2, this._rejectPromise = t2;
      });
    }
    _chunkSteps(e2) {
      this._resolvePromise({ value: e2, done: false });
    }
    _closeSteps() {
      this._resolvePromise({ value: void 0, done: true });
    }
    _errorSteps(e2) {
      this._rejectPromise(e2);
    }
  };
  var Z = class {
    constructor() {
      this._promise = void 0;
    }
    _chunkSteps(e2) {
      this._promise = l({ value: e2, done: false });
    }
    _closeSteps() {
      this._promise = l({ value: void 0, done: true });
    }
    _errorSteps(e2) {
      this._promise = d(e2);
    }
  };
  function ee(e2) {
    return !!t(e2) && (!!Object.prototype.hasOwnProperty.call(e2, "_readRequests") && e2 instanceof ReadableStreamDefaultReader);
  }
  function te(e2, t2) {
    const r2 = e2._ownerReadableStream;
    r2._disturbed = true, "closed" === r2._state ? t2._closeSteps() : "errored" === r2._state ? t2._errorSteps(r2._storedError) : r2._readableStreamController[P](t2);
  }
  function re(e2) {
    const t2 = e2._ownerReadableStream;
    return "closed" === t2._state || ("errored" === t2._state || t2._readableStreamController[C]());
  }
  function oe(e2, t2) {
    const r2 = e2._readRequests;
    e2._readRequests = new v(), r2.forEach((e3) => {
      e3._errorSteps(t2);
    });
  }
  function ne(e2) {
    return new TypeError(`ReadableStreamDefaultReader.prototype.${e2} can only be used on a ReadableStreamDefaultReader`);
  }
  var ie;
  var ae;
  var se;
  function le(e2) {
    return e2.slice();
  }
  function ue(e2, t2, r2, o2, n2) {
    new Uint8Array(e2).set(new Uint8Array(r2, o2, n2), t2);
  }
  var ce = (e2) => (ce = "function" == typeof e2.transfer ? (e3) => e3.transfer() : "function" == typeof structuredClone ? (e3) => structuredClone(e3, { transfer: [e3] }) : (e3) => e3, ce(e2));
  var de = (e2) => (de = "boolean" == typeof e2.detached ? (e3) => e3.detached : (e3) => 0 === e3.byteLength, de(e2));
  function fe(e2, t2, r2) {
    if (e2.slice) return e2.slice(t2, r2);
    const o2 = r2 - t2, n2 = new ArrayBuffer(o2);
    return ue(n2, 0, e2, t2, o2), n2;
  }
  function he(e2, t2) {
    const r2 = e2[t2];
    if (null != r2) {
      if ("function" != typeof r2) throw new TypeError(`${String(t2)} is not a function`);
      return r2;
    }
  }
  function be(e2) {
    try {
      const t2 = e2.done, r2 = e2.value;
      return f(l(r2), (e3) => ({ done: t2, value: e3 }));
    } catch (e3) {
      return d(e3);
    }
  }
  var _e = null !== (se = null !== (ie = Symbol.asyncIterator) && void 0 !== ie ? ie : null === (ae = Symbol.for) || void 0 === ae ? void 0 : ae.call(Symbol, "Symbol.asyncIterator")) && void 0 !== se ? se : "@@asyncIterator";
  function me(e2, r2 = "sync", o2) {
    if (void 0 === o2) if ("async" === r2) {
      if (void 0 === (o2 = he(e2, _e))) {
        return (function(e3) {
          const r3 = { next() {
            let t2;
            try {
              t2 = pe(e3);
            } catch (e4) {
              return d(e4);
            }
            return be(t2);
          }, return(r4) {
            let o3;
            try {
              const t2 = he(e3.iterator, "return");
              if (void 0 === t2) return c({ done: true, value: r4 });
              o3 = S(t2, e3.iterator, [r4]);
            } catch (e4) {
              return d(e4);
            }
            return t(o3) ? be(o3) : d(new TypeError("The iterator.return() method must return an object"));
          } };
          return { iterator: r3, nextMethod: r3.next, done: false };
        })(me(e2, "sync", he(e2, Symbol.iterator)));
      }
    } else o2 = he(e2, Symbol.iterator);
    if (void 0 === o2) throw new TypeError("The object is not iterable");
    const n2 = S(o2, e2, []);
    if (!t(n2)) throw new TypeError("The iterator method must return an object");
    return { iterator: n2, nextMethod: n2.next, done: false };
  }
  function pe(e2) {
    const r2 = S(e2.nextMethod, e2.iterator, []);
    if (!t(r2)) throw new TypeError("The iterator.next() method must return an object");
    return r2;
  }
  var ye = class {
    constructor(e2, t2) {
      this._ongoingPromise = void 0, this._isFinished = false, this._reader = e2, this._preventCancel = t2;
    }
    next() {
      const e2 = () => this._nextSteps();
      return this._ongoingPromise = this._ongoingPromise ? m(this._ongoingPromise, e2, e2) : e2(), this._ongoingPromise;
    }
    return(e2) {
      const t2 = () => this._returnSteps(e2);
      return this._ongoingPromise = this._ongoingPromise ? m(this._ongoingPromise, t2, t2) : t2(), this._ongoingPromise;
    }
    _nextSteps() {
      if (this._isFinished) return Promise.resolve({ value: void 0, done: true });
      const e2 = this._reader, t2 = new Se(this);
      return te(e2, t2), t2._promise;
    }
    _returnSteps(e2) {
      if (this._isFinished) return Promise.resolve({ value: e2, done: true });
      this._isFinished = true;
      const t2 = this._reader;
      if (!this._preventCancel) {
        const r2 = W(t2, e2);
        return O(t2), m(r2, () => ({ value: e2, done: true }));
      }
      return O(t2), c({ value: e2, done: true });
    }
  };
  var Se = class {
    constructor(e2) {
      this._iterator = e2, this._promise = u((e3, t2) => {
        this._resolvePromise = e3, this._rejectPromise = t2;
      });
    }
    _chunkSteps(e2) {
      this._iterator._ongoingPromise = void 0, y(() => this._resolvePromise({ value: e2, done: false }));
    }
    _closeSteps() {
      const e2 = this._iterator;
      e2._ongoingPromise = void 0, e2._isFinished = true, O(e2._reader), this._resolvePromise({ value: void 0, done: true });
    }
    _errorSteps(e2) {
      const t2 = this._iterator;
      t2._ongoingPromise = void 0, t2._isFinished = true, O(t2._reader), this._rejectPromise(e2);
    }
  };
  var ge = { next() {
    return ve(this) ? this._asyncIteratorImpl.next() : d(we("next"));
  }, return(e2) {
    return ve(this) ? this._asyncIteratorImpl.return(e2) : d(we("return"));
  }, [_e]() {
    return this;
  } };
  function ve(e2) {
    if (!t(e2)) return false;
    if (!Object.prototype.hasOwnProperty.call(e2, "_asyncIteratorImpl")) return false;
    try {
      return e2._asyncIteratorImpl instanceof ye;
    } catch (e3) {
      return false;
    }
  }
  function we(e2) {
    return new TypeError(`ReadableStreamAsyncIterator.${e2} can only be used on a ReadableSteamAsyncIterator`);
  }
  Object.defineProperty(ge, _e, { enumerable: false });
  var Re = Number.isNaN || function(e2) {
    return e2 != e2;
  };
  function Te(e2) {
    const t2 = fe(e2.buffer, e2.byteOffset, e2.byteOffset + e2.byteLength);
    return new Uint8Array(t2);
  }
  function Pe(e2) {
    const t2 = e2._queue.shift();
    return e2._queueTotalSize -= t2.size, e2._queueTotalSize < 0 && (e2._queueTotalSize = 0), t2.value;
  }
  function Ce(e2, t2, r2) {
    if ("number" != typeof (o2 = r2) || Re(o2) || o2 < 0 || r2 === 1 / 0) throw new RangeError("Size must be a finite, non-NaN, non-negative number.");
    var o2;
    e2._queue.push({ value: t2, size: r2 }), e2._queueTotalSize += r2;
  }
  function qe(e2) {
    e2._queue = new v(), e2._queueTotalSize = 0;
  }
  function Ee(e2) {
    return e2 === DataView;
  }
  function We(e2) {
    return Ee(e2) ? 1 : e2.BYTES_PER_ELEMENT;
  }
  var ReadableStreamBYOBRequest = class {
    constructor() {
      throw new TypeError("Illegal constructor");
    }
    get view() {
      if (!Be(this)) throw ot("view");
      return this._view;
    }
    respond(e2) {
      if (!Be(this)) throw ot("respond");
      if (M(e2, 1, "respond"), e2 = N(e2, "First parameter"), void 0 === this._associatedReadableByteStreamController) throw new TypeError("This BYOB request has been invalidated");
      if (de(this._view.buffer)) throw new TypeError("The BYOB request's buffer has been detached and so cannot be used as a response");
      et(this._associatedReadableByteStreamController, e2);
    }
    respondWithNewView(e2) {
      if (!Be(this)) throw ot("respondWithNewView");
      if (M(e2, 1, "respondWithNewView"), !ArrayBuffer.isView(e2)) throw new TypeError("You can only respond with array buffer views");
      if (void 0 === this._associatedReadableByteStreamController) throw new TypeError("This BYOB request has been invalidated");
      if (de(e2.buffer)) throw new TypeError("The given view's buffer has been detached and so cannot be used as a response");
      tt(this._associatedReadableByteStreamController, e2);
    }
  };
  Object.defineProperties(ReadableStreamBYOBRequest.prototype, { respond: { enumerable: true }, respondWithNewView: { enumerable: true }, view: { enumerable: true } }), o(ReadableStreamBYOBRequest.prototype.respond, "respond"), o(ReadableStreamBYOBRequest.prototype.respondWithNewView, "respondWithNewView"), "symbol" == typeof Symbol.toStringTag && Object.defineProperty(ReadableStreamBYOBRequest.prototype, Symbol.toStringTag, { value: "ReadableStreamBYOBRequest", configurable: true });
  var ReadableByteStreamController = class {
    constructor() {
      throw new TypeError("Illegal constructor");
    }
    get byobRequest() {
      if (!Oe(this)) throw nt("byobRequest");
      return Ke(this);
    }
    get desiredSize() {
      if (!Oe(this)) throw nt("desiredSize");
      return Ze(this);
    }
    close() {
      if (!Oe(this)) throw nt("close");
      if (this._closeRequested) throw new TypeError("The stream has already been closed; do not close it again!");
      const e2 = this._controlledReadableByteStream._state;
      if ("readable" !== e2) throw new TypeError(`The stream (in ${e2} state) is not in the readable state and cannot be closed`);
      Ue(this);
    }
    enqueue(e2) {
      if (!Oe(this)) throw nt("enqueue");
      if (M(e2, 1, "enqueue"), !ArrayBuffer.isView(e2)) throw new TypeError("chunk must be an array buffer view");
      if (0 === e2.byteLength) throw new TypeError("chunk must have non-zero byteLength");
      if (0 === e2.buffer.byteLength) throw new TypeError("chunk's buffer must have non-zero byteLength");
      if (this._closeRequested) throw new TypeError("stream is closed or draining");
      const t2 = this._controlledReadableByteStream._state;
      if ("readable" !== t2) throw new TypeError(`The stream (in ${t2} state) is not in the readable state and cannot be enqueued to`);
      Ge(this, e2);
    }
    error(e2 = void 0) {
      if (!Oe(this)) throw nt("error");
      Xe(this, e2);
    }
    [T](e2) {
      ke(this), qe(this);
      const t2 = this._cancelAlgorithm(e2);
      return Ve(this), t2;
    }
    [P](e2) {
      const t2 = this._controlledReadableByteStream;
      if (this._queueTotalSize > 0) return void Je(this, e2);
      const r2 = this._autoAllocateChunkSize;
      if (void 0 !== r2) {
        let t3;
        try {
          t3 = new ArrayBuffer(r2);
        } catch (t4) {
          return void e2._errorSteps(t4);
        }
        const o2 = { buffer: t3, bufferByteLength: r2, byteOffset: 0, byteLength: r2, bytesFilled: 0, minimumFill: 1, elementSize: 1, viewConstructor: Uint8Array, readerType: "default" };
        this._pendingPullIntos.push(o2);
      }
      U(t2, e2), je(this);
    }
    [C]() {
      return this._queueTotalSize > 0;
    }
    [q]() {
      if (this._pendingPullIntos.length > 0) {
        const e2 = this._pendingPullIntos.peek();
        e2.readerType = "none", this._pendingPullIntos = new v(), this._pendingPullIntos.push(e2);
      }
    }
  };
  function Oe(e2) {
    return !!t(e2) && (!!Object.prototype.hasOwnProperty.call(e2, "_controlledReadableByteStream") && e2 instanceof ReadableByteStreamController);
  }
  function Be(e2) {
    return !!t(e2) && (!!Object.prototype.hasOwnProperty.call(e2, "_associatedReadableByteStreamController") && e2 instanceof ReadableStreamBYOBRequest);
  }
  function je(e2) {
    const t2 = (function(e3) {
      const t3 = e3._controlledReadableByteStream;
      if ("readable" !== t3._state) return false;
      if (e3._closeRequested) return false;
      if (!e3._started) return false;
      if (J(t3) && X(t3) > 0) return true;
      if (ut(t3) && lt(t3) > 0) return true;
      const r2 = Ze(e3);
      if (r2 > 0) return true;
      return false;
    })(e2);
    if (!t2) return;
    if (e2._pulling) return void (e2._pullAgain = true);
    e2._pulling = true;
    h(e2._pullAlgorithm(), () => (e2._pulling = false, e2._pullAgain && (e2._pullAgain = false, je(e2)), null), (t3) => (Xe(e2, t3), null));
  }
  function ke(e2) {
    xe(e2), e2._pendingPullIntos = new v();
  }
  function Ae(e2, t2) {
    let r2 = false;
    "closed" === e2._state && (r2 = true);
    const o2 = De(t2);
    "default" === t2.readerType ? G(e2, o2, r2) : (function(e3, t3, r3) {
      const o3 = e3._reader, n2 = o3._readIntoRequests.shift();
      r3 ? n2._closeSteps(t3) : n2._chunkSteps(t3);
    })(e2, o2, r2);
  }
  function ze(e2, t2) {
    for (let r2 = 0; r2 < t2.length; ++r2) Ae(e2, t2[r2]);
  }
  function De(e2) {
    const t2 = e2.bytesFilled, r2 = e2.elementSize;
    return new e2.viewConstructor(e2.buffer, e2.byteOffset, t2 / r2);
  }
  function Fe(e2, t2, r2, o2) {
    e2._queue.push({ buffer: t2, byteOffset: r2, byteLength: o2 }), e2._queueTotalSize += o2;
  }
  function Le(e2, t2, r2, o2) {
    let n2;
    try {
      n2 = fe(t2, r2, r2 + o2);
    } catch (t3) {
      throw Xe(e2, t3), t3;
    }
    Fe(e2, n2, 0, o2);
  }
  function Ie(e2, t2) {
    t2.bytesFilled > 0 && Le(e2, t2.buffer, t2.byteOffset, t2.bytesFilled), He(e2);
  }
  function $e(e2, t2) {
    const r2 = Math.min(e2._queueTotalSize, t2.byteLength - t2.bytesFilled), o2 = t2.bytesFilled + r2;
    let n2 = r2, i2 = false;
    const a2 = o2 - o2 % t2.elementSize;
    a2 >= t2.minimumFill && (n2 = a2 - t2.bytesFilled, i2 = true);
    const s2 = e2._queue;
    for (; n2 > 0; ) {
      const r3 = s2.peek(), o3 = Math.min(n2, r3.byteLength), i3 = t2.byteOffset + t2.bytesFilled;
      ue(t2.buffer, i3, r3.buffer, r3.byteOffset, o3), r3.byteLength === o3 ? s2.shift() : (r3.byteOffset += o3, r3.byteLength -= o3), e2._queueTotalSize -= o3, Me(e2, o3, t2), n2 -= o3;
    }
    return i2;
  }
  function Me(e2, t2, r2) {
    r2.bytesFilled += t2;
  }
  function Ye(e2) {
    0 === e2._queueTotalSize && e2._closeRequested ? (Ve(e2), Yr(e2._controlledReadableByteStream)) : je(e2);
  }
  function xe(e2) {
    null !== e2._byobRequest && (e2._byobRequest._associatedReadableByteStreamController = void 0, e2._byobRequest._view = null, e2._byobRequest = null);
  }
  function Qe(e2) {
    const t2 = [];
    for (; e2._pendingPullIntos.length > 0 && 0 !== e2._queueTotalSize; ) {
      const r2 = e2._pendingPullIntos.peek();
      $e(e2, r2) && (He(e2), t2.push(r2));
    }
    return t2;
  }
  function Ne(e2, t2) {
    const r2 = e2._pendingPullIntos.peek();
    xe(e2);
    "closed" === e2._controlledReadableByteStream._state ? (function(e3, t3) {
      "none" === t3.readerType && He(e3);
      const r3 = e3._controlledReadableByteStream;
      if (ut(r3)) {
        const t4 = [];
        for (; t4.length < lt(r3); ) t4.push(He(e3));
        ze(r3, t4);
      }
    })(e2, r2) : (function(e3, t3, r3) {
      if (Me(0, t3, r3), "none" === r3.readerType) {
        Ie(e3, r3);
        const t4 = Qe(e3);
        return void ze(e3._controlledReadableByteStream, t4);
      }
      if (r3.bytesFilled < r3.minimumFill) return;
      He(e3);
      const o2 = r3.bytesFilled % r3.elementSize;
      if (o2 > 0) {
        const t4 = r3.byteOffset + r3.bytesFilled;
        Le(e3, r3.buffer, t4 - o2, o2);
      }
      r3.bytesFilled -= o2;
      const n2 = Qe(e3);
      Ae(e3._controlledReadableByteStream, r3), ze(e3._controlledReadableByteStream, n2);
    })(e2, t2, r2), je(e2);
  }
  function He(e2) {
    return e2._pendingPullIntos.shift();
  }
  function Ve(e2) {
    e2._pullAlgorithm = void 0, e2._cancelAlgorithm = void 0;
  }
  function Ue(e2) {
    const t2 = e2._controlledReadableByteStream;
    if (!e2._closeRequested && "readable" === t2._state) if (e2._queueTotalSize > 0) e2._closeRequested = true;
    else {
      if (e2._pendingPullIntos.length > 0) {
        const t3 = e2._pendingPullIntos.peek();
        if (t3.bytesFilled % t3.elementSize !== 0) {
          const t4 = new TypeError("Insufficient bytes to fill elements in the given buffer");
          throw Xe(e2, t4), t4;
        }
      }
      Ve(e2), Yr(t2);
    }
  }
  function Ge(e2, t2) {
    const r2 = e2._controlledReadableByteStream;
    if (e2._closeRequested || "readable" !== r2._state) return;
    const { buffer: o2, byteOffset: n2, byteLength: i2 } = t2;
    if (de(o2)) throw new TypeError("chunk's buffer is detached and so cannot be enqueued");
    const a2 = ce(o2);
    if (e2._pendingPullIntos.length > 0) {
      const t3 = e2._pendingPullIntos.peek();
      if (de(t3.buffer)) throw new TypeError("The BYOB request's buffer has been detached and so cannot be filled with an enqueued chunk");
      xe(e2), t3.buffer = ce(t3.buffer), "none" === t3.readerType && Ie(e2, t3);
    }
    if (J(r2)) if ((function(e3) {
      const t3 = e3._controlledReadableByteStream._reader;
      for (; t3._readRequests.length > 0; ) {
        if (0 === e3._queueTotalSize) return;
        Je(e3, t3._readRequests.shift());
      }
    })(e2), 0 === X(r2)) Fe(e2, a2, n2, i2);
    else {
      e2._pendingPullIntos.length > 0 && He(e2);
      G(r2, new Uint8Array(a2, n2, i2), false);
    }
    else if (ut(r2)) {
      Fe(e2, a2, n2, i2);
      ze(r2, Qe(e2));
    } else Fe(e2, a2, n2, i2);
    je(e2);
  }
  function Xe(e2, t2) {
    const r2 = e2._controlledReadableByteStream;
    "readable" === r2._state && (ke(e2), qe(e2), Ve(e2), xr(r2, t2));
  }
  function Je(e2, t2) {
    const r2 = e2._queue.shift();
    e2._queueTotalSize -= r2.byteLength, Ye(e2);
    const o2 = new Uint8Array(r2.buffer, r2.byteOffset, r2.byteLength);
    t2._chunkSteps(o2);
  }
  function Ke(e2) {
    if (null === e2._byobRequest && e2._pendingPullIntos.length > 0) {
      const t2 = e2._pendingPullIntos.peek(), r2 = new Uint8Array(t2.buffer, t2.byteOffset + t2.bytesFilled, t2.byteLength - t2.bytesFilled), o2 = Object.create(ReadableStreamBYOBRequest.prototype);
      !(function(e3, t3, r3) {
        e3._associatedReadableByteStreamController = t3, e3._view = r3;
      })(o2, e2, r2), e2._byobRequest = o2;
    }
    return e2._byobRequest;
  }
  function Ze(e2) {
    const t2 = e2._controlledReadableByteStream._state;
    return "errored" === t2 ? null : "closed" === t2 ? 0 : e2._strategyHWM - e2._queueTotalSize;
  }
  function et(e2, t2) {
    const r2 = e2._pendingPullIntos.peek();
    if ("closed" === e2._controlledReadableByteStream._state) {
      if (0 !== t2) throw new TypeError("bytesWritten must be 0 when calling respond() on a closed stream");
    } else {
      if (0 === t2) throw new TypeError("bytesWritten must be greater than 0 when calling respond() on a readable stream");
      if (r2.bytesFilled + t2 > r2.byteLength) throw new RangeError("bytesWritten out of range");
    }
    r2.buffer = ce(r2.buffer), Ne(e2, t2);
  }
  function tt(e2, t2) {
    const r2 = e2._pendingPullIntos.peek();
    if ("closed" === e2._controlledReadableByteStream._state) {
      if (0 !== t2.byteLength) throw new TypeError("The view's length must be 0 when calling respondWithNewView() on a closed stream");
    } else if (0 === t2.byteLength) throw new TypeError("The view's length must be greater than 0 when calling respondWithNewView() on a readable stream");
    if (r2.byteOffset + r2.bytesFilled !== t2.byteOffset) throw new RangeError("The region specified by view does not match byobRequest");
    if (r2.bufferByteLength !== t2.buffer.byteLength) throw new RangeError("The buffer of view has different capacity than byobRequest");
    if (r2.bytesFilled + t2.byteLength > r2.byteLength) throw new RangeError("The region specified by view is larger than byobRequest");
    const o2 = t2.byteLength;
    r2.buffer = ce(t2.buffer), Ne(e2, o2);
  }
  function rt(e2, t2, r2, o2, n2, i2, a2) {
    t2._controlledReadableByteStream = e2, t2._pullAgain = false, t2._pulling = false, t2._byobRequest = null, t2._queue = t2._queueTotalSize = void 0, qe(t2), t2._closeRequested = false, t2._started = false, t2._strategyHWM = i2, t2._pullAlgorithm = o2, t2._cancelAlgorithm = n2, t2._autoAllocateChunkSize = a2, t2._pendingPullIntos = new v(), e2._readableStreamController = t2;
    h(c(r2()), () => (t2._started = true, je(t2), null), (e3) => (Xe(t2, e3), null));
  }
  function ot(e2) {
    return new TypeError(`ReadableStreamBYOBRequest.prototype.${e2} can only be used on a ReadableStreamBYOBRequest`);
  }
  function nt(e2) {
    return new TypeError(`ReadableByteStreamController.prototype.${e2} can only be used on a ReadableByteStreamController`);
  }
  function it(e2, t2) {
    if ("byob" !== (e2 = `${e2}`)) throw new TypeError(`${t2} '${e2}' is not a valid enumeration value for ReadableStreamReaderMode`);
    return e2;
  }
  function at(e2) {
    return new ReadableStreamBYOBReader(e2);
  }
  function st(e2, t2) {
    e2._reader._readIntoRequests.push(t2);
  }
  function lt(e2) {
    return e2._reader._readIntoRequests.length;
  }
  function ut(e2) {
    const t2 = e2._reader;
    return void 0 !== t2 && !!ft(t2);
  }
  Object.defineProperties(ReadableByteStreamController.prototype, { close: { enumerable: true }, enqueue: { enumerable: true }, error: { enumerable: true }, byobRequest: { enumerable: true }, desiredSize: { enumerable: true } }), o(ReadableByteStreamController.prototype.close, "close"), o(ReadableByteStreamController.prototype.enqueue, "enqueue"), o(ReadableByteStreamController.prototype.error, "error"), "symbol" == typeof Symbol.toStringTag && Object.defineProperty(ReadableByteStreamController.prototype, Symbol.toStringTag, { value: "ReadableByteStreamController", configurable: true });
  var ReadableStreamBYOBReader = class {
    constructor(e2) {
      if (M(e2, 1, "ReadableStreamBYOBReader"), H(e2, "First parameter"), $r(e2)) throw new TypeError("This stream has already been locked for exclusive reading by another reader");
      if (!Oe(e2._readableStreamController)) throw new TypeError("Cannot construct a ReadableStreamBYOBReader for a stream not constructed with a byte source");
      E(this, e2), this._readIntoRequests = new v();
    }
    get closed() {
      return ft(this) ? this._closedPromise : d(_t("closed"));
    }
    cancel(e2 = void 0) {
      return ft(this) ? void 0 === this._ownerReadableStream ? d(B("cancel")) : W(this, e2) : d(_t("cancel"));
    }
    read(e2, t2 = {}) {
      if (!ft(this)) return d(_t("read"));
      if (!ArrayBuffer.isView(e2)) return d(new TypeError("view must be an array buffer view"));
      if (0 === e2.byteLength) return d(new TypeError("view must have non-zero byteLength"));
      if (0 === e2.buffer.byteLength) return d(new TypeError("view's buffer must have non-zero byteLength"));
      if (de(e2.buffer)) return d(new TypeError("view's buffer has been detached"));
      let r2;
      try {
        r2 = (function(e3, t3) {
          var r3;
          return L(e3, t3), { min: N(null !== (r3 = null == e3 ? void 0 : e3.min) && void 0 !== r3 ? r3 : 1, `${t3} has member 'min' that`) };
        })(t2, "options");
      } catch (e3) {
        return d(e3);
      }
      const o2 = r2.min;
      if (0 === o2) return d(new TypeError("options.min must be greater than 0"));
      if ((function(e3) {
        return Ee(e3.constructor);
      })(e2)) {
        if (o2 > e2.byteLength) return d(new RangeError("options.min must be less than or equal to view's byteLength"));
      } else if (o2 > e2.length) return d(new RangeError("options.min must be less than or equal to view's length"));
      if (void 0 === this._ownerReadableStream) return d(B("read from"));
      const n2 = (function(e3, t3, r3) {
        const o3 = e3._ownerReadableStream;
        return "errored" === o3._state || (function(e4, t4, r4) {
          const o4 = e4._controlledReadableByteStream, n3 = We(t4.constructor), { byteLength: i2 } = t4, a2 = r4 * n3;
          return !(e4._pendingPullIntos.length > 0) && ("closed" === o4._state || e4._queueTotalSize >= a2);
        })(o3._readableStreamController, t3, r3);
      })(this, e2, o2) ? new dt() : new ct();
      return ht(this, e2, o2, n2), n2._promise;
    }
    releaseLock() {
      if (!ft(this)) throw _t("releaseLock");
      void 0 !== this._ownerReadableStream && (function(e2) {
        O(e2);
        const t2 = new TypeError("Reader was released");
        bt(e2, t2);
      })(this);
    }
  };
  Object.defineProperties(ReadableStreamBYOBReader.prototype, { cancel: { enumerable: true }, read: { enumerable: true }, releaseLock: { enumerable: true }, closed: { enumerable: true } }), o(ReadableStreamBYOBReader.prototype.cancel, "cancel"), o(ReadableStreamBYOBReader.prototype.read, "read"), o(ReadableStreamBYOBReader.prototype.releaseLock, "releaseLock"), "symbol" == typeof Symbol.toStringTag && Object.defineProperty(ReadableStreamBYOBReader.prototype, Symbol.toStringTag, { value: "ReadableStreamBYOBReader", configurable: true });
  var ct = class {
    constructor() {
      this._promise = u((e2, t2) => {
        this._resolvePromise = e2, this._rejectPromise = t2;
      });
    }
    _chunkSteps(e2) {
      this._resolvePromise({ value: e2, done: false });
    }
    _closeSteps(e2) {
      this._resolvePromise({ value: e2, done: true });
    }
    _errorSteps(e2) {
      this._rejectPromise(e2);
    }
  };
  var dt = class {
    constructor() {
      this._promise = void 0;
    }
    _chunkSteps(e2) {
      this._promise = l({ value: e2, done: false });
    }
    _closeSteps(e2) {
      this._promise = l({ value: e2, done: true });
    }
    _errorSteps(e2) {
      this._promise = d(e2);
    }
  };
  function ft(e2) {
    return !!t(e2) && (!!Object.prototype.hasOwnProperty.call(e2, "_readIntoRequests") && e2 instanceof ReadableStreamBYOBReader);
  }
  function ht(e2, t2, r2, o2) {
    const n2 = e2._ownerReadableStream;
    n2._disturbed = true, "errored" === n2._state ? o2._errorSteps(n2._storedError) : (function(e3, t3, r3, o3) {
      const n3 = e3._controlledReadableByteStream, i2 = t3.constructor, a2 = We(i2), { byteOffset: s2, byteLength: l2 } = t3, u2 = r3 * a2;
      let c2;
      try {
        c2 = ce(t3.buffer);
      } catch (e4) {
        return void o3._errorSteps(e4);
      }
      const d2 = { buffer: c2, bufferByteLength: c2.byteLength, byteOffset: s2, byteLength: l2, bytesFilled: 0, minimumFill: u2, elementSize: a2, viewConstructor: i2, readerType: "byob" };
      if (e3._pendingPullIntos.length > 0) return e3._pendingPullIntos.push(d2), void st(n3, o3);
      if ("closed" === n3._state) {
        const e4 = new i2(d2.buffer, d2.byteOffset, 0);
        return void o3._closeSteps(e4);
      }
      if (e3._queueTotalSize > 0) {
        if ($e(e3, d2)) {
          const t4 = De(d2);
          return Ye(e3), void o3._chunkSteps(t4);
        }
        if (e3._closeRequested) {
          const t4 = new TypeError("Insufficient bytes to fill elements in the given buffer");
          return Xe(e3, t4), void o3._errorSteps(t4);
        }
      }
      e3._pendingPullIntos.push(d2), st(n3, o3), je(e3);
    })(n2._readableStreamController, t2, r2, o2);
  }
  function bt(e2, t2) {
    const r2 = e2._readIntoRequests;
    e2._readIntoRequests = new v(), r2.forEach((e3) => {
      e3._errorSteps(t2);
    });
  }
  function _t(e2) {
    return new TypeError(`ReadableStreamBYOBReader.prototype.${e2} can only be used on a ReadableStreamBYOBReader`);
  }
  function mt(e2, t2) {
    const { highWaterMark: r2 } = e2;
    if (void 0 === r2) return t2;
    if (Re(r2) || r2 < 0) throw new RangeError("Invalid highWaterMark");
    return r2;
  }
  function pt(e2) {
    const { size: t2 } = e2;
    return t2 || (() => 1);
  }
  function yt(e2, t2) {
    L(e2, t2);
    const r2 = null == e2 ? void 0 : e2.highWaterMark, o2 = null == e2 ? void 0 : e2.size;
    return { highWaterMark: void 0 === r2 ? void 0 : x(r2), size: void 0 === o2 ? void 0 : St(o2, `${t2} has member 'size' that`) };
  }
  function St(e2, t2) {
    return I(e2, t2), (t3) => x(e2(t3));
  }
  function gt(e2, t2, r2) {
    return I(e2, r2), (r3) => g(e2, t2, [r3]);
  }
  function vt(e2, t2, r2) {
    return I(e2, r2), () => g(e2, t2, []);
  }
  function wt(e2, t2, r2) {
    return I(e2, r2), (r3) => S(e2, t2, [r3]);
  }
  function Rt(e2, t2, r2) {
    return I(e2, r2), (r3, o2) => g(e2, t2, [r3, o2]);
  }
  function Tt(e2, t2) {
    if (!qt(e2)) throw new TypeError(`${t2} is not a WritableStream.`);
  }
  var WritableStream = class {
    constructor(e2 = {}, t2 = {}) {
      void 0 === e2 ? e2 = null : $(e2, "First parameter");
      const r2 = yt(t2, "Second parameter"), o2 = (function(e3, t3) {
        L(e3, t3);
        const r3 = null == e3 ? void 0 : e3.abort, o3 = null == e3 ? void 0 : e3.close, n3 = null == e3 ? void 0 : e3.start, i2 = null == e3 ? void 0 : e3.type, a2 = null == e3 ? void 0 : e3.write;
        return { abort: void 0 === r3 ? void 0 : gt(r3, e3, `${t3} has member 'abort' that`), close: void 0 === o3 ? void 0 : vt(o3, e3, `${t3} has member 'close' that`), start: void 0 === n3 ? void 0 : wt(n3, e3, `${t3} has member 'start' that`), write: void 0 === a2 ? void 0 : Rt(a2, e3, `${t3} has member 'write' that`), type: i2 };
      })(e2, "First parameter");
      Ct(this);
      if (void 0 !== o2.type) throw new RangeError("Invalid type is specified");
      const n2 = pt(r2);
      !(function(e3, t3, r3, o3) {
        const n3 = Object.create(WritableStreamDefaultController.prototype);
        let i2, a2, s2, l2;
        i2 = void 0 !== t3.start ? () => t3.start(n3) : () => {
        };
        a2 = void 0 !== t3.write ? (e4) => t3.write(e4, n3) : () => c(void 0);
        s2 = void 0 !== t3.close ? () => t3.close() : () => c(void 0);
        l2 = void 0 !== t3.abort ? (e4) => t3.abort(e4) : () => c(void 0);
        Nt(e3, n3, i2, a2, s2, l2, r3, o3);
      })(this, o2, mt(r2, 1), n2);
    }
    get locked() {
      if (!qt(this)) throw Kt("locked");
      return Et(this);
    }
    abort(e2 = void 0) {
      return qt(this) ? Et(this) ? d(new TypeError("Cannot abort a stream that already has a writer")) : Wt(this, e2) : d(Kt("abort"));
    }
    close() {
      return qt(this) ? Et(this) ? d(new TypeError("Cannot close a stream that already has a writer")) : At(this) ? d(new TypeError("Cannot close an already-closing stream")) : Ot(this) : d(Kt("close"));
    }
    getWriter() {
      if (!qt(this)) throw Kt("getWriter");
      return Pt(this);
    }
  };
  function Pt(e2) {
    return new WritableStreamDefaultWriter(e2);
  }
  function Ct(e2) {
    e2._state = "writable", e2._storedError = void 0, e2._writer = void 0, e2._writableStreamController = void 0, e2._writeRequests = new v(), e2._inFlightWriteRequest = void 0, e2._closeRequest = void 0, e2._inFlightCloseRequest = void 0, e2._pendingAbortRequest = void 0, e2._backpressure = false;
  }
  function qt(e2) {
    return !!t(e2) && (!!Object.prototype.hasOwnProperty.call(e2, "_writableStreamController") && e2 instanceof WritableStream);
  }
  function Et(e2) {
    return void 0 !== e2._writer;
  }
  function Wt(e2, t2) {
    var r2;
    if ("closed" === e2._state || "errored" === e2._state) return c(void 0);
    e2._writableStreamController._abortReason = t2, null === (r2 = e2._writableStreamController._abortController) || void 0 === r2 || r2.abort(t2);
    const o2 = e2._state;
    if ("closed" === o2 || "errored" === o2) return c(void 0);
    if (void 0 !== e2._pendingAbortRequest) return e2._pendingAbortRequest._promise;
    let n2 = false;
    "erroring" === o2 && (n2 = true, t2 = void 0);
    const i2 = u((r3, o3) => {
      e2._pendingAbortRequest = { _promise: void 0, _resolve: r3, _reject: o3, _reason: t2, _wasAlreadyErroring: n2 };
    });
    return e2._pendingAbortRequest._promise = i2, n2 || jt(e2, t2), i2;
  }
  function Ot(e2) {
    const t2 = e2._state;
    if ("closed" === t2 || "errored" === t2) return d(new TypeError(`The stream (in ${t2} state) is not in the writable state and cannot be closed`));
    const r2 = u((t3, r3) => {
      const o3 = { _resolve: t3, _reject: r3 };
      e2._closeRequest = o3;
    }), o2 = e2._writer;
    var n2;
    return void 0 !== o2 && e2._backpressure && "writable" === t2 && cr(o2), Ce(n2 = e2._writableStreamController, xt, 0), Ut(n2), r2;
  }
  function Bt(e2, t2) {
    "writable" !== e2._state ? kt(e2) : jt(e2, t2);
  }
  function jt(e2, t2) {
    const r2 = e2._writableStreamController;
    e2._state = "erroring", e2._storedError = t2;
    const o2 = e2._writer;
    void 0 !== o2 && $t(o2, t2), !(function(e3) {
      if (void 0 === e3._inFlightWriteRequest && void 0 === e3._inFlightCloseRequest) return false;
      return true;
    })(e2) && r2._started && kt(e2);
  }
  function kt(e2) {
    e2._state = "errored", e2._writableStreamController[R]();
    const t2 = e2._storedError;
    if (e2._writeRequests.forEach((e3) => {
      e3._reject(t2);
    }), e2._writeRequests = new v(), void 0 === e2._pendingAbortRequest) return void zt(e2);
    const r2 = e2._pendingAbortRequest;
    if (e2._pendingAbortRequest = void 0, r2._wasAlreadyErroring) return r2._reject(t2), void zt(e2);
    h(e2._writableStreamController[w](r2._reason), () => (r2._resolve(), zt(e2), null), (t3) => (r2._reject(t3), zt(e2), null));
  }
  function At(e2) {
    return void 0 !== e2._closeRequest || void 0 !== e2._inFlightCloseRequest;
  }
  function zt(e2) {
    void 0 !== e2._closeRequest && (e2._closeRequest._reject(e2._storedError), e2._closeRequest = void 0);
    const t2 = e2._writer;
    void 0 !== t2 && nr(t2, e2._storedError);
  }
  function Dt(e2, t2) {
    const r2 = e2._writer;
    void 0 !== r2 && t2 !== e2._backpressure && (t2 ? (function(e3) {
      ar(e3);
    })(r2) : cr(r2)), e2._backpressure = t2;
  }
  Object.defineProperties(WritableStream.prototype, { abort: { enumerable: true }, close: { enumerable: true }, getWriter: { enumerable: true }, locked: { enumerable: true } }), o(WritableStream.prototype.abort, "abort"), o(WritableStream.prototype.close, "close"), o(WritableStream.prototype.getWriter, "getWriter"), "symbol" == typeof Symbol.toStringTag && Object.defineProperty(WritableStream.prototype, Symbol.toStringTag, { value: "WritableStream", configurable: true });
  var WritableStreamDefaultWriter = class {
    constructor(e2) {
      if (M(e2, 1, "WritableStreamDefaultWriter"), Tt(e2, "First parameter"), Et(e2)) throw new TypeError("This stream has already been locked for exclusive writing by another writer");
      this._ownerWritableStream = e2, e2._writer = this;
      const t2 = e2._state;
      if ("writable" === t2) !At(e2) && e2._backpressure ? ar(this) : lr(this), rr(this);
      else if ("erroring" === t2) sr(this, e2._storedError), rr(this);
      else if ("closed" === t2) lr(this), rr(r2 = this), ir(r2);
      else {
        const t3 = e2._storedError;
        sr(this, t3), or(this, t3);
      }
      var r2;
    }
    get closed() {
      return Ft(this) ? this._closedPromise : d(er("closed"));
    }
    get desiredSize() {
      if (!Ft(this)) throw er("desiredSize");
      if (void 0 === this._ownerWritableStream) throw tr("desiredSize");
      return (function(e2) {
        const t2 = e2._ownerWritableStream, r2 = t2._state;
        if ("errored" === r2 || "erroring" === r2) return null;
        if ("closed" === r2) return 0;
        return Vt(t2._writableStreamController);
      })(this);
    }
    get ready() {
      return Ft(this) ? this._readyPromise : d(er("ready"));
    }
    abort(e2 = void 0) {
      return Ft(this) ? void 0 === this._ownerWritableStream ? d(tr("abort")) : (function(e3, t2) {
        return Wt(e3._ownerWritableStream, t2);
      })(this, e2) : d(er("abort"));
    }
    close() {
      if (!Ft(this)) return d(er("close"));
      const e2 = this._ownerWritableStream;
      return void 0 === e2 ? d(tr("close")) : At(e2) ? d(new TypeError("Cannot close an already-closing stream")) : Lt(this);
    }
    releaseLock() {
      if (!Ft(this)) throw er("releaseLock");
      void 0 !== this._ownerWritableStream && Mt(this);
    }
    write(e2 = void 0) {
      return Ft(this) ? void 0 === this._ownerWritableStream ? d(tr("write to")) : Yt(this, e2) : d(er("write"));
    }
  };
  function Ft(e2) {
    return !!t(e2) && (!!Object.prototype.hasOwnProperty.call(e2, "_ownerWritableStream") && e2 instanceof WritableStreamDefaultWriter);
  }
  function Lt(e2) {
    return Ot(e2._ownerWritableStream);
  }
  function It(e2, t2) {
    "pending" === e2._closedPromiseState ? nr(e2, t2) : (function(e3, t3) {
      or(e3, t3);
    })(e2, t2);
  }
  function $t(e2, t2) {
    "pending" === e2._readyPromiseState ? ur(e2, t2) : (function(e3, t3) {
      sr(e3, t3);
    })(e2, t2);
  }
  function Mt(e2) {
    const t2 = e2._ownerWritableStream, r2 = new TypeError("Writer was released and can no longer be used to monitor the stream's closedness");
    $t(e2, r2), It(e2, r2), t2._writer = void 0, e2._ownerWritableStream = void 0;
  }
  function Yt(e2, t2) {
    const r2 = e2._ownerWritableStream, o2 = r2._writableStreamController, n2 = (function(e3, t3) {
      if (void 0 === e3._strategySizeAlgorithm) return 1;
      try {
        return e3._strategySizeAlgorithm(t3);
      } catch (t4) {
        return Gt(e3, t4), 1;
      }
    })(o2, t2);
    if (r2 !== e2._ownerWritableStream) return d(tr("write to"));
    const i2 = r2._state;
    if ("errored" === i2) return d(r2._storedError);
    if (At(r2) || "closed" === i2) return d(new TypeError("The stream is closing or closed and cannot be written to"));
    if ("erroring" === i2) return d(r2._storedError);
    const a2 = (function(e3) {
      return u((t3, r3) => {
        const o3 = { _resolve: t3, _reject: r3 };
        e3._writeRequests.push(o3);
      });
    })(r2);
    return (function(e3, t3, r3) {
      try {
        Ce(e3, t3, r3);
      } catch (t4) {
        return void Gt(e3, t4);
      }
      const o3 = e3._controlledWritableStream;
      if (!At(o3) && "writable" === o3._state) {
        Dt(o3, Xt(e3));
      }
      Ut(e3);
    })(o2, t2, n2), a2;
  }
  Object.defineProperties(WritableStreamDefaultWriter.prototype, { abort: { enumerable: true }, close: { enumerable: true }, releaseLock: { enumerable: true }, write: { enumerable: true }, closed: { enumerable: true }, desiredSize: { enumerable: true }, ready: { enumerable: true } }), o(WritableStreamDefaultWriter.prototype.abort, "abort"), o(WritableStreamDefaultWriter.prototype.close, "close"), o(WritableStreamDefaultWriter.prototype.releaseLock, "releaseLock"), o(WritableStreamDefaultWriter.prototype.write, "write"), "symbol" == typeof Symbol.toStringTag && Object.defineProperty(WritableStreamDefaultWriter.prototype, Symbol.toStringTag, { value: "WritableStreamDefaultWriter", configurable: true });
  var xt = {};
  var WritableStreamDefaultController = class {
    constructor() {
      throw new TypeError("Illegal constructor");
    }
    get abortReason() {
      if (!Qt(this)) throw Zt("abortReason");
      return this._abortReason;
    }
    get signal() {
      if (!Qt(this)) throw Zt("signal");
      if (void 0 === this._abortController) throw new TypeError("WritableStreamDefaultController.prototype.signal is not supported");
      return this._abortController.signal;
    }
    error(e2 = void 0) {
      if (!Qt(this)) throw Zt("error");
      "writable" === this._controlledWritableStream._state && Jt(this, e2);
    }
    [w](e2) {
      const t2 = this._abortAlgorithm(e2);
      return Ht(this), t2;
    }
    [R]() {
      qe(this);
    }
  };
  function Qt(e2) {
    return !!t(e2) && (!!Object.prototype.hasOwnProperty.call(e2, "_controlledWritableStream") && e2 instanceof WritableStreamDefaultController);
  }
  function Nt(e2, t2, r2, o2, n2, i2, a2, s2) {
    t2._controlledWritableStream = e2, e2._writableStreamController = t2, t2._queue = void 0, t2._queueTotalSize = void 0, qe(t2), t2._abortReason = void 0, t2._abortController = (function() {
      if ("function" == typeof AbortController) return new AbortController();
    })(), t2._started = false, t2._strategySizeAlgorithm = s2, t2._strategyHWM = a2, t2._writeAlgorithm = o2, t2._closeAlgorithm = n2, t2._abortAlgorithm = i2;
    const l2 = Xt(t2);
    Dt(e2, l2);
    h(c(r2()), () => (t2._started = true, Ut(t2), null), (r3) => (t2._started = true, Bt(e2, r3), null));
  }
  function Ht(e2) {
    e2._writeAlgorithm = void 0, e2._closeAlgorithm = void 0, e2._abortAlgorithm = void 0, e2._strategySizeAlgorithm = void 0;
  }
  function Vt(e2) {
    return e2._strategyHWM - e2._queueTotalSize;
  }
  function Ut(e2) {
    const t2 = e2._controlledWritableStream;
    if (!e2._started) return;
    if (void 0 !== t2._inFlightWriteRequest) return;
    if ("erroring" === t2._state) return void kt(t2);
    if (0 === e2._queue.length) return;
    const r2 = e2._queue.peek().value;
    r2 === xt ? (function(e3) {
      const t3 = e3._controlledWritableStream;
      (function(e4) {
        e4._inFlightCloseRequest = e4._closeRequest, e4._closeRequest = void 0;
      })(t3), Pe(e3);
      const r3 = e3._closeAlgorithm();
      Ht(e3), h(r3, () => ((function(e4) {
        e4._inFlightCloseRequest._resolve(void 0), e4._inFlightCloseRequest = void 0, "erroring" === e4._state && (e4._storedError = void 0, void 0 !== e4._pendingAbortRequest && (e4._pendingAbortRequest._resolve(), e4._pendingAbortRequest = void 0)), e4._state = "closed";
        const t4 = e4._writer;
        void 0 !== t4 && ir(t4);
      })(t3), null), (e4) => ((function(e5, t4) {
        e5._inFlightCloseRequest._reject(t4), e5._inFlightCloseRequest = void 0, void 0 !== e5._pendingAbortRequest && (e5._pendingAbortRequest._reject(t4), e5._pendingAbortRequest = void 0), Bt(e5, t4);
      })(t3, e4), null));
    })(e2) : (function(e3, t3) {
      const r3 = e3._controlledWritableStream;
      !(function(e4) {
        e4._inFlightWriteRequest = e4._writeRequests.shift();
      })(r3);
      const o2 = e3._writeAlgorithm(t3);
      h(o2, () => {
        !(function(e4) {
          e4._inFlightWriteRequest._resolve(void 0), e4._inFlightWriteRequest = void 0;
        })(r3);
        const t4 = r3._state;
        if (Pe(e3), !At(r3) && "writable" === t4) {
          const t5 = Xt(e3);
          Dt(r3, t5);
        }
        return Ut(e3), null;
      }, (t4) => ("writable" === r3._state && Ht(e3), (function(e4, t5) {
        e4._inFlightWriteRequest._reject(t5), e4._inFlightWriteRequest = void 0, Bt(e4, t5);
      })(r3, t4), null));
    })(e2, r2);
  }
  function Gt(e2, t2) {
    "writable" === e2._controlledWritableStream._state && Jt(e2, t2);
  }
  function Xt(e2) {
    return Vt(e2) <= 0;
  }
  function Jt(e2, t2) {
    const r2 = e2._controlledWritableStream;
    Ht(e2), jt(r2, t2);
  }
  function Kt(e2) {
    return new TypeError(`WritableStream.prototype.${e2} can only be used on a WritableStream`);
  }
  function Zt(e2) {
    return new TypeError(`WritableStreamDefaultController.prototype.${e2} can only be used on a WritableStreamDefaultController`);
  }
  function er(e2) {
    return new TypeError(`WritableStreamDefaultWriter.prototype.${e2} can only be used on a WritableStreamDefaultWriter`);
  }
  function tr(e2) {
    return new TypeError("Cannot " + e2 + " a stream using a released writer");
  }
  function rr(e2) {
    e2._closedPromise = u((t2, r2) => {
      e2._closedPromise_resolve = t2, e2._closedPromise_reject = r2, e2._closedPromiseState = "pending";
    });
  }
  function or(e2, t2) {
    rr(e2), nr(e2, t2);
  }
  function nr(e2, t2) {
    void 0 !== e2._closedPromise_reject && (p(e2._closedPromise), e2._closedPromise_reject(t2), e2._closedPromise_resolve = void 0, e2._closedPromise_reject = void 0, e2._closedPromiseState = "rejected");
  }
  function ir(e2) {
    void 0 !== e2._closedPromise_resolve && (e2._closedPromise_resolve(void 0), e2._closedPromise_resolve = void 0, e2._closedPromise_reject = void 0, e2._closedPromiseState = "resolved");
  }
  function ar(e2) {
    e2._readyPromise = u((t2, r2) => {
      e2._readyPromise_resolve = t2, e2._readyPromise_reject = r2;
    }), e2._readyPromiseState = "pending";
  }
  function sr(e2, t2) {
    ar(e2), ur(e2, t2);
  }
  function lr(e2) {
    ar(e2), cr(e2);
  }
  function ur(e2, t2) {
    void 0 !== e2._readyPromise_reject && (p(e2._readyPromise), e2._readyPromise_reject(t2), e2._readyPromise_resolve = void 0, e2._readyPromise_reject = void 0, e2._readyPromiseState = "rejected");
  }
  function cr(e2) {
    void 0 !== e2._readyPromise_resolve && (e2._readyPromise_resolve(void 0), e2._readyPromise_resolve = void 0, e2._readyPromise_reject = void 0, e2._readyPromiseState = "fulfilled");
  }
  Object.defineProperties(WritableStreamDefaultController.prototype, { abortReason: { enumerable: true }, signal: { enumerable: true }, error: { enumerable: true } }), "symbol" == typeof Symbol.toStringTag && Object.defineProperty(WritableStreamDefaultController.prototype, Symbol.toStringTag, { value: "WritableStreamDefaultController", configurable: true });
  var dr = "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : "undefined" != typeof global ? global : void 0;
  var fr = (function() {
    const e2 = null == dr ? void 0 : dr.DOMException;
    return (function(e3) {
      if ("function" != typeof e3 && "object" != typeof e3) return false;
      if ("DOMException" !== e3.name) return false;
      try {
        return new e3(), true;
      } catch (e4) {
        return false;
      }
    })(e2) ? e2 : void 0;
  })() || (function() {
    const e2 = function(e3, t2) {
      this.message = e3 || "", this.name = t2 || "Error", Error.captureStackTrace && Error.captureStackTrace(this, this.constructor);
    };
    return o(e2, "DOMException"), e2.prototype = Object.create(Error.prototype), Object.defineProperty(e2.prototype, "constructor", { value: e2, writable: true, configurable: true }), e2;
  })();
  function hr(e2, t2, r2, o2, n2, i2) {
    const a2 = V(e2), s2 = Pt(t2);
    e2._disturbed = true;
    const l2 = new br(s2), _2 = new mr(l2);
    return u((m2, y2) => {
      let S2;
      if (void 0 !== i2) {
        if (S2 = () => {
          const r3 = void 0 !== i2.reason ? i2.reason : new fr("Aborted", "AbortError"), a3 = [];
          o2 || a3.push(() => "writable" === t2._state ? Wt(t2, r3) : c(void 0)), n2 || a3.push(() => "readable" === e2._state ? Mr(e2, r3) : c(void 0)), T2(() => Promise.all(a3.map((e3) => e3())), true, r3);
        }, i2.aborted) return void S2();
        i2.addEventListener("abort", S2);
      }
      function g2() {
        for (; !l2._shuttingDown && !t2._backpressure && "writable" === t2._state && !At(t2) && "readable" === e2._state && re(a2); ) te(a2, _2);
        if (l2._shuttingDown) return c(true);
        if (t2._backpressure) return f(s2._readyPromise, g2);
        const r3 = new _r(l2);
        return te(a2, r3), r3._promise;
      }
      var v2, w2, R2;
      if (pr(e2, a2._closedPromise, (e3) => (o2 ? P2(true, e3) : T2(() => Wt(t2, e3), true, e3), null)), pr(t2, s2._closedPromise, (t3) => (n2 ? P2(true, t3) : T2(() => Mr(e2, t3), true, t3), null)), v2 = e2, w2 = a2._closedPromise, R2 = () => (r2 ? P2() : T2(() => (function(e3) {
        const t3 = e3._ownerWritableStream, r3 = t3._state;
        return At(t3) || "closed" === r3 ? c(void 0) : "errored" === r3 ? d(t3._storedError) : Lt(e3);
      })(s2)), null), "closed" === v2._state ? R2() : b(w2, R2), At(t2) || "closed" === t2._state) {
        const t3 = new TypeError("the destination writable stream closed before all data could be piped to it");
        n2 ? P2(true, t3) : T2(() => Mr(e2, t3), true, t3);
      }
      function T2(e3, r3, o3) {
        function n3() {
          return h(e3(), () => C2(r3, o3), (e4) => C2(true, e4)), null;
        }
        l2._shuttingDown || (l2._shuttingDown = true, "writable" !== t2._state || At(t2) ? n3() : b(l2._waitForWritesToFinish(), n3));
      }
      function P2(e3, r3) {
        l2._shuttingDown || (l2._shuttingDown = true, "writable" !== t2._state || At(t2) ? C2(e3, r3) : b(l2._waitForWritesToFinish(), () => C2(e3, r3)));
      }
      function C2(e3, t3) {
        return Mt(s2), O(a2), void 0 !== i2 && i2.removeEventListener("abort", S2), e3 ? y2(t3) : m2(void 0), null;
      }
      p(u((e3, t3) => {
        !(function r3(o3) {
          o3 ? e3() : f(g2(), r3, t3);
        })(false);
      }));
    });
  }
  var br = class {
    constructor(e2) {
      this._writer = e2, this._shuttingDown = false, this._currentWrite = c(void 0);
    }
    _waitForWritesToFinish() {
      const e2 = this._currentWrite;
      return f(this._currentWrite, () => e2 !== this._currentWrite ? this._waitForWritesToFinish() : void 0);
    }
  };
  var _r = class {
    constructor(e2) {
      this._state = e2, this._promise = u((e3, t2) => {
        this._resolvePromise = e3, this._rejectPromise = t2;
      });
    }
    _chunkSteps(t2) {
      this._state._currentWrite = f(Yt(this._state._writer, t2), void 0, e), this._resolvePromise(false);
    }
    _closeSteps() {
      this._resolvePromise(true);
    }
    _errorSteps(e2) {
      this._rejectPromise(e2);
    }
  };
  var mr = class {
    constructor(e2) {
      this._state = e2;
    }
    _chunkSteps(t2) {
      this._state._currentWrite = f(Yt(this._state._writer, t2), void 0, e);
    }
    _closeSteps() {
    }
    _errorSteps(e2) {
    }
  };
  function pr(e2, t2, r2) {
    "errored" === e2._state ? r2(e2._storedError) : _(t2, r2);
  }
  var ReadableStreamDefaultController = class {
    constructor() {
      throw new TypeError("Illegal constructor");
    }
    get desiredSize() {
      if (!yr(this)) throw Er("desiredSize");
      return Pr(this);
    }
    close() {
      if (!yr(this)) throw Er("close");
      if (!Cr(this)) throw new TypeError("The stream is not in a state that permits close");
      wr(this);
    }
    enqueue(e2 = void 0) {
      if (!yr(this)) throw Er("enqueue");
      if (!Cr(this)) throw new TypeError("The stream is not in a state that permits enqueue");
      return Rr(this, e2);
    }
    error(e2 = void 0) {
      if (!yr(this)) throw Er("error");
      Tr(this, e2);
    }
    [T](e2) {
      qe(this);
      const t2 = this._cancelAlgorithm(e2);
      return vr(this), t2;
    }
    [P](e2) {
      const t2 = this._controlledReadableStream;
      if (this._queue.length > 0) {
        const r2 = Pe(this);
        this._closeRequested && 0 === this._queue.length ? (vr(this), Yr(t2)) : Sr(this), e2._chunkSteps(r2);
      } else U(t2, e2), Sr(this);
    }
    [C]() {
      return this._queue.length > 0;
    }
    [q]() {
    }
  };
  function yr(e2) {
    return !!t(e2) && (!!Object.prototype.hasOwnProperty.call(e2, "_controlledReadableStream") && e2 instanceof ReadableStreamDefaultController);
  }
  function Sr(e2) {
    if (!gr(e2)) return;
    if (e2._pulling) return void (e2._pullAgain = true);
    e2._pulling = true;
    h(e2._pullAlgorithm(), () => (e2._pulling = false, e2._pullAgain && (e2._pullAgain = false, Sr(e2)), null), (t2) => (Tr(e2, t2), null));
  }
  function gr(e2) {
    const t2 = e2._controlledReadableStream;
    if (!Cr(e2)) return false;
    if (!e2._started) return false;
    if ($r(t2) && X(t2) > 0) return true;
    return Pr(e2) > 0;
  }
  function vr(e2) {
    e2._pullAlgorithm = void 0, e2._cancelAlgorithm = void 0, e2._strategySizeAlgorithm = void 0;
  }
  function wr(e2) {
    if (!Cr(e2)) return;
    const t2 = e2._controlledReadableStream;
    e2._closeRequested = true, 0 === e2._queue.length && (vr(e2), Yr(t2));
  }
  function Rr(e2, t2) {
    if (!Cr(e2)) return;
    const r2 = e2._controlledReadableStream;
    if ($r(r2) && X(r2) > 0) G(r2, t2, false);
    else {
      let r3;
      try {
        r3 = e2._strategySizeAlgorithm(t2);
      } catch (t3) {
        throw Tr(e2, t3), t3;
      }
      try {
        Ce(e2, t2, r3);
      } catch (t3) {
        throw Tr(e2, t3), t3;
      }
    }
    Sr(e2);
  }
  function Tr(e2, t2) {
    const r2 = e2._controlledReadableStream;
    "readable" === r2._state && (qe(e2), vr(e2), xr(r2, t2));
  }
  function Pr(e2) {
    const t2 = e2._controlledReadableStream._state;
    return "errored" === t2 ? null : "closed" === t2 ? 0 : e2._strategyHWM - e2._queueTotalSize;
  }
  function Cr(e2) {
    const t2 = e2._controlledReadableStream._state;
    return !e2._closeRequested && "readable" === t2;
  }
  function qr(e2, t2, r2, o2, n2, i2, a2) {
    t2._controlledReadableStream = e2, t2._queue = void 0, t2._queueTotalSize = void 0, qe(t2), t2._started = false, t2._closeRequested = false, t2._pullAgain = false, t2._pulling = false, t2._strategySizeAlgorithm = a2, t2._strategyHWM = i2, t2._pullAlgorithm = o2, t2._cancelAlgorithm = n2, e2._readableStreamController = t2;
    h(c(r2()), () => (t2._started = true, Sr(t2), null), (e3) => (Tr(t2, e3), null));
  }
  function Er(e2) {
    return new TypeError(`ReadableStreamDefaultController.prototype.${e2} can only be used on a ReadableStreamDefaultController`);
  }
  function Wr(e2, t2) {
    return Oe(e2._readableStreamController) ? (function(e3) {
      let t3, r2, o2, n2, i2, a2 = V(e3), s2 = false, l2 = false, d2 = false, f2 = false, h2 = false;
      const b2 = u((e4) => {
        i2 = e4;
      });
      function m2(e4) {
        _(e4._closedPromise, (t4) => (e4 !== a2 || (Xe(o2._readableStreamController, t4), Xe(n2._readableStreamController, t4), f2 && h2 || i2(void 0)), null));
      }
      function p2() {
        ft(a2) && (O(a2), a2 = V(e3), m2(a2));
        te(a2, { _chunkSteps: (t4) => {
          y(() => {
            l2 = false, d2 = false;
            const r3 = t4;
            let a3 = t4;
            if (!f2 && !h2) try {
              a3 = Te(t4);
            } catch (t5) {
              return Xe(o2._readableStreamController, t5), Xe(n2._readableStreamController, t5), void i2(Mr(e3, t5));
            }
            f2 || Ge(o2._readableStreamController, r3), h2 || Ge(n2._readableStreamController, a3), s2 = false, l2 ? g2() : d2 && v2();
          });
        }, _closeSteps: () => {
          s2 = false, f2 || Ue(o2._readableStreamController), h2 || Ue(n2._readableStreamController), o2._readableStreamController._pendingPullIntos.length > 0 && et(o2._readableStreamController, 0), n2._readableStreamController._pendingPullIntos.length > 0 && et(n2._readableStreamController, 0), f2 && h2 || i2(void 0);
        }, _errorSteps: () => {
          s2 = false;
        } });
      }
      function S2(t4, r3) {
        ee(a2) && (O(a2), a2 = at(e3), m2(a2));
        const u2 = r3 ? n2 : o2, c2 = r3 ? o2 : n2;
        ht(a2, t4, 1, { _chunkSteps: (t5) => {
          y(() => {
            l2 = false, d2 = false;
            const o3 = r3 ? h2 : f2;
            if (r3 ? f2 : h2) o3 || tt(u2._readableStreamController, t5);
            else {
              let r4;
              try {
                r4 = Te(t5);
              } catch (t6) {
                return Xe(u2._readableStreamController, t6), Xe(c2._readableStreamController, t6), void i2(Mr(e3, t6));
              }
              o3 || tt(u2._readableStreamController, t5), Ge(c2._readableStreamController, r4);
            }
            s2 = false, l2 ? g2() : d2 && v2();
          });
        }, _closeSteps: (e4) => {
          s2 = false;
          const t5 = r3 ? h2 : f2, o3 = r3 ? f2 : h2;
          t5 || Ue(u2._readableStreamController), o3 || Ue(c2._readableStreamController), void 0 !== e4 && (t5 || tt(u2._readableStreamController, e4), !o3 && c2._readableStreamController._pendingPullIntos.length > 0 && et(c2._readableStreamController, 0)), t5 && o3 || i2(void 0);
        }, _errorSteps: () => {
          s2 = false;
        } });
      }
      function g2() {
        if (s2) return l2 = true, c(void 0);
        s2 = true;
        const e4 = Ke(o2._readableStreamController);
        return null === e4 ? p2() : S2(e4._view, false), c(void 0);
      }
      function v2() {
        if (s2) return d2 = true, c(void 0);
        s2 = true;
        const e4 = Ke(n2._readableStreamController);
        return null === e4 ? p2() : S2(e4._view, true), c(void 0);
      }
      function w2(o3) {
        if (f2 = true, t3 = o3, h2) {
          const o4 = le([t3, r2]), n3 = Mr(e3, o4);
          i2(n3);
        }
        return b2;
      }
      function R2(o3) {
        if (h2 = true, r2 = o3, f2) {
          const o4 = le([t3, r2]), n3 = Mr(e3, o4);
          i2(n3);
        }
        return b2;
      }
      function T2() {
      }
      return o2 = Fr(T2, g2, w2), n2 = Fr(T2, v2, R2), m2(a2), [o2, n2];
    })(e2) : (function(e3) {
      const t3 = V(e3);
      let r2, o2, n2, i2, a2, s2 = false, l2 = false, d2 = false, f2 = false;
      const h2 = u((e4) => {
        a2 = e4;
      });
      function b2() {
        if (s2) return l2 = true, c(void 0);
        s2 = true;
        return te(t3, { _chunkSteps: (e4) => {
          y(() => {
            l2 = false;
            const t4 = e4, r3 = e4;
            d2 || Rr(n2._readableStreamController, t4), f2 || Rr(i2._readableStreamController, r3), s2 = false, l2 && b2();
          });
        }, _closeSteps: () => {
          s2 = false, d2 || wr(n2._readableStreamController), f2 || wr(i2._readableStreamController), d2 && f2 || a2(void 0);
        }, _errorSteps: () => {
          s2 = false;
        } }), c(void 0);
      }
      function m2(t4) {
        if (d2 = true, r2 = t4, f2) {
          const t5 = le([r2, o2]), n3 = Mr(e3, t5);
          a2(n3);
        }
        return h2;
      }
      function p2(t4) {
        if (f2 = true, o2 = t4, d2) {
          const t5 = le([r2, o2]), n3 = Mr(e3, t5);
          a2(n3);
        }
        return h2;
      }
      function S2() {
      }
      return n2 = Dr(S2, b2, m2), i2 = Dr(S2, b2, p2), _(t3._closedPromise, (e4) => (Tr(n2._readableStreamController, e4), Tr(i2._readableStreamController, e4), d2 && f2 || a2(void 0), null)), [n2, i2];
    })(e2);
  }
  function Or(r2) {
    return t(o2 = r2) && void 0 !== o2.getReader ? (function(r3) {
      let o3;
      function n2() {
        let e2;
        try {
          e2 = r3.read();
        } catch (e3) {
          return d(e3);
        }
        return m(e2, (e3) => {
          if (!t(e3)) throw new TypeError("The promise returned by the reader.read() method must fulfill with an object");
          if (e3.done) wr(o3._readableStreamController);
          else {
            const t2 = e3.value;
            Rr(o3._readableStreamController, t2);
          }
        });
      }
      function i2(e2) {
        try {
          return c(r3.cancel(e2));
        } catch (e3) {
          return d(e3);
        }
      }
      return o3 = Dr(e, n2, i2, 0), o3;
    })(r2.getReader()) : (function(r3) {
      let o3;
      const n2 = me(r3, "async");
      function i2() {
        let e2;
        try {
          e2 = pe(n2);
        } catch (e3) {
          return d(e3);
        }
        return m(c(e2), (e3) => {
          if (!t(e3)) throw new TypeError("The promise returned by the iterator.next() method must fulfill with an object");
          if (e3.done) wr(o3._readableStreamController);
          else {
            const t2 = e3.value;
            Rr(o3._readableStreamController, t2);
          }
        });
      }
      function a2(e2) {
        const r4 = n2.iterator;
        let o4;
        try {
          o4 = he(r4, "return");
        } catch (e3) {
          return d(e3);
        }
        if (void 0 === o4) return c(void 0);
        return m(g(o4, r4, [e2]), (e3) => {
          if (!t(e3)) throw new TypeError("The promise returned by the iterator.return() method must fulfill with an object");
        });
      }
      return o3 = Dr(e, i2, a2, 0), o3;
    })(r2);
    var o2;
  }
  function Br(e2, t2, r2) {
    return I(e2, r2), (r3) => g(e2, t2, [r3]);
  }
  function jr(e2, t2, r2) {
    return I(e2, r2), (r3) => g(e2, t2, [r3]);
  }
  function kr(e2, t2, r2) {
    return I(e2, r2), (r3) => S(e2, t2, [r3]);
  }
  function Ar(e2, t2) {
    if ("bytes" !== (e2 = `${e2}`)) throw new TypeError(`${t2} '${e2}' is not a valid enumeration value for ReadableStreamType`);
    return e2;
  }
  function zr(e2, t2) {
    L(e2, t2);
    const r2 = null == e2 ? void 0 : e2.preventAbort, o2 = null == e2 ? void 0 : e2.preventCancel, n2 = null == e2 ? void 0 : e2.preventClose, i2 = null == e2 ? void 0 : e2.signal;
    return void 0 !== i2 && (function(e3, t3) {
      if (!(function(e4) {
        if ("object" != typeof e4 || null === e4) return false;
        try {
          return "boolean" == typeof e4.aborted;
        } catch (e5) {
          return false;
        }
      })(e3)) throw new TypeError(`${t3} is not an AbortSignal.`);
    })(i2, `${t2} has member 'signal' that`), { preventAbort: Boolean(r2), preventCancel: Boolean(o2), preventClose: Boolean(n2), signal: i2 };
  }
  Object.defineProperties(ReadableStreamDefaultController.prototype, { close: { enumerable: true }, enqueue: { enumerable: true }, error: { enumerable: true }, desiredSize: { enumerable: true } }), o(ReadableStreamDefaultController.prototype.close, "close"), o(ReadableStreamDefaultController.prototype.enqueue, "enqueue"), o(ReadableStreamDefaultController.prototype.error, "error"), "symbol" == typeof Symbol.toStringTag && Object.defineProperty(ReadableStreamDefaultController.prototype, Symbol.toStringTag, { value: "ReadableStreamDefaultController", configurable: true });
  var ReadableStream = class {
    constructor(e2 = {}, t2 = {}) {
      void 0 === e2 ? e2 = null : $(e2, "First parameter");
      const r2 = yt(t2, "Second parameter"), o2 = (function(e3, t3) {
        L(e3, t3);
        const r3 = e3, o3 = null == r3 ? void 0 : r3.autoAllocateChunkSize, n2 = null == r3 ? void 0 : r3.cancel, i2 = null == r3 ? void 0 : r3.pull, a2 = null == r3 ? void 0 : r3.start, s2 = null == r3 ? void 0 : r3.type;
        return { autoAllocateChunkSize: void 0 === o3 ? void 0 : N(o3, `${t3} has member 'autoAllocateChunkSize' that`), cancel: void 0 === n2 ? void 0 : Br(n2, r3, `${t3} has member 'cancel' that`), pull: void 0 === i2 ? void 0 : jr(i2, r3, `${t3} has member 'pull' that`), start: void 0 === a2 ? void 0 : kr(a2, r3, `${t3} has member 'start' that`), type: void 0 === s2 ? void 0 : Ar(s2, `${t3} has member 'type' that`) };
      })(e2, "First parameter");
      if (Lr(this), "bytes" === o2.type) {
        if (void 0 !== r2.size) throw new RangeError("The strategy for a byte stream cannot have a size function");
        !(function(e3, t3, r3) {
          const o3 = Object.create(ReadableByteStreamController.prototype);
          let n2, i2, a2;
          n2 = void 0 !== t3.start ? () => t3.start(o3) : () => {
          }, i2 = void 0 !== t3.pull ? () => t3.pull(o3) : () => c(void 0), a2 = void 0 !== t3.cancel ? (e4) => t3.cancel(e4) : () => c(void 0);
          const s2 = t3.autoAllocateChunkSize;
          if (0 === s2) throw new TypeError("autoAllocateChunkSize must be greater than 0");
          rt(e3, o3, n2, i2, a2, r3, s2);
        })(this, o2, mt(r2, 0));
      } else {
        const e3 = pt(r2);
        !(function(e4, t3, r3, o3) {
          const n2 = Object.create(ReadableStreamDefaultController.prototype);
          let i2, a2, s2;
          i2 = void 0 !== t3.start ? () => t3.start(n2) : () => {
          }, a2 = void 0 !== t3.pull ? () => t3.pull(n2) : () => c(void 0), s2 = void 0 !== t3.cancel ? (e5) => t3.cancel(e5) : () => c(void 0), qr(e4, n2, i2, a2, s2, r3, o3);
        })(this, o2, mt(r2, 1), e3);
      }
    }
    get locked() {
      if (!Ir(this)) throw Qr("locked");
      return $r(this);
    }
    cancel(e2 = void 0) {
      return Ir(this) ? $r(this) ? d(new TypeError("Cannot cancel a stream that already has a reader")) : Mr(this, e2) : d(Qr("cancel"));
    }
    getReader(e2 = void 0) {
      if (!Ir(this)) throw Qr("getReader");
      return void 0 === (function(e3, t2) {
        L(e3, t2);
        const r2 = null == e3 ? void 0 : e3.mode;
        return { mode: void 0 === r2 ? void 0 : it(r2, `${t2} has member 'mode' that`) };
      })(e2, "First parameter").mode ? V(this) : at(this);
    }
    pipeThrough(e2, t2 = {}) {
      if (!Ir(this)) throw Qr("pipeThrough");
      M(e2, 1, "pipeThrough");
      const r2 = (function(e3, t3) {
        L(e3, t3);
        const r3 = null == e3 ? void 0 : e3.readable;
        Y(r3, "readable", "ReadableWritablePair"), H(r3, `${t3} has member 'readable' that`);
        const o3 = null == e3 ? void 0 : e3.writable;
        return Y(o3, "writable", "ReadableWritablePair"), Tt(o3, `${t3} has member 'writable' that`), { readable: r3, writable: o3 };
      })(e2, "First parameter"), o2 = zr(t2, "Second parameter");
      if ($r(this)) throw new TypeError("ReadableStream.prototype.pipeThrough cannot be used on a locked ReadableStream");
      if (Et(r2.writable)) throw new TypeError("ReadableStream.prototype.pipeThrough cannot be used on a locked WritableStream");
      return p(hr(this, r2.writable, o2.preventClose, o2.preventAbort, o2.preventCancel, o2.signal)), r2.readable;
    }
    pipeTo(e2, t2 = {}) {
      if (!Ir(this)) return d(Qr("pipeTo"));
      if (void 0 === e2) return d("Parameter 1 is required in 'pipeTo'.");
      if (!qt(e2)) return d(new TypeError("ReadableStream.prototype.pipeTo's first argument must be a WritableStream"));
      let r2;
      try {
        r2 = zr(t2, "Second parameter");
      } catch (e3) {
        return d(e3);
      }
      return $r(this) ? d(new TypeError("ReadableStream.prototype.pipeTo cannot be used on a locked ReadableStream")) : Et(e2) ? d(new TypeError("ReadableStream.prototype.pipeTo cannot be used on a locked WritableStream")) : hr(this, e2, r2.preventClose, r2.preventAbort, r2.preventCancel, r2.signal);
    }
    tee() {
      if (!Ir(this)) throw Qr("tee");
      return le(Wr(this));
    }
    values(e2 = void 0) {
      if (!Ir(this)) throw Qr("values");
      return (function(e3, t2) {
        const r2 = V(e3), o2 = new ye(r2, t2), n2 = Object.create(ge);
        return n2._asyncIteratorImpl = o2, n2;
      })(this, (function(e3, t2) {
        L(e3, t2);
        const r2 = null == e3 ? void 0 : e3.preventCancel;
        return { preventCancel: Boolean(r2) };
      })(e2, "First parameter").preventCancel);
    }
    [_e](e2) {
      return this.values(e2);
    }
    static from(e2) {
      return Or(e2);
    }
  };
  function Dr(e2, t2, r2, o2 = 1, n2 = () => 1) {
    const i2 = Object.create(ReadableStream.prototype);
    Lr(i2);
    return qr(i2, Object.create(ReadableStreamDefaultController.prototype), e2, t2, r2, o2, n2), i2;
  }
  function Fr(e2, t2, r2) {
    const o2 = Object.create(ReadableStream.prototype);
    Lr(o2);
    return rt(o2, Object.create(ReadableByteStreamController.prototype), e2, t2, r2, 0, void 0), o2;
  }
  function Lr(e2) {
    e2._state = "readable", e2._reader = void 0, e2._storedError = void 0, e2._disturbed = false;
  }
  function Ir(e2) {
    return !!t(e2) && (!!Object.prototype.hasOwnProperty.call(e2, "_readableStreamController") && e2 instanceof ReadableStream);
  }
  function $r(e2) {
    return void 0 !== e2._reader;
  }
  function Mr(t2, r2) {
    if (t2._disturbed = true, "closed" === t2._state) return c(void 0);
    if ("errored" === t2._state) return d(t2._storedError);
    Yr(t2);
    const o2 = t2._reader;
    if (void 0 !== o2 && ft(o2)) {
      const e2 = o2._readIntoRequests;
      o2._readIntoRequests = new v(), e2.forEach((e3) => {
        e3._closeSteps(void 0);
      });
    }
    return m(t2._readableStreamController[T](r2), e);
  }
  function Yr(e2) {
    e2._state = "closed";
    const t2 = e2._reader;
    if (void 0 !== t2 && (z(t2), ee(t2))) {
      const e3 = t2._readRequests;
      t2._readRequests = new v(), e3.forEach((e4) => {
        e4._closeSteps();
      });
    }
  }
  function xr(e2, t2) {
    e2._state = "errored", e2._storedError = t2;
    const r2 = e2._reader;
    void 0 !== r2 && (A(r2, t2), ee(r2) ? oe(r2, t2) : bt(r2, t2));
  }
  function Qr(e2) {
    return new TypeError(`ReadableStream.prototype.${e2} can only be used on a ReadableStream`);
  }
  function Nr(e2, t2) {
    L(e2, t2);
    const r2 = null == e2 ? void 0 : e2.highWaterMark;
    return Y(r2, "highWaterMark", "QueuingStrategyInit"), { highWaterMark: x(r2) };
  }
  Object.defineProperties(ReadableStream, { from: { enumerable: true } }), Object.defineProperties(ReadableStream.prototype, { cancel: { enumerable: true }, getReader: { enumerable: true }, pipeThrough: { enumerable: true }, pipeTo: { enumerable: true }, tee: { enumerable: true }, values: { enumerable: true }, locked: { enumerable: true } }), o(ReadableStream.from, "from"), o(ReadableStream.prototype.cancel, "cancel"), o(ReadableStream.prototype.getReader, "getReader"), o(ReadableStream.prototype.pipeThrough, "pipeThrough"), o(ReadableStream.prototype.pipeTo, "pipeTo"), o(ReadableStream.prototype.tee, "tee"), o(ReadableStream.prototype.values, "values"), "symbol" == typeof Symbol.toStringTag && Object.defineProperty(ReadableStream.prototype, Symbol.toStringTag, { value: "ReadableStream", configurable: true }), Object.defineProperty(ReadableStream.prototype, _e, { value: ReadableStream.prototype.values, writable: true, configurable: true });
  var Hr = (e2) => e2.byteLength;
  o(Hr, "size");
  var ByteLengthQueuingStrategy = class {
    constructor(e2) {
      M(e2, 1, "ByteLengthQueuingStrategy"), e2 = Nr(e2, "First parameter"), this._byteLengthQueuingStrategyHighWaterMark = e2.highWaterMark;
    }
    get highWaterMark() {
      if (!Ur(this)) throw Vr("highWaterMark");
      return this._byteLengthQueuingStrategyHighWaterMark;
    }
    get size() {
      if (!Ur(this)) throw Vr("size");
      return Hr;
    }
  };
  function Vr(e2) {
    return new TypeError(`ByteLengthQueuingStrategy.prototype.${e2} can only be used on a ByteLengthQueuingStrategy`);
  }
  function Ur(e2) {
    return !!t(e2) && (!!Object.prototype.hasOwnProperty.call(e2, "_byteLengthQueuingStrategyHighWaterMark") && e2 instanceof ByteLengthQueuingStrategy);
  }
  Object.defineProperties(ByteLengthQueuingStrategy.prototype, { highWaterMark: { enumerable: true }, size: { enumerable: true } }), "symbol" == typeof Symbol.toStringTag && Object.defineProperty(ByteLengthQueuingStrategy.prototype, Symbol.toStringTag, { value: "ByteLengthQueuingStrategy", configurable: true });
  var Gr = () => 1;
  o(Gr, "size");
  var CountQueuingStrategy = class {
    constructor(e2) {
      M(e2, 1, "CountQueuingStrategy"), e2 = Nr(e2, "First parameter"), this._countQueuingStrategyHighWaterMark = e2.highWaterMark;
    }
    get highWaterMark() {
      if (!Jr(this)) throw Xr("highWaterMark");
      return this._countQueuingStrategyHighWaterMark;
    }
    get size() {
      if (!Jr(this)) throw Xr("size");
      return Gr;
    }
  };
  function Xr(e2) {
    return new TypeError(`CountQueuingStrategy.prototype.${e2} can only be used on a CountQueuingStrategy`);
  }
  function Jr(e2) {
    return !!t(e2) && (!!Object.prototype.hasOwnProperty.call(e2, "_countQueuingStrategyHighWaterMark") && e2 instanceof CountQueuingStrategy);
  }
  function Kr(e2, t2, r2) {
    return I(e2, r2), (r3) => g(e2, t2, [r3]);
  }
  function Zr(e2, t2, r2) {
    return I(e2, r2), (r3) => S(e2, t2, [r3]);
  }
  function eo(e2, t2, r2) {
    return I(e2, r2), (r3, o2) => g(e2, t2, [r3, o2]);
  }
  function to(e2, t2, r2) {
    return I(e2, r2), (r3) => g(e2, t2, [r3]);
  }
  Object.defineProperties(CountQueuingStrategy.prototype, { highWaterMark: { enumerable: true }, size: { enumerable: true } }), "symbol" == typeof Symbol.toStringTag && Object.defineProperty(CountQueuingStrategy.prototype, Symbol.toStringTag, { value: "CountQueuingStrategy", configurable: true });
  var TransformStream = class {
    constructor(e2 = {}, t2 = {}, r2 = {}) {
      void 0 === e2 && (e2 = null);
      const o2 = yt(t2, "Second parameter"), n2 = yt(r2, "Third parameter"), i2 = (function(e3, t3) {
        L(e3, t3);
        const r3 = null == e3 ? void 0 : e3.cancel, o3 = null == e3 ? void 0 : e3.flush, n3 = null == e3 ? void 0 : e3.readableType, i3 = null == e3 ? void 0 : e3.start, a3 = null == e3 ? void 0 : e3.transform, s3 = null == e3 ? void 0 : e3.writableType;
        return { cancel: void 0 === r3 ? void 0 : to(r3, e3, `${t3} has member 'cancel' that`), flush: void 0 === o3 ? void 0 : Kr(o3, e3, `${t3} has member 'flush' that`), readableType: n3, start: void 0 === i3 ? void 0 : Zr(i3, e3, `${t3} has member 'start' that`), transform: void 0 === a3 ? void 0 : eo(a3, e3, `${t3} has member 'transform' that`), writableType: s3 };
      })(e2, "First parameter");
      if (void 0 !== i2.readableType) throw new RangeError("Invalid readableType specified");
      if (void 0 !== i2.writableType) throw new RangeError("Invalid writableType specified");
      const a2 = mt(n2, 0), s2 = pt(n2), l2 = mt(o2, 1), f2 = pt(o2);
      let b2;
      !(function(e3, t3, r3, o3, n3, i3) {
        function a3() {
          return t3;
        }
        function s3(t4) {
          return (function(e4, t5) {
            const r4 = e4._transformStreamController;
            if (e4._backpressure) {
              return m(e4._backpressureChangePromise, () => {
                const o4 = e4._writable;
                if ("erroring" === o4._state) throw o4._storedError;
                return co(r4, t5);
              });
            }
            return co(r4, t5);
          })(e3, t4);
        }
        function l3(t4) {
          return (function(e4, t5) {
            const r4 = e4._transformStreamController;
            if (void 0 !== r4._finishPromise) return r4._finishPromise;
            const o4 = e4._readable;
            r4._finishPromise = u((e5, t6) => {
              r4._finishPromise_resolve = e5, r4._finishPromise_reject = t6;
            });
            const n4 = r4._cancelAlgorithm(t5);
            return lo(r4), h(n4, () => ("errored" === o4._state ? bo(r4, o4._storedError) : (Tr(o4._readableStreamController, t5), ho(r4)), null), (e5) => (Tr(o4._readableStreamController, e5), bo(r4, e5), null)), r4._finishPromise;
          })(e3, t4);
        }
        function c2() {
          return (function(e4) {
            const t4 = e4._transformStreamController;
            if (void 0 !== t4._finishPromise) return t4._finishPromise;
            const r4 = e4._readable;
            t4._finishPromise = u((e5, r5) => {
              t4._finishPromise_resolve = e5, t4._finishPromise_reject = r5;
            });
            const o4 = t4._flushAlgorithm();
            return lo(t4), h(o4, () => ("errored" === r4._state ? bo(t4, r4._storedError) : (wr(r4._readableStreamController), ho(t4)), null), (e5) => (Tr(r4._readableStreamController, e5), bo(t4, e5), null)), t4._finishPromise;
          })(e3);
        }
        function d2() {
          return (function(e4) {
            return ao(e4, false), e4._backpressureChangePromise;
          })(e3);
        }
        function f3(t4) {
          return (function(e4, t5) {
            const r4 = e4._transformStreamController;
            if (void 0 !== r4._finishPromise) return r4._finishPromise;
            const o4 = e4._writable;
            r4._finishPromise = u((e5, t6) => {
              r4._finishPromise_resolve = e5, r4._finishPromise_reject = t6;
            });
            const n4 = r4._cancelAlgorithm(t5);
            return lo(r4), h(n4, () => ("errored" === o4._state ? bo(r4, o4._storedError) : (Gt(o4._writableStreamController, t5), io(e4), ho(r4)), null), (t6) => (Gt(o4._writableStreamController, t6), io(e4), bo(r4, t6), null)), r4._finishPromise;
          })(e3, t4);
        }
        e3._writable = (function(e4, t4, r4, o4, n4 = 1, i4 = () => 1) {
          const a4 = Object.create(WritableStream.prototype);
          return Ct(a4), Nt(a4, Object.create(WritableStreamDefaultController.prototype), e4, t4, r4, o4, n4, i4), a4;
        })(a3, s3, c2, l3, r3, o3), e3._readable = Dr(a3, d2, f3, n3, i3), e3._backpressure = void 0, e3._backpressureChangePromise = void 0, e3._backpressureChangePromise_resolve = void 0, ao(e3, true), e3._transformStreamController = void 0;
      })(this, u((e3) => {
        b2 = e3;
      }), l2, f2, a2, s2), (function(e3, t3) {
        const r3 = Object.create(TransformStreamDefaultController.prototype);
        let o3, n3, i3;
        o3 = void 0 !== t3.transform ? (e4) => t3.transform(e4, r3) : (e4) => {
          try {
            return uo(r3, e4), c(void 0);
          } catch (e5) {
            return d(e5);
          }
        };
        n3 = void 0 !== t3.flush ? () => t3.flush(r3) : () => c(void 0);
        i3 = void 0 !== t3.cancel ? (e4) => t3.cancel(e4) : () => c(void 0);
        !(function(e4, t4, r4, o4, n4) {
          t4._controlledTransformStream = e4, e4._transformStreamController = t4, t4._transformAlgorithm = r4, t4._flushAlgorithm = o4, t4._cancelAlgorithm = n4, t4._finishPromise = void 0, t4._finishPromise_resolve = void 0, t4._finishPromise_reject = void 0;
        })(e3, r3, o3, n3, i3);
      })(this, i2), void 0 !== i2.start ? b2(i2.start(this._transformStreamController)) : b2(void 0);
    }
    get readable() {
      if (!ro(this)) throw _o("readable");
      return this._readable;
    }
    get writable() {
      if (!ro(this)) throw _o("writable");
      return this._writable;
    }
  };
  function ro(e2) {
    return !!t(e2) && (!!Object.prototype.hasOwnProperty.call(e2, "_transformStreamController") && e2 instanceof TransformStream);
  }
  function oo(e2, t2) {
    Tr(e2._readable._readableStreamController, t2), no(e2, t2);
  }
  function no(e2, t2) {
    lo(e2._transformStreamController), Gt(e2._writable._writableStreamController, t2), io(e2);
  }
  function io(e2) {
    e2._backpressure && ao(e2, false);
  }
  function ao(e2, t2) {
    void 0 !== e2._backpressureChangePromise && e2._backpressureChangePromise_resolve(), e2._backpressureChangePromise = u((t3) => {
      e2._backpressureChangePromise_resolve = t3;
    }), e2._backpressure = t2;
  }
  Object.defineProperties(TransformStream.prototype, { readable: { enumerable: true }, writable: { enumerable: true } }), "symbol" == typeof Symbol.toStringTag && Object.defineProperty(TransformStream.prototype, Symbol.toStringTag, { value: "TransformStream", configurable: true });
  var TransformStreamDefaultController = class {
    constructor() {
      throw new TypeError("Illegal constructor");
    }
    get desiredSize() {
      if (!so(this)) throw fo("desiredSize");
      return Pr(this._controlledTransformStream._readable._readableStreamController);
    }
    enqueue(e2 = void 0) {
      if (!so(this)) throw fo("enqueue");
      uo(this, e2);
    }
    error(e2 = void 0) {
      if (!so(this)) throw fo("error");
      var t2;
      t2 = e2, oo(this._controlledTransformStream, t2);
    }
    terminate() {
      if (!so(this)) throw fo("terminate");
      !(function(e2) {
        const t2 = e2._controlledTransformStream;
        wr(t2._readable._readableStreamController);
        const r2 = new TypeError("TransformStream terminated");
        no(t2, r2);
      })(this);
    }
  };
  function so(e2) {
    return !!t(e2) && (!!Object.prototype.hasOwnProperty.call(e2, "_controlledTransformStream") && e2 instanceof TransformStreamDefaultController);
  }
  function lo(e2) {
    e2._transformAlgorithm = void 0, e2._flushAlgorithm = void 0, e2._cancelAlgorithm = void 0;
  }
  function uo(e2, t2) {
    const r2 = e2._controlledTransformStream, o2 = r2._readable._readableStreamController;
    if (!Cr(o2)) throw new TypeError("Readable side is not in a state that permits enqueue");
    try {
      Rr(o2, t2);
    } catch (e3) {
      throw no(r2, e3), r2._readable._storedError;
    }
    const n2 = (function(e3) {
      return !gr(e3);
    })(o2);
    n2 !== r2._backpressure && ao(r2, true);
  }
  function co(e2, t2) {
    return m(e2._transformAlgorithm(t2), void 0, (t3) => {
      throw oo(e2._controlledTransformStream, t3), t3;
    });
  }
  function fo(e2) {
    return new TypeError(`TransformStreamDefaultController.prototype.${e2} can only be used on a TransformStreamDefaultController`);
  }
  function ho(e2) {
    void 0 !== e2._finishPromise_resolve && (e2._finishPromise_resolve(), e2._finishPromise_resolve = void 0, e2._finishPromise_reject = void 0);
  }
  function bo(e2, t2) {
    void 0 !== e2._finishPromise_reject && (p(e2._finishPromise), e2._finishPromise_reject(t2), e2._finishPromise_resolve = void 0, e2._finishPromise_reject = void 0);
  }
  function _o(e2) {
    return new TypeError(`TransformStream.prototype.${e2} can only be used on a TransformStream`);
  }
  Object.defineProperties(TransformStreamDefaultController.prototype, { enqueue: { enumerable: true }, error: { enumerable: true }, terminate: { enumerable: true }, desiredSize: { enumerable: true } }), o(TransformStreamDefaultController.prototype.enqueue, "enqueue"), o(TransformStreamDefaultController.prototype.error, "error"), o(TransformStreamDefaultController.prototype.terminate, "terminate"), "symbol" == typeof Symbol.toStringTag && Object.defineProperty(TransformStreamDefaultController.prototype, Symbol.toStringTag, { value: "TransformStreamDefaultController", configurable: true });

  // node_modules/@frida/buffer/index.js
  var config = {
    INSPECT_MAX_BYTES: 50
  };
  var K_MAX_LENGTH = 2147483647;
  Buffer2.TYPED_ARRAY_SUPPORT = true;
  Object.defineProperty(Buffer2.prototype, "parent", {
    enumerable: true,
    get: function() {
      if (!Buffer2.isBuffer(this)) return void 0;
      return this.buffer;
    }
  });
  Object.defineProperty(Buffer2.prototype, "offset", {
    enumerable: true,
    get: function() {
      if (!Buffer2.isBuffer(this)) return void 0;
      return this.byteOffset;
    }
  });
  function createBuffer(length) {
    if (length > K_MAX_LENGTH) {
      throw new RangeError('The value "' + length + '" is invalid for option "size"');
    }
    const buf = new Uint8Array(length);
    Object.setPrototypeOf(buf, Buffer2.prototype);
    return buf;
  }
  function Buffer2(arg, encodingOrOffset, length) {
    if (typeof arg === "number") {
      if (typeof encodingOrOffset === "string") {
        throw new TypeError(
          'The "string" argument must be of type string. Received type number'
        );
      }
      return allocUnsafe(arg);
    }
    return from(arg, encodingOrOffset, length);
  }
  Buffer2.poolSize = 8192;
  function from(value, encodingOrOffset, length) {
    if (typeof value === "string") {
      return fromString(value, encodingOrOffset);
    }
    if (ArrayBuffer.isView(value)) {
      return fromArrayView(value);
    }
    if (value == null) {
      throw new TypeError(
        "The first argument must be one of type string, Buffer, ArrayBuffer, Array, or Array-like Object. Received type " + typeof value
      );
    }
    if (value instanceof ArrayBuffer || value && value.buffer instanceof ArrayBuffer) {
      return fromArrayBuffer(value, encodingOrOffset, length);
    }
    if (value instanceof SharedArrayBuffer || value && value.buffer instanceof SharedArrayBuffer) {
      return fromArrayBuffer(value, encodingOrOffset, length);
    }
    if (typeof value === "number") {
      throw new TypeError(
        'The "value" argument must not be of type number. Received type number'
      );
    }
    const valueOf = value.valueOf && value.valueOf();
    if (valueOf != null && valueOf !== value) {
      return Buffer2.from(valueOf, encodingOrOffset, length);
    }
    const b2 = fromObject(value);
    if (b2) return b2;
    if (typeof Symbol !== "undefined" && Symbol.toPrimitive != null && typeof value[Symbol.toPrimitive] === "function") {
      return Buffer2.from(value[Symbol.toPrimitive]("string"), encodingOrOffset, length);
    }
    throw new TypeError(
      "The first argument must be one of type string, Buffer, ArrayBuffer, Array, or Array-like Object. Received type " + typeof value
    );
  }
  Buffer2.from = function(value, encodingOrOffset, length) {
    return from(value, encodingOrOffset, length);
  };
  Object.setPrototypeOf(Buffer2.prototype, Uint8Array.prototype);
  Object.setPrototypeOf(Buffer2, Uint8Array);
  function assertSize(size) {
    if (typeof size !== "number") {
      throw new TypeError('"size" argument must be of type number');
    } else if (size < 0) {
      throw new RangeError('The value "' + size + '" is invalid for option "size"');
    }
  }
  function alloc(size, fill2, encoding) {
    assertSize(size);
    if (size <= 0) {
      return createBuffer(size);
    }
    if (fill2 !== void 0) {
      return typeof encoding === "string" ? createBuffer(size).fill(fill2, encoding) : createBuffer(size).fill(fill2);
    }
    return createBuffer(size);
  }
  Buffer2.alloc = function(size, fill2, encoding) {
    return alloc(size, fill2, encoding);
  };
  function allocUnsafe(size) {
    assertSize(size);
    return createBuffer(size < 0 ? 0 : checked(size) | 0);
  }
  Buffer2.allocUnsafe = function(size) {
    return allocUnsafe(size);
  };
  Buffer2.allocUnsafeSlow = function(size) {
    return allocUnsafe(size);
  };
  function fromString(string, encoding) {
    if (typeof encoding !== "string" || encoding === "") {
      encoding = "utf8";
    }
    if (!Buffer2.isEncoding(encoding)) {
      throw new TypeError("Unknown encoding: " + encoding);
    }
    const length = byteLength(string, encoding) | 0;
    let buf = createBuffer(length);
    const actual = buf.write(string, encoding);
    if (actual !== length) {
      buf = buf.slice(0, actual);
    }
    return buf;
  }
  function fromArrayLike(array) {
    const length = array.length < 0 ? 0 : checked(array.length) | 0;
    const buf = createBuffer(length);
    for (let i2 = 0; i2 < length; i2 += 1) {
      buf[i2] = array[i2] & 255;
    }
    return buf;
  }
  function fromArrayView(arrayView) {
    if (arrayView instanceof Uint8Array) {
      const copy2 = new Uint8Array(arrayView);
      return fromArrayBuffer(copy2.buffer, copy2.byteOffset, copy2.byteLength);
    }
    return fromArrayLike(arrayView);
  }
  function fromArrayBuffer(array, byteOffset, length) {
    if (byteOffset < 0 || array.byteLength < byteOffset) {
      throw new RangeError('"offset" is outside of buffer bounds');
    }
    if (array.byteLength < byteOffset + (length || 0)) {
      throw new RangeError('"length" is outside of buffer bounds');
    }
    let buf;
    if (byteOffset === void 0 && length === void 0) {
      buf = new Uint8Array(array);
    } else if (length === void 0) {
      buf = new Uint8Array(array, byteOffset);
    } else {
      buf = new Uint8Array(array, byteOffset, length);
    }
    Object.setPrototypeOf(buf, Buffer2.prototype);
    return buf;
  }
  function fromObject(obj) {
    if (Buffer2.isBuffer(obj)) {
      const len = checked(obj.length) | 0;
      const buf = createBuffer(len);
      if (buf.length === 0) {
        return buf;
      }
      obj.copy(buf, 0, 0, len);
      return buf;
    }
    if (obj.length !== void 0) {
      if (typeof obj.length !== "number" || Number.isNaN(obj.length)) {
        return createBuffer(0);
      }
      return fromArrayLike(obj);
    }
    if (obj.type === "Buffer" && Array.isArray(obj.data)) {
      return fromArrayLike(obj.data);
    }
  }
  function checked(length) {
    if (length >= K_MAX_LENGTH) {
      throw new RangeError("Attempt to allocate Buffer larger than maximum size: 0x" + K_MAX_LENGTH.toString(16) + " bytes");
    }
    return length | 0;
  }
  Buffer2.isBuffer = function isBuffer(b2) {
    return b2 != null && b2._isBuffer === true && b2 !== Buffer2.prototype;
  };
  Buffer2.compare = function compare(a2, b2) {
    if (a2 instanceof Uint8Array) a2 = Buffer2.from(a2, a2.offset, a2.byteLength);
    if (b2 instanceof Uint8Array) b2 = Buffer2.from(b2, b2.offset, b2.byteLength);
    if (!Buffer2.isBuffer(a2) || !Buffer2.isBuffer(b2)) {
      throw new TypeError(
        'The "buf1", "buf2" arguments must be one of type Buffer or Uint8Array'
      );
    }
    if (a2 === b2) return 0;
    let x2 = a2.length;
    let y2 = b2.length;
    for (let i2 = 0, len = Math.min(x2, y2); i2 < len; ++i2) {
      if (a2[i2] !== b2[i2]) {
        x2 = a2[i2];
        y2 = b2[i2];
        break;
      }
    }
    if (x2 < y2) return -1;
    if (y2 < x2) return 1;
    return 0;
  };
  Buffer2.isEncoding = function isEncoding(encoding) {
    switch (String(encoding).toLowerCase()) {
      case "hex":
      case "utf8":
      case "utf-8":
      case "ascii":
      case "latin1":
      case "binary":
      case "base64":
      case "ucs2":
      case "ucs-2":
      case "utf16le":
      case "utf-16le":
        return true;
      default:
        return false;
    }
  };
  Buffer2.concat = function concat(list, length) {
    if (!Array.isArray(list)) {
      throw new TypeError('"list" argument must be an Array of Buffers');
    }
    if (list.length === 0) {
      return Buffer2.alloc(0);
    }
    let i2;
    if (length === void 0) {
      length = 0;
      for (i2 = 0; i2 < list.length; ++i2) {
        length += list[i2].length;
      }
    }
    const buffer = Buffer2.allocUnsafe(length);
    let pos = 0;
    for (i2 = 0; i2 < list.length; ++i2) {
      let buf = list[i2];
      if (buf instanceof Uint8Array) {
        if (pos + buf.length > buffer.length) {
          if (!Buffer2.isBuffer(buf)) {
            buf = Buffer2.from(buf.buffer, buf.byteOffset, buf.byteLength);
          }
          buf.copy(buffer, pos);
        } else {
          Uint8Array.prototype.set.call(
            buffer,
            buf,
            pos
          );
        }
      } else if (!Buffer2.isBuffer(buf)) {
        throw new TypeError('"list" argument must be an Array of Buffers');
      } else {
        buf.copy(buffer, pos);
      }
      pos += buf.length;
    }
    return buffer;
  };
  function byteLength(string, encoding) {
    if (Buffer2.isBuffer(string)) {
      return string.length;
    }
    if (ArrayBuffer.isView(string) || string instanceof ArrayBuffer) {
      return string.byteLength;
    }
    if (typeof string !== "string") {
      throw new TypeError(
        'The "string" argument must be one of type string, Buffer, or ArrayBuffer. Received type ' + typeof string
      );
    }
    const len = string.length;
    const mustMatch = arguments.length > 2 && arguments[2] === true;
    if (!mustMatch && len === 0) return 0;
    let loweredCase = false;
    for (; ; ) {
      switch (encoding) {
        case "ascii":
        case "latin1":
        case "binary":
          return len;
        case "utf8":
        case "utf-8":
          return utf8ToBytes(string).length;
        case "ucs2":
        case "ucs-2":
        case "utf16le":
        case "utf-16le":
          return len * 2;
        case "hex":
          return len >>> 1;
        case "base64":
          return base64ToBytes(string).length;
        default:
          if (loweredCase) {
            return mustMatch ? -1 : utf8ToBytes(string).length;
          }
          encoding = ("" + encoding).toLowerCase();
          loweredCase = true;
      }
    }
  }
  Buffer2.byteLength = byteLength;
  function slowToString(encoding, start, end) {
    let loweredCase = false;
    if (start === void 0 || start < 0) {
      start = 0;
    }
    if (start > this.length) {
      return "";
    }
    if (end === void 0 || end > this.length) {
      end = this.length;
    }
    if (end <= 0) {
      return "";
    }
    end >>>= 0;
    start >>>= 0;
    if (end <= start) {
      return "";
    }
    if (!encoding) encoding = "utf8";
    while (true) {
      switch (encoding) {
        case "hex":
          return hexSlice(this, start, end);
        case "utf8":
        case "utf-8":
          return utf8Slice(this, start, end);
        case "ascii":
          return asciiSlice(this, start, end);
        case "latin1":
        case "binary":
          return latin1Slice(this, start, end);
        case "base64":
          return base64Slice(this, start, end);
        case "ucs2":
        case "ucs-2":
        case "utf16le":
        case "utf-16le":
          return utf16leSlice(this, start, end);
        default:
          if (loweredCase) throw new TypeError("Unknown encoding: " + encoding);
          encoding = (encoding + "").toLowerCase();
          loweredCase = true;
      }
    }
  }
  Buffer2.prototype._isBuffer = true;
  function swap(b2, n2, m2) {
    const i2 = b2[n2];
    b2[n2] = b2[m2];
    b2[m2] = i2;
  }
  Buffer2.prototype.swap16 = function swap16() {
    const len = this.length;
    if (len % 2 !== 0) {
      throw new RangeError("Buffer size must be a multiple of 16-bits");
    }
    for (let i2 = 0; i2 < len; i2 += 2) {
      swap(this, i2, i2 + 1);
    }
    return this;
  };
  Buffer2.prototype.swap32 = function swap32() {
    const len = this.length;
    if (len % 4 !== 0) {
      throw new RangeError("Buffer size must be a multiple of 32-bits");
    }
    for (let i2 = 0; i2 < len; i2 += 4) {
      swap(this, i2, i2 + 3);
      swap(this, i2 + 1, i2 + 2);
    }
    return this;
  };
  Buffer2.prototype.swap64 = function swap64() {
    const len = this.length;
    if (len % 8 !== 0) {
      throw new RangeError("Buffer size must be a multiple of 64-bits");
    }
    for (let i2 = 0; i2 < len; i2 += 8) {
      swap(this, i2, i2 + 7);
      swap(this, i2 + 1, i2 + 6);
      swap(this, i2 + 2, i2 + 5);
      swap(this, i2 + 3, i2 + 4);
    }
    return this;
  };
  Buffer2.prototype.toString = function toString() {
    const length = this.length;
    if (length === 0) return "";
    if (arguments.length === 0) return utf8Slice(this, 0, length);
    return slowToString.apply(this, arguments);
  };
  Buffer2.prototype.toLocaleString = Buffer2.prototype.toString;
  Buffer2.prototype.equals = function equals(b2) {
    if (!Buffer2.isBuffer(b2)) throw new TypeError("Argument must be a Buffer");
    if (this === b2) return true;
    return Buffer2.compare(this, b2) === 0;
  };
  Buffer2.prototype.inspect = function inspect() {
    let str = "";
    const max = config.INSPECT_MAX_BYTES;
    str = this.toString("hex", 0, max).replace(/(.{2})/g, "$1 ").trim();
    if (this.length > max) str += " ... ";
    return "<Buffer " + str + ">";
  };
  Buffer2.prototype[/* @__PURE__ */ Symbol.for("nodejs.util.inspect.custom")] = Buffer2.prototype.inspect;
  Buffer2.prototype.compare = function compare2(target, start, end, thisStart, thisEnd) {
    if (target instanceof Uint8Array) {
      target = Buffer2.from(target, target.offset, target.byteLength);
    }
    if (!Buffer2.isBuffer(target)) {
      throw new TypeError(
        'The "target" argument must be one of type Buffer or Uint8Array. Received type ' + typeof target
      );
    }
    if (start === void 0) {
      start = 0;
    }
    if (end === void 0) {
      end = target ? target.length : 0;
    }
    if (thisStart === void 0) {
      thisStart = 0;
    }
    if (thisEnd === void 0) {
      thisEnd = this.length;
    }
    if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
      throw new RangeError("out of range index");
    }
    if (thisStart >= thisEnd && start >= end) {
      return 0;
    }
    if (thisStart >= thisEnd) {
      return -1;
    }
    if (start >= end) {
      return 1;
    }
    start >>>= 0;
    end >>>= 0;
    thisStart >>>= 0;
    thisEnd >>>= 0;
    if (this === target) return 0;
    let x2 = thisEnd - thisStart;
    let y2 = end - start;
    const len = Math.min(x2, y2);
    const thisCopy = this.slice(thisStart, thisEnd);
    const targetCopy = target.slice(start, end);
    for (let i2 = 0; i2 < len; ++i2) {
      if (thisCopy[i2] !== targetCopy[i2]) {
        x2 = thisCopy[i2];
        y2 = targetCopy[i2];
        break;
      }
    }
    if (x2 < y2) return -1;
    if (y2 < x2) return 1;
    return 0;
  };
  function bidirectionalIndexOf(buffer, val, byteOffset, encoding, dir) {
    if (buffer.length === 0) return -1;
    if (typeof byteOffset === "string") {
      encoding = byteOffset;
      byteOffset = 0;
    } else if (byteOffset > 2147483647) {
      byteOffset = 2147483647;
    } else if (byteOffset < -2147483648) {
      byteOffset = -2147483648;
    }
    byteOffset = +byteOffset;
    if (Number.isNaN(byteOffset)) {
      byteOffset = dir ? 0 : buffer.length - 1;
    }
    if (byteOffset < 0) byteOffset = buffer.length + byteOffset;
    if (byteOffset >= buffer.length) {
      if (dir) return -1;
      else byteOffset = buffer.length - 1;
    } else if (byteOffset < 0) {
      if (dir) byteOffset = 0;
      else return -1;
    }
    if (typeof val === "string") {
      val = Buffer2.from(val, encoding);
    }
    if (Buffer2.isBuffer(val)) {
      if (val.length === 0) {
        return -1;
      }
      return arrayIndexOf(buffer, val, byteOffset, encoding, dir);
    } else if (typeof val === "number") {
      val = val & 255;
      if (typeof Uint8Array.prototype.indexOf === "function") {
        if (dir) {
          return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset);
        } else {
          return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset);
        }
      }
      return arrayIndexOf(buffer, [val], byteOffset, encoding, dir);
    }
    throw new TypeError("val must be string, number or Buffer");
  }
  function arrayIndexOf(arr, val, byteOffset, encoding, dir) {
    let indexSize = 1;
    let arrLength = arr.length;
    let valLength = val.length;
    if (encoding !== void 0) {
      encoding = String(encoding).toLowerCase();
      if (encoding === "ucs2" || encoding === "ucs-2" || encoding === "utf16le" || encoding === "utf-16le") {
        if (arr.length < 2 || val.length < 2) {
          return -1;
        }
        indexSize = 2;
        arrLength /= 2;
        valLength /= 2;
        byteOffset /= 2;
      }
    }
    function read2(buf, i3) {
      if (indexSize === 1) {
        return buf[i3];
      } else {
        return buf.readUInt16BE(i3 * indexSize);
      }
    }
    let i2;
    if (dir) {
      let foundIndex = -1;
      for (i2 = byteOffset; i2 < arrLength; i2++) {
        if (read2(arr, i2) === read2(val, foundIndex === -1 ? 0 : i2 - foundIndex)) {
          if (foundIndex === -1) foundIndex = i2;
          if (i2 - foundIndex + 1 === valLength) return foundIndex * indexSize;
        } else {
          if (foundIndex !== -1) i2 -= i2 - foundIndex;
          foundIndex = -1;
        }
      }
    } else {
      if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength;
      for (i2 = byteOffset; i2 >= 0; i2--) {
        let found = true;
        for (let j2 = 0; j2 < valLength; j2++) {
          if (read2(arr, i2 + j2) !== read2(val, j2)) {
            found = false;
            break;
          }
        }
        if (found) return i2;
      }
    }
    return -1;
  }
  Buffer2.prototype.includes = function includes(val, byteOffset, encoding) {
    return this.indexOf(val, byteOffset, encoding) !== -1;
  };
  Buffer2.prototype.indexOf = function indexOf(val, byteOffset, encoding) {
    return bidirectionalIndexOf(this, val, byteOffset, encoding, true);
  };
  Buffer2.prototype.lastIndexOf = function lastIndexOf(val, byteOffset, encoding) {
    return bidirectionalIndexOf(this, val, byteOffset, encoding, false);
  };
  function hexWrite(buf, string, offset, length) {
    offset = Number(offset) || 0;
    const remaining = buf.length - offset;
    if (!length) {
      length = remaining;
    } else {
      length = Number(length);
      if (length > remaining) {
        length = remaining;
      }
    }
    const strLen = string.length;
    if (length > strLen / 2) {
      length = strLen / 2;
    }
    let i2;
    for (i2 = 0; i2 < length; ++i2) {
      const parsed = parseInt(string.substr(i2 * 2, 2), 16);
      if (Number.isNaN(parsed)) return i2;
      buf[offset + i2] = parsed;
    }
    return i2;
  }
  function utf8Write(buf, string, offset, length) {
    return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length);
  }
  function asciiWrite(buf, string, offset, length) {
    return blitBuffer(asciiToBytes(string), buf, offset, length);
  }
  function base64Write(buf, string, offset, length) {
    return blitBuffer(base64ToBytes(string), buf, offset, length);
  }
  function ucs2Write(buf, string, offset, length) {
    return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length);
  }
  Buffer2.prototype.write = function write2(string, offset, length, encoding) {
    if (offset === void 0) {
      encoding = "utf8";
      length = this.length;
      offset = 0;
    } else if (length === void 0 && typeof offset === "string") {
      encoding = offset;
      length = this.length;
      offset = 0;
    } else if (isFinite(offset)) {
      offset = offset >>> 0;
      if (isFinite(length)) {
        length = length >>> 0;
        if (encoding === void 0) encoding = "utf8";
      } else {
        encoding = length;
        length = void 0;
      }
    } else {
      throw new Error(
        "Buffer.write(string, encoding, offset[, length]) is no longer supported"
      );
    }
    const remaining = this.length - offset;
    if (length === void 0 || length > remaining) length = remaining;
    if (string.length > 0 && (length < 0 || offset < 0) || offset > this.length) {
      throw new RangeError("Attempt to write outside buffer bounds");
    }
    if (!encoding) encoding = "utf8";
    let loweredCase = false;
    for (; ; ) {
      switch (encoding) {
        case "hex":
          return hexWrite(this, string, offset, length);
        case "utf8":
        case "utf-8":
          return utf8Write(this, string, offset, length);
        case "ascii":
        case "latin1":
        case "binary":
          return asciiWrite(this, string, offset, length);
        case "base64":
          return base64Write(this, string, offset, length);
        case "ucs2":
        case "ucs-2":
        case "utf16le":
        case "utf-16le":
          return ucs2Write(this, string, offset, length);
        default:
          if (loweredCase) throw new TypeError("Unknown encoding: " + encoding);
          encoding = ("" + encoding).toLowerCase();
          loweredCase = true;
      }
    }
  };
  Buffer2.prototype.toJSON = function toJSON() {
    return {
      type: "Buffer",
      data: Array.prototype.slice.call(this._arr || this, 0)
    };
  };
  function base64Slice(buf, start, end) {
    if (start === 0 && end === buf.length) {
      return base64.fromByteArray(buf);
    } else {
      return base64.fromByteArray(buf.slice(start, end));
    }
  }
  function utf8Slice(buf, start, end) {
    end = Math.min(buf.length, end);
    const res = [];
    let i2 = start;
    while (i2 < end) {
      const firstByte = buf[i2];
      let codePoint = null;
      let bytesPerSequence = firstByte > 239 ? 4 : firstByte > 223 ? 3 : firstByte > 191 ? 2 : 1;
      if (i2 + bytesPerSequence <= end) {
        let secondByte, thirdByte, fourthByte, tempCodePoint;
        switch (bytesPerSequence) {
          case 1:
            if (firstByte < 128) {
              codePoint = firstByte;
            }
            break;
          case 2:
            secondByte = buf[i2 + 1];
            if ((secondByte & 192) === 128) {
              tempCodePoint = (firstByte & 31) << 6 | secondByte & 63;
              if (tempCodePoint > 127) {
                codePoint = tempCodePoint;
              }
            }
            break;
          case 3:
            secondByte = buf[i2 + 1];
            thirdByte = buf[i2 + 2];
            if ((secondByte & 192) === 128 && (thirdByte & 192) === 128) {
              tempCodePoint = (firstByte & 15) << 12 | (secondByte & 63) << 6 | thirdByte & 63;
              if (tempCodePoint > 2047 && (tempCodePoint < 55296 || tempCodePoint > 57343)) {
                codePoint = tempCodePoint;
              }
            }
            break;
          case 4:
            secondByte = buf[i2 + 1];
            thirdByte = buf[i2 + 2];
            fourthByte = buf[i2 + 3];
            if ((secondByte & 192) === 128 && (thirdByte & 192) === 128 && (fourthByte & 192) === 128) {
              tempCodePoint = (firstByte & 15) << 18 | (secondByte & 63) << 12 | (thirdByte & 63) << 6 | fourthByte & 63;
              if (tempCodePoint > 65535 && tempCodePoint < 1114112) {
                codePoint = tempCodePoint;
              }
            }
        }
      }
      if (codePoint === null) {
        codePoint = 65533;
        bytesPerSequence = 1;
      } else if (codePoint > 65535) {
        codePoint -= 65536;
        res.push(codePoint >>> 10 & 1023 | 55296);
        codePoint = 56320 | codePoint & 1023;
      }
      res.push(codePoint);
      i2 += bytesPerSequence;
    }
    return decodeCodePointsArray(res);
  }
  var MAX_ARGUMENTS_LENGTH = 4096;
  function decodeCodePointsArray(codePoints) {
    const len = codePoints.length;
    if (len <= MAX_ARGUMENTS_LENGTH) {
      return String.fromCharCode.apply(String, codePoints);
    }
    let res = "";
    let i2 = 0;
    while (i2 < len) {
      res += String.fromCharCode.apply(
        String,
        codePoints.slice(i2, i2 += MAX_ARGUMENTS_LENGTH)
      );
    }
    return res;
  }
  function asciiSlice(buf, start, end) {
    let ret = "";
    end = Math.min(buf.length, end);
    for (let i2 = start; i2 < end; ++i2) {
      ret += String.fromCharCode(buf[i2] & 127);
    }
    return ret;
  }
  function latin1Slice(buf, start, end) {
    let ret = "";
    end = Math.min(buf.length, end);
    for (let i2 = start; i2 < end; ++i2) {
      ret += String.fromCharCode(buf[i2]);
    }
    return ret;
  }
  function hexSlice(buf, start, end) {
    const len = buf.length;
    if (!start || start < 0) start = 0;
    if (!end || end < 0 || end > len) end = len;
    let out = "";
    for (let i2 = start; i2 < end; ++i2) {
      out += hexSliceLookupTable[buf[i2]];
    }
    return out;
  }
  function utf16leSlice(buf, start, end) {
    const bytes = buf.slice(start, end);
    let res = "";
    for (let i2 = 0; i2 < bytes.length - 1; i2 += 2) {
      res += String.fromCharCode(bytes[i2] + bytes[i2 + 1] * 256);
    }
    return res;
  }
  Buffer2.prototype.slice = function slice(start, end) {
    const len = this.length;
    start = ~~start;
    end = end === void 0 ? len : ~~end;
    if (start < 0) {
      start += len;
      if (start < 0) start = 0;
    } else if (start > len) {
      start = len;
    }
    if (end < 0) {
      end += len;
      if (end < 0) end = 0;
    } else if (end > len) {
      end = len;
    }
    if (end < start) end = start;
    const newBuf = this.subarray(start, end);
    Object.setPrototypeOf(newBuf, Buffer2.prototype);
    return newBuf;
  };
  function checkOffset(offset, ext, length) {
    if (offset % 1 !== 0 || offset < 0) throw new RangeError("offset is not uint");
    if (offset + ext > length) throw new RangeError("Trying to access beyond buffer length");
  }
  Buffer2.prototype.readUintLE = Buffer2.prototype.readUIntLE = function readUIntLE(offset, byteLength2, noAssert) {
    offset = offset >>> 0;
    byteLength2 = byteLength2 >>> 0;
    if (!noAssert) checkOffset(offset, byteLength2, this.length);
    let val = this[offset];
    let mul = 1;
    let i2 = 0;
    while (++i2 < byteLength2 && (mul *= 256)) {
      val += this[offset + i2] * mul;
    }
    return val;
  };
  Buffer2.prototype.readUintBE = Buffer2.prototype.readUIntBE = function readUIntBE(offset, byteLength2, noAssert) {
    offset = offset >>> 0;
    byteLength2 = byteLength2 >>> 0;
    if (!noAssert) {
      checkOffset(offset, byteLength2, this.length);
    }
    let val = this[offset + --byteLength2];
    let mul = 1;
    while (byteLength2 > 0 && (mul *= 256)) {
      val += this[offset + --byteLength2] * mul;
    }
    return val;
  };
  Buffer2.prototype.readUint8 = Buffer2.prototype.readUInt8 = function readUInt8(offset, noAssert) {
    offset = offset >>> 0;
    if (!noAssert) checkOffset(offset, 1, this.length);
    return this[offset];
  };
  Buffer2.prototype.readUint16LE = Buffer2.prototype.readUInt16LE = function readUInt16LE(offset, noAssert) {
    offset = offset >>> 0;
    if (!noAssert) checkOffset(offset, 2, this.length);
    return this[offset] | this[offset + 1] << 8;
  };
  Buffer2.prototype.readUint16BE = Buffer2.prototype.readUInt16BE = function readUInt16BE(offset, noAssert) {
    offset = offset >>> 0;
    if (!noAssert) checkOffset(offset, 2, this.length);
    return this[offset] << 8 | this[offset + 1];
  };
  Buffer2.prototype.readUint32LE = Buffer2.prototype.readUInt32LE = function readUInt32LE(offset, noAssert) {
    offset = offset >>> 0;
    if (!noAssert) checkOffset(offset, 4, this.length);
    return (this[offset] | this[offset + 1] << 8 | this[offset + 2] << 16) + this[offset + 3] * 16777216;
  };
  Buffer2.prototype.readUint32BE = Buffer2.prototype.readUInt32BE = function readUInt32BE(offset, noAssert) {
    offset = offset >>> 0;
    if (!noAssert) checkOffset(offset, 4, this.length);
    return this[offset] * 16777216 + (this[offset + 1] << 16 | this[offset + 2] << 8 | this[offset + 3]);
  };
  Buffer2.prototype.readBigUInt64LE = function readBigUInt64LE(offset) {
    offset = offset >>> 0;
    validateNumber(offset, "offset");
    const first = this[offset];
    const last = this[offset + 7];
    if (first === void 0 || last === void 0) {
      boundsError(offset, this.length - 8);
    }
    const lo2 = first + this[++offset] * 2 ** 8 + this[++offset] * 2 ** 16 + this[++offset] * 2 ** 24;
    const hi = this[++offset] + this[++offset] * 2 ** 8 + this[++offset] * 2 ** 16 + last * 2 ** 24;
    return BigInt(lo2) + (BigInt(hi) << BigInt(32));
  };
  Buffer2.prototype.readBigUInt64BE = function readBigUInt64BE(offset) {
    offset = offset >>> 0;
    validateNumber(offset, "offset");
    const first = this[offset];
    const last = this[offset + 7];
    if (first === void 0 || last === void 0) {
      boundsError(offset, this.length - 8);
    }
    const hi = first * 2 ** 24 + this[++offset] * 2 ** 16 + this[++offset] * 2 ** 8 + this[++offset];
    const lo2 = this[++offset] * 2 ** 24 + this[++offset] * 2 ** 16 + this[++offset] * 2 ** 8 + last;
    return (BigInt(hi) << BigInt(32)) + BigInt(lo2);
  };
  Buffer2.prototype.readIntLE = function readIntLE(offset, byteLength2, noAssert) {
    offset = offset >>> 0;
    byteLength2 = byteLength2 >>> 0;
    if (!noAssert) checkOffset(offset, byteLength2, this.length);
    let val = this[offset];
    let mul = 1;
    let i2 = 0;
    while (++i2 < byteLength2 && (mul *= 256)) {
      val += this[offset + i2] * mul;
    }
    mul *= 128;
    if (val >= mul) val -= Math.pow(2, 8 * byteLength2);
    return val;
  };
  Buffer2.prototype.readIntBE = function readIntBE(offset, byteLength2, noAssert) {
    offset = offset >>> 0;
    byteLength2 = byteLength2 >>> 0;
    if (!noAssert) checkOffset(offset, byteLength2, this.length);
    let i2 = byteLength2;
    let mul = 1;
    let val = this[offset + --i2];
    while (i2 > 0 && (mul *= 256)) {
      val += this[offset + --i2] * mul;
    }
    mul *= 128;
    if (val >= mul) val -= Math.pow(2, 8 * byteLength2);
    return val;
  };
  Buffer2.prototype.readInt8 = function readInt8(offset, noAssert) {
    offset = offset >>> 0;
    if (!noAssert) checkOffset(offset, 1, this.length);
    if (!(this[offset] & 128)) return this[offset];
    return (255 - this[offset] + 1) * -1;
  };
  Buffer2.prototype.readInt16LE = function readInt16LE(offset, noAssert) {
    offset = offset >>> 0;
    if (!noAssert) checkOffset(offset, 2, this.length);
    const val = this[offset] | this[offset + 1] << 8;
    return val & 32768 ? val | 4294901760 : val;
  };
  Buffer2.prototype.readInt16BE = function readInt16BE(offset, noAssert) {
    offset = offset >>> 0;
    if (!noAssert) checkOffset(offset, 2, this.length);
    const val = this[offset + 1] | this[offset] << 8;
    return val & 32768 ? val | 4294901760 : val;
  };
  Buffer2.prototype.readInt32LE = function readInt32LE(offset, noAssert) {
    offset = offset >>> 0;
    if (!noAssert) checkOffset(offset, 4, this.length);
    return this[offset] | this[offset + 1] << 8 | this[offset + 2] << 16 | this[offset + 3] << 24;
  };
  Buffer2.prototype.readInt32BE = function readInt32BE(offset, noAssert) {
    offset = offset >>> 0;
    if (!noAssert) checkOffset(offset, 4, this.length);
    return this[offset] << 24 | this[offset + 1] << 16 | this[offset + 2] << 8 | this[offset + 3];
  };
  Buffer2.prototype.readBigInt64LE = function readBigInt64LE(offset) {
    offset = offset >>> 0;
    validateNumber(offset, "offset");
    const first = this[offset];
    const last = this[offset + 7];
    if (first === void 0 || last === void 0) {
      boundsError(offset, this.length - 8);
    }
    const val = this[offset + 4] + this[offset + 5] * 2 ** 8 + this[offset + 6] * 2 ** 16 + (last << 24);
    return (BigInt(val) << BigInt(32)) + BigInt(first + this[++offset] * 2 ** 8 + this[++offset] * 2 ** 16 + this[++offset] * 2 ** 24);
  };
  Buffer2.prototype.readBigInt64BE = function readBigInt64BE(offset) {
    offset = offset >>> 0;
    validateNumber(offset, "offset");
    const first = this[offset];
    const last = this[offset + 7];
    if (first === void 0 || last === void 0) {
      boundsError(offset, this.length - 8);
    }
    const val = (first << 24) + // Overflow
    this[++offset] * 2 ** 16 + this[++offset] * 2 ** 8 + this[++offset];
    return (BigInt(val) << BigInt(32)) + BigInt(this[++offset] * 2 ** 24 + this[++offset] * 2 ** 16 + this[++offset] * 2 ** 8 + last);
  };
  Buffer2.prototype.readFloatLE = function readFloatLE(offset, noAssert) {
    offset = offset >>> 0;
    if (!noAssert) checkOffset(offset, 4, this.length);
    return ieee754.read(this, offset, true, 23, 4);
  };
  Buffer2.prototype.readFloatBE = function readFloatBE(offset, noAssert) {
    offset = offset >>> 0;
    if (!noAssert) checkOffset(offset, 4, this.length);
    return ieee754.read(this, offset, false, 23, 4);
  };
  Buffer2.prototype.readDoubleLE = function readDoubleLE(offset, noAssert) {
    offset = offset >>> 0;
    if (!noAssert) checkOffset(offset, 8, this.length);
    return ieee754.read(this, offset, true, 52, 8);
  };
  Buffer2.prototype.readDoubleBE = function readDoubleBE(offset, noAssert) {
    offset = offset >>> 0;
    if (!noAssert) checkOffset(offset, 8, this.length);
    return ieee754.read(this, offset, false, 52, 8);
  };
  function checkInt(buf, value, offset, ext, max, min) {
    if (!Buffer2.isBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance');
    if (value > max || value < min) throw new RangeError('"value" argument is out of bounds');
    if (offset + ext > buf.length) throw new RangeError("Index out of range");
  }
  Buffer2.prototype.writeUintLE = Buffer2.prototype.writeUIntLE = function writeUIntLE(value, offset, byteLength2, noAssert) {
    value = +value;
    offset = offset >>> 0;
    byteLength2 = byteLength2 >>> 0;
    if (!noAssert) {
      const maxBytes = Math.pow(2, 8 * byteLength2) - 1;
      checkInt(this, value, offset, byteLength2, maxBytes, 0);
    }
    let mul = 1;
    let i2 = 0;
    this[offset] = value & 255;
    while (++i2 < byteLength2 && (mul *= 256)) {
      this[offset + i2] = value / mul & 255;
    }
    return offset + byteLength2;
  };
  Buffer2.prototype.writeUintBE = Buffer2.prototype.writeUIntBE = function writeUIntBE(value, offset, byteLength2, noAssert) {
    value = +value;
    offset = offset >>> 0;
    byteLength2 = byteLength2 >>> 0;
    if (!noAssert) {
      const maxBytes = Math.pow(2, 8 * byteLength2) - 1;
      checkInt(this, value, offset, byteLength2, maxBytes, 0);
    }
    let i2 = byteLength2 - 1;
    let mul = 1;
    this[offset + i2] = value & 255;
    while (--i2 >= 0 && (mul *= 256)) {
      this[offset + i2] = value / mul & 255;
    }
    return offset + byteLength2;
  };
  Buffer2.prototype.writeUint8 = Buffer2.prototype.writeUInt8 = function writeUInt8(value, offset, noAssert) {
    value = +value;
    offset = offset >>> 0;
    if (!noAssert) checkInt(this, value, offset, 1, 255, 0);
    this[offset] = value & 255;
    return offset + 1;
  };
  Buffer2.prototype.writeUint16LE = Buffer2.prototype.writeUInt16LE = function writeUInt16LE(value, offset, noAssert) {
    value = +value;
    offset = offset >>> 0;
    if (!noAssert) checkInt(this, value, offset, 2, 65535, 0);
    this[offset] = value & 255;
    this[offset + 1] = value >>> 8;
    return offset + 2;
  };
  Buffer2.prototype.writeUint16BE = Buffer2.prototype.writeUInt16BE = function writeUInt16BE(value, offset, noAssert) {
    value = +value;
    offset = offset >>> 0;
    if (!noAssert) checkInt(this, value, offset, 2, 65535, 0);
    this[offset] = value >>> 8;
    this[offset + 1] = value & 255;
    return offset + 2;
  };
  Buffer2.prototype.writeUint32LE = Buffer2.prototype.writeUInt32LE = function writeUInt32LE(value, offset, noAssert) {
    value = +value;
    offset = offset >>> 0;
    if (!noAssert) checkInt(this, value, offset, 4, 4294967295, 0);
    this[offset + 3] = value >>> 24;
    this[offset + 2] = value >>> 16;
    this[offset + 1] = value >>> 8;
    this[offset] = value & 255;
    return offset + 4;
  };
  Buffer2.prototype.writeUint32BE = Buffer2.prototype.writeUInt32BE = function writeUInt32BE(value, offset, noAssert) {
    value = +value;
    offset = offset >>> 0;
    if (!noAssert) checkInt(this, value, offset, 4, 4294967295, 0);
    this[offset] = value >>> 24;
    this[offset + 1] = value >>> 16;
    this[offset + 2] = value >>> 8;
    this[offset + 3] = value & 255;
    return offset + 4;
  };
  function wrtBigUInt64LE(buf, value, offset, min, max) {
    checkIntBI(value, min, max, buf, offset, 7);
    let lo2 = Number(value & BigInt(4294967295));
    buf[offset++] = lo2;
    lo2 = lo2 >> 8;
    buf[offset++] = lo2;
    lo2 = lo2 >> 8;
    buf[offset++] = lo2;
    lo2 = lo2 >> 8;
    buf[offset++] = lo2;
    let hi = Number(value >> BigInt(32) & BigInt(4294967295));
    buf[offset++] = hi;
    hi = hi >> 8;
    buf[offset++] = hi;
    hi = hi >> 8;
    buf[offset++] = hi;
    hi = hi >> 8;
    buf[offset++] = hi;
    return offset;
  }
  function wrtBigUInt64BE(buf, value, offset, min, max) {
    checkIntBI(value, min, max, buf, offset, 7);
    let lo2 = Number(value & BigInt(4294967295));
    buf[offset + 7] = lo2;
    lo2 = lo2 >> 8;
    buf[offset + 6] = lo2;
    lo2 = lo2 >> 8;
    buf[offset + 5] = lo2;
    lo2 = lo2 >> 8;
    buf[offset + 4] = lo2;
    let hi = Number(value >> BigInt(32) & BigInt(4294967295));
    buf[offset + 3] = hi;
    hi = hi >> 8;
    buf[offset + 2] = hi;
    hi = hi >> 8;
    buf[offset + 1] = hi;
    hi = hi >> 8;
    buf[offset] = hi;
    return offset + 8;
  }
  Buffer2.prototype.writeBigUInt64LE = function writeBigUInt64LE(value, offset = 0) {
    return wrtBigUInt64LE(this, value, offset, BigInt(0), BigInt("0xffffffffffffffff"));
  };
  Buffer2.prototype.writeBigUInt64BE = function writeBigUInt64BE(value, offset = 0) {
    return wrtBigUInt64BE(this, value, offset, BigInt(0), BigInt("0xffffffffffffffff"));
  };
  Buffer2.prototype.writeIntLE = function writeIntLE(value, offset, byteLength2, noAssert) {
    value = +value;
    offset = offset >>> 0;
    if (!noAssert) {
      const limit = Math.pow(2, 8 * byteLength2 - 1);
      checkInt(this, value, offset, byteLength2, limit - 1, -limit);
    }
    let i2 = 0;
    let mul = 1;
    let sub = 0;
    this[offset] = value & 255;
    while (++i2 < byteLength2 && (mul *= 256)) {
      if (value < 0 && sub === 0 && this[offset + i2 - 1] !== 0) {
        sub = 1;
      }
      this[offset + i2] = (value / mul >> 0) - sub & 255;
    }
    return offset + byteLength2;
  };
  Buffer2.prototype.writeIntBE = function writeIntBE(value, offset, byteLength2, noAssert) {
    value = +value;
    offset = offset >>> 0;
    if (!noAssert) {
      const limit = Math.pow(2, 8 * byteLength2 - 1);
      checkInt(this, value, offset, byteLength2, limit - 1, -limit);
    }
    let i2 = byteLength2 - 1;
    let mul = 1;
    let sub = 0;
    this[offset + i2] = value & 255;
    while (--i2 >= 0 && (mul *= 256)) {
      if (value < 0 && sub === 0 && this[offset + i2 + 1] !== 0) {
        sub = 1;
      }
      this[offset + i2] = (value / mul >> 0) - sub & 255;
    }
    return offset + byteLength2;
  };
  Buffer2.prototype.writeInt8 = function writeInt8(value, offset, noAssert) {
    value = +value;
    offset = offset >>> 0;
    if (!noAssert) checkInt(this, value, offset, 1, 127, -128);
    if (value < 0) value = 255 + value + 1;
    this[offset] = value & 255;
    return offset + 1;
  };
  Buffer2.prototype.writeInt16LE = function writeInt16LE(value, offset, noAssert) {
    value = +value;
    offset = offset >>> 0;
    if (!noAssert) checkInt(this, value, offset, 2, 32767, -32768);
    this[offset] = value & 255;
    this[offset + 1] = value >>> 8;
    return offset + 2;
  };
  Buffer2.prototype.writeInt16BE = function writeInt16BE(value, offset, noAssert) {
    value = +value;
    offset = offset >>> 0;
    if (!noAssert) checkInt(this, value, offset, 2, 32767, -32768);
    this[offset] = value >>> 8;
    this[offset + 1] = value & 255;
    return offset + 2;
  };
  Buffer2.prototype.writeInt32LE = function writeInt32LE(value, offset, noAssert) {
    value = +value;
    offset = offset >>> 0;
    if (!noAssert) checkInt(this, value, offset, 4, 2147483647, -2147483648);
    this[offset] = value & 255;
    this[offset + 1] = value >>> 8;
    this[offset + 2] = value >>> 16;
    this[offset + 3] = value >>> 24;
    return offset + 4;
  };
  Buffer2.prototype.writeInt32BE = function writeInt32BE(value, offset, noAssert) {
    value = +value;
    offset = offset >>> 0;
    if (!noAssert) checkInt(this, value, offset, 4, 2147483647, -2147483648);
    if (value < 0) value = 4294967295 + value + 1;
    this[offset] = value >>> 24;
    this[offset + 1] = value >>> 16;
    this[offset + 2] = value >>> 8;
    this[offset + 3] = value & 255;
    return offset + 4;
  };
  Buffer2.prototype.writeBigInt64LE = function writeBigInt64LE(value, offset = 0) {
    return wrtBigUInt64LE(this, value, offset, -BigInt("0x8000000000000000"), BigInt("0x7fffffffffffffff"));
  };
  Buffer2.prototype.writeBigInt64BE = function writeBigInt64BE(value, offset = 0) {
    return wrtBigUInt64BE(this, value, offset, -BigInt("0x8000000000000000"), BigInt("0x7fffffffffffffff"));
  };
  function checkIEEE754(buf, value, offset, ext, max, min) {
    if (offset + ext > buf.length) throw new RangeError("Index out of range");
    if (offset < 0) throw new RangeError("Index out of range");
  }
  function writeFloat(buf, value, offset, littleEndian, noAssert) {
    value = +value;
    offset = offset >>> 0;
    if (!noAssert) {
      checkIEEE754(buf, value, offset, 4, 34028234663852886e22, -34028234663852886e22);
    }
    ieee754.write(buf, value, offset, littleEndian, 23, 4);
    return offset + 4;
  }
  Buffer2.prototype.writeFloatLE = function writeFloatLE(value, offset, noAssert) {
    return writeFloat(this, value, offset, true, noAssert);
  };
  Buffer2.prototype.writeFloatBE = function writeFloatBE(value, offset, noAssert) {
    return writeFloat(this, value, offset, false, noAssert);
  };
  function writeDouble(buf, value, offset, littleEndian, noAssert) {
    value = +value;
    offset = offset >>> 0;
    if (!noAssert) {
      checkIEEE754(buf, value, offset, 8, 17976931348623157e292, -17976931348623157e292);
    }
    ieee754.write(buf, value, offset, littleEndian, 52, 8);
    return offset + 8;
  }
  Buffer2.prototype.writeDoubleLE = function writeDoubleLE(value, offset, noAssert) {
    return writeDouble(this, value, offset, true, noAssert);
  };
  Buffer2.prototype.writeDoubleBE = function writeDoubleBE(value, offset, noAssert) {
    return writeDouble(this, value, offset, false, noAssert);
  };
  Buffer2.prototype.copy = function copy(target, targetStart, start, end) {
    if (!Buffer2.isBuffer(target)) throw new TypeError("argument should be a Buffer");
    if (!start) start = 0;
    if (!end && end !== 0) end = this.length;
    if (targetStart >= target.length) targetStart = target.length;
    if (!targetStart) targetStart = 0;
    if (end > 0 && end < start) end = start;
    if (end === start) return 0;
    if (target.length === 0 || this.length === 0) return 0;
    if (targetStart < 0) {
      throw new RangeError("targetStart out of bounds");
    }
    if (start < 0 || start >= this.length) throw new RangeError("Index out of range");
    if (end < 0) throw new RangeError("sourceEnd out of bounds");
    if (end > this.length) end = this.length;
    if (target.length - targetStart < end - start) {
      end = target.length - targetStart + start;
    }
    const len = end - start;
    if (this === target) {
      this.copyWithin(targetStart, start, end);
    } else {
      Uint8Array.prototype.set.call(
        target,
        this.subarray(start, end),
        targetStart
      );
    }
    return len;
  };
  Buffer2.prototype.fill = function fill(val, start, end, encoding) {
    if (typeof val === "string") {
      if (typeof start === "string") {
        encoding = start;
        start = 0;
        end = this.length;
      } else if (typeof end === "string") {
        encoding = end;
        end = this.length;
      }
      if (encoding !== void 0 && typeof encoding !== "string") {
        throw new TypeError("encoding must be a string");
      }
      if (typeof encoding === "string" && !Buffer2.isEncoding(encoding)) {
        throw new TypeError("Unknown encoding: " + encoding);
      }
      if (val.length === 1) {
        const code2 = val.charCodeAt(0);
        if (encoding === "utf8" && code2 < 128 || encoding === "latin1") {
          val = code2;
        }
      }
    } else if (typeof val === "number") {
      val = val & 255;
    } else if (typeof val === "boolean") {
      val = Number(val);
    }
    if (start < 0 || this.length < start || this.length < end) {
      throw new RangeError("Out of range index");
    }
    if (end <= start) {
      return this;
    }
    start = start >>> 0;
    end = end === void 0 ? this.length : end >>> 0;
    if (!val) val = 0;
    let i2;
    if (typeof val === "number") {
      for (i2 = start; i2 < end; ++i2) {
        this[i2] = val;
      }
    } else {
      const bytes = Buffer2.isBuffer(val) ? val : Buffer2.from(val, encoding);
      const len = bytes.length;
      if (len === 0) {
        throw new TypeError('The value "' + val + '" is invalid for argument "value"');
      }
      for (i2 = 0; i2 < end - start; ++i2) {
        this[i2 + start] = bytes[i2 % len];
      }
    }
    return this;
  };
  var errors = {};
  function E2(sym, getMessage, Base) {
    errors[sym] = class NodeError extends Base {
      constructor() {
        super();
        Object.defineProperty(this, "message", {
          value: getMessage.apply(this, arguments),
          writable: true,
          configurable: true
        });
        this.name = `${this.name} [${sym}]`;
        this.stack;
        delete this.name;
      }
      get code() {
        return sym;
      }
      set code(value) {
        Object.defineProperty(this, "code", {
          configurable: true,
          enumerable: true,
          value,
          writable: true
        });
      }
      toString() {
        return `${this.name} [${sym}]: ${this.message}`;
      }
    };
  }
  E2(
    "ERR_BUFFER_OUT_OF_BOUNDS",
    function(name) {
      if (name) {
        return `${name} is outside of buffer bounds`;
      }
      return "Attempt to access memory outside buffer bounds";
    },
    RangeError
  );
  E2(
    "ERR_INVALID_ARG_TYPE",
    function(name, actual) {
      return `The "${name}" argument must be of type number. Received type ${typeof actual}`;
    },
    TypeError
  );
  E2(
    "ERR_OUT_OF_RANGE",
    function(str, range, input) {
      let msg = `The value of "${str}" is out of range.`;
      let received = input;
      if (Number.isInteger(input) && Math.abs(input) > 2 ** 32) {
        received = addNumericalSeparator(String(input));
      } else if (typeof input === "bigint") {
        received = String(input);
        if (input > BigInt(2) ** BigInt(32) || input < -(BigInt(2) ** BigInt(32))) {
          received = addNumericalSeparator(received);
        }
        received += "n";
      }
      msg += ` It must be ${range}. Received ${received}`;
      return msg;
    },
    RangeError
  );
  function addNumericalSeparator(val) {
    let res = "";
    let i2 = val.length;
    const start = val[0] === "-" ? 1 : 0;
    for (; i2 >= start + 4; i2 -= 3) {
      res = `_${val.slice(i2 - 3, i2)}${res}`;
    }
    return `${val.slice(0, i2)}${res}`;
  }
  function checkBounds(buf, offset, byteLength2) {
    validateNumber(offset, "offset");
    if (buf[offset] === void 0 || buf[offset + byteLength2] === void 0) {
      boundsError(offset, buf.length - (byteLength2 + 1));
    }
  }
  function checkIntBI(value, min, max, buf, offset, byteLength2) {
    if (value > max || value < min) {
      const n2 = typeof min === "bigint" ? "n" : "";
      let range;
      if (byteLength2 > 3) {
        if (min === 0 || min === BigInt(0)) {
          range = `>= 0${n2} and < 2${n2} ** ${(byteLength2 + 1) * 8}${n2}`;
        } else {
          range = `>= -(2${n2} ** ${(byteLength2 + 1) * 8 - 1}${n2}) and < 2 ** ${(byteLength2 + 1) * 8 - 1}${n2}`;
        }
      } else {
        range = `>= ${min}${n2} and <= ${max}${n2}`;
      }
      throw new errors.ERR_OUT_OF_RANGE("value", range, value);
    }
    checkBounds(buf, offset, byteLength2);
  }
  function validateNumber(value, name) {
    if (typeof value !== "number") {
      throw new errors.ERR_INVALID_ARG_TYPE(name, "number", value);
    }
  }
  function boundsError(value, length, type) {
    if (Math.floor(value) !== value) {
      validateNumber(value, type);
      throw new errors.ERR_OUT_OF_RANGE(type || "offset", "an integer", value);
    }
    if (length < 0) {
      throw new errors.ERR_BUFFER_OUT_OF_BOUNDS();
    }
    throw new errors.ERR_OUT_OF_RANGE(
      type || "offset",
      `>= ${type ? 1 : 0} and <= ${length}`,
      value
    );
  }
  var INVALID_BASE64_RE = /[^+/0-9A-Za-z-_]/g;
  function base64clean(str) {
    str = str.split("=")[0];
    str = str.trim().replace(INVALID_BASE64_RE, "");
    if (str.length < 2) return "";
    while (str.length % 4 !== 0) {
      str = str + "=";
    }
    return str;
  }
  function utf8ToBytes(string, units) {
    units = units || Infinity;
    let codePoint;
    const length = string.length;
    let leadSurrogate = null;
    const bytes = [];
    for (let i2 = 0; i2 < length; ++i2) {
      codePoint = string.charCodeAt(i2);
      if (codePoint > 55295 && codePoint < 57344) {
        if (!leadSurrogate) {
          if (codePoint > 56319) {
            if ((units -= 3) > -1) bytes.push(239, 191, 189);
            continue;
          } else if (i2 + 1 === length) {
            if ((units -= 3) > -1) bytes.push(239, 191, 189);
            continue;
          }
          leadSurrogate = codePoint;
          continue;
        }
        if (codePoint < 56320) {
          if ((units -= 3) > -1) bytes.push(239, 191, 189);
          leadSurrogate = codePoint;
          continue;
        }
        codePoint = (leadSurrogate - 55296 << 10 | codePoint - 56320) + 65536;
      } else if (leadSurrogate) {
        if ((units -= 3) > -1) bytes.push(239, 191, 189);
      }
      leadSurrogate = null;
      if (codePoint < 128) {
        if ((units -= 1) < 0) break;
        bytes.push(codePoint);
      } else if (codePoint < 2048) {
        if ((units -= 2) < 0) break;
        bytes.push(
          codePoint >> 6 | 192,
          codePoint & 63 | 128
        );
      } else if (codePoint < 65536) {
        if ((units -= 3) < 0) break;
        bytes.push(
          codePoint >> 12 | 224,
          codePoint >> 6 & 63 | 128,
          codePoint & 63 | 128
        );
      } else if (codePoint < 1114112) {
        if ((units -= 4) < 0) break;
        bytes.push(
          codePoint >> 18 | 240,
          codePoint >> 12 & 63 | 128,
          codePoint >> 6 & 63 | 128,
          codePoint & 63 | 128
        );
      } else {
        throw new Error("Invalid code point");
      }
    }
    return bytes;
  }
  function asciiToBytes(str) {
    const byteArray = [];
    for (let i2 = 0; i2 < str.length; ++i2) {
      byteArray.push(str.charCodeAt(i2) & 255);
    }
    return byteArray;
  }
  function utf16leToBytes(str, units) {
    let c2, hi, lo2;
    const byteArray = [];
    for (let i2 = 0; i2 < str.length; ++i2) {
      if ((units -= 2) < 0) break;
      c2 = str.charCodeAt(i2);
      hi = c2 >> 8;
      lo2 = c2 % 256;
      byteArray.push(lo2);
      byteArray.push(hi);
    }
    return byteArray;
  }
  function base64ToBytes(str) {
    return base64.toByteArray(base64clean(str));
  }
  function blitBuffer(src, dst, offset, length) {
    let i2;
    for (i2 = 0; i2 < length; ++i2) {
      if (i2 + offset >= dst.length || i2 >= src.length) break;
      dst[i2 + offset] = src[i2];
    }
    return i2;
  }
  var hexSliceLookupTable = (function() {
    const alphabet = "0123456789abcdef";
    const table = new Array(256);
    for (let i2 = 0; i2 < 16; ++i2) {
      const i16 = i2 * 16;
      for (let j2 = 0; j2 < 16; ++j2) {
        table[i16 + j2] = alphabet[i2] + alphabet[j2];
      }
    }
    return table;
  })();

  // node_modules/frida-java-bridge/lib/mkdex.js
  var kAccPublic2 = 1;
  var kAccNative2 = 256;
  var kAccConstructor = 65536;
  var kEndianTag = 305419896;
  var kClassDefSize = 32;
  var kProtoIdSize = 12;
  var kFieldIdSize = 8;
  var kMethodIdSize = 8;
  var kTypeIdSize = 4;
  var kStringIdSize = 4;
  var kMapItemSize = 12;
  var TYPE_HEADER_ITEM = 0;
  var TYPE_STRING_ID_ITEM = 1;
  var TYPE_TYPE_ID_ITEM = 2;
  var TYPE_PROTO_ID_ITEM = 3;
  var TYPE_FIELD_ID_ITEM = 4;
  var TYPE_METHOD_ID_ITEM = 5;
  var TYPE_CLASS_DEF_ITEM = 6;
  var TYPE_MAP_LIST = 4096;
  var TYPE_TYPE_LIST = 4097;
  var TYPE_ANNOTATION_SET_ITEM = 4099;
  var TYPE_CLASS_DATA_ITEM = 8192;
  var TYPE_CODE_ITEM = 8193;
  var TYPE_STRING_DATA_ITEM = 8194;
  var TYPE_DEBUG_INFO_ITEM = 8195;
  var TYPE_ANNOTATION_ITEM = 8196;
  var TYPE_ANNOTATIONS_DIRECTORY_ITEM = 8198;
  var VALUE_TYPE = 24;
  var VALUE_ARRAY = 28;
  var VISIBILITY_SYSTEM = 2;
  var kDefaultConstructorSize = 24;
  var kDefaultConstructorDebugInfo = Buffer2.from([3, 0, 7, 14, 0]);
  var kDalvikAnnotationTypeThrows = "Ldalvik/annotation/Throws;";
  var kNullTerminator = Buffer2.from([0]);
  function mkdex(spec) {
    const builder = new DexBuilder();
    const fullSpec = Object.assign({}, spec);
    builder.addClass(fullSpec);
    return builder.build();
  }
  var DexBuilder = class {
    constructor() {
      this.classes = [];
    }
    addClass(spec) {
      this.classes.push(spec);
    }
    build() {
      const model = computeModel(this.classes);
      const {
        classes,
        interfaces,
        fields,
        methods,
        protos,
        parameters,
        annotationDirectories,
        annotationSets,
        throwsAnnotations,
        types,
        strings
      } = model;
      let offset = 0;
      const headerOffset = 0;
      const checksumOffset = 8;
      const signatureOffset = 12;
      const signatureSize = 20;
      const headerSize = 112;
      offset += headerSize;
      const stringIdsOffset = offset;
      const stringIdsSize = strings.length * kStringIdSize;
      offset += stringIdsSize;
      const typeIdsOffset = offset;
      const typeIdsSize = types.length * kTypeIdSize;
      offset += typeIdsSize;
      const protoIdsOffset = offset;
      const protoIdsSize = protos.length * kProtoIdSize;
      offset += protoIdsSize;
      const fieldIdsOffset = offset;
      const fieldIdsSize = fields.length * kFieldIdSize;
      offset += fieldIdsSize;
      const methodIdsOffset = offset;
      const methodIdsSize = methods.length * kMethodIdSize;
      offset += methodIdsSize;
      const classDefsOffset = offset;
      const classDefsSize = classes.length * kClassDefSize;
      offset += classDefsSize;
      const dataOffset = offset;
      const annotationSetOffsets = annotationSets.map((set) => {
        const setOffset = offset;
        set.offset = setOffset;
        offset += 4 + set.items.length * 4;
        return setOffset;
      });
      const javaCodeItems = classes.reduce((result, klass) => {
        const constructorMethods = klass.classData.constructorMethods;
        constructorMethods.forEach((method) => {
          const [, accessFlags, superConstructor] = method;
          if ((accessFlags & kAccNative2) === 0 && superConstructor >= 0) {
            method.push(offset);
            result.push({ offset, superConstructor });
            offset += kDefaultConstructorSize;
          }
        });
        return result;
      }, []);
      annotationDirectories.forEach((dir) => {
        dir.offset = offset;
        offset += 16 + dir.methods.length * 8;
      });
      const interfaceOffsets = interfaces.map((iface) => {
        offset = align(offset, 4);
        const ifaceOffset = offset;
        iface.offset = ifaceOffset;
        offset += 4 + 2 * iface.types.length;
        return ifaceOffset;
      });
      const parameterOffsets = parameters.map((param) => {
        offset = align(offset, 4);
        const paramOffset = offset;
        param.offset = paramOffset;
        offset += 4 + 2 * param.types.length;
        return paramOffset;
      });
      const stringChunks = [];
      const stringOffsets = strings.map((str) => {
        const strOffset = offset;
        const header = Buffer2.from(createUleb128(str.length));
        const data = Buffer2.from(str, "utf8");
        const chunk = Buffer2.concat([header, data, kNullTerminator]);
        stringChunks.push(chunk);
        offset += chunk.length;
        return strOffset;
      });
      const debugInfoOffsets = javaCodeItems.map((codeItem) => {
        const debugOffset = offset;
        offset += kDefaultConstructorDebugInfo.length;
        return debugOffset;
      });
      const throwsAnnotationBlobs = throwsAnnotations.map((annotation) => {
        const blob = makeThrowsAnnotation(annotation);
        annotation.offset = offset;
        offset += blob.length;
        return blob;
      });
      const classDataBlobs = classes.map((klass, index) => {
        klass.classData.offset = offset;
        const blob = makeClassData(klass);
        offset += blob.length;
        return blob;
      });
      const linkSize = 0;
      const linkOffset = 0;
      offset = align(offset, 4);
      const mapOffset = offset;
      const typeListLength = interfaces.length + parameters.length;
      const mapNumItems = 4 + (fields.length > 0 ? 1 : 0) + 2 + annotationSets.length + javaCodeItems.length + annotationDirectories.length + (typeListLength > 0 ? 1 : 0) + 1 + debugInfoOffsets.length + throwsAnnotations.length + classes.length + 1;
      const mapSize = 4 + mapNumItems * kMapItemSize;
      offset += mapSize;
      const dataSize = offset - dataOffset;
      const fileSize = offset;
      const dex = Buffer2.alloc(fileSize);
      dex.write("dex\n035");
      dex.writeUInt32LE(fileSize, 32);
      dex.writeUInt32LE(headerSize, 36);
      dex.writeUInt32LE(kEndianTag, 40);
      dex.writeUInt32LE(linkSize, 44);
      dex.writeUInt32LE(linkOffset, 48);
      dex.writeUInt32LE(mapOffset, 52);
      dex.writeUInt32LE(strings.length, 56);
      dex.writeUInt32LE(stringIdsOffset, 60);
      dex.writeUInt32LE(types.length, 64);
      dex.writeUInt32LE(typeIdsOffset, 68);
      dex.writeUInt32LE(protos.length, 72);
      dex.writeUInt32LE(protoIdsOffset, 76);
      dex.writeUInt32LE(fields.length, 80);
      dex.writeUInt32LE(fields.length > 0 ? fieldIdsOffset : 0, 84);
      dex.writeUInt32LE(methods.length, 88);
      dex.writeUInt32LE(methodIdsOffset, 92);
      dex.writeUInt32LE(classes.length, 96);
      dex.writeUInt32LE(classDefsOffset, 100);
      dex.writeUInt32LE(dataSize, 104);
      dex.writeUInt32LE(dataOffset, 108);
      stringOffsets.forEach((offset2, index) => {
        dex.writeUInt32LE(offset2, stringIdsOffset + index * kStringIdSize);
      });
      types.forEach((id, index) => {
        dex.writeUInt32LE(id, typeIdsOffset + index * kTypeIdSize);
      });
      protos.forEach((proto, index) => {
        const [shortyIndex, returnTypeIndex, params] = proto;
        const protoOffset = protoIdsOffset + index * kProtoIdSize;
        dex.writeUInt32LE(shortyIndex, protoOffset);
        dex.writeUInt32LE(returnTypeIndex, protoOffset + 4);
        dex.writeUInt32LE(params !== null ? params.offset : 0, protoOffset + 8);
      });
      fields.forEach((field, index) => {
        const [classIndex, typeIndex, nameIndex] = field;
        const fieldOffset = fieldIdsOffset + index * kFieldIdSize;
        dex.writeUInt16LE(classIndex, fieldOffset);
        dex.writeUInt16LE(typeIndex, fieldOffset + 2);
        dex.writeUInt32LE(nameIndex, fieldOffset + 4);
      });
      methods.forEach((method, index) => {
        const [classIndex, protoIndex, nameIndex] = method;
        const methodOffset = methodIdsOffset + index * kMethodIdSize;
        dex.writeUInt16LE(classIndex, methodOffset);
        dex.writeUInt16LE(protoIndex, methodOffset + 2);
        dex.writeUInt32LE(nameIndex, methodOffset + 4);
      });
      classes.forEach((klass, index) => {
        const { interfaces: interfaces2, annotationsDirectory } = klass;
        const interfacesOffset = interfaces2 !== null ? interfaces2.offset : 0;
        const annotationsOffset = annotationsDirectory !== null ? annotationsDirectory.offset : 0;
        const staticValuesOffset = 0;
        const classOffset = classDefsOffset + index * kClassDefSize;
        dex.writeUInt32LE(klass.index, classOffset);
        dex.writeUInt32LE(klass.accessFlags, classOffset + 4);
        dex.writeUInt32LE(klass.superClassIndex, classOffset + 8);
        dex.writeUInt32LE(interfacesOffset, classOffset + 12);
        dex.writeUInt32LE(klass.sourceFileIndex, classOffset + 16);
        dex.writeUInt32LE(annotationsOffset, classOffset + 20);
        dex.writeUInt32LE(klass.classData.offset, classOffset + 24);
        dex.writeUInt32LE(staticValuesOffset, classOffset + 28);
      });
      annotationSets.forEach((set, index) => {
        const { items } = set;
        const setOffset = annotationSetOffsets[index];
        dex.writeUInt32LE(items.length, setOffset);
        items.forEach((item, index2) => {
          dex.writeUInt32LE(item.offset, setOffset + 4 + index2 * 4);
        });
      });
      javaCodeItems.forEach((codeItem, index) => {
        const { offset: offset2, superConstructor } = codeItem;
        const registersSize = 1;
        const insSize = 1;
        const outsSize = 1;
        const triesSize = 0;
        const insnsSize = 4;
        dex.writeUInt16LE(registersSize, offset2);
        dex.writeUInt16LE(insSize, offset2 + 2);
        dex.writeUInt16LE(outsSize, offset2 + 4);
        dex.writeUInt16LE(triesSize, offset2 + 6);
        dex.writeUInt32LE(debugInfoOffsets[index], offset2 + 8);
        dex.writeUInt32LE(insnsSize, offset2 + 12);
        dex.writeUInt16LE(4208, offset2 + 16);
        dex.writeUInt16LE(superConstructor, offset2 + 18);
        dex.writeUInt16LE(0, offset2 + 20);
        dex.writeUInt16LE(14, offset2 + 22);
      });
      annotationDirectories.forEach((dir) => {
        const dirOffset = dir.offset;
        const classAnnotationsOffset = 0;
        const fieldsSize = 0;
        const annotatedMethodsSize = dir.methods.length;
        const annotatedParametersSize = 0;
        dex.writeUInt32LE(classAnnotationsOffset, dirOffset);
        dex.writeUInt32LE(fieldsSize, dirOffset + 4);
        dex.writeUInt32LE(annotatedMethodsSize, dirOffset + 8);
        dex.writeUInt32LE(annotatedParametersSize, dirOffset + 12);
        dir.methods.forEach((method, index) => {
          const entryOffset = dirOffset + 16 + index * 8;
          const [methodIndex, annotationSet] = method;
          dex.writeUInt32LE(methodIndex, entryOffset);
          dex.writeUInt32LE(annotationSet.offset, entryOffset + 4);
        });
      });
      interfaces.forEach((iface, index) => {
        const ifaceOffset = interfaceOffsets[index];
        dex.writeUInt32LE(iface.types.length, ifaceOffset);
        iface.types.forEach((type, typeIndex) => {
          dex.writeUInt16LE(type, ifaceOffset + 4 + typeIndex * 2);
        });
      });
      parameters.forEach((param, index) => {
        const paramOffset = parameterOffsets[index];
        dex.writeUInt32LE(param.types.length, paramOffset);
        param.types.forEach((type, typeIndex) => {
          dex.writeUInt16LE(type, paramOffset + 4 + typeIndex * 2);
        });
      });
      stringChunks.forEach((chunk, index) => {
        chunk.copy(dex, stringOffsets[index]);
      });
      debugInfoOffsets.forEach((debugInfoOffset) => {
        kDefaultConstructorDebugInfo.copy(dex, debugInfoOffset);
      });
      throwsAnnotationBlobs.forEach((annotationBlob, index) => {
        annotationBlob.copy(dex, throwsAnnotations[index].offset);
      });
      classDataBlobs.forEach((classDataBlob, index) => {
        classDataBlob.copy(dex, classes[index].classData.offset);
      });
      dex.writeUInt32LE(mapNumItems, mapOffset);
      const mapItems = [
        [TYPE_HEADER_ITEM, 1, headerOffset],
        [TYPE_STRING_ID_ITEM, strings.length, stringIdsOffset],
        [TYPE_TYPE_ID_ITEM, types.length, typeIdsOffset],
        [TYPE_PROTO_ID_ITEM, protos.length, protoIdsOffset]
      ];
      if (fields.length > 0) {
        mapItems.push([TYPE_FIELD_ID_ITEM, fields.length, fieldIdsOffset]);
      }
      mapItems.push([TYPE_METHOD_ID_ITEM, methods.length, methodIdsOffset]);
      mapItems.push([TYPE_CLASS_DEF_ITEM, classes.length, classDefsOffset]);
      annotationSets.forEach((set, index) => {
        mapItems.push([TYPE_ANNOTATION_SET_ITEM, set.items.length, annotationSetOffsets[index]]);
      });
      javaCodeItems.forEach((codeItem) => {
        mapItems.push([TYPE_CODE_ITEM, 1, codeItem.offset]);
      });
      annotationDirectories.forEach((dir) => {
        mapItems.push([TYPE_ANNOTATIONS_DIRECTORY_ITEM, 1, dir.offset]);
      });
      if (typeListLength > 0) {
        mapItems.push([TYPE_TYPE_LIST, typeListLength, interfaceOffsets.concat(parameterOffsets)[0]]);
      }
      mapItems.push([TYPE_STRING_DATA_ITEM, strings.length, stringOffsets[0]]);
      debugInfoOffsets.forEach((debugInfoOffset) => {
        mapItems.push([TYPE_DEBUG_INFO_ITEM, 1, debugInfoOffset]);
      });
      throwsAnnotations.forEach((annotation) => {
        mapItems.push([TYPE_ANNOTATION_ITEM, 1, annotation.offset]);
      });
      classes.forEach((klass) => {
        mapItems.push([TYPE_CLASS_DATA_ITEM, 1, klass.classData.offset]);
      });
      mapItems.push([TYPE_MAP_LIST, 1, mapOffset]);
      mapItems.forEach((item, index) => {
        const [type, size, offset2] = item;
        const itemOffset = mapOffset + 4 + index * kMapItemSize;
        dex.writeUInt16LE(type, itemOffset);
        dex.writeUInt32LE(size, itemOffset + 4);
        dex.writeUInt32LE(offset2, itemOffset + 8);
      });
      const hash = new Checksum("sha1");
      hash.update(dex.slice(signatureOffset + signatureSize));
      Buffer2.from(hash.getDigest()).copy(dex, signatureOffset);
      dex.writeUInt32LE(adler32(dex, signatureOffset), checksumOffset);
      return dex;
    }
  };
  function makeClassData(klass) {
    const { instanceFields, constructorMethods, virtualMethods } = klass.classData;
    const staticFieldsSize = 0;
    return Buffer2.from([
      staticFieldsSize
    ].concat(createUleb128(instanceFields.length)).concat(createUleb128(constructorMethods.length)).concat(createUleb128(virtualMethods.length)).concat(instanceFields.reduce((result, [indexDiff, accessFlags]) => {
      return result.concat(createUleb128(indexDiff)).concat(createUleb128(accessFlags));
    }, [])).concat(constructorMethods.reduce((result, [indexDiff, accessFlags, , codeOffset]) => {
      return result.concat(createUleb128(indexDiff)).concat(createUleb128(accessFlags)).concat(createUleb128(codeOffset || 0));
    }, [])).concat(virtualMethods.reduce((result, [indexDiff, accessFlags]) => {
      const codeOffset = 0;
      return result.concat(createUleb128(indexDiff)).concat(createUleb128(accessFlags)).concat([codeOffset]);
    }, [])));
  }
  function makeThrowsAnnotation(annotation) {
    const { thrownTypes } = annotation;
    return Buffer2.from(
      [
        VISIBILITY_SYSTEM
      ].concat(createUleb128(annotation.type)).concat([1]).concat(createUleb128(annotation.value)).concat([VALUE_ARRAY, thrownTypes.length]).concat(thrownTypes.reduce((result, type) => {
        result.push(VALUE_TYPE, type);
        return result;
      }, []))
    );
  }
  function computeModel(classes) {
    const strings = /* @__PURE__ */ new Set();
    const types = /* @__PURE__ */ new Set();
    const protos = {};
    const fields = [];
    const methods = [];
    const throwsAnnotations = {};
    const javaConstructors = /* @__PURE__ */ new Set();
    const superConstructors = /* @__PURE__ */ new Set();
    classes.forEach((klass) => {
      const { name, superClass, sourceFileName } = klass;
      strings.add("this");
      strings.add(name);
      types.add(name);
      strings.add(superClass);
      types.add(superClass);
      strings.add(sourceFileName);
      klass.interfaces.forEach((iface) => {
        strings.add(iface);
        types.add(iface);
      });
      klass.fields.forEach((field) => {
        const [fieldName, fieldType] = field;
        strings.add(fieldName);
        strings.add(fieldType);
        types.add(fieldType);
        fields.push([klass.name, fieldType, fieldName]);
      });
      if (!klass.methods.some(([methodName]) => methodName === "<init>")) {
        klass.methods.unshift(["<init>", "V", []]);
        javaConstructors.add(name);
      }
      klass.methods.forEach((method) => {
        const [methodName, retType, argTypes, thrownTypes = [], accessFlags] = method;
        strings.add(methodName);
        const protoId = addProto(retType, argTypes);
        let throwsAnnotationId = null;
        if (thrownTypes.length > 0) {
          const typesNormalized = thrownTypes.slice();
          typesNormalized.sort();
          throwsAnnotationId = typesNormalized.join("|");
          let throwsAnnotation = throwsAnnotations[throwsAnnotationId];
          if (throwsAnnotation === void 0) {
            throwsAnnotation = {
              id: throwsAnnotationId,
              types: typesNormalized
            };
            throwsAnnotations[throwsAnnotationId] = throwsAnnotation;
          }
          strings.add(kDalvikAnnotationTypeThrows);
          types.add(kDalvikAnnotationTypeThrows);
          thrownTypes.forEach((type) => {
            strings.add(type);
            types.add(type);
          });
          strings.add("value");
        }
        methods.push([klass.name, protoId, methodName, throwsAnnotationId, accessFlags]);
        if (methodName === "<init>") {
          superConstructors.add(name + "|" + protoId);
          const superConstructorId = superClass + "|" + protoId;
          if (javaConstructors.has(name) && !superConstructors.has(superConstructorId)) {
            methods.push([superClass, protoId, methodName, null, 0]);
            superConstructors.add(superConstructorId);
          }
        }
      });
    });
    function addProto(retType, argTypes) {
      const signature = [retType].concat(argTypes);
      const id = signature.join("|");
      if (protos[id] !== void 0) {
        return id;
      }
      strings.add(retType);
      types.add(retType);
      argTypes.forEach((argType) => {
        strings.add(argType);
        types.add(argType);
      });
      const shorty = signature.map(typeToShorty).join("");
      strings.add(shorty);
      protos[id] = [id, shorty, retType, argTypes];
      return id;
    }
    const stringItems = Array.from(strings);
    stringItems.sort();
    const stringToIndex = stringItems.reduce((result, string, index) => {
      result[string] = index;
      return result;
    }, {});
    const typeItems = Array.from(types).map((name) => stringToIndex[name]);
    typeItems.sort(compareNumbers);
    const typeToIndex = typeItems.reduce((result, stringIndex, typeIndex) => {
      result[stringItems[stringIndex]] = typeIndex;
      return result;
    }, {});
    const literalProtoItems = Object.keys(protos).map((id) => protos[id]);
    literalProtoItems.sort(compareProtoItems);
    const parameters = {};
    const protoItems = literalProtoItems.map((item) => {
      const [, shorty, retType, argTypes] = item;
      let params;
      if (argTypes.length > 0) {
        const argTypesSig = argTypes.join("|");
        params = parameters[argTypesSig];
        if (params === void 0) {
          params = {
            types: argTypes.map((type) => typeToIndex[type]),
            offset: -1
          };
          parameters[argTypesSig] = params;
        }
      } else {
        params = null;
      }
      return [
        stringToIndex[shorty],
        typeToIndex[retType],
        params
      ];
    });
    const protoToIndex = literalProtoItems.reduce((result, item, index) => {
      const [id] = item;
      result[id] = index;
      return result;
    }, {});
    const parameterItems = Object.keys(parameters).map((id) => parameters[id]);
    const fieldItems = fields.map((field) => {
      const [klass, fieldType, fieldName] = field;
      return [
        typeToIndex[klass],
        typeToIndex[fieldType],
        stringToIndex[fieldName]
      ];
    });
    fieldItems.sort(compareFieldItems);
    const methodItems = methods.map((method) => {
      const [klass, protoId, name, annotationsId, accessFlags] = method;
      return [
        typeToIndex[klass],
        protoToIndex[protoId],
        stringToIndex[name],
        annotationsId,
        accessFlags
      ];
    });
    methodItems.sort(compareMethodItems);
    const throwsAnnotationItems = Object.keys(throwsAnnotations).map((id) => throwsAnnotations[id]).map((item) => {
      return {
        id: item.id,
        type: typeToIndex[kDalvikAnnotationTypeThrows],
        value: stringToIndex.value,
        thrownTypes: item.types.map((type) => typeToIndex[type]),
        offset: -1
      };
    });
    const annotationSetItems = throwsAnnotationItems.map((item) => {
      return {
        id: item.id,
        items: [item],
        offset: -1
      };
    });
    const annotationSetIdToIndex = annotationSetItems.reduce((result, item, index) => {
      result[item.id] = index;
      return result;
    }, {});
    const interfaceLists = {};
    const annotationDirectories = [];
    const classItems = classes.map((klass) => {
      const classIndex = typeToIndex[klass.name];
      const accessFlags = kAccPublic2;
      const superClassIndex = typeToIndex[klass.superClass];
      let ifaceList;
      const ifaces = klass.interfaces.map((type) => typeToIndex[type]);
      if (ifaces.length > 0) {
        ifaces.sort(compareNumbers);
        const ifacesId = ifaces.join("|");
        ifaceList = interfaceLists[ifacesId];
        if (ifaceList === void 0) {
          ifaceList = {
            types: ifaces,
            offset: -1
          };
          interfaceLists[ifacesId] = ifaceList;
        }
      } else {
        ifaceList = null;
      }
      const sourceFileIndex = stringToIndex[klass.sourceFileName];
      const classMethods = methodItems.reduce((result, method, index) => {
        const [holder, protoIndex, name, annotationsId, accessFlags2] = method;
        if (holder === classIndex) {
          result.push([index, name, annotationsId, protoIndex, accessFlags2]);
        }
        return result;
      }, []);
      let annotationsDirectory = null;
      const methodAnnotations = classMethods.filter(([, , annotationsId]) => {
        return annotationsId !== null;
      }).map(([index, , annotationsId]) => {
        return [index, annotationSetItems[annotationSetIdToIndex[annotationsId]]];
      });
      if (methodAnnotations.length > 0) {
        annotationsDirectory = {
          methods: methodAnnotations,
          offset: -1
        };
        annotationDirectories.push(annotationsDirectory);
      }
      const instanceFields = fieldItems.reduce((result, field, index) => {
        const [holder] = field;
        if (holder === classIndex) {
          result.push([index > 0 ? 1 : 0, kAccPublic2]);
        }
        return result;
      }, []);
      const constructorNameIndex = stringToIndex["<init>"];
      const constructorMethods = classMethods.filter(([, name]) => name === constructorNameIndex).map(([index, , , protoIndex]) => {
        if (javaConstructors.has(klass.name)) {
          let superConstructor = -1;
          const numMethodItems = methodItems.length;
          for (let i2 = 0; i2 !== numMethodItems; i2++) {
            const [methodClass, methodProto, methodName] = methodItems[i2];
            if (methodClass === superClassIndex && methodName === constructorNameIndex && methodProto === protoIndex) {
              superConstructor = i2;
              break;
            }
          }
          return [index, kAccPublic2 | kAccConstructor, superConstructor];
        } else {
          return [index, kAccPublic2 | kAccConstructor | kAccNative2, -1];
        }
      });
      const virtualMethods = compressClassMethodIndexes(classMethods.filter(([, name]) => name !== constructorNameIndex).map(([index, , , , accessFlags2]) => {
        return [index, accessFlags2 | kAccPublic2 | kAccNative2];
      }));
      const classData = {
        instanceFields,
        constructorMethods,
        virtualMethods,
        offset: -1
      };
      return {
        index: classIndex,
        accessFlags,
        superClassIndex,
        interfaces: ifaceList,
        sourceFileIndex,
        annotationsDirectory,
        classData
      };
    });
    const interfaceItems = Object.keys(interfaceLists).map((id) => interfaceLists[id]);
    return {
      classes: classItems,
      interfaces: interfaceItems,
      fields: fieldItems,
      methods: methodItems,
      protos: protoItems,
      parameters: parameterItems,
      annotationDirectories,
      annotationSets: annotationSetItems,
      throwsAnnotations: throwsAnnotationItems,
      types: typeItems,
      strings: stringItems
    };
  }
  function compressClassMethodIndexes(items) {
    let previousIndex = 0;
    return items.map(([index, accessFlags], elementIndex) => {
      let result;
      if (elementIndex === 0) {
        result = [index, accessFlags];
      } else {
        result = [index - previousIndex, accessFlags];
      }
      previousIndex = index;
      return result;
    });
  }
  function compareNumbers(a2, b2) {
    return a2 - b2;
  }
  function compareProtoItems(a2, b2) {
    const [, , aRetType, aArgTypes] = a2;
    const [, , bRetType, bArgTypes] = b2;
    if (aRetType < bRetType) {
      return -1;
    }
    if (aRetType > bRetType) {
      return 1;
    }
    const aArgTypesSig = aArgTypes.join("|");
    const bArgTypesSig = bArgTypes.join("|");
    if (aArgTypesSig < bArgTypesSig) {
      return -1;
    }
    if (aArgTypesSig > bArgTypesSig) {
      return 1;
    }
    return 0;
  }
  function compareFieldItems(a2, b2) {
    const [aClass, aType, aName] = a2;
    const [bClass, bType, bName] = b2;
    if (aClass !== bClass) {
      return aClass - bClass;
    }
    if (aName !== bName) {
      return aName - bName;
    }
    return aType - bType;
  }
  function compareMethodItems(a2, b2) {
    const [aClass, aProto, aName] = a2;
    const [bClass, bProto, bName] = b2;
    if (aClass !== bClass) {
      return aClass - bClass;
    }
    if (aName !== bName) {
      return aName - bName;
    }
    return aProto - bProto;
  }
  function typeToShorty(type) {
    const firstCharacter = type[0];
    return firstCharacter === "L" || firstCharacter === "[" ? "L" : type;
  }
  function createUleb128(value) {
    if (value <= 127) {
      return [value];
    }
    const result = [];
    let moreSlicesNeeded = false;
    do {
      let slice2 = value & 127;
      value >>= 7;
      moreSlicesNeeded = value !== 0;
      if (moreSlicesNeeded) {
        slice2 |= 128;
      }
      result.push(slice2);
    } while (moreSlicesNeeded);
    return result;
  }
  function align(value, alignment) {
    const alignmentDelta = value % alignment;
    if (alignmentDelta === 0) {
      return value;
    }
    return value + alignment - alignmentDelta;
  }
  function adler32(buffer, offset) {
    let a2 = 1;
    let b2 = 0;
    const length = buffer.length;
    for (let i2 = offset; i2 < length; i2++) {
      a2 = (a2 + buffer[i2]) % 65521;
      b2 = (b2 + a2) % 65521;
    }
    return (b2 << 16 | a2) >>> 0;
  }
  var mkdex_default = mkdex;

  // node_modules/frida-java-bridge/lib/types.js
  var JNILocalRefType = 1;
  var vm = null;
  var primitiveArrayHandler = null;
  function initialize(_vm) {
    vm = _vm;
  }
  function getType(typeName, unbox, factory) {
    let type = getPrimitiveType(typeName);
    if (type === null) {
      if (typeName.indexOf("[") === 0) {
        type = getArrayType(typeName, unbox, factory);
      } else {
        if (typeName[0] === "L" && typeName[typeName.length - 1] === ";") {
          typeName = typeName.substring(1, typeName.length - 1);
        }
        type = getObjectType(typeName, unbox, factory);
      }
    }
    return Object.assign({ className: typeName }, type);
  }
  var primitiveTypes = {
    boolean: {
      name: "Z",
      type: "uint8",
      size: 1,
      byteSize: 1,
      defaultValue: false,
      isCompatible(v2) {
        return typeof v2 === "boolean";
      },
      fromJni(v2) {
        return !!v2;
      },
      toJni(v2) {
        return v2 ? 1 : 0;
      },
      read(address) {
        return address.readU8();
      },
      write(address, value) {
        address.writeU8(value);
      },
      toString() {
        return this.name;
      }
    },
    byte: {
      name: "B",
      type: "int8",
      size: 1,
      byteSize: 1,
      defaultValue: 0,
      isCompatible(v2) {
        return Number.isInteger(v2) && v2 >= -128 && v2 <= 127;
      },
      fromJni: identity,
      toJni: identity,
      read(address) {
        return address.readS8();
      },
      write(address, value) {
        address.writeS8(value);
      },
      toString() {
        return this.name;
      }
    },
    char: {
      name: "C",
      type: "uint16",
      size: 1,
      byteSize: 2,
      defaultValue: 0,
      isCompatible(v2) {
        if (typeof v2 !== "string" || v2.length !== 1) {
          return false;
        }
        const code2 = v2.charCodeAt(0);
        return code2 >= 0 && code2 <= 65535;
      },
      fromJni(c2) {
        return String.fromCharCode(c2);
      },
      toJni(s2) {
        return s2.charCodeAt(0);
      },
      read(address) {
        return address.readU16();
      },
      write(address, value) {
        address.writeU16(value);
      },
      toString() {
        return this.name;
      }
    },
    short: {
      name: "S",
      type: "int16",
      size: 1,
      byteSize: 2,
      defaultValue: 0,
      isCompatible(v2) {
        return Number.isInteger(v2) && v2 >= -32768 && v2 <= 32767;
      },
      fromJni: identity,
      toJni: identity,
      read(address) {
        return address.readS16();
      },
      write(address, value) {
        address.writeS16(value);
      },
      toString() {
        return this.name;
      }
    },
    int: {
      name: "I",
      type: "int32",
      size: 1,
      byteSize: 4,
      defaultValue: 0,
      isCompatible(v2) {
        return Number.isInteger(v2) && v2 >= -2147483648 && v2 <= 2147483647;
      },
      fromJni: identity,
      toJni: identity,
      read(address) {
        return address.readS32();
      },
      write(address, value) {
        address.writeS32(value);
      },
      toString() {
        return this.name;
      }
    },
    long: {
      name: "J",
      type: "int64",
      size: 2,
      byteSize: 8,
      defaultValue: 0,
      isCompatible(v2) {
        return typeof v2 === "number" || v2 instanceof Int64;
      },
      fromJni: identity,
      toJni: identity,
      read(address) {
        return address.readS64();
      },
      write(address, value) {
        address.writeS64(value);
      },
      toString() {
        return this.name;
      }
    },
    float: {
      name: "F",
      type: "float",
      size: 1,
      byteSize: 4,
      defaultValue: 0,
      isCompatible(v2) {
        return typeof v2 === "number";
      },
      fromJni: identity,
      toJni: identity,
      read(address) {
        return address.readFloat();
      },
      write(address, value) {
        address.writeFloat(value);
      },
      toString() {
        return this.name;
      }
    },
    double: {
      name: "D",
      type: "double",
      size: 2,
      byteSize: 8,
      defaultValue: 0,
      isCompatible(v2) {
        return typeof v2 === "number";
      },
      fromJni: identity,
      toJni: identity,
      read(address) {
        return address.readDouble();
      },
      write(address, value) {
        address.writeDouble(value);
      },
      toString() {
        return this.name;
      }
    },
    void: {
      name: "V",
      type: "void",
      size: 0,
      byteSize: 0,
      defaultValue: void 0,
      isCompatible(v2) {
        return v2 === void 0;
      },
      fromJni() {
        return void 0;
      },
      toJni() {
        return NULL;
      },
      toString() {
        return this.name;
      }
    }
  };
  var primitiveTypesNames = new Set(Object.values(primitiveTypes).map((t2) => t2.name));
  function getPrimitiveType(name) {
    const result = primitiveTypes[name];
    return result !== void 0 ? result : null;
  }
  function getObjectType(typeName, unbox, factory) {
    const cache = factory._types[unbox ? 1 : 0];
    let type = cache[typeName];
    if (type !== void 0) {
      return type;
    }
    if (typeName === "java.lang.Object") {
      type = getJavaLangObjectType(factory);
    } else {
      type = getAnyObjectType(typeName, unbox, factory);
    }
    cache[typeName] = type;
    return type;
  }
  function getJavaLangObjectType(factory) {
    return {
      name: "Ljava/lang/Object;",
      type: "pointer",
      size: 1,
      defaultValue: NULL,
      isCompatible(v2) {
        if (v2 === null) {
          return true;
        }
        if (v2 === void 0) {
          return false;
        }
        const isWrapper = v2.$h instanceof NativePointer;
        if (isWrapper) {
          return true;
        }
        return typeof v2 === "string";
      },
      fromJni(h2, env, owned) {
        if (h2.isNull()) {
          return null;
        }
        return factory.cast(h2, factory.use("java.lang.Object"), owned);
      },
      toJni(o2, env) {
        if (o2 === null) {
          return NULL;
        }
        if (typeof o2 === "string") {
          return env.newStringUtf(o2);
        }
        return o2.$h;
      }
    };
  }
  function getAnyObjectType(typeName, unbox, factory) {
    let cachedClass = null;
    let cachedIsInstance = null;
    let cachedIsDefaultString = null;
    function getClass() {
      if (cachedClass === null) {
        cachedClass = factory.use(typeName).class;
      }
      return cachedClass;
    }
    function isInstance(v2) {
      const klass = getClass();
      if (cachedIsInstance === null) {
        cachedIsInstance = klass.isInstance.overload("java.lang.Object");
      }
      return cachedIsInstance.call(klass, v2);
    }
    function typeIsDefaultString() {
      if (cachedIsDefaultString === null) {
        const x2 = getClass();
        cachedIsDefaultString = factory.use("java.lang.String").class.isAssignableFrom(x2);
      }
      return cachedIsDefaultString;
    }
    return {
      name: makeJniObjectTypeName(typeName),
      type: "pointer",
      size: 1,
      defaultValue: NULL,
      isCompatible(v2) {
        if (v2 === null) {
          return true;
        }
        if (v2 === void 0) {
          return false;
        }
        const isWrapper = v2.$h instanceof NativePointer;
        if (isWrapper) {
          return isInstance(v2);
        }
        return typeof v2 === "string" && typeIsDefaultString();
      },
      fromJni(h2, env, owned) {
        if (h2.isNull()) {
          return null;
        }
        if (typeIsDefaultString() && unbox) {
          return env.stringFromJni(h2);
        }
        return factory.cast(h2, factory.use(typeName), owned);
      },
      toJni(o2, env) {
        if (o2 === null) {
          return NULL;
        }
        if (typeof o2 === "string") {
          return env.newStringUtf(o2);
        }
        return o2.$h;
      },
      toString() {
        return this.name;
      }
    };
  }
  var primitiveArrayTypes = [
    ["Z", "boolean"],
    ["B", "byte"],
    ["C", "char"],
    ["D", "double"],
    ["F", "float"],
    ["I", "int"],
    ["J", "long"],
    ["S", "short"]
  ].reduce((result, [shorty, name]) => {
    result["[" + shorty] = makePrimitiveArrayType("[" + shorty, name);
    return result;
  }, {});
  function makePrimitiveArrayType(shorty, name) {
    const envProto = Env.prototype;
    const nameTitled = toTitleCase(name);
    const spec = {
      typeName: name,
      newArray: envProto["new" + nameTitled + "Array"],
      setRegion: envProto["set" + nameTitled + "ArrayRegion"],
      getElements: envProto["get" + nameTitled + "ArrayElements"],
      releaseElements: envProto["release" + nameTitled + "ArrayElements"]
    };
    return {
      name: shorty,
      type: "pointer",
      size: 1,
      defaultValue: NULL,
      isCompatible(v2) {
        return isCompatiblePrimitiveArray(v2, name);
      },
      fromJni(h2, env, owned) {
        return fromJniPrimitiveArray(h2, spec, env, owned);
      },
      toJni(arr, env) {
        return toJniPrimitiveArray(arr, spec, env);
      }
    };
  }
  function getArrayType(typeName, unbox, factory) {
    const primitiveType = primitiveArrayTypes[typeName];
    if (primitiveType !== void 0) {
      return primitiveType;
    }
    if (typeName.indexOf("[") !== 0) {
      throw new Error("Unsupported type: " + typeName);
    }
    let elementTypeName = typeName.substring(1);
    const elementType = getType(elementTypeName, unbox, factory);
    let numInternalArrays = 0;
    const end = elementTypeName.length;
    while (numInternalArrays !== end && elementTypeName[numInternalArrays] === "[") {
      numInternalArrays++;
    }
    elementTypeName = elementTypeName.substring(numInternalArrays);
    if (elementTypeName[0] === "L" && elementTypeName[elementTypeName.length - 1] === ";") {
      elementTypeName = elementTypeName.substring(1, elementTypeName.length - 1);
    }
    let internalElementTypeName = elementTypeName.replace(/\./g, "/");
    if (primitiveTypesNames.has(internalElementTypeName)) {
      internalElementTypeName = "[".repeat(numInternalArrays) + internalElementTypeName;
    } else {
      internalElementTypeName = "[".repeat(numInternalArrays) + "L" + internalElementTypeName + ";";
    }
    const internalTypeName = "[" + internalElementTypeName;
    elementTypeName = "[".repeat(numInternalArrays) + elementTypeName;
    return {
      name: typeName.replace(/\./g, "/"),
      type: "pointer",
      size: 1,
      defaultValue: NULL,
      isCompatible(v2) {
        if (v2 === null) {
          return true;
        }
        if (typeof v2 !== "object" || v2.length === void 0) {
          return false;
        }
        return v2.every(function(element) {
          return elementType.isCompatible(element);
        });
      },
      fromJni(arr, env, owned) {
        if (arr.isNull()) {
          return null;
        }
        const result = [];
        const n2 = env.getArrayLength(arr);
        for (let i2 = 0; i2 !== n2; i2++) {
          const element = env.getObjectArrayElement(arr, i2);
          try {
            result.push(elementType.fromJni(element, env));
          } finally {
            env.deleteLocalRef(element);
          }
        }
        try {
          result.$w = factory.cast(arr, factory.use(internalTypeName), owned);
        } catch (e2) {
          factory.use("java.lang.reflect.Array").newInstance(factory.use(elementTypeName).class, 0);
          result.$w = factory.cast(arr, factory.use(internalTypeName), owned);
        }
        result.$dispose = disposeObjectArray;
        return result;
      },
      toJni(elements, env) {
        if (elements === null) {
          return NULL;
        }
        if (!(elements instanceof Array)) {
          throw new Error("Expected an array");
        }
        const wrapper = elements.$w;
        if (wrapper !== void 0) {
          return wrapper.$h;
        }
        const n2 = elements.length;
        const klassObj = factory.use(elementTypeName);
        const classHandle = klassObj.$borrowClassHandle(env);
        try {
          const result = env.newObjectArray(n2, classHandle.value, NULL);
          env.throwIfExceptionPending();
          for (let i2 = 0; i2 !== n2; i2++) {
            const handle = elementType.toJni(elements[i2], env);
            try {
              env.setObjectArrayElement(result, i2, handle);
            } finally {
              if (elementType.type === "pointer" && env.getObjectRefType(handle) === JNILocalRefType) {
                env.deleteLocalRef(handle);
              }
            }
            env.throwIfExceptionPending();
          }
          return result;
        } finally {
          classHandle.unref(env);
        }
      }
    };
  }
  function disposeObjectArray() {
    const n2 = this.length;
    for (let i2 = 0; i2 !== n2; i2++) {
      const obj = this[i2];
      if (obj === null) {
        continue;
      }
      const dispose = obj.$dispose;
      if (dispose === void 0) {
        break;
      }
      dispose.call(obj);
    }
    this.$w.$dispose();
  }
  function fromJniPrimitiveArray(arr, spec, env, owned) {
    if (arr.isNull()) {
      return null;
    }
    const type = getPrimitiveType(spec.typeName);
    const length = env.getArrayLength(arr);
    return new PrimitiveArray(arr, spec, type, length, env, owned);
  }
  function toJniPrimitiveArray(arr, spec, env) {
    if (arr === null) {
      return NULL;
    }
    const handle = arr.$h;
    if (handle !== void 0) {
      return handle;
    }
    const length = arr.length;
    const type = getPrimitiveType(spec.typeName);
    const result = spec.newArray.call(env, length);
    if (result.isNull()) {
      throw new Error("Unable to construct array");
    }
    if (length > 0) {
      const elementSize = type.byteSize;
      const writeElement = type.write;
      const unparseElementValue = type.toJni;
      const elements = Memory.alloc(length * type.byteSize);
      for (let index = 0; index !== length; index++) {
        writeElement(elements.add(index * elementSize), unparseElementValue(arr[index]));
      }
      spec.setRegion.call(env, result, 0, length, elements);
      env.throwIfExceptionPending();
    }
    return result;
  }
  function isCompatiblePrimitiveArray(value, typeName) {
    if (value === null) {
      return true;
    }
    if (value instanceof PrimitiveArray) {
      return value.$s.typeName === typeName;
    }
    const isArrayLike = typeof value === "object" && value.length !== void 0;
    if (!isArrayLike) {
      return false;
    }
    const elementType = getPrimitiveType(typeName);
    return Array.prototype.every.call(value, (element) => elementType.isCompatible(element));
  }
  function PrimitiveArray(handle, spec, type, length, env, owned = true) {
    if (owned) {
      const h2 = env.newGlobalRef(handle);
      this.$h = h2;
      this.$r = Script.bindWeak(this, env.vm.makeHandleDestructor(h2));
    } else {
      this.$h = handle;
      this.$r = null;
    }
    this.$s = spec;
    this.$t = type;
    this.length = length;
    return new Proxy(this, primitiveArrayHandler);
  }
  primitiveArrayHandler = {
    has(target, property) {
      if (property in target) {
        return true;
      }
      return target.tryParseIndex(property) !== null;
    },
    get(target, property, receiver) {
      const index = target.tryParseIndex(property);
      if (index === null) {
        return target[property];
      }
      return target.readElement(index);
    },
    set(target, property, value, receiver) {
      const index = target.tryParseIndex(property);
      if (index === null) {
        target[property] = value;
        return true;
      }
      target.writeElement(index, value);
      return true;
    },
    ownKeys(target) {
      const keys = [];
      const { length } = target;
      for (let i2 = 0; i2 !== length; i2++) {
        const key = i2.toString();
        keys.push(key);
      }
      keys.push("length");
      return keys;
    },
    getOwnPropertyDescriptor(target, property) {
      const index = target.tryParseIndex(property);
      if (index !== null) {
        return {
          writable: true,
          configurable: true,
          enumerable: true
        };
      }
      return Object.getOwnPropertyDescriptor(target, property);
    }
  };
  Object.defineProperties(PrimitiveArray.prototype, {
    $dispose: {
      enumerable: true,
      value() {
        const ref = this.$r;
        if (ref !== null) {
          this.$r = null;
          Script.unbindWeak(ref);
        }
      }
    },
    $clone: {
      value(env) {
        return new PrimitiveArray(this.$h, this.$s, this.$t, this.length, env);
      }
    },
    tryParseIndex: {
      value(rawIndex) {
        if (typeof rawIndex === "symbol") {
          return null;
        }
        const index = parseInt(rawIndex);
        if (isNaN(index) || index < 0 || index >= this.length) {
          return null;
        }
        return index;
      }
    },
    readElement: {
      value(index) {
        return this.withElements((elements) => {
          const type = this.$t;
          return type.fromJni(type.read(elements.add(index * type.byteSize)));
        });
      }
    },
    writeElement: {
      value(index, value) {
        const { $h: handle, $s: spec, $t: type } = this;
        const env = vm.getEnv();
        const element = Memory.alloc(type.byteSize);
        type.write(element, type.toJni(value));
        spec.setRegion.call(env, handle, index, 1, element);
      }
    },
    withElements: {
      value(perform) {
        const { $h: handle, $s: spec } = this;
        const env = vm.getEnv();
        const elements = spec.getElements.call(env, handle);
        if (elements.isNull()) {
          throw new Error("Unable to get array elements");
        }
        try {
          return perform(elements);
        } finally {
          spec.releaseElements.call(env, handle, elements);
        }
      }
    },
    toJSON: {
      value() {
        const { length, $t: type } = this;
        const { byteSize: elementSize, fromJni, read: read2 } = type;
        return this.withElements((elements) => {
          const values = [];
          for (let i2 = 0; i2 !== length; i2++) {
            const value = fromJni(read2(elements.add(i2 * elementSize)));
            values.push(value);
          }
          return values;
        });
      }
    },
    toString: {
      value() {
        return this.toJSON().toString();
      }
    }
  });
  function makeJniObjectTypeName(typeName) {
    return "L" + typeName.replace(/\./g, "/") + ";";
  }
  function toTitleCase(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
  function identity(value) {
    return value;
  }

  // node_modules/frida-java-bridge/lib/class-factory.js
  var jsizeSize3 = 4;
  var {
    ensureClassInitialized: ensureClassInitialized3,
    makeMethodMangler: makeMethodMangler3
  } = android_exports;
  var kAccStatic2 = 8;
  var CONSTRUCTOR_METHOD = 1;
  var STATIC_METHOD = 2;
  var INSTANCE_METHOD = 3;
  var STATIC_FIELD = 1;
  var INSTANCE_FIELD = 2;
  var STRATEGY_VIRTUAL = 1;
  var STRATEGY_DIRECT = 2;
  var PENDING_USE = /* @__PURE__ */ Symbol("PENDING_USE");
  var DEFAULT_CACHE_DIR = "/data/local/tmp";
  var {
    getCurrentThreadId,
    pointerSize: pointerSize7
  } = Process;
  var factoryCache = {
    state: "empty",
    factories: [],
    loaders: null,
    Integer: null
  };
  var vm2 = null;
  var api = null;
  var isArtVm = null;
  var wrapperHandler = null;
  var dispatcherPrototype = null;
  var methodPrototype = null;
  var valueOfPrototype = null;
  var cachedLoaderInvoke = null;
  var cachedLoaderMethod = null;
  var ignoredThreads = /* @__PURE__ */ new Map();
  var ClassFactory = class _ClassFactory {
    static _initialize(_vm, _api) {
      vm2 = _vm;
      api = _api;
      isArtVm = _api.flavor === "art";
      if (_api.flavor === "jvm") {
        ensureClassInitialized3 = ensureClassInitialized2;
        makeMethodMangler3 = makeMethodMangler2;
      }
    }
    static _disposeAll(env) {
      factoryCache.factories.forEach((factory) => {
        factory._dispose(env);
      });
    }
    static get(classLoader) {
      const cache = getFactoryCache();
      const defaultFactory = cache.factories[0];
      if (classLoader === null) {
        return defaultFactory;
      }
      const indexObj = cache.loaders.get(classLoader);
      if (indexObj !== null) {
        const index = defaultFactory.cast(indexObj, cache.Integer);
        return cache.factories[index.intValue()];
      }
      const factory = new _ClassFactory();
      factory.loader = classLoader;
      factory.cacheDir = defaultFactory.cacheDir;
      addFactoryToCache(factory, classLoader);
      return factory;
    }
    constructor() {
      this.cacheDir = DEFAULT_CACHE_DIR;
      this.codeCacheDir = DEFAULT_CACHE_DIR + "/dalvik-cache";
      this.tempFileNaming = {
        prefix: "frida",
        suffix: ""
      };
      this._classes = {};
      this._classHandles = new LRU(10, releaseClassHandle);
      this._patchedMethods = /* @__PURE__ */ new Set();
      this._loader = null;
      this._types = [{}, {}];
      factoryCache.factories.push(this);
    }
    _dispose(env) {
      Array.from(this._patchedMethods).forEach((method) => {
        method.implementation = null;
      });
      this._patchedMethods.clear();
      revertGlobalPatches();
      this._classHandles.dispose(env);
      this._classes = {};
    }
    get loader() {
      return this._loader;
    }
    set loader(value) {
      const isInitial = this._loader === null && value !== null;
      this._loader = value;
      if (isInitial && factoryCache.state === "ready" && this === factoryCache.factories[0]) {
        addFactoryToCache(this, value);
      }
    }
    use(className, options = {}) {
      const allowCached = options.cache !== "skip";
      let C2 = allowCached ? this._getUsedClass(className) : void 0;
      if (C2 === void 0) {
        try {
          const env = vm2.getEnv();
          const { _loader: loader } = this;
          const getClassHandle = loader !== null ? makeLoaderClassHandleGetter(className, loader, env) : makeBasicClassHandleGetter(className);
          C2 = this._make(className, getClassHandle, env);
        } finally {
          if (allowCached) {
            this._setUsedClass(className, C2);
          }
        }
      }
      return C2;
    }
    _getUsedClass(className) {
      let c2;
      while ((c2 = this._classes[className]) === PENDING_USE) {
        Thread.sleep(0.05);
      }
      if (c2 === void 0) {
        this._classes[className] = PENDING_USE;
      }
      return c2;
    }
    _setUsedClass(className, c2) {
      if (c2 !== void 0) {
        this._classes[className] = c2;
      } else {
        delete this._classes[className];
      }
    }
    _make(name, getClassHandle, env) {
      const C2 = makeClassWrapperConstructor();
      const proto = Object.create(Wrapper.prototype, {
        [/* @__PURE__ */ Symbol.for("n")]: {
          value: name
        },
        $n: {
          get() {
            return this[/* @__PURE__ */ Symbol.for("n")];
          }
        },
        [/* @__PURE__ */ Symbol.for("C")]: {
          value: C2
        },
        $C: {
          get() {
            return this[/* @__PURE__ */ Symbol.for("C")];
          }
        },
        [/* @__PURE__ */ Symbol.for("w")]: {
          value: null,
          writable: true
        },
        $w: {
          get() {
            return this[/* @__PURE__ */ Symbol.for("w")];
          },
          set(val) {
            this[/* @__PURE__ */ Symbol.for("w")] = val;
          }
        },
        [/* @__PURE__ */ Symbol.for("_s")]: {
          writable: true
        },
        $_s: {
          get() {
            return this[/* @__PURE__ */ Symbol.for("_s")];
          },
          set(val) {
            this[/* @__PURE__ */ Symbol.for("_s")] = val;
          }
        },
        [/* @__PURE__ */ Symbol.for("c")]: {
          value: [null]
        },
        $c: {
          get() {
            return this[/* @__PURE__ */ Symbol.for("c")];
          }
        },
        [/* @__PURE__ */ Symbol.for("m")]: {
          value: /* @__PURE__ */ new Map()
        },
        $m: {
          get() {
            return this[/* @__PURE__ */ Symbol.for("m")];
          }
        },
        [/* @__PURE__ */ Symbol.for("l")]: {
          value: null,
          writable: true
        },
        $l: {
          get() {
            return this[/* @__PURE__ */ Symbol.for("l")];
          },
          set(val) {
            this[/* @__PURE__ */ Symbol.for("l")] = val;
          }
        },
        [/* @__PURE__ */ Symbol.for("gch")]: {
          value: getClassHandle
        },
        $gch: {
          get() {
            return this[/* @__PURE__ */ Symbol.for("gch")];
          }
        },
        [/* @__PURE__ */ Symbol.for("f")]: {
          value: this
        },
        $f: {
          get() {
            return this[/* @__PURE__ */ Symbol.for("f")];
          }
        }
      });
      C2.prototype = proto;
      const classWrapper = new C2(null);
      proto[/* @__PURE__ */ Symbol.for("w")] = classWrapper;
      proto.$w = classWrapper;
      const h2 = classWrapper.$borrowClassHandle(env);
      try {
        const classHandle = h2.value;
        ensureClassInitialized3(env, classHandle);
        proto.$l = Model.build(classHandle, env);
      } finally {
        h2.unref(env);
      }
      return classWrapper;
    }
    retain(obj) {
      const env = vm2.getEnv();
      return obj.$clone(env);
    }
    cast(obj, klass, owned) {
      const env = vm2.getEnv();
      let handle = obj.$h;
      if (handle === void 0) {
        handle = obj;
      }
      const h2 = klass.$borrowClassHandle(env);
      try {
        const isValidCast = env.isInstanceOf(handle, h2.value);
        if (!isValidCast) {
          throw new Error(`Cast from '${env.getObjectClassName(handle)}' to '${klass.$n}' isn't possible`);
        }
      } finally {
        h2.unref(env);
      }
      const C2 = klass.$C;
      return new C2(handle, STRATEGY_VIRTUAL, env, owned);
    }
    wrap(handle, klass, env) {
      const C2 = klass.$C;
      const wrapper = new C2(handle, STRATEGY_VIRTUAL, env, false);
      wrapper.$r = Script.bindWeak(wrapper, vm2.makeHandleDestructor(handle));
      return wrapper;
    }
    array(type, elements) {
      const env = vm2.getEnv();
      const primitiveType = getPrimitiveType(type);
      if (primitiveType !== null) {
        type = primitiveType.name;
      }
      const arrayType = getArrayType("[" + type, false, this);
      const rawArray = arrayType.toJni(elements, env);
      return arrayType.fromJni(rawArray, env, true);
    }
    registerClass(spec) {
      const env = vm2.getEnv();
      const tempHandles = [];
      try {
        const Class = this.use("java.lang.Class");
        const Method = env.javaLangReflectMethod();
        const invokeObjectMethodNoArgs = env.vaMethod("pointer", []);
        const className = spec.name;
        const interfaces = spec.implements || [];
        const superClass = spec.superClass || this.use("java.lang.Object");
        const dexFields = [];
        const dexMethods = [];
        const dexSpec = {
          name: makeJniObjectTypeName(className),
          sourceFileName: makeSourceFileName(className),
          superClass: makeJniObjectTypeName(superClass.$n),
          interfaces: interfaces.map((iface) => makeJniObjectTypeName(iface.$n)),
          fields: dexFields,
          methods: dexMethods
        };
        const allInterfaces = interfaces.slice();
        interfaces.forEach((iface) => {
          Array.prototype.slice.call(iface.class.getInterfaces()).forEach((baseIface) => {
            const baseIfaceName = this.cast(baseIface, Class).getCanonicalName();
            allInterfaces.push(this.use(baseIfaceName));
          });
        });
        const fields = spec.fields || {};
        Object.getOwnPropertyNames(fields).forEach((name) => {
          const fieldType = this._getType(fields[name]);
          dexFields.push([name, fieldType.name]);
        });
        const baseMethods = {};
        const pendingOverloads = {};
        allInterfaces.forEach((iface) => {
          const h2 = iface.$borrowClassHandle(env);
          tempHandles.push(h2);
          const ifaceHandle = h2.value;
          iface.$ownMembers.filter((name) => {
            return iface[name].overloads !== void 0;
          }).forEach((name) => {
            const method = iface[name];
            const overloads = method.overloads;
            const overloadIds = overloads.map((overload) => makeOverloadId(name, overload.returnType, overload.argumentTypes));
            baseMethods[name] = [method, overloadIds, ifaceHandle];
            overloads.forEach((overload, index) => {
              const id = overloadIds[index];
              pendingOverloads[id] = [overload, ifaceHandle];
            });
          });
        });
        const methods = spec.methods || {};
        const methodNames = Object.keys(methods);
        const methodEntries = methodNames.reduce((result, name) => {
          const entry = methods[name];
          const rawName = name === "$init" ? "<init>" : name;
          if (entry instanceof Array) {
            result.push(...entry.map((e2) => [rawName, e2]));
          } else {
            result.push([rawName, entry]);
          }
          return result;
        }, []);
        const implMethods = [];
        methodEntries.forEach(([name, methodValue]) => {
          let type = INSTANCE_METHOD;
          let returnType;
          let argumentTypes;
          let thrownTypeNames = [];
          let impl;
          if (typeof methodValue === "function") {
            const m2 = baseMethods[name];
            if (m2 !== void 0 && Array.isArray(m2)) {
              const [baseMethod, overloadIds, parentTypeHandle] = m2;
              if (overloadIds.length > 1) {
                throw new Error(`More than one overload matching '${name}': signature must be specified`);
              }
              delete pendingOverloads[overloadIds[0]];
              const overload = baseMethod.overloads[0];
              type = overload.type;
              returnType = overload.returnType;
              argumentTypes = overload.argumentTypes;
              impl = methodValue;
              const reflectedMethod = env.toReflectedMethod(parentTypeHandle, overload.handle, 0);
              const thrownTypes = invokeObjectMethodNoArgs(env.handle, reflectedMethod, Method.getGenericExceptionTypes);
              thrownTypeNames = readTypeNames(env, thrownTypes).map(makeJniObjectTypeName);
              env.deleteLocalRef(thrownTypes);
              env.deleteLocalRef(reflectedMethod);
            } else {
              returnType = this._getType("void");
              argumentTypes = [];
              impl = methodValue;
            }
          } else {
            if (methodValue.isStatic) {
              type = STATIC_METHOD;
            }
            returnType = this._getType(methodValue.returnType || "void");
            argumentTypes = (methodValue.argumentTypes || []).map((name2) => this._getType(name2));
            impl = methodValue.implementation;
            if (typeof impl !== "function") {
              throw new Error("Expected a function implementation for method: " + name);
            }
            const id = makeOverloadId(name, returnType, argumentTypes);
            const pendingOverload = pendingOverloads[id];
            if (pendingOverload !== void 0) {
              const [overload, parentTypeHandle] = pendingOverload;
              delete pendingOverloads[id];
              type = overload.type;
              returnType = overload.returnType;
              argumentTypes = overload.argumentTypes;
              const reflectedMethod = env.toReflectedMethod(parentTypeHandle, overload.handle, 0);
              const thrownTypes = invokeObjectMethodNoArgs(env.handle, reflectedMethod, Method.getGenericExceptionTypes);
              thrownTypeNames = readTypeNames(env, thrownTypes).map(makeJniObjectTypeName);
              env.deleteLocalRef(thrownTypes);
              env.deleteLocalRef(reflectedMethod);
            }
          }
          const returnTypeName = returnType.name;
          const argumentTypeNames = argumentTypes.map((t2) => t2.name);
          const signature = "(" + argumentTypeNames.join("") + ")" + returnTypeName;
          dexMethods.push([name, returnTypeName, argumentTypeNames, thrownTypeNames, type === STATIC_METHOD ? kAccStatic2 : 0]);
          implMethods.push([name, signature, type, returnType, argumentTypes, impl]);
        });
        const unimplementedMethodIds = Object.keys(pendingOverloads);
        if (unimplementedMethodIds.length > 0) {
          throw new Error("Missing implementation for: " + unimplementedMethodIds.join(", "));
        }
        const dex = DexFile.fromBuffer(mkdex_default(dexSpec), this);
        try {
          dex.load();
        } finally {
          dex.file.delete();
        }
        const classWrapper = this.use(spec.name);
        const numMethods = methodEntries.length;
        if (numMethods > 0) {
          const methodElementSize = 3 * pointerSize7;
          const methodElements = Memory.alloc(numMethods * methodElementSize);
          const nativeMethods = [];
          const temporaryHandles = [];
          implMethods.forEach(([name, signature, type, returnType, argumentTypes, impl], index) => {
            const rawName = Memory.allocUtf8String(name);
            const rawSignature = Memory.allocUtf8String(signature);
            const rawImpl = implement(name, classWrapper, type, returnType, argumentTypes, impl);
            methodElements.add(index * methodElementSize).writePointer(rawName);
            methodElements.add(index * methodElementSize + pointerSize7).writePointer(rawSignature);
            methodElements.add(index * methodElementSize + 2 * pointerSize7).writePointer(rawImpl);
            temporaryHandles.push(rawName, rawSignature);
            nativeMethods.push(rawImpl);
          });
          const h2 = classWrapper.$borrowClassHandle(env);
          tempHandles.push(h2);
          const classHandle = h2.value;
          env.registerNatives(classHandle, methodElements, numMethods);
          env.throwIfExceptionPending();
          classWrapper.$nativeMethods = nativeMethods;
        }
        return classWrapper;
      } finally {
        tempHandles.forEach((h2) => {
          h2.unref(env);
        });
      }
    }
    choose(specifier, callbacks) {
      const env = vm2.getEnv();
      const { flavor } = api;
      if (flavor === "jvm") {
        this._chooseObjectsJvm(specifier, env, callbacks);
      } else if (flavor === "art") {
        const legacyApiMissing = api["art::gc::Heap::VisitObjects"] === void 0;
        if (legacyApiMissing) {
          const preA12ApiMissing = api["art::gc::Heap::GetInstances"] === void 0;
          if (preA12ApiMissing) {
            return this._chooseObjectsJvm(specifier, env, callbacks);
          }
        }
        withRunnableArtThread(vm2, env, (thread) => {
          if (legacyApiMissing) {
            this._chooseObjectsArtPreA12(specifier, env, thread, callbacks);
          } else {
            this._chooseObjectsArtLegacy(specifier, env, thread, callbacks);
          }
        });
      } else {
        this._chooseObjectsDalvik(specifier, env, callbacks);
      }
    }
    _chooseObjectsJvm(className, env, callbacks) {
      const classWrapper = this.use(className);
      const { jvmti } = api;
      const JVMTI_ITERATION_CONTINUE = 1;
      const JVMTI_HEAP_OBJECT_EITHER = 3;
      const h2 = classWrapper.$borrowClassHandle(env);
      const tag = int64(h2.value.toString());
      try {
        const heapObjectCallback = new NativeCallback((classTag, size, tagPtr2, userData) => {
          tagPtr2.writeS64(tag);
          return JVMTI_ITERATION_CONTINUE;
        }, "int", ["int64", "int64", "pointer", "pointer"]);
        jvmti.iterateOverInstancesOfClass(h2.value, JVMTI_HEAP_OBJECT_EITHER, heapObjectCallback, h2.value);
        const tagPtr = Memory.alloc(8);
        tagPtr.writeS64(tag);
        const countPtr = Memory.alloc(jsizeSize3);
        const objectsPtr = Memory.alloc(pointerSize7);
        jvmti.getObjectsWithTags(1, tagPtr, countPtr, objectsPtr, NULL);
        const count = countPtr.readS32();
        const objects = objectsPtr.readPointer();
        const handles = [];
        for (let i2 = 0; i2 !== count; i2++) {
          handles.push(objects.add(i2 * pointerSize7).readPointer());
        }
        jvmti.deallocate(objects);
        try {
          for (const handle of handles) {
            const instance = this.cast(handle, classWrapper);
            const result = callbacks.onMatch(instance);
            if (result === "stop") {
              break;
            }
          }
          callbacks.onComplete();
        } finally {
          handles.forEach((handle) => {
            env.deleteLocalRef(handle);
          });
        }
      } finally {
        h2.unref(env);
      }
    }
    _chooseObjectsArtPreA12(className, env, thread, callbacks) {
      const classWrapper = this.use(className);
      const scope = VariableSizedHandleScope.$new(thread, vm2);
      let needle;
      const h2 = classWrapper.$borrowClassHandle(env);
      try {
        const object = api["art::JavaVMExt::DecodeGlobal"](api.vm, thread, h2.value);
        needle = scope.newHandle(object);
      } finally {
        h2.unref(env);
      }
      const maxCount = 0;
      const instances = HandleVector.$new();
      api["art::gc::Heap::GetInstances"](api.artHeap, scope, needle, maxCount, instances);
      const instanceHandles = instances.handles.map((handle) => env.newGlobalRef(handle));
      instances.$delete();
      scope.$delete();
      try {
        for (const handle of instanceHandles) {
          const instance = this.cast(handle, classWrapper);
          const result = callbacks.onMatch(instance);
          if (result === "stop") {
            break;
          }
        }
        callbacks.onComplete();
      } finally {
        instanceHandles.forEach((handle) => {
          env.deleteGlobalRef(handle);
        });
      }
    }
    _chooseObjectsArtLegacy(className, env, thread, callbacks) {
      const classWrapper = this.use(className);
      const instanceHandles = [];
      const addGlobalReference = api["art::JavaVMExt::AddGlobalRef"];
      const vmHandle = api.vm;
      let needle;
      const h2 = classWrapper.$borrowClassHandle(env);
      try {
        needle = api["art::JavaVMExt::DecodeGlobal"](vmHandle, thread, h2.value).toInt32();
      } finally {
        h2.unref(env);
      }
      const collectMatchingInstanceHandles = makeObjectVisitorPredicate(needle, (object) => {
        instanceHandles.push(addGlobalReference(vmHandle, thread, object));
      });
      api["art::gc::Heap::VisitObjects"](api.artHeap, collectMatchingInstanceHandles, NULL);
      try {
        for (const handle of instanceHandles) {
          const instance = this.cast(handle, classWrapper);
          const result = callbacks.onMatch(instance);
          if (result === "stop") {
            break;
          }
        }
      } finally {
        instanceHandles.forEach((handle) => {
          env.deleteGlobalRef(handle);
        });
      }
      callbacks.onComplete();
    }
    _chooseObjectsDalvik(className, callerEnv, callbacks) {
      const classWrapper = this.use(className);
      if (api.addLocalReference === null) {
        const libdvm = Process.getModuleByName("libdvm.so");
        let pattern;
        switch (Process.arch) {
          case "arm":
            pattern = "2d e9 f0 41 05 46 15 4e 0c 46 7e 44 11 b3 43 68";
            break;
          case "ia32":
            pattern = "8d 64 24 d4 89 5c 24 1c 89 74 24 20 e8 ?? ?? ?? ?? ?? ?? ?? ?? ?? ?? 85 d2";
            break;
        }
        Memory.scan(libdvm.base, libdvm.size, pattern, {
          onMatch: (address, size) => {
            let wrapper;
            if (Process.arch === "arm") {
              address = address.or(1);
              wrapper = new NativeFunction(address, "pointer", ["pointer", "pointer"]);
            } else {
              const thunk = Memory.alloc(Process.pageSize);
              Memory.patchCode(thunk, 16, (code2) => {
                const cw = new X86Writer(code2, { pc: thunk });
                cw.putMovRegRegOffsetPtr("eax", "esp", 4);
                cw.putMovRegRegOffsetPtr("edx", "esp", 8);
                cw.putJmpAddress(address);
                cw.flush();
              });
              wrapper = new NativeFunction(thunk, "pointer", ["pointer", "pointer"]);
              wrapper._thunk = thunk;
            }
            api.addLocalReference = wrapper;
            vm2.perform((env) => {
              enumerateInstances(this, env);
            });
            return "stop";
          },
          onError(reason) {
          },
          onComplete() {
            if (api.addLocalReference === null) {
              callbacks.onComplete();
            }
          }
        });
      } else {
        enumerateInstances(this, callerEnv);
      }
      function enumerateInstances(factory, env) {
        const { DVM_JNI_ENV_OFFSET_SELF: DVM_JNI_ENV_OFFSET_SELF2 } = android_exports;
        const thread = env.handle.add(DVM_JNI_ENV_OFFSET_SELF2).readPointer();
        let ptrClassObject;
        const h2 = classWrapper.$borrowClassHandle(env);
        try {
          ptrClassObject = api.dvmDecodeIndirectRef(thread, h2.value);
        } finally {
          h2.unref(env);
        }
        const pattern = ptrClassObject.toMatchPattern();
        const heapSourceBase = api.dvmHeapSourceGetBase();
        const heapSourceLimit = api.dvmHeapSourceGetLimit();
        const size = heapSourceLimit.sub(heapSourceBase).toInt32();
        Memory.scan(heapSourceBase, size, pattern, {
          onMatch: (address, size2) => {
            if (api.dvmIsValidObject(address)) {
              vm2.perform((env2) => {
                const thread2 = env2.handle.add(DVM_JNI_ENV_OFFSET_SELF2).readPointer();
                let instance;
                const localReference = api.addLocalReference(thread2, address);
                try {
                  instance = factory.cast(localReference, classWrapper);
                } finally {
                  env2.deleteLocalRef(localReference);
                }
                const result = callbacks.onMatch(instance);
                if (result === "stop") {
                  return "stop";
                }
              });
            }
          },
          onError(reason) {
          },
          onComplete() {
            callbacks.onComplete();
          }
        });
      }
    }
    openClassFile(filePath) {
      return new DexFile(filePath, null, this);
    }
    _getType(typeName, unbox = true) {
      return getType(typeName, unbox, this);
    }
  };
  function makeClassWrapperConstructor() {
    return function(handle, strategy, env, owned) {
      return Wrapper.call(this, handle, strategy, env, owned);
    };
  }
  function Wrapper(handle, strategy, env, owned = true) {
    if (handle !== null) {
      if (owned) {
        const h2 = env.newGlobalRef(handle);
        this.$h = h2;
        this.$r = Script.bindWeak(this, vm2.makeHandleDestructor(h2));
      } else {
        this.$h = handle;
        this.$r = null;
      }
    } else {
      this.$h = null;
      this.$r = null;
    }
    this.$t = strategy;
    return new Proxy(this, wrapperHandler);
  }
  wrapperHandler = {
    has(target, property) {
      if (property in target) {
        return true;
      }
      return target.$has(property);
    },
    get(target, property, receiver) {
      if (typeof property !== "string" || property.startsWith("$") || property === "class") {
        return target[property];
      }
      const unwrap2 = target.$find(property);
      if (unwrap2 !== null) {
        return unwrap2(receiver);
      }
      return target[property];
    },
    set(target, property, value, receiver) {
      target[property] = value;
      return true;
    },
    ownKeys(target) {
      return target.$list();
    },
    getOwnPropertyDescriptor(target, property) {
      if (Object.prototype.hasOwnProperty.call(target, property)) {
        return Object.getOwnPropertyDescriptor(target, property);
      }
      return {
        writable: false,
        configurable: true,
        enumerable: true
      };
    }
  };
  Object.defineProperties(Wrapper.prototype, {
    [/* @__PURE__ */ Symbol.for("new")]: {
      enumerable: false,
      get() {
        return this.$getCtor("allocAndInit");
      }
    },
    $new: {
      enumerable: true,
      get() {
        return this[/* @__PURE__ */ Symbol.for("new")];
      }
    },
    [/* @__PURE__ */ Symbol.for("alloc")]: {
      enumerable: false,
      value() {
        const env = vm2.getEnv();
        const h2 = this.$borrowClassHandle(env);
        try {
          const obj = env.allocObject(h2.value);
          const factory = this.$f;
          return factory.cast(obj, this);
        } finally {
          h2.unref(env);
        }
      }
    },
    $alloc: {
      enumerable: true,
      get() {
        return this[/* @__PURE__ */ Symbol.for("alloc")];
      }
    },
    [/* @__PURE__ */ Symbol.for("init")]: {
      enumerable: false,
      get() {
        return this.$getCtor("initOnly");
      }
    },
    $init: {
      enumerable: true,
      get() {
        return this[/* @__PURE__ */ Symbol.for("init")];
      }
    },
    [/* @__PURE__ */ Symbol.for("dispose")]: {
      enumerable: false,
      value() {
        const ref = this.$r;
        if (ref !== null) {
          this.$r = null;
          Script.unbindWeak(ref);
        }
        if (this.$h !== null) {
          this.$h = void 0;
        }
      }
    },
    $dispose: {
      enumerable: true,
      get() {
        return this[/* @__PURE__ */ Symbol.for("dispose")];
      }
    },
    [/* @__PURE__ */ Symbol.for("clone")]: {
      enumerable: false,
      value(env) {
        const C2 = this.$C;
        return new C2(this.$h, this.$t, env);
      }
    },
    $clone: {
      value(env) {
        return this[/* @__PURE__ */ Symbol.for("clone")](env);
      }
    },
    [/* @__PURE__ */ Symbol.for("class")]: {
      enumerable: false,
      get() {
        const env = vm2.getEnv();
        const h2 = this.$borrowClassHandle(env);
        try {
          const factory = this.$f;
          return factory.cast(h2.value, factory.use("java.lang.Class"));
        } finally {
          h2.unref(env);
        }
      }
    },
    class: {
      enumerable: true,
      get() {
        return this[/* @__PURE__ */ Symbol.for("class")];
      }
    },
    [/* @__PURE__ */ Symbol.for("className")]: {
      enumerable: false,
      get() {
        const handle = this.$h;
        if (handle === null) {
          return this.$n;
        }
        return vm2.getEnv().getObjectClassName(handle);
      }
    },
    $className: {
      enumerable: true,
      get() {
        return this[/* @__PURE__ */ Symbol.for("className")];
      }
    },
    [/* @__PURE__ */ Symbol.for("ownMembers")]: {
      enumerable: false,
      get() {
        const model = this.$l;
        return model.list();
      }
    },
    $ownMembers: {
      enumerable: true,
      get() {
        return this[/* @__PURE__ */ Symbol.for("ownMembers")];
      }
    },
    [/* @__PURE__ */ Symbol.for("super")]: {
      enumerable: false,
      get() {
        const env = vm2.getEnv();
        const C2 = this.$s.$C;
        return new C2(this.$h, STRATEGY_DIRECT, env);
      }
    },
    $super: {
      enumerable: true,
      get() {
        return this[/* @__PURE__ */ Symbol.for("super")];
      }
    },
    [/* @__PURE__ */ Symbol.for("s")]: {
      enumerable: false,
      get() {
        const proto = Object.getPrototypeOf(this);
        let superWrapper = proto.$_s;
        if (superWrapper === void 0) {
          const env = vm2.getEnv();
          const h2 = this.$borrowClassHandle(env);
          try {
            const superHandle = env.getSuperclass(h2.value);
            if (!superHandle.isNull()) {
              try {
                const superClassName = env.getClassName(superHandle);
                const factory = proto.$f;
                superWrapper = factory._getUsedClass(superClassName);
                if (superWrapper === void 0) {
                  try {
                    const getSuperClassHandle = makeSuperHandleGetter(this);
                    superWrapper = factory._make(superClassName, getSuperClassHandle, env);
                  } finally {
                    factory._setUsedClass(superClassName, superWrapper);
                  }
                }
              } finally {
                env.deleteLocalRef(superHandle);
              }
            } else {
              superWrapper = null;
            }
          } finally {
            h2.unref(env);
          }
          proto.$_s = superWrapper;
        }
        return superWrapper;
      }
    },
    $s: {
      get() {
        return this[/* @__PURE__ */ Symbol.for("s")];
      }
    },
    [/* @__PURE__ */ Symbol.for("isSameObject")]: {
      enumerable: false,
      value(obj) {
        const env = vm2.getEnv();
        return env.isSameObject(obj.$h, this.$h);
      }
    },
    $isSameObject: {
      value(obj) {
        return this[/* @__PURE__ */ Symbol.for("isSameObject")](obj);
      }
    },
    [/* @__PURE__ */ Symbol.for("getCtor")]: {
      enumerable: false,
      value(type) {
        const slot = this.$c;
        let ctor = slot[0];
        if (ctor === null) {
          const env = vm2.getEnv();
          const h2 = this.$borrowClassHandle(env);
          try {
            ctor = makeConstructor(h2.value, this.$w, env);
            slot[0] = ctor;
          } finally {
            h2.unref(env);
          }
        }
        return ctor[type];
      }
    },
    $getCtor: {
      value(type) {
        return this[/* @__PURE__ */ Symbol.for("getCtor")](type);
      }
    },
    [/* @__PURE__ */ Symbol.for("borrowClassHandle")]: {
      enumerable: false,
      value(env) {
        const className = this.$n;
        const classHandles = this.$f._classHandles;
        let handle = classHandles.get(className);
        if (handle === void 0) {
          handle = new ClassHandle(this.$gch(env), env);
          classHandles.set(className, handle, env);
        }
        return handle.ref();
      }
    },
    $borrowClassHandle: {
      value(env) {
        return this[/* @__PURE__ */ Symbol.for("borrowClassHandle")](env);
      }
    },
    [/* @__PURE__ */ Symbol.for("copyClassHandle")]: {
      enumerable: false,
      value(env) {
        const h2 = this.$borrowClassHandle(env);
        try {
          return env.newLocalRef(h2.value);
        } finally {
          h2.unref(env);
        }
      }
    },
    $copyClassHandle: {
      value(env) {
        return this[/* @__PURE__ */ Symbol.for("copyClassHandle")](env);
      }
    },
    [/* @__PURE__ */ Symbol.for("getHandle")]: {
      enumerable: false,
      value(env) {
        const handle = this.$h;
        const isDisposed = handle === void 0;
        if (isDisposed) {
          throw new Error("Wrapper is disposed; perhaps it was borrowed from a hook instead of calling Java.retain() to make a long-lived wrapper?");
        }
        return handle;
      }
    },
    $getHandle: {
      value(env) {
        return this[/* @__PURE__ */ Symbol.for("getHandle")](env);
      }
    },
    [/* @__PURE__ */ Symbol.for("list")]: {
      enumerable: false,
      value() {
        const superWrapper = this.$s;
        const superMembers = superWrapper !== null ? superWrapper.$list() : [];
        const model = this.$l;
        return Array.from(new Set(superMembers.concat(model.list())));
      }
    },
    $list: {
      get() {
        return this[/* @__PURE__ */ Symbol.for("list")];
      }
    },
    [/* @__PURE__ */ Symbol.for("has")]: {
      enumerable: false,
      value(member) {
        const members = this.$m;
        if (members.has(member)) {
          return true;
        }
        const model = this.$l;
        if (model.has(member)) {
          return true;
        }
        const superWrapper = this.$s;
        if (superWrapper !== null && superWrapper.$has(member)) {
          return true;
        }
        return false;
      }
    },
    $has: {
      value(member) {
        return this[/* @__PURE__ */ Symbol.for("has")](member);
      }
    },
    [/* @__PURE__ */ Symbol.for("find")]: {
      enumerable: false,
      value(member) {
        const members = this.$m;
        let value = members.get(member);
        if (value !== void 0) {
          return value;
        }
        const model = this.$l;
        const spec = model.find(member);
        if (spec !== null) {
          const env = vm2.getEnv();
          const h2 = this.$borrowClassHandle(env);
          try {
            value = makeMember(member, spec, h2.value, this.$w, env);
          } finally {
            h2.unref(env);
          }
          members.set(member, value);
          return value;
        }
        const superWrapper = this.$s;
        if (superWrapper !== null) {
          return superWrapper.$find(member);
        }
        return null;
      }
    },
    $find: {
      value(member) {
        return this[/* @__PURE__ */ Symbol.for("find")](member);
      }
    },
    [/* @__PURE__ */ Symbol.for("toJSON")]: {
      enumerable: false,
      value() {
        const wrapperName = this.$n;
        const handle = this.$h;
        if (handle === null) {
          return `<class: ${wrapperName}>`;
        }
        const actualName = this.$className;
        if (wrapperName === actualName) {
          return `<instance: ${wrapperName}>`;
        }
        return `<instance: ${wrapperName}, $className: ${actualName}>`;
      }
    },
    toJSON: {
      get() {
        return this[/* @__PURE__ */ Symbol.for("toJSON")];
      }
    }
  });
  function ClassHandle(value, env) {
    this.value = env.newGlobalRef(value);
    env.deleteLocalRef(value);
    this.refs = 1;
  }
  ClassHandle.prototype.ref = function() {
    this.refs++;
    return this;
  };
  ClassHandle.prototype.unref = function(env) {
    if (--this.refs === 0) {
      env.deleteGlobalRef(this.value);
    }
  };
  function releaseClassHandle(handle, env) {
    handle.unref(env);
  }
  function makeBasicClassHandleGetter(className) {
    const canonicalClassName = className.replace(/\./g, "/");
    return function(env) {
      const tid = getCurrentThreadId();
      ignore(tid);
      try {
        return env.findClass(canonicalClassName);
      } finally {
        unignore(tid);
      }
    };
  }
  function makeLoaderClassHandleGetter(className, usedLoader, callerEnv) {
    if (cachedLoaderMethod === null) {
      cachedLoaderInvoke = callerEnv.vaMethod("pointer", ["pointer"]);
      cachedLoaderMethod = usedLoader.loadClass.overload("java.lang.String").handle;
    }
    callerEnv = null;
    return function(env) {
      const classNameValue = env.newStringUtf(className);
      const tid = getCurrentThreadId();
      ignore(tid);
      try {
        const result = cachedLoaderInvoke(env.handle, usedLoader.$h, cachedLoaderMethod, classNameValue);
        env.throwIfExceptionPending();
        return result;
      } finally {
        unignore(tid);
        env.deleteLocalRef(classNameValue);
      }
    };
  }
  function makeSuperHandleGetter(classWrapper) {
    return function(env) {
      const h2 = classWrapper.$borrowClassHandle(env);
      try {
        return env.getSuperclass(h2.value);
      } finally {
        h2.unref(env);
      }
    };
  }
  function makeConstructor(classHandle, classWrapper, env) {
    const { $n: className, $f: factory } = classWrapper;
    const methodName = basename(className);
    const Class = env.javaLangClass();
    const Constructor = env.javaLangReflectConstructor();
    const invokeObjectMethodNoArgs = env.vaMethod("pointer", []);
    const invokeUInt8MethodNoArgs = env.vaMethod("uint8", []);
    const jsCtorMethods = [];
    const jsInitMethods = [];
    const jsRetType = factory._getType(className, false);
    const jsVoidType = factory._getType("void", false);
    const constructors = invokeObjectMethodNoArgs(env.handle, classHandle, Class.getDeclaredConstructors);
    try {
      const n2 = env.getArrayLength(constructors);
      if (n2 !== 0) {
        for (let i2 = 0; i2 !== n2; i2++) {
          let methodId, types;
          const constructor = env.getObjectArrayElement(constructors, i2);
          try {
            methodId = env.fromReflectedMethod(constructor);
            types = invokeObjectMethodNoArgs(env.handle, constructor, Constructor.getGenericParameterTypes);
          } finally {
            env.deleteLocalRef(constructor);
          }
          let jsArgTypes;
          try {
            jsArgTypes = readTypeNames(env, types).map((name) => factory._getType(name));
          } finally {
            env.deleteLocalRef(types);
          }
          jsCtorMethods.push(makeMethod(methodName, classWrapper, CONSTRUCTOR_METHOD, methodId, jsRetType, jsArgTypes, env));
          jsInitMethods.push(makeMethod(methodName, classWrapper, INSTANCE_METHOD, methodId, jsVoidType, jsArgTypes, env));
        }
      } else {
        const isInterface = invokeUInt8MethodNoArgs(env.handle, classHandle, Class.isInterface);
        if (isInterface) {
          throw new Error("cannot instantiate an interface");
        }
        const defaultClass = env.javaLangObject();
        const defaultConstructor = env.getMethodId(defaultClass, "<init>", "()V");
        jsCtorMethods.push(makeMethod(methodName, classWrapper, CONSTRUCTOR_METHOD, defaultConstructor, jsRetType, [], env));
        jsInitMethods.push(makeMethod(methodName, classWrapper, INSTANCE_METHOD, defaultConstructor, jsVoidType, [], env));
      }
    } finally {
      env.deleteLocalRef(constructors);
    }
    if (jsInitMethods.length === 0) {
      throw new Error("no supported overloads");
    }
    return {
      allocAndInit: makeMethodDispatcher(jsCtorMethods),
      initOnly: makeMethodDispatcher(jsInitMethods)
    };
  }
  function makeMember(name, spec, classHandle, classWrapper, env) {
    if (spec.startsWith("m")) {
      return makeMethodFromSpec(name, spec, classHandle, classWrapper, env);
    }
    return makeFieldFromSpec(name, spec, classHandle, classWrapper, env);
  }
  function makeMethodFromSpec(name, spec, classHandle, classWrapper, env) {
    const { $f: factory } = classWrapper;
    const overloads = spec.split(":").slice(1);
    const Method = env.javaLangReflectMethod();
    const invokeObjectMethodNoArgs = env.vaMethod("pointer", []);
    const invokeUInt8MethodNoArgs = env.vaMethod("uint8", []);
    const methods = overloads.map((params) => {
      const type = params[0] === "s" ? STATIC_METHOD : INSTANCE_METHOD;
      const methodId = ptr(params.substr(1));
      let jsRetType;
      const jsArgTypes = [];
      const handle = env.toReflectedMethod(classHandle, methodId, type === STATIC_METHOD ? 1 : 0);
      try {
        const isVarArgs = !!invokeUInt8MethodNoArgs(env.handle, handle, Method.isVarArgs);
        const retType = invokeObjectMethodNoArgs(env.handle, handle, Method.getGenericReturnType);
        env.throwIfExceptionPending();
        try {
          jsRetType = factory._getType(env.getTypeName(retType));
        } finally {
          env.deleteLocalRef(retType);
        }
        const argTypes = invokeObjectMethodNoArgs(env.handle, handle, Method.getParameterTypes);
        try {
          const n2 = env.getArrayLength(argTypes);
          for (let i2 = 0; i2 !== n2; i2++) {
            const t2 = env.getObjectArrayElement(argTypes, i2);
            let argClassName;
            try {
              argClassName = isVarArgs && i2 === n2 - 1 ? env.getArrayTypeName(t2) : env.getTypeName(t2);
            } finally {
              env.deleteLocalRef(t2);
            }
            const argType = factory._getType(argClassName);
            jsArgTypes.push(argType);
          }
        } finally {
          env.deleteLocalRef(argTypes);
        }
      } catch (e2) {
        return null;
      } finally {
        env.deleteLocalRef(handle);
      }
      return makeMethod(name, classWrapper, type, methodId, jsRetType, jsArgTypes, env);
    }).filter((m2) => m2 !== null);
    if (methods.length === 0) {
      throw new Error("No supported overloads");
    }
    if (name === "valueOf") {
      ensureDefaultValueOfImplemented(methods);
    }
    const result = makeMethodDispatcher(methods);
    return function(receiver) {
      return result;
    };
  }
  function makeMethodDispatcher(overloads) {
    const m2 = makeMethodDispatcherCallable();
    Object.setPrototypeOf(m2, dispatcherPrototype);
    m2._o = overloads;
    return m2;
  }
  function makeMethodDispatcherCallable() {
    const m2 = function() {
      return m2.invoke(this, arguments);
    };
    return m2;
  }
  dispatcherPrototype = Object.create(Function.prototype, {
    overloads: {
      enumerable: true,
      get() {
        return this._o;
      }
    },
    overload: {
      value(...args) {
        const overloads = this._o;
        const numArgs = args.length;
        const signature = args.join(":");
        for (let i2 = 0; i2 !== overloads.length; i2++) {
          const method = overloads[i2];
          const { argumentTypes } = method;
          if (argumentTypes.length !== numArgs) {
            continue;
          }
          const s2 = argumentTypes.map((t2) => t2.className).join(":");
          if (s2 === signature) {
            return method;
          }
        }
        throwOverloadError(this.methodName, this.overloads, "specified argument types do not match any of:");
      }
    },
    methodName: {
      enumerable: true,
      get() {
        return this._o[0].methodName;
      }
    },
    holder: {
      enumerable: true,
      get() {
        return this._o[0].holder;
      }
    },
    type: {
      enumerable: true,
      get() {
        return this._o[0].type;
      }
    },
    handle: {
      enumerable: true,
      get() {
        throwIfDispatcherAmbiguous(this);
        return this._o[0].handle;
      }
    },
    implementation: {
      enumerable: true,
      get() {
        throwIfDispatcherAmbiguous(this);
        return this._o[0].implementation;
      },
      set(fn) {
        throwIfDispatcherAmbiguous(this);
        this._o[0].implementation = fn;
      }
    },
    returnType: {
      enumerable: true,
      get() {
        throwIfDispatcherAmbiguous(this);
        return this._o[0].returnType;
      }
    },
    argumentTypes: {
      enumerable: true,
      get() {
        throwIfDispatcherAmbiguous(this);
        return this._o[0].argumentTypes;
      }
    },
    canInvokeWith: {
      enumerable: true,
      get(args) {
        throwIfDispatcherAmbiguous(this);
        return this._o[0].canInvokeWith;
      }
    },
    clone: {
      enumerable: true,
      value(options) {
        throwIfDispatcherAmbiguous(this);
        return this._o[0].clone(options);
      }
    },
    invoke: {
      value(receiver, args) {
        const overloads = this._o;
        const isInstance = receiver.$h !== null;
        for (let i2 = 0; i2 !== overloads.length; i2++) {
          const method = overloads[i2];
          if (!method.canInvokeWith(args)) {
            continue;
          }
          if (method.type === INSTANCE_METHOD && !isInstance) {
            const name = this.methodName;
            if (name === "toString") {
              return `<class: ${receiver.$n}>`;
            }
            throw new Error(name + ": cannot call instance method without an instance");
          }
          return method.apply(receiver, args);
        }
        if (this.methodName === "toString") {
          return `<class: ${receiver.$n}>`;
        }
        throwOverloadError(this.methodName, this.overloads, "argument types do not match any of:");
      }
    }
  });
  function makeOverloadId(name, returnType, argumentTypes) {
    return `${returnType.className} ${name}(${argumentTypes.map((t2) => t2.className).join(", ")})`;
  }
  function throwIfDispatcherAmbiguous(dispatcher) {
    const methods = dispatcher._o;
    if (methods.length > 1) {
      throwOverloadError(methods[0].methodName, methods, "has more than one overload, use .overload(<signature>) to choose from:");
    }
  }
  function throwOverloadError(name, methods, message) {
    const methodsSortedByArity = methods.slice().sort((a2, b2) => a2.argumentTypes.length - b2.argumentTypes.length);
    const overloads = methodsSortedByArity.map((m2) => {
      const argTypes = m2.argumentTypes;
      if (argTypes.length > 0) {
        return ".overload('" + m2.argumentTypes.map((t2) => t2.className).join("', '") + "')";
      } else {
        return ".overload()";
      }
    });
    throw new Error(`${name}(): ${message}
	${overloads.join("\n	")}`);
  }
  function makeMethod(methodName, classWrapper, type, methodId, retType, argTypes, env, invocationOptions) {
    const rawRetType = retType.type;
    const rawArgTypes = argTypes.map((t2) => t2.type);
    if (env === null) {
      env = vm2.getEnv();
    }
    let callVirtually, callDirectly;
    if (type === INSTANCE_METHOD) {
      callVirtually = env.vaMethod(rawRetType, rawArgTypes, invocationOptions);
      callDirectly = env.nonvirtualVaMethod(rawRetType, rawArgTypes, invocationOptions);
    } else if (type === STATIC_METHOD) {
      callVirtually = env.staticVaMethod(rawRetType, rawArgTypes, invocationOptions);
      callDirectly = callVirtually;
    } else {
      callVirtually = env.constructor(rawArgTypes, invocationOptions);
      callDirectly = callVirtually;
    }
    return makeMethodInstance([methodName, classWrapper, type, methodId, retType, argTypes, callVirtually, callDirectly]);
  }
  function makeMethodInstance(params) {
    const m2 = makeMethodCallable();
    Object.setPrototypeOf(m2, methodPrototype);
    m2._p = params;
    return m2;
  }
  function makeMethodCallable() {
    const m2 = function() {
      return m2.invoke(this, arguments);
    };
    return m2;
  }
  methodPrototype = Object.create(Function.prototype, {
    methodName: {
      enumerable: true,
      get() {
        return this._p[0];
      }
    },
    holder: {
      enumerable: true,
      get() {
        return this._p[1];
      }
    },
    type: {
      enumerable: true,
      get() {
        return this._p[2];
      }
    },
    handle: {
      enumerable: true,
      get() {
        return this._p[3];
      }
    },
    implementation: {
      enumerable: true,
      get() {
        const replacement = this._r;
        return replacement !== void 0 ? replacement : null;
      },
      set(fn) {
        const params = this._p;
        const holder = params[1];
        const type = params[2];
        if (type === CONSTRUCTOR_METHOD) {
          throw new Error("Reimplementing $new is not possible; replace implementation of $init instead");
        }
        const existingReplacement = this._r;
        if (existingReplacement !== void 0) {
          holder.$f._patchedMethods.delete(this);
          const mangler = existingReplacement._m;
          mangler.revert(vm2);
          this._r = void 0;
        }
        if (fn !== null) {
          const [methodName, classWrapper, type2, methodId, retType, argTypes] = params;
          const replacement = implement(methodName, classWrapper, type2, retType, argTypes, fn, this);
          const mangler = makeMethodMangler3(methodId);
          replacement._m = mangler;
          this._r = replacement;
          mangler.replace(replacement, type2 === INSTANCE_METHOD, argTypes, vm2, api);
          holder.$f._patchedMethods.add(this);
        }
      }
    },
    returnType: {
      enumerable: true,
      get() {
        return this._p[4];
      }
    },
    argumentTypes: {
      enumerable: true,
      get() {
        return this._p[5];
      }
    },
    canInvokeWith: {
      enumerable: true,
      value(args) {
        const argTypes = this._p[5];
        if (args.length !== argTypes.length) {
          return false;
        }
        return argTypes.every((t2, i2) => {
          return t2.isCompatible(args[i2]);
        });
      }
    },
    clone: {
      enumerable: true,
      value(options) {
        const params = this._p.slice(0, 6);
        return makeMethod(...params, null, options);
      }
    },
    invoke: {
      value(receiver, args) {
        const env = vm2.getEnv();
        const params = this._p;
        const type = params[2];
        const retType = params[4];
        const argTypes = params[5];
        const replacement = this._r;
        const isInstanceMethod = type === INSTANCE_METHOD;
        const numArgs = args.length;
        const frameCapacity = 2 + numArgs;
        env.pushLocalFrame(frameCapacity);
        let borrowedHandle = null;
        try {
          let jniThis;
          if (isInstanceMethod) {
            jniThis = receiver.$getHandle();
          } else {
            borrowedHandle = receiver.$borrowClassHandle(env);
            jniThis = borrowedHandle.value;
          }
          let methodId;
          let strategy = receiver.$t;
          if (replacement === void 0) {
            methodId = params[3];
          } else {
            const mangler = replacement._m;
            methodId = mangler.resolveTarget(receiver, isInstanceMethod, env, api);
            if (isArtVm) {
              const pendingCalls = replacement._c;
              if (pendingCalls.has(getCurrentThreadId())) {
                strategy = STRATEGY_DIRECT;
              }
            }
          }
          const jniArgs = [
            env.handle,
            jniThis,
            methodId
          ];
          for (let i2 = 0; i2 !== numArgs; i2++) {
            jniArgs.push(argTypes[i2].toJni(args[i2], env));
          }
          let jniCall;
          if (strategy === STRATEGY_VIRTUAL) {
            jniCall = params[6];
          } else {
            jniCall = params[7];
            if (isInstanceMethod) {
              jniArgs.splice(2, 0, receiver.$copyClassHandle(env));
            }
          }
          const jniRetval = jniCall.apply(null, jniArgs);
          env.throwIfExceptionPending();
          return retType.fromJni(jniRetval, env, true);
        } finally {
          if (borrowedHandle !== null) {
            borrowedHandle.unref(env);
          }
          env.popLocalFrame(NULL);
        }
      }
    },
    toString: {
      enumerable: true,
      value() {
        return `function ${this.methodName}(${this.argumentTypes.map((t2) => t2.className).join(", ")}): ${this.returnType.className}`;
      }
    }
  });
  function implement(methodName, classWrapper, type, retType, argTypes, handler, fallback = null) {
    const pendingCalls = /* @__PURE__ */ new Set();
    const f2 = makeMethodImplementation([methodName, classWrapper, type, retType, argTypes, handler, fallback, pendingCalls]);
    const impl = new NativeCallback(f2, retType.type, ["pointer", "pointer"].concat(argTypes.map((t2) => t2.type)));
    impl._c = pendingCalls;
    return impl;
  }
  function makeMethodImplementation(params) {
    return function() {
      return handleMethodInvocation(arguments, params);
    };
  }
  function handleMethodInvocation(jniArgs, params) {
    const env = new Env(jniArgs[0], vm2);
    const [methodName, classWrapper, type, retType, argTypes, handler, fallback, pendingCalls] = params;
    const ownedObjects = [];
    let self2;
    if (type === INSTANCE_METHOD) {
      const C2 = classWrapper.$C;
      self2 = new C2(jniArgs[1], STRATEGY_VIRTUAL, env, false);
    } else {
      self2 = classWrapper;
    }
    const tid = getCurrentThreadId();
    env.pushLocalFrame(3);
    let haveFrame = true;
    vm2.link(tid, env);
    try {
      pendingCalls.add(tid);
      let fn;
      if (fallback === null || !ignoredThreads.has(tid)) {
        fn = handler;
      } else {
        fn = fallback;
      }
      const args = [];
      const numArgs = jniArgs.length - 2;
      for (let i2 = 0; i2 !== numArgs; i2++) {
        const t2 = argTypes[i2];
        const value = t2.fromJni(jniArgs[2 + i2], env, false);
        args.push(value);
        ownedObjects.push(value);
      }
      const retval = fn.apply(self2, args);
      if (!retType.isCompatible(retval)) {
        throw new Error(`Implementation for ${methodName} expected return value compatible with ${retType.className}`);
      }
      let jniRetval = retType.toJni(retval, env);
      if (retType.type === "pointer") {
        jniRetval = env.popLocalFrame(jniRetval);
        haveFrame = false;
        ownedObjects.push(retval);
      }
      return jniRetval;
    } catch (e2) {
      const jniException = e2.$h;
      if (jniException !== void 0) {
        env.throw(jniException);
      } else {
        Script.nextTick(() => {
          throw e2;
        });
      }
      return retType.defaultValue;
    } finally {
      vm2.unlink(tid);
      if (haveFrame) {
        env.popLocalFrame(NULL);
      }
      pendingCalls.delete(tid);
      ownedObjects.forEach((obj) => {
        if (obj === null) {
          return;
        }
        const dispose = obj.$dispose;
        if (dispose !== void 0) {
          dispose.call(obj);
        }
      });
    }
  }
  function ensureDefaultValueOfImplemented(methods) {
    const { holder, type } = methods[0];
    const hasDefaultValueOf = methods.some((m2) => m2.type === type && m2.argumentTypes.length === 0);
    if (hasDefaultValueOf) {
      return;
    }
    methods.push(makeValueOfMethod([holder, type]));
  }
  function makeValueOfMethod(params) {
    const m2 = makeValueOfCallable();
    Object.setPrototypeOf(m2, valueOfPrototype);
    m2._p = params;
    return m2;
  }
  function makeValueOfCallable() {
    const m2 = function() {
      return this;
    };
    return m2;
  }
  valueOfPrototype = Object.create(Function.prototype, {
    methodName: {
      enumerable: true,
      get() {
        return "valueOf";
      }
    },
    holder: {
      enumerable: true,
      get() {
        return this._p[0];
      }
    },
    type: {
      enumerable: true,
      get() {
        return this._p[1];
      }
    },
    handle: {
      enumerable: true,
      get() {
        return NULL;
      }
    },
    implementation: {
      enumerable: true,
      get() {
        return null;
      },
      set(fn) {
      }
    },
    returnType: {
      enumerable: true,
      get() {
        const classWrapper = this.holder;
        return classWrapper.$f.use(classWrapper.$n);
      }
    },
    argumentTypes: {
      enumerable: true,
      get() {
        return [];
      }
    },
    canInvokeWith: {
      enumerable: true,
      value(args) {
        return args.length === 0;
      }
    },
    clone: {
      enumerable: true,
      value(options) {
        throw new Error("Invalid operation");
      }
    }
  });
  function makeFieldFromSpec(name, spec, classHandle, classWrapper, env) {
    const type = spec[2] === "s" ? STATIC_FIELD : INSTANCE_FIELD;
    const id = ptr(spec.substr(3));
    const { $f: factory } = classWrapper;
    let fieldType;
    const field = env.toReflectedField(classHandle, id, type === STATIC_FIELD ? 1 : 0);
    try {
      fieldType = env.vaMethod("pointer", [])(env.handle, field, env.javaLangReflectField().getGenericType);
      env.throwIfExceptionPending();
    } finally {
      env.deleteLocalRef(field);
    }
    let rtype;
    try {
      rtype = factory._getType(env.getTypeName(fieldType));
    } finally {
      env.deleteLocalRef(fieldType);
    }
    let getValue, setValue;
    const rtypeJni = rtype.type;
    if (type === STATIC_FIELD) {
      getValue = env.getStaticField(rtypeJni);
      setValue = env.setStaticField(rtypeJni);
    } else {
      getValue = env.getField(rtypeJni);
      setValue = env.setField(rtypeJni);
    }
    return makeFieldFromParams([type, rtype, id, getValue, setValue]);
  }
  function makeFieldFromParams(params) {
    return function(receiver) {
      return new Field([receiver].concat(params));
    };
  }
  function Field(params) {
    this._p = params;
  }
  Object.defineProperties(Field.prototype, {
    value: {
      enumerable: true,
      get() {
        const [holder, type, rtype, id, getValue] = this._p;
        const env = vm2.getEnv();
        env.pushLocalFrame(4);
        let borrowedHandle = null;
        try {
          let jniThis;
          if (type === INSTANCE_FIELD) {
            jniThis = holder.$getHandle();
            if (jniThis === null) {
              throw new Error("Cannot access an instance field without an instance");
            }
          } else {
            borrowedHandle = holder.$borrowClassHandle(env);
            jniThis = borrowedHandle.value;
          }
          const jniRetval = getValue(env.handle, jniThis, id);
          env.throwIfExceptionPending();
          return rtype.fromJni(jniRetval, env, true);
        } finally {
          if (borrowedHandle !== null) {
            borrowedHandle.unref(env);
          }
          env.popLocalFrame(NULL);
        }
      },
      set(value) {
        const [holder, type, rtype, id, , setValue] = this._p;
        const env = vm2.getEnv();
        env.pushLocalFrame(4);
        let borrowedHandle = null;
        try {
          let jniThis;
          if (type === INSTANCE_FIELD) {
            jniThis = holder.$getHandle();
            if (jniThis === null) {
              throw new Error("Cannot access an instance field without an instance");
            }
          } else {
            borrowedHandle = holder.$borrowClassHandle(env);
            jniThis = borrowedHandle.value;
          }
          if (!rtype.isCompatible(value)) {
            throw new Error(`Expected value compatible with ${rtype.className}`);
          }
          const jniValue = rtype.toJni(value, env);
          setValue(env.handle, jniThis, id, jniValue);
          env.throwIfExceptionPending();
        } finally {
          if (borrowedHandle !== null) {
            borrowedHandle.unref(env);
          }
          env.popLocalFrame(NULL);
        }
      }
    },
    holder: {
      enumerable: true,
      get() {
        return this._p[0];
      }
    },
    fieldType: {
      enumerable: true,
      get() {
        return this._p[1];
      }
    },
    fieldReturnType: {
      enumerable: true,
      get() {
        return this._p[2];
      }
    },
    toString: {
      enumerable: true,
      value() {
        const inlineString = `Java.Field{holder: ${this.holder}, fieldType: ${this.fieldType}, fieldReturnType: ${this.fieldReturnType}, value: ${this.value}}`;
        if (inlineString.length < 200) {
          return inlineString;
        }
        const multilineString = `Java.Field{
	holder: ${this.holder},
	fieldType: ${this.fieldType},
	fieldReturnType: ${this.fieldReturnType},
	value: ${this.value},
}`;
        return multilineString.split("\n").map((l2) => l2.length > 200 ? l2.slice(0, l2.indexOf(" ") + 1) + "...," : l2).join("\n");
      }
    }
  });
  var DexFile = class _DexFile {
    static fromBuffer(buffer, factory) {
      const fileValue = createTemporaryDex(factory);
      const filePath = fileValue.getCanonicalPath().toString();
      const file = new File(filePath, "w");
      file.write(buffer.buffer);
      file.close();
      setReadOnlyDex(filePath, factory);
      return new _DexFile(filePath, fileValue, factory);
    }
    constructor(path, file, factory) {
      this.path = path;
      this.file = file;
      this._factory = factory;
    }
    load() {
      const { _factory: factory } = this;
      const { codeCacheDir } = factory;
      const DexClassLoader = factory.use("dalvik.system.DexClassLoader");
      const JFile = factory.use("java.io.File");
      let file = this.file;
      if (file === null) {
        file = factory.use("java.io.File").$new(this.path);
      }
      if (!file.exists()) {
        throw new Error("File not found");
      }
      JFile.$new(codeCacheDir).mkdirs();
      factory.loader = DexClassLoader.$new(file.getCanonicalPath(), codeCacheDir, null, factory.loader);
      vm2.preventDetachDueToClassLoader();
    }
    getClassNames() {
      const { _factory: factory } = this;
      const DexFile2 = factory.use("dalvik.system.DexFile");
      const optimizedDex = createTemporaryDex(factory);
      const dx = DexFile2.loadDex(this.path, optimizedDex.getCanonicalPath(), 0);
      const classNames = [];
      const enumeratorClassNames = dx.entries();
      while (enumeratorClassNames.hasMoreElements()) {
        classNames.push(enumeratorClassNames.nextElement().toString());
      }
      return classNames;
    }
  };
  function createTemporaryDex(factory) {
    const { cacheDir, tempFileNaming } = factory;
    const JFile = factory.use("java.io.File");
    const cacheDirValue = JFile.$new(cacheDir);
    cacheDirValue.mkdirs();
    return JFile.createTempFile(tempFileNaming.prefix, tempFileNaming.suffix + ".dex", cacheDirValue);
  }
  function setReadOnlyDex(filePath, factory) {
    const JFile = factory.use("java.io.File");
    const file = JFile.$new(filePath);
    file.setWritable(false, false);
  }
  function getFactoryCache() {
    switch (factoryCache.state) {
      case "empty": {
        factoryCache.state = "pending";
        const defaultFactory = factoryCache.factories[0];
        const HashMap = defaultFactory.use("java.util.HashMap");
        const Integer = defaultFactory.use("java.lang.Integer");
        factoryCache.loaders = HashMap.$new();
        factoryCache.Integer = Integer;
        const loader = defaultFactory.loader;
        if (loader !== null) {
          addFactoryToCache(defaultFactory, loader);
        }
        factoryCache.state = "ready";
        return factoryCache;
      }
      case "pending":
        do {
          Thread.sleep(0.05);
        } while (factoryCache.state === "pending");
        return factoryCache;
      case "ready":
        return factoryCache;
    }
  }
  function addFactoryToCache(factory, loader) {
    const { factories, loaders, Integer } = factoryCache;
    const index = Integer.$new(factories.indexOf(factory));
    loaders.put(loader, index);
    for (let l2 = loader.getParent(); l2 !== null; l2 = l2.getParent()) {
      if (loaders.containsKey(l2)) {
        break;
      }
      loaders.put(l2, index);
    }
  }
  function ignore(threadId) {
    let count = ignoredThreads.get(threadId);
    if (count === void 0) {
      count = 0;
    }
    count++;
    ignoredThreads.set(threadId, count);
  }
  function unignore(threadId) {
    let count = ignoredThreads.get(threadId);
    if (count === void 0) {
      throw new Error(`Thread ${threadId} is not ignored`);
    }
    count--;
    if (count === 0) {
      ignoredThreads.delete(threadId);
    } else {
      ignoredThreads.set(threadId, count);
    }
  }
  function basename(className) {
    return className.slice(className.lastIndexOf(".") + 1);
  }
  function readTypeNames(env, types) {
    const names = [];
    const n2 = env.getArrayLength(types);
    for (let i2 = 0; i2 !== n2; i2++) {
      const t2 = env.getObjectArrayElement(types, i2);
      try {
        names.push(env.getTypeName(t2));
      } finally {
        env.deleteLocalRef(t2);
      }
    }
    return names;
  }
  function makeSourceFileName(className) {
    const tokens = className.split(".");
    return tokens[tokens.length - 1] + ".java";
  }

  // node_modules/frida-java-bridge/index.js
  var jsizeSize4 = 4;
  var pointerSize8 = Process.pointerSize;
  var Runtime = class {
    ACC_PUBLIC = 1;
    ACC_PRIVATE = 2;
    ACC_PROTECTED = 4;
    ACC_STATIC = 8;
    ACC_FINAL = 16;
    ACC_SYNCHRONIZED = 32;
    ACC_BRIDGE = 64;
    ACC_VARARGS = 128;
    ACC_NATIVE = 256;
    ACC_ABSTRACT = 1024;
    ACC_STRICT = 2048;
    ACC_SYNTHETIC = 4096;
    constructor() {
      this.classFactory = null;
      this.ClassFactory = ClassFactory;
      this.vm = null;
      this.api = null;
      this._initialized = false;
      this._apiError = null;
      this._wakeupHandler = null;
      this._pollListener = null;
      this._pendingMainOps = [];
      this._pendingVmOps = [];
      this._cachedIsAppProcess = null;
      try {
        this._tryInitialize();
      } catch (e2) {
      }
    }
    _tryInitialize() {
      if (this._initialized) {
        return true;
      }
      if (this._apiError !== null) {
        throw this._apiError;
      }
      let api2;
      try {
        api2 = api_default();
        this.api = api2;
      } catch (e2) {
        this._apiError = e2;
        throw e2;
      }
      if (api2 === null) {
        return false;
      }
      const vm3 = new VM(api2);
      this.vm = vm3;
      initialize(vm3);
      ClassFactory._initialize(vm3, api2);
      this.classFactory = new ClassFactory();
      this._initialized = true;
      return true;
    }
    _dispose() {
      if (this.api === null) {
        return;
      }
      const { vm: vm3 } = this;
      vm3.perform((env) => {
        ClassFactory._disposeAll(env);
        Env.dispose(env);
      });
      Script.nextTick(() => {
        VM.dispose(vm3);
      });
    }
    get available() {
      return this._tryInitialize();
    }
    get androidVersion() {
      return getAndroidVersion();
    }
    synchronized(obj, fn) {
      const { $h: objHandle = obj } = obj;
      if (!(objHandle instanceof NativePointer)) {
        throw new Error("Java.synchronized: the first argument `obj` must be either a pointer or a Java instance");
      }
      const env = this.vm.getEnv();
      checkJniResult("VM::MonitorEnter", env.monitorEnter(objHandle));
      try {
        fn();
      } finally {
        env.monitorExit(objHandle);
      }
    }
    enumerateLoadedClasses(callbacks) {
      this._checkAvailable();
      const { flavor } = this.api;
      if (flavor === "jvm") {
        this._enumerateLoadedClassesJvm(callbacks);
      } else if (flavor === "art") {
        this._enumerateLoadedClassesArt(callbacks);
      } else {
        this._enumerateLoadedClassesDalvik(callbacks);
      }
    }
    enumerateLoadedClassesSync() {
      const classes = [];
      this.enumerateLoadedClasses({
        onMatch(c2) {
          classes.push(c2);
        },
        onComplete() {
        }
      });
      return classes;
    }
    enumerateClassLoaders(callbacks) {
      this._checkAvailable();
      const { flavor } = this.api;
      if (flavor === "jvm") {
        this._enumerateClassLoadersJvm(callbacks);
      } else if (flavor === "art") {
        this._enumerateClassLoadersArt(callbacks);
      } else {
        throw new Error("Enumerating class loaders is not supported on Dalvik");
      }
    }
    enumerateClassLoadersSync() {
      const loaders = [];
      this.enumerateClassLoaders({
        onMatch(c2) {
          loaders.push(c2);
        },
        onComplete() {
        }
      });
      return loaders;
    }
    _enumerateLoadedClassesJvm(callbacks) {
      const { api: api2, vm: vm3 } = this;
      const { jvmti } = api2;
      const env = vm3.getEnv();
      const countPtr = Memory.alloc(jsizeSize4);
      const classesPtr = Memory.alloc(pointerSize8);
      jvmti.getLoadedClasses(countPtr, classesPtr);
      const count = countPtr.readS32();
      const classes = classesPtr.readPointer();
      const handles = [];
      for (let i2 = 0; i2 !== count; i2++) {
        handles.push(classes.add(i2 * pointerSize8).readPointer());
      }
      jvmti.deallocate(classes);
      try {
        for (const handle of handles) {
          const className = env.getClassName(handle);
          callbacks.onMatch(className, handle);
        }
        callbacks.onComplete();
      } finally {
        handles.forEach((handle) => {
          env.deleteLocalRef(handle);
        });
      }
    }
    _enumerateClassLoadersJvm(callbacks) {
      this.choose("java.lang.ClassLoader", callbacks);
    }
    _enumerateLoadedClassesArt(callbacks) {
      const { vm: vm3, api: api2 } = this;
      const env = vm3.getEnv();
      const addGlobalReference = api2["art::JavaVMExt::AddGlobalRef"];
      const { vm: vmHandle } = api2;
      withRunnableArtThread(vm3, env, (thread) => {
        const collectClassHandles = makeArtClassVisitor((klass) => {
          const handle = addGlobalReference(vmHandle, thread, klass);
          try {
            const className = env.getClassName(handle);
            callbacks.onMatch(className, handle);
          } finally {
            env.deleteGlobalRef(handle);
          }
          return true;
        });
        api2["art::ClassLinker::VisitClasses"](api2.artClassLinker.address, collectClassHandles);
      });
      callbacks.onComplete();
    }
    _enumerateClassLoadersArt(callbacks) {
      const { classFactory: factory, vm: vm3, api: api2 } = this;
      const env = vm3.getEnv();
      const visitClassLoaders = api2["art::ClassLinker::VisitClassLoaders"];
      if (visitClassLoaders === void 0) {
        throw new Error("This API is only available on Android >= 7.0");
      }
      const ClassLoader = factory.use("java.lang.ClassLoader");
      const loaderHandles = [];
      const addGlobalReference = api2["art::JavaVMExt::AddGlobalRef"];
      const { vm: vmHandle } = api2;
      withRunnableArtThread(vm3, env, (thread) => {
        const collectLoaderHandles = makeArtClassLoaderVisitor((loader) => {
          loaderHandles.push(addGlobalReference(vmHandle, thread, loader));
          return true;
        });
        withAllArtThreadsSuspended(() => {
          visitClassLoaders(api2.artClassLinker.address, collectLoaderHandles);
        });
      });
      try {
        loaderHandles.forEach((handle) => {
          const loader = factory.cast(handle, ClassLoader);
          callbacks.onMatch(loader);
        });
      } finally {
        loaderHandles.forEach((handle) => {
          env.deleteGlobalRef(handle);
        });
      }
      callbacks.onComplete();
    }
    _enumerateLoadedClassesDalvik(callbacks) {
      const { api: api2 } = this;
      const HASH_TOMBSTONE = ptr("0xcbcacccd");
      const loadedClassesOffset = 172;
      const hashEntrySize = 8;
      const ptrLoadedClassesHashtable = api2.gDvm.add(loadedClassesOffset);
      const hashTable = ptrLoadedClassesHashtable.readPointer();
      const tableSize = hashTable.readS32();
      const ptrpEntries = hashTable.add(12);
      const pEntries = ptrpEntries.readPointer();
      const end = tableSize * hashEntrySize;
      for (let offset = 0; offset < end; offset += hashEntrySize) {
        const pEntryPtr = pEntries.add(offset);
        const dataPtr = pEntryPtr.add(4).readPointer();
        if (dataPtr.isNull() || dataPtr.equals(HASH_TOMBSTONE)) {
          continue;
        }
        const descriptionPtr = dataPtr.add(24).readPointer();
        const description = descriptionPtr.readUtf8String();
        if (description.startsWith("L")) {
          const name = description.substring(1, description.length - 1).replace(/\//g, ".");
          callbacks.onMatch(name);
        }
      }
      callbacks.onComplete();
    }
    enumerateMethods(query) {
      const { classFactory: factory } = this;
      const env = this.vm.getEnv();
      const ClassLoader = factory.use("java.lang.ClassLoader");
      return Model.enumerateMethods(query, this.api, env).map((group) => {
        const handle = group.loader;
        group.loader = handle !== null ? factory.wrap(handle, ClassLoader, env) : null;
        return group;
      });
    }
    scheduleOnMainThread(fn) {
      this.performNow(() => {
        this._pendingMainOps.push(fn);
        let { _wakeupHandler: wakeupHandler } = this;
        if (wakeupHandler === null) {
          const { classFactory: factory } = this;
          const Handler = factory.use("android.os.Handler");
          const Looper = factory.use("android.os.Looper");
          wakeupHandler = Handler.$new(Looper.getMainLooper());
          this._wakeupHandler = wakeupHandler;
        }
        if (this._pollListener === null) {
          this._pollListener = Interceptor.attach(Process.getModuleByName("libc.so").getExportByName("epoll_wait"), this._makePollHook());
          Interceptor.flush();
        }
        wakeupHandler.sendEmptyMessage(1);
      });
    }
    _makePollHook() {
      const mainThreadId = Process.id;
      const { _pendingMainOps: pending } = this;
      return function() {
        if (this.threadId !== mainThreadId) {
          return;
        }
        let fn;
        while ((fn = pending.shift()) !== void 0) {
          try {
            fn();
          } catch (e2) {
            Script.nextTick(() => {
              throw e2;
            });
          }
        }
      };
    }
    perform(fn) {
      this._checkAvailable();
      if (!this._isAppProcess() || this.classFactory.loader !== null) {
        try {
          this.vm.perform(fn);
        } catch (e2) {
          Script.nextTick(() => {
            throw e2;
          });
        }
      } else {
        this._pendingVmOps.push(fn);
        if (this._pendingVmOps.length === 1) {
          this._performPendingVmOpsWhenReady();
        }
      }
    }
    performNow(fn) {
      this._checkAvailable();
      return this.vm.perform(() => {
        const { classFactory: factory } = this;
        if (this._isAppProcess() && factory.loader === null) {
          const ActivityThread = factory.use("android.app.ActivityThread");
          const app = ActivityThread.currentApplication();
          if (app !== null) {
            initFactoryFromApplication(factory, app);
          }
        }
        return fn();
      });
    }
    _performPendingVmOpsWhenReady() {
      this.vm.perform(() => {
        const { classFactory: factory } = this;
        const ActivityThread = factory.use("android.app.ActivityThread");
        const app = ActivityThread.currentApplication();
        if (app !== null) {
          initFactoryFromApplication(factory, app);
          this._performPendingVmOps();
          return;
        }
        const runtime2 = this;
        let initialized = false;
        let hookpoint = "early";
        const handleBindApplication = ActivityThread.handleBindApplication;
        handleBindApplication.implementation = function(data) {
          if (data.instrumentationName.value !== null) {
            hookpoint = "late";
            const LoadedApk = factory.use("android.app.LoadedApk");
            const makeApplication = LoadedApk.makeApplication;
            makeApplication.implementation = function(forceDefaultAppClass, instrumentation) {
              if (!initialized) {
                initialized = true;
                initFactoryFromLoadedApk(factory, this);
                runtime2._performPendingVmOps();
              }
              return makeApplication.apply(this, arguments);
            };
          }
          handleBindApplication.apply(this, arguments);
        };
        const getPackageInfoCandidates = ActivityThread.getPackageInfo.overloads.map((m2) => [m2.argumentTypes.length, m2]).sort(([arityA], [arityB]) => arityB - arityA).map(([_2, method]) => method);
        const getPackageInfo = getPackageInfoCandidates[0];
        getPackageInfo.implementation = function(...args) {
          const apk = getPackageInfo.call(this, ...args);
          if (!initialized && hookpoint === "early") {
            initialized = true;
            initFactoryFromLoadedApk(factory, apk);
            runtime2._performPendingVmOps();
          }
          return apk;
        };
      });
    }
    _performPendingVmOps() {
      const { vm: vm3, _pendingVmOps: pending } = this;
      let fn;
      while ((fn = pending.shift()) !== void 0) {
        try {
          vm3.perform(fn);
        } catch (e2) {
          Script.nextTick(() => {
            throw e2;
          });
        }
      }
    }
    use(className, options) {
      return this.classFactory.use(className, options);
    }
    openClassFile(filePath) {
      return this.classFactory.openClassFile(filePath);
    }
    choose(specifier, callbacks) {
      this.classFactory.choose(specifier, callbacks);
    }
    retain(obj) {
      return this.classFactory.retain(obj);
    }
    cast(obj, C2) {
      return this.classFactory.cast(obj, C2);
    }
    array(type, elements) {
      return this.classFactory.array(type, elements);
    }
    backtrace(options) {
      return backtrace(this.vm, options);
    }
    // Reference: http://stackoverflow.com/questions/2848575/how-to-detect-ui-thread-on-android
    isMainThread() {
      const Looper = this.classFactory.use("android.os.Looper");
      const mainLooper = Looper.getMainLooper();
      const myLooper = Looper.myLooper();
      if (myLooper === null) {
        return false;
      }
      return mainLooper.$isSameObject(myLooper);
    }
    registerClass(spec) {
      return this.classFactory.registerClass(spec);
    }
    deoptimizeEverything() {
      const { vm: vm3 } = this;
      return deoptimizeEverything(vm3, vm3.getEnv());
    }
    deoptimizeBootImage() {
      const { vm: vm3 } = this;
      return deoptimizeBootImage(vm3, vm3.getEnv());
    }
    deoptimizeMethod(method) {
      const { vm: vm3 } = this;
      return deoptimizeMethod(vm3, vm3.getEnv(), method);
    }
    _checkAvailable() {
      if (!this.available) {
        throw new Error("Java API not available");
      }
    }
    _isAppProcess() {
      let result = this._cachedIsAppProcess;
      if (result === null) {
        if (this.api.flavor === "jvm") {
          result = false;
          this._cachedIsAppProcess = result;
          return result;
        }
        const readlink = new NativeFunction(Module.getGlobalExportByName("readlink"), "pointer", ["pointer", "pointer", "pointer"], {
          exceptions: "propagate"
        });
        const pathname = Memory.allocUtf8String("/proc/self/exe");
        const bufferSize = 1024;
        const buffer = Memory.alloc(bufferSize);
        const size = readlink(pathname, buffer, ptr(bufferSize)).toInt32();
        if (size !== -1) {
          const exe = buffer.readUtf8String(size);
          result = /^\/system\/bin\/app_process/.test(exe);
        } else {
          result = true;
        }
        this._cachedIsAppProcess = result;
      }
      return result;
    }
  };
  function initFactoryFromApplication(factory, app) {
    const Process2 = factory.use("android.os.Process");
    factory.loader = app.getClassLoader();
    if (Process2.myUid() === Process2.SYSTEM_UID.value) {
      factory.cacheDir = "/data/system";
      factory.codeCacheDir = "/data/dalvik-cache";
    } else {
      if ("getCodeCacheDir" in app) {
        factory.cacheDir = app.getCacheDir().getCanonicalPath();
        factory.codeCacheDir = app.getCodeCacheDir().getCanonicalPath();
      } else {
        factory.cacheDir = app.getFilesDir().getCanonicalPath();
        factory.codeCacheDir = app.getCacheDir().getCanonicalPath();
      }
    }
  }
  function initFactoryFromLoadedApk(factory, apk) {
    const JFile = factory.use("java.io.File");
    factory.loader = apk.getClassLoader();
    const dataDir = JFile.$new(apk.getDataDir()).getCanonicalPath();
    factory.cacheDir = dataDir;
    factory.codeCacheDir = dataDir + "/cache";
  }
  var runtime = new Runtime();
  Script.bindWeak(runtime, () => {
    runtime._dispose();
  });
  var frida_java_bridge_default = runtime;

  // <stdin>
  globalThis.Java = frida_java_bridge_default;
})();
