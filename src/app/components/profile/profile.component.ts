import {Component, OnInit} from '@angular/core';
import {Cargonaut} from '../../../shared/cargonaut.model';
import {Rating} from '../../../shared/rating.model';
import {Vehicle} from '../../../shared/vehicle.model';
import {VehicleType, VehicleTypeType} from '../../../shared/vehicle-type.model';
import {Hold} from '../../../shared/hold.model';

import {FormBuilder, FormGroup, Validators} from '@angular/forms';
import {AccountService} from '../../services/account.service';
import {MatDialog} from '@angular/material/dialog';
import {AddVehicleComponent} from '../profileComponents/add-vehicle/add-vehicle.component';


@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})

export class ProfileComponent implements OnInit {
  user: Cargonaut; // the user to whom the profile belongs to - get through id from service later on
  myuser: Cargonaut; // the logged in user - get from service later
  ratingsUser: Rating [];
  vehiclesUser: Vehicle [];
  ownProfile: boolean;

  editProfileForm: FormGroup;
  submitted = false;


  constructor(private formBuilder: FormBuilder, private accountService: AccountService, private dialog: MatDialog) {

    this.myuser = this.accountService.user;
    this.user = this.myuser; // todo: remove

    // user for not own profile
   /*
    this.user = {
      firstname: 'Erika',
      lastname: 'Musterfrau',
      birthday: new Date('1994-08-21'),
      email: 'erika@mustermann.de',
      password: 'test',
    };*/

    let rating1: Rating;
    rating1 = {
      ratingStars: 4,
      comment: 'Guter Preis, aber kam etwas später als vereinbart.',
      author: this.user
    };

    let rating2: Rating;
    rating2 =  {
      ratingStars: 2,
      comment: 'Sitze waren dreckig, Fahrer ungepflegt, aber wir sind angekommen.',
      author: this.user
    };

    let vehicleType1: VehicleType;
    vehicleType1 = {
      type: VehicleTypeType.PKW,
      description: 'Audi 5120x'
    };
    let vehicleType2: VehicleType;
    vehicleType2 = {
      type: VehicleTypeType.LKW,
      description: 'Nissan 350z'
    };
    const hold1: Hold = new Hold(3.0, 2.0, 1.5);

    let vehicle1: Vehicle;
    vehicle1 = {
      id: 1,
      owner: this.myuser,
      type: vehicleType1,
      comment: 'Sehr verlässlich, unter 2000km.',
      seats: 5,
    };

    let vehicle2: Vehicle;
    vehicle2 = {
      id: 2,
      owner: this.myuser,
      type: vehicleType2,
      comment: 'Viel Stauraum.',
      seats: 2,
      hold: hold1
    };



    this.ratingsUser = [rating1, rating2];
    this.vehiclesUser = [vehicle1, vehicle2];

    // todo: get ratings and vehicles for user
    console.log(this.user.firstname);
    console.log(this.user.birthday);

  }

  ngOnInit(): void {
    this.myuser = this.accountService.user;
    this.user = this.myuser; // todo: remove
    this.ownProfile = true; // or false, depending on id
  }

  getStarAverage(): number {
    let result = 0;
    this.ratingsUser.forEach(r => result += r.ratingStars);
    return result / this.ratingsUser.length;
  }

  getUser(): Cargonaut {
    return this.user;
  }

  getUserName(): string {
    return this.user.firstname + ' ' + this.user.lastname;
  }

  getBirthday(): string {
    return new Date(this.user.birthday).toLocaleDateString();
  }

  editProfile(): void {
    document.getElementById('editProfileForm').style.display = 'block';
    document.getElementById('user-info').style.display = 'none';
  }

  submitEditUser(user: Cargonaut): void {
    // todo: error
    // todo: send to service
    this.user = user;
    document.getElementById('editProfileForm').style.display = 'none';
    document.getElementById('user-info').style.display = 'block';
  }

  // callback from child form
  submitEditVehicle(car: Vehicle): void {
    const index = this.vehiclesUser.findIndex(s => s.id === car.id);
    this.vehiclesUser[index] = car;
    // todo: submit car via service
  }

  submitDeleteVehicle(car: Vehicle): void {
    const index = this.vehiclesUser.findIndex(s => s.id === car.id);
    // todo: submit car via service
    if (index > -1) {
      this.vehiclesUser.splice(index, 1);
    }
  }

  addVehicle(): void {
    const test = this.dialog.open(AddVehicleComponent);
    const sub = test.componentInstance.submitCallback.subscribe((result: Vehicle) => {
      console.log(result.seats);
      this.vehiclesUser.push(result);
    });
    test.afterClosed().subscribe(() => {
    });
  }

}
