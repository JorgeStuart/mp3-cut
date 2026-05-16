<script setup lang="ts">
import { ref, watch } from 'vue'

import {
  formatarDigitosComColons,
  parsearDigitosTempo,
  podeAceitarDigitos,
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

const digitos = ref('')
const textoExibido = ref('')

function sincronizarDeSegundos(seg: number): void {
  digitos.value = segundosParaDigitos(seg)
  textoExibido.value = formatarDigitosComColons(digitos.value)
}

watch(
  () => props.modelValue,
  (seg) => {
    sincronizarDeSegundos(seg)
  },
  { immediate: true }
)

function aoDigitar(evento: Event): void {
  const campo = evento.target as HTMLInputElement
  const candidato = campo.value.replace(/\D/g, '')

  if (!podeAceitarDigitos(candidato)) {
    campo.value = textoExibido.value
    return
  }

  digitos.value = candidato
  textoExibido.value = formatarDigitosComColons(candidato)
  campo.value = textoExibido.value
}

function aoSair(): void {
  if (!digitos.value) {
    sincronizarDeSegundos(props.modelValue)
    return
  }

  const seg = parsearDigitosTempo(digitos.value)
  if (seg === null) {
    emit('invalido')
    sincronizarDeSegundos(props.modelValue)
    return
  }

  emit('update:modelValue', seg)
  sincronizarDeSegundos(seg)
}
</script>

<template>
  <input
    :id="id"
    type="text"
    inputmode="numeric"
    autocomplete="off"
    class="input-tempo"
    :value="textoExibido"
    :placeholder="placeholder ?? '0:00'"
    maxlength="8"
    @input="aoDigitar"
    @blur="aoSair"
  />
</template>
