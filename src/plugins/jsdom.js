const jsdom = require('jsdom')

export default ({ Vue }) => {
  Vue.prototype.$jsdom = jsdom
}
