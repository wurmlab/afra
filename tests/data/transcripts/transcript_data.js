define([
        './input_1',
        './input_2',
        './input_3',
        './input_4',
        './input_5',
        './input_6',
        './input_7',
        './input_8',
        './input_9',
        './resize_1',
        './resize_2',
        './resize_3',
        './resize_4',
        './orf_1',
        './orf_2',
        './cds_1',
        './merge_1',
        './normalize_1'
        ], function (
            input_1,
            input_2,
            input_3,
            input_4,
            input_5,
            input_6,
            input_7,
            input_8,
            input_9,
            resize_1,
            resize_2,
            resize_3,
            resize_4,
            orf_1,
            orf_2,
            cds_1,
            merge_1,
            normalize_1
            ) {
var transcript_data = {
    "input": [input_1, input_2, input_3, input_4, input_5, input_6, input_7,
                input_8],
    "resize": [resize_1, resize_2, resize_3, resize_4],
    "orf": [orf_1, orf_2],
    "cds": [cds_1],
    "merge": [merge_1],
    "normalize": [normalize_1]

};
return transcript_data;
});
