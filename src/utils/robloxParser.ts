/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { decompress } from 'fzstd';
import { RobloxInstance, Vector3, PartMaterial, InstanceClass } from '../types';

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
    const clampedLen = Math.min(len, this.remaining);
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

  // Header parsing (aligned perfectly to offset 14 bytes)
  reader.seek(14);
  const version = reader.Int32;
  const classCount = reader.Int32;
  const instanceCount = reader.Int32;
  reader.skip(8); // reserved

  const classes: Record<number, ClassDef> = {};
  const properties: PropDef[] = [];
  let relations: { instanceIds: number[], parentIds: number[] } | null = null;

  while (reader.remaining > 4) {
    const nameBytes = reader.bytes(4);
    const chunkName = new TextDecoder().decode(nameBytes).replace(/\0/g, '');
    if (!chunkName || chunkName === '') break;

    const compressedLen = reader.Int32;
    const uncompressedLen = reader.Int32;
    reader.Int32; // skip reserved

    const compressedData = reader.bytes(compressedLen);

    let decompressed: Uint8Array;
    if (compressedLen > 0) {
      try {
        decompressed = decompress(compressedData);
      } catch (err) {
        console.warn(`Zstd decompression failed for chunk ${chunkName}:`, err);
        decompressed = new Uint8Array(uncompressedLen);
      }
    } else {
      decompressed = new Uint8Array(0);
    }

    const chunkReader = new BinaryReader(decompressed);

    if (chunkName === 'INST') {
      const typeId = chunkReader.Int32;
      const className = chunkReader.String;
      const category = chunkReader.Uint8;
      const count = chunkReader.Int32;
      const instanceIds: number[] = [];
      for (let i = 0; i < count; i++) {
        instanceIds.push(chunkReader.Int32);
      }
      chunkReader.Uint8; // skip referent type

      classes[typeId] = {
        typeId,
        className,
        category,
        instanceIds,
      };
    } else if (chunkName === 'PROP') {
      const typeId = chunkReader.Int32;
      const propertyName = chunkReader.String;
      const dataType = chunkReader.Uint8;

      const classDef = classes[typeId];
      const count = classDef ? classDef.instanceIds.length : 0;
      const values: any[] = [];

      for (let i = 0; i < count; i++) {
        if (chunkReader.remaining === 0) break;

        let value: any = null;
        switch (dataType) {
          case 0x01: // String
            value = chunkReader.String;
            break;
          case 0x02: // Bool
            value = chunkReader.Uint8 !== 0;
            break;
          case 0x03: // Int32
            value = chunkReader.Int32;
            break;
          case 0x04: // Int64
            value = Number(chunkReader.Float64);
            break;
          case 0x05: // Float32
            value = chunkReader.Float32;
            break;
          case 0x06: // Float64
            value = chunkReader.Float64;
            break;
          case 0x07: // UDim
            value = { scale: chunkReader.Float32, offset: chunkReader.Int32 };
            break;
          case 0x08: // UDim2
            value = {
              scaleX: chunkReader.Float32, scaleY: chunkReader.Float32,
              offsetX: chunkReader.Int32, offsetY: chunkReader.Int32
            };
            break;
          case 0x09: // CFrame
            {
              const rotation: number[] = [];
              for (let r = 0; r < 9; r++) rotation.push(chunkReader.Float32);
              const position = [chunkReader.Float32, chunkReader.Float32, chunkReader.Float32];
              value = { rotation, position };
            }
            break;
          case 0x0A: // Enum
            value = chunkReader.Int32;
            break;
          case 0x0B: // Referent
            value = chunkReader.Int32;
            break;
          case 0x0C: // Vector3
            value = { x: chunkReader.Float32, y: chunkReader.Float32, z: chunkReader.Float32 };
            break;
          case 0x0D: // Vector2
            value = { x: chunkReader.Float32, y: chunkReader.Float32 };
            break;
          case 0x0E: // Color3
            value = { r: chunkReader.Float32, g: chunkReader.Float32, b: chunkReader.Float32 };
            break;
          case 0x10: // Color3uint8
            value = { r: chunkReader.Uint8, g: chunkReader.Uint8, b: chunkReader.Uint8 };
            break;
          case 0x12: // Font
            {
              const family = chunkReader.String;
              const weight = chunkReader.Uint8;
              const style = chunkReader.Uint8;
              const hasCachedFaceId = chunkReader.Uint8;
              const cachedFaceId = hasCachedFaceId ? chunkReader.String : null;
              value = { family, weight, style, cachedFaceId };
            }
            break;
          case 0x1D: // BinaryString
            value = chunkReader.BinaryString;
            break;
          default:
            // safety boundary skip
            break;
        }
        values.push(value);
      }

      properties.push({
        typeId,
        propertyName,
        dataType,
        values,
      });
    } else if (chunkName === 'PRNT') {
      chunkReader.Uint8; // version
      const count = chunkReader.Int32;
      const instanceIds: number[] = [];
      for (let i = 0; i < count; i++) {
        instanceIds.push(chunkReader.Int32);
      }
      const parentIds: number[] = [];
      for (let i = 0; i < count; i++) {
        parentIds.push(chunkReader.Int32);
      }
      relations = { instanceIds, parentIds };
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

  // 4. Map back to RobloxInstance schema
  return Object.values(tempInstances).map((temp) => {
    const mappedProps: any = {};
    const props = temp.properties;

    if (props.Name) mappedProps.Name = props.Name;
    if (props.Anchored !== undefined) mappedProps.Anchored = props.Anchored;
    if (props.CanCollide !== undefined) mappedProps.CanCollide = props.CanCollide;
    if (props.Transparency !== undefined) mappedProps.Transparency = props.Transparency;
    if (props.Reflectance !== undefined) mappedProps.Reflectance = props.Reflectance;
    if (props.Source !== undefined) mappedProps.Source = props.Source;
    if (props.Enabled !== undefined) mappedProps.Enabled = props.Enabled;
    if (props.Brightness !== undefined) mappedProps.Brightness = props.Brightness;
    if (props.TimeOfDay !== undefined) mappedProps.TimeOfDay = props.TimeOfDay;
    if (props.GlobalShadows !== undefined) mappedProps.GlobalShadows = props.GlobalShadows;

    if (props.Size) {
      mappedProps.Size = { x: props.Size.x ?? 4, y: props.Size.y ?? 1, z: props.Size.z ?? 2 };
    }
    if (props.Position) {
      mappedProps.Position = { x: props.Position.x ?? 0, y: props.Position.y ?? 0, z: props.Position.z ?? 0 };
    } else if (props.CFrame && props.CFrame.position) {
      const pos = props.CFrame.position;
      mappedProps.Position = { x: pos[0], y: pos[1], z: pos[2] };
    }

    if (props.Material !== undefined) {
      const materialEnumMap: Record<number, string> = {
        256: 'Plastic',
        512: 'SmoothPlastic',
        272: 'Neon',
        288: 'Wood',
        1056: 'Slate',
        336: 'Glass',
        1264: 'Grass',
        816: 'Brick',
        1040: 'Metal'
      };
      if (typeof props.Material === 'number') {
        mappedProps.Material = materialEnumMap[props.Material] || 'Plastic';
      } else {
        mappedProps.Material = props.Material;
      }
    }

    if (props.Color) {
      if (typeof props.Color === 'object') {
        const r = props.Color.r ?? 0;
        const g = props.Color.g ?? 0;
        const b = props.Color.b ?? 0;
        const toHex = (v: number) => {
          const hex = Math.round(v * 255).toString(16);
          return hex.length === 1 ? '0' + hex : hex;
        };
        mappedProps.Color = '#' + toHex(r) + toHex(g) + toHex(b);
      } else {
        mappedProps.Color = props.Color;
      }
    } else if (props.Color3) {
      const r = props.Color3.r ?? 0;
      const g = props.Color3.g ?? 0;
      const b = props.Color3.b ?? 0;
      const toHex = (v: number) => {
        const hex = Math.round(v * 255).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
      };
      mappedProps.Color = '#' + toHex(r) + toHex(g) + toHex(b);
    } else if (props.Color3uint8) {
      const r = props.Color3uint8.r ?? 0;
      const g = props.Color3uint8.g ?? 0;
      const b = props.Color3uint8.b ?? 0;
      const toHex = (v: number) => {
        const hex = v.toString(16);
        return hex.length === 1 ? '0' + hex : hex;
      };
      mappedProps.Color = '#' + toHex(r) + toHex(g) + toHex(b);
    }

    mappedProps.Rotation = { x: 0, y: 0, z: 0 };

    return {
      id: temp.referentId.toString(),
      name: props.Name || temp.className,
      className: temp.className as InstanceClass,
      parentId: temp.parentId !== null ? temp.parentId.toString() : null,
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
        properties[name] = {
          Position: {
            x: parseFloat(xNode?.textContent || '0'),
            y: parseFloat(yNode?.textContent || '0'),
            z: parseFloat(zNode?.textContent || '0'),
          }
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
      256: 'Plastic',
      512: 'SmoothPlastic',
      272: 'Neon',
      288: 'Wood',
      1056: 'Slate',
      336: 'Glass',
      1264: 'Grass',
      816: 'Brick',
      1040: 'Metal'
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

  mappedProps.Rotation = { x: 0, y: 0, z: 0 };

  const inst: RobloxInstance = {
    id: referent,
    name: properties.Name || className,
    className: className as InstanceClass,
    parentId,
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
