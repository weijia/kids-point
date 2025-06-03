<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  name: string;
  color: string;
  size?: 'sm' | 'md' | 'lg';
}>()

const avatarSize = computed(() => {
  switch (props.size) {
    case 'sm': return 'avatar-sm';
    case 'lg': return 'avatar-lg';
    default: return 'avatar-md';
  }
})

const initials = computed(() => {
  if (!props.name) return '';
  
  const nameParts = props.name.split(' ');
  if (nameParts.length > 1) {
    return `${nameParts[0].charAt(0)}${nameParts[1].charAt(0)}`.toUpperCase();
  }
  
  return props.name.charAt(0).toUpperCase();
})
</script>

<template>
  <div class="member-avatar" :class="[avatarSize]" :style="{ backgroundColor: color }">
    {{ initials }}
  </div>
</template>

<style scoped>
.member-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  font-weight: bold;
  color: var(--white);
  box-shadow: var(--shadow-sm);
}

.avatar-sm {
  width: 32px;
  height: 32px;
  font-size: var(--font-size-xs);
}

.avatar-md {
  width: 48px;
  height: 48px;
  font-size: var(--font-size-md);
}

.avatar-lg {
  width: 64px;
  height: 64px;
  font-size: var(--font-size-lg);
}
</style>