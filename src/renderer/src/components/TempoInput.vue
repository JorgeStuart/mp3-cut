<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from 'vue'

import {
  MAX_DIGITOS_TEMPO,
  formatarTempo,
  parsearDigitosTempo,
  segundosParaDigitos
} from '@renderer/lib/tempoFormat'

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

function atualizarCampoFormatado(): void {
  const el = inputRef.value
  if (!el || estaFocado.value) return
  el.value = props.modelValue > 0 ? formatarTempo(props.modelValue) : ''
}

watch(
  () => props.modelValue,
  () => {
    atualizarCampoFormatado()
  }
)

function emitirSeValido(): void {
  if (!digitos.value) return
  const seg = parsearDigitosTempo(digitos.value)
  if (seg !== null) {
    emit('update:modelValue', seg)
  }
}

/** Usado antes de salvar — aplica o que ainda está sendo digitado. */
function aplicarDigitosPendentes(): boolean {
  if (!estaFocado.value) return true

  if (!digitos.value) {
    estaFocado.value = false
    atualizarCampoFormatado()
    return true
  }

  const seg = parsearDigitosTempo(digitos.value)
  if (seg === null) {
    emit('invalido')
    digitos.value = ''
    estaFocado.value = false
    atualizarCampoFormatado()
    return false
  }

  emit('update:modelValue', seg)
  estaFocado.value = false
  nextTick(() => atualizarCampoFormatado())
  return true
}

defineExpose({ aplicarDigitosPendentes })

function aoFocar(): void {
  estaFocado.value = true
  digitos.value = props.modelValue > 0 ? segundosParaDigitos(props.modelValue) : ''
  nextTick(() => {
    const el = inputRef.value
    if (!el) return
    el.value = digitos.value
    const fim = el.value.length
    el.setSelectionRange(fim, fim)
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
  emitirSeValido()

  const pos = Math.min(cursor, candidato.length)
  nextTick(() => el.setSelectionRange(pos, pos))
}

function aoSair(): void {
  estaFocado.value = false

  if (!digitos.value) {
    atualizarCampoFormatado()
    return
  }

  const seg = parsearDigitosTempo(digitos.value)
  if (seg === null) {
    emit('invalido')
    digitos.value = ''
    atualizarCampoFormatado()
    return
  }

  emit('update:modelValue', seg)
  nextTick(() => atualizarCampoFormatado())
}

onMounted(() => atualizarCampoFormatado())
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
    maxlength="7"
    @focus="aoFocar"
    @input="aoDigitar"
    @blur="aoSair"
  />
</template>
