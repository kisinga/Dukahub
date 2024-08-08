import { Injectable, signal, type Signal } from '@angular/core';
import PocketBase from 'pocketbase';

@Injectable({
  providedIn: 'root'
})
export class DbService {
  pb = new PocketBase('pantrify.azurewebsites.net');

  authenticated = signal(false);

  constructor() {
    this.pb.authStore.onChange((auth) => {
      if (auth === null) {
        this.authenticated.set(false);
        return;
      }
      this.authenticated.set(true);
    })
  }

  async login(email: string, password: string): Promise<void> {
    await this.pb.collection('users').authWithPassword(email, password);
    return;
  }

}
