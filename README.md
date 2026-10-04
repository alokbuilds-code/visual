# ⚡ FIGMA-X — Next-Gen Spatial Design Studio

> A real, professional browser-based design editor built **completely from scratch** using **ONLY HTML5, CSS3, and Vanilla JavaScript** — zero React, TypeScript, Vite, Tailwind, Three.js, or external editor dependencies.

FIGMA-X fuses the vector layout precision of **Figma**, the spatial 3D interactive power of **Spline**, and the cinematic motion and scroll physics of **Framer** into a unified, high-performance web studio.

https://visual-delta.vercel.app/

## 🌟 Key Features

### 🎨 1. Infinite Vector Canvas 2D Engine
- **Hardware-Accelerated 2D Rendering**: High-DPI / Retina-ready canvas pipeline (`window.devicePixelRatio`).
- **Scene Graph Document Model**: Hierarchical tree with parent-child affine matrix transformations ($2 \times 3$ matrix multiplication and inversion).
- **Infinite Navigation**: Smooth mouse wheel zoom (centered on cursor), middle-click/spacebar drag panning, zoom to fit (`Ctrl+0`), and zoom to 100% (`Ctrl+1`).
- **Adaptive Grid & Dynamic Rulers**: Pixel-perfect dot grid that dynamically subdivides with zoom levels, plus coordinate rulers with mouse tracking.
- **Vector Shapes & Typography**:
  - **Frames / Artboards**: Presets for Desktop (1440×900), iPhone 15 Pro (393×852), iPad Air, and Dribbble, with content clipping and background fills.
  - **Primitives**: Rectangles with individual corner radii, Ellipses, Stars/Polygons, and Lines.
  - **Rich Typography**: Font families, font weights (300–900), font size, line-height, letter spacing, text alignment, and double-click in-canvas text editing.
  - **Images**: Local image file upload with real-time decoding and canvas placement.
- **Interactive Transform Gizmo**:
  - 8-point resize handles with aspect ratio locking (`Shift`).
  - Smooth rotation lollipop handle with angle readout and $15^\circ$ angle snapping (`Shift`).
  - Marquee box multi-selection and magnetic smart snap alignment guides.

---

### 🔮 2. Lightweight WebGL 3D Engine from Scratch
- **Zero 3D Libraries**: 100% pure WebGL 1.0/2.0 API without Three.js or external math libraries.
- **Custom 3D Math Engine**: Full `Vec3` and `Mat4` implementations (perspective projection, lookAt view matrix, TRS model transforms, normal matrix inverse transpose).
- **Blinn-Phong + Fresnel Shader**:
  - Directional lighting and ambient light.
  - Blinn-Phong half-vector specular highlight with configurable shininess.
  - Fresnel rim lighting for edge sheen and modern spatial aesthetics.
  - Holographic wireframe rendering mode.
- **Procedural 3D Primitives**:
  - **Torus** (parametric donut mesh with radial and tubular segments)
  - **Cube** (6 faces with independent normals and texture coordinates)
  - **Sphere** (UV sphere with latitude/longitude tesselation)
  - **Cylinder** (smooth tube with end caps)
  - **Plane** (subdivided quad)
- **Seamless 2D/3D Hybrid Compositing**: Renders 3D objects to offscreen canvases and paints them seamlessly into the infinite 2D vector canvas.

---

### 🎬 3. Keyframe Animation Timeline Engine
- **Multi-Track Property System**: Animate 2D position (`x`, `y`), size (`width`, `height`), `rotation`, `opacity`, `fill` colors, and 3D properties (`rotX`, `rotY`, `rotZ`, `scale3D`).
- **Interactive Timeline UI**:
  - Draggable playhead needle with real-time scrubbing.
  - Time ruler marked with seconds and frames.
  - Diamond keyframe markers with click-to-select, drag-to-retime, and delete (`Backspace`/`Delete`).
- **Easing & Interpolation**:
  - Linear, Ease-In, Ease-Out, Ease-In-Out (cubic spline), and Bounce physics.
  - Color interpolation (RGB lerp with hex conversion).
- **Playback Controls**: Play, Pause, Rewind to Start, Loop toggle, and auto-keyframing.

---

### 🌐 4. Scroll-Driven Animation & Parallax Prototype Runner
- **Live Scroll Prototype Mode**: One-click preview modal simulating a live responsive website.
- **Parallax Physics**: Variable depth speeds for floating glass cards and UI layers.
- **Scroll-Controlled 3D**: Direct linkage between normalized scroll progress ($0.0 \to 1.0$) and 3D rotation, scaling, and camera sweeps.
- **Visual Trigger Inspector**: Configure scroll trigger type, parallax speed factor, and start/end percentages directly in the property panel.

---

### 💾 5. Persistence, History & Asset Management
- **Full Undo / Redo**: Command stack with state snapshot deltas and debounced continuous transformations (`Ctrl+Z`, `Ctrl+Y`).
- **IndexedDB Auto-Save**: Seamlessly persists documents to browser storage so refreshes never lose work.
- **File Import / Export**:
  - Save and load native `.figx` JSON documents.
  - High-resolution **PNG Export** (rendered at 2x Retina scale).
  - Scalable Vector Graphics (**SVG**) vector export.
- **Component & Asset Library**: Pre-built glassmorphism cards, glow pill buttons, 3D torus widgets, and stat badges ready to stamp onto the canvas.

---

## ⌨️ Keyboard Shortcuts Reference

| Shortcut | Action |
| :--- | :--- |
| <kbd>V</kbd> | **Select / Move Tool** |
| <kbd>H</kbd> or <kbd>Space</kbd> + Drag | **Hand / Pan Canvas** |
| <kbd>F</kbd> | **Frame / Artboard Tool** |
| <kbd>R</kbd> | **Rectangle Tool** |
| <kbd>O</kbd> | **Ellipse / Circle Tool** |
| <kbd>T</kbd> | **Text Tool** (Click to place, double click to edit) |
| <kbd>Ctrl</kbd> + <kbd>Z</kbd> | **Undo** |
| <kbd>Ctrl</kbd> + <kbd>Y</kbd> / <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>Z</kbd> | **Redo** |
| <kbd>Ctrl</kbd> + <kbd>D</kbd> | **Duplicate Selection** |
| <kbd>Ctrl</kbd> + <kbd>G</kbd> | **Group Selected Nodes** |
| <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>G</kbd> | **Ungroup** |
| <kbd>Ctrl</kbd> + <kbd>A</kbd> | **Select All** |
| <kbd>Delete</kbd> / <kbd>Backspace</kbd> | **Delete Selection** |
| <kbd>Ctrl</kbd> + <kbd>0</kbd> | **Zoom to Fit** |
| <kbd>Ctrl</kbd> + <kbd>1</kbd> | **Zoom to 100%** |
| <kbd>Esc</kbd> | **Exit Scroll Prototype Preview** |

---

## 📁 Project Architecture

```
├── index.html                  # Application shell and UI layout
├── README.md                   # Project documentation
├── css/
│   └── style.css               # Obsidian dark theme design system
└── js/
    ├── core/
    │   ├── math.js             # 2D Vector, Matrix2D affine transforms, Rect2D
    │   ├── node.js             # Scene Graph node classes (Base, Frame, Rect, 3D, etc.)
    │   └── document.js         # Document model, parenting, grouping, serialization
    ├── webgl/
    │   ├── math3d.js           # 3D Math (Vec3, Mat4, projection, lookAt, transforms)
    │   ├── shaders.js          # Blinn-Phong + Fresnel lighting GLSL shaders
    │   ├── primitives.js       # Procedural Cube, Sphere, Torus, Cylinder, Plane
    │   └── engine3d.js         # WebGL context, shader compilation, offscreen render
    ├── animation/
    │   └── timeline.js         # Keyframe tracks, easing, interpolation, playback loop
    ├── scroll/
    │   └── scrollEngine.js     # Scroll progress manager, parallax & 3D scroll triggers
    ├── history/
    │   └── history.js          # Undo/redo snapshot delta stack
    ├── storage/
    │   └── storage.js          # IndexedDB persistence, auto-save, PNG/SVG/JSON export
    ├── rendering/
    │   └── canvas2d.js         # Infinite 2D canvas, viewport pan/zoom, grid, rulers
    ├── tools/
    │   └── toolManager.js      # Tool state machine, resize, rotation, snapping
    ├── ui/
    │   ├── inspector.js        # Right sidebar property panel with 2-way data binding
    │   ├── layers.js           # Left sidebar scene tree and component stamping
    │   ├── timelineUi.js       # Bottom timeline drawer with scrubbing playhead
    │   └── scrollUi.js         # Interactive scroll prototype runner modal
    ├── demo/
    │   └── defaultProject.js   # Out-of-the-box NeoSpace showcase project
    └── app.js                  # Master application bootstrap and coordinator
```

---


## 📜 License
MIT License. Built completely from scratch with pure Web Standards.
