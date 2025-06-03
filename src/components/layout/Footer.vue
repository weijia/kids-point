<script setup lang="ts">
import { computed } from 'vue';

const currentYear = computed(() => new Date().getFullYear());
</script>

<template>
  <footer class="footer">
    <div class="footer-container">
      <p>&copy; {{ currentYear }} KidPoints Reward System. All rights reserved.</p>
      <p>Made with ❤️ for happy, motivated kids!</p>
    </div>
  </footer>
</template>

<style scoped>
.footer {
  background-color: var(--gray-800);
  color: var(--gray-300);
  padding: var(--space-lg) 0;
  margin-top: auto;
}

.footer-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 var(--space-md);
  text-align: center;
}

.footer p {
  margin-bottom: var(--space-sm);
}
</style>