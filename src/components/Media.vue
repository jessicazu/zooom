<template>
  <v-container>
    <v-row>
      <v-col cols="12" sm="6">
        <v-row align="center">
          <v-col cols="6 py-0">
            <v-text-field v-model="roomName" :disabled="isJoined" label="RoomName" color="primary_text"></v-text-field>
          </v-col>
          <v-col cols="6 py-0">
            <v-btn @click="join" :disabled="isJoined" small color="primary">Join</v-btn>
            <v-btn @click="leave" :disabled="!isJoined" small>Leave</v-btn>
          </v-col>
        </v-row>
        <v-select :items="connectionModes" v-model="connectionMode" :disabled="isJoined" label="ConnectionMode" class="mt-2" style="width: 150px;"></v-select>
      </v-col>

      <v-col cols="12" sm="6">
        <v-card id="messagesArea" class="px-8 py-4" style="height: 100px; overflow-y: scroll;">
          <div v-for="message in messages" class="body-2 pb-1">{{ message }}</div>
        </v-card>
        <v-row align="center" justify="end">
          <v-col cols="7 pa-0" xs="8">
            <v-text-field v-model="currentMessage" :disabled="!isJoined" @keypress.enter="sendMessage" label="Text" color="primary_text" class="mr-5" style="display: inline-block"></v-text-field>
            <v-btn @click="sendMessage" :disabled="!isJoined" small color="primary">Send</v-btn>
          </v-col>
        </v-row>
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12" md="6" lg="4">
        <video :srcObject.prop="localStream" :class="amISpeaking" autoplay muted playsinline></video>
      </v-col>
      <v-col v-for="remoteStream in remoteStreams" :key="remoteStream.id" cols="12" md="6" lg="4">
        <video :srcObject.prop="remoteStream.stream" :class="remoteStream.isSpeaking" autoplay playsinline></video>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
  import Peer from 'skyway-js';
  import Vad from 'voice-activity-detection'

  export default {
    name: "Media",
    data() {
      return {
        isJoined: false,
        amISpeaking: '',
        localStream: undefined,
        localVadObject: undefined,
        connectionModes: ['P2P', 'SFU'],
        connectionMode: 'P2P',
        peer: new Peer({ key: process.env.SKY_WAY_API_KEY, debug: 3 }),
        peerId: '',
        remoteStreams: [],
        room: undefined,
        roomName: '',
        messages: [],
        currentMessage: '',
      }
    },
    mounted() {
      navigator.mediaDevices.getUserMedia({ video: true, audio: { echoCancellation: true, noiseSuppression: true } })
        .then(stream => {
          this.localStream = stream
          this.localVadObject = this.startVoiceDetection(stream, isSpeaking => this.amISpeaking = isSpeaking)
        })
        .catch(error => console.error('mediaDevice.getUserMedia() error:', error)
      )

      this.peer.on('open', () => this.peerId = this.peer.id)
      this.peer.on('error', err => alert(`エラーが発生しました。：${err.message}`))
      this.peer.on('close', () => alert('通信が切断されました。'))
    },

    methods: {
      join() {
        if (this.localStream === undefined) return
        this.room = this.peer.joinRoom(this.roomName, { mode: this.connectionMode, stream: this.localStream })

        this.room.once('open', () => {
          this.messages.push(`ルーム"${this.room.name}"に参加しました。`)
          this.isJoined = true
        })
        this.room.on('peerJoin', peerId => this.messages.push(`${peerId}さんがルームに参加しました。`))
        this.room.on('stream', stream => {
          let remoteStreamHash = { stream: stream, id: stream.peerId, isSpeaking: '', vadObject: undefined }
          remoteStreamHash.vadObject = this.startVoiceDetection(stream, isSpeaking => remoteStreamHash.isSpeaking = isSpeaking)
          this.remoteStreams.push(remoteStreamHash)
        })
        this.room.on('data', ({ data, src }) => {
          this.messages.push(`${src}：${data}\n`)
          this.scrollMessagesArea()
        })
        this.room.on('peerLeave', peerId => {
          let remoteStream = this.remoteStreams.find(remoteStream => remoteStream.id == peerId)
          this.stopVoiceDetection(remoteStream.vadObject)
          this.remoteStreams = this.remoteStreams.filter(remoteStream => remoteStream.id != peerId)
          this.messages.push(`${peerId}さんが退出しました。`)
        })
        this.room.on('close', () => {
          this.messages.push(`ルーム"${this.room.name}"を退出しました。`)
          this.remoteStreams.forEach(remoteStream => this.stopVoiceDetection(remoteStream.vadObject))
          this.remoteStreams.length = 0 // TODO これでstreamデータが消えているのか検証する
          this.isJoined = false
        })
      },

      leave() {
        this.room.close()
      },

      sendMessage() {
        this.room.send(this.currentMessage)
        this.messages.push(`${this.peerId}：${this.currentMessage}`)
        this.currentMessage = ''
        this.scrollMessagesArea()
      },

      scrollMessagesArea() {
        let el = this.$el.querySelector("#messagesArea")
        el.scrollTop = el.scrollHeight
      },

      startVoiceDetection(stream, setIsSpeaking) {
        let audioContext = new AudioContext()
        let vadOptions = {
          bufferLen: 4096,
          minNoiseLevel: 0.65,
          maxNoiseLevel: 0.9,
          onVoiceStart: () => {
            setIsSpeaking('speaking')
          },
          onVoiceStop: () => {
            setIsSpeaking('')
          },
          onUpdate: (volume) => {
            // 音声が検出されると発火
          }
        };
        // streamオブジェクトの音声検出を開始
        return Vad(audioContext, stream, vadOptions)
      },

      stopVoiceDetection(vadObject){
        vadObject.destroy();
      },
    },
  }
</script>

<style scoped lang="sass">
  $primary-color: #FFC107
  @keyframes speaking
    0%
      box-shadow: 0 0 0 0 $primary-color
    100%
      box-shadow: 0 0 0 3px $primary-color


  video
    width: 100%
    transform: scaleX(-1)
    object-fit: cover
    border: solid 7px $primary-color
    border-radius: 10px
    /*&:before*/
    /*  content: ""*/
    /*  display: block*/
    /*  !*padding-top: 75%*!*/
    &.speaking
      animation-name: speaking
      animation-duration: 0.2s
      animation-iteration-count: infinite



</style>
