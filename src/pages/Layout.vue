<template>
  <q-layout view="lHh Lpr LFF">
    <q-layout-header>
      <q-toolbar
        color="primary"
        :glossy="$q.theme === 'mat'"
        :inverted="$q.theme === 'ios'"
      >
        <q-btn
          flat
          dense
          round
          @click="leftDrawerOpen = !leftDrawerOpen"
          aria-label="Menu"
        >
          <q-icon name="menu" />
        </q-btn>

        <q-toolbar-title>
          Leipzig Haltestellen
          <div slot="subtitle">Running on Quasar v{{ $q.version }}</div>
        </q-toolbar-title>
      </q-toolbar>
    </q-layout-header>

    <q-layout-drawer
      v-model="leftDrawerOpen"
      :content-class="$q.theme === 'mat' ? 'bg-grey-2' : null"
    >
      <q-list
        no-border
        link
        inset-delimiter
      >
        <q-list-header>More</q-list-header>
        <q-item @click.native="openURL('https://github.com/jwausle/de.jwausle.lvb1click')">
          <q-item-side icon="code" />
          <q-item-main label="GitHub" sublabel="https://github.com/jwausle" />
        </q-item>
        <q-item @click.native="openURL('https://twitter.com/jwausle')">
          <q-item-side icon="rss feed" />
          <q-item-main label="Twitter" sublabel="@jwausle #lvb1click" />
        </q-item>
      </q-list>
    </q-layout-drawer>

    <q-page-container>
      <router-view />
    </q-page-container>
    <q-layout-footer>
      ©2018 Jan Winter(support <a href="https://twitter.com/jwausle">jwausle@twitter</a>)
    </q-layout-footer>
  </q-layout>
</template>

<script>
import { openURL } from 'quasar'

export default {
  name: 'MyLayout',
  data () {
    return {
      leftDrawerOpen: false
    }
  },
  methods: {
    openURL
  }
}
</script>

<style>
</style>
