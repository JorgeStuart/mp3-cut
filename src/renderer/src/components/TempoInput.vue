<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'

import { MAX_DIGITOS_TEMPO, formatarDigitosComColons, parsearDigitosTempo } from '@renderer/lib/tempoFormat'

const props = defineProps<{
  modelValue: number
  id: string
  placeholder?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [number]
  invalido: []
}>()

const inputRef = ref<HTMLInputElement | null>(null)
const digitos = ref('')
const estaFocado = ref(false)

const textoExibido = computed(() => formatarDigitosComColons(digitos.value))

function posicionarCursorNoFim(): void {
  nextTick(() => {
    const el = inputRef.value
    if (!el) return
    const fim = el.value.length
    el.setSelectionRange(fim, fim)
  })
}

function aoFocar(): void {
  estaFocado.value = true
  digitos.value = ''
  posicionarCursorNoFim()
}

function aoDigitar(): void {
  const el = inputRef.value
  if (!el) return

  const candidato = el.value.replace(/\D/g, '').slice(0, MAX_DIGITOS_TEMPO)

  if (candidato.length >= 2 && Number(candidato.slice(-2)) >= 60) {
    el.value = textoExibido.value
    posicionarCursorNoFim()
    return
  }

  digitos.value = candidato
  nextTick(() => {
    if (!inputRef.value) return
    inputRef.value.value = textoExibido.value
    posicionarCursorNoFim()
  })
}

function aoSair(): void {
  estaFocado.value = false

  if (!digitos.value) {
    return
  }

  const seg = parsearDigitosTempo(digitos.value)
  if (seg === null) {
    emit('invalido')
    digitos.value = ''
    return
  }

  emit('update:modelValue', seg)
  digitos.value = ''
}
</script>

<template>
  <input
    :id="id"
    ref="inputRef"
    type="text"
    inputmode="numeric"
    autocomplete="off"
    class="input-tempo"
    :placeholder="placeholder ?? 'm:ss'"
    maxlength="6"
    @focus="aoFocar"
    @input="aoDigitar"
    @blur="aoSair"
  />
</template>
