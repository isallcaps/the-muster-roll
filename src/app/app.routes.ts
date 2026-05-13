import { Routes } from '@angular/router';
import { BeginnerView } from './views/beginner-view/beginner-view';
import { FieldIntelligenceView } from './views/field-intelligence/field-intelligence';
import { ArmouryView } from './views/armoury/armoury';
import { AboutView } from './views/about/about';

export const routes: Routes = [
  {
    path: '',
    component: BeginnerView,
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
