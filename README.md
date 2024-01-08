# pb-import (Pocketbase Import)

A set of Pocketbase command-line hooks to enable data import directly into your Pocketbase project's database.

## SQLite

Import an existing SQLite database on disk into the current Pocketbase project.

- Start `pocketbase serve` if it's not already running
    - example: `pocketbase serve --http 0.0.0.0:8090`
- Copy `import_sqlite.pb.js` into the `pb_hooks` folder of your project
    - (create the `pb_hooks` folder first if it doesn't exist)
- Run `import_sqlite <externalDB> [table_list]`

### examples

Import all the tables in my SQLite database:

`pocketbase import_sqlite /Users/myusername/externalDB.sqlite`

Import just the tables named `people` and `places` from my database:

`pocketbase import_sqlite /Users/myusername/externalDB.sqlite "'people','places'"`
