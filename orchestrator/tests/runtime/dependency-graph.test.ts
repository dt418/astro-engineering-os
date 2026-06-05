import { describe, it, expect, beforeEach } from 'vitest';
import {
  buildGraph,
  detectCycles,
  topologicalSort,
  getReadyTasks,
  updatePendingDegrees,
  type TaskNode,
} from '../../src/runtime/dependency-graph.js';

function makeNode(id: string, deps: string[] = []): TaskNode {
  return { id, type: 'skill', target: id, dependencies: deps };
}

describe('dependency-graph', () => {
  describe('buildGraph', () => {
    it('builds graph from nodes', () => {
      const nodes = [makeNode('a'), makeNode('b'), makeNode('c')];
      const graph = buildGraph(nodes as any);

      expect(graph.nodes.size).toBe(3);
      expect(graph.nodes.has('a')).toBe(true);
      expect(graph.nodes.has('b')).toBe(true);
      expect(graph.nodes.has('c')).toBe(true);
    });

    it('builds adjacency list', () => {
      const nodes = [makeNode('a', ['b', 'c']), makeNode('b'), makeNode('c')];
      const graph = buildGraph(nodes as any);

      expect(graph.adjacency.get('a')).toEqual(['b', 'c']);
      expect(graph.adjacency.get('b')).toEqual([]);
      expect(graph.adjacency.get('c')).toEqual([]);
    });

    it('builds dependents map', () => {
      const nodes = [makeNode('a'), makeNode('b', ['a']), makeNode('c', ['a'])];
      const graph = buildGraph(nodes as any);

      expect(graph.dependents.get('a')).toEqual(['b', 'c']);
      expect(graph.dependents.get('b')).toEqual([]);
      expect(graph.dependents.get('c')).toEqual([]);
    });
  });

  describe('detectCycles', () => {
    it('returns null for acyclic graph', () => {
      const nodes = [makeNode('a'), makeNode('b', ['a']), makeNode('c', ['b'])];
      const graph = buildGraph(nodes as any);
      expect(detectCycles(graph)).toBeNull();
    });

    it('returns cycle error for cyclic graph', () => {
      const nodes = [makeNode('a', ['b']), makeNode('b', ['c']), makeNode('c', ['a'])];
      const graph = buildGraph(nodes as any);
      const error = detectCycles(graph);
      expect(error).not.toBeNull();
      expect(error!.code).toBe('CYCLE_DETECTED');
      expect(error!.cycleNodes.length).toBeGreaterThan(0);
    });

    it('returns null for empty graph', () => {
      const graph = buildGraph([]);
      expect(detectCycles(graph)).toBeNull();
    });

    it('detects self-loop', () => {
      const nodes = [makeNode('a', ['a'])];
      const graph = buildGraph(nodes as any);
      const error = detectCycles(graph);
      expect(error).not.toBeNull();
    });
  });

  describe('topologicalSort', () => {
    it('returns single level for independent tasks', () => {
      const nodes = [makeNode('a'), makeNode('b'), makeNode('c')];
      const graph = buildGraph(nodes as any);
      const levels = topologicalSort(graph);

      expect(levels.length).toBe(1);
      expect(levels[0]).toHaveLength(3);
      expect(levels[0]).toContain('a');
      expect(levels[0]).toContain('b');
      expect(levels[0]).toContain('c');
    });

    it('returns multiple levels for dependent tasks', () => {
      const nodes = [
        makeNode('a'),
        makeNode('b', ['a']),
        makeNode('c', ['b']),
      ];
      const graph = buildGraph(nodes as any);
      const levels = topologicalSort(graph);

      expect(levels.length).toBe(3);
      expect(levels[0]).toContain('a');
      expect(levels[1]).toContain('b');
      expect(levels[2]).toContain('c');
    });

    it('handles diamond dependency', () => {
      const nodes = [
        makeNode('a'),
        makeNode('b', ['a']),
        makeNode('c', ['a']),
        makeNode('d', ['b', 'c']),
      ];
      const graph = buildGraph(nodes as any);
      const levels = topologicalSort(graph);

      expect(levels[0]).toContain('a');
      expect(levels[1]).toContain('b');
      expect(levels[1]).toContain('c');
      expect(levels[2]).toContain('d');
    });

    it('throws for cyclic graph', () => {
      const nodes = [makeNode('a', ['b']), makeNode('b', ['a'])];
      const graph = buildGraph(nodes as any);

      expect(() => topologicalSort(graph)).toThrow();
    });
  });

  describe('getReadyTasks', () => {
    it('returns tasks with zero degree', () => {
      const nodes = [makeNode('a'), makeNode('b', ['a']), makeNode('c', ['a'])];
      const graph = buildGraph(nodes as any);
      const completed = new Set<string>();
      const pendingDegrees = new Map([['a', 0], ['b', 1], ['c', 1]]);

      const ready = getReadyTasks(graph, completed, pendingDegrees);
      expect(ready).toEqual(['a']);
    });

    it('returns multiple ready tasks', () => {
      const nodes = [makeNode('a'), makeNode('b'), makeNode('c')];
      const graph = buildGraph(nodes as any);
      const completed = new Set<string>();
      const pendingDegrees = new Map([['a', 0], ['b', 0], ['c', 0]]);

      const ready = getReadyTasks(graph, completed, pendingDegrees);
      expect(ready).toHaveLength(3);
    });
  });

  describe('updatePendingDegrees', () => {
    it('decrements dependent tasks', () => {
      const nodes = [makeNode('a'), makeNode('b', ['a']), makeNode('c', ['a'])];
      const graph = buildGraph(nodes as any);
      const pendingDegrees = new Map([['a', 0], ['b', 1], ['c', 1]]);

      updatePendingDegrees(graph, 'a', pendingDegrees);

      expect(pendingDegrees.get('b')).toBe(0);
      expect(pendingDegrees.get('c')).toBe(0);
    });

    it('handles non-existent dependent', () => {
      const nodes = [makeNode('a')];
      const graph = buildGraph(nodes as any);
      const pendingDegrees = new Map([['a', 0]]);

      updatePendingDegrees(graph, 'a', pendingDegrees);
      expect(pendingDegrees.get('a')).toBe(0);
    });
  });
});