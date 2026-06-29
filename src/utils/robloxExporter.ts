import { RobloxInstance } from '../types';

const materialEnumReverseMap: Record<string, number> = {
  Plastic: 256,
  SmoothPlastic: 272,
  Neon: 288,
  Wood: 512,
  WoodPlanks: 528,
  Marble: 768,
  Slate: 784,
  Concrete: 800,
  Granite: 816,
  Brick: 832,
  Pebble: 848,
  Cobblestone: 864,
  CorrodedMetal: 880,
  DiamondPlate: 896,
  Foil: 912,
  Metal: 928,
  Rust: 1008,
  Grass: 1024,
  Sand: 1040,
  Fabric: 1056,
  Ice: 1072,
  LeafyGrass: 1280,
  Salt: 1296,
  Snow: 1312,
  Mud: 1328,
  Pavement: 1344,
};

const shapeEnumMap: Record<string, number> = {
  Block: 1,
  Ball: 0,
  Cylinder: 2,
};

// Helper to escape XML special characters
function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Convert hex color to XML R, G, B floats
function hexToXmlColor(hex: string): string {
  if (!hex || !hex.startsWith('#')) return '<R>1</R><G>1</G><B>1</B>';
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return `<R>${r}</R><G>${g}</G><B>${b}</B>`;
}

// Generate CFrame XML block from Position and Rotation
function generateCFrameXml(position: { x: number; y: number; z: number } | undefined, rotation: { x: number; y: number; z: number } | undefined): string {
  const pos = position || { x: 0, y: 0, z: 0 };
  const rot = rotation || { x: 0, y: 0, z: 0 };

  const rx = (rot.x * Math.PI) / 180;
  const ry = (rot.y * Math.PI) / 180;
  const rz = (rot.z * Math.PI) / 180;

  const cx = Math.cos(rx), sx = Math.sin(rx);
  const cy = Math.cos(ry), sy = Math.sin(ry);
  const cz = Math.cos(rz), sz = Math.sin(rz);

  // Tait-Bryan angles, ZYX rotation order
  const r00 = cy * cz;
  const r01 = -cy * sz;
  const r02 = sy;
  const r10 = sx * sy * cz + cx * sz;
  const r11 = -sx * sy * sz + cx * cz;
  const r12 = -sx * cy;
  const r20 = -cx * sy * cz + sx * sz;
  const r21 = cx * sy * sz + sx * cz;
  const r22 = cx * cy;

  return `
      <CoordinateFrame name="CFrame">
        <Properties>
          <X>${pos.x}</X>
          <Y>${pos.y}</Y>
          <Z>${pos.z}</Z>
          <R00>${r00}</R00>
          <R01>${r01}</R01>
          <R02>${r02}</R02>
          <R10>${r10}</R10>
          <R11>${r11}</R11>
          <R12>${r12}</R12>
          <R20>${r20}</R20>
          <R21>${r21}</R21>
          <R22>${r22}</R22>
        </Properties>
      </CoordinateFrame>
  `.trim();
}

/**
 * Exports Roblox state instances to a valid Roblox XML string (.rbxlx or .rbxmx format)
 */
export function exportToRobloxXml(
  instances: Record<string, RobloxInstance>,
  selectedId?: string | null,
  isPlace: boolean = true
): string {
  const instancesList = Object.values(instances);

  // Determine what to export as roots
  let roots: RobloxInstance[] = [];

  if (isPlace) {
    // For a whole Place, export the main Services
    // We expect service classes like Workspace, Players, Lighting, etc., to be root services.
    roots = instancesList.filter((inst) => inst.parentId === null);
  } else {
    // For a Model/Selection export:
    if (selectedId && instances[selectedId]) {
      // Export only the selected element
      roots = [instances[selectedId]];
    } else {
      // Fallback: Export everything under Workspace
      roots = instancesList.filter((inst) => inst.parentId === 'Workspace');
      if (roots.length === 0) {
        // If workspace is empty, export everything
        roots = instancesList.filter((inst) => inst.parentId === null);
      }
    }
  }

  // Generate XML for a single instance and its descendants recursively
  const serializeInstance = (inst: RobloxInstance, indentLevel: number): string => {
    const indent = '  '.repeat(indentLevel);
    const props = inst.properties;
    let xml = `${indent}<Item class="${inst.className}" referent="RBX_${inst.id}">\n`;
    xml += `${indent}  <Properties>\n`;

    // Standard Name property
    xml += `${indent}    <string name="Name">${escapeXml(inst.name)}</string>\n`;

    // Map other properties
    Object.entries(props).forEach(([key, val]) => {
      if (key === 'Name' || key === 'ClassName') return;

      if (typeof val === 'boolean') {
        xml += `${indent}    <bool name="${key}">${val}</bool>\n`;
      } else if (typeof val === 'number') {
        if (key === 'Material') {
          const matToken = materialEnumReverseMap[props.Material] ?? 256;
          xml += `${indent}    <token name="Material">${matToken}</token>\n`;
        } else if (key === 'Shape') {
          const shapeToken = shapeEnumMap[props.Shape] ?? 1;
          xml += `${indent}    <token name="shape">${shapeToken}</token>\n`;
        } else {
          xml += `${indent}    <float name="${key}">${val}</float>\n`;
        }
      } else if (typeof val === 'string') {
        if (key === 'Source') {
          xml += `${indent}    <ProtectedString name="Source">${escapeXml(val)}</ProtectedString>\n`;
        } else if (key === 'Color' || key === 'Ambient') {
          xml += `${indent}    <Color3 name="${key}">${hexToXmlColor(val)}</Color3>\n`;
        } else {
          xml += `${indent}    <string name="${key}">${escapeXml(val)}</string>\n`;
        }
      } else if (val && typeof val === 'object') {
        if ('x' in val && 'y' in val && 'z' in val) {
          // Vector3
          xml += `${indent}    <Vector3 name="${key}">\n`;
          xml += `${indent}      <X>${val.x}</X>\n`;
          xml += `${indent}      <Y>${val.y}</Y>\n`;
          xml += `${indent}      <Z>${val.z}</Z>\n`;
          xml += `${indent}    </Vector3>\n`;
        }
      }
    });

    // Special serialization for CFrame representing Position and Rotation for physical objects
    if (inst.className === 'Part' || inst.className === 'SpawnLocation') {
      const pos = props.Position;
      const rot = props.Rotation;
      const cframeXml = generateCFrameXml(pos, rot);
      // Format with indent
      const formattedCFrame = cframeXml.split('\n').map(line => `${indent}    ${line}`).join('\n');
      xml += formattedCFrame + '\n';
    }

    xml += `${indent}  </Properties>\n`;

    // Recursively serialize children
    const children = instancesList.filter((child) => child.parentId === inst.id);
    children.forEach((child) => {
      xml += serializeInstance(child, indentLevel + 2);
    });

    xml += `${indent}</Item>\n`;
    return xml;
  };

  // Build full XML envelope
  let xmlString = '<?xml version="1.0" encoding="utf-8"?>\n';
  xmlString += '<roblox xmlns:xmime="http://www.w3.org/2005/05/xmlmime" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="http://www.roblox.com/roblox.xsd" version="4">\n';
  xmlString += '  <Meta name="ExplicitAutoJoints">true</Meta>\n';
  xmlString += '  <External>null</External>\n';
  xmlString += '  <External>nil</External>\n';

  roots.forEach((root) => {
    xmlString += serializeInstance(root, 1);
  });

  xmlString += '</roblox>';
  return xmlString;
}
