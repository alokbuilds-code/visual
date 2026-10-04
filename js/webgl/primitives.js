/**
 * FIGMA-X: Procedural 3D Primitives Generator
 * Generates Cube, Sphere, Torus, Cylinder, and Plane geometry from scratch.
 */

(function() {
  function createCube(size = 1) {
    const s = size / 2;
    // 6 faces * 4 vertices = 24 vertices
    const positions = [
      // Front
      -s, -s,  s,   s, -s,  s,   s,  s,  s,  -s,  s,  s,
      // Back
      -s, -s, -s,  -s,  s, -s,   s,  s, -s,   s, -s, -s,
      // Top
      -s,  s, -s,  -s,  s,  s,   s,  s,  s,   s,  s, -s,
      // Bottom
      -s, -s, -s,   s, -s, -s,   s, -s,  s,  -s, -s,  s,
      // Right
       s, -s, -s,   s,  s, -s,   s,  s,  s,   s, -s,  s,
      // Left
      -s, -s, -s,  -s, -s,  s,  -s,  s,  s,  -s,  s, -s
    ];

    const normals = [
      // Front
       0,  0,  1,   0,  0,  1,   0,  0,  1,   0,  0,  1,
      // Back
       0,  0, -1,   0,  0, -1,   0,  0, -1,   0,  0, -1,
      // Top
       0,  1,  0,   0,  1,  0,   0,  1,  0,   0,  1,  0,
      // Bottom
       0, -1,  0,   0, -1,  0,   0, -1,  0,   0, -1,  0,
      // Right
       1,  0,  0,   1,  0,  0,   1,  0,  0,   1,  0,  0,
      // Left
      -1,  0,  0,  -1,  0,  0,  -1,  0,  0,  -1,  0,  0
    ];

    const texcoords = [];
    for (let f = 0; f < 6; f++) {
      texcoords.push(0, 0,  1, 0,  1, 1,  0, 1);
    }

    const indices = [];
    for (let f = 0; f < 6; f++) {
      const b = f * 4;
      indices.push(b, b + 1, b + 2, b, b + 2, b + 3);
    }

    // Wireframe line indices
    const wireIndices = [];
    for (let f = 0; f < 6; f++) {
      const b = f * 4;
      wireIndices.push(b, b + 1, b + 1, b + 2, b + 2, b + 3, b + 3, b);
    }

    return {
      positions: new Float32Array(positions),
      normals: new Float32Array(normals),
      texcoords: new Float32Array(texcoords),
      indices: new Uint16Array(indices),
      wireIndices: new Uint16Array(wireIndices)
    };
  }

  function createSphere(radius = 0.8, latBands = 30, lonBands = 30) {
    const positions = [];
    const normals = [];
    const texcoords = [];
    const indices = [];
    const wireIndices = [];

    for (let lat = 0; lat <= latBands; lat++) {
      const theta = (lat * Math.PI) / latBands;
      const sinTheta = Math.sin(theta);
      const cosTheta = Math.cos(theta);

      for (let lon = 0; lon <= lonBands; lon++) {
        const phi = (lon * 2 * Math.PI) / lonBands;
        const sinPhi = Math.sin(phi);
        const cosPhi = Math.cos(phi);

        const x = cosPhi * sinTheta;
        const y = cosTheta;
        const z = sinPhi * sinTheta;
        const u = 1 - (lon / lonBands);
        const v = 1 - (lat / latBands);

        normals.push(x, y, z);
        texcoords.push(u, v);
        positions.push(radius * x, radius * y, radius * z);
      }
    }

    for (let lat = 0; lat < latBands; lat++) {
      for (let lon = 0; lon < lonBands; lon++) {
        const first = lat * (lonBands + 1) + lon;
        const second = first + lonBands + 1;

        indices.push(first, second, first + 1);
        indices.push(second, second + 1, first + 1);

        wireIndices.push(first, first + 1, first, second);
      }
    }

    return {
      positions: new Float32Array(positions),
      normals: new Float32Array(normals),
      texcoords: new Float32Array(texcoords),
      indices: new Uint16Array(indices),
      wireIndices: new Uint16Array(wireIndices)
    };
  }

  function createTorus(mainRadius = 0.65, tubeRadius = 0.25, radialSegments = 30, tubularSegments = 36) {
    const positions = [];
    const normals = [];
    const texcoords = [];
    const indices = [];
    const wireIndices = [];

    for (let j = 0; j <= radialSegments; j++) {
      const v = (j / radialSegments) * Math.PI * 2;
      for (let i = 0; i <= tubularSegments; i++) {
        const u = (i / tubularSegments) * Math.PI * 2;

        const x = (mainRadius + tubeRadius * Math.cos(v)) * Math.cos(u);
        const y = tubeRadius * Math.sin(v);
        const z = (mainRadius + tubeRadius * Math.cos(v)) * Math.sin(u);

        const nx = Math.cos(v) * Math.cos(u);
        const ny = Math.sin(v);
        const nz = Math.cos(v) * Math.sin(u);

        positions.push(x, y, z);
        normals.push(nx, ny, nz);
        texcoords.push(i / tubularSegments, j / radialSegments);
      }
    }

    for (let j = 0; j < radialSegments; j++) {
      for (let i = 0; i < tubularSegments; i++) {
        const a = (tubularSegments + 1) * j + i;
        const b = (tubularSegments + 1) * (j + 1) + i;
        const c = (tubularSegments + 1) * (j + 1) + i + 1;
        const d = (tubularSegments + 1) * j + i + 1;

        indices.push(a, b, d);
        indices.push(b, c, d);

        wireIndices.push(a, b, a, d);
      }
    }

    return {
      positions: new Float32Array(positions),
      normals: new Float32Array(normals),
      texcoords: new Float32Array(texcoords),
      indices: new Uint16Array(indices),
      wireIndices: new Uint16Array(wireIndices)
    };
  }

  function createCylinder(radius = 0.5, height = 1.0, radialSegments = 32) {
    const positions = [];
    const normals = [];
    const texcoords = [];
    const indices = [];
    const wireIndices = [];
    const halfH = height / 2;

    // Body
    for (let y = 0; y <= 1; y++) {
      const py = y === 0 ? halfH : -halfH;
      for (let x = 0; x <= radialSegments; x++) {
        const u = x / radialSegments;
        const theta = u * Math.PI * 2;
        const sinT = Math.sin(theta);
        const cosT = Math.cos(theta);

        positions.push(radius * sinT, py, radius * cosT);
        normals.push(sinT, 0, cosT);
        texcoords.push(u, y);
      }
    }

    for (let x = 0; x < radialSegments; x++) {
      const a = x;
      const b = x + radialSegments + 1;
      const c = x + radialSegments + 2;
      const d = x + 1;
      indices.push(a, b, d);
      indices.push(b, c, d);
      wireIndices.push(a, b, a, d);
    }

    return {
      positions: new Float32Array(positions),
      normals: new Float32Array(normals),
      texcoords: new Float32Array(texcoords),
      indices: new Uint16Array(indices),
      wireIndices: new Uint16Array(wireIndices)
    };
  }

  function createPlane(width = 1.5, height = 1.5) {
    const hw = width / 2;
    const hh = height / 2;
    const positions = [
      -hw, -hh, 0,
       hw, -hh, 0,
       hw,  hh, 0,
      -hw,  hh, 0
    ];
    const normals = [
      0, 0, 1,
      0, 0, 1,
      0, 0, 1,
      0, 0, 1
    ];
    const texcoords = [0, 0, 1, 0, 1, 1, 0, 1];
    const indices = [0, 1, 2, 0, 2, 3];
    const wireIndices = [0, 1, 1, 2, 2, 3, 3, 0];

    return {
      positions: new Float32Array(positions),
      normals: new Float32Array(normals),
      texcoords: new Float32Array(texcoords),
      indices: new Uint16Array(indices),
      wireIndices: new Uint16Array(wireIndices)
    };
  }

  window.FigmaX = window.FigmaX || {};
  window.FigmaX.Primitives = {
    createCube,
    createSphere,
    createTorus,
    createCylinder,
    createPlane
  };
})();
