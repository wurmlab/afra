#!/bin/bash
# This builds afra and the db (TODO: The database stuff should be decoupled from the actual app build).

# Add config using environmental variables (TODO: This could be avoided if app used env vars directly in config code)
echo -e "session_secret: $SESSION_SECRET\nfacebook_app_id: $FACEBOOK_APP_ID\nfacebook_app_secret: $FACEBOOK_APP_SECRET" > env.yml

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

# Other build steps (TODO: Aren't some of these done in the rake step? If not, shouldn't they be added to the Rakefile?)
ruby -r ./app.rb -e 'App.migrate'
ruby -r ./app.rb -e 'App.gff2jbrowse'
ruby -r ./app.rb -e 'App.register_features'
ruby -r ./app.rb -e 'App.create_tasks'
