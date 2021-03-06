import {Injectable} from '@angular/core';
import {DriveStatus, Post} from '../../shared/post.model';
import {HttpClient} from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class BookingService {

  constructor(private http: HttpClient) {
  }

  getBookingsForCargonaut(cargonautId: number): Promise<Post[]> {
    const http = this.http;
    return new Promise<Post[]>(async (resolve, reject) => {
      await http.get('http://localhost:4200/api/buchungen/' + cargonautId.toString(), {}).toPromise().then((res: any) => {
        const bookings: Post[] = [];
        res.buchungen.forEach(booking => bookings.push({
          id: booking.id,
          description: booking.description,
          startlocation: booking.standort,
          endlocation: booking.zielort,
          start_time: booking.startzeit,
          end_time: booking.zeit,
          payment: booking.bezahlungsart,
          vehicle: {
            id: booking.fahrzeug
          },
          bookedBy: [{id: booking.gebucht_von}],
          seats: booking.anzahl_sitzplätze,
          type: booking.typ,
          author: {
            id: booking.verfasser
          },
          price: booking.preis,
          closed: booking.gebucht === 1,
          status: booking.status === 'abgeschlossen' ? DriveStatus.ABGESCHLOSSEN
            : (booking.status === 'unterwegs' ? DriveStatus.UNTERWEGS : DriveStatus.AUFGETRAGEN)
        }));
        resolve(bookings);
      }).catch(error => {
        console.log('Error: ' + error);
        reject(error);
      });
    });
  }

  async addBooking(postID: number, customerID: number): Promise<void> {
    const http = this.http;
    return new Promise<void>(async (resolve, reject) => {
      await http.post('http://localhost:4200/api/buchung/' + customerID.toString(), {
        length: 1, // TODO: remove laderaum from db and server
        width: 1,
        height: 1,
        seats: 1,
        post: postID
      }).toPromise().then((res: any) => {
        resolve();
      }).catch(error => {
        console.log('Error :' + error);
        reject(error);
      });
    });
  }

  public async updateStatus(booking: Post): Promise<string> {
    const http = this.http;
    const data = {status: this.getStatusToString(booking.status)};
    return new Promise<string>(async (resolve, reject) => {
      await http.put('http://localhost:4200/api/buchungen/' + booking.id.toString(), {
        data
      }).toPromise().then((res: any) => {
        resolve(res.message);
      }).catch(error => {
        console.log('Error: ' + error.message);
        reject(error);
      });
    });
  }

  getStatusToString(status: number) {
    switch (status) {
      case 0:
        return 'ausstehend';
      case 1:
        return 'unterwegs';
      case 2:
        return 'abgeschlossen';
      default:
        return 'ausstehend';
    }
  }

}
