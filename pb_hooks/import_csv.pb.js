$app.rootCmd.addCommand(
	new Command({
		use: 'import_csv',
		run: (cmd, args) => {
			if (args.length < 2) {
				console.log('Usage: pocketbase import_csv <path_to_file> <collection_name>')
				console.log('Example: pocketbase import_csv myfile.csv mycollection')
				console.log('Example: pocketbase import_csv ~/path/to/myfile.csv mycollection')
				console.log('Example: pocketbase import_csv myfile.tsv mycollection')
				console.log('Example: pocketbase import_csv myfile.txt mycollection')
				return
			}
			const collection_name = args[1]
            // check if collection exists
            try {
                $app.dao().findCollectionByNameOrId(collection_name)
                console.log(`collection ${collection_name} already exists`)
                return
            } catch (e_ok) {
                // collection doesn't exist -- this is good
            }
            console.log(`parsing file...${args[0]}`)
			const papa = require(`${__hooks}/papaparse.min.js`)
			// console.log(`${__hooks}`)
			const file = String.fromCharCode.apply(null, $os.readFile(args[0]))
			// console.log('file: ', file)
			const config = {
				dynamicTyping: true,
				header: true,
			}
			const r1 = papa.parse(file, config)

			// write a function to test whether a string is a valid  timestamptz
			const isTimestamp = (str) => {
				if (!str) return false
				if (typeof str !== 'string') str = str.toString()
				var match = str.match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})\.\d+$/)
				if (match) {
					var year = match[1],
						month = match[2],
						day = match[3],
						hour = match[4],
						minute = match[5],
						second = match[6]

					if (
						year.length === 4 &&
						month.length === 2 &&
						day.length === 2 &&
						hour.length === 2 &&
						minute.length === 2 &&
						second.length === 2
					) {
						return true
					}
				}
				return false
			}
			//write a function to test whether a string is a valid  datetime
			const isDateTime = (str) => {
				if (!str) return false
				if (typeof str !== 'string') str = str.toString()
				var match = str.match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/)
				if (match) {
					var year = match[1],
						month = match[2],
						day = match[3],
						hour = match[4],
						minute = match[5],
						second = match[6]
					if (
						year.length === 4 &&
						month.length === 2 &&
						day.length === 2 &&
						hour.length === 2 &&
						minute.length === 2 &&
						second.length === 2
					) {
						return true
					}
				}
				return false
			}
			const isDate = (str) => {
				if (!str) return false
				if (typeof str !== 'string') str = str.toString()
				var match = str.match(/^(\d{4})-(\d{2})-(\d{2})$/)
				if (match) {
					var year = match[1],
						month = match[2],
						day = match[3]
					if (year.length === 4 && month.length === 2 && day.length === 2) {
						return true
					}
				}
				return false
			}
			const isJSON = (str) => {
				if (!str) return false
				if (typeof str !== 'string') str = str.toString()
				try {
					JSON.parse(str)
				} catch (e) {
					return false
				}
				return true
			}
			const isEmail = (str) => {
				if (!str) return false
				if (typeof str !== 'string') str = str.toString()
				// check if str is a valid formatted email address
				// https://stackoverflow.com/questions/46155/how-to-validate-an-email-address-in-javascript
				const re = /\S+@\S+\.\S+/
				return re.test(str)
			}
			const analyzeRow = (fieldsHash, row) => {
				for (let key in row) {
					const value = row[key]
					const field =
						fieldsHash[key] ||
						(fieldsHash[key] = { typesFound: {}, sample: null, maxLength: 0, enabled: true })

					// Tally the presence of this field type
					const type = detectType(value)
					if (!field.typesFound[type]) field.typesFound[type] = 0
					field.typesFound[type]++

					// Save a sample record if there isn't one already (earlier rows might have an empty value)
					if (!field.sample && value) {
						field.sample = value
					}

					// Save the largest length
					field.maxLength = Math.max(field.maxLength, value ? value.length : 0)
				}
			}
			const detectType = (sample) => {
				if (!sample) return 'null'
				if (sample === '') {
					return 'null'
				} else if (isTimestamp(sample) && +sample >= 31536000) {
					return 'timestamp'
				} else if (isDate(sample)) {
					return 'date'
				} else if (isDateTime(sample)) {
					return 'datetime'
				} else if (!isNaN(sample) && sample.toString().indexOf('.') > -1) {
					return 'float'
				} else if (
					sample === '1' ||
					sample === '0' ||
					['true', 'false'].includes(sample.toString().toLowerCase())
				) {
					return 'boolean'
				} else if (!isNaN(sample)) {
					return 'integer'
				} else if (isJSON(sample)) {
					return 'json'
				} else if (isEmail(sample)) {
					return 'email'
				} else if (sample.length > 255) {
					return 'text'
				} else {
					return 'text' // string
				}
			}
			const analyzeRowResults = (fieldsHash) => {
				let fieldsArray = []
				for (let key in fieldsHash) {
					const field = fieldsHash[key]
					// Determine which field type wins
					field.type = determineWinner(field.typesFound)
					field.machineName = key
					// field.machineName = slug(key, {
					//   replacement: '_',
					//   lower: true
					// })
					field.sourceName = key
					// If any null values encountered, set field nullable
					if (field.typesFound['null']) {
						field.nullable = true
					}
					fieldsArray.push(field)
				}
				return fieldsArray
			}
			/**
			 *  Determine which type wins
			 *  - timestamp could be int
			 *  - integer could be float
			 *  - everything could be string
			 *  - if detect an int, don't check for timestamp anymore, only check for float or string
			 *  - maybe this optimization can come later...
			 */
			const determineWinner = (fieldTypes) => {
				const keys = Object.keys(fieldTypes)
				if (keys.length === 1) {
					return keys[0]
				} else if (fieldTypes.text) {
					return 'text'
				} else if (fieldTypes.string) {
					return 'string'
				} else if (fieldTypes.float) {
					return 'float'
				} else if (fieldTypes.bigint) {
					return 'bigint'
				} else if (fieldTypes.integer) {
					return 'integer'
				} else {
					// TODO: if keys.length > 1 then... what? always string? what about date + datetime?
					return fieldTypes[0]
				}
			}

			const toPBType = (type) => {
				switch (type) {
					case 'timestamp':
					case 'datetime':
					case 'date':
						return 'date'
					case 'integer':
					case 'bigint':
					case 'float':
						return 'number'
					case 'boolean':
						return 'boolean'
					case 'json':
						return 'json'
					case 'email':
						return 'email'
					case 'text':
					case 'string':
					case 'null':
						return 'text'
					default:
						return 'text'
				}
			}
            const checkForPBFieldNameCollisions = (name) => {
                const reserved = ['id', 'created', 'updated']
                if (reserved.includes(name.toLowerCase())) return `${name}_`
                else return name
            }
            console.log(`determining field types for ${collection_name}...`)
			const fieldsHash = {}
			let rowCount = 0
			r1.data.map((row) => {
				if (rowCount > 0) analyzeRow(fieldsHash, row)
				rowCount++
			})

            const fieldsArray = analyzeRowResults(fieldsHash)
			const columns = []

            for (let i = 0; i < fieldsArray.length; i++) {
				const column = fieldsArray[i]
				columns.push({
					name: checkForPBFieldNameCollisions(column.machineName),
					type: toPBType(column.type),
				})
			}
            
			// console.log('columns: ', JSON.stringify(columns, null, 2))

			// console.log(JSON.stringify(r1.data, null, 2))
			// return;

			//console.log('******************************************************')
			//console.log('fieldsArray', JSON.stringify(fieldsArray, null, 2));
            console.log(`creating collection ${collection_name}...`)

            let collection;
			collection = new Collection({
				// the id is autogenerated, but you can set a specific one if you want to
				// id:      "...",
				name: collection_name,
				type: 'base',
				listRule: null,
				viewRule: null,
				createRule: null,
				updateRule: null,
				deleteRule: null,
				schema: [], //fields,
				// indexes: [
				//     "CREATE UNIQUE INDEX idx_user ON example (user)"
				// ],
				// options: {}
			})
			// loop through the columns here
			for (let i = 0; i < columns.length; i++) {
				const column = columns[i]
				// add new field
				collection.schema.addField(
					new SchemaField({
						name: column.name,
						type: column.type,
					})
				)
			}
			$app.dao().saveCollection(collection)

            console.log(`loading data into ${collection_name}...`)

            // load the data
			$app.dao().runInTransaction((txDao) => {
				for (let i = 0; i < r1.data.length; i++) {
					if (Object.keys(r1.data[i]).length === columns.length) {
						txDao.saveRecord(new Record(collection, r1.data[i]))
                        if (i % 5000 === 0 && i > 0) console.log(`loaded ${i} rows`)
                    }
					else {
						console.log(
							`skipping row ${i + 1} because it has ${
								Object.keys(r1.data[i]).length
							} columns instead of ${columns.length}`
						)
					}
				}
			})
            console.log(`done loading data into ${collection_name}...`)
		},
	})
)
