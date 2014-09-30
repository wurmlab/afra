Sequel.migration do
  up do
    create_table :features do

      primary_key :id

      foreign_key :ref_seq_id, :ref_seqs,
        null:      false,
        type:      String,
        on_delete: :cascade

      String      :source,
        null:      false

      String      :name,
        null:      false

      String      :type,
        null:      false

      Integer     :start,
        null:      false,
        index:     true

      Integer     :end,
        null:      false

      Integer     :strand,
        null:      false

      column      :subfeatures, :json,
        default:   Sequel.pg_json({})
    end
  end

  down do
    drop_constraint_validations_for table: :features
    drop_index :features, :start
    drop_table :features
  end
end
