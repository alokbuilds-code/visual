/**
 * FIGMA-X: Timeline & Keyframe UI Component
 * Scrubbable playhead, time ruler, track inspector, keyframe markers, and easing controls.
 */

(function() {
  class TimelineUI {
    constructor(timeline, doc, history, canvas2d) {
      this.timeline = timeline;
      this.doc = doc;
      this.history = history;
      this.canvas2d = canvas2d;

      this.panel = document.getElementById('timeline-panel');
      this.tracksContainer = document.getElementById('timeline-tracks-header');
      this.rulerCanvas = document.getElementById('timeline-ruler-canvas');
      this.gridCanvas = document.getElementById('timeline-grid-canvas');
      this.gridContainer = document.getElementById('timeline-grid-container');
      this.playhead = document.getElementById('timeline-playhead');

      this.selectedKeyframe = null; // { track, kf }
      this.isScrubbing = false;
      this.isDraggingKf = false;

      this.initControls();
      this.initRuler();
      this.bindEvents();

      this.timeline.subscribe((event, payload) => {
        if (event === 'tick' || event === 'timeChange') {
          this.updatePlayheadPosition();
          this.updateTimeDisplay();
        } else if (event === 'playState') {
          this.updatePlayButton(payload);
        } else if (event === 'trackAdded' || event === 'tracksLoaded') {
          this.renderTracks();
        }
      });

      if (this.doc) {
        this.doc.subscribe((event) => {
          if (event === 'selectionChange') {
            this.renderTracks();
          }
        });
      }

      this.renderTracks();
      this.updatePlayheadPosition();
      this.updateTimeDisplay();
    }

    initControls() {
      const playBtn = document.getElementById('btn-timeline-play');
      const resetBtn = document.getElementById('btn-timeline-reset');
      const loopBtn = document.getElementById('btn-timeline-loop');
      const addKfBtn = document.getElementById('btn-add-keyframe');
      const collapseBtn = document.getElementById('btn-timeline-collapse');

      if (playBtn) {
        playBtn.addEventListener('click', () => this.timeline.togglePlay());
      }
      if (resetBtn) {
        resetBtn.addEventListener('click', () => this.timeline.setTime(0));
      }
      if (loopBtn) {
        loopBtn.addEventListener('click', () => {
          this.timeline.isLooping = !this.timeline.isLooping;
          loopBtn.classList.toggle('active', this.timeline.isLooping);
        });
      }
      if (addKfBtn) {
        addKfBtn.addEventListener('click', () => this.addKeyframeForSelected());
      }
      if (collapseBtn) {
        collapseBtn.addEventListener('click', () => {
          this.panel.classList.toggle('collapsed');
          const isCollapsed = this.panel.classList.contains('collapsed');
          collapseBtn.innerHTML = isCollapsed
            ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="18 15 12 9 6 15"/></svg>`
            : `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>`;
        });
      }
    }

    updatePlayButton(isPlaying) {
      const btn = document.getElementById('btn-timeline-play');
      if (!btn) return;
      btn.innerHTML = isPlaying
        ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>`
        : `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>`;
    }

    updateTimeDisplay() {
      const el = document.getElementById('timeline-time-val');
      if (el) {
        const cur = this.timeline.currentTime.toFixed(2);
        const dur = this.timeline.duration.toFixed(2);
        el.innerHTML = `<span class="curr-time">${cur}s</span> / ${dur}s`;
      }
    }

    initRuler() {
      if (!this.rulerCanvas) return;
      const resizeRuler = () => {
        const w = this.rulerCanvas.parentElement.clientWidth;
        this.rulerCanvas.width = w;
        this.rulerCanvas.height = 28;
        this.renderRuler();
      };
      resizeRuler();
      window.addEventListener('resize', resizeRuler);
    }

    renderRuler() {
      if (!this.rulerCanvas) return;
      const ctx = this.rulerCanvas.getContext('2d');
      const w = this.rulerCanvas.width;
      const h = this.rulerCanvas.height;

      ctx.fillStyle = '#181920';
      ctx.fillRect(0, 0, w, h);

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.fillStyle = '#64748b';
      ctx.font = '10px monospace';

      const duration = this.timeline.duration;
      const stepSec = 0.5;

      for (let t = 0; t <= duration; t += 0.1) {
        const x = (t / duration) * (w - 20) + 10;
        const isMajor = Math.abs(t % stepSec) < 0.01 || Math.abs((t % stepSec) - stepSec) < 0.01;

        ctx.beginPath();
        if (isMajor) {
          ctx.moveTo(x, 14);
          ctx.lineTo(x, 28);
          ctx.fillText(`${t.toFixed(1)}s`, x + 3, 12);
        } else {
          ctx.moveTo(x, 20);
          ctx.lineTo(x, 28);
        }
        ctx.stroke();
      }
    }

    updatePlayheadPosition() {
      if (!this.playhead || !this.gridContainer) return;
      const w = this.gridContainer.clientWidth - 20;
      const progress = this.timeline.currentTime / this.timeline.duration;
      const left = progress * w + 10;
      this.playhead.style.left = `${left}px`;
    }

    bindEvents() {
      // Scrubbing on ruler or grid
      const onScrub = (e) => {
        const rect = this.gridContainer.getBoundingClientRect();
        const mouseX = e.clientX - rect.left - 10;
        const w = rect.width - 20;
        const progress = Math.max(0, Math.min(1, mouseX / w));
        this.timeline.setTime(progress * this.timeline.duration);
      };

      const ruler = this.rulerCanvas;
      if (ruler) {
        ruler.addEventListener('mousedown', (e) => {
          this.isScrubbing = true;
          onScrub(e);
        });
      }

      window.addEventListener('mousemove', (e) => {
        if (this.isScrubbing) {
          onScrub(e);
        } else if (this.isDraggingKf && this.selectedKeyframe) {
          const rect = this.gridContainer.getBoundingClientRect();
          const mouseX = e.clientX - rect.left - 10;
          const w = rect.width - 20;
          const newTime = Math.max(0, Math.min(this.timeline.duration, (mouseX / w) * this.timeline.duration));
          this.selectedKeyframe.kf.time = parseFloat(newTime.toFixed(2));
          this.selectedKeyframe.track.sort();
          this.renderTracks();
          this.timeline.applyCurrentTimeToDocument();
        }
      });

      window.addEventListener('mouseup', () => {
        if (this.isScrubbing) this.isScrubbing = false;
        if (this.isDraggingKf) {
          this.isDraggingKf = false;
          this.history.recordState('Move Keyframe');
        }
      });

      // Delete keyframe with Backspace/Delete key
      window.addEventListener('keydown', (e) => {
        if ((e.key === 'Delete' || e.key === 'Backspace') && this.selectedKeyframe) {
          if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
          this.selectedKeyframe.track.removeKeyframe(this.selectedKeyframe.kf.id);
          this.selectedKeyframe = null;
          this.renderTracks();
          this.timeline.applyCurrentTimeToDocument();
          this.history.recordState('Delete Keyframe');
        }
      });
    }

    addKeyframeForSelected() {
      if (!this.doc || this.doc.selectedIds.length === 0) return;
      const node = this.doc.getNodeById(this.doc.selectedIds[0]);
      if (!node) return;

      // Select property to animate based on type
      let prop = 'rotation';
      if (node.type === 'mesh3d') prop = 'rotY';
      else if (node.type === 'text') prop = 'opacity';

      const track = this.timeline.getTrack(node.id, prop, true);
      const val = node[prop] !== undefined ? node[prop] : 0;
      track.addKeyframe(this.timeline.currentTime, val, 'easeInOut');

      this.renderTracks();
      this.history.recordState('Add Keyframe');
    }

    renderTracks() {
      if (!this.tracksContainer || !this.gridContainer) return;

      this.tracksContainer.innerHTML = `
        <div class="track-header-row">
          <span>Layers & Tracks</span>
          <button class="layer-action-btn" id="btn-add-track-menu" title="Add Track">+</button>
        </div>
      `;

      // Clear existing markers on grid
      this.gridContainer.querySelectorAll('.keyframe-marker, .track-grid-row').forEach(el => el.remove());

      const tracks = this.timeline.getAllTracks();
      const gridW = this.gridContainer.clientWidth - 20;

      tracks.forEach((track, index) => {
        const node = this.doc.getNodeById(track.nodeId);
        const nodeName = node ? node.name : 'Unknown';

        // 1. Left Label
        const labelRow = document.createElement('div');
        labelRow.className = 'track-row-label';
        labelRow.innerHTML = `
          <span style="font-weight: 500; font-size: 11px; max-width: 110px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${nodeName}</span>
          <span class="prop-badge">${track.property}</span>
        `;
        this.tracksContainer.appendChild(labelRow);

        // 2. Right Track Grid Lane
        const gridRow = document.createElement('div');
        gridRow.className = 'track-grid-row';
        gridRow.style.cssText = `
          height: 32px;
          border-bottom: 1px solid var(--border-subtle);
          position: relative;
          background: ${index % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)'};
        `;
        this.gridContainer.appendChild(gridRow);

        // 3. Keyframe Diamonds
        for (const kf of track.keyframes) {
          const marker = document.createElement('div');
          marker.className = `keyframe-marker ${this.selectedKeyframe && this.selectedKeyframe.kf.id === kf.id ? 'selected' : ''}`;
          const leftPct = (kf.time / this.timeline.duration);
          marker.style.left = `${leftPct * gridW + 10}px`;
          marker.style.top = `16px`;
          marker.title = `${track.property}: ${kf.value} (${kf.time}s)`;

          marker.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            this.selectedKeyframe = { track, kf };
            this.isDraggingKf = true;
            this.renderTracks();
          });

          gridRow.appendChild(marker);
        }
      });
    }
  }

  window.FigmaX = window.FigmaX || {};
  window.FigmaX.TimelineUI = TimelineUI;
})();
