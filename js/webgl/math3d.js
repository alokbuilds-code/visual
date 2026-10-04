/**
 * FIGMA-X: Pure WebGL 3D Math Library
 * Complete zero-dependency Vector3 and Matrix4 implementations.
 */

(function() {
  class Vec3 {
    constructor(x = 0, y = 0, z = 0) {
      this.x = x;
      this.y = y;
      this.z = z;
    }

    set(x, y, z) {
      this.x = x;
      this.y = y;
      this.z = z;
      return this;
    }

    clone() {
      return new Vec3(this.x, this.y, this.z);
    }

    add(v) {
      this.x += v.x;
      this.y += v.y;
      this.z += v.z;
      return this;
    }

    sub(v) {
      this.x -= v.x;
      this.y -= v.y;
      this.z -= v.z;
      return this;
    }

    scale(s) {
      this.x *= s;
      this.y *= s;
      this.z *= s;
      return this;
    }

    length() {
      return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
    }

    normalize() {
      const len = this.length();
      if (len > 0.00001) {
        this.x /= len;
        this.y /= len;
        this.z /= len;
      }
      return this;
    }

    dot(v) {
      return this.x * v.x + this.y * v.y + this.z * v.z;
    }

    cross(v) {
      const x = this.y * v.z - this.z * v.y;
      const y = this.z * v.x - this.x * v.z;
      const z = this.x * v.y - this.y * v.x;
      return new Vec3(x, y, z);
    }
  }

  /**
   * 4x4 Matrix represented as Float32Array (column-major order for WebGL)
   */
  class Mat4 {
    constructor() {
      this.elements = new Float32Array(16);
      this.identity();
    }

    identity() {
      const e = this.elements;
      e[0] = 1; e[4] = 0; e[8]  = 0; e[12] = 0;
      e[1] = 0; e[5] = 1; e[9]  = 0; e[13] = 0;
      e[2] = 0; e[6] = 0; e[10] = 1; e[14] = 0;
      e[3] = 0; e[7] = 0; e[11] = 0; e[15] = 1;
      return this;
    }

    clone() {
      const m = new Mat4();
      m.elements.set(this.elements);
      return m;
    }

    copy(src) {
      this.elements.set(src.elements);
      return this;
    }

    static multiply(a, b) {
      const ae = a.elements;
      const be = b.elements;
      const out = new Mat4();
      const oe = out.elements;

      for (let i = 0; i < 4; i++) {
        const ai0 = ae[i], ai1 = ae[i + 4], ai2 = ae[i + 8], ai3 = ae[i + 12];
        oe[i]      = ai0 * be[0] + ai1 * be[1] + ai2 * be[2] + ai3 * be[3];
        oe[i + 4]  = ai0 * be[4] + ai1 * be[5] + ai2 * be[6] + ai3 * be[7];
        oe[i + 8]  = ai0 * be[8] + ai1 * be[9] + ai2 * be[10] + ai3 * be[11];
        oe[i + 12] = ai0 * be[12] + ai1 * be[13] + ai2 * be[14] + ai3 * be[15];
      }
      return out;
    }

    multiply(m) {
      const res = Mat4.multiply(this, m);
      this.elements.set(res.elements);
      return this;
    }

    translate(x, y, z) {
      const t = new Mat4();
      t.elements[12] = x;
      t.elements[13] = y;
      t.elements[14] = z;
      return this.multiply(t);
    }

    rotateX(rad) {
      const r = new Mat4();
      const c = Math.cos(rad);
      const s = Math.sin(rad);
      r.elements[5] = c;
      r.elements[6] = s;
      r.elements[9] = -s;
      r.elements[10] = c;
      return this.multiply(r);
    }

    rotateY(rad) {
      const r = new Mat4();
      const c = Math.cos(rad);
      const s = Math.sin(rad);
      r.elements[0] = c;
      r.elements[2] = -s;
      r.elements[8] = s;
      r.elements[10] = c;
      return this.multiply(r);
    }

    rotateZ(rad) {
      const r = new Mat4();
      const c = Math.cos(rad);
      const s = Math.sin(rad);
      r.elements[0] = c;
      r.elements[1] = s;
      r.elements[4] = -s;
      r.elements[5] = c;
      return this.multiply(r);
    }

    scale(x, y, z) {
      const s = new Mat4();
      s.elements[0] = x;
      s.elements[5] = y !== undefined ? y : x;
      s.elements[10] = z !== undefined ? z : x;
      return this.multiply(s);
    }

    static perspective(fovRad, aspect, near, far) {
      const out = new Mat4();
      const e = out.elements;
      const f = 1.0 / Math.tan(fovRad / 2);
      const nf = 1 / (near - far);

      e[0] = f / aspect;
      e[1] = 0;
      e[2] = 0;
      e[3] = 0;

      e[4] = 0;
      e[5] = f;
      e[6] = 0;
      e[7] = 0;

      e[8] = 0;
      e[9] = 0;
      e[10] = (far + near) * nf;
      e[11] = -1;

      e[12] = 0;
      e[13] = 0;
      e[14] = (2 * far * near) * nf;
      e[15] = 0;

      return out;
    }

    static lookAt(eye, center, up) {
      const out = new Mat4();
      const e = out.elements;

      let z0 = eye.x - center.x;
      let z1 = eye.y - center.y;
      let z2 = eye.z - center.z;
      let len = 1 / Math.hypot(z0, z1, z2);
      z0 *= len; z1 *= len; z2 *= len;

      let x0 = up.y * z2 - up.z * z1;
      let x1 = up.z * z0 - up.x * z2;
      let x2 = up.x * z1 - up.y * z0;
      len = 1 / Math.hypot(x0, x1, x2);
      x0 *= len; x1 *= len; x2 *= len;

      const y0 = z1 * x2 - z2 * x1;
      const y1 = z2 * x0 - z0 * x2;
      const y2 = z0 * x1 - z1 * x0;

      e[0] = x0; e[1] = y0; e[2] = z0; e[3] = 0;
      e[4] = x1; e[5] = y1; e[6] = z1; e[7] = 0;
      e[8] = x2; e[9] = y2; e[10] = z2; e[11] = 0;
      e[12] = -(x0 * eye.x + x1 * eye.y + x2 * eye.z);
      e[13] = -(y0 * eye.x + y1 * eye.y + y2 * eye.z);
      e[14] = -(z0 * eye.x + z1 * eye.y + z2 * eye.z);
      e[15] = 1;

      return out;
    }

    invert() {
      const a = this.elements;
      const out = new Float32Array(16);

      const a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
      const a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
      const a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
      const a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];

      const b00 = a00 * a11 - a01 * a10;
      const b01 = a00 * a12 - a02 * a10;
      const b02 = a00 * a13 - a03 * a10;
      const b03 = a01 * a12 - a02 * a11;
      const b04 = a01 * a13 - a03 * a11;
      const b05 = a02 * a13 - a03 * a12;
      const b06 = a20 * a31 - a21 * a30;
      const b07 = a20 * a32 - a22 * a30;
      const b08 = a20 * a33 - a23 * a30;
      const b09 = a21 * a32 - a22 * a31;
      const b10 = a21 * a33 - a23 * a31;
      const b11 = a22 * a33 - a23 * a32;

      let det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
      if (!det) return this.identity();
      det = 1.0 / det;

      out[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
      out[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
      out[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
      out[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
      out[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
      out[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
      out[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
      out[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
      out[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
      out[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
      out[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
      out[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
      out[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det;
      out[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
      out[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det;
      out[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;

      this.elements.set(out);
      return this;
    }

    transpose() {
      const a = this.elements;
      const a01 = a[1], a02 = a[2], a03 = a[3];
      const a12 = a[6], a13 = a[7];
      const a23 = a[11];

      a[1] = a[4]; a[2] = a[8]; a[3] = a[12];
      a[4] = a01; a[6] = a[9]; a[7] = a[13];
      a[8] = a02; a[9] = a12; a[10] = a[10]; a[11] = a[14];
      a[12] = a03; a[13] = a13; a[14] = a23;
      return this;
    }
  }

  window.FigmaX = window.FigmaX || {};
  window.FigmaX.Vec3 = Vec3;
  window.FigmaX.Mat4 = Mat4;
})();
