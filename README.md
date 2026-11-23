# PACKET ROUTER // NOC Tactical Puzzle

[![Play Live Demo](https://img.shields.io/badge/LIVE_DEMO-PLAY_NOW-00E5FF?style=for-the-badge&labelColor=0B0E14)](https://nplwi.github.io/packet-router/)

> **Play directly in your browser:** https://nplwi.github.io/packet-router/

A browser-based tactical cybersecurity & network engineering puzzle game built with **React**, **TypeScript**, **Tailwind CSS**, and **Vite**.

## Architecture & Technical Highlights

### 1. Grid as a Directed Graph (`src/engine/routerEngine.ts`)
- Each tile `(row, col)` on the `N x M` patch matrix exposes cardinal ports (`'N' | 'E' | 'S' | 'W'`) derived from its `pipeType` (`STRAIGHT`, `ELBOW`, `TEE`, `CROSS`, `BRIDGE`) and clockwise `rotation` (`0 | 90 | 180 | 270`).
- Neighbor connectivity is validated symmetrically: traversing from tile $A$ in direction $d$ succeeds only if tile $B$ in direction $d$ exposes the opposite port $\bar{d}$.
- `BRIDGE` tiles implement isolated overpasses (`N ↔ S` and `E ↔ W` without cross-connection), allowing concurrent multi-packet streams to cross paths cleanly.

### 2. Packet State Machine & BFS Traversal
- Packet routing is evaluated via Breadth-First Search over the state space `(row, col, incomingDir, encrypted)`:
  - **`DECRYPTOR` (SSL/TLS Offloader):** Transitions packet state from `encrypted: true` to `encrypted: false`.
  - **`FIREWALL` (DPI Filter):** Enforces rules (`DECRYPTED_ONLY` / `AUTH_ONLY`) and drops violating packets (`ERR_ENCRYPTED_PAYLOAD_REJECTED`).
  - **`MALWARE` (Honeypot):** Any connected branch reaching a compromised node immediately fails transmission (`ERR_MALWARE_INTERCEPTED`).
  - **`PRIORITY` Packets:** Enforce a strict Time-To-Live (`maxHops`) budget (`ERR_TTL_EXCEEDED`).

### 3. Extensible Level Schema (`src/data/levels.json`)
- Levels are declarative JSON objects specifying `rows`, `cols`, `maxMoves`, `timeLimit`, `packets[]`, and `tiles[]`.
- Progress and star ratings are persisted locally in `localStorage`.

## Development & Deployment

```bash
# Start local dev server
npm run dev

# Type-check and build for production
npm run build

# Lint codebase
npm run lint
```

Configured with `base: '/packet-router/'` in `vite.config.ts` and automated deployment via `.github/workflows/deploy.yml` to GitHub Pages.
