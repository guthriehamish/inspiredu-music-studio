import "./style.css";
import { processOffline } from "@soundtouchjs/audio-worklet";
import processorUrl from "@soundtouchjs/audio-worklet/processor?url";

const app = document.querySelector("#app");
app.innerHTML = `
<section class="shell">
  <header>
    <p class="eyebrow">InspirEdu • Music Studio</p>
    <h1>G → D Transpose Test</h1>
    <p class="lede">Keep the instrumental at its original speed and shift it down exactly five semitones.</p>
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
      <div><span>Processed duration</span><strong id="processedDuration">—</strong></div>
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
        <audio id="processed" controls></audio>
      </div>
    </div>

    <button id="transpose" disabled>Transpose G → D</button>
    <button id="download" class="secondary" disabled>Download transposed WAV</button>
    <p id="qualityNote" class="quality-note hidden">Quality check: compare the opening, drums, bass and sustained instruments against the original. If you hear warbling, flutter, metallic smearing or timing drift, stop here and report it — we will change the processing engine before adding more features.</p>
  </section>

  <footer>Your audio stays in your browser. It is not uploaded to InspirEdu or Cloudflare.</footer>
</section>`;

const fileInput = document.querySelector("#file");
const original = document.querySelector("#original");
const processed = document.querySelector("#processed");
const status = document.querySelector("#status");
const details = document.querySelector("#details");
const filename = document.querySelector("#filename");
const duration = document.querySelector("#duration");
const processedDuration = document.querySelector("#processedDuration");
const transpose = document.querySelector("#transpose");
const download = document.querySelector("#download");
const qualityNote = document.querySelector("#qualityNote");

let sourceUrl = null;
let processedUrl = null;
let audioBuffer = null;
let renderedBuffer = null;

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
  download.disabled = true;
  renderedBuffer = null;
  qualityNote.classList.add("hidden");
  processed.removeAttribute("src");
  processedDuration.textContent = "—";
  if (sourceUrl) URL.revokeObjectURL(sourceUrl);
  if (processedUrl) URL.revokeObjectURL(processedUrl);
  sourceUrl = URL.createObjectURL(file);
  original.src = sourceUrl;
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
    console.error(err);
    audioBuffer = null;
    status.textContent = "This browser could not decode that audio file. Try WAV or MP3.";
  }
});

transpose.addEventListener("click", async () => {
  if (!audioBuffer) return;
  transpose.disabled = true;
  download.disabled = true;
  status.textContent = "Transposing down 5 semitones at 100% tempo…";
  try {
    renderedBuffer = await processOffline({
      input: audioBuffer,
      processorUrl,
      pitchSemitones: -5,
      playbackRate: 1,
      stretchParameters: {
        quickSeek: false,
        overlapMs: 12
      }
    });
    const wav = audioBufferToWav(renderedBuffer);
    const blob = new Blob([wav], { type: "audio/wav" });
    if (processedUrl) URL.revokeObjectURL(processedUrl);
    processedUrl = URL.createObjectURL(blob);
    processed.src = processedUrl;
    processedDuration.textContent = formatTime(renderedBuffer.duration);
    const delta = Math.abs(renderedBuffer.duration - audioBuffer.duration);
    status.textContent = delta < 0.05
      ? "Done. Pitch −5 semitones; tempo 100%; duration preserved."
      : `Done, but duration differs by ${delta.toFixed(2)}s — flag this before we proceed.`;
    download.disabled = false;
    qualityNote.classList.remove("hidden");
  } catch (err) {
    console.error(err);
    status.textContent = `Transpose failed: ${err?.message || "unknown audio processing error"}`;
  } finally {
    transpose.disabled = false;
  }
});

download.addEventListener("click", () => {
  if (!processedUrl) return;
  const a = document.createElement("a");
  a.href = processedUrl;
  a.download = "inspiredu-G-to-D-minus-5-semitones.wav";
  document.body.appendChild(a);
  a.click();
  a.remove();
});

function audioBufferToWav(buffer) {
  const channels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const frames = buffer.length;
  const bytesPerSample = 2;
  const blockAlign = channels * bytesPerSample;
  const dataSize = frames * blockAlign;
  const out = new ArrayBuffer(44 + dataSize);
  const view = new DataView(out);
  const write = (offset, text) => {
    for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i));
  };
  write(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  write(8, "WAVE");
  write(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  write(36, "data");
  view.setUint32(40, dataSize, true);
  const channelData = Array.from({ length: channels }, (_, c) => buffer.getChannelData(c));
  let offset = 44;
  for (let i = 0; i < frames; i++) {
    for (let c = 0; c < channels; c++) {
      const sample = Math.max(-1, Math.min(1, channelData[c][i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }
  }
  return out;
}
