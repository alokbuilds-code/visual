/**
 * FIGMA-X: Right Inspector / Property Panel
 * Full two-way data binding for 2D transforms, appearance, fills, typography,
 * WebGL 3D parameters, and scroll-driven triggers.
 */

(function() {
  class Inspector {
    constructor(containerElement, doc, history, canvas2d) {
      this.container = containerElement;
      this.doc = doc;
      this.history = history;
      this.canvas2d = canvas2d;
      this.isUpdatingUI = false;

      this.proportionsLocked = false;
      this.aspectRatio = 1.0;

      this.initHTML();
      this.bindInputs();

      if (this.doc) {
        this.doc.subscribe((event) => {
          if (event === 'selectionChange' || event === 'nodeTransform' || event === 'load') {
            this.refresh();
          }
        });
      }
    }

    initHTML() {
      this.container.innerHTML = `
        <!-- Alignment Toolbar -->
        <div class="inspector-section" style="padding-bottom: 8px;">
          <div class="alignment-grid">
            <button class="align-btn" id="align-left" title="Align Left">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 22V2M20 7H8M16 17H8"/></svg>
            </button>
            <button class="align-btn" id="align-center-h" title="Align Horizontal Centers">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M19 8H5M17 16H7"/></svg>
            </button>
            <button class="align-btn" id="align-right" title="Align Right">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 22V2M4 7h12M8 17h8"/></svg>
            </button>
            <button class="align-btn" id="align-top" title="Align Top">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 4h20M7 20V8M17 16V8"/></svg>
            </button>
            <button class="align-btn" id="align-center-v" title="Align Vertical Centers">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12h20M8 19V5M16 17V7"/></svg>
            </button>
            <button class="align-btn" id="align-bottom" title="Align Bottom">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 20h20M7 4v12M17 8v8"/></svg>
            </button>
          </div>
        </div>

        <!-- Frame Preset Section (shown when Frame is selected) -->
        <div class="inspector-section" id="section-frame" style="display: none;">
          <div class="inspector-section-header">
            <span class="inspector-section-title">Frame Preset</span>
          </div>
          <div class="inspector-row">
            <select class="inspector-select" id="input-frame-preset">
              <option value="custom">Custom Size</option>
              <option value="1440x900">Desktop (1440 × 900)</option>
              <option value="393x852">iPhone 15 Pro (393 × 852)</option>
              <option value="820x1180">iPad Air (820 × 1180)</option>
              <option value="1600x1200">Dribbble Shot (1600 × 1200)</option>
            </select>
          </div>
          <div class="inspector-row" style="justify-content: space-between;">
            <span style="font-size: 12px; color: var(--text-secondary);">Clip Content</span>
            <label class="toggle-switch">
              <input type="checkbox" id="input-clip-content">
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>

        <!-- Transform Section -->
        <div class="inspector-section" id="section-transform">
          <div class="inspector-section-header">
            <span class="inspector-section-title">Transform</span>
          </div>
          <div class="inspector-row">
            <div class="inspector-col">
              <div class="input-with-label">
                <span class="field-label">X</span>
                <input type="number" class="inspector-input" id="input-x" value="0">
              </div>
            </div>
            <div class="inspector-col">
              <div class="input-with-label">
                <span class="field-label">Y</span>
                <input type="number" class="inspector-input" id="input-y" value="0">
              </div>
            </div>
          </div>
          <div class="inspector-row">
            <div class="inspector-col">
              <div class="input-with-label">
                <span class="field-label">W</span>
                <input type="number" class="inspector-input" id="input-w" value="100">
              </div>
            </div>
            <div class="inspector-col">
              <div class="input-with-label">
                <span class="field-label">H</span>
                <input type="number" class="inspector-input" id="input-h" value="100">
              </div>
            </div>
          </div>
          <div class="inspector-row">
            <div class="inspector-col">
              <div class="input-with-label">
                <span class="field-label">∠</span>
                <input type="number" class="inspector-input" id="input-rot" value="0">
              </div>
            </div>
            <div class="inspector-col">
              <div class="input-with-label">
                <span class="field-label">⌒</span>
                <input type="number" class="inspector-input" id="input-radius" value="0">
              </div>
            </div>
          </div>
        </div>

        <!-- Typography Section (shown for Text nodes) -->
        <div class="inspector-section" id="section-typography" style="display: none;">
          <div class="inspector-section-header">
            <span class="inspector-section-title">Typography</span>
          </div>
          <div class="inspector-row">
            <select class="inspector-select" id="input-font-family">
              <option value="Inter, sans-serif">Inter</option>
              <option value="Roboto, sans-serif">Roboto</option>
              <option value="'Space Grotesk', sans-serif">Space Grotesk</option>
              <option value="'Courier New', monospace">Monospace</option>
              <option value="Georgia, serif">Georgia</option>
            </select>
          </div>
          <div class="inspector-row">
            <div class="inspector-col">
              <div class="input-with-label">
                <span class="field-label">S</span>
                <input type="number" class="inspector-input" id="input-font-size" value="18">
              </div>
            </div>
            <div class="inspector-col">
              <select class="inspector-select" id="input-font-weight">
                <option value="300">Light</option>
                <option value="400">Regular</option>
                <option value="500">Medium</option>
                <option value="600">SemiBold</option>
                <option value="700">Bold</option>
                <option value="900">Black</option>
              </select>
            </div>
          </div>
          <div class="inspector-row">
            <select class="inspector-select" id="input-text-align">
              <option value="left">Align Left</option>
              <option value="center">Align Center</option>
              <option value="right">Align Right</option>
            </select>
          </div>
        </div>

        <!-- 3D WebGL Mesh Section (shown for 3D nodes) -->
        <div class="inspector-section" id="section-mesh3d" style="display: none;">
          <div class="inspector-section-header">
            <span class="inspector-section-title">3D WebGL Object</span>
            <span class="badge-3d">WebGL 2.0</span>
          </div>
          <div class="inspector-row">
            <select class="inspector-select" id="input-3d-primitive">
              <option value="torus">Torus (Donut)</option>
              <option value="cube">Cube</option>
              <option value="sphere">Sphere</option>
              <option value="cylinder">Cylinder</option>
              <option value="plane">Plane</option>
            </select>
          </div>
          <!-- 3D Rotations -->
          <div class="inspector-row" style="margin-top: 10px;">
            <div class="inspector-col">
              <span style="font-size: 10px; color: var(--rose-accent);">Rot X: <span id="val-rot-x">25</span>°</span>
              <input type="range" class="inspector-slider" id="input-3d-rot-x" min="-180" max="180" value="25">
            </div>
          </div>
          <div class="inspector-row">
            <div class="inspector-col">
              <span style="font-size: 10px; color: var(--emerald-accent);">Rot Y: <span id="val-rot-y">45</span>°</span>
              <input type="range" class="inspector-slider" id="input-3d-rot-y" min="-180" max="180" value="45">
            </div>
          </div>
          <div class="inspector-row">
            <div class="inspector-col">
              <span style="font-size: 10px; color: var(--cyan-accent);">Rot Z: <span id="val-rot-z">0</span>°</span>
              <input type="range" class="inspector-slider" id="input-3d-rot-z" min="-180" max="180" value="0">
            </div>
          </div>
          <!-- 3D Scale -->
          <div class="inspector-row" style="margin-top: 8px;">
            <div class="inspector-col">
              <span style="font-size: 10px; color: var(--text-secondary);">3D Scale: <span id="val-scale-3d">1.2</span>x</span>
              <input type="range" class="inspector-slider" id="input-3d-scale" min="0.2" max="3.0" step="0.05" value="1.2">
            </div>
          </div>
          <!-- 3D Material / Shading -->
          <div class="inspector-row" style="margin-top: 8px;">
            <div class="inspector-col">
              <span style="font-size: 10px; color: var(--text-secondary);">Specular Shininess: <span id="val-shininess">48</span></span>
              <input type="range" class="inspector-slider" id="input-3d-shininess" min="4" max="128" value="48">
            </div>
          </div>
          <div class="inspector-row" style="justify-content: space-between; margin-top: 6px;">
            <span style="font-size: 12px; color: var(--text-secondary);">Holographic Wireframe</span>
            <label class="toggle-switch">
              <input type="checkbox" id="input-3d-wireframe">
              <span class="toggle-slider"></span>
            </label>
          </div>
          <div class="inspector-row" style="justify-content: space-between; margin-top: 6px;">
            <span style="font-size: 12px; color: var(--text-secondary);">Auto Orbit Spin</span>
            <label class="toggle-switch">
              <input type="checkbox" id="input-3d-autospin" checked>
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>

        <!-- Fill Section -->
        <div class="inspector-section" id="section-fill">
          <div class="inspector-section-header">
            <span class="inspector-section-title">Fill</span>
          </div>
          <div class="color-picker-row">
            <div class="color-swatch-preview" id="swatch-fill-preview" style="background-color: #6366f1;">
              <input type="color" class="color-swatch-input" id="input-fill-color-picker" value="#6366f1">
            </div>
            <input type="text" class="color-hex-input" id="input-fill-hex" value="#6366f1">
            <input type="text" class="color-opacity-input" id="input-opacity-pct" value="100%">
          </div>
        </div>

        <!-- Stroke Section -->
        <div class="inspector-section" id="section-stroke">
          <div class="inspector-section-header">
            <span class="inspector-section-title">Stroke</span>
          </div>
          <div class="color-picker-row">
            <div class="color-swatch-preview" id="swatch-stroke-preview" style="background-color: #ffffff;">
              <input type="color" class="color-swatch-input" id="input-stroke-color-picker" value="#ffffff">
            </div>
            <input type="text" class="color-hex-input" id="input-stroke-hex" value="#ffffff">
            <input type="number" class="inspector-input" id="input-stroke-width" value="1" style="width: 45px; text-align: right;" min="0" max="100">
          </div>
        </div>

        <!-- Scroll-Driven Animation Trigger -->
        <div class="inspector-section" id="section-scroll-trigger">
          <div class="inspector-section-header">
            <span class="inspector-section-title">Scroll Animation</span>
            <label class="toggle-switch">
              <input type="checkbox" id="input-scroll-enabled">
              <span class="toggle-slider"></span>
            </label>
          </div>
          <div id="scroll-trigger-controls" style="display: none;">
            <div class="inspector-row">
              <select class="inspector-select" id="input-scroll-type">
                <option value="parallax">Parallax Shift (Y)</option>
                <option value="fade">Scroll Fade Reveal</option>
                <option value="scale">Scroll Zoom / Scale</option>
                <option value="rotate">Scroll 2D Rotation</option>
                <option value="3d-spin">Scroll 3D Model Spin</option>
              </select>
            </div>
            <div class="inspector-row" style="margin-top: 6px;">
              <div class="inspector-col">
                <span style="font-size: 10px; color: var(--text-secondary);">Speed: <span id="val-scroll-speed">1.0</span>x</span>
                <input type="range" class="inspector-slider" id="input-scroll-speed" min="-2.0" max="3.0" step="0.1" value="1.0">
              </div>
            </div>
          </div>
        </div>
      `;
    }

    bindInputs() {
      // Helper to register continuous and commit events
      const bind = (id, prop, isNum = false, is3D = false) => {
        const el = document.getElementById(id);
        if (!el) return;

        el.addEventListener('input', () => {
          if (this.isUpdatingUI || this.doc.selectedIds.length === 0) return;
          const node = this.doc.getNodeById(this.doc.selectedIds[0]);
          if (!node) return;

          let val = isNum ? parseFloat(el.value) || 0 : el.value;
          if (is3D) {
            node[prop] = val;
          } else {
            node[prop] = val;
          }
          this.history.recordDebounced('Edit ' + prop);
          this.canvas2d.requestRender();
        });
      };

      // Transform bindings
      bind('input-x', 'x', true);
      bind('input-y', 'y', true);
      bind('input-w', 'width', true);
      bind('input-h', 'height', true);
      bind('input-rot', 'rotation', true);
      bind('input-radius', 'cornerRadius', true);

      // Typography
      bind('input-font-family', 'fontFamily');
      bind('input-font-size', 'fontSize', true);
      bind('input-font-weight', 'fontWeight');
      bind('input-text-align', 'textAlign');

      // 3D inputs
      const rotXSlider = document.getElementById('input-3d-rot-x');
      const rotYSlider = document.getElementById('input-3d-rot-y');
      const rotZSlider = document.getElementById('input-3d-rot-z');
      const scaleSlider = document.getElementById('input-3d-scale');
      const shineSlider = document.getElementById('input-3d-shininess');
      const primSelect = document.getElementById('input-3d-primitive');
      const wireCheck = document.getElementById('input-3d-wireframe');
      const autoSpinCheck = document.getElementById('input-3d-autospin');

      const update3DVal = (slider, spanId, prop) => {
        if (!slider) return;
        slider.addEventListener('input', () => {
          if (this.isUpdatingUI || this.doc.selectedIds.length === 0) return;
          const node = this.doc.getNodeById(this.doc.selectedIds[0]);
          if (!node || node.type !== 'mesh3d') return;
          const val = parseFloat(slider.value);
          const span = document.getElementById(spanId);
          if (span) span.textContent = val;
          node[prop] = val;
          this.history.recordDebounced('3D ' + prop);
          this.canvas2d.requestRender();
        });
      };

      update3DVal(rotXSlider, 'val-rot-x', 'rotX');
      update3DVal(rotYSlider, 'val-rot-y', 'rotY');
      update3DVal(rotZSlider, 'val-rot-z', 'rotZ');
      update3DVal(scaleSlider, 'val-scale-3d', 'scale3D');
      update3DVal(shineSlider, 'val-shininess', 'shininess');

      if (primSelect) {
        primSelect.addEventListener('change', () => {
          const node = this.doc.getNodeById(this.doc.selectedIds[0]);
          if (node && node.type === 'mesh3d') {
            node.primitive = primSelect.value;
            this.history.recordState('Change 3D Primitive');
            this.canvas2d.requestRender();
          }
        });
      }

      if (wireCheck) {
        wireCheck.addEventListener('change', () => {
          const node = this.doc.getNodeById(this.doc.selectedIds[0]);
          if (node && node.type === 'mesh3d') {
            node.wireframe = wireCheck.checked;
            this.history.recordState('Toggle Wireframe');
            this.canvas2d.requestRender();
          }
        });
      }

      if (autoSpinCheck) {
        autoSpinCheck.addEventListener('change', () => {
          const node = this.doc.getNodeById(this.doc.selectedIds[0]);
          if (node && node.type === 'mesh3d') {
            node.autoSpin = autoSpinCheck.checked;
            this.canvas2d.requestRender();
          }
        });
      }

      // Fill color
      const fillPicker = document.getElementById('input-fill-color-picker');
      const fillHex = document.getElementById('input-fill-hex');
      const fillSwatch = document.getElementById('swatch-fill-preview');

      const onFillChange = (val) => {
        if (this.doc.selectedIds.length === 0) return;
        const node = this.doc.getNodeById(this.doc.selectedIds[0]);
        if (!node) return;

        if (node.type === 'mesh3d') {
          node.materialColor = val;
        } else {
          node.fill = val;
        }
        fillHex.value = val;
        fillPicker.value = val;
        fillSwatch.style.backgroundColor = val;
        this.history.recordDebounced('Edit Fill');
        this.canvas2d.requestRender();
      };

      if (fillPicker) fillPicker.addEventListener('input', (e) => onFillChange(e.target.value));
      if (fillHex) fillHex.addEventListener('change', (e) => onFillChange(e.target.value));

      // Stroke color & width
      const strokePicker = document.getElementById('input-stroke-color-picker');
      const strokeHex = document.getElementById('input-stroke-hex');
      const strokeWidth = document.getElementById('input-stroke-width');
      const strokeSwatch = document.getElementById('swatch-stroke-preview');

      const onStrokeChange = (val) => {
        if (this.doc.selectedIds.length === 0) return;
        const node = this.doc.getNodeById(this.doc.selectedIds[0]);
        if (!node) return;
        node.stroke = val;
        strokeHex.value = val;
        strokePicker.value = val;
        strokeSwatch.style.backgroundColor = val;
        this.history.recordDebounced('Edit Stroke Color');
        this.canvas2d.requestRender();
      };

      if (strokePicker) strokePicker.addEventListener('input', (e) => onStrokeChange(e.target.value));
      if (strokeHex) strokeHex.addEventListener('change', (e) => onStrokeChange(e.target.value));
      if (strokeWidth) {
        strokeWidth.addEventListener('input', (e) => {
          if (this.doc.selectedIds.length === 0) return;
          const node = this.doc.getNodeById(this.doc.selectedIds[0]);
          if (!node) return;
          node.strokeWidth = parseFloat(e.target.value) || 0;
          this.history.recordDebounced('Edit Stroke Width');
          this.canvas2d.requestRender();
        });
      }

      // Frame Preset
      const framePreset = document.getElementById('input-frame-preset');
      const clipContent = document.getElementById('input-clip-content');
      if (framePreset) {
        framePreset.addEventListener('change', () => {
          const node = this.doc.getNodeById(this.doc.selectedIds[0]);
          if (!node || node.type !== 'frame') return;
          if (framePreset.value === '1440x900') { node.width = 1440; node.height = 900; }
          else if (framePreset.value === '393x852') { node.width = 393; node.height = 852; }
          else if (framePreset.value === '820x1180') { node.width = 820; node.height = 1180; }
          else if (framePreset.value === '1600x1200') { node.width = 1600; node.height = 1200; }
          this.history.recordState('Change Frame Preset');
          this.refresh();
          this.canvas2d.requestRender();
        });
      }
      if (clipContent) {
        clipContent.addEventListener('change', () => {
          const node = this.doc.getNodeById(this.doc.selectedIds[0]);
          if (node && node.type === 'frame') {
            node.clipContent = clipContent.checked;
            this.history.recordState('Toggle Clip Content');
            this.canvas2d.requestRender();
          }
        });
      }

      // Scroll Trigger UI
      const scrollEnable = document.getElementById('input-scroll-enabled');
      const scrollControls = document.getElementById('scroll-trigger-controls');
      const scrollType = document.getElementById('input-scroll-type');
      const scrollSpeed = document.getElementById('input-scroll-speed');
      const scrollSpeedSpan = document.getElementById('val-scroll-speed');

      if (scrollEnable) {
        scrollEnable.addEventListener('change', () => {
          const node = this.doc.getNodeById(this.doc.selectedIds[0]);
          if (!node) return;
          node.scrollTrigger.enabled = scrollEnable.checked;
          scrollControls.style.display = node.scrollTrigger.enabled ? 'block' : 'none';
          this.history.recordState('Toggle Scroll Trigger');
        });
      }
      if (scrollType) {
        scrollType.addEventListener('change', () => {
          const node = this.doc.getNodeById(this.doc.selectedIds[0]);
          if (node) {
            node.scrollTrigger.type = scrollType.value;
            this.history.recordState('Change Scroll Type');
          }
        });
      }
      if (scrollSpeed) {
        scrollSpeed.addEventListener('input', () => {
          const node = this.doc.getNodeById(this.doc.selectedIds[0]);
          if (node) {
            node.scrollTrigger.speed = parseFloat(scrollSpeed.value);
            if (scrollSpeedSpan) scrollSpeedSpan.textContent = node.scrollTrigger.speed;
            this.history.recordDebounced('Change Scroll Speed');
          }
        });
      }

      // Align buttons
      const alignNodes = (action) => {
        const ids = this.doc.selectedIds;
        if (ids.length === 0) return;
        const nodes = ids.map(id => this.doc.getNodeById(id)).filter(Boolean);
        if (nodes.length === 0) return;

        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const n of nodes) {
          if (n.x < minX) minX = n.x;
          if (n.y < minY) minY = n.y;
          if (n.x + n.width > maxX) maxX = n.x + n.width;
          if (n.y + n.height > maxY) maxY = n.y + n.height;
        }

        for (const n of nodes) {
          switch (action) {
            case 'left': n.x = minX; break;
            case 'center-h': n.x = minX + (maxX - minX - n.width) / 2; break;
            case 'right': n.x = maxX - n.width; break;
            case 'top': n.y = minY; break;
            case 'center-v': n.y = minY + (maxY - minY - n.height) / 2; break;
            case 'bottom': n.y = maxY - n.height; break;
          }
        }
        this.history.recordState('Align Nodes');
        this.refresh();
        this.canvas2d.requestRender();
      };

      document.getElementById('align-left')?.addEventListener('click', () => alignNodes('left'));
      document.getElementById('align-center-h')?.addEventListener('click', () => alignNodes('center-h'));
      document.getElementById('align-right')?.addEventListener('click', () => alignNodes('right'));
      document.getElementById('align-top')?.addEventListener('click', () => alignNodes('top'));
      document.getElementById('align-center-v')?.addEventListener('click', () => alignNodes('center-v'));
      document.getElementById('align-bottom')?.addEventListener('click', () => alignNodes('bottom'));
    }

    refresh() {
      this.isUpdatingUI = true;
      const ids = this.doc.selectedIds;

      const secFrame = document.getElementById('section-frame');
      const secTypo = document.getElementById('section-typography');
      const sec3D = document.getElementById('section-mesh3d');
      const secTransform = document.getElementById('section-transform');
      const secFill = document.getElementById('section-fill');
      const secStroke = document.getElementById('section-stroke');
      const secScroll = document.getElementById('section-scroll-trigger');

      if (ids.length === 0) {
        // Nothing selected: show subtle background / canvas settings
        if (secFrame) secFrame.style.display = 'none';
        if (secTypo) secTypo.style.display = 'none';
        if (sec3D) sec3D.style.display = 'none';
        this.isUpdatingUI = false;
        return;
      }

      const node = this.doc.getNodeById(ids[0]);
      if (!node) {
        this.isUpdatingUI = false;
        return;
      }

      // Show/Hide contextual sections
      if (secFrame) secFrame.style.display = node.type === 'frame' ? 'block' : 'none';
      if (secTypo) secTypo.style.display = node.type === 'text' ? 'block' : 'none';
      if (sec3D) sec3D.style.display = node.type === 'mesh3d' ? 'block' : 'none';

      // Populate Transform
      const inputX = document.getElementById('input-x');
      const inputY = document.getElementById('input-y');
      const inputW = document.getElementById('input-w');
      const inputH = document.getElementById('input-h');
      const inputRot = document.getElementById('input-rot');
      const inputRadius = document.getElementById('input-radius');

      if (inputX) inputX.value = Math.round(node.x);
      if (inputY) inputY.value = Math.round(node.y);
      if (inputW) inputW.value = Math.round(node.width);
      if (inputH) inputH.value = Math.round(node.height);
      if (inputRot) inputRot.value = Math.round(node.rotation || 0);
      if (inputRadius) inputRadius.value = Math.round(node.cornerRadius || 0);

      // Frame specific
      if (node.type === 'frame') {
        const clip = document.getElementById('input-clip-content');
        if (clip) clip.checked = !!node.clipContent;
      }

      // Typography
      if (node.type === 'text') {
        const ff = document.getElementById('input-font-family');
        const fs = document.getElementById('input-font-size');
        const fw = document.getElementById('input-font-weight');
        const ta = document.getElementById('input-text-align');
        if (ff) ff.value = node.fontFamily || 'Inter, sans-serif';
        if (fs) fs.value = node.fontSize || 18;
        if (fw) fw.value = node.fontWeight || '500';
        if (ta) ta.value = node.textAlign || 'left';
      }

      // 3D WebGL
      if (node.type === 'mesh3d') {
        const rotXSlider = document.getElementById('input-3d-rot-x');
        const rotYSlider = document.getElementById('input-3d-rot-y');
        const rotZSlider = document.getElementById('input-3d-rot-z');
        const scaleSlider = document.getElementById('input-3d-scale');
        const shineSlider = document.getElementById('input-3d-shininess');
        const primSelect = document.getElementById('input-3d-primitive');
        const wireCheck = document.getElementById('input-3d-wireframe');
        const autoSpinCheck = document.getElementById('input-3d-autospin');

        if (rotXSlider) rotXSlider.value = Math.round(node.rotX || 0);
        if (rotYSlider) rotYSlider.value = Math.round(node.rotY || 0);
        if (rotZSlider) rotZSlider.value = Math.round(node.rotZ || 0);
        if (scaleSlider) scaleSlider.value = node.scale3D || 1.2;
        if (shineSlider) shineSlider.value = node.shininess || 48;
        if (primSelect) primSelect.value = node.primitive || 'torus';
        if (wireCheck) wireCheck.checked = !!node.wireframe;
        if (autoSpinCheck) autoSpinCheck.checked = !!node.autoSpin;

        document.getElementById('val-rot-x').textContent = Math.round(node.rotX || 0);
        document.getElementById('val-rot-y').textContent = Math.round(node.rotY || 0);
        document.getElementById('val-rot-z').textContent = Math.round(node.rotZ || 0);
        document.getElementById('val-scale-3d').textContent = node.scale3D || 1.2;
        document.getElementById('val-shininess').textContent = node.shininess || 48;
      }

      // Fill & Stroke
      const fillColor = node.type === 'mesh3d' ? (node.materialColor || '#8b5cf6') : (node.fill || '#6366f1');
      const fillPicker = document.getElementById('input-fill-color-picker');
      const fillHex = document.getElementById('input-fill-hex');
      const fillSwatch = document.getElementById('swatch-fill-preview');
      if (fillPicker && fillColor.startsWith('#')) fillPicker.value = fillColor;
      if (fillHex) fillHex.value = fillColor;
      if (fillSwatch) fillSwatch.style.backgroundColor = fillColor;

      const strokeColor = node.stroke || '#ffffff';
      const strokePicker = document.getElementById('input-stroke-color-picker');
      const strokeHex = document.getElementById('input-stroke-hex');
      const strokeWidth = document.getElementById('input-stroke-width');
      const strokeSwatch = document.getElementById('swatch-stroke-preview');
      if (strokePicker && strokeColor.startsWith('#')) strokePicker.value = strokeColor;
      if (strokeHex) strokeHex.value = strokeColor;
      if (strokeWidth) strokeWidth.value = node.strokeWidth || 1;
      if (strokeSwatch) strokeSwatch.style.backgroundColor = strokeColor;

      // Scroll trigger
      const scrollEnable = document.getElementById('input-scroll-enabled');
      const scrollControls = document.getElementById('scroll-trigger-controls');
      const scrollType = document.getElementById('input-scroll-type');
      const scrollSpeed = document.getElementById('input-scroll-speed');
      const scrollSpeedSpan = document.getElementById('val-scroll-speed');

      const trig = node.scrollTrigger;
      if (scrollEnable) scrollEnable.checked = !!(trig && trig.enabled);
      if (scrollControls) scrollControls.style.display = (trig && trig.enabled) ? 'block' : 'none';
      if (scrollType && trig) scrollType.value = trig.type || 'parallax';
      if (scrollSpeed && trig) {
        scrollSpeed.value = trig.speed ?? 1.0;
        if (scrollSpeedSpan) scrollSpeedSpan.textContent = trig.speed ?? 1.0;
      }

      this.isUpdatingUI = false;
    }
  }

  window.FigmaX = window.FigmaX || {};
  window.FigmaX.Inspector = Inspector;
})();
