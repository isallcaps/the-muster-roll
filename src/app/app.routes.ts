import {inject, isDevMode} from '@angular/core';
import {CanActivateFn, Router, Routes} from '@angular/router';
import {FieldIntelligenceView} from './features/field-intelligence/field-intelligence';
import {ArmouryView} from './features/armoury/armoury';
import {AboutView} from './features/about/about';
import {PrintSheetComponent} from './features/warband-roster/print-sheet/print-sheet';

/** Redirects to / in production; allows access only during development. */
const devOnlyGuard:CanActivateFn = () =>
	isDevMode() ? true : inject(Router).createUrlTree(['/']);

export const routes:Routes = [
	{
		path: '',
		component: PrintSheetComponent,
	},
	{
		path: 'viewer',
		component: FieldIntelligenceView,
		canActivate: [devOnlyGuard],
	},
	{
		path: 'game-data',
		redirectTo: 'game-data/equipment',
		pathMatch: 'full',
	},
	{
		path: 'game-data/:category',
		component: ArmouryView,
		canActivate: [devOnlyGuard],
	},
	{
		path: 'about',
		component: AboutView,
	},
];
