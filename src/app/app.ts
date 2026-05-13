import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { GameDataService } from './services/game-data.service';
import { NavComponent } from './nav/nav';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NavComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly gameDataService = inject(GameDataService);

  constructor() {
    this.gameDataService.load();
  }
}
