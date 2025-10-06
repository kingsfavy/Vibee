const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const mongoose = require('mongoose');
const path = require('path');
const cors = require('cors');
//const Msg = require('./models/msg')


const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());

const clients = []; // Map to store active users and their SSE response

// --- Global Online Users Tracker ---
const onlineUsers = {};
const userSocketMap = {};


const uri = "mongodb+srv://kingsley1185:22445131k@cluster0.zveirgt.mongodb.net/vibe?retryWrites=true&w=majority";
const clientOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
    
};

async function run() {
  try {
    await mongoose.connect(uri, clientOptions);
    console.log(" Connected to MongoDB successfully!");
  } catch (err) {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  }
}

run();


const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'vibe8889@gmail.com',
    pass: 'rvsg elcx qeub dtil'
  }
});

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: {
    type: String,
    required: true,
    unique: true,
    match: [/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, 'Invalid email format']
  },
  yourname: { type: String, required: true },
  password: { type: String, required: true },
  resetCode: String,
  resetCodeExpiry: Date
}, { timestamps: true });

const User = mongoose.model('User', userSchema);



const groupSchema = new mongoose.Schema({
  name: { type: String, required: true },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
});
const Group = mongoose.model('Group', groupSchema);

// --- Multer Setup ---
// const upload = multer({ storage: multer.diskStorage({ destination: 'uploads/', filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname) }) });

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

const sessionMiddleware = session({
  secret: crypto.randomBytes(32).toString('hex'),
  resave: false,
  saveUninitialized: false,
});
app.use(sessionMiddleware);
app.use(passport.initialize());
app.use(passport.session());

passport.use(new LocalStrategy(async (username, password, done) => {
  try {
    const user = await User.findOne({ username });
    if (!user) return done(null, false, { message: 'Incorrect username.' });
    
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return done(null, false, { message: 'Incorrect password.' });
    
    return done(null, user);
  } catch (err) {
    return done(err);
  }
}));

passport.serializeUser((user, done) => done(null, user.username));
passport.deserializeUser(async (username, done) => {
  try {
    const user = await User.findOne({ username });
    done(null, user || false);
  } catch (err) {
    done(err);
  }
});

passport.deserializeUser(async (username, done) => {
  try {
    const user = await User.findOne({ username }, '-password'); 
    done(null, user || false);
  } catch (err) {
    done(err);
  }
});


function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.redirect('/login');
}

app.use(express.static('public'));

app.get('/', (req, res) => res.sendFile(__dirname + 'index.html'));
app.get('/login', (req, res) => res.sendFile(__dirname + 'login.html'));
app.get('/reset-password', (req, res) => res.sendFile(__dirname + 'reset-password.html'));
app.get('/forgot-password', (req, res) => res.sendFile(__dirname + 'forgot-password.html'));
app.get('/profile', ensureAuthenticated, (req, res) => res.sendFile(__dirname + 'profile.html'));
app.get('/dashboard', ensureAuthenticated, (req, res) => res.sendFile(__dirname + 'dashboard.html'));
app.get('/mobile-dashboard', ensureAuthenticated, (req, res) => res.sendFile(__dirname + 'mobile-dashboard.html'));
app.get('/mobile-news', ensureAuthenticated, (req, res) => res.sendFile(__dirname + 'mobile-news.html'));
app.get('/mobile-online', ensureAuthenticated, (req, res) => res.sendFile(__dirname + 'mobile-online.html'));
app.get('/chat', ensureAuthenticated, (req, res) => res.sendFile(__dirname + 'chat.html'));

// app.post('/', async (req, res
// ) => {
//   const { username, password, email } = req.body;
//   const hashedPassword = await bcrypt.hash(password, 10);
//   const newUser = new User({ username, password: hashedPassword, email });
  
//   try {
//     await newUser.save();
//     res.json({ success: true });
//   } catch (err) {
//     res.status(500).json({ success: false, error: err.message });
//   }
// });



app.post('/', async (req, res) => {
  const { username, password, email, yourname } = req.body;

  if (!username || !password || !email || !yourname) {
    return res.status(400).json({ success: false, error: 'All fields are required' });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = new User({ username, password: hashedPassword, email, yourname });

  try {
    await newUser.save();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});


app.post('/login', passport.authenticate('local'), (req, res) => {
  res.json({ success: true, user: req.user.username });
});


// Route for user logout
app.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Error destroying session:', err);
      res.status(500).send('Internal Server Error');
    } else {
      res.redirect('/login');
    }
  });
});


app.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const year = new Date().getFullYear();

    const user = await User.findOne({ email});
    if (!user) {
 
      return res.status(404).json({ success: false, error: "Email not found:", email});
    }

    const secretCode = Math.floor(100000 + Math.random() * 900000).toString();
    user.resetCode = secretCode;
    user.resetCodeExpiry = Date.now() + 15 * 60 * 1000;
    await user.save();

    const mailOptions = {
      from: '"Kingsley from Vibe" <vibe8889@gmail.com>',
      to: email,
      subject: 'Password reset request',
      text: `Your password reset code is: ${secretCode}, please dont share this code with anyone. It will expire in 15 minutes.`,
      html: `
      <div style="margin:0 20px 0 20px;">
      <p style="font-size: 30px; color: #333; font-weight:lighter;">A new password has been requested for ${user.username} </p>
      <br>
      <h4>Dear ${user.yourname},</h4>
  
      <img src="https://i.postimg.cc/pr1FH2Bh/tlCKczB.gif" width="auto" height="200">
      <p>We received a request to reset your password for your Vibe account with the email of ${email}.  To reset your password, please use the following code: <strong>${secretCode}</strong>, please don't share this code with anyone, It will expire in 15 minutes.
      <p><b>If you did not request this, please ignore this email, click the link below to change your password.</b></p>
           <a href='http://localhost:3005/profile'>
           <button style="padding:12px 8px; background-color:blue;color:#fff;font-size:1em;border-radius:10px;">Profile</button></a/>
      <p>Sincerely,</p>
      <p>Vibe</p>
      <br><br>
      <p>Copyright vibe ${year} All Rights Reserved.</p>
      </div>`,
    };

    transporter.sendMail(mailOptions, (error) => {
      if (error) {
        console.error("Error sending email:", error);
        return res.status(500).json({ success: false, error: 'Check your internet connection and try again' });
      }
      res.json({ success: true, message: 'Reset code sent via email' });
    });

  } catch (error) {
    console.error("Error in forgot-password route:", error);
    res.status(500).json({ success: false, error: 'Something went wrong' });
  }
});



app.post('/reset-password', async (req, res) => {
  const { email, code, newPassword } = req.body;
  const user = await User.findOne({ email });
  
  if (!user || user.resetCode !== code || Date.now() > user.resetCodeExpiry) {
    return res.status(400).json({ success: false, error: 'Invalid or expired reset code' });
  }

  user.password = await bcrypt.hash(newPassword, 10);
  user.resetCode = undefined;
  user.resetCodeExpiry = undefined;
  await user.save();

  res.json({ success: true, message: 'Password reset successfully' });
});

// --- Protected HTTP API Routes ---
app.get('/api/profile', ensureAuthenticated, (req, res) => {
    res.json({ user: req.user });
});



// Get all users (except the currently logged-in one)
app.get('/users', async (req, res) => {
  try {
    const users = await User.find({}, '-password -resetCode -resetCodeExpiry'); // exclude sensitive fields
    res.status(200).json({ success: true, users });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
});



//FOR CHATS

// socket.on('private message' async ({ to, from, message }) => {
//   const toSocket = users[to];

// }
// })

// ✅ SSE endpoint for real-time updates
app.get('/events', (req, res) => {
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });
  res.flushHeaders();
  clients.push(res);

  req.on('close', () => {
    const index = clients.indexOf(res);
    if (index !== -1) clients.splice(index, 1);
  });
});

// ✅ POST new message and broadcast it
app.post('/message', async (req, res) => {
  const { msg } = req.body;
  const message = new Msg({ msg });

  try {
    await message.save();
    broadcast(msg);
    res.status(201).json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save message' });
  }
});

// ✅ NEW: GET all messages from database
app.get('/messages', async (req, res) => {
  try {
    const messages = await Msg.find().sort({ createdAt: 1 }); // optional: sort by oldest first
    res.status(200).json({ success: true, messages });
  } catch (err) {
    console.error('Failed to fetch messages:', err);
    res.status(500).json({ success: false, error: 'Could not retrieve messages' });
  }
});

// ✅ Helper to broadcast a message to all clients
function broadcast(data) {
  clients.forEach(client => {
    client.write(`data: ${JSON.stringify(data)}\n\n`);
  });
}





const PORT = process.env.PORT || 3005;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);

});


