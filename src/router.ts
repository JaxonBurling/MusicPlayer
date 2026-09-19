import { createRouter, createWebHistory } from 'vue-router'

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/', name: 'frame', component: () => import('./Frame.vue'),
      children: [
        {
          path: "",
          name: "home",
          component: () => import('./views/Main.vue'),
        },
        { path: '/search', name: 'search', component: () => import('./views/Search.vue') },
        { path: '/login', name: 'login', component: () => import('./views/Login.vue') },
        { path: '/user', name: 'user', component: () => import('./views/User.vue') },
      ]
    },

    { path: '/traymenu', name: 'traymenu', component: () => import('./views/TrayMenu.vue') },
  ],
})
