const WebSocket = require('ws');
const { connection } = require('./connection'); 
const { v4: uuidv4 } = require('uuid');

function createWebSocketServer(server) {
  const wss = new WebSocket.Server({ server });
  
  wss.on('connection', function connection(ws) {
    ws.on('message', function incoming(message) {
      try {
        const receivedMessage = JSON.parse(message);
        if(receivedMessage.type=="messageRead" || receivedMessage.type=="channelmessageRead"){
          const updatedMessages = receivedMessage.data.map(msg => ({ ...msg, isRead: true }));
          console.log(receivedMessage);
          wss.clients.forEach(function each(client) {
            if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({
                type: 'updated',
                senderId: receivedMessage.senderId,
                recieverId: receivedMessage.recieverId,
                channelId: receivedMessage.channelId, 
                data: receivedMessage.data,
              }));
            }
          });
        }
        else{
          const uniqueid=uuidv4();
          if(receivedMessage.origin!="channel"){
            const messageData = {
              uuid: uniqueid,
              recieverId: receivedMessage.recipientId,
              senderId: receivedMessage.senderId,
              datetime: new Date(),
              content: receivedMessage.content,
              voiceurl:receivedMessage.voiceurl,
              fileurl:receivedMessage.fileurl,
              filename: receivedMessage.filename,
              filesize: receivedMessage.filesize,
              isRead:false,
            };
  
            const sendMessage={
              ...receivedMessage,
              uuid:uniqueid,
            }
    
            wss.clients.forEach(function each(client) {
              if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(sendMessage));
              }
            });
    
            INSERTDATA(messageData);
          }
          else{
            const messageData = {
              uuid: uniqueid,
              senderId: receivedMessage.senderId,
              channelId: receivedMessage.channelId,
              datetime: new Date(),
              content: receivedMessage.content,
              voiceurl:receivedMessage.voiceurl,
              fileurl:receivedMessage.fileurl,
              filename: receivedMessage.filename,
              filesize: receivedMessage.filesize,
              isRead:false,
            };
  
            const sendMessage={
              ...receivedMessage,
              uuid:uniqueid,
              origin:'channel'
            }
    
            wss.clients.forEach(function each(client) {
              if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(sendMessage));
              }
            });
    
            INSERTTOCHANNEL(messageData);
          }
        }
      } catch (error) {
        console.error('Error handling WebSocket message:', error);
      }
    });

    ws.on('close', function () {
      console.log('Client disconnected');
    });
  });

  return wss;
}

function INSERTDATA(acknowledgmentMessage) {
  connection.query('INSERT INTO DirectMessages SET ?', acknowledgmentMessage, (err, res) => {
    if (err) {
      console.error('Error inserting data into chat:', err);
      return;
    }
    else{
      console.log('added');
    }
  });
}

function INSERTTOCHANNEL(acknowledgmentMessage) {
  connection.query('INSERT INTO channelMessages SET ?', acknowledgmentMessage, (err, res) => {
    if (err) {
      console.error('Error inserting data into chat:', err);
      return;
    }
    else{
      console.log('added');
    }
  });
}

module.exports = { createWebSocketServer };
