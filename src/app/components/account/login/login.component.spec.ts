import {ComponentFixture, fakeAsync, TestBed, tick} from '@angular/core/testing';

import {LoginComponent} from './login.component';
import {ReactiveFormsModule} from '@angular/forms';
import {RouterTestingModule} from '@angular/router/testing';
import {routes} from '../../../app-routing.module';
import {HttpClientModule} from '@angular/common/http';
import {Router} from '@angular/router';
import {Location} from '@angular/common';


describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let router: Router;
  let location: Location;
  let correctData;
  let incorrectData;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [
        LoginComponent
      ],
      imports: [
        HttpClientModule,
        ReactiveFormsModule,
        [RouterTestingModule.withRoutes(routes)]
      ],
      providers: [
        // RouterModule
        // { provide: UserService, useValue: userServiceStub }
      ]
    })
      .compileComponents();
  });

  beforeEach(() => {
    // both needs to be set in beforeEach, in beforeAll or in describe or global does NOT work sometimes!
    correctData = {
      email: 'firstname@lastname.com',
      password: '123456abcde'
    };
    incorrectData = {
      email: 'email', // no email pattern
      password: '12345' // not min 6 chars long
    };
  });

  beforeEach(async () => {
    router = TestBed.inject(Router);
    location = TestBed.inject(Location);
    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    component.ngOnInit();
    fixture.detectChanges();
    fixture.ngZone.run(() => router.initialNavigation());
    await fixture.ngZone.run(async () => await router.navigateByUrl('/login'));

  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should navigate to /register if #register link is clicked.', fakeAsync(() => {
    expect(location.path()).toBe('/login');
    const compiled = fixture.debugElement.nativeElement;
    const button = compiled.querySelector('#register');
    button.click();
    tick();
    // fixture.detectChanges();
    expect(location.path()).toBe('/register');
  }));

  it('should call onSubmit() if #submit button is clicked.', fakeAsync(() => {
    const compiled = fixture.debugElement.nativeElement;
    spyOn(component, 'onSubmit');
    const button = compiled.querySelector('#submit');
    button.click();
    tick();
    fixture.detectChanges();
    expect(component.onSubmit).toHaveBeenCalled();
    // expect(component.submitted).toBeTrue();
  }));

  it('should return form.controls if getter f is called.', () => {
    expect(component.f).toEqual(component.form.controls);
  });

  it('should set form invalid if no input is provided.', () => {
    component.form.reset();
    expect(component.form.invalid).toBeTrue();
    expect(component.form.valid).toBeFalse();
  });

  it('should set form valid if all input is provided.', () => {
    component.form.reset(correctData);
    expect(component.form.valid).toBeTrue();

  });

  it('should set form invalid if only wrong input is provided.', () => {
    component.form.reset(incorrectData);
    expect(component.form.invalid).toBeTrue();
    expect(component.form.valid).toBeFalse();
  });

  it('should set form invalid if some wrong input is provided.', () => {
    // Incorrect email
    let data = correctData;
    data.email = incorrectData.email;
    component.form.reset(data);
    expect(component.form.invalid).toBeTrue();
    expect(component.form.valid).toBeFalse();
    // Incorrect password
    data = correctData;
    data.password = incorrectData.password;
    component.form.reset(data);
    expect(component.form.invalid).toBeTrue();
    expect(component.form.valid).toBeFalse();
  });
});
