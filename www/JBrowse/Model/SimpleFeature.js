/**
 * Simple implementation of a feature object.
 */
define([
        'JBrowse/Util'
       ],
       function( Util ) {

var counter = 0;

var SimpleFeature = Util.fastDeclare({

    /**
     * @param args.data {Object} key-value data, must include 'start' and 'end'
     * @param args.parent {Feature} optional parent feature
     * @param args.id {String} optional unique identifier.  can also be in data.uniqueID.
     *
     * Note: args.data.subfeatures can be an array of these same args,
     * which will be inflated to more instances of this class.
     */
    constructor: function( args ) {
        args = args || {};
        this.data = args.data || {};
        this._parent = args.parent;
        this._uniqueID = args.id || this.data.uniqueID || (
            this._parent ? this._parent.id()+'_'+(counter++) : 'SimpleFeature_'+(counter++)
        );

        //console.log(args);
        //console.log(this._uniqueID);
        // inflate any subfeatures that are not already feature objects
        var subfeatures;
        if(( subfeatures = this.data.subfeatures )) {
            for( var i = 0; i < subfeatures.length; i++ ) {
                if( typeof subfeatures[i].get != 'function' ) {
                    subfeatures[i] = new SimpleFeature(
                        { data: subfeatures[i],
                          parent: this
                        });
                }
            }
        }
    },

    /**
     * Get a piece of data about the feature.  All features must have
     * 'start' and 'end', but everything else is optional.
     */
    get: function(name) {
        return this.data[ name ];
    },

    /**
     * Set an item of data.
     */
    set: function( name, val ) {
        this.data[ name ] = val;
    },

    /**
     * Get an array listing which data keys are present in this feature.
     */
    tags: function() {
        var t = [];
        var d = this.data;
        for( var k in d ) {
            if( d.hasOwnProperty( k ) )
                t.push( k );
        }
        return t;
    },

    /**
     * Get the unique ID of this feature.
     */
    id: function( newid ) {
        if( newid )
            this._uniqueID = newid;
        return this._uniqueID;
    },

    /**
     * Get this feature's parent feature, or undefined if none.
     */
    parent: function() {
        return this._parent;
    },

    /**
     * Get an array of child features, or undefined if none.
     */
    children: function() {
        return this.get('subfeatures');
    }

});

SimpleFeature.toJSON = function (transcript) {
    return JSON.stringify(transcript, function (key, value) {
        if (key === '_parent' || key === '_uniqueID' ||  key === '__proto__') return;
        return value;
    });
};

// Directly constructing a transcript out of parsed JSON data
// results in a duplicated level of nesting inside array of
// SimpleFeature objects.
//
// To avoid that, we:
// * save the subfeatures array data from the parsed data,
// * generate the full transcript and delete the incorrect portion,
// * generate SimpleFeature objects from saved array and insert
//   them back into the transcript,
// * return the corrected transcript.
SimpleFeature.fromJSON = function (featureJSON) {

    var subfeatures = featureJSON.data.subfeatures;
    delete featureJSON.data.subfeatures;
    var feature = new SimpleFeature(featureJSON);
    subfeatures = _.map(subfeatures, function (f) {
        f.parent = feature;
        return new SimpleFeature(f);
    });
    if(!_.isEmpty(subfeatures))
        feature.set('subfeatures', subfeatures);
    return feature;
};

return SimpleFeature;
});
