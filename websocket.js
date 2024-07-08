const WebSocket = require('ws');
const { connection } = require('./connection'); // Assuming this is your database connection module
const fs = require('fs');
const path = require('path');
const { transporter } = require('./nodemailer'); // Assuming this is your nodemailer setup

// Function to create WebSocket server on specified server instance
function createWebSocketServer(server) {
  const wss = new WebSocket.Server({ server });

  // WebSocket connection handler
  wss.on('connection', function connection(ws) {
    console.log('Client connected');

    // Event handler for incoming messages
    ws.on('message', function incoming(message) {
      try {
        const receivedMessage = JSON.parse(message);
        let file = '';

        // Construct acknowledgment message to send back to clients
        console.log(receivedMessage)
        const acknowledgmentMessage = {
          messageId: receivedMessage.id,
          text: receivedMessage.text,
          userId: receivedMessage.userId,
          viewersId: receivedMessage.viewersId || null,
          seekersId: receivedMessage.seekersId || null,
          chatId: receivedMessage.chatId,
          userImage: receivedMessage.userImage,
          recieverName: receivedMessage.recieverName,
          file: receivedMessage.file ? receivedMessage.file.url : '',
          status: 'received',
        };

        // Send acknowledgment message to all connected clients
        wss.clients.forEach(function each(client) {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(acknowledgmentMessage));
          }
        });

        // Log acknowledgment message
        console.log(acknowledgmentMessage);

        // Insert received message data into database
        INSERTDATA(acknowledgmentMessage, receivedMessage.recieverName);
      } catch (error) {
        console.error('Error handling WebSocket message:', error);
      }
    });

    // Event handler for WebSocket connection close
    ws.on('close', function () {
      console.log('Client disconnected');
    });
  });

  return wss;
}

// Function to insert acknowledgment message data into the database
function INSERTDATA(acknowledgmentMessage, recieverName) {
  connection.query('INSERT INTO chat SET ?', acknowledgmentMessage, (err, res) => {
    if (err) {
      console.error('Error inserting data into chat:', err);
      return;
    }
    console.log('Data inserted successfully:', res);

    // Fetch seeker details from the database
    connection.query('SELECT firstName, lastName, email FROM seekers WHERE seekersId = ?', [acknowledgmentMessage.seekersId], (err, seekerResult) => {
      if (err) {
        console.error('Error fetching seeker details:', err);
        return;
      }

      // Fetch viewer details from the database
      connection.query('SELECT firstname, lastname, email AS email1 FROM viewers WHERE viewersId = ?', [acknowledgmentMessage.viewersId], (err, viewerResult) => {
        if (err) {
          console.error('Error fetching viewer details:', err);
          return;
        }

        // Extract necessary information from the database results
        const seeker = seekerResult[0];
        const viewer = viewerResult[0];
        if (!seeker || !viewer) {
          console.log(`No ${recieverName.toLowerCase()} found with the given ID`);
          return;
        }

        // Determine recipient email based on message recipient (seeker or viewer)
        const { email: seekerEmail, firstName: seekerFirstName, lastName: seekerLastName } = seeker;
        const { email: viewerEmail, firstname: viewerFirstName, lastname: viewerLastName } = viewer;
        const recipientEmail = acknowledgmentMessage.recieverName === "Seeker" ? viewerEmail : seekerEmail;

        // Send notification email
        sendNotificationEmail(seekerEmail, seekerFirstName, seekerLastName, viewerEmail, viewerFirstName, viewerLastName, acknowledgmentMessage);
      });
    });
  });
}

// Function to send notification email
function sendNotificationEmail(seekerEmail, seekerFirstName, seekerLastName, viewerEmail, viewerFirstName, viewerLastName, acknowledgmentMessage) {
  // Determine email recipient and construct email content based on recipient type (seeker or viewer)
  const recipientEmail = acknowledgmentMessage.recieverName === "Seeker" ? viewerEmail : seekerEmail;
  const recipientFirstName = acknowledgmentMessage.recieverName === "Seeker" ? viewerFirstName : seekerFirstName;
  const recipientLastName = acknowledgmentMessage.recieverName === "Seeker" ? viewerLastName : seekerLastName;

  const emailContent = acknowledgmentMessage.recieverName === "Seeker" ?
    `
    <p>Dear ${recipientFirstName} ${recipientLastName},</p>
  
    <p>You have received a new message in your chat.</p>
  
    <p>Message Details:<br/>
    ----------------------<br/>
    Sender: ${seekerFirstName} ${seekerLastName}<br/>
    Message: ${acknowledgmentMessage.text}<br/>
    Date: ${new Date().toLocaleString()}</p>
  
    <p>Please log in to your chat application to view and respond to this message.</p>
  
    <p>Best regards,<br/>
    Asare Viewing Team</p>
    ` :
    `
    <p>Dear ${recipientFirstName} ${recipientLastName},</p>
  
    <p>You have received a new message in your chat.</p>
  
    <p>Message Details:<br/>
    ----------------------<br/>
    Sender: ${viewerFirstName} ${viewerLastName}<br/>
    Message: ${acknowledgmentMessage.text}<br/>
    Date: ${new Date().toLocaleString()}</p>
  
    <p>Kindly log in to your portal to view and respond to this message.</p>
  
    <div style="text-align: center; margin-top: 20px;">
    <a href="https://asareviewing.com/seeker-login" style="display: inline-block; padding: 10px 20px; color: white; background-color: #FF4E00; text-decoration: none; border-radius: 5px;">Login to Your Portal</a>
    </div>
  
    <p>Best regards,<br/>
    Asare Viewing Team</p>
  
    <div style="margin-top: 20px;">
      <a href="https://www.linkedin.com/company/asareviewing/" target="_blank">
        <img src="cid:linkedin" alt="LinkedIn" style="width: 20px; height: 20px; margin-right: 5px; filter: grayscale(100%);"/>
      </a>
      <a href="https://www.facebook.com/share/u3nZBChMaaqgE38Z/?mibextid=LQQJ4d" target="_blank">
        <img src="cid:facebook" alt="Facebook" style="width: 20px; height: 20px; margin-right: 5px;" />
      </a>
      <a href="https://www.instagram.com/asareviewing?igsh=MWo3dmpnamR1dmF3Nw%3D%3D&utm_source=qr" target="_blank">
        <img src="cid:instagram" alt="Instagram" style="width: 20px; height: 20px; margin-right: 5px; filter: grayscale(100%);"/>
      </a>
      <a href="https://www.x.com/asareviewing" target="_blank">
        <img src="cid:twitter" alt="Twitter" style="width: 20px; height: 20px; margin-right: 5px; filter: grayscale(100%); background-color: gray;"/>
      </a>
      <a href="https://youtube.com/@asareviewing?si=z2xVchTtyU_Hghoz" target="_blank">
        <img src="cid:youtube" alt="YouTube" style="width: 20px; height: 20px; margin-right: 5px; filter: grayscale(100%);"/>
      </a>
    </div>
  
    <p style="margin-top: 20px;">
      This email was intended for ${recipientFirstName} ${recipientLastName} because you signed up for Asare Viewing | The links in this email will
      always direct to <a href="https://asareviewing.com">https://asareviewing.com</a> | Address: 1 Business Village, Emily Street, Hull, HU9 1ND., United Kingdom.
    </p>
  
    <div style="text-align: center;">
      <p>
        Asare Viewing Ltd. 2024
      </p>
  
      <img src="cid:sendingIcon" alt="http://localhost:5002/sendingIcon.png" style="margin-top: 20px;"/>
    </div>
    `;

  // Configure email options with attachments and send using nodemailer transporter
  const mailOptions = {
    to: recipientEmail,
    subject: '1 new message for you',
    html: emailContent,
    attachments: [
      {
        filename: 'sendingIcon.png',
        path: path.join(__dirname, '../', 'public/sendingIcon.png'),
        cid: 'sendingIcon'
      },
      {
        filename: 'facebook.png',
        path: path.join(__dirname, '../', 'public/facebook.png'),
        cid: 'facebook'
      },
      {
        filename: 'youtube.png',
        path: path.join(__dirname, '../', 'public/youtube.png'),
        cid: 'youtube'
      },
      {
        filename: 'instagram.png',
        path: path.join(__dirname, '../', 'public/instagram.png'),
        cid: 'instagram'
      },
      {
        filename: 'twitter.png',
        path: path.join(__dirname, '../', 'public/twitter.png'),
        cid: 'twitter'
      },
      {
        filename: 'linkedin.png',
        path: path.join(__dirname, '../', 'public/linkedin.png'),
        cid: 'linkedin'
      }
    ]
  };

  // Send the email
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error('Error sending email:', error);
    } else {
      console.log('Email sent:', info.response);
    }
  });
}

module.exports = { createWebSocketServer };
