import {ComponentFixture, TestBed} from '@angular/core/testing';
import {HttpClientTestingModule, HttpTestingController} from '@angular/common/http/testing';

import {BookingCardComponent} from './booking-card.component';
import {HttpClient} from '@angular/common/http';
import {DriveStatus} from '../../../../shared/post.model';
import {RouterTestingModule} from '@angular/router/testing';
import {routes} from '../../../app-routing.module';

describe('BookingCardComponent', () => {
  let component: BookingCardComponent;
  let fixture: ComponentFixture<BookingCardComponent>;

  let httpClient: HttpClient;
  let httpTestingController: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        HttpClientTestingModule,
        RouterTestingModule.withRoutes(routes)
      ],
      declarations: [BookingCardComponent]
    })
      .compileComponents();

    httpClient = TestBed.inject(HttpClient);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BookingCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('comment section should be hidden by default', () => {
    expect(component.commentSectionVisible).toBeFalse();
  });

  it('should hide rating button if booking hasnt been completed', () => {
    expect(component.isCommentSectionAvailable({status: DriveStatus.UNTERWEGS})).toBeFalse();
    expect(component.isCommentSectionAvailable({status: DriveStatus.AUFGETRAGEN})).toBeFalse();
  });

  it('should show rating button if booking has been completed', () => {
    expect(component.isCommentSectionAvailable({status: DriveStatus.ABGESCHLOSSEN})).toBeTrue();
  });
});
