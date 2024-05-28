// guestbook server
const config = {
  port: 1339,
  postsppg: 5, // posts per page
  limits: {
    page_index: 10,
    comment: 250,
    name: 30,
    lines: 10,
  },
  postsfilename: "posts.json",
};

const fs = require("fs");
const express = require("express");
const geoip = require("fast-geoip");
const app = express();
app.set("trust proxy", true);
app.use(express.json());

try {
  fs.accessSync(config.postsfilename, fs.constants.F_OK);
} catch (err) {
  console.log(config.postsfilename, "file missing, creating");
  fs.writeFileSync(config.postsfilename, "[]", { encoding: "utf8", flush: true });
}
const posts_raw = fs.readFileSync(config.postsfilename, { encoding: "utf8" });
let posts;
try {
  posts = JSON.parse(posts_raw);
} catch (e) {
  console.error("error while parsing posts file:", e);
  console.error("contents of file:", posts_raw);
}

const save_posts = () => {
  try {
    fs.writeFileSync(config.postsfilename, JSON.stringify(posts), { encoding: "utf8", flush: true });
  } catch (e) {
    console.error(e);
  }
};

const escape_tags = (str) => {
  return str
    .replace(/\&/g, "&amp;")
    .replace(/\</g, "&lt;")
    .replace(/\>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/\'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");
};

const BASE = fs.readFileSync("BASE.html", { encoding: "utf8" });
const GB_BASE = fs.readFileSync("GB_BASE.html", { encoding: "utf8" });
const POST_BASE = fs.readFileSync("GB_BASE_POST.html", { encoding: "utf8" });
const PAGE_INDEX = (cur_pg) =>
  [...Array(Math.ceil(posts.length / config.postsppg)).keys()]
    .map((i) => `<a href="guestbook?pg=${i}" style="margin-top: 10px;${cur_pg == i ? "color:white" : ""}">${i + 1}</a>`)
    .join("<span> | </span>");

const gen_page = async (pg) => {
  posts.sort((a, b) => b.time - a.time);
  let p = posts.slice(config.postsppg * pg, config.postsppg * pg + config.postsppg).map(async (p) => {
    let geo, flag;
    if (p.showflag) {
      geo = await geoip.lookup(p.ip);
      flag = geo
        ? `${String.fromCodePoint(geo.country.charCodeAt(0) - 0x41 + 0x1f1e6)}${String.fromCodePoint(geo.country.charCodeAt(1) - 0x41 + 0x1f1e6)}`
        : "";
    }
    return POST_BASE.replace("__REPLACE__NAME__", escape_tags(p.name) + (p.showflag ? flag : ""))
      .replace("__REPLACE__COMMENT__", escape_tags(p.comment))
      .replace("__REPLACE__TIME__", p.time);
  });
  let o =
    GB_BASE.replace("__REPLACE__POSTS__", (await Promise.all(p)).join("")).replace(/__REPLACE__PGNUM__/g, pg) +
    `<div style="max-width:300px">${PAGE_INDEX(parseInt(pg))}</div>`;
  return o;
};

app.get("/page", async (req, res) => {
  let page = req.query.pg ? req.query.pg.replace(".html", "") : 0;

  res.set("Content-Type", "text/html");
  res.send(await gen_page(page));
});

app.get("/guestbook", async (req, res) => {
  let page = req.query.pg ? req.query.pg.replace(".html", "") : 0;

  res.set("Content-Type", "text/html");
  res.send(
    BASE.replace("__REPLACE__ID__HERE__", "guestbook")
      .replace("__REPLACE__PAGE__HERE__", await gen_page(page))
      .replace("__REPLACE__TITLE__HERE", "guestbook"),
  );
});

const raise_error = (msg, res) => {
  res.status(400);
  res.send(msg);
};
app.post("/post", (req, res) => {
  if (!req.body.comment) return raise_error("you comment cant be empty, write something!", res);
  if (req.body.comment.length > config.limits.comment)
    return raise_error(`comment can't be longer than ${config.limits.comment} characters`, res);
  if (req.body.name.length > config.limits.name)
    return raise_error(`name can't be longer than ${config.limits.name} characters`, res);
  let last_post_by_ip = posts.find((p) => p.ip == req.ip);
  if (last_post_by_ip && last_post_by_ip.time + 60 > Math.round(Date.now() / 1000))
    return raise_error("you can only post once per minute to prevent spam :3", res);
  if (req.body.comment.split("\n").length > config.limits.newlines)
    return raise_error(`you cant have more than ${config.limits.newlines} newlines`, res);

  save_posts();
  posts.push({
    name: req.body.name ? req.body.name : "anon",
    comment: req.body.comment,
    showflag: typeof req.body.showflag == "boolean" ? req.body.showflag : false,
    time: Math.round(Date.now() / 1000),
    ip: req.ip,
  });
  res.send("wazza");
  console.log("post made");
});

app.listen(config.port, () => {
  console.log(`listening on ${config.port}`);
});
