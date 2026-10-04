/**
 * FIGMA-X: Default Demonstration Showcase Project
 * "NEOSPACE — Next-Gen Spatial Design Studio"
 * Pre-configured with vector frames, typography, glassmorphism cards, glowing buttons,
 * interactive WebGL 3D meshes, timeline keyframes, and scroll-driven parallax triggers.
 */

(function() {
  const { NodeFactory } = window.FigmaX;

  function loadDefaultProject(doc, timeline) {
    if (!doc) return;

    doc.title = 'NeoSpace — Spatial Design Studio';
    doc.nodes.clear();
    doc.rootIds = [];

    // =========================================================================
    // FRAME 1: MAIN DESKTOP LANDING (1440 x 900)
    // =========================================================================
    const desktopFrame = NodeFactory.create({
      id: 'frame_desktop',
      type: 'frame',
      name: 'Desktop Landing — 1440 × 900',
      x: 100,
      y: 100,
      width: 1440,
      height: 900,
      fill: '#0c0d12',
      stroke: 'rgba(255, 255, 255, 0.1)',
      strokeWidth: 1,
      cornerRadius: 16,
      clipContent: true
    });
    doc.addNode(desktopFrame);

    // Background Glow Orb 1 (Cyan)
    const glowOrb1 = NodeFactory.create({
      id: 'glow_cyan',
      type: 'ellipse',
      name: 'Ambient Cyan Glow',
      x: -120,
      y: -120,
      width: 600,
      height: 600,
      fill: 'rgba(6, 182, 212, 0.07)',
      opacity: 0.9,
      blendMode: 'screen'
    });
    doc.addNode(glowOrb1, desktopFrame.id);

    // Background Glow Orb 2 (Purple)
    const glowOrb2 = NodeFactory.create({
      id: 'glow_purple',
      type: 'ellipse',
      name: 'Ambient Purple Glow',
      x: 900,
      y: 100,
      width: 650,
      height: 650,
      fill: 'rgba(139, 92, 246, 0.08)',
      opacity: 0.9,
      blendMode: 'screen'
    });
    doc.addNode(glowOrb2, desktopFrame.id);

    // -------------------------------------------------------------------------
    // TOP NAVIGATION BAR
    // -------------------------------------------------------------------------
    const navBar = NodeFactory.create({
      id: 'nav_bar',
      type: 'rectangle',
      name: 'Navigation Bar',
      x: 60,
      y: 30,
      width: 1320,
      height: 64,
      fill: 'rgba(24, 25, 32, 0.65)',
      stroke: 'rgba(255, 255, 255, 0.1)',
      strokeWidth: 1,
      cornerRadius: 32,
      shadow: { x: 0, y: 8, blur: 24, color: 'rgba(0,0,0,0.4)' }
    });
    doc.addNode(navBar, desktopFrame.id);

    const navLogo = NodeFactory.create({
      id: 'nav_logo',
      type: 'text',
      name: 'Brand Logo',
      text: 'FIGMA-X',
      x: 100,
      y: 49,
      width: 140,
      height: 26,
      fontSize: 20,
      fontWeight: '800',
      fill: '#ffffff',
      letterSpacing: 1
    });
    doc.addNode(navLogo, desktopFrame.id);

    const navLinks = NodeFactory.create({
      id: 'nav_links',
      type: 'text',
      name: 'Nav Menu Links',
      text: 'Overview     Vector Canvas     WebGL 3D Engine     Keyframe Motion     Pricing',
      x: 420,
      y: 53,
      width: 640,
      height: 20,
      fontSize: 14,
      fontWeight: '500',
      fill: '#94a3b8'
    });
    doc.addNode(navLinks, desktopFrame.id);

    const navCtaBtn = NodeFactory.create({
      id: 'nav_cta_btn',
      type: 'rectangle',
      name: 'Nav CTA Button',
      x: 1210,
      y: 42,
      width: 140,
      height: 40,
      fill: '#6366f1',
      cornerRadius: 20,
      shadow: { x: 0, y: 4, blur: 14, color: 'rgba(99, 102, 241, 0.5)' }
    });
    doc.addNode(navCtaBtn, desktopFrame.id);

    const navCtaText = NodeFactory.create({
      id: 'nav_cta_text',
      type: 'text',
      name: 'Nav CTA Label',
      text: 'Start Creating →',
      x: 1226,
      y: 52,
      width: 110,
      height: 20,
      fontSize: 13,
      fontWeight: '600',
      fill: '#ffffff'
    });
    doc.addNode(navCtaText, desktopFrame.id);

    // -------------------------------------------------------------------------
    // HERO SECTION
    // -------------------------------------------------------------------------
    // Badge
    const heroBadge = NodeFactory.create({
      id: 'hero_badge',
      type: 'rectangle',
      name: 'Hero Release Pill',
      x: 80,
      y: 160,
      width: 290,
      height: 36,
      fill: 'rgba(99, 102, 241, 0.15)',
      stroke: 'rgba(99, 102, 241, 0.4)',
      strokeWidth: 1,
      cornerRadius: 18
    });
    doc.addNode(heroBadge, desktopFrame.id);

    const heroBadgeText = NodeFactory.create({
      id: 'hero_badge_text',
      type: 'text',
      name: 'Release Pill Label',
      text: '✨  FIGMA-X ENGINE 2.0 • SPATIAL 3D',
      x: 98,
      y: 170,
      width: 260,
      height: 18,
      fontSize: 12,
      fontWeight: '700',
      fill: '#818cf8'
    });
    doc.addNode(heroBadgeText, desktopFrame.id);

    // Main Headline (Multi-line)
    const heroHeadline = NodeFactory.create({
      id: 'hero_headline',
      type: 'text',
      name: 'Hero Heading',
      text: 'Design in 2D.\nAnimate in 3D.\nLaunch Realtime.',
      x: 80,
      y: 220,
      width: 660,
      height: 200,
      fontSize: 54,
      fontWeight: '900',
      lineHeight: 1.15,
      fill: '#f8fafc'
    });
    doc.addNode(heroHeadline, desktopFrame.id);

    // Description text
    const heroDesc = NodeFactory.create({
      id: 'hero_desc',
      type: 'text',
      name: 'Hero Subtitle',
      text: 'The complete browser-based creative suite built entirely from scratch with HTML5 Canvas, WebGL shaders, timeline keyframing, and scroll-driven physics.',
      x: 80,
      y: 430,
      width: 580,
      height: 60,
      fontSize: 16,
      lineHeight: 1.5,
      fontWeight: '400',
      fill: '#94a3b8'
    });
    doc.addNode(heroDesc, desktopFrame.id);

    // Hero Action Buttons
    const heroBtnPrimary = NodeFactory.create({
      id: 'hero_btn_primary',
      type: 'rectangle',
      name: 'Hero Primary Button',
      x: 80,
      y: 520,
      width: 180,
      height: 52,
      fill: '#6366f1',
      cornerRadius: 26,
      shadow: { x: 0, y: 8, blur: 24, color: 'rgba(99, 102, 241, 0.55)' }
    });
    doc.addNode(heroBtnPrimary, desktopFrame.id);

    const heroBtnPrimaryText = NodeFactory.create({
      id: 'hero_btn_text',
      type: 'text',
      name: 'Primary Button Label',
      text: 'Launch Studio 🚀',
      x: 110,
      y: 536,
      width: 120,
      height: 20,
      fontSize: 15,
      fontWeight: '600',
      fill: '#ffffff'
    });
    doc.addNode(heroBtnPrimaryText, desktopFrame.id);

    const heroBtnSecondary = NodeFactory.create({
      id: 'hero_btn_secondary',
      type: 'rectangle',
      name: 'Hero Secondary Button',
      x: 280,
      y: 520,
      width: 180,
      height: 52,
      fill: 'rgba(255, 255, 255, 0.05)',
      stroke: 'rgba(255, 255, 255, 0.15)',
      strokeWidth: 1,
      cornerRadius: 26
    });
    doc.addNode(heroBtnSecondary, desktopFrame.id);

    const heroBtnSecondaryText = NodeFactory.create({
      id: 'hero_btn_sec_text',
      type: 'text',
      name: 'Secondary Button Label',
      text: 'Explore Shaders',
      x: 310,
      y: 536,
      width: 120,
      height: 20,
      fontSize: 15,
      fontWeight: '500',
      fill: '#cbd5e1'
    });
    doc.addNode(heroBtnSecondaryText, desktopFrame.id);

    // -------------------------------------------------------------------------
    // 3D HERO WEBGL INTERACTIVE MESH
    // -------------------------------------------------------------------------
    const heroMesh3D = NodeFactory.create({
      id: 'hero_mesh_3d',
      type: 'mesh3d',
      name: 'Cyber Torus 3D Model',
      primitive: 'torus',
      x: 820,
      y: 160,
      width: 520,
      height: 480,
      rotX: 25,
      rotY: 45,
      rotZ: 10,
      scale3D: 1.35,
      materialColor: '#8b5cf6',
      ambientColor: '#1e1b4b',
      specularColor: '#ffffff',
      shininess: 64,
      autoSpin: true,
      spinSpeed: 0.8,
      stroke: 'rgba(139, 92, 246, 0.25)',
      cornerRadius: 24,
      scrollTrigger: {
        enabled: true,
        type: '3d-spin',
        speed: 1.8,
        startPct: 0,
        endPct: 100
      }
    });
    doc.addNode(heroMesh3D, desktopFrame.id);

    // Floating Glass Card over 3D model
    const floatCard = NodeFactory.create({
      id: 'float_card',
      type: 'rectangle',
      name: 'Floating Glass Card',
      x: 770,
      y: 440,
      width: 250,
      height: 120,
      fill: 'rgba(24, 25, 32, 0.75)',
      stroke: 'rgba(255, 255, 255, 0.18)',
      strokeWidth: 1,
      cornerRadius: 18,
      shadow: { x: 0, y: 16, blur: 32, color: 'rgba(0,0,0,0.6)' },
      scrollTrigger: {
        enabled: true,
        type: 'parallax',
        speed: 0.8
      }
    });
    doc.addNode(floatCard, desktopFrame.id);

    const floatCardTitle = NodeFactory.create({
      id: 'float_card_title',
      type: 'text',
      name: 'Card Title',
      text: '⚡ 60 FPS WebGL',
      x: 794,
      y: 460,
      width: 200,
      height: 24,
      fontSize: 16,
      fontWeight: '700',
      fill: '#06b6d4'
    });
    doc.addNode(floatCardTitle, desktopFrame.id);

    const floatCardBody = NodeFactory.create({
      id: 'float_card_body',
      type: 'text',
      name: 'Card Body',
      text: 'Blinn-Phong Lighting & Fresnel edge sheen computed on GPU.',
      x: 794,
      y: 490,
      width: 200,
      height: 50,
      fontSize: 12,
      fontWeight: '400',
      lineHeight: 1.4,
      fill: '#94a3b8'
    });
    doc.addNode(floatCardBody, desktopFrame.id);

    // -------------------------------------------------------------------------
    // BOTTOM FEATURE CARDS ROW
    // -------------------------------------------------------------------------
    const cardData = [
      { id: 'f_card_1', title: 'Infinite Vector Canvas', desc: 'Hardware-accelerated 2D affine scene graph with smart magnetic guides.', color: '#06b6d4', x: 80 },
      { id: 'f_card_2', title: 'Keyframe Motion Engine', desc: 'Full timeline scrubbing, custom easing, and multi-track property animation.', color: '#10b981', x: 520 },
      { id: 'f_card_3', title: 'Scroll Parallax Physics', desc: 'Interactive scroll-driven triggers, pinned elements, and 3D camera sweeps.', color: '#f59e0b', x: 960 }
    ];

    for (const c of cardData) {
      const card = NodeFactory.create({
        id: c.id,
        type: 'rectangle',
        name: `Feature Card — ${c.title}`,
        x: c.x,
        y: 670,
        width: 400,
        height: 170,
        fill: 'rgba(25, 27, 35, 0.7)',
        stroke: 'rgba(255, 255, 255, 0.08)',
        strokeWidth: 1,
        cornerRadius: 16,
        shadow: { x: 0, y: 8, blur: 20, color: 'rgba(0,0,0,0.35)' },
        scrollTrigger: {
          enabled: true,
          type: 'parallax',
          speed: 0.5
        }
      });
      doc.addNode(card, desktopFrame.id);

      const title = NodeFactory.create({
        id: `${c.id}_title`,
        type: 'text',
        name: `${c.title} Title`,
        text: c.title,
        x: c.x + 24,
        y: 695,
        width: 350,
        height: 26,
        fontSize: 17,
        fontWeight: '700',
        fill: c.color
      });
      doc.addNode(title, desktopFrame.id);

      const desc = NodeFactory.create({
        id: `${c.id}_desc`,
        type: 'text',
        name: `${c.title} Description`,
        text: c.desc,
        x: c.x + 24,
        y: 735,
        width: 350,
        height: 80,
        fontSize: 13,
        lineHeight: 1.5,
        fontWeight: '400',
        fill: '#94a3b8'
      });
      doc.addNode(desc, desktopFrame.id);
    }

    // =========================================================================
    // FRAME 2: MOBILE VIEWPORT (393 x 852 - iPhone 15 Pro)
    // =========================================================================
    const mobileFrame = NodeFactory.create({
      id: 'frame_mobile',
      type: 'frame',
      name: 'Mobile Viewport — iPhone 15 Pro',
      x: 1620,
      y: 100,
      width: 393,
      height: 852,
      fill: '#0d0e14',
      stroke: 'rgba(255, 255, 255, 0.1)',
      strokeWidth: 1,
      cornerRadius: 36,
      clipContent: true
    });
    doc.addNode(mobileFrame);

    // Mobile Dynamic Island
    const dynamicIsland = NodeFactory.create({
      id: 'mobile_island',
      type: 'rectangle',
      name: 'Dynamic Island',
      x: 136,
      y: 12,
      width: 120,
      height: 32,
      fill: '#000000',
      cornerRadius: 16
    });
    doc.addNode(dynamicIsland, mobileFrame.id);

    const mobileHeadline = NodeFactory.create({
      id: 'mobile_headline',
      type: 'text',
      name: 'Mobile Heading',
      text: 'Spatial Design\nEverywhere.',
      x: 28,
      y: 80,
      width: 337,
      height: 70,
      fontSize: 28,
      fontWeight: '800',
      lineHeight: 1.2,
      fill: '#ffffff'
    });
    doc.addNode(mobileHeadline, mobileFrame.id);

    // Mobile 3D Cube Mesh
    const mobileCube = NodeFactory.create({
      id: 'mobile_cube',
      type: 'mesh3d',
      name: 'Mobile 3D Cube',
      primitive: 'cube',
      x: 46,
      y: 180,
      width: 300,
      height: 260,
      rotX: 35,
      rotY: 45,
      rotZ: 15,
      scale3D: 1.1,
      materialColor: '#06b6d4',
      autoSpin: true,
      spinSpeed: 0.6,
      cornerRadius: 20
    });
    doc.addNode(mobileCube, mobileFrame.id);

    // Mobile Glass Card
    const mobileCard = NodeFactory.create({
      id: 'mobile_card',
      type: 'rectangle',
      name: 'Mobile Feature Card',
      x: 24,
      y: 470,
      width: 345,
      height: 200,
      fill: 'rgba(24, 25, 32, 0.8)',
      stroke: 'rgba(255, 255, 255, 0.12)',
      strokeWidth: 1,
      cornerRadius: 20
    });
    doc.addNode(mobileCard, mobileFrame.id);

    const mobileCardText = NodeFactory.create({
      id: 'mobile_card_text',
      type: 'text',
      name: 'Mobile Card Content',
      text: 'Unified Design System\n\nSeamless touch navigation, pixel-perfect responsiveness, and native GPU acceleration on all devices.',
      x: 44,
      y: 495,
      width: 305,
      height: 140,
      fontSize: 14,
      lineHeight: 1.5,
      fontWeight: '500',
      fill: '#e2e8f0'
    });
    doc.addNode(mobileCardText, mobileFrame.id);

    const mobileBtn = NodeFactory.create({
      id: 'mobile_btn',
      type: 'rectangle',
      name: 'Mobile CTA Button',
      x: 24,
      y: 740,
      width: 345,
      height: 52,
      fill: '#6366f1',
      cornerRadius: 26
    });
    doc.addNode(mobileBtn, mobileFrame.id);

    const mobileBtnText = NodeFactory.create({
      id: 'mobile_btn_text',
      type: 'text',
      name: 'Mobile CTA Label',
      text: 'Open in Mobile App →',
      x: 110,
      y: 756,
      width: 180,
      height: 20,
      fontSize: 14,
      fontWeight: '600',
      fill: '#ffffff'
    });
    doc.addNode(mobileBtnText, mobileFrame.id);

    // =========================================================================
    // PRE-CONFIGURED ANIMATION TIMELINE TRACKS
    // =========================================================================
    if (timeline) {
      timeline.tracks.clear();
      timeline.duration = 5.0;

      // 1. Cyber Torus 3D Rotation Y Track (0° -> 360°)
      const trTorusRotY = timeline.getTrack(heroMesh3D.id, 'rotY', true);
      trTorusRotY.addKeyframe(0.0, 0, 'easeInOut');
      trTorusRotY.addKeyframe(2.5, 180, 'easeInOut');
      trTorusRotY.addKeyframe(5.0, 360, 'easeInOut');

      // 2. Cyber Torus 3D Rotation X Track (bobbing tilt)
      const trTorusRotX = timeline.getTrack(heroMesh3D.id, 'rotX', true);
      trTorusRotX.addKeyframe(0.0, 20, 'easeInOut');
      trTorusRotX.addKeyframe(2.5, 45, 'easeInOut');
      trTorusRotX.addKeyframe(5.0, 20, 'easeInOut');

      // 3. Floating Card Vertical Drift Track
      const trFloatCardY = timeline.getTrack(floatCard.id, 'y', true);
      trFloatCardY.addKeyframe(0.0, 440, 'easeInOut');
      trFloatCardY.addKeyframe(2.5, 415, 'easeInOut');
      trFloatCardY.addKeyframe(5.0, 440, 'easeInOut');

      // 4. Hero Release Badge Float
      const trBadgeY = timeline.getTrack(heroBadge.id, 'y', true);
      trBadgeY.addKeyframe(0.0, 160, 'easeInOut');
      trBadgeY.addKeyframe(2.5, 152, 'easeInOut');
      trBadgeY.addKeyframe(5.0, 160, 'easeInOut');

      // Select default node
      doc.selectedIds = [heroMesh3D.id];
    }
  }

  window.FigmaX = window.FigmaX || {};
  window.FigmaX.loadDefaultProject = loadDefaultProject;
})();
