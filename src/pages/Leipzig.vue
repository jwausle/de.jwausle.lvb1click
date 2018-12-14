<template>
  <div class="simple">
    <div id="top_div" style="height: 100%">
      <v-map :zoom="zoom"
             :center="center"
             style="height: 1000px; width: 1000px">
        <v-tilelayer :url="url"
                     :attribution="attribution"/>
        <v-marker
          :ready="stops.loaded"
          v-for="stop in stops.data"
          :icon="busIcon"
          :lat-lng="[stop.lat, stop.lng]"
          :key="stop.id"
          v-on:click="requestNextStopScheduleAsPopup(stop, $event)">
          <v-tooltip :content="stop.name" />
          <v-popup content="Loading ..." v-on:close="closePopup($event)" :options="{maxHeight: 100}" />
        </v-marker>
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

const trim = function (string) {
  if (string) {
    return string.replace(/(\r\n|\n|\r|\t)/g, '')
  }
  return 'undefined'
}

/**
 * Convert csv to json.s
 * @param csv "0096323","Leipzig/Melissenweg","51.387608","12.354707"
 * @returns {"id":"0096323","name":"Leipzig/Melissenweg","lat":"51.387608","lng":"12.354707"}
 */
const csvToJson = function (csv) {
  let [firstLine, ...lines] = csv.split('\n')
  let columnNames = firstLine.split(',')
  return lines.filter(line => line !== '')
    .map(line => columnNames.reduce(
      (curr, next, index) => ({...curr, [next]: trimCsvValue(line.split(',')[index])}), {}
    ))
}

const BUS_ICON = L.icon({
  iconUrl: '../statics/images/bushaltestelle.svg',
  iconSize: [10, 10],
  iconAnchor: [5, 10],
  popupAnchor: [0, -12]
})

export default {
  name: 'simple',
  components: {
    'v-map': LMap,
    'v-tilelayer': LTileLayer,
    'v-marker': LMarker,
    'v-popup': LPopup,
    'v-tooltip': LTooltip
  },
  data () {
    return {
      zoom: 14,
      center: [51.3548499, 12.3712425],
      url: 'http://{s}.tile.osm.org/{z}/{x}/{y}.png',
      attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors',
      stops: {
        data: undefined, // load csv on mount
        loaded: false // represent loading state
      },
      busIcon: BUS_ICON
    }
  },
  mounted: function () {
    this.loadCsvStopsAsJson()
  },
  methods: {
    loadCsvStopsAsJson () {
      this.$axios.get('../statics/stops-all.csv')
        .then(response => response.data)
        .then(csv => csvToJson(csv))
        .then(json => {
          this.stops.data = json
          this.stops.loaded = true
        })
        .catch(error => console.log('Cannot download /statics/stops.csv because - ' + error))
    },
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
    requestNextStopScheduleAsPopup (stop, event) {
      let popup = event.target.getPopup()
      // Use herokuapp-proxy to prevent 'CORS error - No 'Access-Control-Allow-Origin' header is present' - https://stackoverflow.com/questions/43871637/no-access-control-allow-origin-header-is-present-on-the-requested-resource-whe
      this.$axios.get('https://cors-anywhere.herokuapp.com/https://app.myeasygo.de/oepnv/jsp/stationmonitor/start.jsp', {
        params: {
          width: '1',
          regID: '6',
          stationID: stop.id
        }
      }).then(response => response.data)
        .then(html => {
          return new this.$jsdom.JSDOM(html).window.document
        })
        .then(htmlDom => {
          return htmlDom.getElementsByClassName('stationmonitor_container')
        })
        .then(htmlStations => {
          let departures = [...Array(htmlStations.length)
          ].map((nil, i) => htmlStations.item(i)
          ).map(htmlStation => this.jsonDeparture(stop, htmlStation))
          popup.setContent('<pre>' + departures.map(departure => this.$sprintf('%-4s %+2s > %s', departure.time, departure.line, departure.target)).join('\n') + '</pre>')
          popup.update()
        })
        .catch(error => {
          popup.setContent('Error on fahrplan request because - ' + error.stack)
          popup.update()
        })
    },
    closePopup (event) {
      let popup = event.target.getPopup()
      popup.setContent('Reloading ...')
    }
  }
}
</script>

<style scoped>
  @import "../css/leaflet/dist/leaflet.css";
</style>
