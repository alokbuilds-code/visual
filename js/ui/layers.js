/**
 * FIGMA-X: Left Sidebar (Layers Panel & Assets Library)
 * Scene graph tree rendering, visibility toggles, lock toggles, layer renaming,
 * reordering, asset stamping, and local image uploads.
 */

(function() {
  const { NodeFactory } = window.FigmaX;

  class LayersPanel {
    constructor(treeContainer, assetsContainer, doc, history, canvas2d) {
      this.treeContainer = treeContainer;
      this.assetsContainer = assetsContainer;
      this.doc = doc;
      this.history = history;
      this.canvas2d = canvas2d;

      this.initAssets();
      this.bindTabSwitching();

      if (this.doc) {
        this.doc.subscribe((event) => {
          this.renderTree();
        });
      }

      this.renderTree();
    }

    bindTabSwitching() {
      const tabs = document.querySelectorAll('.sidebar-tab');
      tabs.forEach(tab => {
        tab.addEventListener('click', () => {
          tabs.forEach(t => t.classList.remove('active'));
          tab.classList.add('active');

          const isLayers = tab.dataset.tab === 'layers';
          const treeView = document.getElementById('layers-tree-view');
          const assetsView = document.getElementById('assets-view');
          if (treeView) treeView.style.display = isLayers ? 'flex' : 'none';
          if (assetsView) assetsView.style.display = isLayers ? 'none' : 'flex';
        });
      });
    }

    getNodeIcon(node) {
      switch (node.type) {
        case 'frame':
          return `<svg class="layer-icon icon-frame" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>`;
        case 'rectangle':
          return `<svg class="layer-icon icon-rect" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>`;
        case 'ellipse':
          return `<svg class="layer-icon icon-ellipse" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/></svg>`;
        case 'polygon':
          return `<svg class="layer-icon icon-rect" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;
        case 'text':
          return `<svg class="layer-icon icon-text" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>`;
        case 'image':
          return `<svg class="layer-icon icon-rect" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`;
        case 'group':
          return `<svg class="layer-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>`;
        case 'mesh3d':
          return `<svg class="layer-icon icon-3d" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>`;
        default:
          return `<svg class="layer-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18"/></svg>`;
      }
    }

    renderTree() {
      if (!this.treeContainer || !this.doc) return;
      this.treeContainer.innerHTML = '';

      const renderNodeItem = (nodeId, depth = 0) => {
        const node = this.doc.getNodeById(nodeId);
        if (!node) return;

        const isSelected = this.doc.selectedIds.includes(node.id);
        const item = document.createElement('div');
        item.className = `layer-item ${isSelected ? 'selected' : ''}`;
        item.dataset.id = node.id;

        // Depth Indentation
        let indentHtml = '';
        for (let i = 0; i < depth; i++) {
          indentHtml += '<span class="layer-indent"></span>';
        }

        const eyeIcon = node.visible
          ? `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`
          : `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;

        const lockIcon = node.locked
          ? `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`
          : `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>`;

        item.innerHTML = `
          ${indentHtml}
          ${this.getNodeIcon(node)}
          <span class="layer-name">${node.name}</span>
          <div class="layer-actions">
            <button class="layer-action-btn btn-vis" title="Toggle Visibility">${eyeIcon}</button>
            <button class="layer-action-btn btn-lock ${node.locked ? 'active' : ''}" title="Toggle Lock">${lockIcon}</button>
          </div>
        `;

        // Click to select
        item.addEventListener('click', (e) => {
          if (e.target.closest('.layer-action-btn')) return;
          if (e.shiftKey) {
            if (this.doc.selectedIds.includes(node.id)) {
              this.doc.selectedIds = this.doc.selectedIds.filter(id => id !== node.id);
            } else {
              this.doc.selectedIds.push(node.id);
            }
          } else {
            this.doc.selectedIds = [node.id];
          }
          this.doc.notify('selectionChange');
          this.canvas2d.requestRender();
        });

        // Double-click to rename
        const nameEl = item.querySelector('.layer-name');
        nameEl.addEventListener('dblclick', (e) => {
          e.stopPropagation();
          const input = document.createElement('input');
          input.type = 'text';
          input.className = 'layer-name-input';
          input.value = node.name;
          nameEl.replaceWith(input);
          input.focus();
          input.select();

          const saveRename = () => {
            node.name = input.value || node.getDefaultName();
            this.history.recordState('Rename Layer');
            this.renderTree();
          };

          input.addEventListener('blur', saveRename);
          input.addEventListener('keydown', (ke) => {
            if (ke.key === 'Enter') saveRename();
            if (ke.key === 'Escape') this.renderTree();
          });
        });

        // Visibility button
        item.querySelector('.btn-vis').addEventListener('click', (e) => {
          e.stopPropagation();
          node.visible = !node.visible;
          this.history.recordState('Toggle Visibility');
          this.renderTree();
          this.canvas2d.requestRender();
        });

        // Lock button
        item.querySelector('.btn-lock').addEventListener('click', (e) => {
          e.stopPropagation();
          node.locked = !node.locked;
          this.history.recordState('Toggle Lock');
          this.renderTree();
        });

        this.treeContainer.appendChild(item);

        // Recursively render children
        if (node.children && node.children.length > 0) {
          for (let i = node.children.length - 1; i >= 0; i--) {
            renderNodeItem(node.children[i], depth + 1);
          }
        }
      };

      // Top-down render of root IDs (reverse order so top layer appears top in tree)
      for (let i = this.doc.rootIds.length - 1; i >= 0; i--) {
        renderNodeItem(this.doc.rootIds[i], 0);
      }
    }

    initAssets() {
      if (!this.assetsContainer) return;

      this.assetsContainer.innerHTML = `
        <div class="asset-category-title">Quick Components</div>
        <div class="asset-grid">
          <div class="asset-card" data-asset="glass-card">
            <div class="asset-preview-box">
              <div style="width: 48px; height: 32px; background: rgba(99,102,241,0.25); border: 1px solid rgba(255,255,255,0.2); border-radius: 4px;"></div>
            </div>
            <span class="asset-title">Glass Card</span>
          </div>

          <div class="asset-card" data-asset="glow-button">
            <div class="asset-preview-box">
              <div style="width: 50px; height: 20px; background: #6366f1; border-radius: 10px; box-shadow: 0 0 10px rgba(99,102,241,0.8);"></div>
            </div>
            <span class="asset-title">Glow Button</span>
          </div>

          <div class="asset-card" data-asset="cyber-torus">
            <div class="asset-preview-box">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#a855f7" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
            </div>
            <span class="asset-title">Cyber 3D Torus</span>
          </div>

          <div class="asset-card" data-asset="stat-badge">
            <div class="asset-preview-box">
              <span style="font-size: 16px; font-weight: 700; color: #10b981;">99.9%</span>
            </div>
            <span class="asset-title">Stat Counter</span>
          </div>
        </div>

        <div class="asset-category-title" style="margin-top: 18px;">Media & Images</div>
        <button class="btn-secondary" id="btn-upload-image" style="width: 100%; justify-content: center;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          Upload Local Image
        </button>
        <input type="file" id="file-upload-input" accept="image/*" style="display: none;">
      `;

      // Asset Stamping
      this.assetsContainer.querySelectorAll('.asset-card').forEach(card => {
        card.addEventListener('click', () => {
          this.stampAsset(card.dataset.asset);
        });
      });

      // Image upload
      const btnUpload = document.getElementById('btn-upload-image');
      const fileInput = document.getElementById('file-upload-input');
      if (btnUpload && fileInput) {
        btnUpload.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', (e) => {
          const file = e.target.files[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = (re) => {
            const centerWorld = this.canvas2d.screenToWorld(
              this.canvas2d.canvas.width / (2 * this.canvas2d.dpr),
              this.canvas2d.canvas.height / (2 * this.canvas2d.dpr)
            );
            const imgNode = NodeFactory.create({
              type: 'image',
              name: file.name.split('.')[0] || 'Image',
              src: re.target.result,
              x: Math.round(centerWorld.x - 150),
              y: Math.round(centerWorld.y - 100),
              width: 300,
              height: 200,
              cornerRadius: 12
            });
            this.doc.addNode(imgNode);
            this.doc.selectedIds = [imgNode.id];
            this.history.recordState('Insert Image');
            this.doc.notify('selectionChange');
            this.canvas2d.requestRender();
          };
          reader.readAsDataURL(file);
        });
      }
    }

    stampAsset(assetType) {
      const centerWorld = this.canvas2d.screenToWorld(
        this.canvas2d.canvas.width / (2 * this.canvas2d.dpr),
        this.canvas2d.canvas.height / (2 * this.canvas2d.dpr)
      );
      const cx = Math.round(centerWorld.x);
      const cy = Math.round(centerWorld.y);

      switch (assetType) {
        case 'glass-card': {
          const card = NodeFactory.create({
            type: 'rectangle',
            name: 'Glassmorphism Card',
            x: cx - 140,
            y: cy - 90,
            width: 280,
            height: 180,
            fill: 'rgba(255, 255, 255, 0.06)',
            stroke: 'rgba(255, 255, 255, 0.16)',
            strokeWidth: 1,
            cornerRadius: 16,
            shadow: { x: 0, y: 12, blur: 24, color: 'rgba(0,0,0,0.5)' }
          });
          this.doc.addNode(card);
          this.doc.selectedIds = [card.id];
          break;
        }
        case 'glow-button': {
          const btn = NodeFactory.create({
            type: 'rectangle',
            name: 'Glow Pill Button',
            x: cx - 80,
            y: cy - 22,
            width: 160,
            height: 44,
            fill: '#6366f1',
            cornerRadius: 22,
            shadow: { x: 0, y: 4, blur: 16, color: 'rgba(99,102,241,0.6)' }
          });
          const text = NodeFactory.create({
            type: 'text',
            name: 'Button Label',
            text: 'Get Started →',
            x: cx - 50,
            y: cy - 10,
            width: 100,
            height: 20,
            fontSize: 14,
            fontWeight: '600',
            fill: '#ffffff',
            textAlign: 'center'
          });
          this.doc.addNode(btn);
          this.doc.addNode(text);
          this.doc.selectedIds = [btn.id, text.id];
          break;
        }
        case 'cyber-torus': {
          const torus = NodeFactory.create({
            type: 'mesh3d',
            name: 'Interactive 3D Torus',
            primitive: 'torus',
            x: cx - 110,
            y: cy - 110,
            width: 220,
            height: 220,
            materialColor: '#8b5cf6',
            autoSpin: true,
            spinSpeed: 0.8
          });
          this.doc.addNode(torus);
          this.doc.selectedIds = [torus.id];
          break;
        }
        case 'stat-badge': {
          const num = NodeFactory.create({
            type: 'text',
            name: 'Stat Metric',
            text: '10x Faster',
            x: cx - 80,
            y: cy - 25,
            width: 160,
            height: 40,
            fontSize: 32,
            fontWeight: '800',
            fill: '#10b981'
          });
          this.doc.addNode(num);
          this.doc.selectedIds = [num.id];
          break;
        }
      }

      this.history.recordState('Stamp Component');
      this.doc.notify('selectionChange');
      this.canvas2d.requestRender();
    }
  }

  window.FigmaX = window.FigmaX || {};
  window.FigmaX.LayersPanel = LayersPanel;
})();
