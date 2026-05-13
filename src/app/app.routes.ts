import { Routes } from '@angular/router';
import { BeginnerView } from './views/beginner-view/beginner-view';
import { FieldIntelligenceView } from './views/field-intelligence/field-intelligence';

export const routes: Routes = [
  {
    path: '',
    component: BeginnerView,
  },
  {
    path: 'viewer',
    component: FieldIntelligenceView,
  },
];
