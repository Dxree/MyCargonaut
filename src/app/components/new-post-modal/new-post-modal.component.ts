import {Component, OnInit} from '@angular/core';
import {NgbActiveModal, NgbCalendar} from '@ng-bootstrap/ng-bootstrap';
import {Post, PostType} from '../../../shared/post.model';
import {VehicleService} from '../../services/vehicle.service';
import {VehicleTypeType} from '../../../shared/vehicle-type.model';
import {AccountService} from '../../services/account.service';
import {Vehicle} from '../../../shared/vehicle.model';
import {Hold} from '../../../shared/hold.model';

@Component({
  selector: 'app-new-post-modal',
  templateUrl: './new-post-modal.component.html',
  styleUrls: ['./new-post-modal.component.css'],
})
export class NewPostModalComponent implements OnInit {


  posttype = true; // Angebot: true, Gesuch: false
  vehicles: Vehicle[] = [];
  cities: string[];
  startCity: string;
  endCity: string;
  currVehicle: Vehicle;
  startDate: any;
  startTime: any = {hour: 0, minute: 0};
  endDate: any;
  endTime: any = {hour: 0, minute: 0};
  description: string;
  filledForm: boolean;
  newPost: Post;
  payment: string[];
  currPayment: string;
  price: number;
  currHold: any;
  currSeats: number;
  currVehicleType: VehicleTypeType;
  vehicleTypes: VehicleTypeType[] = [VehicleTypeType.PKW, VehicleTypeType.LKW, VehicleTypeType.BUS, VehicleTypeType.PLANE,
    VehicleTypeType.BOAT];

  constructor(private calendar: NgbCalendar, public activeModal: NgbActiveModal,
              private vehicleService: VehicleService, private accountService: AccountService) {
  }


  ngOnInit() {

    this.cities = [
      'Stuttgart',
      'München',
      'Berlin',
      'Potsdam',
      'Bremen',
      'Hamburg',
      'Frankfurt am Main',
      'Rostock',
      'Hannover',
      'Köln',
      'Mainz',
      'Saarbrücken',
      'Halle (Saale)',
      'Leipzig',
      'Kiel',
      'Erfurt'
    ];
    this.payment = [
      'EC-Karte',
      'Kreditkarte',
      'PayPal',
      'Bar'
    ];
    this.startCity = undefined;
    this.endCity = undefined;
    this.currVehicle = undefined;
    this.startDate = this.calendar.getToday();
    this.endDate = this.calendar.getToday();
    this.filledForm = true;
    this.currHold = {
      height: undefined,
      length: undefined,
      width: undefined
    };
    this.getVehicles();
  }

  getVehicles(): void {
    const currUser = this.accountService.user;
    if (currUser) {
      this.vehicleService.getAllVehicles(currUser.id).then(
        result => {
          if (result.length > 0) {
            result.forEach(async elem => {
              await this.vehicleService.getVehicleHold(elem).then(
                res => {
                  this.vehicles.push(res);
                });
            });
          } else {
            this.vehicles = [];
          }
        }
      ).catch(err => {
        console.log('Error: ', err);
      });
    }
  }

  savePost(): void {

    const todayDate = this.calendar.getToday();

    if (this.startDate && this.startDate >= todayDate && this.endDate
      && this.endDate >= this.startDate && this.startCity && this.endCity && this.startTime && this.endTime
      && ((this.currHold.height && this.currHold.width && this.currHold.length) || this.currSeats) && this.currPayment
      && this.price && this.currVehicleType) {

      this.filledForm = true;
      // Post erstellen mit werten

      this.closeModal();
    } else {
      this.filledForm = false;
    }

    // this.startCity = undefined;
    // this.endCity = undefined;
    // this.currVehicle = undefined;
  }

  closeModal() {
    this.newPost = {
      startlocation: this.startCity,
      endlocation: this.endCity,
      start_time: new Date(this.startDate.year, this.startDate.month - 1, this.startDate.day, this.startTime.hour + 1,
        this.startTime.minute),
      end_time: new Date(this.endDate.year, this.endDate.month - 1, this.endDate.day, this.endTime.hour + 1,
        this.endTime.minute),
      payment: this.currPayment,
      vehicle: {
        id: this.currVehicle?.id,
      },
      seats: this.currSeats ? this.currSeats : 0,
      type: (this.returnType(this.posttype)),
      price: this.price,
      hold: (this.currHold.length && this.currHold.width && this.currHold.height) ?
        new Hold(this.currHold.length, this.currHold.width, this.currHold.height) : null,
      description: this.description,
      vehicleType: this.currVehicle?.type?.type ? this.currVehicle.type.type : this.currVehicleType
    };
    this.activeModal.close(this.newPost);
  }

  returnType(type: boolean): PostType {
    return type ? PostType.OFFER : PostType.SEARCHING;
  }

  vehicleChosen(vehicle: Vehicle) {
    this.currVehicle = vehicle;
    this.currVehicleType = vehicle.type.type;
    this.currHold = vehicle.hold;
    this.currSeats = vehicle.seats;
  }

  switch(isOffer: boolean) {
    this.posttype = isOffer;
    this.currVehicleType = undefined;
    this.currVehicle = undefined;
    this.currHold = {
      height: undefined,
      length: undefined,
      width: undefined
    };
    this.currSeats = undefined;
  }

}
