import {BrowserModule} from '@angular/platform-browser';
import {NgModule} from '@angular/core';
import {HttpClientModule} from '@angular/common/http';

import {AppRoutingModule} from './app-routing.module';

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
import {AccountComponent} from './components/account/account.component';
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
import {NgbActiveModal, NgbDatepicker, NgbModule} from '@ng-bootstrap/ng-bootstrap';
import {HomePostComponent} from './components/home-post/home-post.component';
import {FormsModule} from '@angular/forms';

@NgModule({
  declarations: [
    AppComponent,
    PostComponent,
    PostDisplayCardComponent,
    StarRatingComponent,
    PostVehicleTypeIconComponent,
    HeaderComponent,
    HomeComponent,
    AlertComponent,
    AccountComponent,
    LoginComponent,
    RegisterComponent,
    HomeComponent,
    SidebarRightComponent,
    ProfileComponent,
    ProfileRatingComponent,
    ProfileVehicleComponent,
    AddVehicleComponent,
    EditProfileComponent,
    SidebarRightComponent,
    NewPostModalComponent,
    HomePostComponent
  ],
  imports: [
    BrowserModule.withServerTransition({ appId: 'serverApp' }),
    AppRoutingModule,
    MatIconModule,
    BrowserAnimationsModule,
    HttpClientModule,
    AppRoutingModule,
    ReactiveFormsModule,
    MatDialogModule,
    NgbModule,
    FormsModule,
  ],
  providers: [NgbActiveModal],
  bootstrap: [AppComponent]
})
export class AppModule {
}
