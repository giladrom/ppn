import { Component } from '@angular/core';
import { Map, tileLayer } from 'leaflet';
import { AngularFireAuth } from '@angular/fire/auth';
import { AngularFireFunctions } from '@angular/fire/functions';
import { SimpleCrypto } from 'simple-crypto-js';
import { ToastController } from '@ionic/angular';
import { ActivatedRoute, ActivatedRouteSnapshot } from '@angular/router';

import * as L from 'leaflet';
import 'leaflet.heat';

import 'firebase/firestore';
import * as moment from 'moment';

// declare var L: any;
declare var document: any;

export interface Message {
  latlng: string;
  location: string;
}

export interface Stats {
  pet_seen_away_from_home: string;
}

export interface Events {
  events: string;
}

export interface Tags {
  tags: string;
}

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage {
  map: Map;
  public loading = true;
  private interval;
  public embed = false;

  private timerCurrent = 1;
  public petsSeenAwayFromHome = 0;

  private heatMap: any;

  private eventArray = [];
  private eventIndex = 0;

  public loadingText = [
    'Herding cats',
    'Petting dogs',
    'Refilling water bowls',
    'Fetching sticks',
    'Licking faces',
  ];
  public loadingTextIndex = 0;
  public route: ActivatedRouteSnapshot;

  private k = null;

  constructor(
    private afFunc: AngularFireFunctions,
    private afAuth: AngularFireAuth,
    public toastController: ToastController,
    private activatedRoute: ActivatedRoute
  ) {
    this.route = activatedRoute.snapshot;

    console.log(
      'Hi there! Want to work for Huan and help save dogs and cats? email info@gethuan.com ;)'
    );

    // Convert string into boolean
    if (this.route.params.embed === 'true') {
      this.embed = true;
    }

    this.init();
  }

  init() {
    const loadingTextInterval = setInterval(() => {
      this.loadingTextIndex++;

      if (this.loadingTextIndex === this.loadingText.length - 1) {
        clearInterval(loadingTextInterval);
      }
    }, 1500);

    this.auth()
      .then((r) => {
        this.afFunc
          .httpsCallable('getK')({ data: 'data' })
          .subscribe(
            (K) => {
              this.k = K.message;

              this.updateNetworkStats();

              this.leafletMap();
            },
            (error) => {
              console.error(error);
            }
          );
      })
      .catch((e) => {
        console.error('Can not authenticate', e);
      });
  }

  async presentToast() {
    const toast = await this.toastController.create({
      header: 'How does Huan Work?',
      message:
        'The little blinking pets show cats and dogs being detected by our community in real time. ' +
        // tslint:disable-next-line:quotemark
        "\n\nDid your dog escape? Can't find your cat? A fellow Huan user can detect them nearby and alert you automatically!",
      showCloseButton: true,
      position: 'middle',
      duration: 60000,
    });
    toast.present();
  }

  animationListener(event) {
    document.getElementById('streaming-timestamp').innerText = this.getLastSeen(
      this.eventArray[this.eventIndex].timestamp
    );

    let eventName = '';
    switch (this.eventArray[this.eventIndex].event) {
      case 'new_pet':
        eventName = 'A New pet has joined';
        break;
      case 'new_pet_img':
        eventName = 'New Profile Photo';
        break;
      case 'pet_marked_as_lost':
        eventName = 'Marked as lost';
        break;
      case 'pet_marked_as_found':
        eventName = 'Marked as found';
        break;
      case 'pet_seen_away_from_home':
        eventName = 'Detected by the Pet Protection Network';
        break;
      default:
        eventName = '';
        break;
    }

    document.getElementById('streaming-event').innerText = eventName;

    if (this.eventArray[this.eventIndex].img) {
      document.getElementById('streaming-avatar').src = this.eventArray[
        this.eventIndex
      ].img;
    }

    document.getElementById('streaming-name').innerText = this.eventArray[
      this.eventIndex
    ].name;
    document.getElementById('streaming-location').innerText = this.eventArray[
      this.eventIndex
    ].community;

    if (this.eventIndex === this.eventArray.length - 1) {
      this.eventIndex = 0;
    } else {
      this.eventIndex++;
    }

    document.getElementById('streaming-item').style.display = 'inline';
  }

  updateNetworkStats() {
    this.afFunc
      .httpsCallable('getNetworkStats')({ data: 'data' })
      .subscribe((stats) => {
        const simpleCrypto = new SimpleCrypto(this.k);

        const d = simpleCrypto.decrypt(stats.message) as Stats;
        const dObj = JSON.parse(d.toString());

        this.petsSeenAwayFromHome = dObj.pet_seen_away_from_home;
      });

    if (!this.route.params.embed) {
      this.afFunc
        .httpsCallable('getLatestNetworkEvents')({ data: 'data' })
        .subscribe((stats) => {
          const simpleCrypto = new SimpleCrypto(this.k);

          const d = simpleCrypto.decrypt(stats.message) as Events;
          const dObj = JSON.parse(d.toString());

          this.eventArray = dObj.events;

          document
            .getElementById('streaming-box')
            .addEventListener(
              'animationiteration',
              this.animationListener.bind(this),
              false
            );
        });
    }

    setInterval(() => {
      this.afFunc
        .httpsCallable('getNetworkStats')({ data: 'data' })
        .subscribe((stats) => {
          const simpleCrypto = new SimpleCrypto(this.k);

          const d = simpleCrypto.decrypt(stats.message) as Stats;
          const dObj = JSON.parse(d.toString());

          this.petsSeenAwayFromHome = dObj.pet_seen_away_from_home;
        });
    }, 60000);
  }

  leafletMap() {
    // In setView add latLng and zoom
    this.map = new Map('mapId', {
      maxZoom: 12,
      minZoom: 4,
      zoomControl: this.route.params.embed ? false : false,
      // doubleClickZoom: false,
      // dragging: false,
      // boxZoom: false,
      // touchZoom: false,
      // scrollWheelZoom: false
    }).setView(
      [
        this.route.params.embed ? this.route.params.lat : 40.94,
        this.route.params.embed ? this.route.params.lng : -117.74,
      ],
      this.route.params.embed ? this.route.params.zoom : 5
    );

    tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
      {
        attribution: 'gethuan.com',
      }
    ).addTo(this.map);

    this.updatePetLocations();

    if (!this.route.params.embed) {
      const heatCoords = this.afFunc
        .httpsCallable('getHeatCoordinates')({ data: 'data' })
        .subscribe((coordinates) => {
          const simpleCrypto = new SimpleCrypto(this.k);

          const d = simpleCrypto.decrypt(coordinates.message) as Message;
          const dObj = JSON.parse(d.toString());
          const heat = L.heatLayer(dObj, {
            radius: 35,
            maxZoom: 10,
            minOpacity: 0.01,
          });

          heat.addTo(this.map);
          const layer: L.TileLayer = heat;
          heat.getPane().style.opacity = '0.6';

          setTimeout(() => {
            this.loading = false;

            // this.presentToast();
          }, 1000);
        });
    } else {
      const heatCoords = this.afFunc
        .httpsCallable('getLostPets')({ data: 'data' })
        .subscribe((tags) => {
          if (tags.message.length > 0) {
            const simpleCrypto = new SimpleCrypto(this.k);

            const d = simpleCrypto.decrypt(tags.message) as Tags;
            const dObj = JSON.parse(d.toString());

            const tagArray = dObj.tags;
            tagArray.forEach((tag) => {
              if (tag.location) {
                const location = tag.location.split(',');
                const circle = new L.CircleMarker([location[0], location[1]], {
                  radius: 20,
                  color: 'red',
                  weight: 1,
                  interactive: false,
                }).addTo(this.map);

                L.Icon.Default.prototype.options.imagePath = 'leaflet/';

                const marker = new L.Marker([location[0], location[1]]).addTo(
                  this.map
                );

                marker
                  .bindTooltip(
                    `${tag.name} was last seen here ` +
                      this.getLastSeen(tag.lastseen),
                    {
                      direction: 'top',
                    }
                  )
                  .openTooltip();
              }
            });
          }

          this.loading = false;
        });
    }

    this.interval = setInterval(() => {
      this.updatePetLocations();
    }, 10000);
  }

  updatePetLocations() {
    const sub = this.afFunc
      .httpsCallable('getLatestUpdateLocation')({ data: 'data' })
      .subscribe((location) => {
        sub.unsubscribe();

        const simpleCrypto = new SimpleCrypto(this.k);

        const d = simpleCrypto.decrypt(location.message) as Message;
        const dObj = JSON.parse(d.toString());

        // Adjust markers for map movement
        this.map.off('move zoom');
        this.map.on('move zoom', (ev) => {
          for (let i = 0; i < 30; i++) {
            const point = this.map.latLngToContainerPoint(dObj.latlng[i]);

            // document.getElementById('blink' + i).style.top =
            //   point.y - 15 + 'px';
            // document.getElementById('blink' + i).style.left =
            //   point.x - 15 + 'px';

            document.getElementById('blink' + i).style.transform =
              'translate(' +
              (point.x + 100 - 15) +
              'px, ' +
              (point.y + 100 - 15) +
              'px)';
          }
        });

        for (let i = 0; i < 30; i++) {
          const petIcon = document.getElementById('pet-icon' + i);
          const rando = this.randomIntFromInterval(1, 8);
          petIcon.src = `assets/imgs/active_user-${rando}.png`;

          setTimeout(() => {
            const point = this.map.latLngToContainerPoint(dObj.latlng[i]);

            const blink = document.getElementById('blink' + i);

            document.getElementById('blink' + i).style.transform =
              'translate(' +
              (point.x + 100 - 15) +
              'px, ' +
              (point.y + 100 - 15) +
              'px)';

            const time = this.randomIntFromInterval(500, 1500);
            blink.style.setProperty('--animation-time', time + 'ms');
          }, this.randomIntFromInterval(10, 2500));
        }
      });
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
      'https://twitter.com/intent/tweet?text=Check out https%3A%2F%2Fppn.gethuan.com!',
      '_system'
    );
  }

  shareOnEmail() {
    window.location.href =
      // tslint:disable-next-line:max-line-length
      'mailto:?subject=I want you to join the Pet Protection Network!&body=Hey! I wanted to share https%3A%2F%2Fppn.gethuan.com with you so we can both keep our pets safe.';
  }

  mathTrunc(val) {
    return val < 0 ? Math.ceil(val) : Math.floor(val);
  }

  auth(): Promise<any> {
    return this.afAuth.auth.signInAnonymously();
  }

  getLastSeen(lastseen) {
    return moment(lastseen).from();
  }
}
