/**
 * FIGMA-X: Storage, Persistence & Export Manager
 * IndexedDB storage for auto-save, JSON project import/export, PNG export, and SVG generation.
 */

(function() {
  const DB_NAME = 'FigmaX_Database';
  const DB_VERSION = 1;
  const STORE_NAME = 'projects';

  class StorageManager {
    constructor(doc, timeline) {
      this.doc = doc;
      this.timeline = timeline;
      this.db = null;
      this.autoSaveInterval = null;
      this.lastSavedTime = null;
      this.initDB();
    }

    async initDB() {
      return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = (e) => {
          const db = e.target.result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          }
        };
        req.onsuccess = (e) => {
          this.db = e.target.result;
          this.startAutoSave();
          resolve(this.db);
        };
        req.onerror = (e) => {
          console.warn('IndexedDB failed, falling back to LocalStorage', e);
          resolve(null);
        };
      });
    }

    startAutoSave(intervalMs = 4000) {
      if (this.autoSaveInterval) clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = setInterval(() => {
        this.saveCurrentProject(true);
      }, intervalMs);
    }

    async saveCurrentProject(isAutoSave = false) {
      if (!this.doc) return;

      const projectData = {
        id: 'current_project',
        title: this.doc.title || 'Untitled Design',
        updatedAt: Date.now(),
        document: this.doc.serialize(),
        timeline: this.timeline ? this.timeline.serialize() : null
      };

      if (this.db) {
        try {
          const tx = this.db.transaction([STORE_NAME], 'readwrite');
          const store = tx.objectStore(STORE_NAME);
          store.put(projectData);
          this.lastSavedTime = Date.now();
          this.updateSaveIndicator(isAutoSave);
        } catch (e) {
          console.error('Error saving to IndexedDB:', e);
        }
      } else {
        try {
          localStorage.setItem('figmax_project', JSON.stringify(projectData));
          this.lastSavedTime = Date.now();
          this.updateSaveIndicator(isAutoSave);
        } catch (e) {
          console.error('Error saving to localStorage:', e);
        }
      }
    }

    updateSaveIndicator(isAutoSave) {
      const el = document.getElementById('save-status-text');
      if (el) {
        el.textContent = 'Saved to Cloud';
        el.style.color = '#10b981';
      }
    }

    async loadSavedProject() {
      if (this.db) {
        return new Promise((resolve) => {
          try {
            const tx = this.db.transaction([STORE_NAME], 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const req = store.get('current_project');
            req.onsuccess = () => {
              if (req.result) {
                this.restoreProjectData(req.result);
                resolve(true);
              } else {
                resolve(false);
              }
            };
            req.onerror = () => resolve(false);
          } catch (e) {
            resolve(false);
          }
        });
      } else {
        const local = localStorage.getItem('figmax_project');
        if (local) {
          try {
            this.restoreProjectData(JSON.parse(local));
            return true;
          } catch (e) {
            return false;
          }
        }
        return false;
      }
    }

    restoreProjectData(data) {
      if (data.document && this.doc) {
        this.doc.deserialize(data.document);
      }
      if (data.timeline && this.timeline) {
        this.timeline.deserialize(data.timeline);
      }
    }

    exportProjectJSON() {
      if (!this.doc) return;
      const data = {
        app: 'FIGMA-X',
        version: '1.0',
        title: this.doc.title,
        exportedAt: new Date().toISOString(),
        document: this.doc.serialize(),
        timeline: this.timeline ? this.timeline.serialize() : null
      };

      const jsonStr = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(this.doc.title || 'design').toLowerCase().replace(/\s+/g, '-')}.figx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }

    importProjectJSON(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const data = JSON.parse(e.target.result);
            this.restoreProjectData(data);
            resolve(true);
          } catch (err) {
            console.error('Error importing project:', err);
            reject(err);
          }
        };
        reader.onerror = reject;
        reader.readAsText(file);
      });
    }

    /**
     * High-res PNG export of a target Frame or the entire workspace
     */
    exportPNG(targetNodeId = null, scale = 2) {
      const app = window.FigmaX.app;
      if (!app || !app.canvas2d) return;

      let bounds = null;
      if (targetNodeId) {
        const node = this.doc.getNodeById(targetNodeId);
        if (node) bounds = node.getWorldBounds(this.doc);
      }

      if (!bounds) {
        // Compute bounding box of all root elements
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const rootId of this.doc.rootIds) {
          const node = this.doc.getNodeById(rootId);
          if (node) {
            const b = node.getWorldBounds(this.doc);
            if (b.minX < minX) minX = b.minX;
            if (b.minY < minY) minY = b.minY;
            if (b.maxX > maxX) maxX = b.maxX;
            if (b.maxY > maxY) maxY = b.maxY;
          }
        }
        if (minX === Infinity) {
          bounds = { x: 0, y: 0, width: 1440, height: 900 };
        } else {
          bounds = { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
        }
      }

      const expCanvas = document.createElement('canvas');
      expCanvas.width = Math.max(100, Math.round(bounds.width * scale));
      expCanvas.height = Math.max(100, Math.round(bounds.height * scale));
      const expCtx = expCanvas.getContext('2d');

      expCtx.scale(scale, scale);
      expCtx.translate(-bounds.x, -bounds.y);

      // Render clean scene without UI gizmos
      app.canvas2d.renderScene(expCtx, false);

      const url = expCanvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(this.doc.title || 'design').toLowerCase().replace(/\s+/g, '-')}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }

    /**
     * SVG Export generator
     */
    exportSVG(targetNodeId = null) {
      let node = targetNodeId ? this.doc.getNodeById(targetNodeId) : null;
      let width = node ? node.width : 1440;
      let height = node ? node.height : 900;

      let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">\n`;
      svgContent += `  <style>text { font-family: Inter, system-ui, sans-serif; }</style>\n`;
      svgContent += `  <rect width="${width}" height="${height}" fill="#0f1015" />\n`;

      const renderNodeSVG = (n) => {
        if (!n.visible) return '';
        let res = '';
        const op = n.opacity !== undefined ? ` opacity="${n.opacity}"` : '';

        if (n.type === 'frame' || n.type === 'rectangle') {
          res += `  <rect x="${n.x}" y="${n.y}" width="${n.width}" height="${n.height}" rx="${n.cornerRadius || 0}" fill="${n.fill || 'transparent'}" stroke="${n.stroke || 'none'}" stroke-width="${n.strokeWidth || 0}"${op} />\n`;
        } else if (n.type === 'ellipse') {
          const rx = n.width / 2;
          const ry = n.height / 2;
          res += `  <ellipse cx="${n.x + rx}" cy="${n.y + ry}" rx="${rx}" ry="${ry}" fill="${n.fill || 'transparent'}" stroke="${n.stroke || 'none'}" stroke-width="${n.strokeWidth || 0}"${op} />\n`;
        } else if (n.type === 'text') {
          res += `  <text x="${n.x}" y="${n.y + (n.fontSize || 16)}" font-size="${n.fontSize || 16}" font-weight="${n.fontWeight || 500}" fill="${n.fill || '#fff'}"${op}>${(n.text || '').replace(/&/g, '&amp;').replace(/</g, '&lt;')}</text>\n`;
        }

        if (n.children && n.children.length > 0) {
          for (const cid of n.children) {
            const child = this.doc.getNodeById(cid);
            if (child) res += renderNodeSVG(child);
          }
        }
        return res;
      };

      if (node) {
        svgContent += renderNodeSVG(node);
      } else {
        for (const rid of this.doc.rootIds) {
          const rootNode = this.doc.getNodeById(rid);
          if (rootNode) svgContent += renderNodeSVG(rootNode);
        }
      }

      svgContent += `</svg>`;

      const blob = new Blob([svgContent], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(this.doc.title || 'design').toLowerCase().replace(/\s+/g, '-')}.svg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  }

  window.FigmaX = window.FigmaX || {};
  window.FigmaX.StorageManager = StorageManager;
})();
