/**
 * FIGMA-X: Scene Graph Node Architecture
 * Pure vanilla JavaScript document nodes supporting 2D shapes, text, frames, groups, and 3D WebGL meshes.
 */

(function() {
  const { Vec2, Matrix2D, Rect2D } = window.FigmaX;

  let idCounter = 1;
  function generateId(prefix = 'node') {
    return `${prefix}_${Date.now().toString(36)}_${(idCounter++).toString(36)}`;
  }

  class BaseNode {
    constructor(props = {}) {
      this.id = props.id || generateId(this.getType());
      this.type = this.getType();
      this.name = props.name || this.getDefaultName();
      
      // Transform
      this.x = props.x ?? 0;
      this.y = props.y ?? 0;
      this.width = props.width ?? 100;
      this.height = props.height ?? 100;
      this.rotation = props.rotation ?? 0; // in degrees
      this.scaleX = props.scaleX ?? 1;
      this.scaleY = props.scaleY ?? 1;

      // Styling
      this.opacity = props.opacity ?? 1;
      this.visible = props.visible ?? true;
      this.locked = props.locked ?? false;
      this.blendMode = props.blendMode || 'source-over';
      
      this.fill = props.fill !== undefined ? props.fill : '#3b82f6';
      this.stroke = props.stroke || null; // e.g. '#ffffff'
      this.strokeWidth = props.strokeWidth ?? 1;
      this.strokeDash = props.strokeDash || []; // e.g. [4, 4]
      this.cornerRadius = props.cornerRadius ?? 0;

      // Effects
      this.shadow = props.shadow ? { ...props.shadow } : null; // { x, y, blur, color, spread }

      // Hierarchy
      this.parentId = props.parentId || null;
      this.children = Array.isArray(props.children) ? [...props.children] : [];

      // Scroll-driven animation config
      this.scrollTrigger = props.scrollTrigger ? { ...props.scrollTrigger } : {
        enabled: false,
        type: 'parallax', // 'parallax' | 'fade' | 'scale' | 'rotate' | '3d-spin'
        speed: 0.5,
        startPct: 0,
        endPct: 100,
        pin: false
      };
    }

    getType() {
      return 'node';
    }

    getDefaultName() {
      return 'Layer';
    }

    getLocalMatrix() {
      const rad = (this.rotation * Math.PI) / 180;
      const m = new Matrix2D();
      // Translate to node origin (x, y)
      m.translate(this.x, this.y);
      // Pivot around center for rotation
      const cx = this.width / 2;
      const cy = this.height / 2;
      m.translate(cx, cy);
      m.rotate(rad);
      m.scale(this.scaleX, this.scaleY);
      m.translate(-cx, -cy);
      return m;
    }

    getWorldMatrix(doc) {
      const local = this.getLocalMatrix();
      if (!this.parentId || !doc) return local;
      const parent = doc.getNodeById(this.parentId);
      if (!parent) return local;
      const parentWorld = parent.getWorldMatrix(doc);
      return parentWorld.clone().multiply(local);
    }

    getInverseWorldMatrix(doc) {
      return this.getWorldMatrix(doc).invert();
    }

    /**
     * Hit testing: Transforms world coordinates into local node space.
     * Returns true if point (worldX, worldY) hits inside this node.
     */
    hitTest(worldX, worldY, doc) {
      if (!this.visible) return false;
      const inv = this.getInverseWorldMatrix(doc);
      const localPt = inv.transformPoint(worldX, worldY);
      return localPt.x >= 0 && localPt.x <= this.width &&
             localPt.y >= 0 && localPt.y <= this.height;
    }

    getWorldBounds(doc) {
      const wm = this.getWorldMatrix(doc);
      const corners = [
        wm.transformPoint(0, 0),
        wm.transformPoint(this.width, 0),
        wm.transformPoint(this.width, this.height),
        wm.transformPoint(0, this.height)
      ];
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const pt of corners) {
        if (pt.x < minX) minX = pt.x;
        if (pt.x > maxX) maxX = pt.x;
        if (pt.y < minY) minY = pt.y;
        if (pt.y > maxY) maxY = pt.y;
      }
      return new Rect2D(minX, minY, maxX - minX, maxY - minY);
    }

    clone() {
      const serialized = this.serialize();
      serialized.id = generateId(this.getType());
      serialized.name = `${this.name} Copy`;
      serialized.x += 20;
      serialized.y += 20;
      return NodeFactory.create(serialized);
    }

    serialize() {
      return {
        id: this.id,
        type: this.type,
        name: this.name,
        x: this.x,
        y: this.y,
        width: this.width,
        height: this.height,
        rotation: this.rotation,
        scaleX: this.scaleX,
        scaleY: this.scaleY,
        opacity: this.opacity,
        visible: this.visible,
        locked: this.locked,
        blendMode: this.blendMode,
        fill: this.fill,
        stroke: this.stroke,
        strokeWidth: this.strokeWidth,
        strokeDash: this.strokeDash,
        cornerRadius: this.cornerRadius,
        shadow: this.shadow,
        parentId: this.parentId,
        children: [...this.children],
        scrollTrigger: { ...this.scrollTrigger }
      };
    }
  }

  class FrameNode extends BaseNode {
    constructor(props = {}) {
      super(props);
      this.clipContent = props.clipContent ?? true;
      this.fill = props.fill !== undefined ? props.fill : '#181920';
      this.name = props.name || 'Frame';
      this.stroke = props.stroke !== undefined ? props.stroke : 'rgba(255,255,255,0.08)';
    }
    getType() { return 'frame'; }
    getDefaultName() { return 'Frame'; }

    serialize() {
      const data = super.serialize();
      data.clipContent = this.clipContent;
      return data;
    }
  }

  class RectNode extends BaseNode {
    getType() { return 'rectangle'; }
    getDefaultName() { return 'Rectangle'; }
  }

  class EllipseNode extends BaseNode {
    getType() { return 'ellipse'; }
    getDefaultName() { return 'Ellipse'; }

    hitTest(worldX, worldY, doc) {
      if (!this.visible) return false;
      const inv = this.getInverseWorldMatrix(doc);
      const localPt = inv.transformPoint(worldX, worldY);
      const rx = this.width / 2;
      const ry = this.height / 2;
      if (rx <= 0 || ry <= 0) return false;
      const dx = (localPt.x - rx) / rx;
      const dy = (localPt.y - ry) / ry;
      return (dx * dx + dy * dy) <= 1;
    }
  }

  class PolygonNode extends BaseNode {
    constructor(props = {}) {
      super(props);
      this.pointsCount = props.pointsCount ?? 5; // 5 = pentagon/star
      this.isStar = props.isStar ?? false;
      this.starRatio = props.starRatio ?? 0.5;
    }
    getType() { return 'polygon'; }
    getDefaultName() { return this.isStar ? 'Star' : 'Polygon'; }

    serialize() {
      const data = super.serialize();
      data.pointsCount = this.pointsCount;
      data.isStar = this.isStar;
      data.starRatio = this.starRatio;
      return data;
    }
  }

  class TextNode extends BaseNode {
    constructor(props = {}) {
      super(props);
      this.text = props.text !== undefined ? props.text : 'Type something...';
      this.fontSize = props.fontSize ?? 18;
      this.fontFamily = props.fontFamily || 'Inter, -apple-system, sans-serif';
      this.fontWeight = props.fontWeight || '500';
      this.lineHeight = props.lineHeight ?? 1.3;
      this.textAlign = props.textAlign || 'left'; // left | center | right
      this.fill = props.fill !== undefined ? props.fill : '#f8fafc';
      this.letterSpacing = props.letterSpacing ?? 0;
    }
    getType() { return 'text'; }
    getDefaultName() { return 'Text'; }

    serialize() {
      const data = super.serialize();
      data.text = this.text;
      data.fontSize = this.fontSize;
      data.fontFamily = this.fontFamily;
      data.fontWeight = this.fontWeight;
      data.lineHeight = this.lineHeight;
      data.textAlign = this.textAlign;
      data.letterSpacing = this.letterSpacing;
      return data;
    }
  }

  class ImageNode extends BaseNode {
    constructor(props = {}) {
      super(props);
      this.src = props.src || '';
      this.imgElement = null;
      this.loaded = false;
      if (this.src) {
        this.loadImage(this.src);
      }
    }
    getType() { return 'image'; }
    getDefaultName() { return 'Image'; }

    loadImage(src) {
      this.src = src;
      this.imgElement = new Image();
      this.imgElement.crossOrigin = 'anonymous';
      this.imgElement.onload = () => {
        this.loaded = true;
        if (window.FigmaX.app && window.FigmaX.app.canvas2d) {
          window.FigmaX.app.canvas2d.requestRender();
        }
      };
      this.imgElement.src = src;
    }

    serialize() {
      const data = super.serialize();
      data.src = this.src;
      return data;
    }
  }

  class GroupNode extends BaseNode {
    constructor(props = {}) {
      super(props);
      this.fill = 'transparent';
      this.stroke = null;
    }
    getType() { return 'group'; }
    getDefaultName() { return 'Group'; }
  }

  class Mesh3DNode extends BaseNode {
    constructor(props = {}) {
      super(props);
      this.primitive = props.primitive || 'torus'; // cube | sphere | torus | cylinder | plane
      this.rotX = props.rotX ?? 25; // 3D rotation in degrees
      this.rotY = props.rotY ?? 45;
      this.rotZ = props.rotZ ?? 0;
      this.scale3D = props.scale3D ?? 1.2;
      this.pos3D = props.pos3D ? [...props.pos3D] : [0, 0, 0];
      
      this.wireframe = props.wireframe ?? false;
      this.materialColor = props.materialColor || '#6366f1';
      this.ambientColor = props.ambientColor || '#1e1b4b';
      this.specularColor = props.specularColor || '#ffffff';
      this.shininess = props.shininess ?? 48;
      this.lightDirection = props.lightDirection ? [...props.lightDirection] : [0.6, 0.8, 1.0];
      this.autoSpin = props.autoSpin ?? true;
      this.spinSpeed = props.spinSpeed ?? 0.8;
      
      this.fill = 'transparent'; // Background for 2D container
      this.stroke = props.stroke || 'rgba(99, 102, 241, 0.3)';
      this.strokeWidth = props.strokeWidth ?? 1;
      this.cornerRadius = props.cornerRadius ?? 12;
      this.name = props.name || '3D Object';
    }
    getType() { return 'mesh3d'; }
    getDefaultName() { return '3D Model'; }

    serialize() {
      const data = super.serialize();
      data.primitive = this.primitive;
      data.rotX = this.rotX;
      data.rotY = this.rotY;
      data.rotZ = this.rotZ;
      data.scale3D = this.scale3D;
      data.pos3D = [...this.pos3D];
      data.wireframe = this.wireframe;
      data.materialColor = this.materialColor;
      data.ambientColor = this.ambientColor;
      data.specularColor = this.specularColor;
      data.shininess = this.shininess;
      data.lightDirection = [...this.lightDirection];
      data.autoSpin = this.autoSpin;
      data.spinSpeed = this.spinSpeed;
      return data;
    }
  }

  const NodeFactory = {
    create(data) {
      switch (data.type) {
        case 'frame': return new FrameNode(data);
        case 'rectangle': return new RectNode(data);
        case 'ellipse': return new EllipseNode(data);
        case 'polygon': return new PolygonNode(data);
        case 'text': return new TextNode(data);
        case 'image': return new ImageNode(data);
        case 'group': return new GroupNode(data);
        case 'mesh3d': return new Mesh3DNode(data);
        default: return new RectNode(data);
      }
    }
  };

  window.FigmaX.BaseNode = BaseNode;
  window.FigmaX.FrameNode = FrameNode;
  window.FigmaX.RectNode = RectNode;
  window.FigmaX.EllipseNode = EllipseNode;
  window.FigmaX.PolygonNode = PolygonNode;
  window.FigmaX.TextNode = TextNode;
  window.FigmaX.ImageNode = ImageNode;
  window.FigmaX.GroupNode = GroupNode;
  window.FigmaX.Mesh3DNode = Mesh3DNode;
  window.FigmaX.NodeFactory = NodeFactory;
  window.FigmaX.generateId = generateId;
})();
