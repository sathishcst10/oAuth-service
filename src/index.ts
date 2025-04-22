import express from 'express';
import session from 'express-session';
import dotenv from 'dotenv';
import { createClient } from 'redis';
import * as connectRedis from 'connect-redis';
import authRouter, { initializeMicrosoftClient } from './routes/auth';
import apiRouter from './routes/api';
import { requireAuth, setUserLocals, checkTokenValidity } from './middleware/auth';

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Redis client
const redisClient = createClient();
redisClient.connect().catch(console.error);

// Configure session middleware with Redis
const RedisStore = connectRedis.RedisStore;
app.use(
  session({
    store: new RedisStore({ client: redisClient, prefix: 'oauth:' }),
    secret: 'your_session_secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  })
);

// Middleware to parse JSON and URL-encoded data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Apply global middlewares
app.use(setUserLocals);
app.use(checkTokenValidity);

// Home route
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Microsoft SSO Example</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
          }
          .container {
            background-color: #f5f5f5;
            border-radius: 5px;
            padding: 20px;
            text-align: center;
          }
          .btn {
            background-color: #0078d4;
            color: white;
            padding: 10px 20px;
            text-decoration: none;
            border-radius: 4px;
            font-weight: bold;
            display: inline-block;
            margin-top: 20px;
          }
          h1 {
            color: #0078d4;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Microsoft SSO Authentication</h1>
          <p>Click below to authenticate with your Microsoft account</p>
          <a href="/auth/login" class="btn">Login with Microsoft</a>
          ${req.session?.isAuthenticated ? 
            '<p><a href="/profile">View your profile</a></p>' : ''}
        </div>
      </body>
    </html>
  `);
});

// Mount routers
app.use('/auth', authRouter);
app.use('/api', apiRouter);

// Protected profile route
app.get('/profile', requireAuth, (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Profile - Microsoft SSO Example</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
          }
          .container {
            background-color: #f5f5f5;
            border-radius: 5px;
            padding: 20px;
          }
          .profile-data {
            background-color: white;
            border: 1px solid #ddd;
            border-radius: 4px;
            padding: 15px;
            margin-top: 20px;
            overflow: auto;
          }
          .btn {
            background-color: #d40000;
            color: white;
            padding: 10px 20px;
            text-decoration: none;
            border-radius: 4px;
            font-weight: bold;
            display: inline-block;
            margin-top: 20px;
          }
          h1 {
            color: #0078d4;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Profile</h1>
          <p>Welcome ${req.session?.user?.name || req.session?.user?.preferred_username || 'User'}</p>
          <p>Email: ${req.session?.user?.email || 'Not provided'}</p>
          
          <div class="profile-data">
            <h3>User Information:</h3>
            <pre>${JSON.stringify(req.session?.user, null, 2)}</pre>
          </div>
          
          <a href="/auth/logout" class="btn">Logout</a>
          <p><a href="/">Back to home</a></p>
        </div>
      </body>
    </html>
  `);
});

// Dashboard route to demonstrate Microsoft Graph API integration
app.get('/dashboard', requireAuth, (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Dashboard - Microsoft SSO Example</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
          }
          .container {
            background-color: #f5f5f5;
            border-radius: 5px;
            padding: 20px;
          }
          .card {
            background-color: white;
            border: 1px solid #ddd;
            border-radius: 4px;
            padding: 15px;
            margin-top: 20px;
          }
          .btn {
            background-color: #0078d4;
            color: white;
            padding: 8px 15px;
            text-decoration: none;
            border-radius: 4px;
            font-weight: bold;
            display: inline-block;
            margin-top: 10px;
            border: none;
            cursor: pointer;
          }
          .profile-photo {
            max-width: 150px;
            border-radius: 50%;
            border: 3px solid #0078d4;
          }
          h1, h2 {
            color: #0078d4;
          }
          .navbar {
            display: flex;
            justify-content: space-between;
            margin-bottom: 20px;
          }
          #calendar-events {
            max-height: 300px;
            overflow-y: auto;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="navbar">
            <h1>Dashboard</h1>
            <div>
              <a href="/profile" class="btn" style="background-color: #555;">Profile</a>
              <a href="/auth/logout" class="btn" style="background-color: #d40000;">Logout</a>
            </div>
          </div>
          
          <div class="card">
            <h2>Microsoft Graph API Integration</h2>
            <p>This dashboard demonstrates fetching data from Microsoft Graph API.</p>
            
            <div id="profile-section">
              <h3>User Profile</h3>
              <div id="profile-data">Loading profile...</div>
              <div id="photo-container" style="text-align: center; margin-top: 20px;"></div>
            </div>
          </div>
          
          <div class="card">
            <h3>Calendar Events</h3>
            <div>
              <label>
                Start date: 
                <input type="datetime-local" id="startDateTime" value="${new Date().toISOString().slice(0, 16)}">
              </label>
              <label style="margin-left: 10px;">
                End date: 
                <input type="datetime-local" id="endDateTime" value="${new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16)}">
              </label>
              <button class="btn" onclick="fetchCalendarEvents()">Fetch Events</button>
            </div>
            <div id="calendar-events">Loading calendar events...</div>
          </div>
          
          <p><a href="/">Back to home</a></p>
        </div>
        
        <script>
          // Fetch user profile data
          async function fetchProfile() {
            try {
              const response = await fetch('/api/me');
              if (!response.ok) throw new Error('Failed to fetch profile');
              
              const data = await response.json();
              document.getElementById('profile-data').innerHTML = \`
                <p><strong>Display Name:</strong> \${data.displayName || 'N/A'}</p>
                <p><strong>Email:</strong> \${data.mail || data.userPrincipalName || 'N/A'}</p>
                <p><strong>Job Title:</strong> \${data.jobTitle || 'N/A'}</p>
                <p><strong>Department:</strong> \${data.department || 'N/A'}</p>
                <p><strong>Office Location:</strong> \${data.officeLocation || 'N/A'}</p>
              \`;
              
              fetchPhoto();
            } catch (error) {
              document.getElementById('profile-data').innerHTML = 
                '<p class="error">Error fetching profile: ' + error.message + '</p>';
            }
          }
          
          // Fetch user photo
          async function fetchPhoto() {
            try {
              const response = await fetch('/api/me/photo');
              if (!response.ok) throw new Error('Photo not available');
              
              const data = await response.json();
              document.getElementById('photo-container').innerHTML = \`
                <img src="\${data.photo}" alt="Profile" class="profile-photo">
              \`;
            } catch (error) {
              document.getElementById('photo-container').innerHTML = 
                '<p>No profile photo available</p>';
            }
          }
          
          // Fetch calendar events
          async function fetchCalendarEvents() {
            const startDateTime = document.getElementById('startDateTime').value;
            const endDateTime = document.getElementById('endDateTime').value;
            
            if (!startDateTime || !endDateTime) {
              alert('Please select start and end dates');
              return;
            }
            
            document.getElementById('calendar-events').innerHTML = 'Loading events...';
            
            try {
              const response = await fetch(\`/api/me/calendar?startDateTime=\${startDateTime}&endDateTime=\${endDateTime}\`);
              if (!response.ok) throw new Error('Failed to fetch calendar events');
              
              const data = await response.json();
              if (data.events && data.events.length > 0) {
                let eventsHtml = '<ul>';
                data.events.forEach(event => {
                  const start = new Date(event.start.dateTime).toLocaleString();
                  const end = new Date(event.end.dateTime).toLocaleString();
                  eventsHtml += \`
                    <li>
                      <strong>\${event.subject}</strong><br>
                      Time: \${start} - \${end}<br>
                      Location: \${event.location?.displayName || 'No location'}<br>
                      \${event.bodyPreview ? '<details><summary>Details</summary>' + event.bodyPreview + '</details>' : ''}
                    </li>
                  \`;
                });
                eventsHtml += '</ul>';
                document.getElementById('calendar-events').innerHTML = eventsHtml;
              } else {
                document.getElementById('calendar-events').innerHTML = 
                  '<p>No events found in the selected date range.</p>';
              }
            } catch (error) {
              document.getElementById('calendar-events').innerHTML = 
                '<p class="error">Error fetching calendar events: ' + error.message + '</p>';
            }
          }
          
          // Initialize dashboard
          document.addEventListener('DOMContentLoaded', () => {
            fetchProfile();
            fetchCalendarEvents();
          });
        </script>
      </body>
    </html>
  `);
});

// Start server
async function startServer() {
  try {
    // Initialize Microsoft client
    await initializeMicrosoftClient();
    
    // Start listening for requests
    app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
      console.log(`- Visit http://localhost:${PORT} for the home page`);
      console.log(`- MS OAuth callback URL: http://localhost:${PORT}/auth/callback`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer().catch(console.error);