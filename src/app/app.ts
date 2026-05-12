import { Component, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { GameDataService } from './services/game-data.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('The Muster Roll');

  // Dependencies
	private readonly gameDataService = inject(GameDataService);

  constructor() {
    this.gameDataService.load();
  }
}
