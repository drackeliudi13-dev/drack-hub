const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");

const app = express();
const PORT = 3000;

const PASSWORD = "DRACK2026";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "DRACKADMIN";
const adminSessions = new Map();

const POSTS_FILE = path.join(__dirname, "posts.json");

const upload = multer({ dest: path.join(__dirname, "public/uploads") });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));


function requireAdmin(req, res, next) {
  const cookie = req.headers.cookie || "";
  const match = cookie.match(/(?:^|;\\s*)drack_admin=([^;]+)/);
  const token = match ? match[1] : null;

  if (!token || !adminSessions.has(token)) {
    return res.status(401).json({
      success: false,
      message: "Admin access required"
    });
  }

  next();
}

function getPosts() {
  if (!fs.existsSync(POSTS_FILE)) {
    return [];
  }

  try {
    return JSON.parse(fs.readFileSync(POSTS_FILE, "utf8"));
  } catch {
    return [];
  }
}

function savePosts(posts) {
  fs.writeFileSync(
    POSTS_FILE,
    JSON.stringify(posts, null, 2)
  );
}

/* LOGIN */

app.post("/login", (req, res) => {

  const { password } = req.body;

  if (password === PASSWORD) {
    return res.json({
      success: true
    });
  }

  res.json({
    success: false,
    message: "Password sio sahihi"
  });

});

/* ADMIN LOGIN */

app.post("/admin-login", (req, res) => {

  const { password } = req.body;

  if (password === ADMIN_PASSWORD) {
    const token = crypto.randomBytes(32).toString("hex");

    adminSessions.set(token, Date.now());

    res.setHeader(
      "Set-Cookie",
      "drack_admin=" + token + "; HttpOnly; Path=/; SameSite=Lax"
    );

    return res.json({
      success: true
    });
  }

  res.json({
    success: false,
    message: "Admin password sio sahihi"
  });

});

/* GET POSTS */

app.get("/api/posts", (req, res) => {

  const posts = getPosts();

  res.json({
    success: true,
    posts
  });

});


/* IMAGE UPLOAD */

app.post("/api/upload", requireAdmin, upload.single("image"), (req, res) => {

  if (!req.file) {
    return res.json({
      success: false,
      message: "Hakuna picha iliyochaguliwa"
    });
  }

  const ext =
    path.extname(req.file.originalname).toLowerCase() || ".jpg";

  const newName =
    Date.now() + ext;

  const oldPath = req.file.path;

  const newPath =
    path.join(__dirname, "public/uploads", newName);

  fs.renameSync(oldPath, newPath);

  res.json({
    success: true,
    image: "/uploads/" + newName
  });

});

/* CREATE POST */

app.post("/api/posts", requireAdmin, (req, res) => {

  const {
    title,
    category,
    content,
    image,
    link
  } = req.body;

  if (!title || !content) {

    return res.json({
      success: false,
      message: "Title na content vinahitajika"
    });

  }

  const posts = getPosts();

  const newPost = {

    id: Date.now(),

    title,

    category: category || "NEWS",

    content,

    image: image || "",

    link: link || "",

    date: new Date().toLocaleString("sw-TZ")

  };

  posts.unshift(newPost);

  savePosts(posts);

  res.json({
    success: true,
    post: newPost
  });

});


/* EDIT POST */

app.put("/api/posts/:id", requireAdmin, (req, res) => {

  const id = Number(req.params.id);

  const posts = getPosts();

  const index = posts.findIndex(post => post.id === id);

  if (index === -1) {
    return res.json({
      success: false,
      message: "Post haijapatikana"
    });
  }

  const old = posts[index];

  posts[index] = {
    ...old,
    title: req.body.title ?? old.title,
    category: req.body.category ?? old.category,
    content: req.body.content ?? old.content,
    image: req.body.image ?? old.image ?? "",
    link: req.body.link ?? old.link ?? ""
  };

  savePosts(posts);

  res.json({
    success: true,
    post: posts[index]
  });

});

/* DELETE POST */

app.delete("/api/posts/:id", requireAdmin, (req, res) => {

  const id = Number(req.params.id);

  const posts = getPosts();

  const filtered =
    posts.filter(post => post.id !== id);

  savePosts(filtered);

  res.json({
    success: true
  });

});

/* COMMENTS */
const COMMENTS_FILE = path.join(__dirname, "comments.json");

function getComments() {
  if (!fs.existsSync(COMMENTS_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(COMMENTS_FILE, "utf8"));
  } catch {
    return [];
  }
}

app.get("/api/comments", (req, res) => {
  res.json({ success: true, comments: getComments() });
});

app.post("/api/comments", (req, res) => {
  const name = String(req.body.name || "").trim();
  const message = String(req.body.message || "").trim();

  if (!name || !message) {
    return res.json({ success: false, message: "Jina na maoni vinahitajika" });
  }

  if (name.length > 50 || message.length > 500) {
    return res.json({ success: false, message: "Maoni ni marefu sana" });
  }

  const comments = getComments();
  const newComment = {
    id: Date.now(),
    name,
    message,
    date: new Date().toLocaleString("sw-TZ")
  };

  comments.unshift(newComment);

  fs.writeFileSync(
    COMMENTS_FILE,
    JSON.stringify(comments, null, 2)
  );

  res.json({ success: true, comment: newComment });
});

app.delete("/api/comments/:id", requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const comments = getComments();
  const filtered = comments.filter(comment => comment.id !== id);

  fs.writeFileSync(
    COMMENTS_FILE,
    JSON.stringify(filtered, null, 2)
  );

  res.json({ success: true });
});

/* SERVER */

app.listen(PORT, "0.0.0.0", () => {

  console.log("");

  console.log("╔════════════════════════════╗");
  console.log("║        🤖 DRACK HUB       ║");
  console.log("╠════════════════════════════╣");
  console.log("║  🌐 http://localhost:3000 ║");
  console.log("╚════════════════════════════╝");

  console.log("");

});
