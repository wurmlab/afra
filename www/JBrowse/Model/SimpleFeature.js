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
     * @param args.id {String} optional unique identifier. can also be in data.uniqueID.
     *
     * NOTE:
     *   args.data.subfeatures can be an array of these same args,
     *   which will be inflated to more instances of this class.
     */
    constructor: function( args ) {
        args = args || {};
        this.data = args.data || {};
        this._parent = args.parent;
        this._uniqueID = args.id || this.data.uniqueID || (
            this._parent ? this._parent.id()+'_'+(counter++) : 'SimpleFeature_'+(counter++)
        );

        // inflate any subfeatures that are not already feature objects
        var subfeatures;
        if(( subfeatures = this.data.subfeatures )) {
            for( var i = 0; i < subfeatures.length; i++ ) {
                if( typeof subfeatures[i].get != 'function' ) {
                    subfeatures[i] = new SimpleFeature(subfeatures[i]);
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

/**
 * Serialize a SimpleFeature object, including subfeatures if any, to JSON.
 *
 * NOTE:
 *   ids are not serialized. Actually, only `data` attribue of the feature
 *   is serialized.
 */
SimpleFeature.toJSON = function (feature) {
    return JSON.stringify(feature, function (key, value) {
        if (value && value.data) return value.data;
        return value;
    });
};

/**
 * Create SimpleFeature object from JSON string.
 *
 * NOTE:
 *   ids will differ from the original feature.
 */
SimpleFeature.fromJSON = function (featureJSON) {
    // Here parse function requires a string in input
    // But featureJSON is complete JSON and therefore 
    // we need to change JSON to string first and then 
    // parse it to save in to data. and create new feature
    // var data = JSON.parse(JSON.stringify(featureJSON));

    // var data = JSON.parse(featureJSON);
    // return new SimpleFeature({data: data});
    return new SimpleFeature(featureJSON);
};

return SimpleFeature;
});
