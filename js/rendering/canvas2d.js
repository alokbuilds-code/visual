/**
 * FIGMA-X: Infinite Canvas 2D Rendering Engine
 * High-DPI canvas renderer with infinite pan/zoom, adaptive grid, scene graph rendering,
 * WebGL 3D compositing, transform gizmos, and smart alignment guides.
 */

(function() {
  const { Vec2, Matrix2D, Rect2D } = window.FigmaX;

  class Canvas2D {
    constructor(canvasElement, doc, engine3d) {
      this.canvas = canvasElement;
      this.ctx = this.canvas.getContext('2d');
      this.doc = doc;
      this.engine3d = engine3d;

      // Camera Viewport
      this.panX = 280; // Centered initial offset
      this.panY = 120;
      this.zoom = 0.85; // Default initial zoom
      this.minZoom = 0.05;
      this.maxZoom = 32.0;

      // HiDPI
      this.dpr = window.devicePixelRatio || 1;

      // Guides & Snap
      this.guides = []; // Array of { type: 'h'|'v', pos: number }
      this.marqueeRect = null; // Rect2D for box select

      // Animation / Render request
      this.renderPending = false;

      this.resizeCanvas();
      window.addEventListener('resize', () => {
        this.resizeCanvas();
        this.requestRender();
      });

      // Subscribe to doc changes
      if (this.doc) {
        this.doc.subscribe(() => this.requestRender());
      }
    }

    resizeCanvas() {
      const rect = this.canvas.parentElement.getBoundingClientRect();
      this.dpr = window.devicePixelRatio || 1;
      this.canvas.width = Math.round(rect.width * this.dpr);
      this.canvas.height = Math.round(rect.height * this.dpr);
      this.canvas.style.width = `${rect.width}px`;
      this.canvas.style.height = `${rect.height}px`;
    }

    screenToWorld(screenX, screenY) {
      return new Vec2(
        (screenX - this.panX) / this.zoom,
        (screenY - this.panY) / this.zoom
      );
    }

    worldToScreen(worldX, worldY) {
      return new Vec2(
        worldX * this.zoom + this.panX,
        worldY * this.zoom + this.panY
      );
    }

    setZoom(newZoom, centerX = this.canvas.width / (2 * this.dpr), centerY = this.canvas.height / (2 * this.dpr)) {
      const clamped = Math.max(this.minZoom, Math.min(this.maxZoom, newZoom));
      if (Math.abs(clamped - this.zoom) < 0.001) return;

      // Zoom centered on cursor/point
      const worldBefore = this.screenToWorld(centerX, centerY);
      this.zoom = clamped;
      this.panX = centerX - worldBefore.x * this.zoom;
      this.panY = centerY - worldBefore.y * this.zoom;

      this.updateZoomDisplay();
      this.requestRender();
    }

    zoomIn() {
      this.setZoom(this.zoom * 1.25);
    }

    zoomOut() {
      this.setZoom(this.zoom / 1.25);
    }

    zoomTo100() {
      this.setZoom(1.0);
    }

    zoomToFit() {
      if (!this.doc || this.doc.rootIds.length === 0) {
        this.panX = 200;
        this.panY = 100;
        this.zoom = 1.0;
        this.requestRender();
        return;
      }

      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const id of this.doc.rootIds) {
        const node = this.doc.getNodeById(id);
        if (node) {
          const b = node.getWorldBounds(this.doc);
          if (b.minX < minX) minX = b.minX;
          if (b.minY < minY) minY = b.minY;
          if (b.maxX > maxX) maxX = b.maxX;
          if (b.maxY > maxY) maxY = b.maxY;
        }
      }

      if (minX === Infinity) return;

      const w = maxX - minX;
      const h = maxY - minY;
      const margin = 100;
      const viewW = this.canvas.width / this.dpr - margin * 2;
      const viewH = this.canvas.height / this.dpr - margin * 2;

      const fitZoom = Math.min(viewW / w, viewH / h, 1.2);
      this.zoom = Math.max(0.1, fitZoom);

      const centerWorldX = minX + w / 2;
      const centerWorldY = minY + h / 2;
      this.panX = (this.canvas.width / (2 * this.dpr)) - centerWorldX * this.zoom;
      this.panY = (this.canvas.height / (2 * this.dpr)) - centerWorldY * this.zoom;

      this.updateZoomDisplay();
      this.requestRender();
    }

    updateZoomDisplay() {
      const zoomEl = document.getElementById('zoom-percentage-text');
      if (zoomEl) {
        zoomEl.textContent = `${Math.round(this.zoom * 100)}%`;
      }
    }

    requestRender() {
      if (this.renderPending) return;
      this.renderPending = true;
      requestAnimationFrame(() => {
        this.renderPending = false;
        this.render();
      });
    }

    render() {
      const ctx = this.ctx;
      const w = this.canvas.width / this.dpr;
      const h = this.canvas.height / this.dpr;

      ctx.save();
      // Set high-DPI scaling
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

      // 1. Clear background
      ctx.fillStyle = '#0b0c10';
      ctx.fillRect(0, 0, w, h);

      // 2. Infinite Grid
      this.renderGrid(ctx, w, h);

      // 3. Setup Camera Transform for World Space
      ctx.save();
      ctx.translate(this.panX, this.panY);
      ctx.scale(this.zoom, this.zoom);

      // 4. Render Scene Graph Nodes
      this.renderScene(ctx, true);

      // 5. Draw Smart Snap Guides
      this.renderGuides(ctx);

      // 6. Draw Marquee Selection Box
      if (this.marqueeRect) {
        ctx.fillStyle = 'rgba(99, 102, 241, 0.12)';
        ctx.strokeStyle = '#6366f1';
        ctx.lineWidth = 1 / this.zoom;
        ctx.fillRect(this.marqueeRect.x, this.marqueeRect.y, this.marqueeRect.width, this.marqueeRect.height);
        ctx.strokeRect(this.marqueeRect.x, this.marqueeRect.y, this.marqueeRect.width, this.marqueeRect.height);
      }

      ctx.restore();

      // 7. Render Selection Handles & Gizmos in Screen Space for 1px sharpness
      this.renderSelectionGizmos(ctx);

      ctx.restore();

      // Update rulers
      this.renderRulers();
    }

    renderGrid(ctx, width, height) {
      const baseGridSize = 20;
      let gridSize = baseGridSize * this.zoom;

      // Adapt grid density
      while (gridSize < 14) gridSize *= 5;
      while (gridSize > 70) gridSize /= 5;

      const offsetX = this.panX % gridSize;
      const offsetY = this.panY % gridSize;

      ctx.save();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';

      const dotRadius = Math.max(0.75, Math.min(1.5, 1.0 * (this.zoom > 1 ? 1.2 : 0.9)));
      const startX = offsetX - gridSize;
      const startY = offsetY - gridSize;

      for (let x = startX; x < width + gridSize; x += gridSize) {
        for (let y = startY; y < height + gridSize; y += gridSize) {
          ctx.beginPath();
          ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
    }

    renderScene(ctx, isInteractive = true) {
      if (!this.doc) return;

      for (const rootId of this.doc.rootIds) {
        const rootNode = this.doc.getNodeById(rootId);
        if (rootNode) {
          this.renderNode(ctx, rootNode, isInteractive);
        }
      }
    }

    renderNode(ctx, node, isInteractive) {
      if (!node.visible) return;

      ctx.save();

      // Apply opacity & blend mode
      ctx.globalAlpha *= node.opacity ?? 1.0;
      if (node.blendMode && node.blendMode !== 'source-over') {
        ctx.globalCompositeOperation = node.blendMode;
      }

      // Local Matrix transform: translate & rotate around center
      const rad = (node.rotation * Math.PI) / 180;
      const cx = node.x + node.width / 2;
      const cy = node.y + node.height / 2;

      ctx.translate(cx, cy);
      if (node.rotation !== 0) ctx.rotate(rad);
      if (node.scaleX !== 1 || node.scaleY !== 1) ctx.scale(node.scaleX, node.scaleY);
      ctx.translate(-node.width / 2, -node.height / 2);

      // Render Drop Shadow if present
      if (node.shadow) {
        ctx.shadowColor = node.shadow.color || 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = node.shadow.blur || 12;
        ctx.shadowOffsetX = node.shadow.x || 0;
        ctx.shadowOffsetY = node.shadow.y || 4;
      }

      // Render Node by Type
      switch (node.type) {
        case 'frame':
          this.renderFrame(ctx, node, isInteractive);
          break;
        case 'rectangle':
          this.renderRect(ctx, node);
          break;
        case 'ellipse':
          this.renderEllipse(ctx, node);
          break;
        case 'polygon':
          this.renderPolygon(ctx, node);
          break;
        case 'text':
          this.renderText(ctx, node);
          break;
        case 'image':
          this.renderImage(ctx, node);
          break;
        case 'mesh3d':
          this.renderMesh3D(ctx, node);
          break;
        case 'group':
          // Container: children render in local coordinates
          break;
      }

      // Render Children
      if (node.children && node.children.length > 0) {
        for (const childId of node.children) {
          const childNode = this.doc.getNodeById(childId);
          if (childNode) {
            this.renderNode(ctx, childNode, isInteractive);
          }
        }
      }

      ctx.restore();
    }

    renderFrame(ctx, node, isInteractive) {
      const w = node.width;
      const h = node.height;
      const r = node.cornerRadius || 0;

      // Draw background
      ctx.beginPath();
      if (r > 0 && ctx.roundRect) {
        ctx.roundRect(0, 0, w, h, r);
      } else {
        ctx.rect(0, 0, w, h);
      }
      ctx.fillStyle = node.fill || '#14151b';
      ctx.fill();

      // Border
      if (node.stroke) {
        ctx.strokeStyle = node.stroke;
        ctx.lineWidth = node.strokeWidth || 1;
        ctx.stroke();
      }

      // Frame title badge outside frame
      if (isInteractive) {
        ctx.save();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
        ctx.fillText(node.name || 'Frame', 0, -8);
        ctx.restore();
      }

      // Content clipping
      if (node.clipContent) {
        ctx.beginPath();
        if (r > 0 && ctx.roundRect) ctx.roundRect(0, 0, w, h, r);
        else ctx.rect(0, 0, w, h);
        ctx.clip();
      }
    }

    renderRect(ctx, node) {
      const w = node.width;
      const h = node.height;
      const r = node.cornerRadius || 0;

      ctx.beginPath();
      if (r > 0 && ctx.roundRect) {
        ctx.roundRect(0, 0, w, h, r);
      } else {
        ctx.rect(0, 0, w, h);
      }

      if (node.fill && node.fill !== 'transparent') {
        ctx.fillStyle = node.fill;
        ctx.fill();
      }

      if (node.stroke) {
        ctx.strokeStyle = node.stroke;
        ctx.lineWidth = node.strokeWidth || 1;
        if (node.strokeDash && node.strokeDash.length > 0) {
          ctx.setLineDash(node.strokeDash);
        }
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    renderEllipse(ctx, node) {
      const rx = node.width / 2;
      const ry = node.height / 2;

      ctx.beginPath();
      ctx.ellipse(rx, ry, rx, ry, 0, 0, Math.PI * 2);

      if (node.fill && node.fill !== 'transparent') {
        ctx.fillStyle = node.fill;
        ctx.fill();
      }

      if (node.stroke) {
        ctx.strokeStyle = node.stroke;
        ctx.lineWidth = node.strokeWidth || 1;
        ctx.stroke();
      }
    }

    renderPolygon(ctx, node) {
      const points = node.pointsCount || 5;
      const isStar = node.isStar || false;
      const starRatio = node.starRatio || 0.5;

      const cx = node.width / 2;
      const cy = node.height / 2;
      const outerR = Math.min(cx, cy);
      const innerR = outerR * starRatio;

      ctx.beginPath();
      const totalSteps = isStar ? points * 2 : points;
      const stepAngle = (Math.PI * 2) / totalSteps;

      for (let i = 0; i < totalSteps; i++) {
        const angle = i * stepAngle - Math.PI / 2;
        const r = (isStar && i % 2 !== 0) ? innerR : outerR;
        const x = cx + Math.cos(angle) * r;
        const y = cy + Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();

      if (node.fill && node.fill !== 'transparent') {
        ctx.fillStyle = node.fill;
        ctx.fill();
      }

      if (node.stroke) {
        ctx.strokeStyle = node.stroke;
        ctx.lineWidth = node.strokeWidth || 1;
        ctx.stroke();
      }
    }

    renderText(ctx, node) {
      ctx.font = `${node.fontWeight || '400'} ${node.fontSize || 16}px ${node.fontFamily || 'Inter, sans-serif'}`;
      ctx.fillStyle = node.fill || '#ffffff';
      ctx.textAlign = node.textAlign || 'left';
      ctx.textBaseline = 'top';

      const lines = (node.text || '').split('\n');
      const lineHeight = (node.fontSize || 16) * (node.lineHeight || 1.3);

      let startX = 0;
      if (node.textAlign === 'center') startX = node.width / 2;
      else if (node.textAlign === 'right') startX = node.width;

      for (let i = 0; i < lines.length; i++) {
        ctx.fillText(lines[i], startX, i * lineHeight);
      }
    }

    renderImage(ctx, node) {
      if (node.loaded && node.imgElement) {
        ctx.drawImage(node.imgElement, 0, 0, node.width, node.height);
      } else {
        // Placeholder
        ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.fillRect(0, 0, node.width, node.height);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.strokeRect(0, 0, node.width, node.height);

        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('🖼 Image Loading...', node.width / 2, node.height / 2);
      }
    }

    renderMesh3D(ctx, node) {
      // Auto-rotation update if playing
      if (node.autoSpin && (!window.FigmaX.app || !window.FigmaX.app.timeline || !window.FigmaX.app.timeline.isPlaying)) {
        node.rotY = (node.rotY + (node.spinSpeed || 0.6)) % 360;
      }

      if (this.engine3d) {
        const offscreenCanvas = this.engine3d.renderNodeToCanvas(node, node.width, node.height);
        if (offscreenCanvas) {
          ctx.drawImage(offscreenCanvas, 0, 0, node.width, node.height);
        }
      }

      // Sleek subtle border around 3D frame
      if (node.stroke) {
        ctx.strokeStyle = node.stroke;
        ctx.lineWidth = node.strokeWidth || 1;
        if (ctx.roundRect) {
          ctx.beginPath();
          ctx.roundRect(0, 0, node.width, node.height, node.cornerRadius || 8);
          ctx.stroke();
        }
      }
    }

    renderGuides(ctx) {
      if (!this.guides || this.guides.length === 0) return;
      ctx.save();
      ctx.strokeStyle = '#f43f5e';
      ctx.lineWidth = 1 / this.zoom;
      ctx.setLineDash([4 / this.zoom, 4 / this.zoom]);

      for (const g of this.guides) {
        ctx.beginPath();
        if (g.type === 'v') {
          ctx.moveTo(g.pos, -10000);
          ctx.lineTo(g.pos, 10000);
        } else {
          ctx.moveTo(-10000, g.pos);
          ctx.lineTo(10000, g.pos);
        }
        ctx.stroke();
      }
      ctx.restore();
    }

    renderSelectionGizmos(ctx) {
      if (!this.doc || this.doc.selectedIds.length === 0) return;

      ctx.save();

      for (const id of this.doc.selectedIds) {
        const node = this.doc.getNodeById(id);
        if (!node || !node.visible) continue;

        // Compute 4 corners in screen coordinates
        const wm = node.getWorldMatrix(this.doc);
        const p0 = this.worldToScreen(wm.transformPoint(0, 0).x, wm.transformPoint(0, 0).y);
        const p1 = this.worldToScreen(wm.transformPoint(node.width, 0).x, wm.transformPoint(node.width, 0).y);
        const p2 = this.worldToScreen(wm.transformPoint(node.width, node.height).x, wm.transformPoint(node.width, node.height).y);
        const p3 = this.worldToScreen(wm.transformPoint(0, node.height).x, wm.transformPoint(0, node.height).y);

        // Bounding outline
        ctx.strokeStyle = '#6366f1';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.lineTo(p3.x, p3.y);
        ctx.closePath();
        ctx.stroke();

        // 8 Resize Handles
        const handles = [
          p0, // NW
          new Vec2((p0.x + p1.x) / 2, (p0.y + p1.y) / 2), // N
          p1, // NE
          new Vec2((p1.x + p2.x) / 2, (p1.y + p2.y) / 2), // E
          p2, // SE
          new Vec2((p2.x + p3.x) / 2, (p2.y + p3.y) / 2), // S
          p3, // SW
          new Vec2((p3.x + p0.x) / 2, (p3.y + p0.y) / 2)  // W
        ];

        const handleSize = 8;
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#6366f1';
        ctx.lineWidth = 1.5;

        for (const h of handles) {
          ctx.fillRect(h.x - handleSize / 2, h.y - handleSize / 2, handleSize, handleSize);
          ctx.strokeRect(h.x - handleSize / 2, h.y - handleSize / 2, handleSize, handleSize);
        }

        // Rotation Handle (top lollipop)
        const topMid = handles[1];
        const rad = (node.rotation * Math.PI) / 180;
        const stemLen = 22;
        const rotHandlePos = new Vec2(
          topMid.x - Math.sin(rad) * stemLen,
          topMid.y - Math.cos(rad) * stemLen
        );

        ctx.beginPath();
        ctx.moveTo(topMid.x, topMid.y);
        ctx.lineTo(rotHandlePos.x, rotHandlePos.y);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(rotHandlePos.x, rotHandlePos.y, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }

      ctx.restore();
    }

    renderRulers() {
      // Horizontal ruler
      const rH = document.getElementById('ruler-horizontal');
      const rV = document.getElementById('ruler-vertical');
      if (!rH || !rV) return;

      const ctxH = rH.getContext('2d');
      const ctxV = rV.getContext('2d');
      if (!ctxH || !ctxV) return;

      rH.width = rH.parentElement.clientWidth - 20;
      rH.height = 20;
      rV.width = 20;
      rV.height = rV.parentElement.clientHeight - 20;

      ctxH.fillStyle = '#111216';
      ctxH.fillRect(0, 0, rH.width, rH.height);
      ctxV.fillStyle = '#111216';
      ctxV.fillRect(0, 0, rV.width, rV.height);

      ctxH.fillStyle = '#64748b';
      ctxH.font = '9px monospace';
      ctxV.fillStyle = '#64748b';
      ctxV.font = '9px monospace';

      const step = 100 * this.zoom;
      const startX = (this.panX % step) - step;

      ctxH.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctxH.beginPath();
      for (let x = startX; x < rH.width; x += step) {
        ctxH.moveTo(x, 12);
        ctxH.lineTo(x, 20);
        const worldVal = Math.round(this.screenToWorld(x + 20, 0).x);
        ctxH.fillText(worldVal, x + 2, 10);
      }
      ctxH.stroke();

      const startY = (this.panY % step) - step;
      ctxV.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctxV.beginPath();
      for (let y = startY; y < rV.height; y += step) {
        ctxV.moveTo(12, y);
        ctxV.lineTo(20, y);
        const worldVal = Math.round(this.screenToWorld(0, y + 20).y);
        ctxV.save();
        ctxV.translate(10, y + 10);
        ctxV.rotate(-Math.PI / 2);
        ctxV.fillText(worldVal, 0, 0);
        ctxV.restore();
      }
      ctxV.stroke();
    }
  }

  window.FigmaX = window.FigmaX || {};
  window.FigmaX.Canvas2D = Canvas2D;
})();
