/**
 * FIGMA-X: Main Application Coordinator
 * Bootstraps Document, 2D Canvas, WebGL 3D Engine, Timeline, Scroll Parallax,
 * UI panels, IndexedDB persistence, and global keyboard shortcuts.
 */

(function() {
  const {
    Document,
    HistoryManager,
    Engine3D,
    Canvas2D,
    TimelineEngine,
    ScrollEngine,
    StorageManager,
    ToolManager,
    Inspector,
    LayersPanel,
    TimelineUI,
    ScrollPreviewUI,
    loadDefaultProject
  } = window.FigmaX;

  class App {
    constructor() {
      // 1. Core Data Models
      this.doc = new Document('NeoSpace — Spatial Studio');
      this.history = new HistoryManager(this.doc);
      this.engine3d = new Engine3D();
      this.timeline = new TimelineEngine(this.doc);
      this.scrollEngine = new ScrollEngine(this.doc);
      this.storage = new StorageManager(this.doc, this.timeline);

      // 2. 2D Infinite Canvas
      const canvasEl = document.getElementById('editor-canvas');
      this.canvas2d = new Canvas2D(canvasEl, this.doc, this.engine3d);

      // 3. Tool Interaction State Machine
      this.tools = new ToolManager(this.canvas2d, this.doc, this.history);

      // 4. UI Panels
      const inspectorEl = document.getElementById('inspector');
      this.inspector = new Inspector(inspectorEl, this.doc, this.history, this.canvas2d);

      const layersTree = document.getElementById('layers-tree');
      const assetsPanel = document.getElementById('assets-panel');
      this.layers = new LayersPanel(layersTree, assetsPanel, this.doc, this.history, this.canvas2d);

      this.timelineUi = new TimelineUI(this.timeline, this.doc, this.history, this.canvas2d);
      this.scrollUi = new ScrollPreviewUI(this.scrollEngine, this.doc, this.engine3d);

      this.initTopBar();
      this.initShortcuts();
      this.initModals();
      this.initProject();

      // Start continuous rendering loop for animated 3D meshes & timeline
      this.startLoop();
    }

    async initProject() {
      // Attempt to load from IndexedDB; otherwise load default project
      const hasSaved = await this.storage.loadSavedProject();
      if (!hasSaved || this.doc.rootIds.length === 0) {
        loadDefaultProject(this.doc, this.timeline);
      }

      this.history.recordState('Initial Project');
      this.canvas2d.zoomToFit();
      this.inspector.refresh();
      this.layers.renderTree();
      this.canvas2d.requestRender();
    }

    initTopBar() {
      // Project Title input
      const titleInput = document.getElementById('project-title-input');
      if (titleInput) {
        titleInput.value = this.doc.title;
        titleInput.addEventListener('change', () => {
          this.doc.title = titleInput.value || 'Untitled Design';
          this.storage.saveCurrentProject();
        });
      }

      // Mode Switcher
      const modeButtons = document.querySelectorAll('.mode-btn');
      modeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
          modeButtons.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');

          const mode = btn.dataset.mode;
          const timelinePanel = document.getElementById('timeline-panel');

          if (mode === 'animate') {
            if (timelinePanel) timelinePanel.classList.remove('collapsed');
            this.timeline.play();
          } else if (mode === 'scroll' || mode === 'preview') {
            this.scrollUi.open();
          } else {
            // Design mode
            if (timelinePanel) timelinePanel.classList.add('collapsed');
            this.timeline.pause();
          }
        });
      });

      // Topbar Quick Buttons
      document.getElementById('btn-undo')?.addEventListener('click', () => this.history.undo());
      document.getElementById('btn-redo')?.addEventListener('click', () => this.history.redo());
      document.getElementById('btn-zoom-in')?.addEventListener('click', () => this.canvas2d.zoomIn());
      document.getElementById('btn-zoom-out')?.addEventListener('click', () => this.canvas2d.zoomOut());
      document.getElementById('btn-zoom-fit')?.addEventListener('click', () => this.canvas2d.zoomToFit());
      document.getElementById('btn-zoom-100')?.addEventListener('click', () => this.canvas2d.zoomTo100());

      // Toolbar Buttons
      document.querySelectorAll('.tool-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const tool = btn.dataset.tool;
          if (tool) {
            this.tools.setTool(tool);
          }
        });
      });

      // 3D Primitive flyout items
      document.querySelectorAll('.flyout-item-3d').forEach(item => {
        item.addEventListener('click', (e) => {
          e.stopPropagation();
          const primitive = item.dataset.primitive;
          this.tools.setTool('mesh3d', { primitive });
          document.querySelectorAll('.tool-flyout-menu').forEach(m => m.classList.remove('show'));
        });
      });

      // Export button
      document.getElementById('btn-open-export-modal')?.addEventListener('click', () => {
        const modal = document.getElementById('export-modal');
        if (modal) modal.classList.add('active');
      });
    }

    initShortcuts() {
      window.addEventListener('keydown', (e) => {
        // Skip shortcuts if currently typing in an input/textarea
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

        const isCtrl = e.ctrlKey || e.metaKey;

        // V: Select tool
        if (e.key === 'v' || e.key === 'V') {
          this.tools.setTool('select');
        }
        // H: Hand tool
        else if (e.key === 'h' || e.key === 'H') {
          this.tools.setTool('hand');
        }
        // F: Frame tool
        else if (e.key === 'f' || e.key === 'F') {
          this.tools.setTool('frame');
        }
        // R: Rectangle tool
        else if (e.key === 'r' || e.key === 'R') {
          this.tools.setTool('rectangle');
        }
        // O: Ellipse tool
        else if (e.key === 'o' || e.key === 'O') {
          this.tools.setTool('ellipse');
        }
        // T: Text tool
        else if (e.key === 't' || e.key === 'T') {
          this.tools.setTool('text');
        }
        // Ctrl+Z: Undo
        else if (isCtrl && !e.shiftKey && (e.key === 'z' || e.key === 'Z')) {
          e.preventDefault();
          this.history.undo();
        }
        // Ctrl+Y or Ctrl+Shift+Z: Redo
        else if ((isCtrl && (e.key === 'y' || e.key === 'Y')) || (isCtrl && e.shiftKey && (e.key === 'z' || e.key === 'Z'))) {
          e.preventDefault();
          this.history.redo();
        }
        // Ctrl+D: Duplicate
        else if (isCtrl && (e.key === 'd' || e.key === 'D')) {
          e.preventDefault();
          this.duplicateSelection();
        }
        // Ctrl+G: Group
        else if (isCtrl && !e.shiftKey && (e.key === 'g' || e.key === 'G')) {
          e.preventDefault();
          this.doc.groupNodes(this.doc.selectedIds);
          this.history.recordState('Group Nodes');
          this.canvas2d.requestRender();
        }
        // Ctrl+Shift+G: Ungroup
        else if (isCtrl && e.shiftKey && (e.key === 'g' || e.key === 'G')) {
          e.preventDefault();
          if (this.doc.selectedIds.length > 0) {
            this.doc.ungroup(this.doc.selectedIds[0]);
            this.history.recordState('Ungroup');
            this.canvas2d.requestRender();
          }
        }
        // Ctrl+A: Select All
        else if (isCtrl && (e.key === 'a' || e.key === 'A')) {
          e.preventDefault();
          this.doc.selectedIds = [...this.doc.rootIds];
          this.doc.notify('selectionChange');
          this.canvas2d.requestRender();
        }
        // Delete or Backspace: Delete Node
        else if (e.key === 'Delete' || e.key === 'Backspace') {
          e.preventDefault();
          this.deleteSelection();
        }
        // Ctrl+0: Zoom Fit
        else if (isCtrl && e.key === '0') {
          e.preventDefault();
          this.canvas2d.zoomToFit();
        }
        // Ctrl+1: Zoom 100%
        else if (isCtrl && e.key === '1') {
          e.preventDefault();
          this.canvas2d.zoomTo100();
        }
      });
    }

    duplicateSelection() {
      if (this.doc.selectedIds.length === 0) return;
      const newIds = [];
      for (const id of this.doc.selectedIds) {
        const node = this.doc.getNodeById(id);
        if (node) {
          const clone = node.clone();
          this.doc.addNode(clone, node.parentId);
          newIds.push(clone.id);
        }
      }
      this.doc.selectedIds = newIds;
      this.history.recordState('Duplicate Node');
      this.doc.notify('selectionChange');
      this.canvas2d.requestRender();
    }

    deleteSelection() {
      if (this.doc.selectedIds.length === 0) return;
      for (const id of [...this.doc.selectedIds]) {
        this.doc.removeNode(id);
      }
      this.doc.selectedIds = [];
      this.history.recordState('Delete Node');
      this.doc.notify('selectionChange');
      this.canvas2d.requestRender();
    }

    initModals() {
      // Export modal
      const expModal = document.getElementById('export-modal');
      const closeExpBtn = document.getElementById('btn-close-export-modal');
      const btnExpPng = document.getElementById('btn-export-png');
      const btnExpSvg = document.getElementById('btn-export-svg');
      const btnExpJson = document.getElementById('btn-export-json');
      const btnImportJson = document.getElementById('btn-import-json');
      const fileImportInput = document.getElementById('file-import-input');

      if (closeExpBtn && expModal) {
        closeExpBtn.addEventListener('click', () => expModal.classList.remove('active'));
      }

      if (btnExpPng) {
        btnExpPng.addEventListener('click', () => {
          this.storage.exportPNG();
          if (expModal) expModal.classList.remove('active');
        });
      }

      if (btnExpSvg) {
        btnExpSvg.addEventListener('click', () => {
          this.storage.exportSVG();
          if (expModal) expModal.classList.remove('active');
        });
      }

      if (btnExpJson) {
        btnExpJson.addEventListener('click', () => {
          this.storage.exportProjectJSON();
          if (expModal) expModal.classList.remove('active');
        });
      }

      if (btnImportJson && fileImportInput) {
        btnImportJson.addEventListener('click', () => fileImportInput.click());
        fileImportInput.addEventListener('change', async (e) => {
          const file = e.target.files[0];
          if (file) {
            await this.storage.importProjectJSON(file);
            this.history.recordState('Import Project');
            this.canvas2d.zoomToFit();
            if (expModal) expModal.classList.remove('active');
          }
        });
      }

      // Shortcuts / Help modal
      const helpModal = document.getElementById('shortcuts-modal');
      const openHelpBtn = document.getElementById('btn-open-help');
      const closeHelpBtn = document.getElementById('btn-close-shortcuts-modal');

      if (openHelpBtn && helpModal) {
        openHelpBtn.addEventListener('click', () => helpModal.classList.add('active'));
      }
      if (closeHelpBtn && helpModal) {
        closeHelpBtn.addEventListener('click', () => helpModal.classList.remove('active'));
      }
    }

    startLoop() {
      const loop = () => {
        // If there are auto-spinning 3D meshes on canvas, re-render
        let hasSpinning3D = false;
        for (const node of this.doc.nodes.values()) {
          if (node.type === 'mesh3d' && node.autoSpin && node.visible) {
            hasSpinning3D = true;
            break;
          }
        }

        if (hasSpinning3D && (!this.timeline || !this.timeline.isPlaying)) {
          this.canvas2d.requestRender();
        }

        requestAnimationFrame(loop);
      };

      requestAnimationFrame(loop);
    }
  }

  // Launch when DOM is ready
  window.addEventListener('DOMContentLoaded', () => {
    window.FigmaX = window.FigmaX || {};
    window.FigmaX.app = new App();
  });
})();
