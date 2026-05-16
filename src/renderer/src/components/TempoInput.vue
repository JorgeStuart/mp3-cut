<script setup lang="ts">
import { nextTick, ref } from 'vue'

import { MAX_DIGITOS_TEMPO, parsearDigitosTempo } from '@renderer/lib/tempoFormat'

defineProps<{
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

function aoFocar(): void {
  digitos.value = ''
  nextTick(() => {
    const el = inputRef.value
    if (el) el.value = ''
  })
}

function aoDigitar(): void {
  const el = inputRef.value
  if (!el) return

  const cursor = el.selectionStart ?? el.value.length
  const candidato = el.value.replace(/\D/g, '').slice(0, MAX_DIGITOS_TEMPO)

  if (candidato.length >= 2 && Number(candidato.slice(-2)) >= 60) {
    el.value = digitos.value
    const pos = Math.min(cursor, digitos.value.length)
    nextTick(() => el.setSelectionRange(pos, pos))
    return
  }

  digitos.value = candidato
  el.value = candidato

  const pos = Math.min(cursor, candidato.length)
  nextTick(() => el.setSelectionRange(pos, pos))
}

function aoSair(): void {
  if (!digitos.value) {
    return
  }

  const seg = parsearDigitosTempo(digitos.value)
  if (seg === null) {
    emit('invalido')
    digitos.value = ''
    if (inputRef.value) inputRef.value.value = ''
    return
  }

  emit('update:modelValue', seg)
  digitos.value = ''
  if (inputRef.value) inputRef.value.value = ''
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
    :placeholder="placeholder ?? 'ex. 130 = 1:30'"
    maxlength="4"
    @focus="aoFocar"
    @input="aoDigitar"
    @blur="aoSair"
  />
</template>
