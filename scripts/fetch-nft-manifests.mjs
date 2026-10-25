// Refresh public/collections/*.json from MintGarden thumbnail URLs.
// Keep the ids in sync with src/lib/collections.ts. Does not download images.

import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const COLLECTIONS = [
  {
    id: "chia-friends",
    title: "Chia Friends",
    galleryId: "chia-friends",
    collectionId: "col1z0ef7w5n4vq9qkue67y8jnwumd9799sm50t8fyle73c70ly4z0ws0p2rhl",
  },
  {
    id: "trashformers",
    title: "Trashformers",
    galleryId: "trashformers",
    collectionId: "col1w6x4h73c8gzk4zvm9vwdmgxjhxrxnlnrfqhhh4psdtmd3dhqedaq8c5utz",
  },
  {
    id: "batgan",
    title: "BatGAN",
    galleryId: "batgan",
    collectionId: "col146kk92ny6vyeaypwqmp3q8lgep53r35fajgt9wvmhpnuq3xx4flqlfqzwl",
  },
];

const HEADERS = {
  Accept: "application/json",
  "User-Agent": "sethjenks-site-manifest/1.0",
};

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function edition(name) {
  const match = /#(\d+)/.exec(name);
  return match ? Number(match[1]) : Number.POSITIVE_INFINITY;
}

async function fetchPage(collectionId, page) {
  const url = new URL(
    `https://api.mintgarden.io/collections/${collectionId}/nfts`,
  );
  url.searchParams.set("size", "100");
  if (page) {
    url.searchParams.set("page", page);
  }

  let lastError = "request failed";
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const response = await fetch(url, { headers: HEADERS });
    if (response.status === 429 || response.status >= 500) {
      lastError = `${response.status}`;
      await sleep(400 * 2 ** attempt);
      continue;
    }
    if (!response.ok) {
      throw new Error(`${collectionId} ${response.status} ${url}`);
    }
    return response.json();
  }

  throw new Error(`${collectionId} retries exhausted (${lastError})`);
}

async function fetchCollection(entry) {
  const byId = new Map();
  let page = null;
  let pages = 0;

  while (pages < 200) {
    const data = await fetchPage(entry.collectionId, page);
    const items = Array.isArray(data.items) ? data.items : [];
    pages += 1;
    for (const item of items) {
      if (!item || item.is_blocked || typeof item.thumbnail_uri !== "string") {
        continue;
      }
      if (!item.thumbnail_uri.startsWith("https://")) {
        continue;
      }
      const name = typeof item.name === "string" && item.name.trim()
        ? item.name.trim()
        : entry.title;
      byId.set(item.id ?? item.thumbnail_uri, {
        name,
        src: item.thumbnail_uri,
      });
    }
    process.stdout.write(
      `${entry.id} page ${pages} total ${byId.size}\n`,
    );
    if (!data.next || items.length === 0 || data.next === page) {
      break;
    }
    page = data.next;
  }

  const items = [...byId.values()].sort((a, b) => {
    const delta = edition(a.name) - edition(b.name);
    return delta !== 0 ? delta : a.name.localeCompare(b.name);
  });

  return {
    id: entry.id,
    title: entry.title,
    galleryId: entry.galleryId,
    source: `MintGarden thumbnails for ${entry.collectionId}`,
    items,
  };
}

const CHIA_CHUNK_SIZE = 800;
const outDir = path.join(process.cwd(), "public", "collections");
await mkdir(outDir, { recursive: true });

const manifests = await Promise.all(COLLECTIONS.map((entry) => fetchCollection(entry)));

for (const manifest of manifests) {
  const pieces = manifest.items.map((item) => ({ name: item.name, src: item.src }));
  if (manifest.id === "chia-friends") {
    const dir = path.join(outDir, "chia-friends");
    await rm(path.join(outDir, "chia-friends.json"), { force: true });
    await mkdir(dir, { recursive: true });
    await writeFile(
      path.join(dir, "index.json"),
      JSON.stringify({
        title: manifest.title,
        count: pieces.length,
        chunkSize: CHIA_CHUNK_SIZE,
      }),
    );
    for (let start = 0; start < pieces.length; start += CHIA_CHUNK_SIZE) {
      const chunk = start / CHIA_CHUNK_SIZE;
      await writeFile(
        path.join(dir, `${chunk}.json`),
        JSON.stringify(pieces.slice(start, start + CHIA_CHUNK_SIZE)),
      );
    }
  } else {
    await writeFile(
      path.join(outDir, `${manifest.id}.json`),
      JSON.stringify({ title: manifest.title, items: pieces }),
    );
  }
  const sample = manifest.items[0]?.src ?? "";
  let bytes = 0;
  if (sample) {
    const head = await fetch(sample, { method: "HEAD", headers: HEADERS });
    bytes = Number(head.headers.get("content-length") ?? 0);
  }
  process.stdout.write(
    `${manifest.id} ${manifest.items.length} sample ${bytes} bytes ${sample}\n`,
  );
}
