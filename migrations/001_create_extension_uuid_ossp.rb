Sequel.migration do
  up do
    run 'CREATE EXTENSION IF NOT EXISTS "uuid-ossp"'
  end

  down do
    run 'DROP EXTENSION IF EXISTS "uuid-ossp"'
  end
end
