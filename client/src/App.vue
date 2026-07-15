<template>
  <div class="app">
    <AppHeader />
    <main class="page">
      <div class="container">
        <router-view />
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import AppHeader from './components/layout/AppHeader.vue';
</script>