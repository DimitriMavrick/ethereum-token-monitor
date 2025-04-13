const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

// Create the Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Parse JSON requests
app.use(bodyParser.json());

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Notification endpoint
app.post('/api/notifications', (req, res) => {
  try {
    const notification = req.body;
    
    // Log to console
    console.log('\n📩 NOTIFICATION RECEIVED:');
    console.log(JSON.stringify(notification, null, 2));
    
    // Save to log file
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const logFile = path.join(logsDir, `notification-${timestamp}.json`);
    fs.writeFileSync(logFile, JSON.stringify(notification, null, 2));
    
    // Add to consolidated log
    const consolidatedLog = path.join(logsDir, 'all-notifications.json');
    let allNotifications = [];
    
    if (fs.existsSync(consolidatedLog)) {
      try {
        const content = fs.readFileSync(consolidatedLog, 'utf8');
        allNotifications = JSON.parse(content);
      } catch (e) {
        console.error('Error reading consolidated log:', e);
      }
    }
    
    allNotifications.push({
      receivedAt: new Date().toISOString(),
      ...notification
    });
    
    fs.writeFileSync(consolidatedLog, JSON.stringify(allNotifications, null, 2));
    
    // Send success response
    res.status(200).json({ success: true, message: 'Notification received' });
  } catch (error) {
    console.error('Error processing notification:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Basic endpoint to view notifications
app.get('/api/notifications', (req, res) => {
  try {
    const consolidatedLog = path.join(logsDir, 'all-notifications.json');
    
    if (fs.existsSync(consolidatedLog)) {
      const content = fs.readFileSync(consolidatedLog, 'utf8');
      const notifications = JSON.parse(content);
      res.status(200).json(notifications);
    } else {
      res.status(200).json([]);
    }
  } catch (error) {
    console.error('Error retrieving notifications:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Home page
app.get('/', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>Token Transfer Notification Server</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
          h1 { color: #333; }
          .container { max-width: 800px; margin: 0 auto; }
          pre { background: #f4f4f4; padding: 10px; border-radius: 5px; overflow: auto; }
          button { padding: 8px 16px; background: #4CAF50; color: white; border: none; 
                  cursor: pointer; border-radius: 4px; }
          button:hover { background: #45a049; }
          #notifications { margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Token Transfer Notification Server</h1>
          <p>This server is running and ready to receive notifications from your Ethereum token monitoring script.</p>
          <p><strong>Endpoint:</strong> http://localhost:${PORT}/api/notifications</p>
          
          <button onclick="fetchNotifications()">View Received Notifications</button>
          
          <div id="notifications"></div>
          
          <script>
            async function fetchNotifications() {
              const response = await fetch('/api/notifications');
              const data = await response.json();
              const container = document.getElementById('notifications');
              
              if (data.length === 0) {
                container.innerHTML = '<p>No notifications received yet.</p>';
                return;
              }
              
              container.innerHTML = '<h2>Received Notifications (' + data.length + ')</h2>' +
                '<pre>' + JSON.stringify(data, null, 2) + '</pre>';
            }
          </script>
        </div>
      </body>
    </html>
  `);
});

// Start the server
app.listen(PORT, () => {
  console.log(`Notification server running at http://localhost:${PORT}`);
  console.log(`Notification endpoint: http://localhost:${PORT}/api/notifications`);
});