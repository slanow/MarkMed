<p align="center"><img src="packages/desktop/static/icon.png" alt="MarkMed" width="120" height="120"></p>

<h1 align="center">MarkMed</h1>

<div align="center">
  <strong>Open-source Markdown editor based on MarkText</strong><br>
  A clean, fast, distraction-free WYSIWYG Markdown editor for Linux, Windows and macOS.
</div>

<br>

<div align="center">
  <a href="LICENSE">
    <img src="https://img.shields.io/github/license/slanow/MarkMed.svg" alt="MIT License">
  </a>
</div>

---

## About

**MarkMed** is an open-source fork of [MarkText](https://github.com/marktext/marktext), licensed under the [MIT License](LICENSE).

### Features

- Realtime preview (WYSIWYG) with distraction-free Focus and Typewriter modes, plus Source Code mode
- CommonMark and GitHub Flavored Markdown (tables, task lists, alerts, emojis)
- Math expressions (KaTeX), Mermaid diagrams, Flowchart, Sequence and PlantUML
- Portable mode support (`markmed-user-data` next to the portable executable or AppImage)
- Export to HTML and PDF

## Development

Requires **Node.js >= 22.12.0** and **pnpm >= 10**.

```sh
pnpm install
pnpm run dev
```

### Build

```sh
# Build unpacked desktop bundle
pnpm run build:unpack

# Build platform packages (outputs to dist/)
pnpm run build:linux
pnpm run build:win
pnpm run build:mac
```

## License

[MIT](LICENSE) — based on [MarkText](https://github.com/marktext/marktext).
