<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import type { ISourceOptions } from 'tsparticles-engine'

const props = defineProps<{
  active: boolean;
  color?: string;
}>()

const particlesId = computed(() => `particles-${Date.now()}`)

const options = computed<ISourceOptions>(() => ({
  particles: {
    number: {
      value: 40,
      density: {
        enable: true,
        value_area: 800
      }
    },
    color: {
      value: props.color || '#FFD700'
    },
    shape: {
      type: 'circle',
      stroke: {
        width: 0,
        color: '#000000'
      },
      polygon: {
        nb_sides: 5
      }
    },
    opacity: {
      value: 0.8,
      random: true,
      anim: {
        enable: true,
        speed: 1,
        opacity_min: 0.1,
        sync: false
      }
    },
    size: {
      value: 8,
      random: true,
      anim: {
        enable: true,
        speed: 2,
        size_min: 3,
        sync: false
      }
    },
    line_linked: {
      enable: false
    },
    move: {
      enable: true,
      speed: 4,
      direction: 'top',
      random: true,
      straight: false,
      out_mode: 'out',
      bounce: false,
      attract: {
        enable: false,
        rotateX: 600,
        rotateY: 1200
      }
    }
  },
  interactivity: {
    detect_on: 'window',
    events: {
      onhover: {
        enable: true,
        mode: 'repulse'
      },
      onclick: {
        enable: false
      },
      resize: true
    },
    modes: {
      repulse: {
        distance: 100,
        duration: 0.4
      }
    }
  },
  retina_detect: true,
  background: {
    color: "transparent",
    image: "",
    position: "50% 50%",
    repeat: "no-repeat",
    size: "cover"
  }
}))

// If particles need to be configured through methods, use the following:
const particlesContainer = ref<any>(null)

// Cleanup timer
let autoStopTimer: number | null = null

// Stop particles after delay
const autoStopDelay = 2500 // ms

onMounted(() => {
  if (props.active) {
    autoStopTimer = window.setTimeout(() => {
      // This will be used if we need to emit an event to parent to deactivate
    }, autoStopDelay)
  }
})

onUnmounted(() => {
  if (autoStopTimer) {
    clearTimeout(autoStopTimer)
  }
})
</script>

<template>
  <div class="particles-container" v-if="active">
    <Particles
      :id="particlesId"
      :options="options"
      ref="particlesContainer"
    />
  </div>
</template>

<style scoped>
.particles-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 100;
  pointer-events: none;
}
</style>