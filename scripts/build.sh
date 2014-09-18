#!/bin/bash
# This builds afra and the db (TODO: The database stuff should be decoupled from the actual app build).

# Allow bower to run with root (TODO: This could be avoided by running the build without root)
sed -e 's/bower install/bower install --allow-root/' package.json > package.json.sed && mv package.json.sed package.json

# Small change to get ports forward working (TODO: This might become deprecated with changes in docker/boot2docker)
sed -e 's|tcp://localhost:9292|tcp://0.0.0.0:9292|' app.rb > app.rb.sed && mv app.rb.sed app.rb

# Avoid postgreSQL password prompt
sed -e 's|\(.*128.*\)md5|\1trust|' /etc/postgresql/9.3/main/pg_hba.conf > pg_hba.conf && mv pg_hba.conf /etc/postgresql/9.3/main/pg_hba.conf

# Start postgreSQL
service postgresql start

# Build afra, fist time fails because can't find gems although they are installed (TODO: a Ruby dev should check this).
# second time works but asks for facebook id and token, so we just give the string 'yes' to move forward.
rake
yes|rake

rake import\[data/gene/Solenopsis\ invicta/Si_gnF.gff\]
