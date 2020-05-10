import Vue from 'vue'
import App from './components/App'

import vuetify from './plugins/vuetify'
require('dotenv').config()

new Vue({
  el: '#app',
  components: { App },
  template: '<app/>',
  vuetify
})
