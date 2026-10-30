import { api, escapeHtml, renderMarkdown } from "./common.js";

const $ = (id) => document.getElementById(id);
const EXAMPLE = "Artificial intelligence (AI) is intelligence demonstrated by machines, as opposed to the natural intelligence displayed by humans or animals. Leading AI textbooks define the field as the study of 'intelligent agents': any system that perceives its environment and takes actions that maximize its chance of achieving its goals. Some popular accounts use the term 'artificial intelligence' to describe machines that mimic cognitive functions that humans associate with the human mind, such as learning and problem solving, however this definition is rejected by major AI researchers. AI applications include advanced web search engines, recommendation systems (used by YouTube, Amazon and Netflix), understanding human speech (such as Siri or Alexa), self-driving cars (such as Tesla), and competing at the highest level in strategic game systems (such as chess and Go). As machines become increasingly capable, tasks considered to require intelligence are often removed from the definition of AI, a phenomenon known as the AI effect. For instance, optical character recognition is frequently excluded from things considered to be AI, having become a routine technology.";

let mode = location.hash === "#analyze" ? "analyze" : "summarize";
let fileText = "";
$("text").value = EXAMPLE;

const source = () => document.querySelector('input[name="source"]:checked').value;
const currentText = () => (source() === "text" ? $("text").value : fileText).trim();

function setMode(m) {
  mode = m;
  history.replaceState(null, "", "#" + m);
  $("tab-summarize").setAttribute("aria-selected", m === "summarize");
  $("tab-analyze").setAttribute("aria-selected", m === "analyze");
  $("tool-title").textContent = m === "summarize" ? "Summarize" : "Analyze";
  $("tool-sub").textContent = m === "summarize"
    ? "Turn long text into a short, faithful summary."
    : "Measure reading time, complexity, lexical richness and sentences.";
  $("run").textContent = m === "summarize" ? "Summarize" : "Analyze";
  $("output").innerHTML = "";
  $("error").hidden = true;
  updateCount();
}

function updateCount() {
  const n = currentText().length;
  const bad = n > 10000 || (mode === "summarize" && n < 50);
  $("count").textContent = `${n.toLocaleString("en")} / 10,000 characters`;
  $("count").classList.toggle("bad", bad);
}

function showError(msg) { $("error").textContent = msg; $("error").hidden = false; }

function syllables(word) {
  word = word.toLowerCase().replace(/[^a-z]/g, "");
  if (!word) return 0;
  if (word.length <= 3) return 1;
  word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "").replace(/^y/, "");
  return Math.max(1, (word.match(/[aeiouy]{1,2}/g) || []).length);
}

function analyze(text) {
  const words = text.match(/[\p{L}\p{N}'’-]+/gu) || [];
  const sentences = text.split(/(?<=[.!?])\s+/).filter((s) => s.trim()).length || 1;
  const syl = words.reduce((s, w) => s + syllables(w), 0);
  const minutes = Math.max(1, Math.ceil(words.length / 265));
  const ease = 206.835 - 1.015 * (words.length / sentences) - 84.6 * (syl / Math.max(words.length, 1));
  const unique = new Set(words.map((w) => w.toLowerCase())).size;
  return { minutes, ease: Math.round(ease * 100) / 100, richness: words.length ? unique / words.length : 0, sentences };
}

function easeLabel(s) {
  return s >= 80 ? "Easy" : s >= 60 ? "Plain English" : s >= 30 ? "Difficult" : "Very difficult";
}

$("run").onclick = async () => {
  $("error").hidden = true;
  const text = currentText();
  if (text.length > 10000) return showError("Please use a maximum of 10,000 characters.");
  if (mode === "analyze") {
    if (!text) return showError("Please enter some text to analyze.");
    const r = analyze(text);
    $("output").innerHTML = `<div class="metrics">
      <div class="metric"><div class="label">Reading time</div><div class="value">${r.minutes} min</div><div class="note">at 265 words/min</div></div>
      <div class="metric"><div class="label">Text complexity</div><div class="value">${r.ease}</div><div class="note">Flesch reading ease · ${easeLabel(r.ease)}</div></div>
      <div class="metric"><div class="label">Lexical richness</div><div class="value">${r.richness.toFixed(2)}</div><div class="note">unique / total words</div></div>
      <div class="metric"><div class="label">Sentences</div><div class="value">${r.sentences}</div><div class="note">detected</div></div></div>`;
    return;
  }
  if (text.length < 50) return showError("Please provide at least 50 characters to summarize.");
  $("run").disabled = true;
  $("output").innerHTML = '<div class="result"><h2>Summary</h2><div class="skeleton"></div><div class="skeleton"></div><div class="skeleton"></div></div>';
  try {
    const { summary } = await api("/api/summarize", { method: "POST", body: JSON.stringify({ text }) });
    $("output").innerHTML = `<div class="result"><h2>Summary</h2><div class="md">${renderMarkdown(summary)}</div></div>`;
  } catch (e) {
    $("output").innerHTML = "";
    showError(escapeHtml(e.message));
  } finally {
    $("run").disabled = false;
  }
};

async function readFile(file) {
  if (!file) return;
  fileText = await file.text();
  $("file-name").textContent = `${file.name} · ${fileText.length.toLocaleString("en")} characters`;
  updateCount();
}

document.querySelectorAll('input[name="source"]').forEach((r) => (r.onchange = () => {
  $("text-source").hidden = source() !== "text";
  $("file-source").hidden = source() !== "file";
  updateCount();
}));
$("file").onchange = (e) => readFile(e.target.files[0]);
const dz = $("dropzone");
dz.ondragover = (e) => { e.preventDefault(); dz.classList.add("drag"); };
dz.ondragleave = () => dz.classList.remove("drag");
dz.ondrop = (e) => { e.preventDefault(); dz.classList.remove("drag"); readFile(e.dataTransfer.files[0]); };
$("text").oninput = updateCount;
$("tab-summarize").onclick = () => setMode("summarize");
$("tab-analyze").onclick = () => setMode("analyze");
setMode(mode);
