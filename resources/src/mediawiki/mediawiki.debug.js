( function ( mw, $ ) {
	'use strict';

	var debug,
		hovzer = $.getFootHovzer();

	/**
	 * Debug toolbar.
	 *
	 * Enabled server-side through `$wgDebugToolbar`.
	 *
	 * @class mw.Debug
	 * @singleton
	 * @author John Du Hart
	 * @since 1.19
	 */
	debug = mw.Debug = {
		/**
		 * Toolbar container element
		 *
		 * @property {jQuery}
		 */
		$container: null,

		/**
		 * Object containing data for the debug toolbar
		 *
		 * @property {Object}
		 */
		data: {},

		/**
		 * Initialize the debugging pane
		 *
		 * Shouldn't be called before the document is ready
		 * (since it binds to elements on the page).
		 *
		 * @param {Object} [data] Defaults to 'debugInfo' from mw.config
		 */
		init: function ( data ) {

			this.data = data || mw.config.get( 'debugInfo' );
			this.buildHtml();

			// Insert the container into the DOM
			hovzer.$.append( this.$container );
			hovzer.update();

			$( '.mw-debug-panelink' ).click( this.switchPane );
		},

		/**
		 * Switch between panes
		 *
		 * Should be called with an HTMLElement as its thisArg,
		 * because it's meant to be an event handler.
		 *
		 * TODO: Store cookie for last pane open.
		 *
		 * @param {jQuery.Event} e
		 */
		switchPane: function ( e ) {
			var currentPaneId = debug.$container.data( 'currentPane' ),
				requestedPaneId = $( this ).prop( 'id' ).substr( 9 ),
				$currentPane = $( '#mw-debug-pane-' + currentPaneId ),
				$requestedPane = $( '#mw-debug-pane-' + requestedPaneId ),
				hovDone = false;

			function updateHov() {
				if ( !hovDone ) {
					hovzer.update();
					hovDone = true;
				}
			}

			// Skip hash fragment handling. Prevents screen from jumping.
			e.preventDefault();

			$( this ).addClass( 'current ' );
			$( '.mw-debug-panelink' ).not( this ).removeClass( 'current ' );

			// Hide the current pane
			if ( requestedPaneId === currentPaneId ) {
				$currentPane.slideUp( updateHov );
				debug.$container.data( 'currentPane', null );
				return;
			}

			debug.$container.data( 'currentPane', requestedPaneId );

			if ( currentPaneId === undefined || currentPaneId === null ) {
				$requestedPane.slideDown( updateHov );
			} else {
				$currentPane.hide();
				$requestedPane.show();
				updateHov();
			}
		},

		/**
		 * Construct the HTML for the debugging toolbar
		 */
		buildHtml: function () {
			var $container, $bits, panes, id, gitInfo;

			$container = $( '<div id="mw-debug-toolbar" class="mw-debug" lang="en" dir="ltr"></div>' );

			$bits = $( '<div class="mw-debug-bits"></div>' );

			/**
			 * Returns a jQuery element for a debug-bit div
			 *
			 * @ignore
			 * @param {string} id
			 * @return {jQuery}
			 */
			function bitDiv( id ) {
				return $( '<div>' ).prop( {
					id: 'mw-debug-' + id,
					className: 'mw-debug-bit'
				} )
				.appendTo( $bits );
			}

			/**
			 * Returns a jQuery element for a pane link
			 *
			 * @ignore
			 * @param {string} id
			 * @param {string} text
			 * @return {jQuery}
			 */
			function paneLabel( id, text ) {
				return $( '<a>' )
					.prop( {
						className: 'mw-debug-panelabel',
						href: '#mw-debug-pane-' + id
					} )
					.text( text );
			}

			/**
			 * Returns a jQuery element for a debug-bit div with a for a pane link
			 *
			 * @ignore
			 * @param {string} id CSS id snippet. Will be prefixed with 'mw-debug-'
			 * @param {string} text Text to show
			 * @param {string} count Optional count to show
			 * @return {jQuery}
			 */
			function paneTriggerBitDiv( id, text, count ) {
				if ( count ) {
					text = text + ' (' + count + ')';
				}
				return $( '<div>' ).prop( {
					id: 'mw-debug-' + id,
					className: 'mw-debug-bit mw-debug-panelink'
				} )
				.append( paneLabel( id, text ) )
				.appendTo( $bits );
			}

			paneTriggerBitDiv( 'console', 'Console', this.data.log.length );

			paneTriggerBitDiv( 'querylist', 'Queries', this.data.queries.length );

			paneTriggerBitDiv( 'debuglog', 'Debug log', this.data.debugLog.length );

			paneTriggerBitDiv( 'request', 'Request' );

			paneTriggerBitDiv( 'includes', 'PHP includes', this.data.includes.length );

			paneTriggerBitDiv( 'profile', 'Profile', this.data.profile.length );

			gitInfo = '';
			if ( this.data.gitRevision !== false ) {
				gitInfo = '(' + this.data.gitRevision.substring( 0, 7 ) + ')';
				if ( this.data.gitViewUrl !== false ) {
					gitInfo = $( '<a>' )
						.attr( 'href', this.data.gitViewUrl )
						.text( gitInfo );
				}
			}

			bitDiv( 'mwversion' )
				.append( $( '<a href="//www.mediawiki.org/">MediaWiki</a>' ) )
				.append( document.createTextNode( ': ' + this.data.mwVersion + ' ' ) )
				.append( gitInfo );

			if ( this.data.gitBranch !== false ) {
				bitDiv( 'gitbranch' ).text( 'Git branch: ' + this.data.gitBranch );
			}

			bitDiv( 'phpversion' )
				.append( $( this.data.phpEngine === 'HHVM'
					? '<a href="http://hhvm.com/">HHVM</a>'
					: '<a href="https://php.net/">PHP</a>'
				) )
				.append( ': ' + this.data.phpVersion );

			bitDiv( 'time' )
				.text( 'Time: ' + this.data.time.toFixed( 5 ) );

			bitDiv( 'memory' )
				.text( 'Memory: ' + this.data.memory + ' (Peak: ' + this.data.memoryPeak + ')' );

			$bits.appendTo( $container );

			panes = {
				console: this.buildConsoleTable(),
				querylist: this.buildQueryTable(),
				debuglog: this.buildDebugLogTable(),
				request: this.buildRequestPane(),
				includes: this.buildIncludesPane(),
				profile: this.buildProfilePane()
			};

			for ( id in panes ) {
				if ( !panes.hasOwnProperty( id ) ) {
					continue;
				}

				$( '<div>' )
					.prop( {
						className: 'mw-debug-pane',
						id: 'mw-debug-pane-' + id
					} )
					.append( panes[id] )
					.appendTo( $container );
			}

			this.$container = $container;
		},

		/**
		 * Build the console panel
		 */
		buildConsoleTable: function () {
			var $table, entryTypeText, i, length, entry;

			$table = $( '<table id="mw-debug-console">' );

			$( '<colgroup>' ).css( 'width', /* padding = */ 20 + ( 10 * /* fontSize = */ 11 ) ).appendTo( $table );
			$( '<colgroup>' ).appendTo( $table );
			$( '<colgroup>' ).css( 'width', 350 ).appendTo( $table );

			entryTypeText = function ( entryType ) {
				switch ( entryType ) {
					case 'log':
						return 'Log';
					case 'warn':
						return 'Warning';
					case 'deprecated':
						return 'Deprecated';
					default:
						return 'Unknown';
				}
			};

			for ( i = 0, length = this.data.log.length; i < length; i += 1 ) {
				entry = this.data.log[i];
				entry.typeText = entryTypeText( entry.type );

				$( '<tr>' )
					.append( $( '<td>' )
						.text( entry.typeText )
						.addClass( 'mw-debug-console-' + entry.type )
					)
					.append( $( '<td>' ).html( entry.msg ) )
					.append( $( '<td>' ).text( entry.caller ) )
					.appendTo( $table );
			}

			return $table;
		},

		/**
		 * Build query list pane
		 *
		 * @return {jQuery}
		 */
		buildQueryTable: function () {
			var $table, i, length, query;

			$table = $( '<table id="mw-debug-querylist"></table>' );

			$( '<tr>' )
				.append( $( '<th>#</th>' ).css( 'width', '4em' )    )
				.append( $( '<th>SQL</th>' ) )
				.append( $( '<th>Time</th>' ).css( 'width', '8em'  ) )
				.append( $( '<th>Call</th>' ).css( 'width', '18em' ) )
			.appendTo( $table );

			for ( i = 0, length = this.data.queries.length; i < length; i += 1 ) {
				query = this.data.queries[i];

				$( '<tr>' )
					.append( $( '<td>' ).text( i + 1 ) )
					.append( $( '<td>' ).text( query.sql ) )
					.append( $( '<td class="stats">' ).text( ( query.time * 1000 ).toFixed( 4 ) + 'ms' ) )
					.append( $( '<td>' ).text( query['function'] ) )
				.appendTo( $table );
			}

			return $table;
		},

		/**
		 * Build legacy debug log pane
		 *
		 * @return {jQuery}
		 */
		buildDebugLogTable: function () {
			var $list, i, length, line;
			$list = $( '<ul>' );

			for ( i = 0, length = this.data.debugLog.length; i < length; i += 1 ) {
				line = this.data.debugLog[i];
				$( '<li>' )
					.html( mw.html.escape( line ).replace( /\n/g, '<br />\n' ) )
					.appendTo( $list );
			}

			return $list;
		},

		/**
		 * Build request information pane
		 *
		 * @return {jQuery}
		 */
		buildRequestPane: function () {

			function buildTable( title, data ) {
				var $unit, $table, key;

				$unit = $( '<div>' ).append( $( '<h2>' ).text( title ) );

				$table = $( '<table>' ).appendTo( $unit );

				$( '<tr>' )
					.html( '<th>Key</th><th>Value</th>' )
					.appendTo( $table );

				for ( key in data ) {
					if ( !data.hasOwnProperty( key ) ) {
						continue;
					}

					$( '<tr>' )
						.append( $( '<th>' ).text( key ) )
						.append( $( '<td>' ).text( data[key] ) )
						.appendTo( $table );
				}

				return $unit;
			}

			return $( '<div>' )
				.text( this.data.request.method + ' ' + this.data.request.url )
				.append( buildTable( 'Headers', this.data.request.headers ) )
				.append( buildTable( 'Parameters', this.data.request.params ) );
		},

		/**
		 * Build included files pane
		 *
		 * @return {jQuery}
		 */
		buildIncludesPane: function () {
			var $table, i, length, file;

			$table = $( '<table>' );

			for ( i = 0, length = this.data.includes.length; i < length; i += 1 ) {
				file = this.data.includes[i];
				$( '<tr>' )
					.append( $( '<td>' ).text( file.name ) )
					.append( $( '<td class="nr">' ).text( file.size ) )
					.appendTo( $table );
			}

			return $table;
		},

		buildProfilePane: function () {
			return mw.Debug.profile.init();
		}
	};

}( mediaWiki, jQuery ) );
