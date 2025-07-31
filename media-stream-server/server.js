const WebSocket = require('ws');
const server = new WebSocket.Server({ port: 8080 });

server.on('connection', (ws) => {
  console.log('🔌 Twilio connected to media stream');

  ws.on('message', (message) => {
    try {
      const msg = JSON.parse(message);
      if (msg.event === 'start') {
        console.log('▶️ Streaming started:', msg.start.callSid);
      } else if (msg.event === 'media') {
        // This is where you'd pipe to Deepgram or another service
        console.log('🎙️ Media chunk received');
      } else if (msg.event === 'stop') {
        console.log('⏹️ Streaming stopped:', msg.stop.callSid);
      }
    } catch (err) {
      console.error('⚠️ Error handling message:', err);
    }
  });

  ws.on('close', () => {
    console.log('🔌 Twilio disconnected');
  });
});

console.log('🧠 Media Stream server listening on ws://localhost:8080');
