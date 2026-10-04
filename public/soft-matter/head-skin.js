(function installVinylHeadSkin() {
  const HEAD_SRC = "/soft-matter/vinyl-head.glb?v=1";

  function readGlbMesh(buffer) {
    const data = new DataView(buffer);
    if (data.getUint32(0, true) !== 0x46546c67) {
      throw new Error("Not a GLB file.");
    }

    let offset = 12;
    let json = null;
    let bin = null;
    while (offset + 8 <= buffer.byteLength) {
      const length = data.getUint32(offset, true);
      const type = String.fromCharCode(
        data.getUint8(offset + 4),
        data.getUint8(offset + 5),
        data.getUint8(offset + 6),
        data.getUint8(offset + 7),
      ).replace(/\0/g, "");
      const start = offset + 8;
      const bytes = new Uint8Array(buffer, start, length);
      if (type === "JSON") {
        json = JSON.parse(new TextDecoder().decode(bytes));
      } else if (type === "BIN") {
        bin = bytes;
      }
      offset = start + length;
    }

    if (!json || !bin) {
      throw new Error("GLB is missing JSON or BIN.");
    }

    const primitive = json.meshes[0].primitives[0];

    const readAccessor = (index) => {
      const accessor = json.accessors[index];
      const view = json.bufferViews[accessor.bufferView];
      const componentSize = { 5123: 2, 5125: 4, 5126: 4 }[accessor.componentType];
      const components = { SCALAR: 1, VEC2: 2, VEC3: 3 }[accessor.type];
      const stride = view.byteStride || componentSize * components;
      const start = (view.byteOffset || 0) + (accessor.byteOffset || 0);
      const values = [];
      for (let i = 0; i < accessor.count; i += 1) {
        const at = start + i * stride;
        for (let c = 0; c < components; c += 1) {
          const pos = at + c * componentSize;
          if (accessor.componentType === 5126) {
            values.push(data.getFloat32(bin.byteOffset + pos, true));
          } else if (accessor.componentType === 5125) {
            values.push(data.getUint32(bin.byteOffset + pos, true));
          } else {
            values.push(data.getUint16(bin.byteOffset + pos, true));
          }
        }
      }
      return values;
    };

    return {
      positions: new Float32Array(readAccessor(primitive.attributes.POSITION)),
      indices: new Uint32Array(readAccessor(primitive.indices)),
    };
  }

  function createHeadGeometry(THREE, dims, mesh) {
    const positions = mesh.positions.slice();
    let minX = Infinity;
    let minY = Infinity;
    let minZ = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    let maxZ = -Infinity;
    for (let i = 0; i < positions.length; i += 3) {
      minX = Math.min(minX, positions[i]);
      maxX = Math.max(maxX, positions[i]);
      minY = Math.min(minY, positions[i + 1]);
      maxY = Math.max(maxY, positions[i + 1]);
      minZ = Math.min(minZ, positions[i + 2]);
      maxZ = Math.max(maxZ, positions[i + 2]);
    }

    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const cz = (minZ + maxZ) / 2;
    const scale =
      Math.min(dims.width / (maxX - minX), dims.height / (maxY - minY), dims.depth / (maxZ - minZ)) *
      0.98;

    for (let i = 0; i < positions.length; i += 3) {
      const x = (positions[i] - cx) * scale;
      const y = (positions[i + 1] - cy) * scale;
      const z = (positions[i + 2] - cz) * scale;
      positions[i] = z;
      positions[i + 1] = y;
      positions[i + 2] = -x;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    const IndexArray = mesh.indices.length > 65535 ? Uint32Array : Uint16Array;
    geometry.setIndex(new THREE.BufferAttribute(new IndexArray(mesh.indices), 1));
    return geometry;
  }

  let meshPromise = null;

  window.installHeaderHead = function installHeaderHead() {
    if (window.__headerHeadGeometry) {
      return Promise.resolve(true);
    }

    if (!meshPromise) {
      meshPromise = fetch(HEAD_SRC)
        .then((response) => {
          if (!response.ok) {
            throw new Error("Vinyl head failed to load.");
          }
          return response.arrayBuffer();
        })
        .then((buffer) => {
          const mesh = readGlbMesh(buffer);
          window.__headerHeadGeometry = function headerHeadGeometry(THREE, dims) {
            return createHeadGeometry(THREE, dims, mesh);
          };
          return true;
        })
        .catch(() => false);
    }

    return meshPromise;
  };
})();
