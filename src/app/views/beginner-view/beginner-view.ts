import { Component } from '@angular/core';
import { PrintSheetComponent } from '../../print-sheet/print-sheet';

@Component({
  selector: 'app-beginner-view',
  imports: [PrintSheetComponent],
  templateUrl: './beginner-view.html',
  styleUrl: './beginner-view.scss',
})
export class BeginnerView {}
