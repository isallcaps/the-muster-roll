import {Routes} from '@angular/router';
import {FieldIntelligenceView} from './features/field-intelligence/field-intelligence';
import {ArmouryView} from './features/armoury/armoury';
import {AboutView} from './features/about/about';
import {PrintSheetComponent} from './features/warband-roster/print-sheet/print-sheet';

export const routes:Routes = [
	{
		path: '',
		component: PrintSheetComponent,
	},
	{
		path: 'viewer',
		component: FieldIntelligenceView,
	},
	{
		path: 'game-data',
		redirectTo: 'game-data/equipment',
		pathMatch: 'full',
	},
	{
		path: 'game-data/:category',
		component: ArmouryView,
	},
	{
		path: 'about',
		component: AboutView,
	},
];
