/**
 * FIGMA-X: 2D Math & Affine Transforms
 * Zero-dependency 2D Vector & Matrix operations for the Scene Graph
 */

class Vec2 {
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }

  set(x, y) {
    this.x = x;
    this.y = y;
    return this;
  }

  clone() {
    return new Vec2(this.x, this.y);
  }

  add(v) {
    this.x += v.x;
    this.y += v.y;
    return this;
  }

  sub(v) {
    this.x -= v.x;
    this.y -= v.y;
    return this;
  }

  scale(s) {
    this.x *= s;
    this.y *= s;
    return this;
  }

  distanceTo(v) {
    const dx = this.x - v.x;
    const dy = this.y - v.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  angleTo(v) {
    return Math.atan2(v.y - this.y, v.x - this.x);
  }
}

/**
 * 2x3 Affine Transform Matrix
 * [ a  c  e ]
 * [ b  d  f ]
 * [ 0  0  1 ]
 */
class Matrix2D {
  constructor(a = 1, b = 0, c = 0, d = 1, e = 0, f = 0) {
    this.a = a;
    this.b = b;
    this.c = c;
    this.d = d;
    this.e = e;
    this.f = f;
  }

  static identity() {
    return new Matrix2D(1, 0, 0, 1, 0, 0);
  }

  set(a, b, c, d, e, f) {
    this.a = a;
    this.b = b;
    this.c = c;
    this.d = d;
    this.e = e;
    this.f = f;
    return this;
  }

  clone() {
    return new Matrix2D(this.a, this.b, this.c, this.d, this.e, this.f);
  }

  multiply(m) {
    const a = this.a * m.a + this.c * m.b;
    const b = this.b * m.a + this.d * m.b;
    const c = this.a * m.c + this.c * m.d;
    const d = this.b * m.c + this.d * m.d;
    const e = this.a * m.e + this.c * m.f + this.e;
    const f = this.b * m.e + this.d * m.f + this.f;
    return this.set(a, b, c, d, e, f);
  }

  translate(tx, ty) {
    return this.multiply(new Matrix2D(1, 0, 0, 1, tx, ty));
  }

  rotate(rad) {
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    return this.multiply(new Matrix2D(cos, sin, -sin, cos, 0, 0));
  }

  scale(sx, sy) {
    return this.multiply(new Matrix2D(sx, 0, 0, sy, 0, 0));
  }

  invert() {
    const det = this.a * this.d - this.b * this.c;
    if (Math.abs(det) < 1e-14) {
      return this.set(1, 0, 0, 1, 0, 0);
    }
    const invDet = 1 / det;
    const a = this.d * invDet;
    const b = -this.b * invDet;
    const c = -this.c * invDet;
    const d = this.a * invDet;
    const e = (this.c * this.f - this.d * this.e) * invDet;
    const f = (this.b * this.e - this.a * this.f) * invDet;
    return this.set(a, b, c, d, e, f);
  }

  transformPoint(x, y) {
    return new Vec2(
      this.a * x + this.c * y + this.e,
      this.b * x + this.d * y + this.f
    );
  }

  applyToContext(ctx) {
    ctx.transform(this.a, this.b, this.c, this.d, this.e, this.f);
  }
}

/**
 * Bounding Box representation in 2D
 */
class Rect2D {
  constructor(x = 0, y = 0, width = 0, height = 0) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
  }

  get minX() { return Math.min(this.x, this.x + this.width); }
  get maxX() { return Math.max(this.x, this.x + this.width); }
  get minY() { return Math.min(this.y, this.y + this.height); }
  get maxY() { return Math.max(this.y, this.y + this.height); }

  contains(px, py) {
    return px >= this.minX && px <= this.maxX && py >= this.minY && py <= this.maxY;
  }

  intersects(other) {
    return !(
      other.minX > this.maxX ||
      other.maxX < this.minX ||
      other.minY > this.maxY ||
      other.maxY < this.minY
    );
  }

  union(other) {
    const minX = Math.min(this.minX, other.minX);
    const minY = Math.min(this.minY, other.minY);
    const maxX = Math.max(this.maxX, other.maxX);
    const maxY = Math.max(this.maxY, other.maxY);
    return new Rect2D(minX, minY, maxX - minX, maxY - minY);
  }
}

// Global namespace binding for robust script loading
window.FigmaX = window.FigmaX || {};
window.FigmaX.Vec2 = Vec2;
window.FigmaX.Matrix2D = Matrix2D;
window.FigmaX.Rect2D = Rect2D;
