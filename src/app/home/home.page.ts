import { Component } from '@angular/core';
import { Map, tileLayer } from 'leaflet';
import { AngularFirestore } from '@angular/fire/firestore';
import { AngularFireFunctions } from '@angular/fire/functions';

import * as L from 'leaflet';
import 'leaflet.heat';

import 'firebase/firestore';

// declare var L: any;
declare var document: any;

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss']
})
export class HomePage {
  map: Map;
  public loading = true;
  private interval;

  constructor(
    private afs: AngularFirestore,
    private afFunc: AngularFireFunctions
  ) {}

  ionViewDidEnter() {
    this.leafletMap();
  }

  leafletMap() {
    // In setView add latLng and zoom
    this.map = new Map('mapId', {
      maxZoom: 10,
      minZoom: 5
    }).setView([38.36, -98.75], 7);

    tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
      {
        attribution: 'gethuan.com'
      }
    ).addTo(this.map);

    const heatCoords = this.afFunc
      .httpsCallable('getHeatCoordinates')({ data: 'data' })
      .subscribe(coordinates => {
        const heat = L.heatLayer(coordinates.message, {
          radius: 35,
          maxZoom: 10,
          minOpacity: 0.01
        }).addTo(this.map);

        this.loading = false;
      });

    this.interval = setInterval(() => {
      const sub = this.afFunc
        .httpsCallable('getLatestUpdateLocation')({ data: 'data' })
        .subscribe(location => {
          sub.unsubscribe();

          this.map.panTo(location.message.latlng, { animate: false });

          const petIcon = document.getElementById('pet-icon');
          const rando = this.randomIntFromInterval(1, 8);
          petIcon.src = `assets/imgs/active_user-${rando}.png`;

          setTimeout(() => {
            const point = this.map.latLngToContainerPoint(
              location.message.latlng
            );

            const blink = document.getElementById('blink');
            blink.classList.remove('blink');

            // tslint:disable-next-line:no-unused-expression
            void blink.offsetWidth;

            document.getElementById('blink').style.top = point.y - 25 + 'px';
            document.getElementById('blink').style.left = point.x - 25 + 'px';
            blink.classList.add('blink');

            const locationElement = document.getElementById('location');
            locationElement.innerText = location.message.location;
          }, 250);
        });
    }, 5000);
  }

  /** Remove map when we have multiple map object */
  ionViewWillLeave() {
    this.map.remove();
    clearInterval(this.interval);
  }

  randomIntFromInterval(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
  }

  shareOnFacebook() {
    window.open(
      'https://facebook.com/sharer/sharer.php?u=https%3A%2F%2Fppn.gethuan.com',
      '_system'
    );
  }

  shareOnTwitter() {
    window.open(
      'https://twitter.com/intent/tweet?text=https%3A%2F%2Fppn.gethuan.com',
      '_system'
    );
  }

  shareOnEmail() {
    window.location.href =
      'mailto:?subject=I wanted you to see this site&amp;body=Check out this site https://ppn.gethuan.com/.';
  }
}
