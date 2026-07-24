import { createApp } from "vue";
import App from "./App.vue";
import 'element-plus/dist/index.css'
import "element-plus/theme-chalk/dark/css-vars.css";
import { createPinia } from "pinia";
import { router } from "./router";
import { init } from "./init";

const app = createApp(App);

app.use(createPinia());
app.use(router);

await init();

app.mount("#app");
