<script setup lang="ts">
import Mp3Editor from './components/Mp3Editor.vue'
import { ehElectron, ehWeb } from '@renderer/lib/plataforma'
</script>

<template>
  <div class="min-h-screen bg-paper text-ink selection:bg-accent/15">
    <header class="border-b border-line bg-white/80 backdrop-blur-md">
      <div class="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8 md:py-10">
        <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
          <div class="min-w-0">
            <p class="text-xs font-medium uppercase tracking-wider text-accent">Editor local</p>
            <h1 class="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">MP3 Cortar</h1>
            <p class="mt-2 max-w-2xl text-sm leading-relaxed text-ink/70">
              <template v-if="ehElectron">
                Corte áudio no seu computador — sem enviar nada para a internet.
              </template>
              <template v-else>
                Corte áudio no navegador — o arquivo não sai do seu aparelho.
              </template>
            </p>
          </div>
          <div
            v-if="ehWeb"
            class="rounded-2xl border border-accent/25 bg-accent/5 px-4 py-3 text-xs leading-relaxed text-ink/75 sm:max-w-xs"
          >
            Versão web: exporta <strong>MP3</strong> e <strong>WAV</strong>. Outros formatos abrem se o navegador
            decodificar; para FLAC/OGG etc., use o app instalado no PC.
          </div>
          <div
            v-else
            class="hidden shrink-0 rounded-2xl border border-line bg-paper px-4 py-3 text-xs leading-relaxed text-ink/60 shadow-soft sm:block sm:max-w-xs"
          >
            Dica: use a onda para achar o ponto ou digite o tempo em min:seg nos campos.
          </div>
        </div>
        <p v-if="ehWeb" class="mt-3 text-xs leading-relaxed text-ink/55 sm:hidden">
          Toque em <strong>Escolher arquivo</strong>, ajuste o corte e use <strong>Salvar</strong> (download).
        </p>
        <p v-else class="mt-3 text-xs leading-relaxed text-ink/55 sm:hidden">
          Toque em <strong>Escolher arquivo</strong>, ajuste o corte e salve na pasta que quiser.
        </p>
      </div>
    </header>

    <main class="mx-auto max-w-5xl px-4 py-6 pb-8 sm:px-6 sm:py-10 sm:pb-12">
      <Mp3Editor />
    </main>
  </div>
</template>
