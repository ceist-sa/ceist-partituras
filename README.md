# Partituras CEIST

The sheet music of CEIST for its members, at [partituras.ceist.pt](https://partituras.ceist.pt): seasons,
their programs, the pieces of each program and the parts of each piece. A member picks an instrument once
and gets their own parts first, plus a ZIP with all of them for a program.

Nothing is stored here. The site puts together two sources:

- **Notion** says what is played when. Each piece of the "Repertório" database is related to its programs
  ("Programas", with a season and dates) and has a "Partituras" link.
- **GitHub** has the files. When the link of a piece is a folder of
  [ceist-sa/Repertorio](https://github.com/ceist-sa/Repertorio), its PDFs (or the ones in its `partes`) are
  listed. Any other link, such as a shared folder, is shown as a button to open it.

## Adding sheet music

1. Push the PDFs to the repository, named by its convention: `INSTRUMENT - Composer - Work.pdf`, in a
   folder `Composer - Work/partes`. In brackets goes who else the part is for:
   `FRENCH HORN I (CLARINET Bb)` shows up for horns and for clarinets.
2. In Notion, paste the link of the folder into "Partituras" of the piece and relate the piece to its
   program.

The site notices within five minutes. Instruments are recognised in English and in Portuguese
(`src/lib/parts.ts`, with the names shown to the members); a part naming no known instrument is listed
under the piece but belongs to no instrument.

## Development

```sh
bun install
bun run dev      # without NOTION_TOKEN, uses the sample repertoire in src/lib/server/sample.json
bun run check
bun test
```

Copy `.env.example` to `.env` to read the real Notion. The integration needs access to both databases
(in Notion: ••• on the database, Connections).

## Deployment

Pushing to `main` builds `ghcr.io/ceist-sa/ceist-partituras:main`. On the server it runs as a Komodo
Stack from `docker-compose.yaml`, with the variables of `.env.example` and behind caddy-docker-proxy.
