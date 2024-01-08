# pb-import (Pocketbase Import)

A set of Pocketbase command-line hooks to enable data import directly into your Pocketbase project's database.

## SQLite: Import SQLite Databases

Import an existing SQLite database on disk into the current Pocketbase project.  You can import all the tables in the external database (the default) or provide an optional list of tables to be imported.  One collection is created for each table using very basic data types, then data is imported from the external SQLite database into your Pocketbase database (`pb_data/data.db`).

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

### notes and warnings

- This utility only does a very basic data import.  It doesn't handle relations, indexes, or anything fancy at this point, it's just creating the basic collection and inserting data into the collection using `insert into table (fields) select (fields) from external_database.table`.
- It's only handling very basic field types at this point, and if your SQLite database is using field types that aren't native to Pocketbase, you'll have to change those, or make a PR request here to help us map different SQLite datatypes to their corresponding Pocketbase types.  For example, we convert INTEGER or any type of INT to `numeric` and CHAR and VARCHAR types to `text`.
- Pocketbase doesn't like nulls, so we're currently converting any null numerics to `-1` and any null text fields to an empty string `''`.
- Comments and PRs are welcome.
