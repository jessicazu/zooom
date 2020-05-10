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
        <video :srcObject.prop="localStream" autoplay muted playsinline></video>
      </v-col>
      <v-col v-for="remoteStream in remoteStreams" :key="remoteStream.id" cols="12" md="6" lg="4">
        <video :srcObject.prop="remoteStream.stream" autoplay playsinline></video>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
  import Peer from 'skyway-js';

  export default {
    name: "Media",
    data() {
      return {
        isJoined: false,
        localStream: undefined,
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
        .then(stream => this.localStream = stream)
        .catch(error => console.error('mediaDevice.getUserMedia() error:', error)
      )

      this.peer.on('open', () => this.peerId = this.peer.id)
      // this.peer.on('call', mediaConnecton => { // 着信イベント
      //   mediaConnecton.answer(this.localStream)
      //   mediaConnecton.on('stream', stream => this.remoteStream = stream) // 相手の映像を取得したイベント
      // })
      this.peer.on('error', err => alert(`エラーが発生しました。：${err.message}`))
      this.peer.on('close', () => alert('通信が切断されました。'))
    },

    methods: {
      // 1対1
      // makeCall() {
      //   const mediaConnection = this.peer.call(this.remoteID, this.remoteStream)
      //   mediaConnection.on('stream', stream => this.remoteStream = stream) // 相手の映像を取得したイベント
      // },

      join() {
        if (this.localStream === undefined) return
        this.room = this.peer.joinRoom(this.roomName, { mode: this.connectionMode, stream: this.localStream })

        this.room.once('open', () => {
          this.messages.push(`ルーム"${this.room.name}"に参加しました。`)
          this.isJoined = true
        })
        this.room.on('peerJoin', peerId => this.messages.push(`${peerId}さんがルームに参加しました。`))
        this.room.on('stream', stream => this.remoteStreams.push({ stream: stream, id: stream.peerId }))
        this.room.on('data', ({ data, src }) => {
          this.messages.push(`${src}：${data}\n`)
          this.scrollMessagesArea()
        })
        this.room.on('peerLeave', peerId => {
          this.remoteStreams = this.remoteStreams.filter(remoteStream => remoteStream.id != peerId)
          this.messages.push(`${peerId}さんが退出しました。`)
        })
        this.room.on('close', () => {
          this.messages.push(`ルーム"${this.room.name}"を退出しました。`)
          this.remoteStreams.length = 0
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
        console.log(el)
        el.scrollTop = el.scrollHeight
      }
    },
  }
</script>

<style scoped lang="sass">
  $primary-color: #FFC107
  video
    width: 100%
    transform: scaleX(-1)
    object-fit: cover
    border: solid 6px $primary-color
    border-radius: 10px
    /*&:before*/
    /*  content: ""*/
    /*  display: block*/
    /*  !*padding-top: 75%*!*/
</style>
