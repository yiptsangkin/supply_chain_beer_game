import { createRouter, createWebHistory } from 'vue-router';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('../pages/HomePage.vue'),
    },
    {
      path: '/create',
      name: 'create',
      component: () => import('../pages/CreateGamePage.vue'),
    },
    {
      path: '/join/:code?',
      name: 'join',
      component: () => import('../pages/JoinGamePage.vue'),
    },
    {
      path: '/lobby/:gameId',
      name: 'lobby',
      component: () => import('../pages/LobbyPage.vue'),
    },
    {
      path: '/game/:gameId',
      name: 'game',
      component: () => import('../pages/GamePage.vue'),
    },
    {
      path: '/result/:gameId',
      name: 'result',
      component: () => import('../pages/ResultPage.vue'),
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: () => import('../pages/DashboardPage.vue'),
    },
  ],
});

export default router;