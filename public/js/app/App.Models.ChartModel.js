;(function() {
	"use strict";
	owid.namespace("App.Models.ChartModel");

	App.Models.ChartModel = Backbone.Model.extend( {

		//urlRoot: Global.rootUrl + '/charts/',
		//urlRoot: Global.rootUrl + '/data/config/',
		url: function(id) {
			id = id || this.id;
			if( $("#form-view").length ) {
				if( id ) {
					//editing existing
					return Global.rootUrl + "/charts/" + id;
				} else {
					//saving new
					return Global.rootUrl + "/charts";
				}

			} else {
				// Pass any query parameters on to config
				return Global.rootUrl + "/data/config/" + id + window.location.search;
			}
		},

		defaults: {
			"chart-name": "",
			"chart-subname": "",
			"chart-slug": "",
			"chart-notes": "",
			"chart-type": App.ChartType.LineChart,
			"published": false,
			// A range of form e.g. [0, 2015] with null meaning "all of it"
			"chart-time": null,
			"cache": true,
			"selected-countries": [], // e.g. [{id: "1", name: "United Kingdom"}]
			"tabs": [ "chart", "data", "sources" ],
			"default-tab": "chart",
			"line-type": 0,
			"line-tolerance": 1,
			"chart-description": "",
			"chart-dimensions": "[]",
			"variables": [],
			"y-axis": {"axis-label-distance":"-10"},
			"x-axis": {},
			"margins": { top: 10, left: 60, bottom: 10, right: 10 },
			"units": "",
			"logo": "uploads/26538.png",
			"second-logo": null,
			"iframe-width": "100%",
			"iframe-height": "660px",
			"hide-legend": false,
			"entity-type": "country",
			"group-by-variables": false,
			"add-country-mode": "add-country",
			"x-axis-scale-selector": false,
			"y-axis-scale-selector": false,
			"map-config": {
				"variableId": -1,
				"targetYear": 1980,
				"targetYearMode": "normal",
				"defaultYear": 1980,
				"mode": "specific",
				"timeTolerance": 1,
				"minYear": 1980,
				"maxYear": 2000,
				// timeRanges is a collection of objects specifying year ranges e.g.
				//
				// [
				//   { year: 1980 },
				//   { startYear: 1990, endYear: 2000, interval: 5 },
				//   { startYear: 2005, endYear: 2008 }
				// ]
				//
				// Produces the years: 1980, 1990, 1995, 2000, 2005, 2007, 2008
				"timeRanges": [],
				"timelineMode": "timeline",
				"colorSchemeName": "BuGn",
				"colorSchemeValues": false,
				"colorSchemeLabels": [],
				"colorSchemeValuesAutomatic": true,
				"colorSchemeInterval": 5,
				// Whether to reverse the color scheme on output
				"colorSchemeInvert": false,
				"colorSchemeMinValue": null,
				// e.g. ["#000", "#c00", "#0c0", "#00c", "#c0c"]
				"customColorScheme": [],
				"isColorblind": false,
				"projection": "World",
				"defaultProjection": "World",
				"legendDescription": "",
				"legendStepSize": 20,
				"legendOrientation": "portrait",
			}
		},

		// Get defaults appropriate for this kind of chart
		getDefaults: function(chartType) {
			chartType = chartType || App.ChartModel.get("chart-type");
			var defaults = _.clone(this.defaults);

			if (chartType == App.ChartType.ScatterPlot) {
				_.extend(defaults, {
					"hide-legend": true
				});
			}

			return defaults;
		},

		getDefault: function(key) {
			return this.getDefaults()[key];
		},

		hasChangedFromDefault: function(key) {
			return this.get(key) != this.getDefault(key);
		},

		initialize: function() {
			this.on("sync", this.onSync, this);
			this.on("change:chart-type", this.onChangeType, this);
			$(document).trigger("chart-model");
		},

		// When the chart type is changed, we update values to the new defaults
		// Unless those values have been altered by the user
		onChangeType: function() {
			var oldDefaults = this.getDefaults(this.previous("chart-type")),
				newDefaults = this.getDefaults(),
				changes = {};

			_.each(newDefaults, function(value, key) {
				var current = this.get(key);
				if (current == oldDefaults[key] && current != newDefaults[key])
					changes[key] = newDefaults[key];
			}.bind(this));

			console.log(changes);

			if (!_.isEmpty(changes)) this.set(changes);
		},


		onSync: function() {
			if( this.get( "chart-type" ) == App.ChartType.ScatterPlot ) {
				//make sure for scatter plot, we have color set as continents
				var chartDimensions = this.getDimensions();
				if( !_.findWhere( chartDimensions, { "property": "color" } ) ) {
					//this is where we add color property
					var colorPropObj = { "variableId":"123","property":"color","unit":"","name":"Color","period":"single","mode":"specific","targetYear":"2000","tolerance":"5","maximumAge":"5"};
					chartDimensions.push( colorPropObj );
					var charDimensionsString = JSON.stringify( chartDimensions );
					this.set( "chart-dimensions", charDimensionsString );
				}
			}			
		},

		getSelectedEntitiesById: function() {
			var entities = {};

			_.each(App.ChartModel.get("selected-countries"), function(entity) {
				entities[entity.id] = entity;
			});

			return entities;
		},

		addSelectedCountry: function( country ) {
			var selectedCountries = this.get( "selected-countries" );

			//make sure the selected contry is not there 
			if( !_.findWhere( selectedCountries, { id: country.id } ) ) {
				selectedCountries.push( country );
				//selectedCountries[ country.id ] = country;
				this.trigger( "change:selected-countries" );
				this.trigger( "change" );
			}
		},

		updateSelectedCountry: function(countryId, color) {
			var country = this.findCountryById(countryId);
			if (country) {
				country.color = color;
				this.trigger("change:selected-countries");
				this.trigger("change");
			}
		},

		removeSelectedCountry: function(entityName) {
			var selectedCountries = this.get("selected-countries");
			var entity = _.findWhere(selectedCountries, { name: entityName });
			if (!entity) return;

			selectedCountries = _.filter(selectedCountries, function(entity) {
				return entity.name != entityName;
			});

			this.set("selected-countries", selectedCountries);
		},

		replaceSelectedCountry: function(country) {
			if (country) {
				this.set("selected-countries", [country]);
			}
		},

		findCountryById: function(countryId) {
			var selectedCountries = this.get( "selected-countries" ),
				country = _.find(selectedCountries, function(entity) {
					return entity.id == countryId;
				});
			return country;
		},

		setAxisConfig: function( axisName, prop, value ) {
			if( $.isArray( this.get( "y-axis" ) ) ) {
				//we got empty array from db, convert to object
				this.set( "y-axis", {} );
			}
			if( $.isArray( this.get( "x-axis" ) ) ) {
				//we got empty array from db, convert to object
				this.set( "x-axis", {} );
			}

			var axis = this.get( axisName );
			if( axis ) {
				axis[ prop ] = value;
			}
			this.trigger( "change" );
		},

		getAxisConfig: function(axisName, prop) {
			var axis = this.get(axisName);
			if (axis) return axis[prop];
		},

		updateMapConfig: function(propName, propValue, silent, eventName) {
			var mapConfig = this.get("map-config");

			if (!_.has(this.defaults["map-config"], propName))
				console.warn("No defined default for map config property '" + propName + "'");

			//if changing colorschem interval and custom colorscheme is used, update it
			if (propName === "colorSchemeInterval" && mapConfig.colorSchemeName === "custom")
				mapConfig.customColorScheme = mapConfig.customColorScheme.slice( 0, propValue );

			mapConfig[propName] = propValue;

			if (!silent)
				this.trigger(eventName || "change");
		},

		isNew: function() {
			return !this.get("id");
		},

		hasVariables: function() {
			return !_.isEmpty(this.getDimensions());
		},

		// Get the empty dimension slots appropriate for this type of chart
		getEmptyDimensions: function() {
			var chartType = this.get("chart-type");

			var xAxis = { property: 'x', name: 'X axis', },
				yAxis = { property: 'y', name: 'Y axis', },
				color = { property: 'color', name: 'Color' },
				shape = { property: 'shape', name: 'Shape' },
				size = { property: 'size', name: 'size' };

			if (chartType == App.ChartType.ScatterPlot)
				return [xAxis, yAxis, size, shape, color];
			else
				return [yAxis];
		},

		// Get chart dimensions, ensuring we return only those appropriate for the type
		getDimensions: function() {
			var dimensionsString = this.get("chart-dimensions");
			if (!dimensionsString) return [];
			var dimensions = JSON.parse(dimensionsString),
				validProperties = _.pluck(this.getEmptyDimensions(), 'property'),
				validDimensions = _.filter(dimensions, function(dim) { return _.include(validProperties, dim.property); });

			return validDimensions;
		}
	} );

})();