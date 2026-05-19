<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { formatVersion, formatBuildTime } from '../../version';

const { t } = useI18n();

const currentYear = computed(() => new Date().getFullYear());
const versionInfo = computed(() => formatVersion());
const buildTime = computed(() => formatBuildTime());
</script>

<template>
  <footer class="footer">
    <div class="footer-container">
      <div class="footer-main">
        <p>&copy; {{ currentYear }} KidPoints. Made with ❤️ for happy kids!</p>
        <p v-if="versionInfo !== '开发版'" class="version-info">
          {{ t('footer.version') }}: {{ versionInfo }}
          <span v-if="buildTime" class="build-time">
            | {{ t('footer.buildTime') }}: {{ buildTime }}
          </span>
        </p>
      </div>
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

.footer-main p {
  margin-bottom: var(--space-sm);
}

.version-info {
  font-size: var(--font-size-sm);
  color: var(--gray-400);
}

.build-time {
  color: var(--gray-500);
}
</style>
