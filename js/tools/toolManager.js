/**
 * FIGMA-X: Tool Manager & Interactive Canvas State Machine
 * Handles Selection, Drag-to-Move, 8-point Resizing, Smooth Rotation,
 * Marquee Box Select, Canvas Panning, and Shape Creation.
 */

(function() {
  const { Vec2, Rect2D, NodeFactory } = window.FigmaX;

  class ToolManager {
    constructor(canvas2d, doc, history) {
      this.canvas2d = canvas2d;
      this.canvas = canvas2d.canvas;
      this.doc = doc;
      this.history = history;

      this.currentTool = 'select'; // 'select' | 'hand' | 'frame' | 'rectangle' | 'ellipse' | 'polygon' | 'text' | 'mesh3d'
      this.creationPrimitive3D = 'torus';

      // State machine
      this.state = 'IDLE'; // 'IDLE' | 'PANNING' | 'DRAGGING' | 'RESIZING' | 'ROTATING' | 'CREATING' | 'MARQUEE'
      this.dragStartScreen = new Vec2();
      this.dragStartWorld = new Vec2();
      this.lastMouseWorld = new Vec2();

      // Transform interaction details
      this.activeHandle = null; // 'nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w', 'rot'
      this.transformInitialNodes = []; // Array of { id, x, y, width, height, rotation }
      this.createdNode = null;

      this.isSpacePressed = false;

      this.bindEvents();
    }

    setTool(toolName, options = {}) {
      this.currentTool = toolName;
      if (options.primitive) {
        this.creationPrimitive3D = options.primitive;
      }
      this.updateCursor();

      // Update toolbar UI active states
      document.querySelectorAll('.tool-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tool === toolName);
      });
    }

    updateCursor(custom = null) {
      if (custom) {
        this.canvas.style.cursor = custom;
        return;
      }
      if (this.isSpacePressed || this.currentTool === 'hand') {
        this.canvas.style.cursor = this.state === 'PANNING' ? 'grabbing' : 'grab';
      } else if (this.currentTool === 'select') {
        this.canvas.style.cursor = 'default';
      } else if (this.currentTool === 'text') {
        this.canvas.style.cursor = 'text';
      } else {
        this.canvas.style.cursor = 'crosshair';
      }
    }

    bindEvents() {
      const el = this.canvas;

      el.addEventListener('mousedown', (e) => this.onMouseDown(e));
      window.addEventListener('mousemove', (e) => this.onMouseMove(e));
      window.addEventListener('mouseup', (e) => this.onMouseUp(e));
      el.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });
      el.addEventListener('dblclick', (e) => this.onDoubleClick(e));

      // Key events
      window.addEventListener('keydown', (e) => {
        if (e.code === 'Space' && !this.isSpacePressed && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
          this.isSpacePressed = true;
          this.updateCursor();
        }
      });

      window.addEventListener('keyup', (e) => {
        if (e.code === 'Space') {
          this.isSpacePressed = false;
          this.updateCursor();
        }
      });
    }

    getHandleAtScreenPoint(screenX, screenY) {
      if (!this.doc || this.doc.selectedIds.length === 0) return null;

      for (const id of this.doc.selectedIds) {
        const node = this.doc.getNodeById(id);
        if (!node) continue;

        const wm = node.getWorldMatrix(this.doc);
        const p0 = this.canvas2d.worldToScreen(wm.transformPoint(0, 0).x, wm.transformPoint(0, 0).y);
        const p1 = this.canvas2d.worldToScreen(wm.transformPoint(node.width, 0).x, wm.transformPoint(node.width, 0).y);
        const p2 = this.canvas2d.worldToScreen(wm.transformPoint(node.width, node.height).x, wm.transformPoint(node.width, node.height).y);
        const p3 = this.canvas2d.worldToScreen(wm.transformPoint(0, node.height).x, wm.transformPoint(0, node.height).y);

        const handles = [
          { name: 'nw', pt: p0, cursor: 'nwse-resize' },
          { name: 'n',  pt: new Vec2((p0.x + p1.x) / 2, (p0.y + p1.y) / 2), cursor: 'ns-resize' },
          { name: 'ne', pt: p1, cursor: 'nesw-resize' },
          { name: 'e',  pt: new Vec2((p1.x + p2.x) / 2, (p1.y + p2.y) / 2), cursor: 'ew-resize' },
          { name: 'se', pt: p2, cursor: 'nwse-resize' },
          { name: 's',  pt: new Vec2((p2.x + p3.x) / 2, (p2.y + p3.y) / 2), cursor: 'ns-resize' },
          { name: 'sw', pt: p3, cursor: 'nesw-resize' },
          { name: 'w',  pt: new Vec2((p3.x + p0.x) / 2, (p3.y + p0.y) / 2), cursor: 'ew-resize' }
        ];

        // Check 8 resize handles
        for (const h of handles) {
          if (Math.hypot(h.pt.x - screenX, h.pt.y - screenY) <= 8) {
            return { type: 'resize', handle: h.name, cursor: h.cursor, node };
          }
        }

        // Check rotation lollipop handle
        const topMid = handles[1].pt;
        const rad = (node.rotation * Math.PI) / 180;
        const stemLen = 22;
        const rotHandlePos = new Vec2(
          topMid.x - Math.sin(rad) * stemLen,
          topMid.y - Math.cos(rad) * stemLen
        );

        if (Math.hypot(rotHandlePos.x - screenX, rotHandlePos.y - screenY) <= 8) {
          return { type: 'rotate', handle: 'rot', cursor: 'grab', node };
        }
      }

      return null;
    }

    onMouseDown(e) {
      const rect = this.canvas.getBoundingClientRect();
      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;
      const worldPt = this.canvas2d.screenToWorld(screenX, screenY);

      this.dragStartScreen.set(screenX, screenY);
      this.dragStartWorld.set(worldPt.x, worldPt.y);
      this.lastMouseWorld.set(worldPt.x, worldPt.y);

      // Pan with middle mouse or spacebar drag or hand tool
      if (e.button === 1 || this.isSpacePressed || this.currentTool === 'hand') {
        this.state = 'PANNING';
        this.updateCursor();
        return;
      }

      if (e.button !== 0) return; // Left click only for editing

      // 1. Check if clicking on an active selection handle (Resize / Rotate)
      if (this.currentTool === 'select') {
        const handleHit = this.getHandleAtScreenPoint(screenX, screenY);
        if (handleHit) {
          if (handleHit.type === 'resize') {
            this.state = 'RESIZING';
            this.activeHandle = handleHit.handle;
          } else if (handleHit.type === 'rotate') {
            this.state = 'ROTATING';
            this.activeHandle = 'rot';
          }

          this.recordTransformInitials();
          return;
        }
      }

      // 2. Creation Tools
      if (this.currentTool !== 'select') {
        this.state = 'CREATING';
        this.createNodeAtWorld(worldPt);
        return;
      }

      // 3. Selection tool: Hit test nodes
      const hitNode = this.doc.hitTest(worldPt.x, worldPt.y);
      if (hitNode) {
        if (e.shiftKey) {
          // Toggle selection
          if (this.doc.selectedIds.includes(hitNode.id)) {
            this.doc.selectedIds = this.doc.selectedIds.filter(id => id !== hitNode.id);
          } else {
            this.doc.selectedIds.push(hitNode.id);
          }
        } else {
          if (!this.doc.selectedIds.includes(hitNode.id)) {
            this.doc.selectedIds = [hitNode.id];
          }
        }

        this.state = 'DRAGGING';
        this.recordTransformInitials();
        this.doc.notify('selectionChange');
        this.canvas2d.requestRender();
      } else {
        // Clicked empty canvas: start marquee selection box
        if (!e.shiftKey) {
          this.doc.selectedIds = [];
          this.doc.notify('selectionChange');
        }
        this.state = 'MARQUEE';
        this.canvas2d.marqueeRect = new Rect2D(worldPt.x, worldPt.y, 0, 0);
        this.canvas2d.requestRender();
      }
    }

    createNodeAtWorld(worldPt) {
      let node = null;
      const baseProps = {
        x: Math.round(worldPt.x),
        y: Math.round(worldPt.y),
        width: 1,
        height: 1
      };

      switch (this.currentTool) {
        case 'frame':
          node = NodeFactory.create({
            ...baseProps,
            type: 'frame',
            name: 'Frame',
            fill: '#181920',
            stroke: 'rgba(255,255,255,0.1)'
          });
          break;
        case 'rectangle':
          node = NodeFactory.create({
            ...baseProps,
            type: 'rectangle',
            name: 'Rectangle',
            fill: '#6366f1',
            cornerRadius: 8
          });
          break;
        case 'ellipse':
          node = NodeFactory.create({
            ...baseProps,
            type: 'ellipse',
            name: 'Ellipse',
            fill: '#06b6d4'
          });
          break;
        case 'polygon':
          node = NodeFactory.create({
            ...baseProps,
            type: 'polygon',
            name: 'Star',
            isStar: true,
            fill: '#f59e0b'
          });
          break;
        case 'text':
          node = NodeFactory.create({
            ...baseProps,
            type: 'text',
            name: 'Text',
            text: 'Editable Text',
            fontSize: 20,
            fill: '#ffffff',
            width: 160,
            height: 32
          });
          break;
        case 'mesh3d':
          node = NodeFactory.create({
            ...baseProps,
            type: 'mesh3d',
            name: `3D ${this.creationPrimitive3D.toUpperCase()}`,
            primitive: this.creationPrimitive3D,
            materialColor: '#8b5cf6',
            width: 200,
            height: 200
          });
          break;
      }

      if (node) {
        this.doc.addNode(node);
        this.createdNode = node;
        this.doc.selectedIds = [node.id];
        this.doc.notify('selectionChange');
        this.canvas2d.requestRender();
      }
    }

    recordTransformInitials() {
      this.transformInitialNodes = this.doc.selectedIds.map(id => {
        const node = this.doc.getNodeById(id);
        return {
          id,
          x: node.x,
          y: node.y,
          width: node.width,
          height: node.height,
          rotation: node.rotation
        };
      });
    }

    onMouseMove(e) {
      const rect = this.canvas.getBoundingClientRect();
      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;
      const worldPt = this.canvas2d.screenToWorld(screenX, screenY);

      // 1. Panning
      if (this.state === 'PANNING') {
        const dx = screenX - this.dragStartScreen.x;
        const dy = screenY - this.dragStartScreen.y;
        this.canvas2d.panX += dx;
        this.canvas2d.panY += dy;
        this.dragStartScreen.set(screenX, screenY);
        this.canvas2d.requestRender();
        return;
      }

      // 2. Dragging Nodes (Moving)
      if (this.state === 'DRAGGING') {
        const dx = worldPt.x - this.dragStartWorld.x;
        const dy = worldPt.y - this.dragStartWorld.y;

        for (const initial of this.transformInitialNodes) {
          const node = this.doc.getNodeById(initial.id);
          if (node) {
            node.x = Math.round(initial.x + dx);
            node.y = Math.round(initial.y + dy);
          }
        }

        this.checkSnapGuides();
        this.doc.notify('nodeTransform');
        this.canvas2d.requestRender();
        return;
      }

      // 3. Resizing Node
      if (this.state === 'RESIZING' && this.transformInitialNodes.length > 0) {
        const initial = this.transformInitialNodes[0];
        const node = this.doc.getNodeById(initial.id);
        if (!node) return;

        const dx = worldPt.x - this.dragStartWorld.x;
        const dy = worldPt.y - this.dragStartWorld.y;
        const h = this.activeHandle;

        let newX = initial.x;
        let newY = initial.y;
        let newW = initial.width;
        let newH = initial.height;

        if (h.includes('e')) newW = Math.max(10, initial.width + dx);
        if (h.includes('s')) newH = Math.max(10, initial.height + dy);
        if (h.includes('w')) {
          const proposedW = initial.width - dx;
          if (proposedW >= 10) {
            newW = proposedW;
            newX = initial.x + dx;
          }
        }
        if (h.includes('n')) {
          const proposedH = initial.height - dy;
          if (proposedH >= 10) {
            newH = proposedH;
            newY = initial.y + dy;
          }
        }

        // Shift key locks 1:1 aspect ratio
        if (e.shiftKey) {
          const maxDim = Math.max(newW, newH);
          newW = maxDim;
          newH = maxDim;
        }

        node.x = Math.round(newX);
        node.y = Math.round(newY);
        node.width = Math.round(newW);
        node.height = Math.round(newH);

        this.doc.notify('nodeTransform');
        this.canvas2d.requestRender();
        return;
      }

      // 4. Rotating Node
      if (this.state === 'ROTATING' && this.transformInitialNodes.length > 0) {
        const initial = this.transformInitialNodes[0];
        const node = this.doc.getNodeById(initial.id);
        if (!node) return;

        const cx = initial.x + initial.width / 2;
        const cy = initial.y + initial.height / 2;
        const angleRad = Math.atan2(worldPt.y - cy, worldPt.x - cx);
        let deg = (angleRad * 180) / Math.PI + 90;

        // Snap to 15 degrees if shift held
        if (e.shiftKey) {
          deg = Math.round(deg / 15) * 15;
        }

        node.rotation = Math.round((deg % 360 + 360) % 360);
        this.doc.notify('nodeTransform');
        this.canvas2d.requestRender();
        return;
      }

      // 5. Creating New Shape by dragging
      if (this.state === 'CREATING' && this.createdNode) {
        const w = Math.max(10, Math.abs(worldPt.x - this.dragStartWorld.x));
        const h = Math.max(10, Math.abs(worldPt.y - this.dragStartWorld.y));

        this.createdNode.x = Math.round(Math.min(this.dragStartWorld.x, worldPt.x));
        this.createdNode.y = Math.round(Math.min(this.dragStartWorld.y, worldPt.y));
        this.createdNode.width = Math.round(e.shiftKey ? Math.max(w, h) : w);
        this.createdNode.height = Math.round(e.shiftKey ? Math.max(w, h) : h);

        this.doc.notify('nodeTransform');
        this.canvas2d.requestRender();
        return;
      }

      // 6. Marquee Selecting
      if (this.state === 'MARQUEE' && this.canvas2d.marqueeRect) {
        const mx = Math.min(this.dragStartWorld.x, worldPt.x);
        const my = Math.min(this.dragStartWorld.y, worldPt.y);
        const mw = Math.abs(worldPt.x - this.dragStartWorld.x);
        const mh = Math.abs(worldPt.y - this.dragStartWorld.y);

        this.canvas2d.marqueeRect.x = mx;
        this.canvas2d.marqueeRect.y = my;
        this.canvas2d.marqueeRect.width = mw;
        this.canvas2d.marqueeRect.height = mh;

        const enclosed = this.doc.findNodesInRect(this.canvas2d.marqueeRect);
        this.doc.selectedIds = enclosed;
        this.doc.notify('selectionChange');
        this.canvas2d.requestRender();
        return;
      }

      // 7. Hover cursor update when idle
      if (this.state === 'IDLE' && this.currentTool === 'select') {
        const handleHit = this.getHandleAtScreenPoint(screenX, screenY);
        if (handleHit) {
          this.updateCursor(handleHit.cursor);
        } else {
          this.updateCursor();
        }
      }
    }

    onMouseUp(e) {
      if (this.state === 'CREATING') {
        if (this.createdNode && this.createdNode.width < 15 && this.createdNode.height < 15) {
          // If clicked without dragging, set generous default size
          this.createdNode.width = this.createdNode.type === 'frame' ? 1440 : 180;
          this.createdNode.height = this.createdNode.type === 'frame' ? 900 : 120;
        }
        this.createdNode = null;
        this.setTool('select');
        this.history.recordState('Create Shape');
      } else if (this.state === 'DRAGGING' || this.state === 'RESIZING' || this.state === 'ROTATING') {
        this.canvas2d.guides = [];
        this.history.recordState('Transform Node');
      } else if (this.state === 'MARQUEE') {
        this.canvas2d.marqueeRect = null;
      }

      this.state = 'IDLE';
      this.activeHandle = null;
      this.transformInitialNodes = [];
      this.updateCursor();
      this.canvas2d.requestRender();
    }

    onWheel(e) {
      e.preventDefault();
      const rect = this.canvas.getBoundingClientRect();
      const cursorX = e.clientX - rect.left;
      const cursorY = e.clientY - rect.top;

      if (e.ctrlKey || e.metaKey) {
        // Pinch zoom or Ctrl+Wheel zoom
        const factor = Math.exp(-e.deltaY * 0.005);
        this.canvas2d.setZoom(this.canvas2d.zoom * factor, cursorX, cursorY);
      } else {
        // Trackpad 2-finger pan or regular wheel scroll
        this.canvas2d.panX -= e.deltaX;
        this.canvas2d.panY -= e.deltaY;
        this.canvas2d.requestRender();
      }
    }

    onDoubleClick(e) {
      const rect = this.canvas.getBoundingClientRect();
      const worldPt = this.canvas2d.screenToWorld(e.clientX - rect.left, e.clientY - rect.top);
      const hitNode = this.doc.hitTest(worldPt.x, worldPt.y);

      if (hitNode && hitNode.type === 'text') {
        this.openInlineTextEditor(hitNode);
      }
    }

    openInlineTextEditor(textNode) {
      const editor = document.getElementById('inline-text-editor');
      if (!editor) return;

      const screenPt = this.canvas2d.worldToScreen(textNode.x, textNode.y);
      const zoom = this.canvas2d.zoom;

      editor.style.display = 'block';
      editor.style.left = `${screenPt.x}px`;
      editor.style.top = `${screenPt.y}px`;
      editor.style.width = `${Math.max(100, textNode.width * zoom)}px`;
      editor.style.height = `${Math.max(30, textNode.height * zoom)}px`;
      editor.style.fontSize = `${(textNode.fontSize || 16) * zoom}px`;
      editor.style.fontFamily = textNode.fontFamily || 'Inter, sans-serif';
      editor.style.fontWeight = textNode.fontWeight || 500;
      editor.style.color = textNode.fill || '#fff';
      editor.value = textNode.text || '';
      editor.focus();

      const finishEditing = () => {
        textNode.text = editor.value;
        editor.style.display = 'none';
        this.history.recordState('Edit Text');
        this.doc.notify('nodeTransform');
        this.canvas2d.requestRender();
        editor.removeEventListener('blur', finishEditing);
      };

      editor.addEventListener('blur', finishEditing);
    }

    checkSnapGuides() {
      // Dynamic snap guides against other root objects
      this.canvas2d.guides = [];
      if (this.doc.selectedIds.length !== 1) return;

      const node = this.doc.getNodeById(this.doc.selectedIds[0]);
      if (!node) return;

      const b = node.getWorldBounds(this.doc);
      const snapThreshold = 6 / this.canvas2d.zoom;

      for (const other of this.doc.getAllNodes()) {
        if (other.id === node.id || !other.visible) continue;
        const ob = other.getWorldBounds(this.doc);

        // Snap X edges or centers
        if (Math.abs(b.minX - ob.minX) < snapThreshold) {
          node.x = ob.minX;
          this.canvas2d.guides.push({ type: 'v', pos: ob.minX });
        } else if (Math.abs(b.maxX - ob.maxX) < snapThreshold) {
          node.x = ob.maxX - node.width;
          this.canvas2d.guides.push({ type: 'v', pos: ob.maxX });
        }

        // Snap Y edges
        if (Math.abs(b.minY - ob.minY) < snapThreshold) {
          node.y = ob.minY;
          this.canvas2d.guides.push({ type: 'h', pos: ob.minY });
        } else if (Math.abs(b.maxY - ob.maxY) < snapThreshold) {
          node.y = ob.maxY - node.height;
          this.canvas2d.guides.push({ type: 'h', pos: ob.maxY });
        }
      }
    }
  }

  window.FigmaX = window.FigmaX || {};
  window.FigmaX.ToolManager = ToolManager;
})();
