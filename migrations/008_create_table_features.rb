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

      # Same as ID attribute in GFF3.
      String      :name,
        null:      false

      String      :type,
        null:      false

      Integer     :start,
        null:      false,
        index:     true

      Integer     :end,
        null:      false

      String      :strand,
        null:      false

      # Array of Hash objects.
      # [
      #   {
      #     name:   ...,
      #     type:   ...,
      #     start:  ...,
      #     end:    ...,
      #     strand: ...,
      #   }
      # ]
      column      :subfeatures, :json,
        default:   Sequel.pg_json([])
    end
  end

  down do
    drop_constraint_validations_for table: :features
    drop_index :features, :start
    drop_table :features
  end
end
