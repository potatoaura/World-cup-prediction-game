# World Cup Cloudflare Version

## Cloudflare Pages settings
Framework preset: None
Build command: empty
Build output directory: public

## D1 setup
Create D1 database named worldcup_db.

Run schema.sql, then seed.sql in D1 Console.

Pages project → Settings → Functions → D1 bindings:
Variable name: DB
Database: worldcup_db

Environment variable:
ADMIN_CODE = your secret admin code

First admin: register and enter ADMIN_CODE in optional admin code field.
