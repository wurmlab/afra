require 'minitest/spec'
require_relative '../../services/importer'

describe "Overlap detection" do

  def data
    @data ||= {ref: 'test_ref',
     ids:               [1, 2, 3, 4, 5, 6, 7],
     start_coordinates: [10, 30, 40, 50, 100, 110, 130],
     end_coordinates:   [20, 70, 60, 80, 150, 120, 140]
    }
  end

  def overlaps
    @groups ||=
      Importer.new('data/annotations/Solenopsis_invicta/Si_gnF.gff').call_overlaps(data)
  end

  it "should work" do
    assert overlaps.length == 3

    assert overlaps[0][:ids].length == 1
    assert overlaps[0][:start] == 10
    assert overlaps[0][:end]   == 20

    assert overlaps[1][:ids].length == 3
    assert overlaps[1][:start] == 30
    assert overlaps[1][:end]   == 80

    assert overlaps[2][:ids].length == 3
    assert overlaps[2][:start] == 100
    assert overlaps[2][:end]   == 150
  end
end
