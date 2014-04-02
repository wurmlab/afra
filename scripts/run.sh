#!/bin/bash
# Start postgreSQL
service postgresql start

# Start afra
ruby -r ./app.rb -e 'App.serve'
