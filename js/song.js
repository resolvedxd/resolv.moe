const song_panel = document.getElementById("listening_to_main");
const song_cover = document.getElementById("song_cover");
const song_name = document.getElementById("song_name");
const song_artist = document.getElementById("song_artist");
const song_progress = document.getElementById("song_progress");
const song_progress_width = song_progress.width;
const UPDATE_FREQUENCY = 2.5; // in seconds
const UPDATE_FREQUENCY_MS = UPDATE_FREQUENCY * 1000;

const lerp = (a, b, t) => {
  t = t < 0 ? 0 : t;
  t = t > 1 ? 1 : t;
  return a + (b - a) * t;
};
const clamp = (v, a, b) => {
  return Math.min(Math.max(v, a), b);
};

let song_updated_at_time;
let song;
const animate = (t) => {
  if (!song) return;
  const delta_t = t - song_updated_at_time;
  const v = lerp(song.progress * song_progress_width,
    lerp(0, song_progress_width, (song.progress_ms + UPDATE_FREQUENCY_MS) / song.duration_ms),
    (song.progress + (delta_t / 1000)) / UPDATE_FREQUENCY);

  song_progress.style.width = v + "px";
  setTimeout(() => requestAnimationFrame(animate), 100);
};

// this kinda sucks; no i wont use websockets
let network_latency_weight = 0.2;

const run = async () => {
  const _request_start_date = Date.now();
  const res = await fetch("https://resolv.moe/currently_playing.json", { cache: "no-cache" });
  const _request_end_date = Date.now();
  const network_latency = _request_end_date - _request_start_date;

  const raw = await res.text();
  if (raw == "NOT PLAYING") {
    song = undefined;
    setTimeout(run, UPDATE_FREQUENCY_MS);
    return song_panel.hidden = true;
  }
  let newly_started = !song;
  song = JSON.parse(raw);

  let time_delta = _request_end_date - song.date;
  song.progress = song.progress_ms / song.duration_ms;
  console.log(song.progress);

  // if the song is older than 10 seconds there is probably something wrong
  if (time_delta > 10000) {
    song_panel.hidden = true;
    setTimeout(run, UPDATE_FREQUENCY_MS * 2);
    return;
  };

  console.log({ time_delta, network_latency });
  if (time_delta < 0) {
    network_latency_weight -= 0.1;
    console.log(`lowering network latency weight to ${network_latency_weight}`);
  }
  // this keeps us more in sync than a normal setInterval
  setTimeout(run, Math.max(UPDATE_FREQUENCY_MS - (time_delta + (network_latency * network_latency_weight)), 0));

  song_name.innerText = song.name;
  song_artist.innerText = `by ${song.by.join(", ")}`;
  song_cover.src = song.image.url;
  song_progress.style.width = (song.progress * song_progress_width) + "px";
  song_panel.hidden = false;
  song_updated_at_time = performance.now()
  if (newly_started) requestAnimationFrame(animate);
}

document.addEventListener("DOMContentLoaded", () => {
  run();
});