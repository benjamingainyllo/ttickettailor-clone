# Landing page design directions

Source for the design canvas at
https://claude.ai/code/artifact/183d859d-cca0-40e6-ae04-c5eea38e48fc

Three full landing pages, exploring which visual world the site should live
in. The problem they answer: the live page is currently two worlds with a
hard cut between them — a dark photographic hero, then bright paper cards,
with nothing carrying across.

| Artboard | Direction |
|---|---|
| `Main.dc.html` | **C — The bridge.** Both worlds, with the joins designed: the photo dissolves into paper, the ticket card straddles the boundary, a strip of the room reintroduces the dark money band. The leading candidate. |
| `DirectionA.dc.html` | **A — Commit to the night.** Dark throughout, photo bookends, neon accents. Most personality; hardest to read at length, and may read unserious to a conference organiser. |
| `DirectionB.dc.html` | **B — Commit to paper.** No photography at all, illustrated blocks everywhere. Friendliest; throws away the room. |

All three use the real `.lp` tokens from `app/globals.css` — coral #FF6A45,
marker #FFDE59, mint #9BE3C0, plum #241430, paper #FDF8F0, ink #1B1512 —
with Bricolage Grotesque and Instrument Serif italic, the 2px borders,
offset shadows and hand-placed tilts. Nothing here invents a new colour.

`crowd.jpg` is the hero photo at canvas weight (900px, 52KB). The full-size
one the site actually serves is `public/hero-crowd.jpg`.

The published canvas is assembled from these files; the assembled output is
about 2.5MB and is gitignored, since it regenerates from what's here.
