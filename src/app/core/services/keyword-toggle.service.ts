import {Injectable, signal} from '@angular/core';

@Injectable({providedIn: 'root'})
export class KeywordToggleService {
	// Always create a new Set on each update so Angular detects the change via ===.
	private readonly _hidden = signal<Set<string>>(new Set());
	readonly hidden = this._hidden.asReadonly();

	toggle(id:string):void {
		this._hidden.update(prev => {
			const next = new Set(prev);
			next.has(id) ? next.delete(id) : next.add(id);
			return next;
		});
	}

	hideAll(ids:Iterable<string>):void {
		this._hidden.set(new Set(ids));
	}

	showAll():void {
		this._hidden.set(new Set());
	}

	/** Reactive — safe to call directly from templates. */
	isVisible(id:string):boolean {
		return !this._hidden().has(id);
	}
}
