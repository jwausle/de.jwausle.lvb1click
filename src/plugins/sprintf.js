const sprintf = require('sprintf-js').sprintf

export default ({ Vue }) => {
  Vue.prototype.$sprintf = sprintf
}
