/**
 * FIGMA-X: Pure WebGL 3D Rendering Engine
 * Compiles shaders, manages vertex buffers, and renders 3D primitives with Blinn-Phong shading
 * into high-performance offscreen canvases for direct integration with the 2D infinite canvas.
 */

(function() {
  const { Vec3, Mat4, Shaders, Primitives } = window.FigmaX;

  function hexToRgb(hex) {
    if (!hex) return [1, 1, 1];
    let c = hex.replace('#', '');
    if (c.length === 3) c = c.split('').map(x => x + x).join('');
    const num = parseInt(c, 16);
    return [
      ((num >> 16) & 255) / 255,
      ((num >> 8) & 255) / 255,
      (num & 255) / 255
    ];
  }

  class Engine3D {
    constructor() {
      // Offscreen canvas for WebGL rendering
      this.canvas = document.createElement('canvas');
      this.canvas.width = 512;
      this.canvas.height = 512;

      this.gl = this.canvas.getContext('webgl', {
        alpha: true,
        antialias: true,
        preserveDrawingBuffer: true
      }) || this.canvas.getContext('experimental-webgl');

      if (!this.gl) {
        console.error('WebGL not supported in this browser');
        return;
      }

      this.initGL();
      this.initShaders();
      this.initGeometries();

      // Cache for rendered node textures
      this.nodeCanvases = new Map(); // nodeId -> HTMLCanvasElement
    }

    initGL() {
      const gl = this.gl;
      gl.enable(gl.DEPTH_TEST);
      gl.depthFunc(gl.LEQUAL);
      gl.enable(gl.CULL_FACE);
      gl.cullFace(gl.BACK);
      gl.clearColor(0.0, 0.0, 0.0, 0.0);
    }

    createShader(type, source) {
      const gl = this.gl;
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Shader compile error:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    }

    initShaders() {
      const gl = this.gl;
      const vs = this.createShader(gl.VERTEX_SHADER, Shaders.vertexShaderSource);
      const fs = this.createShader(gl.FRAGMENT_SHADER, Shaders.fragmentShaderSource);

      this.program = gl.createProgram();
      gl.attachShader(this.program, vs);
      gl.attachShader(this.program, fs);
      gl.linkProgram(this.program);

      if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
        console.error('Program link error:', gl.getProgramInfoLog(this.program));
        return;
      }

      // Attribute locations
      this.attribs = {
        position: gl.getAttribLocation(this.program, 'a_position'),
        normal: gl.getAttribLocation(this.program, 'a_normal'),
        texcoord: gl.getAttribLocation(this.program, 'a_texcoord')
      };

      // Uniform locations
      this.uniforms = {
        modelMatrix: gl.getUniformLocation(this.program, 'u_modelMatrix'),
        viewMatrix: gl.getUniformLocation(this.program, 'u_viewMatrix'),
        projectionMatrix: gl.getUniformLocation(this.program, 'u_projectionMatrix'),
        normalMatrix: gl.getUniformLocation(this.program, 'u_normalMatrix'),
        viewPosition: gl.getUniformLocation(this.program, 'u_viewPosition'),
        lightDirection: gl.getUniformLocation(this.program, 'u_lightDirection'),
        lightColor: gl.getUniformLocation(this.program, 'u_lightColor'),
        ambientColor: gl.getUniformLocation(this.program, 'u_ambientColor'),
        diffuseColor: gl.getUniformLocation(this.program, 'u_diffuseColor'),
        specularColor: gl.getUniformLocation(this.program, 'u_specularColor'),
        shininess: gl.getUniformLocation(this.program, 'u_shininess'),
        opacity: gl.getUniformLocation(this.program, 'u_opacity'),
        wireframe: gl.getUniformLocation(this.program, 'u_wireframe')
      };
    }

    createMeshBuffers(geom) {
      const gl = this.gl;
      const posBuf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
      gl.bufferData(gl.ARRAY_BUFFER, geom.positions, gl.STATIC_DRAW);

      const normBuf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, normBuf);
      gl.bufferData(gl.ARRAY_BUFFER, geom.normals, gl.STATIC_DRAW);

      const texBuf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, texBuf);
      gl.bufferData(gl.ARRAY_BUFFER, geom.texcoords, gl.STATIC_DRAW);

      const idxBuf = gl.createBuffer();
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idxBuf);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, geom.indices, gl.STATIC_DRAW);

      const wireIdxBuf = gl.createBuffer();
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, wireIdxBuf);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, geom.wireIndices, gl.STATIC_DRAW);

      return {
        posBuf,
        normBuf,
        texBuf,
        idxBuf,
        wireIdxBuf,
        count: geom.indices.length,
        wireCount: geom.wireIndices.length
      };
    }

    initGeometries() {
      this.meshes = {
        cube: this.createMeshBuffers(Primitives.createCube(1.2)),
        sphere: this.createMeshBuffers(Primitives.createSphere(0.85, 32, 32)),
        torus: this.createMeshBuffers(Primitives.createTorus(0.65, 0.28, 32, 40)),
        cylinder: this.createMeshBuffers(Primitives.createCylinder(0.6, 1.2, 32)),
        plane: this.createMeshBuffers(Primitives.createPlane(1.4, 1.4))
      };
    }

    /**
     * Renders a 3D node and returns a dedicated HTMLCanvasElement containing the rendering.
     */
    renderNodeToCanvas(node, width, height) {
      const gl = this.gl;
      if (!gl || !this.program) return null;

      const w = Math.max(64, Math.min(1024, Math.round(width)));
      const h = Math.max(64, Math.min(1024, Math.round(height)));

      // Resize GL canvas if needed
      if (this.canvas.width !== w || this.canvas.height !== h) {
        this.canvas.width = w;
        this.canvas.height = h;
      }

      gl.viewport(0, 0, w, h);
      gl.clearColor(0.0, 0.0, 0.0, 0.0);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

      gl.useProgram(this.program);

      // Camera setup
      const fov = 45 * Math.PI / 180;
      const aspect = w / h;
      const projMat = Mat4.perspective(fov, aspect, 0.1, 100.0);

      const eye = new Vec3(0, 0, 3.2);
      const center = new Vec3(0, 0, 0);
      const up = new Vec3(0, 1, 0);
      const viewMat = Mat4.lookAt(eye, center, up);

      // Model transform
      const modelMat = new Mat4();
      if (node.pos3D) {
        modelMat.translate(node.pos3D[0], node.pos3D[1], node.pos3D[2]);
      }
      modelMat.rotateX((node.rotX || 0) * Math.PI / 180);
      modelMat.rotateY((node.rotY || 0) * Math.PI / 180);
      modelMat.rotateZ((node.rotZ || 0) * Math.PI / 180);

      const s = node.scale3D || 1;
      modelMat.scale(s, s, s);

      // Normal matrix = (modelView)^(-1)^T
      const modelView = Mat4.multiply(viewMat, modelMat);
      const normalMat = modelView.clone().invert().transpose();

      // Uniforms
      gl.uniformMatrix4fv(this.uniforms.projectionMatrix, false, projMat.elements);
      gl.uniformMatrix4fv(this.uniforms.viewMatrix, false, viewMat.elements);
      gl.uniformMatrix4fv(this.uniforms.modelMatrix, false, modelMat.elements);
      gl.uniformMatrix4fv(this.uniforms.normalMatrix, false, normalMat.elements);

      gl.uniform3f(this.uniforms.viewPosition, eye.x, eye.y, eye.z);

      const lightDir = node.lightDirection || [0.6, 0.8, 1.0];
      const lLen = Math.hypot(lightDir[0], lightDir[1], lightDir[2]) || 1;
      gl.uniform3f(this.uniforms.lightDirection, lightDir[0]/lLen, lightDir[1]/lLen, lightDir[2]/lLen);
      gl.uniform3f(this.uniforms.lightColor, 1.0, 1.0, 1.0);

      const diffColor = hexToRgb(node.materialColor || '#6366f1');
      gl.uniform3f(this.uniforms.diffuseColor, diffColor[0], diffColor[1], diffColor[2]);

      const ambColor = hexToRgb(node.ambientColor || '#1e1b4b');
      gl.uniform3f(this.uniforms.ambientColor, ambColor[0], ambColor[1], ambColor[2]);

      const specColor = hexToRgb(node.specularColor || '#ffffff');
      gl.uniform3f(this.uniforms.specularColor, specColor[0], specColor[1], specColor[2]);

      gl.uniform1f(this.uniforms.shininess, node.shininess || 48.0);
      gl.uniform1f(this.uniforms.opacity, node.opacity ?? 1.0);
      gl.uniform1i(this.uniforms.wireframe, node.wireframe ? 1 : 0);

      // Mesh buffers
      const primitiveName = (node.primitive || 'torus').toLowerCase();
      const mesh = this.meshes[primitiveName] || this.meshes.cube;

      // Position
      gl.bindBuffer(gl.ARRAY_BUFFER, mesh.posBuf);
      gl.enableVertexAttribArray(this.attribs.position);
      gl.vertexAttribPointer(this.attribs.position, 3, gl.FLOAT, false, 0, 0);

      // Normal
      gl.bindBuffer(gl.ARRAY_BUFFER, mesh.normBuf);
      gl.enableVertexAttribArray(this.attribs.normal);
      gl.vertexAttribPointer(this.attribs.normal, 3, gl.FLOAT, false, 0, 0);

      // Texcoord
      gl.bindBuffer(gl.ARRAY_BUFFER, mesh.texBuf);
      gl.enableVertexAttribArray(this.attribs.texcoord);
      gl.vertexAttribPointer(this.attribs.texcoord, 2, gl.FLOAT, false, 0, 0);

      // Draw
      if (node.wireframe) {
        gl.disable(gl.CULL_FACE);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.wireIdxBuf);
        gl.drawElements(gl.LINES, mesh.wireCount, gl.UNSIGNED_SHORT, 0);
      } else {
        gl.enable(gl.CULL_FACE);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.idxBuf);
        gl.drawElements(gl.TRIANGLES, mesh.count, gl.UNSIGNED_SHORT, 0);
      }

      // Copy to node-specific 2D output canvas
      let outCanvas = this.nodeCanvases.get(node.id);
      if (!outCanvas) {
        outCanvas = document.createElement('canvas');
        this.nodeCanvases.set(node.id, outCanvas);
      }
      if (outCanvas.width !== w || outCanvas.height !== h) {
        outCanvas.width = w;
        outCanvas.height = h;
      }
      const ctx2d = outCanvas.getContext('2d');
      ctx2d.clearRect(0, 0, w, h);
      ctx2d.drawImage(this.canvas, 0, 0);

      return outCanvas;
    }
  }

  window.FigmaX = window.FigmaX || {};
  window.FigmaX.Engine3D = Engine3D;
})();
