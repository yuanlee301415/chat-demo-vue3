import { createApp } from 'vue'

import App from './App.vue'
import AppIcon from './components/base/AppIcon.vue'

const app = createApp(App)

app.component('AppIcon', AppIcon)
app.mount('#app')
