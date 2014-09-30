Sequel.migration do
  up do
    create_table :ref_seqs  do

      foreign_key :genome_id, :genomes,
        null:      false,
        on_delete: :cascade

      # Sequence id from GFF file.
      #
      # seq_id is only guaranteed to be unique per GFF file. Yet it is
      # important for us that seq_id be the primary key, and hence be
      # globally unique - unique across all GFF files we receive.
      #
      # To ensure seq_id is globally unique we will pre-process incoming GFF
      # before importing, via tools like `gt`, so that seq_id becomes MD5 of
      # the reference sequence. We could add another column to track the
      # original seq_id.
      String      :seq_id,
        null:        false,
        primary_key: true

      Integer     :length,
        null:      false
    end
  end

  down do
    drop_constraint_validations_for table: :ref_seqs
    drop_index :ref_seqs, :seq_id
    drop_table :ref_seqs
  end
end
