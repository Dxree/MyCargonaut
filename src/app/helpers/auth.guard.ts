import {Injectable} from '@angular/core';
import {Router, CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot} from '@angular/router';
import {LoginComponent} from '../account/login/login.component';
import {Cargonaut} from '../../shared/cargonaut.model';
import {switchMap, take} from 'rxjs/operators';
import {of} from 'rxjs';
import {MatDialog} from '@angular/material/dialog';
import {AppComponent} from '../app.component';
import {AccountComponent} from '../account/account.component';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {

  constructor(/* readonly auth: AuthService, */ private router: Router, private dialog: MatDialog) {
  }

  /** Returns true whenever the user is authenticated */
  get authenticated() {
    return false; // this.auth.authenticated;
  }

  /** Returns the current authenticated user id */
  get userId() {
    return false; // this.auth.userId;
  }

  // Implements single route user authentication guarding
  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
    /*
    // const user = this.accountService.userValue;
    if (user) {
      // authorised so return true
      return true;
    }

    // not logged in so redirect to login page with the return url
     */
    // this.router.navigate(['/account/login'], { queryParams: { returnUrl: state.url }});
    console.log('hello');
    const dialogRef = this.dialog.open(AccountComponent, {
      width: '400px',
      data: {}
    });

    dialogRef.afterClosed().subscribe(result => {
      // this.email = result;
      console.log('closed: ' + result);
    });
    return false;

  }
}