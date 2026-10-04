/**
 * FIGMA-X: Interactive Scroll Presentation & Prototype Runner
 * Live simulated website environment demonstrating real scroll-driven transforms,
 * parallax physics, sticky sections, and 3D WebGL interactions.
 */

(function() {
  class ScrollPreviewUI {
    constructor(scrollEngine, doc, engine3d) {
      this.scrollEngine = scrollEngine;
      this.doc = doc;
      this.engine3d = engine3d;

      this.modal = document.getElementById('scroll-preview-modal');
      this.scrollContainer = document.getElementById('preview-scroll-container');
      this.progressBar = document.getElementById('scroll-progress-bar');
      this.canvas3D = document.getElementById('scroll-hero-webgl-canvas');

      this.active3DNode = null;
      this.rafId = null;

      this.initEvents();
    }

    initEvents() {
      const closeBtn = document.getElementById('btn-close-scroll-preview');
      if (closeBtn) {
        closeBtn.addEventListener('click', () => this.close());
      }

      window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && this.modal && this.modal.classList.contains('active')) {
          this.close();
        }
      });

      if (this.scrollContainer) {
        this.scrollContainer.addEventListener('scroll', () => {
          const maxScroll = this.scrollContainer.scrollHeight - this.scrollContainer.clientHeight;
          const scrollY = this.scrollContainer.scrollTop;
          this.scrollEngine.setScroll(scrollY, maxScroll);

          const pct = Math.round(this.scrollEngine.scrollProgress * 100);
          if (this.progressBar) {
            this.progressBar.style.width = `${pct}%`;
          }

          const scrollPctText = document.getElementById('preview-scroll-pct-text');
          if (scrollPctText) {
            scrollPctText.textContent = `${pct}%`;
          }

          this.updateScrollElements();
        });
      }
    }

    open() {
      if (!this.modal) return;
      this.modal.classList.add('active');

      // Find the first 3D mesh node to power the interactive hero showcase
      const nodes = this.doc.getAllNodes();
      this.active3DNode = nodes.find(n => n.type === 'mesh3d') || null;

      // Start rendering loop for interactive 3D in the preview
      this.start3DLoop();

      // Reset scroll to top
      if (this.scrollContainer) {
        this.scrollContainer.scrollTop = 0;
      }
      this.scrollEngine.setScroll(0, 2000);
      this.updateScrollElements();
    }

    close() {
      if (!this.modal) return;
      this.modal.classList.remove('active');
      if (this.rafId) {
        cancelAnimationFrame(this.rafId);
        this.rafId = null;
      }
      this.scrollEngine.resetBaselines();

      // Return mode switcher to design
      const designBtn = document.querySelector('.mode-btn[data-mode="design"]');
      if (designBtn) designBtn.click();
    }

    start3DLoop() {
      const render = () => {
        if (!this.modal.classList.contains('active')) return;

        if (this.canvas3D && this.engine3d) {
          // Clone or reference 3D node
          const node = this.active3DNode || {
            id: 'preview_3d',
            type: 'mesh3d',
            primitive: 'torus',
            materialColor: '#8b5cf6',
            rotX: 25 + Math.sin(Date.now() * 0.001) * 15,
            rotY: (this.scrollEngine.scrollProgress * 720 + (Date.now() * 0.04)) % 360,
            rotZ: 0,
            scale3D: 1.35 + Math.sin(this.scrollEngine.scrollProgress * Math.PI) * 0.3,
            shininess: 64,
            wireframe: false,
            opacity: 1.0,
            pos3D: [0, 0, 0],
            lightDirection: [0.6, 0.8, 1.0]
          };

          const offscreen = this.engine3d.renderNodeToCanvas(node, 460, 460);
          if (offscreen) {
            const ctx = this.canvas3D.getContext('2d');
            this.canvas3D.width = 460;
            this.canvas3D.height = 460;
            ctx.clearRect(0, 0, 460, 460);
            ctx.drawImage(offscreen, 0, 0);
          }
        }

        this.rafId = requestAnimationFrame(render);
      };

      this.rafId = requestAnimationFrame(render);
    }

    updateScrollElements() {
      const p = this.scrollEngine.scrollProgress;

      // Parallax Card 1 (moves faster)
      const card1 = document.getElementById('preview-parallax-card-1');
      if (card1) {
        card1.style.transform = `translateY(${-p * 180}px) rotate(${p * 6}deg)`;
      }

      // Parallax Card 2 (moves slower with reverse tilt)
      const card2 = document.getElementById('preview-parallax-card-2');
      if (card2) {
        card2.style.transform = `translateY(${-p * 110}px) rotate(${-p * 4}deg)`;
      }

      // Hero Title scale and fade
      const heroContent = document.getElementById('preview-hero-content');
      if (heroContent) {
        heroContent.style.opacity = `${Math.max(0, 1 - p * 2.5)}`;
        heroContent.style.transform = `translateY(${p * 120}px) scale(${1 - p * 0.2})`;
      }

      // Feature Section reveal
      const featureSec = document.getElementById('preview-feature-section');
      if (featureSec) {
        const featureProgress = Math.max(0, Math.min(1, (p - 0.2) / 0.4));
        featureSec.style.opacity = `${featureProgress}`;
        featureSec.style.transform = `translateY(${(1 - featureProgress) * 60}px)`;
      }
    }
  }

  window.FigmaX = window.FigmaX || {};
  window.FigmaX.ScrollPreviewUI = ScrollPreviewUI;
})();
