import "./style.css";
import { SoundTouch } from "@soundtouchjs/core";

const app = document.querySelector("#app");
app.innerHTML = `
<section class="shell">
  <header>
    <p class="eyebrow">InspirEdu • Music Studio</p>
    <h1>G → D Transpose Test</h1>
    <p class="lede">First milestone: keep the instrumental at its original speed and shift it down exactly five semitones.</p>
  </header>

  <section class="card">
    <label class="drop">
      <span class="drop-title">Choose an instrumental audio file</span>
      <span class="drop-sub">MP3, WAV, M4A or another format your browser can decode</span>
      <input id="file" type="file" accept="audio/*" />
    </label>

    <div id="details" class="details hidden">
      <div><span>File</span><strong id="filename">—</strong></div>
      <div><span>Original duration</span><strong id="duration">—</strong></div>
      <div><span>Speed</span><strong>100%</strong></div>
      <div><span>Pitch</span><strong>−5 semitones</strong></div>
      <div><span>Key</span><strong>G → D</strong></div>
    </div>

    <div id="status" class="status" aria-live="polite">Waiting for an instrumental.</div>

    <div class="players">
      <div>
        <h2>Original</h2>
        <audio id="original" controls></audio>
      </div>
      <div>
        <h2>Transposed preview</h2>
        <p class="note">The production render engine is being wired in next. This build first verifies deployment, decoding and exact source duration without altering your original file.</p>
        <audio id="processed" controls></audio>
      </div>
    </div>

    <button id="transpose" disabled>Transpose G → D</button>
  </section>

  <footer>No audio is uploaded. Processing is designed to happen locally in your browser.</footer>
</section>`;

const fileInput = document.querySelector("#file");
const original = document.querySelector("#original");
const processed = document.querySelector("#processed");
const status = document.querySelector("#status");
const details = document.querySelector("#details");
const filename = document.querySelector("#filename");
const duration = document.querySelector("#duration");
const transpose = document.querySelector("#transpose");
let objectUrl = null;
let audioBuffer = null;

const formatTime = seconds => {
  if (!Number.isFinite(seconds)) return "—";
  const m = Math.floor(seconds / 60);
  const s = (seconds % 60).toFixed(1).padStart(4, "0");
  return `${m}:${s}`;
};

fileInput.addEventListener("change", async () => {
  const file = fileInput.files?.[0];
  if (!file) return;
  transpose.disabled = true;
  processed.removeAttribute("src");
  if (objectUrl) URL.revokeObjectURL(objectUrl);
  objectUrl = URL.createObjectURL(file);
  original.src = objectUrl;
  filename.textContent = file.name;
  status.textContent = "Decoding audio locally…";
  try {
    const bytes = await file.arrayBuffer();
    const ctx = new AudioContext();
    audioBuffer = await ctx.decodeAudioData(bytes.slice(0));
    await ctx.close();
    duration.textContent = formatTime(audioBuffer.duration);
    details.classList.remove("hidden");
    transpose.disabled = false;
    status.textContent = "Loaded. Source speed is locked at 100%; target pitch is −5 semitones.";
  } catch (err) {
    audioBuffer = null;
    status.textContent = "This browser could not decode that audio file. Try WAV or MP3.";
  }
});

transpose.addEventListener("click", () => {
  if (!audioBuffer) return;
  const probe = new SoundTouch(audioBuffer.sampleRate);
  probe.pitchSemitones = -5;
  probe.tempo = 1;
  status.textContent = "Audio engine loaded successfully. High-quality offline render is the next processing step; no destructive fallback will be used.";
});
