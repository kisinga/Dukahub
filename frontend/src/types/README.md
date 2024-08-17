# HOW TO GENERATE TYPES

We use <https://github.com/patmood/pocketbase-typegen> to generate types for our database.

Navigate to the runnning instnce of the pocketbase instance ==> Settings ==> Export collections
Example <https://pantrify.azurewebsites.net/_/?#/settings/export-collections>

Copy the json to the root of the project ==> models and run this command

```bash
npx pocketbase-typegen --json ../../../models/pb_schema.json --out pocketbase-types.ts
```

Or from root of frontend

```bash
npx pocketbase-typegen --json ../models/pb_schema.json --out ./src/types/pocketbase-types.ts
```
