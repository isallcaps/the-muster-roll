import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class FieldIntelligenceService {
  readonly selectedRawPath = signal<string | null>(null);

  selectPath(path: string | null): void {
    this.selectedRawPath.set(path);
  }
}
