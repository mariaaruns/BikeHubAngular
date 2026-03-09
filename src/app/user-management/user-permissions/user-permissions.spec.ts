import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UserPermissions } from './user-permissions';

describe('UserPermissions', () => {
  let component: UserPermissions;
  let fixture: ComponentFixture<UserPermissions>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserPermissions],
    }).compileComponents();

    fixture = TestBed.createComponent(UserPermissions);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
