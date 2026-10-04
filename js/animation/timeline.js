/**
 * FIGMA-X: Animation Engine & Keyframe Timeline
 * Pure JavaScript timeline system with keyframes, interpolation, easing, and property animation.
 */

(function() {
  const EasingFunctions = {
    linear: t => t,
    easeIn: t => t * t * t,
    easeOut: t => 1 - Math.pow(1 - t, 3),
    easeInOut: t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
    bounce: t => {
      const n1 = 7.5625, d1 = 2.75;
      if (t < 1 / d1) return n1 * t * t;
      if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
      if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
      return n1 * (t -= 2.625 / d1) * t + 0.984375;
    }
  };

  function parseHex(hex) {
    if (!hex || typeof hex !== 'string') return [0, 0, 0];
    let c = hex.replace('#', '');
    if (c.length === 3) c = c.split('').map(x => x + x).join('');
    const num = parseInt(c, 16);
    return [
      (num >> 16) & 255,
      (num >> 8) & 255,
      num & 255
    ];
  }

  function rgbToHex(r, g, b) {
    const toHex = (n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }

  function interpolateValue(valA, valB, t, easing = 'easeInOut') {
    const easeFn = EasingFunctions[easing] || EasingFunctions.linear;
    const progress = Math.max(0, Math.min(1, easeFn(t)));

    if (typeof valA === 'number' && typeof valB === 'number') {
      return valA + (valB - valA) * progress;
    }

    if (typeof valA === 'string' && valA.startsWith('#') && typeof valB === 'string' && valB.startsWith('#')) {
      const rgbA = parseHex(valA);
      const rgbB = parseHex(valB);
      const r = rgbA[0] + (rgbB[0] - rgbA[0]) * progress;
      const g = rgbA[1] + (rgbB[1] - rgbA[1]) * progress;
      const b = rgbA[2] + (rgbB[2] - rgbA[2]) * progress;
      return rgbToHex(r, g, b);
    }

    return progress < 0.5 ? valA : valB;
  }

  class KeyframeTrack {
    constructor(nodeId, property) {
      this.id = `track_${nodeId}_${property}`;
      this.nodeId = nodeId;
      this.property = property;
      this.keyframes = []; // Array of { id, time, value, easing } sorted by time
    }

    addKeyframe(time, value, easing = 'easeInOut') {
      // Check if one already exists at approximately this time
      const existing = this.keyframes.find(k => Math.abs(k.time - time) < 0.04);
      if (existing) {
        existing.value = value;
        existing.easing = easing;
        return existing;
      }

      const kf = {
        id: `kf_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 4)}`,
        time: Math.max(0, time),
        value,
        easing
      };
      this.keyframes.push(kf);
      this.sort();
      return kf;
    }

    removeKeyframe(kfId) {
      this.keyframes = this.keyframes.filter(k => k.id !== kfId);
    }

    sort() {
      this.keyframes.sort((a, b) => a.time - b.time);
    }

    evaluate(time) {
      if (this.keyframes.length === 0) return null;
      if (this.keyframes.length === 1) return this.keyframes[0].value;

      // Before first keyframe
      if (time <= this.keyframes[0].time) {
        return this.keyframes[0].value;
      }

      // After last keyframe
      const last = this.keyframes[this.keyframes.length - 1];
      if (time >= last.time) {
        return last.value;
      }

      // Between two keyframes
      for (let i = 0; i < this.keyframes.length - 1; i++) {
        const k0 = this.keyframes[i];
        const k1 = this.keyframes[i + 1];
        if (time >= k0.time && time <= k1.time) {
          const segmentDuration = k1.time - k0.time;
          if (segmentDuration <= 0.0001) return k1.value;
          const t = (time - k0.time) / segmentDuration;
          return interpolateValue(k0.value, k1.value, t, k0.easing);
        }
      }

      return last.value;
    }
  }

  class TimelineEngine {
    constructor(doc) {
      this.doc = doc;
      this.currentTime = 0; // in seconds
      this.duration = 5.0; // 5 seconds default
      this.isPlaying = false;
      this.isLooping = true;
      this.fps = 60;
      this.tracks = new Map(); // trackId -> KeyframeTrack
      this.autoKeyframe = false;

      this.listeners = new Set();
      this.rafId = null;
      this.lastTimestamp = null;
    }

    subscribe(fn) {
      this.listeners.add(fn);
      return () => this.listeners.delete(fn);
    }

    notify(type = 'update', payload = null) {
      for (const fn of this.listeners) {
        fn(type, payload);
      }
    }

    getTrack(nodeId, property, createIfMissing = false) {
      const trackId = `track_${nodeId}_${property}`;
      if (this.tracks.has(trackId)) {
        return this.tracks.get(trackId);
      }
      if (createIfMissing) {
        const track = new KeyframeTrack(nodeId, property);
        this.tracks.set(trackId, track);
        this.notify('trackAdded', track);
        return track;
      }
      return null;
    }

    getTracksForNode(nodeId) {
      const list = [];
      for (const track of this.tracks.values()) {
        if (track.nodeId === nodeId) {
          list.push(track);
        }
      }
      return list;
    }

    getAllTracks() {
      return Array.from(this.tracks.values());
    }

    setTime(time) {
      this.currentTime = Math.max(0, Math.min(this.duration, time));
      this.applyCurrentTimeToDocument();
      this.notify('timeChange', this.currentTime);
    }

    play() {
      if (this.isPlaying) return;
      this.isPlaying = true;
      this.lastTimestamp = performance.now();
      this.notify('playState', true);
      this.tick();
    }

    pause() {
      if (!this.isPlaying) return;
      this.isPlaying = false;
      if (this.rafId) {
        cancelAnimationFrame(this.rafId);
        this.rafId = null;
      }
      this.notify('playState', false);
    }

    togglePlay() {
      if (this.isPlaying) this.pause();
      else this.play();
    }

    tick = () => {
      if (!this.isPlaying) return;

      const now = performance.now();
      const deltaSec = (now - this.lastTimestamp) / 1000;
      this.lastTimestamp = now;

      let newTime = this.currentTime + deltaSec;
      if (newTime >= this.duration) {
        if (this.isLooping) {
          newTime = 0;
        } else {
          newTime = this.duration;
          this.pause();
        }
      }

      this.currentTime = newTime;
      this.applyCurrentTimeToDocument();
      this.notify('tick', this.currentTime);

      this.rafId = requestAnimationFrame(this.tick);
    };

    applyCurrentTimeToDocument() {
      if (!this.doc) return;

      for (const track of this.tracks.values()) {
        const node = this.doc.getNodeById(track.nodeId);
        if (!node) continue;

        const val = track.evaluate(this.currentTime);
        if (val !== null && val !== undefined) {
          node[track.property] = val;
        }
      }

      if (window.FigmaX.app && window.FigmaX.app.canvas2d) {
        window.FigmaX.app.canvas2d.requestRender();
      }
    }

    serialize() {
      const tracksData = [];
      for (const track of this.tracks.values()) {
        tracksData.push({
          nodeId: track.nodeId,
          property: track.property,
          keyframes: track.keyframes.map(k => ({ ...k }))
        });
      }
      return {
        duration: this.duration,
        isLooping: this.isLooping,
        tracks: tracksData
      };
    }

    deserialize(data) {
      if (!data) return;
      this.tracks.clear();
      this.duration = data.duration || 5.0;
      this.isLooping = data.isLooping ?? true;

      if (Array.isArray(data.tracks)) {
        for (const tr of data.tracks) {
          const track = this.getTrack(tr.nodeId, tr.property, true);
          if (Array.isArray(tr.keyframes)) {
            for (const kf of tr.keyframes) {
              track.addKeyframe(kf.time, kf.value, kf.easing);
            }
          }
        }
      }
      this.notify('tracksLoaded');
    }
  }

  window.FigmaX = window.FigmaX || {};
  window.FigmaX.EasingFunctions = EasingFunctions;
  window.FigmaX.KeyframeTrack = KeyframeTrack;
  window.FigmaX.TimelineEngine = TimelineEngine;
})();
