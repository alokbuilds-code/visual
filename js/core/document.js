/**
 * FIGMA-X: Document Model & Scene Graph Manager
 * Handles hierarchical node tree, reparenting, grouping, serialization, and hit testing.
 */

(function() {
  const { NodeFactory, Rect2D, Vec2 } = window.FigmaX;

  class Document {
    constructor(title = 'Untitled Design') {
      this.title = title;
      this.nodes = new Map(); // id -> BaseNode
      this.rootIds = []; // Top-level node IDs
      this.listeners = new Set();
      this.selectedIds = [];
    }

    subscribe(fn) {
      this.listeners.add(fn);
      return () => this.listeners.delete(fn);
    }

    notify(type = 'change', payload = null) {
      for (const fn of this.listeners) {
        fn(type, payload);
      }
    }

    getNodeById(id) {
      return this.nodes.get(id) || null;
    }

    getAllNodes() {
      return Array.from(this.nodes.values());
    }

    addNode(node, parentId = null, index = -1) {
      if (!node) return null;
      this.nodes.set(node.id, node);

      if (parentId && this.nodes.has(parentId)) {
        const parent = this.nodes.get(parentId);
        node.parentId = parentId;
        if (index >= 0 && index < parent.children.length) {
          parent.children.splice(index, 0, node.id);
        } else {
          parent.children.push(node.id);
        }
      } else {
        node.parentId = null;
        if (index >= 0 && index < this.rootIds.length) {
          this.rootIds.splice(index, 0, node.id);
        } else {
          this.rootIds.push(node.id);
        }
      }

      this.notify('nodeAdded', node);
      return node;
    }

    removeNode(nodeId) {
      const node = this.nodes.get(nodeId);
      if (!node) return;

      // Recursively remove children
      if (node.children && node.children.length > 0) {
        for (const childId of [...node.children]) {
          this.removeNode(childId);
        }
      }

      // Detach from parent or rootIds
      if (node.parentId && this.nodes.has(node.parentId)) {
        const parent = this.nodes.get(node.parentId);
        parent.children = parent.children.filter(id => id !== nodeId);
      } else {
        this.rootIds = this.rootIds.filter(id => id !== nodeId);
      }

      this.nodes.delete(nodeId);
      this.selectedIds = this.selectedIds.filter(id => id !== nodeId);
      this.notify('nodeRemoved', nodeId);
    }

    reparent(nodeId, newParentId, index = -1) {
      const node = this.nodes.get(nodeId);
      if (!node || nodeId === newParentId) return;

      // Remove from current parent
      if (node.parentId && this.nodes.has(node.parentId)) {
        const parent = this.nodes.get(node.parentId);
        parent.children = parent.children.filter(id => id !== nodeId);
      } else {
        this.rootIds = this.rootIds.filter(id => id !== nodeId);
      }

      // Add to new parent
      if (newParentId && this.nodes.has(newParentId)) {
        const newParent = this.nodes.get(newParentId);
        node.parentId = newParentId;
        if (index >= 0 && index < newParent.children.length) {
          newParent.children.splice(index, 0, nodeId);
        } else {
          newParent.children.push(nodeId);
        }
      } else {
        node.parentId = null;
        if (index >= 0 && index < this.rootIds.length) {
          this.rootIds.splice(index, 0, nodeId);
        } else {
          this.rootIds.push(nodeId);
        }
      }

      this.notify('nodeReparented', { nodeId, newParentId });
    }

    reorderNode(nodeId, direction) {
      const node = this.nodes.get(nodeId);
      if (!node) return;

      const list = node.parentId && this.nodes.has(node.parentId)
        ? this.nodes.get(node.parentId).children
        : this.rootIds;

      const idx = list.indexOf(nodeId);
      if (idx === -1) return;

      if (direction === 'up' && idx < list.length - 1) {
        list.splice(idx, 1);
        list.splice(idx + 1, 0, nodeId);
      } else if (direction === 'down' && idx > 0) {
        list.splice(idx, 1);
        list.splice(idx - 1, 0, nodeId);
      } else if (direction === 'top') {
        list.splice(idx, 1);
        list.push(nodeId);
      } else if (direction === 'bottom') {
        list.splice(idx, 1);
        list.unshift(nodeId);
      }

      this.notify('reorder', nodeId);
    }

    groupNodes(nodeIds) {
      if (!nodeIds || nodeIds.length < 2) return null;
      const validNodes = nodeIds.map(id => this.getNodeById(id)).filter(Boolean);
      if (validNodes.length < 2) return null;

      // Determine common parent
      const firstParent = validNodes[0].parentId;
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

      for (const node of validNodes) {
        const b = node.getWorldBounds(this);
        if (b.minX < minX) minX = b.minX;
        if (b.minY < minY) minY = b.minY;
        if (b.maxX > maxX) maxX = b.maxX;
        if (b.maxY > maxY) maxY = b.maxY;
      }

      const group = NodeFactory.create({
        type: 'group',
        name: 'Group',
        x: minX,
        y: minY,
        width: Math.max(10, maxX - minX),
        height: Math.max(10, maxY - minY)
      });

      this.addNode(group, firstParent);

      for (const node of validNodes) {
        // Adjust coordinates relative to group
        const wb = node.getWorldBounds(this);
        node.x = wb.x - minX;
        node.y = wb.y - minY;
        this.reparent(node.id, group.id);
      }

      this.selectedIds = [group.id];
      this.notify('group', group.id);
      return group;
    }

    ungroup(groupId) {
      const group = this.getNodeById(groupId);
      if (!group || group.type !== 'group') return;

      const children = [...group.children];
      const parentId = group.parentId;

      for (const childId of children) {
        const child = this.getNodeById(childId);
        if (!child) continue;
        const wb = child.getWorldBounds(this);
        let px = wb.x, py = wb.y;
        if (parentId && this.nodes.has(parentId)) {
          const parentWb = this.nodes.get(parentId).getWorldBounds(this);
          px = wb.x - parentWb.x;
          py = wb.y - parentWb.y;
        }
        child.x = px;
        child.y = py;
        this.reparent(childId, parentId);
      }

      this.removeNode(groupId);
      this.selectedIds = children;
      this.notify('ungroup', children);
    }

    /**
     * Hit test: finds the top-most visible, non-locked node at (worldX, worldY).
     */
    hitTest(worldX, worldY) {
      const searchList = (ids) => {
        // Reverse iterate to hit front-most elements first
        for (let i = ids.length - 1; i >= 0; i--) {
          const id = ids[i];
          const node = this.nodes.get(id);
          if (!node || !node.visible) continue;

          // If frame with clipContent or group, check children first
          if (node.children && node.children.length > 0) {
            const hitChild = searchList(node.children);
            if (hitChild) return hitChild;
          }

          if (node.hitTest(worldX, worldY, this)) {
            return node;
          }
        }
        return null;
      };

      return searchList(this.rootIds);
    }

    /**
     * Box selection (marquee): finds all nodes that intersect the given world rect.
     */
    findNodesInRect(rect) {
      const hits = [];
      for (const node of this.nodes.values()) {
        if (!node.visible || node.type === 'frame' && node.children.length > 0) continue;
        const b = node.getWorldBounds(this);
        if (rect.intersects(b)) {
          hits.push(node.id);
        }
      }
      return hits;
    }

    serialize() {
      const nodesData = {};
      for (const [id, node] of this.nodes.entries()) {
        nodesData[id] = node.serialize();
      }
      return {
        version: '1.0',
        title: this.title,
        rootIds: [...this.rootIds],
        nodes: nodesData
      };
    }

    deserialize(data) {
      this.title = data.title || 'Untitled Design';
      this.nodes.clear();
      this.rootIds = [...(data.rootIds || [])];

      if (data.nodes) {
        for (const [id, nodeData] of Object.entries(data.nodes)) {
          const node = NodeFactory.create(nodeData);
          this.nodes.set(id, node);
        }
      }

      this.selectedIds = [];
      this.notify('load');
    }
  }

  window.FigmaX.Document = Document;
})();
