/**
 * FIGMA-X: History Manager (Undo / Redo System)
 * State snapshot stack with debounced continuous action recording and shortcut handlers.
 */

(function() {
  class HistoryManager {
    constructor(doc, maxDepth = 50) {
      this.doc = doc;
      this.maxDepth = maxDepth;
      this.undoStack = [];
      this.redoStack = [];
      this.isExecuting = false;
      this.listeners = new Set();
      this.debounceTimer = null;
    }

    subscribe(fn) {
      this.listeners.add(fn);
      return () => this.listeners.delete(fn);
    }

    notify() {
      for (const fn of this.listeners) {
        fn({
          canUndo: this.canUndo(),
          canRedo: this.canRedo()
        });
      }
    }

    canUndo() {
      return this.undoStack.length > 0;
    }

    canRedo() {
      return this.redoStack.length > 0;
    }

    recordState(actionName = 'Edit') {
      if (this.isExecuting || !this.doc) return;

      const stateSnapshot = JSON.stringify(this.doc.serialize());

      // If top state is identical, don't duplicate
      if (this.undoStack.length > 0 && this.undoStack[this.undoStack.length - 1].data === stateSnapshot) {
        return;
      }

      this.undoStack.push({
        name: actionName,
        data: stateSnapshot,
        time: Date.now()
      });

      if (this.undoStack.length > this.maxDepth) {
        this.undoStack.shift();
      }

      // Any new action clears the redo stack
      this.redoStack = [];
      this.notify();
    }

    recordDebounced(actionName = 'Continuous Edit', delay = 350) {
      if (this.debounceTimer) clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(() => {
        this.recordState(actionName);
        this.debounceTimer = null;
      }, delay);
    }

    undo() {
      if (!this.canUndo() || !this.doc) return;

      // Push current state to redo stack
      const currentState = JSON.stringify(this.doc.serialize());
      this.redoStack.push({
        name: 'Current',
        data: currentState,
        time: Date.now()
      });

      const previous = this.undoStack.pop();
      this.isExecuting = true;
      try {
        const parsed = JSON.parse(previous.data);
        this.doc.deserialize(parsed);
      } catch (e) {
        console.error('Error undoing state:', e);
      } finally {
        this.isExecuting = false;
        this.notify();
        if (window.FigmaX.app && window.FigmaX.app.canvas2d) {
          window.FigmaX.app.canvas2d.requestRender();
        }
      }
    }

    redo() {
      if (!this.canRedo() || !this.doc) return;

      // Push current state to undo stack
      const currentState = JSON.stringify(this.doc.serialize());
      this.undoStack.push({
        name: 'Current',
        data: currentState,
        time: Date.now()
      });

      const next = this.redoStack.pop();
      this.isExecuting = true;
      try {
        const parsed = JSON.parse(next.data);
        this.doc.deserialize(parsed);
      } catch (e) {
        console.error('Error redoing state:', e);
      } finally {
        this.isExecuting = false;
        this.notify();
        if (window.FigmaX.app && window.FigmaX.app.canvas2d) {
          window.FigmaX.app.canvas2d.requestRender();
        }
      }
    }

    clear() {
      this.undoStack = [];
      this.redoStack = [];
      this.notify();
    }
  }

  window.FigmaX = window.FigmaX || {};
  window.FigmaX.HistoryManager = HistoryManager;
})();
