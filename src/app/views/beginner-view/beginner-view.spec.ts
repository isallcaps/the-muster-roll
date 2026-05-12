import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BeginnerView } from './beginner-view';

describe('BeginnerView', () => {
  let component: BeginnerView;
  let fixture: ComponentFixture<BeginnerView>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BeginnerView],
    }).compileComponents();

    fixture = TestBed.createComponent(BeginnerView);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
