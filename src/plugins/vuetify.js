import Vue from 'vue'
import Vuetify from 'vuetify'
import 'vuetify/dist/vuetify.min.css'

import colors from 'vuetify/lib/util/colors'

Vue.use(Vuetify)

export default new Vuetify({
  theme: {
    themes: {
      light: {
        primary: colors.amber,
        primary_text: colors.amber.darken2,
        secondary: colors.amber.lighten4,
        accent: colors.indigo.base,
      },
    },
  },
})
