import "./style.css";
import { processOffline } from "@soundtouchjs/audio-worklet";
import processorUrl from "@soundtouchjs/audio-worklet/processor?url";

const app = document.querySelector("#app");
app.innerHTML = `
<section class="shell">
<header><p class="eyebrow">InspirEdu • Music Studio</p><h1>Practice Track Studio</h1><p class="lede">Transpose first, then trim the finished track and apply a clean fade-out without touching the original file.</p></header>
<section class="card">
<label class="drop"><span class="drop-title">Choose an instrumental audio file</span><span class="drop-sub">MP3, WAV, M4A or another format your browser can decode</span><input id="file" type="file" accept="audio/*"></label>
<div id="details" class="details hidden">
<div><span>File</span><strong id="filename">—</strong></div><div><span>Original duration</span><strong id="duration">—</strong></div><div><span>Output duration</span><strong id="processedDuration">—</strong></div><div><span>Speed</span><strong>100%</strong></div><div><span>Pitch</span><strong>−5 semitones</strong></div><div><span>Key</span><strong>G → D</strong></div>
</div>
<div id="status" class="status" aria-live="polite">Waiting for an instrumental.</div>
<div class="players"><div><h2>Original</h2><audio id="original" controls></audio></div><div><h2>Working version</h2><audio id="processed" controls></audio></div></div>
<button id="transpose" disabled>1. Transpose G → D</button>
<section id="editPanel" class="editor hidden">
<h2>2. Trim & fade the transposed version</h2>
<p class="helper">Times are measured on the transposed track. The original remains untouched.</p>
<div class="edit-grid">
<label>Start at <span>seconds</span><input id="trimStart" type="number" min="0" step="0.1" value="0"></label>
<label>End at <span>seconds</span><input id="trimEnd" type="number" min="0" step="0.1"></label>
<label>Fade out <span>seconds</span><input id="fadeOut" type="number" min="0" step="0.1" value="4"></label>
</div>
<div class="quick-actions"><button id="setStart" class="small secondary">Set start from player</button><button id="setEnd" class="small secondary">Set end from player</button></div>
<button id="applyEdit">Apply trim + fade</button>
</section>
<button id="download" class="secondary" disabled>Download current WAV</button>
<p id="qualityNote" class="quality-note hidden">Quality check: compare the opening, drums, bass and sustained instruments against the original. If you hear warbling, flutter, metallic smearing or timing drift, stop here and report it.</p>
</section>
<footer>Your audio stays in your browser. It is not uploaded to InspirEdu or Cloudflare.</footer>
</section>`;

const $=s=>document.querySelector(s);
const fileInput=$("#file"),original=$("#original"),processed=$("#processed"),status=$("#status"),details=$("#details"),filename=$("#filename"),duration=$("#duration"),processedDuration=$("#processedDuration"),transpose=$("#transpose"),download=$("#download"),qualityNote=$("#qualityNote"),editPanel=$("#editPanel"),trimStart=$("#trimStart"),trimEnd=$("#trimEnd"),fadeOut=$("#fadeOut"),applyEdit=$("#applyEdit"),setStart=$("#setStart"),setEnd=$("#setEnd");
let sourceUrl=null,processedUrl=null,audioBuffer=null,transposedBuffer=null,currentBuffer=null;

const formatTime=seconds=>{if(!Number.isFinite(seconds))return"—";const m=Math.floor(seconds/60);const s=(seconds%60).toFixed(1).padStart(4,"0");return `${m}:${s}`;};
const refreshPreview=buffer=>{currentBuffer=buffer;const wav=audioBufferToWav(buffer);const blob=new Blob([wav],{type:"audio/wav"});if(processedUrl)URL.revokeObjectURL(processedUrl);processedUrl=URL.createObjectURL(blob);processed.src=processedUrl;processedDuration.textContent=formatTime(buffer.duration);download.disabled=false;};

fileInput.addEventListener("change",async()=>{const file=fileInput.files?.[0];if(!file)return;transpose.disabled=true;download.disabled=true;editPanel.classList.add("hidden");qualityNote.classList.add("hidden");audioBuffer=transposedBuffer=currentBuffer=null;processed.removeAttribute("src");processedDuration.textContent="—";if(sourceUrl)URL.revokeObjectURL(sourceUrl);if(processedUrl)URL.revokeObjectURL(processedUrl);sourceUrl=URL.createObjectURL(file);original.src=sourceUrl;filename.textContent=file.name;status.textContent="Decoding audio locally…";try{const bytes=await file.arrayBuffer();const ctx=new AudioContext();audioBuffer=await ctx.decodeAudioData(bytes.slice(0));await ctx.close();duration.textContent=formatTime(audioBuffer.duration);details.classList.remove("hidden");transpose.disabled=false;status.textContent="Loaded. Ready to transpose G → D at 100% tempo.";}catch(err){console.error(err);status.textContent="This browser could not decode that audio file. Try WAV or MP3.";}});

transpose.addEventListener("click",async()=>{if(!audioBuffer)return;transpose.disabled=true;download.disabled=true;status.textContent="Transposing down 5 semitones at 100% tempo…";try{transposedBuffer=await processOffline({input:audioBuffer,processorUrl,pitchSemitones:-5,playbackRate:1,stretchParameters:{quickSeek:false,overlapMs:12}});refreshPreview(transposedBuffer);trimStart.value="0";trimEnd.value=transposedBuffer.duration.toFixed(1);fadeOut.value="4";editPanel.classList.remove("hidden");qualityNote.classList.remove("hidden");const delta=Math.abs(transposedBuffer.duration-audioBuffer.duration);status.textContent=delta<0.05?"Transposed. Now trim it and add a fade-out if required.":`Transposed, but duration differs by ${delta.toFixed(2)}s — flag this before proceeding.`;}catch(err){console.error(err);status.textContent=`Transpose failed: ${err?.message||"unknown audio processing error"}`;}finally{transpose.disabled=false;}});

setStart.addEventListener("click",()=>{trimStart.value=processed.currentTime.toFixed(1);});
setEnd.addEventListener("click",()=>{trimEnd.value=processed.currentTime.toFixed(1);});

applyEdit.addEventListener("click",()=>{if(!transposedBuffer)return;const start=Number(trimStart.value),end=Number(trimEnd.value),fade=Number(fadeOut.value);if(!Number.isFinite(start)||!Number.isFinite(end)||start<0||end<=start||end>transposedBuffer.duration+0.05){status.textContent="Check the trim times: end must be after start and within the transposed track.";return;}const length=end-start;if(!Number.isFinite(fade)||fade<0||fade>length){status.textContent="Fade-out must be between 0 seconds and the trimmed track length.";return;}const edited=trimAndFade(transposedBuffer,start,end,fade);refreshPreview(edited);status.textContent=`Edit applied: ${formatTime(start)} → ${formatTime(end)}, with a ${fade.toFixed(1)}s fade-out. You can change the values and apply again.`;});

download.addEventListener("click",()=>{if(!processedUrl)return;const a=document.createElement("a");a.href=processedUrl;a.download=currentBuffer===transposedBuffer?"inspiredu-G-to-D-minus-5-semitones.wav":"inspiredu-G-to-D-trimmed-fade.wav";document.body.appendChild(a);a.click();a.remove();});

function trimAndFade(buffer,start,end,fadeSeconds){const sr=buffer.sampleRate,startFrame=Math.round(start*sr),endFrame=Math.min(buffer.length,Math.round(end*sr)),frames=endFrame-startFrame;const ctx=new OfflineAudioContext(buffer.numberOfChannels,frames,sr);const out=ctx.createBuffer(buffer.numberOfChannels,frames,sr);const fadeFrames=Math.min(frames,Math.round(fadeSeconds*sr));for(let c=0;c<buffer.numberOfChannels;c++){const src=buffer.getChannelData(c),dst=out.getChannelData(c);for(let i=0;i<frames;i++){let gain=1;if(fadeFrames>0&&i>=frames-fadeFrames){const remaining=frames-1-i;gain=Math.max(0,remaining/Math.max(1,fadeFrames-1));}dst[i]=src[startFrame+i]*gain;}}return out;}

function audioBufferToWav(buffer){const channels=buffer.numberOfChannels,sampleRate=buffer.sampleRate,frames=buffer.length,bytesPerSample=2,blockAlign=channels*bytesPerSample,dataSize=frames*blockAlign,out=new ArrayBuffer(44+dataSize),view=new DataView(out);const write=(offset,text)=>{for(let i=0;i<text.length;i++)view.setUint8(offset+i,text.charCodeAt(i));};write(0,"RIFF");view.setUint32(4,36+dataSize,true);write(8,"WAVE");write(12,"fmt ");view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,channels,true);view.setUint32(24,sampleRate,true);view.setUint32(28,sampleRate*blockAlign,true);view.setUint16(32,blockAlign,true);view.setUint16(34,16,true);write(36,"data");view.setUint32(40,dataSize,true);const data=Array.from({length:channels},(_,c)=>buffer.getChannelData(c));let offset=44;for(let i=0;i<frames;i++){for(let c=0;c<channels;c++){const sample=Math.max(-1,Math.min(1,data[c][i]));view.setInt16(offset,sample<0?sample*0x8000:sample*0x7fff,true);offset+=2;}}return out;}
