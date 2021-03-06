import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Cargonaut} from '../../shared/cargonaut.model';
import {DriveStatus, Post, PostType} from '../../shared/post.model';
import {VehicleTypeType} from '../../shared/vehicle-type.model';
import {Vehicle} from '../../shared/vehicle.model';

@Injectable({
  providedIn: 'root'
})
export class PostService {

  constructor(private http: HttpClient) {
  }

  public async createPost(cargonaut: Cargonaut, post: Post): Promise<number> {
    const http = this.http;
    return new Promise<number>(async (resolve, reject) => {
      await http.post('http://localhost:4200/api/post/' + cargonaut.id, {
        post
      }).toPromise().then((res: any) => {
        resolve(res.createdVehicle);
      }).catch(error => {
        console.log('Error: ', error);
        reject(error);
      });
    });
  }

  public async getAllPosts(): Promise<Post[]> {
    const http = this.http;
    return new Promise<Post[]>(async (resolve, reject) => {
      await http.get('http://localhost:4200/api/posts').toPromise().then((res: any) => {
        resolve(res.posts);
      }).catch(error => {
        console.log('Error: ' + error);
        reject(error);
      });
    });
  }

  public async getSpecificPost(postId: number): Promise<Post> {
    const http = this.http;
    return new Promise<Post>(async (resolve, reject) => {
      await http.get('http://localhost:4200/api/post/' + postId).toPromise().then((res: any) => {
        res.post.author = {id: res.post.author};
        res.post.vehicle = {id: res.post.vehicle};
        res.post.end_time = new Date(res.post.end_time);
        res.post.start_time = new Date(res.post.start_time);
        resolve(res.post);
      }).catch(error => {
        console.log('Error: ' + error);
        reject(error);
      });
    });
  }

  public async updatePost(post: Post, postId: number): Promise<Post> {
    const http = this.http;
    if (post.description === '') {
      post.description = 'no description';
    }
    return new Promise<Post>(async (resolve, reject) => {
      await http.put('http://localhost:4200/api/post/' + postId, {
        post
      }).toPromise().then((res: any) => {
        resolve(res.post);
      }).catch(error => {
        console.log('Error: ' + error);
        reject(error);
      });
    });
  }

  async getMorePosts(): Promise<Post[]> {
    const http = this.http;
    return new Promise<Post[]>(async (resolve, reject) => {
      await http.get('http://localhost:4200/api/posts')
        .toPromise().then((res: any) => {
          res.posts.forEach(post => {
            post.start_time = new Date(post.start_time);
            post.end_time = new Date(post.end_time);
          });
          resolve(res.posts);
        }).catch(error => {
          console.log('Error: ' + error);
          reject(error);
        });
    });
  }
}

