# PWA-with-Google-Auth
Finals Laboratory Examination for ITP110 Web Technologies

### Steps on how to install 

cd backend
npm install
npm i express mongoose bcrypt jsonwebtoken cookie-parser cors passport passport-google-oauth20 dotenv socket.io
npm i -D nodemon

# Create and update .env with your credentials:
# PORT=5000
# MONGO_URI=your_mongo_uri_here
# JWT_SECRET=change_this_to_a_long_random_string
# CLIENT_ORIGIN=http://localhost:5173
# GOOGLE_CLIENT_ID=your_google_client_id
# GOOGLE_CLIENT_SECRET=your_google_client_secret
# GOOGLE_CALLBACK=http://localhost:5000/api/auth/google/callback
# NODE_ENV=development

cd frontend
npm install
npm i react-router-dom axios socket.io-client

# Create .env:
# VITE_API_URL=http://localhost:5000
# VITE_CLIENT_ORIGIN=http://localhost:5173

