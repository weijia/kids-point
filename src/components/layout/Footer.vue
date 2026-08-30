<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { formatVersion, formatBuildTime, formatVersionFull } from '../../version';

const { t } = useI18n();

const currentYear = computed(() => new Date().getFullYear());
const versionInfo = computed(() => formatVersion());
const buildTime = computed(() => formatBuildTime());
// 完整的「版本 + 构建时间」展示，避免用 v-if 隐藏导致用户看不到任何版本信息
const versionFull = computed(() => formatVersionFull());
</script>

<template>
  <footer class="footer">
    <div class="footer-container">
      <div class="footer-main">
        <p>&copy; {{ currentYear }} KidPoints. Made with ❤️ for happy kids!</p>
        <p class="version-info">
          <span v-if="versionInfo !== '开发版'">
            {{ t('footer.version') }}: {{ versionInfo }}
            <span v-if="buildTime" class="build-time">
              | {{ t('footer.buildTime') }}: {{ buildTime }}
            </span>
          </span>
          <span v-else class="build-time">
            {{ versionFull }}
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
