import { createApp } from 'vue'

import './app/app.css'
import App from './app/App.vue'
import AppIcon from './components/base/AppIcon.vue'

const app = createApp(App)

app.component('AppIcon', AppIcon)
app.mount('#app')
