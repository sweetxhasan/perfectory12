"use client"

import { useEffect, useState } from "react"
import { DashboardShell } from "@/components/dashboard-shell"
import { PageHeader } from "@/components/page-header"
import { GlassPanel } from "@/components/glass-panel"
import { CodeBlock } from "@/components/code-block"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Terminal, FileJson, ListChecks, Globe2, Mic2, SplitSquareHorizontal } from "lucide-react"

const FALLBACK_ORIGIN = "https://your-domain.com"

function buildSamples(endpoint: string) {
  const CURL = `curl -X POST ${endpoint} \\
  -H "Content-Type: application/json" \\
  -d '{
    "text": "नमस्ते! Little Voice API में आपका स्वागत है।",
    "language_code": "hi",
    "speaker": "shubh"
  }'`

  const NODE = `import fs from "fs";

const response = await fetch("${endpoint}", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    text: "नमस्ते! Little Voice API में आपका स्वागत है।",
    language_code: "hi",
    speaker: "shubh",
  }),
});

const data = await response.json();
const audio = Buffer.from(data.audios[0], "base64");
fs.writeFileSync("output.mp3", audio);
console.log(\`Saved output.mp3 (\${data.audio_durations[0]})\`);`

  const PYTHON = `import base64
import requests

response = requests.post(
    "${endpoint}",
    json={
        "text": "नमस्ते! Little Voice API में आपका स्वागत है।",
        "language_code": "hi",
        "speaker": "shubh",
    },
)

data = response.json()
audio_bytes = base64.b64decode(data["audios"][0])

with open("output.mp3", "wb") as f:
    f.write(audio_bytes)

print(f"Saved output.mp3 ({data['audio_durations'][0]})")`

  const PHP = `<?php
$payload = json_encode([
    "text" => "नमस्ते! Little Voice API में आपका स्वागत है।",
    "language_code" => "hi",
    "speaker" => "shubh",
]);

$ch = curl_init("${endpoint}");
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
curl_setopt($ch, CURLOPT_HTTPHEADER, ["Content-Type: application/json"]);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

$response = json_decode(curl_exec($ch), true);
curl_close($ch);

$audio = base64_decode($response["audios"][0]);
file_put_contents("output.mp3", $audio);

echo "Saved output.mp3 (" . $response["audio_durations"][0] . ")\\n";`

  const REACT = `async function generateVoice(text: string) {
  const res = await fetch("${endpoint}", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text,
      language_code: "hi",
      speaker: "shubh",
    }),
  });

  const data = await res.json();
  const byteChars = atob(data.audios[0]);
  const bytes = new Uint8Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) bytes[i] = byteChars.charCodeAt(i);

  const blob = new Blob([bytes], { type: "audio/mpeg" });
  return { url: URL.createObjectURL(blob), duration: data.audio_durations[0] };
}

// <audio controls src={audioUrl} />`

  return { CURL, NODE, PYTHON, PHP, REACT }
}

const RESPONSE_SAMPLE = `{
  "request_id": "1731661512345_9k2p1qz8",
  "text": "नमस्ते! Little Voice API में आपका स्वागत है।",
  "audios": [
    "UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0YQAAAAA..."
  ],
  "audio_durations": ["5s"],
  "language": "hi",
  "chunks_used": 1,
  "billable_characters": 52,
  "time": "15 Nov 2024, 08:45:12 pm"
}`

const ERROR_SAMPLE = `{
  "error": "All configured API keys failed to generate speech",
  "detail": "Speechify request failed with status 429",
  "failed_chunk": 2,
  "total_chunks": 3
}`

const LIMIT_ERROR_SAMPLE = `{
  "error": "'text' exceeds the configured Little Voice API limit of 50000 characters",
  "text_length": 61240,
  "limit": 50000
}`

const LANGUAGE_MISMATCH_ERROR_SAMPLE = `{
  "error": "Voice 'meera' does not support language 'hi'. It only supports: en, bn."
}`

const PARAMS = [
  { name: "text", type: "string", required: true, desc: "The text to convert to speech. Supports mixed-language input, and can be far longer than Speechify's own 2000-character per-request limit — see Long text handling below." },
  {
    name: "language_code",
    type: "string",
    required: true,
    desc: "Short code accepted by Little Voice API: en, bn, or hi. Internally mapped to Speechify's locale code (en-US, bn-IN, hi-IN) before the upstream request. The chosen speaker must support this language — see the Voices page, where each voice can support multiple languages.",
  },
  { name: "speaker", type: "string", required: true, desc: "Voice ID configured on the Voices page (e.g. shubh, meera)." },
]

function buildVoicesSamples(endpoint: string) {
  const CURL = `curl -X GET ${endpoint}`

  const NODE = `const response = await fetch("${endpoint}");
const data = await response.json();
console.log(data.voices);`

  const PYTHON = `import requests

response = requests.get("${endpoint}")
data = response.json()
print(data["voices"])`

  const PHP = `<?php
$ch = curl_init("${endpoint}");
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$response = json_decode(curl_exec($ch), true);
curl_close($ch);

print_r($response["voices"]);`

  const REACT = `async function getVoices() {
  const res = await fetch("${endpoint}");
  const data = await res.json();
  return data.voices;
}`

  return { CURL, NODE, PYTHON, PHP, REACT }
}

const VOICES_RESPONSE_SAMPLE = `{
  "voices": [
    {
      "id": "shubh",
      "name": "Shubh",
      "gender": "male",
      "voice_type": "free",
      "photo_url": "https://i.ibb.co/xxxxxxx/shubh.jpg",
      "sample_audio_url": "https://example.com/samples/shubh.mp3",
      "languages": ["hi", "en"]
    },
    {
      "id": "meera",
      "name": "Meera",
      "gender": "female",
      "voice_type": "pro",
      "photo_url": "https://i.ibb.co/xxxxxxx/meera.jpg",
      "sample_audio_url": "https://example.com/samples/meera.mp3",
      "languages": ["bn"]
    }
  ],
  "total": 2,
  "time": "15 Nov 2024, 08:45:12 pm"
}`

const VOICES_ERROR_SAMPLE = `{
  "error": "Could not load voices"
}`

const VOICES_PARAMS = [
  { name: "id", type: "string", desc: "The voice id to use as the speaker value on /text-to-voice (e.g. shubh, meera)." },
  { name: "name", type: "string", desc: "Human-readable display name of the voice." },
  { name: "gender", type: "string", desc: "Either male or female." },
  { name: "voice_type", type: "string", desc: "Access tier of the voice: free, pro, or pro-max." },
  { name: "photo_url", type: "string", desc: "Character photo URL for the voice, shown in voice pickers." },
  { name: "sample_audio_url", type: "string", desc: "A short sample clip URL demonstrating the voice." },
  {
    name: "languages",
    type: "string[]",
    desc: "Every short language code this voice speaks (from en, bn, hi). /text-to-voice rejects any language_code not present in this array for the chosen speaker.",
  },
]

export default function DocsPage() {
  const [origin, setOrigin] = useState(FALLBACK_ORIGIN)

  useEffect(() => {
    if (typeof window !== "undefined" && window.location?.origin) {
      setOrigin(window.location.origin)
    }
  }, [])

  const endpoint = `${origin}/text-to-voice`
  const { CURL, NODE, PYTHON, PHP, REACT } = buildSamples(endpoint)

  const voicesEndpoint = `${origin}/api/voices`
  const {
    CURL: VOICES_CURL,
    NODE: VOICES_NODE,
    PYTHON: VOICES_PYTHON,
    PHP: VOICES_PHP,
    REACT: VOICES_REACT,
  } = buildVoicesSamples(voicesEndpoint)

  return (
    <DashboardShell>
      <PageHeader
        title="API Documentation"
        description="Everything you need to integrate Little Voice API — one endpoint, automatic key rotation, and multilingual speech out of the box."
      />

      <GlassPanel className="p-5 sm:p-6 flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <div className="flex size-9 items-center justify-center rounded-xl bg-primary/15 text-primary border border-glass-border">
            <Globe2 className="size-4" />
          </div>
          <div>
            <h3 className="font-serif text-lg text-foreground">Base endpoint</h3>
            <p className="text-sm text-muted-foreground">Single POST endpoint for all text-to-speech requests</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="rounded-lg bg-primary/15 text-primary border border-primary/20 font-mono text-xs">
            POST
          </Badge>
          <code className="min-w-0 max-w-full overflow-x-auto whitespace-nowrap rounded-lg text-sm font-mono text-foreground bg-card/60 border border-border px-3 py-1.5">
            {endpoint}
          </code>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Little Voice API proxies every request to the Speechify speech engine using an admin-managed pool of
          keys. If one key fails or hits a rate limit, the request automatically retries with the next
          available key — your integration never sees the failure. The URL above is detected live from this
          browser&apos;s <code className="font-mono text-xs">window.location</code>, so it always shows your
          real deployed domain.
        </p>
      </GlassPanel>

      <GlassPanel className="p-5 sm:p-6 flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <div className="flex size-9 items-center justify-center rounded-xl bg-accent/25 text-accent-foreground border border-glass-border">
            <ListChecks className="size-4" />
          </div>
          <h3 className="font-serif text-lg text-foreground">Request parameters</h3>
        </div>
        <div className="flex flex-col divide-y divide-border/60">
          {PARAMS.map((p) => (
            <div key={p.name} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-baseline sm:gap-4">
              <div className="flex items-center gap-2 sm:w-48 shrink-0">
                <code className="text-sm font-mono text-foreground">{p.name}</code>
                {p.required ? (
                  <Badge className="rounded-md bg-destructive/10 text-destructive border border-destructive/20 text-[10px]">
                    required
                  </Badge>
                ) : (
                  <Badge className="rounded-md bg-muted text-muted-foreground border border-border text-[10px]">
                    optional
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{p.desc}</p>
            </div>
          ))}
        </div>
      </GlassPanel>

      <GlassPanel className="min-w-0 p-5 sm:p-6 flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <div className="flex size-9 items-center justify-center rounded-xl bg-accent/25 text-accent-foreground border border-glass-border">
            <SplitSquareHorizontal className="size-4" />
          </div>
          <div>
            <h3 className="font-serif text-lg text-foreground">Long text handling</h3>
            <p className="text-sm text-muted-foreground">One request in, one merged audio out — no matter the length</p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Speechify rejects any single request above its own hard 2000-character limit. Little Voice API
          accepts much longer <code className="font-mono text-xs">text</code> — up to the limit configured on
          the Settings page — and handles the split transparently, using the same voice and language for every
          chunk so the result sounds like one continuous speaker:
        </p>
        <ol className="flex flex-col gap-2 text-sm text-muted-foreground leading-relaxed list-decimal pl-5">
          <li>
            The text is divided into chunks sized to the Speechify text limit, always cutting on a whitespace
            boundary so a word is never split in half — a chunk break can land right before a word like{" "}
            <span className="font-mono text-xs text-foreground">Hasan</span> /{" "}
            <span className="font-mono text-xs text-foreground">হাসান</span>, but never in the middle of it.
          </li>
          <li>
            Each chunk is sent to Speechify as its own request, in order, rotating through your active API key
            pool exactly like a single-chunk request would — if a key fails or is rate-limited on a chunk, the
            next active key is tried before that chunk is considered failed.
          </li>
          <li>
            If a chunk ultimately fails on every active key, processing stops immediately — no partial or
            garbled audio is returned — and the failure is logged with the exact chunk index and Speechify&apos;s
            error message.
          </li>
          <li>Every successful chunk&apos;s returned audio is stitched into one continuous MP3.</li>
          <li>
            The caller gets back exactly one request with one merged <code className="font-mono text-xs">audios[0]</code>{" "}
            entry — <code className="font-mono text-xs">chunks_used</code> tells you how many upstream Speechify
            calls it took, and <code className="font-mono text-xs">billable_characters</code> is the total
            characters Speechify billed across every chunk.
          </li>
        </ol>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Example: a 3000-character request with the default 2000-character Speechify limit sends 2000
          characters (up to the last full word) in the first Speechify call, then the remaining ~1000 characters
          in a second call — both audios are merged and returned as a single voice in one Little Voice API
          response. Configure both limits from the{" "}
          <a href="/settings" className="text-primary underline underline-offset-2">
            Settings page
          </a>
          .
        </p>
      </GlassPanel>

      <GlassPanel className="min-w-0 p-5 sm:p-6 flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <div className="flex size-9 items-center justify-center rounded-xl bg-primary/15 text-primary border border-glass-border">
            <Terminal className="size-4" />
          </div>
          <h3 className="font-serif text-lg text-foreground">Code samples</h3>
        </div>
        <Tabs defaultValue="curl" className="min-w-0">
          <TabsList variant="line" className="flex-wrap h-auto bg-transparent p-0 gap-1">
            <TabsTrigger value="curl">cURL</TabsTrigger>
            <TabsTrigger value="node">Node.js</TabsTrigger>
            <TabsTrigger value="python">Python</TabsTrigger>
            <TabsTrigger value="php">PHP</TabsTrigger>
            <TabsTrigger value="react">React / JS</TabsTrigger>
          </TabsList>
          <TabsContent value="curl" className="min-w-0">
            <CodeBlock code={CURL} />
          </TabsContent>
          <TabsContent value="node" className="min-w-0">
            <CodeBlock code={NODE} />
          </TabsContent>
          <TabsContent value="python" className="min-w-0">
            <CodeBlock code={PYTHON} />
          </TabsContent>
          <TabsContent value="php" className="min-w-0">
            <CodeBlock code={PHP} />
          </TabsContent>
          <TabsContent value="react" className="min-w-0">
            <CodeBlock code={REACT} />
          </TabsContent>
        </Tabs>
      </GlassPanel>

      <div className="grid gap-6 lg:grid-cols-2">
        <GlassPanel className="min-w-0 p-5 sm:p-6 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary/15 text-primary border border-glass-border">
              <FileJson className="size-4" />
            </div>
            <h3 className="font-serif text-lg text-foreground">Success response</h3>
          </div>
          <CodeBlock code={RESPONSE_SAMPLE} />
          <p className="text-xs text-muted-foreground leading-relaxed">
            <code className="font-mono">audios</code> contains a single base64-encoded, fully merged audio clip —
            decode it and write to a file, or convert it to a Blob in the browser to play immediately.{" "}
            <code className="font-mono">audio_durations</code> gives its total length (e.g.{" "}
            <code className="font-mono">1m 4s</code>), <code className="font-mono">language</code> echoes the
            short code you sent, <code className="font-mono">chunks_used</code> shows how many Speechify requests
            were made behind the scenes, <code className="font-mono">billable_characters</code> is the total
            characters Speechify billed across those requests, and <code className="font-mono">time</code> is the
            request timestamp in Bangladesh time (Asia/Dhaka).
          </p>
        </GlassPanel>

        <GlassPanel className="min-w-0 p-5 sm:p-6 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-xl bg-destructive/10 text-destructive border border-glass-border">
              <FileJson className="size-4" />
            </div>
            <h3 className="font-serif text-lg text-foreground">Error responses</h3>
          </div>
          <CodeBlock code={ERROR_SAMPLE} />
          <p className="text-xs text-muted-foreground leading-relaxed">
            Returned if every active Speechify key fails on a given chunk — <code className="font-mono">failed_chunk</code>{" "}
            and <code className="font-mono">total_chunks</code> tell you which part of a multi-chunk request
            failed. Add more keys from the Api Keys page to increase reliability.
          </p>
          <CodeBlock code={LIMIT_ERROR_SAMPLE} />
          <p className="text-xs text-muted-foreground leading-relaxed">
            Returned with a 413 status if <code className="font-mono">text</code> is longer than the Little
            Voice API limit configured on the Settings page.
          </p>
          <CodeBlock code={LANGUAGE_MISMATCH_ERROR_SAMPLE} />
          <p className="text-xs text-muted-foreground leading-relaxed">
            Returned with a 400 status if the chosen <code className="font-mono">speaker</code> was not
            configured on the Voices page to support the requested <code className="font-mono">language_code</code>.
          </p>
        </GlassPanel>
      </div>

      <PageHeader
        title="Voice List"
        description="Fetch every voice configured on the Voices page — photo, name, id, gender, tier, and a sample audio url — in a single fast request."
      />

      <GlassPanel className="p-5 sm:p-6 flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <div className="flex size-9 items-center justify-center rounded-xl bg-primary/15 text-primary border border-glass-border">
            <Mic2 className="size-4" />
          </div>
          <div>
            <h3 className="font-serif text-lg text-foreground">Base endpoint</h3>
            <p className="text-sm text-muted-foreground">Single GET endpoint that returns every available voice</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="rounded-lg bg-accent/25 text-accent-foreground border border-accent/30 font-mono text-xs">
            GET
          </Badge>
          <code className="min-w-0 max-w-full overflow-x-auto whitespace-nowrap rounded-lg text-sm font-mono text-foreground bg-card/60 border border-border px-3 py-1.5">
            {voicesEndpoint}
          </code>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          No request body or authentication needed — just call it. The response mirrors the Voices dashboard in
          real time, so newly added voices show up immediately. Use the returned <code className="font-mono text-xs">id</code>{" "}
          as the <code className="font-mono text-xs">speaker</code> value when calling{" "}
          <code className="font-mono text-xs">/text-to-voice</code>.
        </p>
      </GlassPanel>

      <GlassPanel className="p-5 sm:p-6 flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <div className="flex size-9 items-center justify-center rounded-xl bg-accent/25 text-accent-foreground border border-glass-border">
            <ListChecks className="size-4" />
          </div>
          <h3 className="font-serif text-lg text-foreground">Response fields</h3>
        </div>
        <div className="flex flex-col divide-y divide-border/60">
          {VOICES_PARAMS.map((p) => (
            <div key={p.name} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-baseline sm:gap-4">
              <div className="flex items-center gap-2 sm:w-48 shrink-0">
                <code className="text-sm font-mono text-foreground">{p.name}</code>
                <Badge className="rounded-md bg-muted text-muted-foreground border border-border text-[10px]">
                  {p.type}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{p.desc}</p>
            </div>
          ))}
        </div>
      </GlassPanel>

      <GlassPanel className="min-w-0 p-5 sm:p-6 flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <div className="flex size-9 items-center justify-center rounded-xl bg-primary/15 text-primary border border-glass-border">
            <Terminal className="size-4" />
          </div>
          <h3 className="font-serif text-lg text-foreground">Code samples</h3>
        </div>
        <Tabs defaultValue="curl" className="min-w-0">
          <TabsList variant="line" className="flex-wrap h-auto bg-transparent p-0 gap-1">
            <TabsTrigger value="curl">cURL</TabsTrigger>
            <TabsTrigger value="node">Node.js</TabsTrigger>
            <TabsTrigger value="python">Python</TabsTrigger>
            <TabsTrigger value="php">PHP</TabsTrigger>
            <TabsTrigger value="react">React / JS</TabsTrigger>
          </TabsList>
          <TabsContent value="curl" className="min-w-0">
            <CodeBlock code={VOICES_CURL} />
          </TabsContent>
          <TabsContent value="node" className="min-w-0">
            <CodeBlock code={VOICES_NODE} />
          </TabsContent>
          <TabsContent value="python" className="min-w-0">
            <CodeBlock code={VOICES_PYTHON} />
          </TabsContent>
          <TabsContent value="php" className="min-w-0">
            <CodeBlock code={VOICES_PHP} />
          </TabsContent>
          <TabsContent value="react" className="min-w-0">
            <CodeBlock code={VOICES_REACT} />
          </TabsContent>
        </Tabs>
      </GlassPanel>

      <div className="grid gap-6 lg:grid-cols-2">
        <GlassPanel className="min-w-0 p-5 sm:p-6 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary/15 text-primary border border-glass-border">
              <FileJson className="size-4" />
            </div>
            <h3 className="font-serif text-lg text-foreground">Success response</h3>
          </div>
          <CodeBlock code={VOICES_RESPONSE_SAMPLE} />
          <p className="text-xs text-muted-foreground leading-relaxed">
            <code className="font-mono">voices</code> is an array of every voice configured in the dashboard,{" "}
            <code className="font-mono">total</code> is the array length, and <code className="font-mono">time</code>{" "}
            is the request timestamp in Bangladesh time (Asia/Dhaka).
          </p>
        </GlassPanel>

        <GlassPanel className="min-w-0 p-5 sm:p-6 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-xl bg-destructive/10 text-destructive border border-glass-border">
              <FileJson className="size-4" />
            </div>
            <h3 className="font-serif text-lg text-foreground">Error response</h3>
          </div>
          <CodeBlock code={VOICES_ERROR_SAMPLE} />
          <p className="text-xs text-muted-foreground leading-relaxed">
            Returned only if the voice list could not be loaded from the database.
          </p>
        </GlassPanel>
      </div>
    </DashboardShell>
  )
}
