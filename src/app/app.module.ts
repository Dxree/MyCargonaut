import {BrowserModule} from '@angular/platform-browser';
import {NgModule} from '@angular/core';
import {HttpClientModule} from '@angular/common/http';
import {AppRoutingModule} from './app-routing.module';
import {BookingPageComponent} from './components/booking-page/booking-page.component';
import {BookingCardComponent} from './components/booking-page/booking-card/booking-card.component';
import {BookingListComponent} from './components/booking-page/booking-list/booking-list.component';
import {FooterComponent} from './components/footer/footer.component';
import {PostComponent} from './components/post/post.component';
import {PostDisplayCardComponent} from './components/post/post-display-card/post-display-card.component';
import {StarRatingComponent} from './components/post/star-rating/star-rating.component';
import {PostVehicleTypeIconComponent} from './components/post/post-vehicle-type-icon/post-vehicle-type-icon.component';

import {MatIconModule} from '@angular/material/icon';

import {AppComponent} from './app.component';
import {HeaderComponent} from './components/header/header.component';
import {HomeComponent} from './components/home/home.component';
import {SidebarRightComponent} from './components/sidebar-right/sidebar-right.component';
import {AlertComponent} from './components/alert/alert.component';
import {LoginComponent} from './components/account/login/login.component';
import {RegisterComponent} from './components/account/register/register.component';
import {ProfileComponent} from './components/profile/profile.component';
import {ProfileRatingComponent} from './components/profileComponents/profile-rating/profile-rating.component';
import {ProfileVehicleComponent} from './components/profileComponents/profile-vehicle/profile-vehicle.component';
import {AddVehicleComponent} from './components/profileComponents/add-vehicle/add-vehicle.component';
import {EditProfileComponent} from './components/profileComponents/edit-profile/edit-profile.component';

import {ReactiveFormsModule} from '@angular/forms';
import {MatDialogModule} from '@angular/material/dialog';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';

import {NewPostModalComponent} from './components/new-post-modal/new-post-modal.component';
import {NgbActiveModal, NgbModule} from '@ng-bootstrap/ng-bootstrap';
import {HomePostComponent} from './components/home-post/home-post.component';
import {FormsModule} from '@angular/forms';
import {AddRatingComponent} from './components/post/add-rating/add-rating.component';
import { UpdatePasswordComponent } from './components/profileComponents/update-password/update-password.component';
import { ChatListComponent } from './components/chat-list/chat-list.component';
import { ChatComponent } from './components/chat/chat.component';
import {MatButtonModule} from '@angular/material/button';
import {MatProgressSpinnerModule} from '@angular/material/progress-spinner';

@NgModule({
  declarations: [
    AppComponent,
    AlertComponent,
    HeaderComponent,
    SidebarRightComponent,
    BookingPageComponent,
    BookingCardComponent,
    BookingListComponent,
    PostComponent,
    PostDisplayCardComponent,
    StarRatingComponent,
    PostVehicleTypeIconComponent,
    HomeComponent,
    AlertComponent,
    LoginComponent,
    RegisterComponent,
    HomeComponent,
    ProfileComponent,
    ProfileRatingComponent,
    ProfileVehicleComponent,
    AddVehicleComponent,
    EditProfileComponent,
    AddRatingComponent,
    UpdatePasswordComponent,
    ChatListComponent,
    SidebarRightComponent,
    NewPostModalComponent,
    HomePostComponent,
    ChatComponent,
    FooterComponent
  ],
  imports: [
    BrowserModule.withServerTransition({appId: 'serverApp'}),
    AppRoutingModule,
    MatIconModule,
    BrowserAnimationsModule,
    HttpClientModule,
    AppRoutingModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    NgbModule,
    FormsModule,
  ],
  providers: [NgbActiveModal],
  bootstrap: [AppComponent]
})
export class AppModule {
}
