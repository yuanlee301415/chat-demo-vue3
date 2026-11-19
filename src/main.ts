import { createApp } from 'vue'

import './app/app.css'
import App from './app/App.vue'
import AppIcon from './components/base/AppIcon.vue'
import { pinia } from './stores/pinia'

const app = createApp(App)

app.use(pinia)
app.component('AppIcon', AppIcon)
app.mount('#app')
