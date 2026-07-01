/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { decompress } from 'fzstd';
import * as lz4js from 'lz4js';
import { RobloxInstance, Vector3, PartMaterial, InstanceClass } from '../types';

function isZstd(data: Uint8Array): boolean {
  return (
    data.length >= 4 &&
    data[0] === 0x28 &&
    data[1] === 0xb5 &&
    data[2] === 0x2f &&
    data[3] === 0xfd
  );
}

/**
 * Binary Reader Helper
 */
class BinaryReader {
  private data: Uint8Array;
  private view: DataView;
  private offset: number;

  constructor(data: Uint8Array) {
    this.data = data;
    this.view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    this.offset = 0;
  }

  get remaining(): number {
    return this.data.length - this.offset;
  }

  skip(bytes: number) {
    this.offset = Math.min(this.data.length, this.offset + bytes);
  }

  get Uint8(): number {
    if (this.offset >= this.data.length) return 0;
    const val = this.data[this.offset];
    this.offset += 1;
    return val;
  }

  get Uint16(): number {
    if (this.offset + 2 > this.data.length) return 0;
    const val = this.view.getUint16(this.offset, true);
    this.offset += 2;
    return val;
  }

  get Int32(): number {
    if (this.offset + 4 > this.data.length) return 0;
    const val = this.view.getInt32(this.offset, true);
    this.offset += 4;
    return val;
  }

  get Uint32(): number {
    if (this.offset + 4 > this.data.length) return 0;
    const val = this.view.getUint32(this.offset, true);
    this.offset += 4;
    return val;
  }

  get Float32(): number {
    if (this.offset + 4 > this.data.length) return 0;
    const val = this.view.getFloat32(this.offset, true);
    this.offset += 4;
    return val;
  }

  get Float64(): number {
    if (this.offset + 8 > this.data.length) return 0;
    const val = this.view.getFloat64(this.offset, true);
    this.offset += 8;
    return val;
  }

  get Int64(): number {
    if (this.offset + 8 > this.data.length) return 0;
    const low = this.view.getInt32(this.offset, true);
    const high = this.view.getInt32(this.offset + 4, true);
    this.offset += 8;
    // Handle sign
    if (high < 0) {
      // Negative: use BigInt for precise calculation, then convert to number
      return Number(BigInt(high) * 0x100000000n + BigInt(low >>> 0));
    }
    return high * 0x100000000 + (low >>> 0);
  }

  get Uint64(): number {
    if (this.offset + 8 > this.data.length) return 0;
    const low = this.view.getUint32(this.offset, true);
    const high = this.view.getUint32(this.offset + 4, true);
    this.offset += 8;
    return high * 0x100000000 + low;
  }

  get String(): string {
    const len = this.Uint32;
    if (len <= 0 || this.offset + len > this.data.length) return '';
    const bytes = this.data.subarray(this.offset, this.offset + len);
    this.offset += len;
    return new TextDecoder().decode(bytes);
  }

  get BinaryString(): Uint8Array {
    const len = this.Uint32;
    if (len <= 0 || this.offset + len > this.data.length) return new Uint8Array(0);
    const bytes = this.data.subarray(this.offset, this.offset + len);
    this.offset += len;
    return bytes;
  }

  bytes(len: number): Uint8Array {
    const safeLen = Number.isFinite(len) ? len : 0;
    const clampedLen = Math.max(0, Math.min(safeLen, this.remaining));
    const bytes = this.data.subarray(this.offset, this.offset + clampedLen);
    this.offset += clampedLen;
    return bytes;
  }

  seek(pos: number) {
    this.offset = Math.min(this.data.length, Math.max(0, pos));
  }

  get pos(): number {
    return this.offset;
  }
}

interface ClassDef {
  typeId: number;
  className: string;
  category: number;
  instanceIds: number[];
}

interface PropDef {
  typeId: number;
  propertyName: string;
  dataType: number;
  values: any[];
}

function decodeInterleaved(src: Uint8Array, count: number, size: number): Uint8Array {
  const expected = count * size;
  const out = new Uint8Array(expected);
  const safe = Math.min(src.length, expected);

  let p = 0;
  for (let byteIndex = 0; byteIndex < size; byteIndex++) {
    for (let itemIndex = 0; itemIndex < count; itemIndex++) {
      const dst = itemIndex * size + byteIndex;
      if (p < safe) out[dst] = src[p++];
    }
  }
  return out;
}

function zigZagDecode64(n: bigint): bigint {
  return (n >> 1n) ^ (-(n & 1n));
}

function readBigEndianUint64(view: DataView, offset: number): bigint {
  const hi = BigInt(view.getUint32(offset, false));
  const lo = BigInt(view.getUint32(offset + 4, false));
  return (hi << 32n) | lo;
}

function bigintToSafeJsValue(v: bigint): number | bigint {
  const max = BigInt(Number.MAX_SAFE_INTEGER);
  const min = BigInt(Number.MIN_SAFE_INTEGER);
  return v <= max && v >= min ? Number(v) : v;
}

function decodeInt64Array(reader: BinaryReader, count: number): Array<number | bigint> {
  const raw = reader.bytes(count * 8);
  const deinterleaved = decodeInterleaved(raw, count, 8);
  const view = new DataView(
    deinterleaved.buffer,
    deinterleaved.byteOffset,
    deinterleaved.byteLength
  );

  const out: Array<number | bigint> = [];
  for (let i = 0; i < count; i++) {
    const encoded = readBigEndianUint64(view, i * 8);
    const decoded = zigZagDecode64(encoded);
    out.push(bigintToSafeJsValue(decoded));
  }
  return out;
}

function decodeBinaryStringArray(reader: BinaryReader, count: number): Uint8Array[] {
  const out: Uint8Array[] = [];
  for (let i = 0; i < count; i++) {
    out.push(reader.BinaryString);
  }
  return out;
}

function parseTagsBlob(tagBytes: Uint8Array): string[] {
  const tagReader = new BinaryReader(tagBytes);
  const tags: string[] = [];

  while (tagReader.remaining > 0) {
    const tagLen = tagReader.Uint8;
    if (tagLen <= 0 || tagLen > tagReader.remaining) break;
    tags.push(new TextDecoder().decode(tagReader.bytes(tagLen)));
  }

  return tags;
}

function zigZagDecode32(n: number): number {
  return (n >>> 1) ^ -(n & 1);
}

function decodeReferentArray(reader: BinaryReader, count: number): number[] {
  const raw = reader.bytes(count * 4);
  const deinterleaved = decodeInterleaved(raw, count, 4);
  const view = new DataView(
    deinterleaved.buffer,
    deinterleaved.byteOffset,
    deinterleaved.byteLength
  );

  const out: number[] = [];
  let last = 0;

  for (let i = 0; i < count; i++) {
    const encoded = view.getUint32(i * 4, false); // big-endian
    const delta = zigZagDecode32(encoded);
    last += delta;
    out.push(last);
  }

  return out;
}

function decodeUint8ArrayValues(reader: BinaryReader, count: number): number[] {
  return Array.from(reader.bytes(count));
}

function decodeBoolArray(reader: BinaryReader, count: number): boolean[] {
  return decodeUint8ArrayValues(reader, count).map(v => v !== 0);
}

function decodeInt32Array(reader: BinaryReader, count: number): number[] {
  const raw = reader.bytes(count * 4);
  const deinterleaved = decodeInterleaved(raw, count, 4);
  const view = new DataView(deinterleaved.buffer, deinterleaved.byteOffset, deinterleaved.byteLength);

  const out: number[] = [];
  for (let i = 0; i < count; i++) {
    const encoded = view.getUint32(i * 4, false); // big-endian
    out.push(zigZagDecode32(encoded));
  }
  return out;
}

function decodeRobloxFloat32Bits(encoded: number): number {
  const rotated = ((encoded >>> 1) | (encoded << 31)) >>> 0;
  const buf = new ArrayBuffer(4);
  const view = new DataView(buf);
  view.setUint32(0, rotated, false);
  return view.getFloat32(0, false);
}

function decodeFloat32Array(reader: BinaryReader, count: number): number[] {
  const raw = reader.bytes(count * 4);
  const deinterleaved = decodeInterleaved(raw, count, 4);
  const view = new DataView(deinterleaved.buffer, deinterleaved.byteOffset, deinterleaved.byteLength);

  const out: number[] = [];
  for (let i = 0; i < count; i++) {
    const encoded = view.getUint32(i * 4, false); // big-endian
    out.push(decodeRobloxFloat32Bits(encoded));
  }
  return out;
}

function decodeColor3uint8Array(reader: BinaryReader, count: number) {
  const rs = reader.bytes(count);
  const gs = reader.bytes(count);
  const bs = reader.bytes(count);

  const out = [];
  for (let i = 0; i < count; i++) {
    out.push({
      r: rs[i] ?? 0,
      g: gs[i] ?? 0,
      b: bs[i] ?? 0,
    });
  }
  return out;
}

function decodeUint32Array(reader: BinaryReader, count: number): number[] {
  const raw = reader.bytes(count * 4);
  const deinterleaved = decodeInterleaved(raw, count, 4);
  const view = new DataView(
    deinterleaved.buffer,
    deinterleaved.byteOffset,
    deinterleaved.byteLength
  );

  const out: number[] = [];
  for (let i = 0; i < count; i++) {
    out.push(view.getUint32(i * 4, false));
  }
  return out;
}

function decodeColor3Array(reader: BinaryReader, count: number) {
  const rs = decodeFloat32Array(reader, count);
  const gs = decodeFloat32Array(reader, count);
  const bs = decodeFloat32Array(reader, count);

  const out = [];
  for (let i = 0; i < count; i++) {
    out.push({ r: rs[i], g: gs[i], b: bs[i] });
  }
  return out;
}

function decodeVector3Array(reader: BinaryReader, count: number) {
  const xs = decodeFloat32Array(reader, count);
  const ys = decodeFloat32Array(reader, count);
  const zs = decodeFloat32Array(reader, count);

  const out = [];
  for (let i = 0; i < count; i++) {
    out.push({ x: xs[i], y: ys[i], z: zs[i] });
  }
  return out;
}

function getPresetMatrix(id: number): number[] {
  if (id === 2) {
    return [1, 0, 0,  0, 1, 0,  0, 0, 1];
  }
  const axes = [
    [1, 0, 0],
    [-1, 0, 0],
    [0, 1, 0],
    [0, -1, 0],
    [0, 0, 1],
    [0, 0, -1]
  ];
  const list: number[][] = [];
  list.push([1, 0, 0,  0, 1, 0,  0, 0, 1]);
  
  for (const c1 of axes) {
    for (const c2 of axes) {
      const dot = c1[0]*c2[0] + c1[1]*c2[1] + c1[2]*c2[2];
      if (dot === 0) {
        const c3 = [
          c1[1]*c2[2] - c1[2]*c2[1],
          c1[2]*c2[0] - c1[0]*c2[2],
          c1[0]*c2[1] - c1[1]*c2[0]
        ];
        const mat = [
          c1[0], c2[0], c3[0],
          c1[1], c2[1], c3[1],
          c1[2], c2[2], c3[2]
        ];
        const isIdentity = mat[0] === 1 && mat[4] === 1 && mat[8] === 1 &&
                           mat[1] === 0 && mat[2] === 0 && mat[3] === 0 &&
                           mat[5] === 0 && mat[6] === 0 && mat[7] === 0;
        if (!isIdentity) {
          list.push(mat);
        }
      }
    }
  }
  const idx = (id - 2) % list.length;
  return list[idx] || [1, 0, 0,  0, 1, 0,  0, 0, 1];
}

const CFRAME_EULER_BY_ID: Record<number, { x: number; y: number; z: number }> = {
  0x02: { x:   0, y:    0, z:   0 },
  0x03: { x:  90, y:    0, z:   0 },
  0x05: { x:   0, y:  180, z: 180 },
  0x06: { x: -90, y:    0, z:   0 },
  0x07: { x:   0, y:  180, z:  90 },
  0x09: { x:   0, y:   90, z:  90 },
  0x0a: { x:   0, y:    0, z:  90 },
  0x0c: { x:   0, y:  -90, z:  90 },
  0x0d: { x: -90, y:  -90, z:   0 },
  0x0e: { x:   0, y:  -90, z:   0 },
  0x10: { x:  90, y:  -90, z:   0 },
  0x11: { x:   0, y:   90, z: 180 },

  0x14: { x:   0, y:  180, z:   0 },
  0x15: { x: -90, y: -180, z:   0 },
  0x17: { x:   0, y:    0, z: 180 },
  0x18: { x:  90, y:  180, z:   0 },
  0x19: { x:   0, y:    0, z: -90 },
  0x1b: { x:   0, y:  -90, z: -90 },
  0x1c: { x:   0, y: -180, z: -90 },
  0x1e: { x:   0, y:   90, z: -90 },
  0x1f: { x:  90, y:   90, z:   0 },
  0x20: { x:   0, y:   90, z:   0 },
  0x22: { x: -90, y:   90, z:   0 },
  0x23: { x:   0, y:  -90, z: 180 },
};

function decodeCFrameArray(reader: BinaryReader, count: number) {
  const rotations: number[][] = [];
  const eulers: ({ x: number; y: number; z: number } | null)[] = [];
  const orientationIds: number[] = [];

  for (let i = 0; i < count; i++) {
    const orientationId = reader.Uint8;
    orientationIds.push(orientationId);

    if (orientationId === 0) {
      const rotation: number[] = [];
      for (let r = 0; r < 9; r++) {
        rotation.push(reader.Float32); // raw IEEE-754 little-endian
      }
      rotations.push(rotation);
      eulers.push(null);
    } else {
      rotations.push([]); // 不再放可能錯誤的 preset matrix
      eulers.push(CFRAME_EULER_BY_ID[orientationId] ?? { x: 0, y: 0, z: 0 });
    }
  }

  const xs = decodeFloat32Array(reader, count);
  const ys = decodeFloat32Array(reader, count);
  const zs = decodeFloat32Array(reader, count);

  const out = [];
  for (let i = 0; i < count; i++) {
    out.push({
      position: [xs[i], ys[i], zs[i]],
      rotation: rotations[i],
      orientationId: orientationIds[i],
      euler: eulers[i],
    });
  }
  return out;
}

function decodePropValues(reader: BinaryReader, dataType: number, count: number): any[] {
  switch (dataType) {
    case 0x01: { // String
      const out: string[] = [];
      for (let i = 0; i < count; i++) out.push(reader.String);
      return out;
    }

    case 0x02: // Bool
      return decodeBoolArray(reader, count);

    case 0x03: // Int32
      return decodeInt32Array(reader, count);

    case 0x04: // Float32
      return decodeFloat32Array(reader, count);

    case 0x05: { // Float64
      const out: number[] = [];
      for (let i = 0; i < count; i++) out.push(reader.Float64);
      return out;
    }

    case 0x06: { // UDim
      const scales = decodeFloat32Array(reader, count);
      const offsets = decodeInt32Array(reader, count);
      const out = [];
      for (let i = 0; i < count; i++) {
        out.push({ scale: scales[i], offset: offsets[i] });
      }
      return out;
    }

    case 0x07: { // UDim2
      const scaleXs = decodeFloat32Array(reader, count);
      const scaleYs = decodeFloat32Array(reader, count);
      const offsetXs = decodeInt32Array(reader, count);
      const offsetYs = decodeInt32Array(reader, count);
      const out = [];
      for (let i = 0; i < count; i++) {
        out.push({
          scaleX: scaleXs[i],
          scaleY: scaleYs[i],
          offsetX: offsetXs[i],
          offsetY: offsetYs[i],
        });
      }
      return out;
    }

    case 0x0B: // BrickColor
      return decodeUint32Array(reader, count);

    case 0x0C: // Color3
      return decodeColor3Array(reader, count);

    case 0x0D: { // Vector2
      const xs = decodeFloat32Array(reader, count);
      const ys = decodeFloat32Array(reader, count);
      const out = [];
      for (let i = 0; i < count; i++) {
        out.push({ x: xs[i], y: ys[i] });
      }
      return out;
    }

    case 0x0E: // Vector3
      return decodeVector3Array(reader, count);

    case 0x10: // CFrame
      return decodeCFrameArray(reader, count);

    case 0x12: // Enum
      return decodeUint32Array(reader, count);

    case 0x13: // Referent
      return decodeReferentArray(reader, count);

    case 0x19: { // PhysicalProperties
      const out = [];
      for (let i = 0; i < count; i++) {
        const flags = reader.Uint8;
        const isCustom = (flags & 0x01) !== 0;
        const hasAcoustic = (flags & 0x02) !== 0;

        if (!isCustom) {
          out.push({
            custom: false,
            acousticAbsorption: hasAcoustic ? 1.0 : undefined,
          });
          continue;
        }

        const density = reader.Float32;
        const friction = reader.Float32;
        const elasticity = reader.Float32;
        const frictionWeight = reader.Float32;
        const elasticityWeight = reader.Float32;
        const acousticAbsorption = hasAcoustic ? reader.Float32 : 1.0;

        out.push({
          custom: true,
          density,
          friction,
          elasticity,
          frictionWeight,
          elasticityWeight,
          acousticAbsorption,
        });
      }
      return out;
    }

    case 0x1A: // Color3uint8
      return decodeColor3uint8Array(reader, count);

    case 0x1B: // Int64
      return decodeInt64Array(reader, count);

    case 0x20: { // Font
      const out = [];
      for (let i = 0; i < count; i++) {
        const family = reader.String;
        const weight = reader.Uint16;
        const style = reader.Uint8;
        const cachedFaceId = reader.String;
        out.push({
          family,
          weight,
          style,
          cachedFaceId: cachedFaceId || null,
        });
      }
      return out;
    }

    case 0x21: { // AttributesSerialize
      const out = [];
      for (let i = 0; i < count; i++) {
        const totalSize = reader.Int32;
        if (totalSize <= 0 || totalSize > reader.remaining) {
          out.push({});
        } else {
          const attrBytes = reader.bytes(totalSize);
          out.push({ _raw: Array.from(attrBytes) });
        }
      }
      return out;
    }

    case 0x29: { // Tags
      const out = [];
      for (let i = 0; i < count; i++) {
        const totalSize = reader.Int32;
        if (totalSize <= 0 || totalSize > reader.remaining) {
          out.push([]);
        } else {
          const tagBytes = reader.bytes(totalSize);
          const tagReader = new BinaryReader(tagBytes);
          const tags: string[] = [];
          while (tagReader.remaining > 0) {
            const tagLen = tagReader.Uint8;
            if (tagLen <= 0 || tagLen > tagReader.remaining) break;
            tags.push(new TextDecoder().decode(tagReader.bytes(tagLen)));
          }
          out.push(tags);
        }
      }
      return out;
    }

    default:
      console.warn(`Unhandled property data type 0x${dataType.toString(16)}`);
      return new Array(count).fill(null);
  }
}

/**
 * Parses Roblox Binary Format (.rbxm / .rbxl)
 */
export function parseRobloxBinary(arrayBuffer: ArrayBuffer): RobloxInstance[] {
  const data = new Uint8Array(arrayBuffer);
  const reader = new BinaryReader(data);

  // Magic validation
  const magic = new TextDecoder().decode(data.subarray(0, 8));
  if (magic !== '<roblox!') {
    throw new Error('Not a valid Roblox binary file (invalid magic).');
  }

  // Header parsing (aligned perfectly to offset 16 bytes)
  reader.seek(16);
  const classCount = reader.Uint32;
  const instanceCount = reader.Uint32;
  reader.skip(8); // reserved

  console.log('header', { classCount, instanceCount });

  const classes: Record<number, ClassDef> = {};
  const properties: PropDef[] = [];
  let relations: { instanceIds: number[], parentIds: number[] } | null = null;

  while (reader.remaining > 4) {
    const nameBytes = reader.bytes(4);
    const chunkName = new TextDecoder().decode(nameBytes).replace(/\0/g, '');
    if (!chunkName || chunkName === '') break;

    const compressedLen = reader.Uint32;
    const uncompressedLen = reader.Uint32;
    reader.Int32; // skip reserved

    let decompressed: Uint8Array;
    if (compressedLen === 0) {
      decompressed = reader.bytes(uncompressedLen);
    } else {
      const compressedData = reader.bytes(compressedLen);
      if (isZstd(compressedData)) {
        try {
          decompressed = decompress(compressedData);
        } catch (err) {
          console.warn(`Zstd decompression failed for chunk ${chunkName}:`, err);
          decompressed = new Uint8Array(uncompressedLen);
        }
      } else {
        try {
          const out = new Uint8Array(uncompressedLen);
          const wrote = lz4js.decompressBlock(
            compressedData,
            out,
            0,
            compressedData.length,
            0
          );

          if (wrote < 0) {
            throw new Error(`LZ4 returned ${wrote}`);
          }

          decompressed = wrote === uncompressedLen ? out : out.subarray(0, wrote);
        } catch (err) {
          console.warn(`LZ4 decompression failed for chunk ${chunkName}, using raw fallback:`, err);
          decompressed = compressedData;
        }
      }
    }

    const chunkReader = new BinaryReader(decompressed);

    if (chunkName === 'INST') {
      const typeId = chunkReader.Int32;
      const className = chunkReader.String;
      const objectFormat = chunkReader.Uint8;
      const count = chunkReader.Int32;

      const instanceIds = decodeReferentArray(chunkReader, count);

      if (objectFormat === 1 && chunkReader.remaining >= count) {
        chunkReader.bytes(count); // markers/services
      }

      console.log('INST', {
        typeId,
        className,
        objectFormat,
        count,
        instanceIds,
      });

      classes[typeId] = {
        typeId,
        className,
        category: objectFormat,
        instanceIds,
      };
    } else if (chunkName === 'PROP') {
      const typeId = chunkReader.Int32;
      const propertyName = chunkReader.String;
      const dataType = chunkReader.Uint8;

      const classDef = classes[typeId];
      const count = classDef ? classDef.instanceIds.length : 0;

      let values: any[];

      if (propertyName === 'AttributesSerialize' && dataType === 0x01) {
        values = decodeBinaryStringArray(chunkReader, count).map(bytes => ({
          _raw: Array.from(bytes),
        }));
      } else if (propertyName === 'Tags' && dataType === 0x01) {
        values = decodeBinaryStringArray(chunkReader, count).map(parseTagsBlob);
      } else {
        values = decodePropValues(chunkReader, dataType, count);
      }

      console.log('PROP', {
        className: classDef?.className,
        propertyName,
        dataType,
        count,
        sample: values.slice(0, 5),
      });

      properties.push({
        typeId,
        propertyName,
        dataType,
        values,
      });
    } else if (chunkName === 'PRNT') {
      const version = chunkReader.Uint8;
      const count = chunkReader.Int32;

      const childIds = decodeReferentArray(chunkReader, count);
      const parentIds = decodeReferentArray(chunkReader, count);

      relations = { instanceIds: childIds, parentIds };
      console.log('PRNT', relations);
    } else if (chunkName === 'END') {
      break;
    }
  }

  const tempInstances: Record<number, {
    referentId: number;
    className: string;
    properties: Record<string, any>;
    parentId: number | null;
  }> = {};

  // 1. Initialize objects
  Object.values(classes).forEach((classDef) => {
    classDef.instanceIds.forEach((id) => {
      tempInstances[id] = {
        referentId: id,
        className: classDef.className,
        properties: {},
        parentId: null,
      };
    });
  });

  // 2. Load properties
  properties.forEach((prop) => {
    const classDef = classes[prop.typeId];
    if (!classDef) return;

    classDef.instanceIds.forEach((id, index) => {
      const inst = tempInstances[id];
      if (inst && index < prop.values.length) {
        inst.properties[prop.propertyName] = prop.values[index];
      }
    });
  });

  // 3. Parental relationship link
  if (relations) {
    for (let i = 0; i < relations.instanceIds.length; i++) {
      const childId = relations.instanceIds[i];
      const parentId = relations.parentIds[i];
      const child = tempInstances[childId];
      if (child) {
        child.parentId = parentId >= 0 ? parentId : null;
      }
    }
  }

  const parseColorToHex = (colorObj: any): string | undefined => {
    if (!colorObj) return undefined;
    if (typeof colorObj === 'string') return colorObj;
    if (typeof colorObj === 'object') {
      const r = colorObj.r ?? 0;
      const g = colorObj.g ?? 0;
      const b = colorObj.b ?? 0;
      // Auto-detect: if any value > 1, it's uint8 range (0-255)
      const isUint8 = r > 1 || g > 1 || b > 1;
      const toHex = (v: number) => {
        const val = isUint8 ? Math.round(v) : Math.round(v * 255);
        const hex = Math.max(0, Math.min(255, val)).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
      };
      return '#' + toHex(r) + toHex(g) + toHex(b);
    }
    return undefined;
  };

  const materialEnumMap: Record<number, string> = {
    256:  'Plastic',
    272:  'Neon',
    288:  'Wood',
    304:  'WoodPlanks',
    336:  'Glass',
    352:  'Asphalt',
    368:  'Concrete',
    384:  'Granite',
    400:  'Marble',
    416:  'Sand',
    432:  'Fabric',
    448:  'DiamondPlate',
    464:  'Foil',
    480:  'Ice',
    512:  'SmoothPlastic',
    528:  'Brick',
    544:  'Cobblestone',
    560:  'Sand',
    784:  'Metal',
    816:  'Brick',
    1040: 'Metal',
    1056: 'Slate',
    1264: 'Grass',
    1280: 'LeafyGrass',
    1296: 'Salt',
    1312: 'Snow',
    1328: 'Mud',
    1344: 'Pavement',
  };

  function pickProp(obj: Record<string, any>, ...names: string[]) {
    for (const name of names) {
      if (obj[name] !== undefined) return obj[name];
    }
    return undefined;
  }

  // 4. Map back to RobloxInstance schema
  return Object.values(tempInstances).map((temp) => {
    const mappedProps: any = {};
    const props = temp.properties;

    const nameProp = pickProp(props, 'Name', 'name');
    if (nameProp !== undefined) mappedProps.Name = nameProp;

    const anchoredProp = pickProp(props, 'Anchored', 'anchored');
    if (anchoredProp !== undefined) mappedProps.Anchored = anchoredProp;

    const canCollideProp = pickProp(props, 'CanCollide', 'canCollide');
    if (canCollideProp !== undefined) mappedProps.CanCollide = canCollideProp;

    const transparencyProp = pickProp(props, 'Transparency', 'transparency');
    if (transparencyProp !== undefined) mappedProps.Transparency = transparencyProp;

    const reflectanceProp = pickProp(props, 'Reflectance', 'reflectance');
    if (reflectanceProp !== undefined) mappedProps.Reflectance = reflectanceProp;

    const sourceProp = pickProp(props, 'Source', 'source');
    if (sourceProp !== undefined) {
      if (sourceProp instanceof Uint8Array) {
        mappedProps.Source = new TextDecoder().decode(sourceProp);
      } else {
        mappedProps.Source = sourceProp;
      }
    }

    const enabledProp = pickProp(props, 'Enabled', 'enabled');
    if (enabledProp !== undefined) mappedProps.Enabled = enabledProp;

    const brightnessProp = pickProp(props, 'Brightness', 'brightness');
    if (brightnessProp !== undefined) mappedProps.Brightness = brightnessProp;

    const timeOfDayProp = pickProp(props, 'TimeOfDay', 'timeOfDay');
    if (timeOfDayProp !== undefined) mappedProps.TimeOfDay = timeOfDayProp;

    const globalShadowsProp = pickProp(props, 'GlobalShadows', 'globalShadows');
    if (globalShadowsProp !== undefined) mappedProps.GlobalShadows = globalShadowsProp;

    const sizeProp = pickProp(props, 'Size', 'size');
    if (sizeProp) {
      mappedProps.Size = { x: sizeProp.x ?? 4, y: sizeProp.y ?? 1, z: sizeProp.z ?? 2 };
    }

    const positionProp = pickProp(props, 'Position', 'position');
    const cframeProp = pickProp(props, 'CFrame', 'cframe');

    if (positionProp) {
      mappedProps.Position = { x: positionProp.x ?? 0, y: positionProp.y ?? 0, z: positionProp.z ?? 0 };
    } else if (cframeProp && cframeProp.position) {
      const pos = cframeProp.position;
      mappedProps.Position = { x: pos[0], y: pos[1], z: pos[2] };
    }

    const materialProp = props.Material ?? props.material;
    if (materialProp !== undefined) {
      if (typeof materialProp === 'number') {
        mappedProps.Material = materialEnumMap[materialProp] || 'Plastic';
      } else {
        mappedProps.Material = materialProp;
      }
    }

    const parsedColor = parseColorToHex(
      props.Color ?? props.color ??
      props.Color3 ?? props.color3 ??
      props.Color3uint8 ?? props.color3uint8
    );
    if (parsedColor) {
      mappedProps.Color = parsedColor;
    }

    // Extract Euler angles ZYX order from CFrame rotation matrix or use preset Euler
    if (cframeProp?.euler) {
      mappedProps.Rotation = cframeProp.euler;
    } else if (cframeProp?.rotation && cframeProp.rotation.length === 9) {
      const r = cframeProp.rotation; // 9 floats (3x3 matrix)
      const sinY = Math.max(-1, Math.min(1, -r[6]));
      const angleY = Math.asin(sinY);
      const angleX = Math.atan2(r[7], r[8]);
      const angleZ = Math.atan2(r[3], r[0]);
      mappedProps.Rotation = {
        x: Number.isNaN(angleX) ? 0 : (angleX * 180) / Math.PI,
        y: Number.isNaN(angleY) ? 0 : (angleY * 180) / Math.PI,
        z: Number.isNaN(angleZ) ? 0 : (angleZ * 180) / Math.PI,
      };
    } else {
      mappedProps.Rotation = { x: 0, y: 0, z: 0 };
    }

    return {
      id: temp.referentId.toString(),
      name: nameProp || temp.className,
      className: temp.className as InstanceClass,
      parentId: temp.parentId !== null ? temp.parentId.toString() : null,
      rawProperties: props,
      properties: mappedProps,
    };
  });
}

/**
 * Parses Roblox XML Format (.rbxmx / .rbxlx)
 */
function parseXmlItem(element: Element, parentId: string | null): RobloxInstance[] {
  const className = element.getAttribute('class') || 'Folder';
  const referent = element.getAttribute('referent') || Math.random().toString(36).substring(7);

  const properties: Record<string, any> = {};
  const propElement = element.querySelector(':scope > Properties');

  if (propElement) {
    const childProps = propElement.children;
    for (let i = 0; i < childProps.length; i++) {
      const propNode = childProps[i];
      const name = propNode.getAttribute('name');
      if (!name) continue;

      const tagName = propNode.tagName.toLowerCase();
      if (tagName === 'string' || tagName === 'protectedstring') {
        properties[name] = propNode.textContent || '';
      } else if (tagName === 'bool') {
        properties[name] = propNode.textContent?.trim().toLowerCase() === 'true';
      } else if (tagName === 'float' || tagName === 'double' || tagName === 'int' || tagName === 'int64') {
        properties[name] = parseFloat(propNode.textContent || '0');
      } else if (tagName === 'vector3') {
        const xNode = propNode.querySelector('X');
        const yNode = propNode.querySelector('Y');
        const zNode = propNode.querySelector('Z');
        properties[name] = {
          x: parseFloat(xNode?.textContent || '0'),
          y: parseFloat(yNode?.textContent || '0'),
          z: parseFloat(zNode?.textContent || '0'),
        };
      } else if (tagName === 'coordinateframe' || tagName === 'cframe') {
        const xNode = propNode.querySelector('X');
        const yNode = propNode.querySelector('Y');
        const zNode = propNode.querySelector('Z');
        
        const rotation: number[] = [];
        for (let ri = 0; ri < 3; ri++) {
          for (let rj = 0; rj < 3; rj++) {
            const rNode = propNode.querySelector(`R${ri}${rj}`);
            rotation.push(parseFloat(rNode?.textContent || '0'));
          }
        }

        properties[name] = {
          Position: {
            x: parseFloat(xNode?.textContent || '0'),
            y: parseFloat(yNode?.textContent || '0'),
            z: parseFloat(zNode?.textContent || '0'),
          },
          rotation,
        };
      } else if (tagName === 'color3' || tagName === 'color3uint8') {
        const rNode = propNode.querySelector('R');
        const gNode = propNode.querySelector('G');
        const bNode = propNode.querySelector('B');

        let r = parseFloat(rNode?.textContent || '0');
        let g = parseFloat(gNode?.textContent || '0');
        let b = parseFloat(bNode?.textContent || '0');

        if (tagName === 'color3uint8' || r > 1 || g > 1 || b > 1) {
          r = Math.min(255, Math.max(0, r)) / 255;
          g = Math.min(255, Math.max(0, g)) / 255;
          b = Math.min(255, Math.max(0, b)) / 255;
        }

        const toHex = (val: number) => {
          const hex = Math.round(val * 255).toString(16);
          return hex.length === 1 ? '0' + hex : hex;
        };
        properties[name] = '#' + toHex(r) + toHex(g) + toHex(b);
      } else if (tagName === 'token') {
        properties[name] = parseInt(propNode.textContent || '0', 10);
      }
    }
  }

  const mappedProps: any = {};
  if (properties.Name) mappedProps.Name = properties.Name;
  if (properties.Anchored !== undefined) mappedProps.Anchored = properties.Anchored;
  if (properties.CanCollide !== undefined) mappedProps.CanCollide = properties.CanCollide;
  if (properties.Transparency !== undefined) mappedProps.Transparency = properties.Transparency;
  if (properties.Reflectance !== undefined) mappedProps.Reflectance = properties.Reflectance;
  if (properties.Source !== undefined) mappedProps.Source = properties.Source;
  if (properties.Enabled !== undefined) mappedProps.Enabled = properties.Enabled;
  if (properties.Brightness !== undefined) mappedProps.Brightness = properties.Brightness;
  if (properties.TimeOfDay !== undefined) mappedProps.TimeOfDay = properties.TimeOfDay;
  if (properties.GlobalShadows !== undefined) mappedProps.GlobalShadows = properties.GlobalShadows;

  if (properties.Material !== undefined) {
    const materialEnumMap: Record<number, string> = {
      256:  'Plastic',
      272:  'Neon',
      288:  'Wood',
      304:  'WoodPlanks',
      336:  'Glass',
      352:  'Asphalt',
      368:  'Concrete',
      384:  'Granite',
      400:  'Marble',
      416:  'Sand',
      432:  'Fabric',
      448:  'DiamondPlate',
      464:  'Foil',
      480:  'Ice',
      512:  'SmoothPlastic',
      528:  'Brick',
      544:  'Cobblestone',
      560:  'Sand',
      784:  'Metal',
      816:  'Brick',
      1040: 'Metal',
      1056: 'Slate',
      1264: 'Grass',
      1280: 'LeafyGrass',
      1296: 'Salt',
      1312: 'Snow',
      1328: 'Mud',
      1344: 'Pavement',
    };
    if (typeof properties.Material === 'number') {
      mappedProps.Material = materialEnumMap[properties.Material] || 'Plastic';
    } else {
      mappedProps.Material = properties.Material;
    }
  }

  if (properties.Size) {
    mappedProps.Size = properties.Size;
  }
  if (properties.Position) {
    mappedProps.Position = properties.Position;
  } else if (properties.CFrame && properties.CFrame.Position) {
    mappedProps.Position = properties.CFrame.Position;
  }

  if (properties.Color) {
    mappedProps.Color = properties.Color;
  } else if (properties.Color3) {
    mappedProps.Color = properties.Color3;
  } else if (properties.Color3uint8) {
    mappedProps.Color = properties.Color3uint8;
  }

  // Extract Euler angles ZYX order from CFrame rotation matrix for XML
  if (properties.CFrame && properties.CFrame.rotation && properties.CFrame.rotation.length === 9) {
    const r = properties.CFrame.rotation; // 9 floats (3x3 matrix)
    const sinY = Math.max(-1, Math.min(1, -r[6]));
    const angleY = Math.asin(sinY);
    const angleX = Math.atan2(r[7], r[8]);
    const angleZ = Math.atan2(r[3], r[0]);
    mappedProps.Rotation = {
      x: Number.isNaN(angleX) ? 0 : (angleX * 180) / Math.PI,
      y: Number.isNaN(angleY) ? 0 : (angleY * 180) / Math.PI,
      z: Number.isNaN(angleZ) ? 0 : (angleZ * 180) / Math.PI,
    };
  } else {
    mappedProps.Rotation = { x: 0, y: 0, z: 0 };
  }

  const inst: RobloxInstance = {
    id: referent,
    name: properties.Name || className,
    className: className as InstanceClass,
    parentId,
    rawProperties: properties,
    properties: mappedProps,
  };

  const results = [inst];

  const childItems = element.querySelectorAll(':scope > Item');
  for (let i = 0; i < childItems.length; i++) {
    const childEl = childItems[i];
    results.push(...parseXmlItem(childEl, referent));
  }

  return results;
}

export function parseRobloxXml(xmlText: string): RobloxInstance[] {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
  const root = xmlDoc.documentElement;

  if (root.tagName !== 'roblox') {
    throw new Error('Not a valid Roblox XML file (invalid root tag).');
  }

  const results: RobloxInstance[] = [];
  const rootItems = root.querySelectorAll(':scope > Item');

  for (let i = 0; i < rootItems.length; i++) {
    results.push(...parseXmlItem(rootItems[i], null));
  }

  return results;
}

/**
 * Universal Parser Entrypoint
 */
export function parseRobloxFile(data: ArrayBuffer | string): {
  instances: RobloxInstance[];
  isPlace: boolean;
} {
  let parsed: RobloxInstance[] = [];

  if (typeof data === 'string') {
    // text XML
    parsed = parseRobloxXml(data);
  } else {
    // binary bytes OR XML as string
    const uint8 = new Uint8Array(data);
    const textStart = new TextDecoder().decode(uint8.subarray(0, 100));

    if (textStart.startsWith('<roblox!')) {
      parsed = parseRobloxBinary(data);
    } else if (textStart.includes('<roblox')) {
      const fullText = new TextDecoder().decode(uint8);
      parsed = parseRobloxXml(fullText);
    } else {
      throw new Error('Unsupported Roblox format. Must be binary rbxm/rbxl or XML rbxmx/rbxlx.');
    }
  }

  // Determine if it looks like a place (rbxl contains standard root service containers like DataModel or Workspace/Lighting/etc)
  const isPlace = parsed.some(
    (inst) =>
      inst.className === 'Workspace' ||
      inst.className === 'Lighting' ||
      inst.className === 'Players'
  );

  return { instances: parsed, isPlace };
}
