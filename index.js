/* a8cgmposts */
const express = require( 'express' );
const app = express();
const _ = require( 'lodash' );

// Config stuffs
const wpcom = require( 'wpcom' )( process.env.WPCOM_TOKEN );
const siteUrl = 'a8cgmposts.wordpress.com';
const siteID = 134185161;
const site = wpcom.site( siteUrl );
const lastUpdatedWidget = 'text-3';

function updateTimestamp( time ) {
	return site.wpcom.req.post(`/sites/${siteUrl}/widgets/widget:${lastUpdatedWidget}`, { settings: { text: time.toISOString() } } );
}

function getLastUpdateTime() {
	return site.wpcom.req.get(`/sites/${siteUrl}/widgets/widget:${lastUpdatedWidget}` );
}

app.get( '/', ( req, res ) => {
	const updateTime = new Date();
	getLastUpdateTime()
		.then( ( response ) => {
			return response.settings.text;
		} )
		.then( ( time ) => {
			return site.wpcom.req.get( `/read/tags/a8cgm/posts?after=${ time }`, { apiVersion: '1.2' } );
		} )
		.then( ( response ) => {
			return new Promise( ( resolve, reject ) => {

				// If there is no data, or no posts, return.
				if ( ! response || response.number === 0 ) {
					resolve();
				}

				// Create posts.
				_.each( response.posts, ( post, i ) => {
					// Only add new post if it is not coming from a8cgmposts
					if ( post.site_ID !== siteID ) {
						// if this is the last post, resolve promise.
						if ( i === ( response.number - 1 ) ) {
							resolve();
						}
						return;
					}

					// Pictures are neat, lets use either the featured image or attachments in the original post.
					let photos = [];
					if ( post.featured_image && post.featured_image.length ) {
						photos.push( post.featured_image );
					} else {
						photos = _.map( post.attachments, 'URL' );
					}

					site.addPost( {
						title: post.title,
						content: post.excerpt + `\n\n<a href="${ post.URL }">${ post.URL }</a>`,
						publicize_message: `${ post.title } ${ post.short_URL }`,
						media_urls: photos
					} )
					.then( () => {
						// if this is the last post, resolve promise.
						if ( i === ( response.number - 1 ) ) {
							resolve();
						}
					} );
				} );
			} );
		} )
		.then( ( message ) => {
			// Update our last run time.
			return updateTimestamp( updateTime );
		} )
		.then( () => {
			res.send( 'great success' );
		} )
} );

app.listen( 5000 );
