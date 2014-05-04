/** Encapsulates requests to the Spotify Metadata API */
var SpotitySearchService = (function () {
    "use strict";
    var baseLookupUrl = 'http://ws.spotify.com/lookup/1/.json';
    var baseSearchUrl = 'http://ws.spotify.com/search/1/';

    /**
     * Return proper query string based on key/value pairs
     * @param {object} obj The data object to be serialized
     */
    function buildQueryString(obj) {
        var q = '?',
            propertyName;

        for (propertyName in obj) {
            if (obj.hasOwnProperty(propertyName)) {
                q += propertyName + '=' + obj[propertyName] + '&';
            }
        }

        //Pop off last & character
        return q.substring(0, q.length - 1);
    }

    /**
     * Perform an async get request that returns JSON
     * @param {string} url The url to which we would like to make the request
     * @param {object} data The data to be added
     * @param {function} callback The function to be called when the request performs successfully
     */
    function request(url, data, callback) {
        var req = new XMLHttpRequest();
        req.onreadystatechange = function () {
            if (req.readyState === 4) {
                if (req.status === 200 && callback) {
                    callback(JSON.parse(req.responseText));
                }
            }
        };
        req.open('GET', url + (data ? buildQueryString(data) : ''));
        req.send(null);
    }

    return {
        searchArtists: function (query, callback, page) {
            request(
            baseSearchUrl + 'artist.json', {
                q: query,
                page: page ? page : 1
            }, callback);
        },
        searchAlbums: function (query, callback, page) {
            request(
            baseSearchUrl + 'album.json', {
                q: query,
                page: page ? page : 1
            }, callback);
        },
        searchTracks: function (query, callback, page) {
            request(
            baseSearchUrl + 'track.json', {
                q: query,
                page: page ? page : 1
            }, callback);

        },
        lookupAlbumsByArtistId: function (artistId, callback) {
            request(
            baseLookupUrl, {
                uri: 'spotify:artist:' + artistId,
                extras: 'album'
            }, callback);
        },
        lookupTracksByAlbumId: function (albumId, callback) {
            request(
            baseLookupUrl, {
                uri: 'spotify:album:' + albumId,
                extras: 'trackdetail'
            }, callback);
        }
    };
})();