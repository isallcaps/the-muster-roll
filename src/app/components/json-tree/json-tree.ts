import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { FieldIntelligenceService } from '../../services/field-intelligence.service';

// ---------------------------------------------------------------------------
// Data model
// ---------------------------------------------------------------------------

export interface TreeNode {
  path: string;
  parentPath: string | null;
  key: string | number | null;
  rawValue: unknown;
  type: 'object' | 'array' | 'primitive' | 'null';
  depth: number;
  childCount: number;
}

// ---------------------------------------------------------------------------
// Tree builder — flattens any JS value into an ordered list of TreeNodes
// ---------------------------------------------------------------------------

function buildNodes(data: unknown): TreeNode[] {
  const nodes: TreeNode[] = [];

  function visit(
    value: unknown,
    key: string | number | null,
    path: string,
    parentPath: string | null,
    depth: number,
  ): void {
    if (depth > 20) return;

    if (value === null || value === undefined) {
      nodes.push({ path, parentPath, key, rawValue: value, type: 'null', depth, childCount: 0 });
    } else if (Array.isArray(value)) {
      nodes.push({ path, parentPath, key, rawValue: value, type: 'array', depth, childCount: value.length });
      value.forEach((item, i) => visit(item, i, `${path}[${i}]`, path, depth + 1));
    } else if (typeof value === 'object') {
      const keys = Object.keys(value as object);
      nodes.push({ path, parentPath, key, rawValue: value, type: 'object', depth, childCount: keys.length });
      keys.forEach(k => visit((value as Record<string, unknown>)[k], k, `${path}.${k}`, path, depth + 1));
    } else {
      nodes.push({ path, parentPath, key, rawValue: value, type: 'primitive', depth, childCount: 0 });
    }
  }

  if (data === null || data === undefined) return nodes;

  if (Array.isArray(data)) {
    data.forEach((item, i) => visit(item, i, `$[${i}]`, null, 0));
  } else if (typeof data === 'object') {
    Object.keys(data as object).forEach(k =>
      visit((data as Record<string, unknown>)[k], k, `$.${k}`, null, 0),
    );
  } else {
    visit(data, null, '$', null, 0);
  }

  return nodes;
}

// ---------------------------------------------------------------------------
// Path mapping: raw export paths → enriched warband paths
// ---------------------------------------------------------------------------

function rawPathToEnrichedPath(rawPath: string): string {
  // Model top-level fields: $.models[N].FIELD → $.models[N].export.FIELD
  // (except array/collection fields that exist directly on EnrichedWarbandModel)
  const modelFieldMatch = rawPath.match(
    /^(\$\.models\[\d+\])\.(?!equipment|abilities|keywords|upgrades|advancements|injuries|cost)(.*)$/,
  );
  if (modelFieldMatch) return `${modelFieldMatch[1]}.export.${modelFieldMatch[2]}`;

  // Equipment item fields: $.models[N].equipment[M].FIELD → $.models[N].equipment[M].ref.FIELD
  const equipMatch = rawPath.match(/^(\$\.models\[\d+\]\.equipment\[\d+\])\.(.*)$/);
  if (equipMatch) return `${equipMatch[1]}.ref.${equipMatch[2]}`;

  // Ability item fields: $.models[N].abilities[M].FIELD → $.models[N].abilities[M].ref.FIELD
  const abilityMatch = rawPath.match(/^(\$\.models\[\d+\]\.abilities\[\d+\])\.(.*)$/);
  if (abilityMatch) return `${abilityMatch[1]}.ref.${abilityMatch[2]}`;

  return rawPath;
}

// ---------------------------------------------------------------------------
// Search helper
// ---------------------------------------------------------------------------

function nodeMatchesSearch(node: TreeNode, term: string): boolean {
  const keyStr = String(node.key ?? '').toLowerCase();
  if (keyStr.includes(term)) return true;
  if (node.type === 'primitive' && node.rawValue !== null && node.rawValue !== undefined) {
    return String(node.rawValue).toLowerCase().includes(term);
  }
  return false;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

@Component({
  selector: 'app-json-tree',
  templateUrl: './json-tree.html',
  styleUrl: './json-tree.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JsonTreeComponent {
  readonly data        = input<unknown>(null);
  readonly unresolvedIds = input<Set<string>>(new Set());
  readonly panelId     = input<'raw' | 'enriched'>('raw');

  private readonly highlightSvc = inject(FieldIntelligenceService);

  private readonly expandedPaths   = signal(new Set<string>());
  private readonly expandedStrings = signal(new Set<string>());
  readonly copiedPath              = signal<string | null>(null);
  readonly searchTerm              = signal('');

  // ---------------------------------------------------------------------------
  // Derived state
  // ---------------------------------------------------------------------------

  readonly allNodes = computed(() => buildNodes(this.data()));

  readonly visibleNodes = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    const all  = this.allNodes();

    if (term) {
      // While searching, flatten the tree — show all nodes; matches are highlighted
      return all;
    }

    const expanded     = this.expandedPaths();
    const visiblePaths = new Set<string>();

    for (const node of all) {
      if (node.parentPath === null) {
        visiblePaths.add(node.path);
      } else if (visiblePaths.has(node.parentPath) && expanded.has(node.parentPath)) {
        visiblePaths.add(node.path);
      }
    }

    return all.filter(n => visiblePaths.has(n.path));
  });

  readonly matchingPaths = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    if (!term) return new Set<string>();
    return new Set(this.allNodes().filter(n => nodeMatchesSearch(n, term)).map(n => n.path));
  });

  readonly enrichedHighlightPath = computed(() => {
    if (this.panelId() !== 'enriched') return null;
    const raw = this.highlightSvc.selectedRawPath();
    return raw ? rawPathToEnrichedPath(raw) : null;
  });

  // ---------------------------------------------------------------------------
  // Expansion controls
  // ---------------------------------------------------------------------------

  toggle(path: string): void {
    this.expandedPaths.update(prev => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }

  isExpanded(path: string): boolean {
    return this.expandedPaths().has(path);
  }

  expandAll(): void {
    const paths = this.allNodes()
      .filter(n => n.type === 'object' || n.type === 'array')
      .map(n => n.path);
    this.expandedPaths.set(new Set(paths));
  }

  collapseAll(): void {
    this.expandedPaths.set(new Set());
  }

  // ---------------------------------------------------------------------------
  // Interaction handlers
  // ---------------------------------------------------------------------------

  handleRowClick(node: TreeNode): void {
    if (this.panelId() === 'raw') {
      this.highlightSvc.selectPath(node.path);
    }
    if (node.type === 'object' || node.type === 'array') {
      this.toggle(node.path);
    }
  }

  copyValue(node: TreeNode, event: MouseEvent): void {
    event.stopPropagation();
    if (this.panelId() === 'raw') {
      this.highlightSvc.selectPath(node.path);
    }
    const text = node.rawValue === null || node.rawValue === undefined
      ? ''
      : String(node.rawValue);

    navigator.clipboard.writeText(text).then(() => {
      this.copiedPath.set(node.path);
      setTimeout(() => {
        if (this.copiedPath() === node.path) this.copiedPath.set(null);
      }, 1500);
    }).catch(() => {/* silently ignore */});
  }

  expandString(path: string, event: MouseEvent): void {
    event.stopPropagation();
    this.expandedStrings.update(prev => new Set([...prev, path]));
  }

  isStringExpanded(path: string): boolean {
    return this.expandedStrings().has(path);
  }

  // ---------------------------------------------------------------------------
  // Row state queries (called from template)
  // ---------------------------------------------------------------------------

  isHighlighted(node: TreeNode): boolean {
    if (this.panelId() === 'enriched') {
      return node.path === this.enrichedHighlightPath();
    }
    return node.path === this.highlightSvc.selectedRawPath();
  }

  isSearchMatch(node: TreeNode): boolean {
    return this.matchingPaths().has(node.path);
  }

  isUnresolvedValue(node: TreeNode): boolean {
    return (
      node.type === 'primitive' &&
      typeof node.rawValue === 'string' &&
      this.unresolvedIds().has(node.rawValue)
    );
  }

  isLongString(node: TreeNode): boolean {
    return node.type === 'primitive'
      && typeof node.rawValue === 'string'
      && node.rawValue.length > 80;
  }

  onSearchInput(event: Event): void {
    this.searchTerm.set((event.target as HTMLInputElement).value);
  }

  // ---------------------------------------------------------------------------
  // Formatting helpers
  // ---------------------------------------------------------------------------

  formatKey(key: string | number | null): string {
    if (key === null) return '$';
    if (typeof key === 'number') return `[${key}]`;
    return key;
  }

  formatValue(value: unknown): string {
    if (value === null || value === undefined) return '—';
    if (typeof value === 'string') return `"${value}"`;
    if (typeof value === 'boolean') return String(value);
    return String(value);
  }
}
