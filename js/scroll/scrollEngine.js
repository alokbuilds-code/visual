/**
 * FIGMA-X: Scroll-Driven Animation & Parallax Engine
 * Calculates scroll progress [0..1] and maps it to 2D transforms, opacity, scale,
 * and 3D WebGL rotations and positions for cinematic interactive web experiences.
 */

(function() {
  class ScrollEngine {
    constructor(doc) {
      this.doc = doc;
      this.scrollProgress = 0; // 0.0 to 1.0
      this.scrollY = 0;
      this.maxScroll = 2000;
      this.listeners = new Set();

      // Original property cache so scroll transforms don't destructively overwrite baseline values
      this.baselineCache = new Map(); // nodeId -> { x, y, opacity, rotation, scaleX, scaleY, rotX, rotY, rotZ }
    }

    subscribe(fn) {
      this.listeners.add(fn);
      return () => this.listeners.delete(fn);
    }

    notify(type = 'scroll') {
      for (const fn of this.listeners) {
        fn(type, { progress: this.scrollProgress, scrollY: this.scrollY });
      }
    }

    setScroll(scrollY, maxScroll = 2000) {
      this.scrollY = scrollY;
      this.maxScroll = Math.max(1, maxScroll);
      this.scrollProgress = Math.max(0, Math.min(1, scrollY / this.maxScroll));
      this.applyScrollEffects();
      this.notify('scroll');
    }

    setProgress(progress) {
      this.scrollProgress = Math.max(0, Math.min(1, progress));
      this.scrollY = this.scrollProgress * this.maxScroll;
      this.applyScrollEffects();
      this.notify('scroll');
    }

    cacheBaseline(node) {
      if (!this.baselineCache.has(node.id)) {
        this.baselineCache.set(node.id, {
          x: node.x,
          y: node.y,
          opacity: node.opacity,
          rotation: node.rotation,
          scaleX: node.scaleX,
          scaleY: node.scaleY,
          rotX: node.rotX ?? 0,
          rotY: node.rotY ?? 0,
          rotZ: node.rotZ ?? 0,
          scale3D: node.scale3D ?? 1
        });
      }
    }

    resetBaselines() {
      for (const [nodeId, base] of this.baselineCache.entries()) {
        const node = this.doc.getNodeById(nodeId);
        if (node) {
          node.x = base.x;
          node.y = base.y;
          node.opacity = base.opacity;
          node.rotation = base.rotation;
          node.scaleX = base.scaleX;
          node.scaleY = base.scaleY;
          if (node.type === 'mesh3d') {
            node.rotX = base.rotX;
            node.rotY = base.rotY;
            node.rotZ = base.rotZ;
            node.scale3D = base.scale3D;
          }
        }
      }
      this.baselineCache.clear();
    }

    applyScrollEffects() {
      if (!this.doc) return;

      const nodes = this.doc.getAllNodes();
      for (const node of nodes) {
        const trig = node.scrollTrigger;
        if (!trig || !trig.enabled) continue;

        this.cacheBaseline(node);
        const base = this.baselineCache.get(node.id);
        const start = (trig.startPct ?? 0) / 100;
        const end = (trig.endPct ?? 100) / 100;
        const range = Math.max(0.001, end - start);

        // Clamp local progress between start and end
        const localProgress = Math.max(0, Math.min(1, (this.scrollProgress - start) / range));
        const speed = trig.speed ?? 1.0;

        switch (trig.type) {
          case 'parallax': {
            // Smooth vertical parallax shift
            const shiftY = (this.scrollProgress - 0.5) * 300 * speed;
            node.y = base.y + shiftY;
            break;
          }
          case 'fade': {
            // Fade in or fade out across the scroll range
            node.opacity = base.opacity * localProgress;
            break;
          }
          case 'scale': {
            // Scale up or down
            const s = 0.8 + 0.4 * localProgress * speed;
            node.scaleX = base.scaleX * s;
            node.scaleY = base.scaleY * s;
            break;
          }
          case 'rotate': {
            // Continuous rotation
            node.rotation = base.rotation + localProgress * 360 * speed;
            break;
          }
          case '3d-spin': {
            // Interactive 3D object rotation linked to scroll
            if (node.type === 'mesh3d') {
              node.rotY = base.rotY + localProgress * 360 * speed;
              node.rotX = base.rotX + Math.sin(localProgress * Math.PI) * 35;
              node.scale3D = base.scale3D * (0.9 + 0.25 * Math.sin(localProgress * Math.PI));
            }
            break;
          }
        }
      }

      if (window.FigmaX.app && window.FigmaX.app.canvas2d) {
        window.FigmaX.app.canvas2d.requestRender();
      }
    }
  }

  window.FigmaX = window.FigmaX || {};
  window.FigmaX.ScrollEngine = ScrollEngine;
})();
