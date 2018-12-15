import VueGeolocation from 'vue-browser-geolocation'

export default ({ app, Vue }) => {
  // we tell Vue to use our Vue package:
  Vue.use(VueGeolocation)
}
