import {Component, isDevMode} from '@angular/core';
import {RouterLink, RouterLinkActive} from '@angular/router';

@Component({
	selector: 'app-nav',
	imports: [RouterLink, RouterLinkActive],
	templateUrl: './nav.html',
	styleUrl: './nav.scss',
})
export class NavComponent {
	readonly devMode = isDevMode();
}
