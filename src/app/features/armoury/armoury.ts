import {ChangeDetectionStrategy, Component, computed, inject, signal} from '@angular/core';
import {RouterLink, RouterLinkActive} from '@angular/router';
import {toSignal} from '@angular/core/rxjs-interop';
import {ActivatedRoute} from '@angular/router';
import {map} from 'rxjs/operators';
import {GameDataService} from '../../core/services/game-data.service';
import {DescBlocksComponent} from '../warband-roster/desc-blocks/desc-blocks.component';
import type {
	AnyDataEntry,
	Equipment,
	Model,
	Addon,
	Skill,
	GameGlossaryEntry,
	VariantRule,
	DescriptionBlock,
	Tag,
} from '../../core/models/game-data.interfaces';

type CategorySlug = 'equipment' | 'abilities' | 'glossary' | 'models' | 'variant-rules' | 'addons';

const ARMOURY_DEV_MODE_KEY = 'musterroll_armoury_devmode';

@Component({
	selector: 'app-armoury',
	imports: [RouterLink, RouterLinkActive, DescBlocksComponent],
	templateUrl: './armoury.html',
	styleUrl: './armoury.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArmouryView {
	private readonly gameData = inject(GameDataService);
	private readonly route = inject(ActivatedRoute);

	readonly category = toSignal(
		this.route.params.pipe(map(p => (p['category'] as CategorySlug) ?? 'equipment')),
		{initialValue: 'equipment' as CategorySlug},
	);

	/** Developer Mode — persisted to localStorage. Default off. */
	readonly devMode = signal(localStorage.getItem(ARMOURY_DEV_MODE_KEY) === 'true');

	toggleDevMode():void {
		const next = !this.devMode();
		this.devMode.set(next);
		localStorage.setItem(ARMOURY_DEV_MODE_KEY, String(next));
	}

	readonly searchQuery = signal('');
	readonly sourceFilter = signal<string>('');
	readonly expandedId = signal<string | null>(null);
	readonly copiedId = signal<string | null>(null);

	readonly categories = computed(() => [
		{slug: 'equipment', label: 'Equipment', count: this.gameData.equipmentList().length},
		{slug: 'abilities', label: 'Abilities', count: this.gameData.skillList().length},
		{slug: 'glossary', label: 'Keywords / Glossary', count: this.gameData.glossaryList().length},
		{slug: 'models', label: 'Models', count: this.gameData.modelList().length},
		{slug: 'variant-rules', label: 'Variant Rules', count: this.gameData.variantRuleList().length},
		{slug: 'addons', label: 'Addons', count: this.gameData.addonList().length},
	]);

	readonly currentEntries = computed<AnyDataEntry[]>(() => {
		switch (this.category()) {
			case 'equipment':
				return this.gameData.equipmentList();
			case 'abilities':
				return this.gameData.skillList();
			case 'glossary':
				return this.gameData.glossaryList();
			case 'models':
				return this.gameData.modelList();
			case 'variant-rules':
				return this.gameData.variantRuleList();
			case 'addons':
				return this.gameData.addonList();
		}
	});

	readonly availableSources = computed<string[]>(() => {
		const seen = new Set<string>();
		for (const e of this.currentEntries()) {
			const s = this.entrySource(e);
			if (s) seen.add(s);
		}
		return [...seen].sort();
	});

	readonly filteredEntries = computed<AnyDataEntry[]>(() => {
		const q = this.searchQuery().toLowerCase().trim();
		const src = this.sourceFilter();
		let list = this.currentEntries();

		if (src) list = list.filter(e => this.entrySource(e) === src);
		if (q) list = list.filter(e =>
			e.name.toLowerCase().includes(q) ||
			(this.devMode() && e.id.toLowerCase().includes(q))
		);
		return list;
	});

	// ── Template helpers ──────────────────────────────────────────────────────

	entrySource(e:AnyDataEntry):string {
		if (e.type === 'VariantRule') return e.variantName;
		return (e as Equipment | Model | Addon | Skill | GameGlossaryEntry).source ?? '';
	}

	entryTags(e:AnyDataEntry):string[] {
		const tags:Tag[] = (e as { tags?:Tag[] }).tags ?? [];
		return [...new Set(tags.map(t => t.tag_name).filter(Boolean))];
	}

	entryDescription(e:AnyDataEntry):DescriptionBlock[] {
		if (e.type === 'Model') return (e as Model).blurb;
		return (e as { description:DescriptionBlock[] }).description ?? [];
	}

	hasUnresolved(e:AnyDataEntry):boolean {
		return this.scanBlocks(this.entryDescription(e));
	}

	private scanBlocks(blocks:DescriptionBlock[]):boolean {
		for (const b of blocks) {
			for (const ref of b.glossary ?? []) {
				if (!this.gameData.exists(ref.id)) return true;
			}
			if (b.subcontent && this.scanBlocks(b.subcontent)) return true;
		}
		return false;
	}

	isOverride(e:AnyDataEntry):boolean {
		return this.gameData.isOverride(e.id);
	}

	isExpanded(id:string):boolean {
		return this.expandedId() === id;
	}

	toggleExpand(id:string):void {
		this.expandedId.set(this.expandedId() === id ? null : id);
	}

	copyId(id:string, event:Event):void {
		event.stopPropagation();
		navigator.clipboard.writeText(id).then(() => {
			this.copiedId.set(id);
			setTimeout(() => this.copiedId.update(cur => cur === id ? null : cur), 1500);
		}).catch(() => {
		});
	}

	onSearch(event:Event):void {
		this.searchQuery.set((event.target as HTMLInputElement).value);
		this.expandedId.set(null);
	}

	onSourceFilter(event:Event):void {
		this.sourceFilter.set((event.target as HTMLSelectElement).value);
		this.expandedId.set(null);
	}

	// Typed narrowers for template
	asEquipment(e:AnyDataEntry):Equipment | null {
		return e.type === 'Equipment' ? e as Equipment : null;
	}

	asModel(e:AnyDataEntry):Model | null {
		return e.type === 'Model' ? e as Model : null;
	}

	asAddon(e:AnyDataEntry):Addon | null {
		return e.type === 'Addon' ? e as Addon : null;
	}

	asVariantRule(e:AnyDataEntry):VariantRule | null {
		return e.type === 'VariantRule' ? e as VariantRule : null;
	}
}
