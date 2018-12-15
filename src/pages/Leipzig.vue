<template>
  <div class="simple">
    <div id="top_div" style="height: 100%">
      <v-map ref="map"
             :zoom="zoom"
             :center="center"
             :style="style">
        <v-tilelayer :url="url"
                     :attribution="attribution"/>
        <v-marker
          :ready="stops.loaded"
          v-for="stop in stops.data"
          :icon="busIcon"
          :lat-lng="[stop.lat, stop.lng]"
          :key="stop.id"
          v-on:click="requestNextDepartureAsPopup(stop, $event)"
          v-on:popupclose="closePopup($event)"
          >
          <v-tooltip :content="stop.name" />
          <v-popup content="Loading ..." :options="{maxHeight: 100, maxWidth: 150}" />
        </v-marker>
        <v-marker
          :ready="stops.loaded"
          :icon="centerIcon"
          :lat-lng="center"
        />
      </v-map>
    </div>
  </div>
</template>

<script>
import {L, LMap, LMarker, LTileLayer, LPopup, LTooltip} from 'vue2-leaflet'

/**
 * Trim csv "<text>" to <text>
 */
const trimCsvValue = function (string) {
  if (string === undefined) {
    return string
  }
  return string.substring(1, string.length - 1)
}

/**
 * Trim \r,\n,\t as ''
 */
const trim = function (string) {
  if (string) {
    return string.replace(/(\r\n|\n|\r|\t)/g, '')
  }
  return undefined
}

/**
 * Convert csv to json
 * @param csv is: "0096323","Leipzig/Melissenweg","51.387608","12.354707"
 * @returns json: {"id":"0096323","name":"Leipzig/Melissenweg","lat":"51.387608","lng":"12.354707"}
 */
const csvToJson = function (csv) {
  let [firstLine, ...lines] = csv.split('\n')
  let [...columnNames] = firstLine.split(',')
  return lines.filter(line => line !== '').map(
    (line) => columnNames.reduce(
      (curr, next, index) => ({...curr, [next]: trimCsvValue(line.split(',')[index])}), {}
    ))
}

// Constant icons (bus and center marker)
const iconFactor = 2
const BUS_ICON = L.icon({
  iconUrl: '../statics/images/haltestelle.png',
  iconSize: [10 * iconFactor, 10 * iconFactor],
  iconAnchor: [5 * iconFactor, 10 * iconFactor],
  popupAnchor: [0 * iconFactor, -12 * iconFactor]
})
const CENTER_ICON = L.icon({
  iconUrl: '../statics/images/kreuz.png',
  iconSize: [10 * iconFactor, 10 * iconFactor],
  iconAnchor: [5 * iconFactor, 10 * iconFactor],
  popupAnchor: [0 * iconFactor, -12 * iconFactor]
})

/**
 * Component script to init the map
 */
export default {
  name: 'simple',
  components: {
    'v-map': LMap,
    'v-tilelayer': LTileLayer,
    'v-marker': LMarker,
    'v-popup': LPopup,
    'v-tooltip': LTooltip
  },
  // data required for rendering
  data () {
    return {
      zoom: 15,
      center: [51.3548499, 12.3712425], // Gohliser Str. 12 / Springer Str.
      style: this.$q.platform.is.desktop ? 'height: 800px; width: 1400px' : 'height: 700px; width: 400px',
      url: 'http://{s}.tile.osm.org/{z}/{x}/{y}.png',
      attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors',
      stops: {
        data: undefined, // load csv on mount
        loaded: false // represent loading state
      },
      busIcon: BUS_ICON,
      centerIcon: CENTER_ICON
    }
  },
  // get geolocation and lvb-stops on mount
  mounted: function () {
    // chrome allow geolocation only for https - found here https://sites.google.com/a/chromium.org/dev/Home/chromium-security/deprecating-powerful-features-on-insecure-origins
    this.$getLocation()
      .then(coordinates => {
        this.center = [coordinates.lat, coordinates.lng]
        this.$ref.map.invalidateSize()
      })
    this.loadCsvStopsAsJson()
  },
  methods: {
    // Load all lvb-stops (coords+ids) csv to json.
    // - found here - https://opendata.leipzig.de/dataset/lvb-fahrplandaten
    loadCsvStopsAsJson () {
      this.$axios.get('../statics/leipzig-stops.csv')
        .then(response => response.data)
        .then(csv => csvToJson(csv))
        .then(json => {
          this.stops.data = json
          this.stops.loaded = true
        })
        .catch(error => console.log('Cannot download /statics/leipzig-stops.csv because - ' + error))
    },
    // request next departures of lvb-stop.id at 'app.myeasygo.de' and
    // - set popup content
    requestNextDepartureAsPopup (stop, event) {
      let popup = event.target.getPopup()
      // Use herokuapp-proxy to prevent 'CORS error - No 'Access-Control-Allow-Origin' header is present'
      // - found: https://stackoverflow.com/questions/43871637/no-access-control-allow-origin-header-is-present-on-the-requested-resource-whe
      this.$axios.get('https://cors-anywhere.herokuapp.com/https://app.myeasygo.de/oepnv/jsp/stationmonitor/start.jsp', {
        params: {
          width: '1',
          regID: '6',
          stationID: stop.id
        }
      }).then(response => response.data)
        .then(html => new this.$jsdom.JSDOM(html).window.document)
        .then(htmlDom => htmlDom.getElementsByClassName('stationmonitor_container'))
        .then(htmlDomStations => {
          let departures = [...Array(htmlDomStations.length)].map(
            (nil, i) => htmlDomStations.item(i)).map(
            (htmlStation) => this.jsonDeparture(stop, htmlStation))
          popup.setContent('<pre>' + departures.map(departure => this.$sprintf('%-4s %+2s > %s', departure.time, departure.line, departure.target)).join('\n') + '</pre>')
          popup.update()
        })
        .catch(error => {
          popup.setContent('Error on fahrplan request because - ' + error.stack)
          popup.update()
        })
    },
    // Extract easygo departure data from 'html' div.
    jsonDeparture (stop, html) {
      let line = html.querySelector('td[class="stationmonitor_top_line_number"]')
      let isTime = html.querySelector('b[class="istZeiten"]')
      let shouldTime = html.querySelector('b[class="sollZeiten"]')
      let target = html.querySelector('td[colspan="2"][align="left"]')
      return {
        id: stop.id,
        line: trim(line ? line.textContent : '?'),
        target: trim(target ? target.textContent : '*'),
        time: trim(shouldTime ? shouldTime.textContent : isTime ? isTime.textContent : 'hh:mm')
      }
    },
    // Cleanup popup for next requestNextDepartureAsPopup
    closePopup (popupEvent) {
      let popup = popupEvent.popup
      popup.setContent('Reloading ...')
    }
  }
}
</script>

<style scoped>
  @import "../css/leaflet/dist/leaflet.css";
</style>
