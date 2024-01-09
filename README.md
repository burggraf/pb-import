# pb-import (Pocketbase Import)

A set of Pocketbase command-line hooks to enable data import directly into your Pocketbase project's database.

- **CSV**: Any delimited file of any type, including CSV (comma separated values), TSV (tab separated values), including files with different column and row delimiters
- **SQLite**: SQLite-compatible databases

## CSV: Delimited Files (CSV, TSV, TXT)

Import an existing text file containing records in a delimited format into a new collection in your current Pocketbase project.  The file must have a single header record containing the field names for each row in the file.

The file is parsed and analyzed to determine an appropriate data type for each field, then the collection is created, and then data is loaded into the collection.

- Start `pocketbase serve` if it's not already running
    - example: `pocketbase serve --http 0.0.0.0:8090`
- Copy `import_csv.pb.js` into the `pb_hooks` folder of your project
    - (create the `pb_hooks` folder first if it doesn't exist)
- Run `import_csv <path_to_file> <collection_name>`

### examples
```
pocketbase import_csv myfile.csv mycollection
pocketbase import_csv ~/path/to/myfile.csv mycollection
pocketbase import_csv myfile.tsv mycollection
pocketbase import_csv myfile.txt mycollection
```

### notes and warnings
- Any field names that conflict with standard Pocketbase system fields (id, created, updated) will be imported, but an underscore will be added to the field name (id_, created_, updated_).
- Very large files may take a while to parse, as we go through every column of every record in the file to determine the appropriate data type. 

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
