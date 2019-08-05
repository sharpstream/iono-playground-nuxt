<template>
  <div v-cloak>
    <b-container>
      <div class="column add-bottom">
        <div id="mainwrap">
          <div id="nowPlay">
            <span id="npAction" />
            <span id="npTitle" />
          </div>
          <div id="audiowrap">
            <div @click="progressBarClicked()">
              <b-progress id="progress-bar"
                          :value="position / duration"
                          :max="1" />
            </div>
            <span>{{ position | formatDuration }} / {{ duration | formatDuration }}</span>
            <br>
            Volume: <vue-slider v-model="volume" style="width: 300px;" @change="changeVolume()" />
            <br>
            <b-button @click="togglePlay()">
              {{ playButtonText }}
            </b-button>
            <b-button @click="toggleMute()">
              {{ muteButtonText }}
            </b-button>

            <div id="chapters">
              <h4>Chapters</h4>
              <ul id="chaptersList">
                <li v-for="(chapter, index) in chapters" :key="index"
                    :class="{active: chapterText === chapter.text}"
                    v-html="chapter.text" />
              </ul>
            </div>

            <div id="tracks">
              <b-button @click="previousPlaylistItem()">
                &larr; Previous
              </b-button>
              <b-button @click="nextPlaylistItem()">
                Next &rarr;
              </b-button>
            </div>
            <br>
          </div>

          <div id="plwrap">
            <ul id="plList">
              <li v-for="(p, index) in playlist" :key="index"
                  :class="{ plSel: currentPlaylistIndex === index }" @click="playlistItemSelect(index)">
                <div class="plItem">
                  <span class="plNum">{{ index + 1 }}</span>
                  <span class="plTitle">{{ p.metadata.title }}</span>
                  <span class="plLength">{{ p.metadata.duration | formatDuration }}</span>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>
      <button @click="logInfo()">
        Console Log Info
      </button>
      <h6 class="text-muted">
        Tracking events:
      </h6>
      <pre class="pre-scrollable"><code>{{ events }}</code></pre>
    </b-container>
  </div>
</template>

<script>

import Vue from 'vue'
// https://github.com/dolce/iziToast
import iziToast from 'izitoast'
import 'izitoast/dist/css/iziToast.min.css'
// https://github.com/NightCatSama/vue-slider-component
import VueSlider from 'vue-slider-component'
import 'vue-slider-component/theme/antd.css'
// https://github.com/taoeffect/vue-script2
import VS2 from 'vue-script2' // script to workaround player.min.js loading issue in Nuxt

Vue.use(VS2)

export default {
  layout: 'playground',
  components: {
    VueSlider,
  },
  filters: {
    formatDuration(value) {
      // GH: because we're loading the player as a deferred script,
      // the iono namespace is not available until the page is fully loaded
      if (window.iono) {
        return iono.Player.formatSeconds(value)
      } else {
        return '00:00'
      }
    },
  },
  data() {
    return {
      volume: 10,
      muteButtonText: 'Mute',
      playButtonText: 'Play',
      player: null,
      playing: false,
      playlist: [],
      duration: 0,
      progressBar: null,
      position: 0,
      events: '',
      currentPlaylistIndex: 0,
      bannerImage: null, // banners[0].url
      smallImage: null, // icons[0].url
      mediumImage: null, // icons[1].url,
      title: '',
      description: '',
      playbackRate: 1.0,
      language: 'en',
      preload: true,
      textTracksEnabled: true,
      qualityLevel: 'high',
      bufferedPercentage: 0,
      captionsText: '',
      chapterText: '',
      chapters: [],
    }
  },
  beforeMount() {
    this.getPlaylist()
  },
  mounted() {
    // MB: WORKAROUND TO LOAD THE SCRIPT BEFORE EXTERNALLY! I HAVE NO IDEA HOW IT WORKS!
    VS2.load('https://p2.iono.fm/bundle/0.0.57/player.js').then(() => {
      const player = new iono.Player({
        language: this.language,
        playbackRate: this.playbackRate,
        preload: this.preload,
        // repeat: 'playlist', // repeats playlist when end is reached
        textTracksEnabled: this.textTracksEnabled,
        volume: this.volume / 100,
        qualityLevel: this.qualityLevel,
        // 'analyticsLabel': '<url>',
        // 'analyticsCategory': 'Audio playback',
        // 'analyticsURL': 'https://example.com/submit'
      })
      this.player = player
      this.player.ready(() => {
        this.progressBar = document.getElementById('progress-bar')
        this.setupEvents() // setup iono player even listeners
        this.player.load(this.playlist) // load playlist
      })
    })
  },

  methods: {
    changeVolume() {
      this.player.setVolume(this.volume / 100)
    },
    setupEvents() {
      this.player.on('play', () => {
        this.playing = true
        this.playButtonText = 'Pause'

        this.smallImage = this.player.getPlaylistItem().metadata.icons[0].url
        this.mediumImage = this.player.getPlaylistItem().metadata.icons[1].url
        this.bannerImage = this.player.getPlaylistItem().metadata.banners[0].url
        this.title = this.player.getPlaylistItem().metadata.title
        this.description = this.player.getPlaylistItem().metadata.description

        iziToast.show({
          id: 'now-playing',
          title: this.title,
          message: this.description,
          displayMode: 'replace',
          close: false,
          position: 'topRight',
          pauseOnHover: false,
          image: this.smallImage,
        })
      })

      this.player.on('pause', () => {
        this.playing = false
        this.playButtonText = 'Play'
      })

      // update the volume ui when the playback volume is changed, muted or unmuted
      this.player.on('volumechange', () => {
        this.muteButtonText = this.player.getMute()
          ? 'Unmute'
          : 'Mute'
      })

      this.player.on('seeking', (e) => {
        console.log('seeking')
      })

      this.player.on('playlistselect', () => {
        // below how it should just work.
        this.duration = this.player.getDuration()
        this.currentPlaylistIndex = this.player.getPlaylistIndex()
      })

      this.player.on('durationchange', () => {
        this.duration = this.player.getDuration()
      })

      // update the position on the ui when the current playback position changes
      this.player.on('timeupdate', (event) => {
        this.position = this.player.getPosition()
        this.progressBar.value = this.position / this.duration
      })

      /** * LOGS ***/
      // listen for tracking events and log them to the console
      this.player.on('tracking', (event) => {
        console.log(event)
        // action tracking events
        if (event.details.event === 'action') {
          this.events += `TrackingEvent(action): ${event.details.action} (${event.details.uid})\n`
        }
        // position tracking events
        if (event.details.event === 'position') {
          this.events += `TrackingEvent(position): ${event.details.position} (${event.details.uid})\n`
        }
      })
      /** * END LOGS ***/

      this.player.on('texttrackschange', (event) => {
        console.log(event)

        // update the list of chapters
        this.chapters = this.player.getChapters()
      })

      this.player.on('textcuechange', (event) => {
        console.log(event)

        const chapter = this.player.getCurrentChapter()
        const captions = this.player.getCurrentCaptions()

        // GH: build current chapter text
        this.chapterText = (chapter && chapter.text) || ''

        // GH: build current captions text - it is possible to have multiple captions at the same time
        //  so we need to make sure we render them all. Here I just map over them to get an array
        //  of text strings, then join them together with new lines.
        this.captionsText = (captions || []).map((caption) => {
          return caption.text
        }).join('\n')

        // GH: build and show the captions text in a toast ui
        if (this.captionsText) {
          iziToast.info({
            icon: false,
            id: 'captions',
            title: this.chapterText,
            message: this.captionsText,
            displayMode: 'replace',
            close: false,
            position: 'bottomCenter',
            pauseOnHover: false,
            image: false,
          })
        }
      })

      this.player.on('progress', (event) => {
        this.bufferedPercentage = this.player.getBufferedPercentage()
        console.log(event)
      })
    },

    togglePlay() {
      this.player.togglePlay()
    },

    toggleMute() {
      this.player.toggleMute()
    },

    previousPlaylistItem() {
      // GH: Not sure the use-case for this, this would move to the previous playlist item then attempt to seek to the position
      // of the current playlist item: eg. click previous on playlist item 2 at position 10, moves to playlist item 1, then tries to seek to 10s
      // Also not that we are still in the process of deciding whether or not to allow seeking until the media element has loaded enough audio data,
      // which would mean you can't seek until the player reaches the 'playing' or 'paused' states.
      if (this.player.previousPlaylistItem()) {
        this.player.setPosition(this.progressBar.offsetX / this.progressBar.offsetWidth * this.duration)
      } else {
        iziToast.info({
          id: 'playlist',
          title: 'Beginning of Playlist',
          displayMode: 'replace',
          position: 'topRight',
        })
      }
    },

    nextPlaylistItem() {
      // GH: Same question as with `previousPlaylistItem`
      if (this.player.nextPlaylistItem()) {
        this.player.setPosition(this.progressBar.offsetX / this.progressBar.offsetWidth * this.duration)
      } else {
        iziToast.info({
          id: 'playlist',
          title: 'End of Playlist',
          displayMode: 'replace',
          position: 'topRight',
        })
      }
    },

    progressBarClicked() {
      this.player.setPosition(event.offsetX / this.progressBar.offsetWidth * this.duration)
    },

    async logInfo() {
      await console.info(this.player.getPlaylist())
      await console.info(this.player.getPlaylistIndex())
      await console.info(this.player.getPlaylistItem())
      await console.info(this.player.getTextTracks())
      await console.info(this.player.getChapters())
      await console.info(this.player.getCurrentChapter())
    },

    playlistItemSelect(index) {
      this.player.selectPlaylistItem(index)
    },

    async getPlaylist() {
      const { data } = await this.$axios.get('playground/playlist.json')
      this.playlist = data
      console.log(this.playlist)
    },

  },
}
</script>

<style lang='scss'>
  @import "~assets/styles/style.scss"
</style>
