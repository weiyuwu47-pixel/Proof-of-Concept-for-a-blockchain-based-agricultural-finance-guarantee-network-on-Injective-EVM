const fs = require("fs");
const zlib = require("zlib");

const width = 1200;
const height = 520;
const pixels = Buffer.alloc(width * height * 4);

function clamp(value) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function setPixel(x, y, r, g, b, a = 255) {
  if (x < 0 || x >= width || y < 0 || y >= height) return;
  const index = (y * width + x) * 4;
  pixels[index] = clamp(r);
  pixels[index + 1] = clamp(g);
  pixels[index + 2] = clamp(b);
  pixels[index + 3] = clamp(a);
}

function rect(x, y, w, h, color) {
  for (let yy = y; yy < y + h; yy += 1) {
    for (let xx = x; xx < x + w; xx += 1) setPixel(xx, yy, ...color);
  }
}

function circle(cx, cy, radius, color) {
  const r2 = radius * radius;
  for (let y = cy - radius; y <= cy + radius; y += 1) {
    for (let x = cx - radius; x <= cx + radius; x += 1) {
      const d = (x - cx) * (x - cx) + (y - cy) * (y - cy);
      if (d <= r2) setPixel(x, y, ...color);
    }
  }
}

function line(x0, y0, x1, y1, color, thickness = 2) {
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  let x = x0;
  let y = y0;

  while (true) {
    circle(x, y, thickness, color);
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x += sx;
    }
    if (e2 < dx) {
      err += dx;
      y += sy;
    }
  }
}

function triangle(x1, y1, x2, y2, x3, y3, color) {
  const minX = Math.floor(Math.min(x1, x2, x3));
  const maxX = Math.ceil(Math.max(x1, x2, x3));
  const minY = Math.floor(Math.min(y1, y2, y3));
  const maxY = Math.ceil(Math.max(y1, y2, y3));
  const area = (x2 - x1) * (y3 - y1) - (y2 - y1) * (x3 - x1);
  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const w1 = ((x2 - x) * (y3 - y) - (y2 - y) * (x3 - x)) / area;
      const w2 = ((x3 - x) * (y1 - y) - (y3 - y) * (x1 - x)) / area;
      const w3 = 1 - w1 - w2;
      if (w1 >= 0 && w2 >= 0 && w3 >= 0) setPixel(x, y, ...color);
    }
  }
}

function crc32(buffer) {
  let c = 0xffffffff;
  for (let i = 0; i < buffer.length; i += 1) {
    c ^= buffer[i];
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])));
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function writePng(path) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (width * 4 + 1)] = 0;
    pixels.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }

  const header = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  fs.writeFileSync(path, Buffer.concat([
    header,
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0))
  ]));
}

for (let y = 0; y < height; y += 1) {
  const t = y / height;
  for (let x = 0; x < width; x += 1) {
    const mist = Math.sin((x / width) * Math.PI) * 14;
    setPixel(x, y, 222 - t * 72 + mist, 238 - t * 44, 222 - t * 110);
  }
}

rect(0, 310, width, 210, [95, 143, 92]);
for (let i = -120; i < width; i += 84) {
  triangle(i, 520, i + 150, 310, i + 300, 520, [118, 165, 89]);
  line(i + 54, 470, i + 198, 336, [224, 200, 116], 2);
}

rect(85, 254, 260, 120, [229, 239, 221]);
rect(105, 280, 220, 76, [177, 214, 197]);
triangle(70, 254, 215, 172, 360, 254, [64, 116, 87]);
for (let x = 125; x < 325; x += 32) line(x, 282, x + 72, 356, [239, 249, 241], 1);

rect(462, 208, 170, 166, [232, 226, 208]);
triangle(438, 208, 547, 128, 658, 208, [107, 83, 60]);
rect(522, 286, 54, 88, [78, 91, 103]);
rect(486, 242, 36, 34, [110, 151, 181]);
rect(588, 242, 36, 34, [110, 151, 181]);

rect(760, 214, 235, 160, [227, 232, 239]);
rect(784, 244, 188, 104, [171, 193, 212]);
triangle(742, 214, 877, 142, 1012, 214, [77, 95, 130]);
for (let x = 812; x < 950; x += 44) rect(x, 276, 24, 72, [69, 84, 106]);

const nodes = [
  [215, 190, [38, 105, 81]],
  [548, 152, [99, 72, 52]],
  [880, 168, [47, 83, 128]],
  [996, 320, [168, 104, 43]],
  [650, 414, [42, 117, 105]],
  [360, 354, [75, 94, 127]]
];

for (let i = 0; i < nodes.length; i += 1) {
  for (let j = i + 1; j < nodes.length; j += 1) {
    if ((i + j) % 2 === 0 || Math.abs(i - j) === 1) {
      line(nodes[i][0], nodes[i][1], nodes[j][0], nodes[j][1], [244, 248, 241, 118], 2);
    }
  }
}

nodes.forEach(([x, y, color]) => {
  circle(x, y, 30, [255, 255, 255, 210]);
  circle(x, y, 22, color);
  rect(x - 8, y - 8, 16, 16, [250, 252, 247]);
});

writePng("public/assets/agri-network-banner.png");
