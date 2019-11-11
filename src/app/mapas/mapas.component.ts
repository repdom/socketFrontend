import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { Lugar } from '../interfaces/lugar';
import { HttpClient } from '@angular/common/http';
import { WebsocketService } from '../services/websocket.service';

@Component({
  selector: 'app-mapas',
  templateUrl: './mapas.component.html',
  styleUrls: ['./mapas.component.css']
})
export class MapasComponent implements OnInit {

  @ViewChild('map', { static: true}) mapElement: ElementRef;
  map: google.maps.Map;
  // lugares: Lugar[] = [
  //   {
  //     nombre: 'Udemy',
  //     lat: 37.784679,
  //     lng: -122.395936
  //   },
  //   {
  //     nombre: 'Bahía de San Francisco',
  //     lat: 37.798933,
  //     lng: -122.377732
  //   },
  //   {
  //     nombre: 'The Palace Hotel',
  //     lat: 37.788578,
  //     lng: -122.401745
  //   }
  // ];
  marcadores: google.maps.Marker[] = [];
  infoWindows: google.maps.InfoWindow[] = [];
  lugares: Lugar[] = [];

  constructor(private httpClient: HttpClient, public wsService: WebsocketService) { }

  ngOnInit() {

    this.httpClient.get('http://localhost:5000/marcadores').subscribe((lugares: Lugar[]) => {
      this.lugares = lugares;
      this.cargarMapa();
    });

    console.log('trabajadno');

    this.escucharSockets();
  }

  escucharSockets() {
    // marcador-nuevo
    this.wsService.listen('margador-nuevo')
      .subscribe((marcador: Lugar) => {
        this.agregarMarcador(marcador);
      });

    // marcador-mover
    this.wsService.listen('mover')
      .subscribe((marcador: Lugar) => {
        for (const i in this.marcadores) {
          if (this.marcadores[i].getTitle() === marcador.id) {
            const latLng = new google.maps.LatLng(marcador.lat, marcador.lng);
            this.marcadores[i].setPosition(latLng);
            break;
          }
        }
      });

    // marcador-borrar
    this.wsService.listen('marcador-borrar')
      .subscribe((id: string) => {
        for(const i in this.marcadores) {
          if (this.marcadores[i].getTitle() === id) {
            this.marcadores[i].setMap(null);
            break;
          }
        }
      });
  }

  cargarMapa() {
    const latLng = new google.maps.LatLng(37.784679, -122.395936);
    const mapaOpciones: google.maps.MapOptions = {
      center: latLng,
      zoom: 13,
      mapTypeId: google.maps.MapTypeId.ROADMAP
    };

    this.map = new google.maps.Map(this.mapElement.nativeElement, mapaOpciones);

    this.map.addListener('click', (coors) => {
      const nuevoMarcador: Lugar = {
        nombre: 'Nuevo Lugar',
        lat: coors.latLng.lat(),
        lng: coors.latLng.lng(),
        id: new Date().toISOString()
      };

      this.wsService.emit('margador-nuevo', nuevoMarcador);

      this.agregarMarcador(nuevoMarcador);
    });

    for (const lugar of this.lugares) {
      this.agregarMarcador(lugar);
    }
  }

  agregarMarcador(marcador: Lugar) {
    const latLng = new google.maps.LatLng(marcador.lat, marcador.lng);

    const marker = new google.maps.Marker({
      map: this.map,
      animation: google.maps.Animation.DROP,
      position: latLng,
      draggable: true,
      title: marcador.id
    });

    this.marcadores.push(marker);

    const contenido = `<b>${marcador.nombre}</b>`;

    const infoWindow = new google.maps.InfoWindow({
      content: contenido
    });

    this.infoWindows.push(infoWindow);



    google.maps.event.addDomListener(marker, 'click', () => {
      this.infoWindows.forEach(inforWn => inforWn.close());

      infoWindow.open(this.map, marker);
    });

    google.maps.event.addDomListener(marker, 'dblclick', (coors) => {
      marker.setMap(null);

      this.wsService.emit('marcador-borrar', marcador.id);
    });

    google.maps.event.addDomListener(marker, 'drag', (coors) => {
      // marker.setMap(null);

      const nuevoMarcador = {
        lat: coors.latLng.lat(),
        lng: coors.latLng.lng(),
        nombre: marcador.nombre,
        id: marcador.id
      };

      this.wsService.emit('mover', nuevoMarcador);

      console.log(nuevoMarcador);
    });
  }
}
