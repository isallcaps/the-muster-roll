import {Component, Input} from '@angular/core';
import type {DescriptionBlock} from '../../core/models/game-data.interfaces';

/**
 * Renders a flat array of DescriptionBlocks from the game data JSON.
 * Handles two levels: effect-type blocks (bold title + inline subcontent)
 * and desc-type blocks (plain paragraph).
 */
@Component({
	selector: 'tc-desc-blocks',
	template: `
		@for (block of blocks; track $index) {
			@if (isEffect(block)) {
				<p class="db-p">
					<strong>{{ block.content }}</strong>
					@for (sub of (block.subcontent ?? []); track $index) {
						{{ sub.content }}
					}
				</p>
			} @else {
				<p class="db-p">{{ block.content }}</p>
			}
		}
	`,
	styles: [`:host {
		display: block;
	}

	.db-p {
		margin: 0 0 1px;
		padding: 0;
	}`],
})
export class DescBlocksComponent {
	@Input({required: true}) blocks:DescriptionBlock[] = [];

	isEffect(b:DescriptionBlock):boolean {
		return b.tags.some(t => t.val === 'effect' || t.val === 'subeffect');
	}
}
