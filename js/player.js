/*global tmpl:false, SpotitySearchService:false */
(function () {
    "use strict";

    /** @constructor */
    function Album(id, name) {
        this._id = id;
        this._name = name;
    }

    /** @return {string} The id of the album */
    Album.prototype.getId = function () {
        return this._id;
    };

    /** @return {string} The name of the album */
    Album.prototype.getName = function () {
        return this._name;
    };

    /**
     * Custom method to serialize this object to a JSON representation
     * This is handy to store this object in localStorage
     * @return {Object}
     */
    Album.prototype.toJSON = function () {
        return {
            id: this._id,
            name: this._name
        };
    };

    /** @constructor */
    function Artist(id, name) {
        this._id = id;
        this._name = name;
    }

    /** @return {string} The id of the artist */
    Artist.prototype.getId = function () {
        return this._id;
    };

    /** @return {string} The name of the artist */
    Artist.prototype.getName = function () {
        return this._name;
    };

    /**
     * Custom method to serialize this object to a JSON representation
     * This is handy to store this object in localStorage
     * @return {Object}
     */
    Artist.prototype.toJSON = function () {
        return {
            id: this._id,
            name: this._name
        };
    };

    /** @constructor */
    function Track(id, title, artists, album, length) {
        this._id = id;
        this._title = title;
        this._artists = artists;
        this._album = album;
        this._length = length;
    }

    /** @return {string} The id of the track */
    Track.prototype.getId = function () {
        return this._id;
    };

    /** @return {string} The title of the track */
    Track.prototype.getTitle = function () {
        return this._title;
    };

    /** @return {Array.<Artist>} The artists of the track */
    Track.prototype.getArtists = function () {
        return this._artists;
    };

    /** @return {Album} The album of the track */
    Track.prototype.getAlbum = function () {
        return this._album;
    };

    /** @return {number} The lenght of the track (in seconds) */
    Track.prototype.getLength = function () {
        return this._length;
    };

    /**
     * Custom method to serialize this object to a JSON representation
     * This is handy to store this object in localStorage
     * @return {Object}
     */
    Track.prototype.toJSON = function () {
        return {
            id: this._id,
            title: this._title,
            artists: this._artists,
            album: this._album,
            length: this._length
        };
    };

    /** @constructor */
    function Playlist(name, tracks) {
        tracks = tracks || [];
        this._tracks = tracks;
        this._name = name;
    }

    /** @return {string} The name of the playlist */
    Playlist.prototype.getName = function () {
        return this._name;
    };

    /** @return {Array.<Track>} The tracks that are part of this playlist */
    Playlist.prototype.getTracks = function () {
        return this._tracks;
    };

    /**
     * Adds a track to the playlist
     * @param {Track} track The track to be added
     */
    Playlist.prototype.addTrack = function (track) {
        this._tracks.push(track);
    };

    /**
     * Removes a track from the playlist
     * @param {number} index The index of the track to be removed
     */
    Playlist.prototype.removeTrack = function (index) {
        if (index < 0 || index >= this._tracks.length) {
            throw 'Wrong index';
        }
        this._tracks.splice(index, 1);
    };

    /**
     * Custom method to serialize this object to a JSON representation
     * This is handy to store this object in localStorage
     * @return {Object}
     */
    Playlist.prototype.toJSON = function () {
        return {
            tracks: this._tracks,
            name: this._name
        };
    };

    /** Manages the queue of tracks */
    var QueueManager = (function () {
        var currentTrackIndex = -1,
            list = [],
            playing = false;

        var container = document.getElementById('queued-songs'),
            control = document.getElementById('queue'),
            progressBar = document.getElementById('time');

        /** Initializes the queue manager adding the needed events */
        function init() {

            control.addEventListener('click', function (e) {
                if (e.target.classList.contains('play')) {
                    e.preventDefault();
                    play();
                }

                if (e.target.classList.contains('stop')) {
                    e.preventDefault();
                    stop();
                }

                if (e.target.classList.contains('play-queued-track')) {
                    e.preventDefault();
                    var index = parseInt(e.target.getAttribute('data-index'), 10);
                    play(index);
                }
            }, false);


            // A timer to control fast forward and rewind when pressing the buttons for
            // a long time
            var ffrwTimer;
            control.addEventListener('mousedown', function (e) {
                if (e.target.classList.contains('ff')) {
                    fastForward();
                    ffrwTimer = setInterval(function () {
                        fastForward();
                    }, 200);
                }
            }, false);

            control.addEventListener('mousedown', function (e) {
                if (e.target.classList.contains('rewind')) {
                    rewind();
                    ffrwTimer = setInterval(function () {
                        rewind();
                    }, 200);
                }
            }, false);

            control.addEventListener('mouseup', function (e) {
                if (ffrwTimer) {
                    clearInterval(ffrwTimer);
                    ffrwTimer = null;
                }
            }, false);

            control.addEventListener('mouseout', function (e) {
                if (ffrwTimer) {
                    clearInterval(ffrwTimer);
                    ffrwTimer = null;
                }
            }, false);

        }

        /**
         * Adds a track to the queue
         * @param {Track} track The track to be added
         */
        function add(track) {
            list.push(track);
            render();
        }

        /**
         * Returns the tracks that are in the queue
         * @param {Array.<Track>}
         */
        function getTracks() {
            return list;
        }

        var playFunction = null,
            // stores a handler for the interval
            startTime, originalStartTime;

        /**
         * Start playing a song
         * @param {number} index The index of the song to be played
         */
        function play(index) {
            if (playing) {
                stop();
            }

            if (index !== undefined) {
                if (index >= list.length) {
                    throw 'Trying to play a song that is not contained in the current tracklist';
                }
                currentTrackIndex = index;
            } else {
                if (currentTrackIndex === -1 && list.length > 0) {
                    currentTrackIndex = 0;
                }
            }

            if (currentTrackIndex >= 0) {
                playing = true;

                setStatus('Playing ' + list[currentTrackIndex].getTitle());

                startTime = new Date().getTime();
                originalStartTime = startTime;
                playFunction = setInterval(function () {
                    var elapsedTime = parseInt((new Date().getTime() - startTime) / 1000, 10),
                        remainingTime = list[currentTrackIndex].getLength() - elapsedTime;

                    if (remainingTime <= 0) {
                        stop();
                        next();
                    } else {
                        updateProgress(formatTime(elapsedTime), (100 * elapsedTime / (elapsedTime + remainingTime)));
                    }

                }, 1000);
            }
        }

        /**
         * Start playing the next song
         */
        function next() {
            if (currentTrackIndex < list.length - 1) {
                play(currentTrackIndex + 1);
            }
        }

        /**
         * Updates the progress bar that shows the current position of the song that is being played
         * @param {string} time
         * @param {number} percentage
         */
        function updateProgress(time, percentage) {
            progressBar.innerHTML = time;
            progressBar.style.width = percentage + '%';
        }

        /**
         * Sets a status in the play control
         * @param {string} status The status to be set
         */
        function setStatus(status) {
            document.getElementById('play-status').innerHTML = status;
        }

        /**
         * Adds missing zero in front of the number
         * @param {number} number
         */

        function zero(number) {
            return number >= 10 ? number : '0' + number;
        }

        /**
         * Formats an amount of seconds in a human readable format -> hh:mm:ss
         * @param {number} time Time in seconds
         */
        function formatTime(time) {
            var minutes = parseInt(time / 60, 10),
                hours = parseInt(time / 3600, 10),
                seconds = parseInt(time % 60, 10);

            return hours === 0 ? [zero(minutes), zero(seconds)].join(':') : [zero(hours), zero(minutes), zero(seconds)].join(':');
        }

        /**
         * It stops the current song
         */
        function stop() {
            if (playFunction) {
                clearInterval(playFunction);
                playFunction = null;
                formatTime(0);
                updateProgress('', 0);
                setStatus('');
            }
            playing = false;
        }

        /**
         * It rewinds the current song
         * If the song reaches the its starting point, then it is stopped
         */
        function rewind() {
            if (playing) {
                startTime += 2000;
                if (startTime > originalStartTime) {
                    // we stop this song
                    stop();
                }
            }
        }

        /**
         * It fast-forwards the current song
         * If the song reaches the its end point, then it is stopped
         */
        function fastForward() {
            if (playing) {
                startTime -= 2000;
                if (startTime < originalStartTime - list[currentTrackIndex].getLength() * 1000) {
                    // we stop this song
                    stop();
                }
            }
        }

        /**
         * Renders the list of queued tracks
         */
        function render() {
            container.innerHTML = tmpl("queued_tracks_template", {
                data: list
            });
        }

        return {
            init: init,
            add: add
        };

    })();

    /** Manages the list of tracks shown in the main container*/
    var TracklistManager = (function () {

        var tracks = [],
            container = document.getElementById('tracklist');

        /** Binds needed listeners */
        function init() {

            container.addEventListener('click', function (e) {
                if (e.target.classList.contains('queue-track')) {
                    e.preventDefault();
                    var index = e.target.parentElement.getAttribute('data-index');
                    var track = tracks[index];
                    QueueManager.add(track);
                }
            }, false);


            container.addEventListener('click', function (e) {
                if (e.target.classList.contains('delete-track')) {
                    e.preventDefault();
                    var index = e.target.parentElement.getAttribute('data-index');
                    PlaylistManager.removeTrack(index);
                }
            }, false);

            container.addEventListener('dragstart', function (e) {
                if (e.target.classList.contains('dragable')) {
                    var index = e.target.parentElement.getAttribute('data-index');
                    e.dataTransfer.effectAllowed = 'copy';
                    e.dataTransfer.setData('track', JSON.stringify(tracks[index]));
                }
            });

            container.addEventListener('click', function (e) {
                if (e.target.classList.contains('delete-playlist')) {
                    e.preventDefault();
                    PlaylistManager.remove();
                }
            }, false);

            container.addEventListener('click', function (e) {
                if (e.target.classList.contains('queue-tracklist')) {
                    e.preventDefault();
                    tracks.map(function (track) {
                        QueueManager.add(track);
                    });
                }
            }, false);
        }

        /**
         * It shows a list of tracks
         * @param {Tracklist} tracklist
         * @param {boolean} stored Tru if this list of tracks belongs to a stored user's playlist
         */
        function previewPlaylist(tracklist, stored) {
            tracks = tracklist.getTracks();
            container.innerHTML = tmpl("tracklist_template", {
                name: tracklist.getName(),
                tracks: tracklist.getTracks(),
                stored: stored
            });
        }

        /**
         * It clears the rendered list of songs
         */
        function clear() {
            container.innerHTML = '';
        }

        return {
            init: init,
            clear: clear,
            previewPlaylist: previewPlaylist
        };

    })();

    /** It manages the list of user's playlists */
    var PlaylistManager = (function () {

        var container = document.getElementById('playlists');

        var playlists = [],
            currentPlaylist = -1;

        /** Attach needed events */
        function init() {
            container.addEventListener('click', function (e) {
                if (e.target.classList.contains('show-playlist')) {
                    var index = e.target.parentElement.getAttribute('data-index');
                    e.preventDefault();
                    TracklistManager.previewPlaylist(playlists[index], true);
                    currentPlaylist = index;
                }
            }, false);

            document.getElementById('create-playlist').
            addEventListener('submit', function (e) {
                e.preventDefault();
                var playlistNameElement = document.getElementById('playlist-name');
                add(new Playlist(playlistNameElement.value));
                playlistNameElement.value = '';
            });

            // drag - drop events
            container.addEventListener('dragover', function (e) {
                e.preventDefault();
                if (e.target.classList.contains('show-playlist')) {
                    e.target.classList.add('over');
                    e.dropEffect = 'copy';
                }
            });

            container.addEventListener('dragleave', function (e) {
                e.preventDefault();
                if (e.target.classList.contains('show-playlist')) {
                    e.target.classList.remove('over');
                }
            });

            container.addEventListener('drop', function (e) {
                var trackObject = JSON.parse(e.dataTransfer.getData('track'));

                var artists = trackObject.artists.map(function (artist) {
                    return new Artist(artist.id, artist.name);
                });

                var album = new Album(trackObject.album.id, trackObject.album.name);

                var track = new Track(
                trackObject.id, trackObject.title, artists, album, trackObject.length);

                e.target.classList.remove('over');
                addTrack(
                e.target.parentElement.getAttribute('data-index'), track);

                var dropSuccessElement = document.getElementById('drop-success');
                dropSuccessElement.innerHTML = 'Track ' + track.getTitle() + ' added';
                dropSuccessElement.classList.remove('hidden');
                setTimeout(function () {
                    dropSuccessElement.classList.add('hidden');
                }, 1000);

            });
        }

        /** Renders the list of user's playlists */
        function render() {
            container.innerHTML = tmpl("user_playlists_template", {
                data: playlists
            });
        }

        /** Loads the list of user's playlists from the storage */
        function loadAll() {
            playlists = [];
            var playlistsObjects = JSON.parse(localStorage.getItem('user-playlists'));
            if (playlistsObjects) {
                playlistsObjects.map(function (playlistsObject) {
                    var tracks = [];
                    playlistsObject.tracks.map(function (trackObject) {

                        var artists = trackObject.artists.map(function (artist) {
                            return new Artist(artist.id, artist.name);
                        });

                        var album = new Album(trackObject.album.id, trackObject.album.name);

                        tracks.push(
                        new Track(
                        trackObject.id, trackObject.title, artists, album, trackObject.length));
                    });

                    playlists.push(new Playlist(playlistsObject.name, tracks));
                });
            }

            render();
        }

        /** Saves the list of user's playlists in the storage */
        function saveAll() {
            localStorage.setItem('user-playlists', JSON.stringify(playlists));
        }

        /**
         * Removes a certain user playlist
         * @param {number} index The index of the playlist that will be deleted
         */
        function remove(index) {
            var indexToRemove = (index === undefined ? currentPlaylist : index);
            playlists.splice(indexToRemove, 1);
            render();

            currentPlaylist = Math.max(indexToRemove - 1, playlists.length - 1);
            if (currentPlaylist >= 0) {
                TracklistManager.previewPlaylist(playlists[currentPlaylist], true);
            } else {
                TracklistManager.clear();
            }
        }

        /**
         * Adds a track to a user's playlist
         * @param {number} index The index of the playlist to which the track will be added
         * @param {Track} track The track that is being added
         */
        function addTrack(index, track) {
            playlists[index].addTrack(track);
            if (index === currentPlaylist) {
                TracklistManager.previewPlaylist(playlists[currentPlaylist], true);
            }
            saveAll();
        }

        /**
         * Removes a track from the current user's playlist
         * @param {number} index The index of the track that will be removed
         */
        function removeTrack(index) {
            playlists[currentPlaylist].removeTrack(index);
            TracklistManager.previewPlaylist(playlists[currentPlaylist], true);
        }

        /**
         * Adds a new playlist to the lst of user's playlists
         * @param {Playlist} playlist The playlist that is being added
         */
        function add(playlist) {
            playlists.push(playlist);
            saveAll();
            render();
        }

        return {
            init: init,
            loadAll: loadAll
        };
    })();

    /** It manages routing through URL hash */
    var RouteManager = (function () {
        var routes = [];

        function processHash(hash) {
            for (var i in routes) {
                if (routes.hasOwnProperty(i)) {
                    var route = routes[i];
                    var result = route.regex.exec(hash);
                    if (result !== null) {
                        route.func(result.splice(1));
                        break;
                    }
                }
            }
        }

        /**
         * It registers a new route.
         * When it is registered, a regex is compiled to avoid doing it every time
         * @param {string} route The string that represents a target route. It can contain a regex expression
         * @param {function} func The function that will be called if the current route matches 'route'
         */
        function registerRoute(route, func) {
            routes.push({
                func: func,
                regex: new RegExp(route)
            });
            return this; //to allow chaining
        }

        /** Attach hashchange even */
        function init() {
            window.addEventListener("hashchange", function () {
                processHash(location.hash);
            }, false);

            // initial check
            if (location.hash !== '') {
                processHash(location.hash);
            }
        }

        return {
            init: init,
            registerRoute: registerRoute
        };
    })();

    /**
     * Manage the search and navigation through artists, tracks and albums
     * It uses Spotify Metadata API to retrieve the data
     */
    var SearchManager = (function () {

        var container = document.getElementById('tracklist');

        /** Attaches events to the search form */
        function init() {
            document.getElementById('search').addEventListener('submit', function (e) {
                e.preventDefault();
                var method = document.getElementById('method').value,
                    term = document.getElementById('term').value;

                switch (method) {
                case 'artist':
                case 'album':
                case 'track':
                    location.hash = 'search/' + method + '/' + term.replace(/ /g, '_');
                    break;
                default:
                    throw 'Wrong search method ' + method;
                }
            });
        }

        /**
         * Search artists by a certain query term
         * @param {string} query
         */
        function searchArtists(query) {
            SpotitySearchService.searchArtists(query, function (results) {
                var data = results.artists.map(function (artistData) {
                    return ({
                        id: getIdFromSpotifyElement(artistData),
                        name: artistData.name
                    });
                });

                container.innerHTML = tmpl("artist_search_results_template", {
                    title: "Artist search results for '" + query + "'",
                    results: data
                });
            });
        }

        /**
         * Search albums by a certain query term
         * @param {string} query
         */
        function searchAlbums(query) {
            SpotitySearchService.searchAlbums(query, function (results) {

                var data = results.albums.map(function (albumsData) {

                    var albumId = getIdFromSpotifyElement(albumsData),
                        albumName = albumsData.name,
                        artists = albumsData.artists.map(function (artist) {
                            var artistId = getIdFromSpotifyElement(artist);
                            return new Artist(artistId, artist.name);
                        });

                    return {
                        album: new Album(albumId, albumName),
                        artists: artists
                    };
                });

                container.innerHTML = tmpl("album_search_results_template", {
                    title: "Album search results for '" + query + "'",
                    results: data
                });
            });
        }

        /**
         * Search tracks by a certain query term
         * @param {string} query
         */
        function searchTracks(query) {
            SpotitySearchService.searchTracks(query, function (results) {
                var data = [];

                var tracklist = makeTracklistFromTracks(results.tracks);

                TracklistManager.previewPlaylist(new Playlist("Track search result for '" + query + "'", tracklist));
            });
        }

        /**
         * Look up albums by a certain artist id
         * @param {string} artistId
         */
        function lookupAlbumsByArtistId(artistId) {
            SpotitySearchService.lookupAlbumsByArtistId(artistId, function (results) {

                var albums = results.artist.albums.map(function (albumData) {
                    var albumId = getIdFromSpotifyElement(albumData.album),
                        albumName = albumData.album.name;

                    return {
                        id: albumId,
                        name: albumName
                    };
                });

                var data = {
                    name: results.artist.name,
                    albums: albums
                };

                container.innerHTML = tmpl("artist_lookup_results_template", {
                    title: "Albums by artist '" + data.name + "'",
                    results: data
                });
            });
        }

        /**
         * Look up tracks belonging to a certain album
         * @param {string} albumId
         */
        function lookupTracksByAlbumId(albumId) {
            SpotitySearchService.lookupTracksByAlbumId(albumId, function (results) {
                var data = [];

                var albumTracklist = makeTracklistFromAlbum(results.album);
                TracklistManager.previewPlaylist(
                new Playlist("Tracks from album '" + albumTracklist.album.getName() + "'", albumTracklist.tracks));
            });
        }

        /**
         * Compose a list of tracks from a json object containing tracks and their album
         * @param {object} jsonTracks
         * @return {Array.<Track>}
         */
        function makeTracklistFromTracks(jsonTracks) {
            return jsonTracks.map(function (trackData) {

                var artists = trackData.artists.map(function (artist) {
                    var artistId = getIdFromSpotifyElement(artist),
                        artistName = artist.name;
                    return new Artist(artistId, artistName);
                });

                var albumName = trackData.album.name;
                var albumId = getIdFromSpotifyElement(trackData.album);

                return new Track(
                getIdFromSpotifyElement(trackData), trackData.name, artists, new Album(albumId, albumName), trackData.length);
            });
        }

        /**
         * Compose a list of tracks from a json object containing tracks and a parent album
         * @param {object} album
         * @return {object}
         */
        function makeTracklistFromAlbum(album) {
            var albumName = album.name;
            var albumId = getIdFromSpotifyElement(album);

            var tracks = album.tracks.map(function (trackData) {

                var artists = trackData.artists.map(function (artist) {
                    var artistId = getIdFromSpotifyElement(artist),
                        artistName = artist.name;
                    return new Artist(artistId, artistName);
                });

                return new Track(
                getIdFromSpotifyElement(trackData), trackData.name, artists, new Album(albumId, albumName), trackData.length);
            });

            return {
                album: new Album(albumId, albumName),
                tracks: tracks
            };
        }

        /**
         * Extract the meaningful id from a retrieved spotify element (album, artist, track)
         * It also manages the lack of the id.
         * @param {object} spotifyElement
         * @return {string|null} The id in case it exists, null otherwise
         */
        function getIdFromSpotifyElement(spotifyElement) {
            return 'href' in spotifyElement ? spotifyElement.href.split(':')[2] : null;
        }

        /**
         * Decode a query term that has been retrieved from the URL and could have been modified
         * to encode blank spaces
         * @param {string} queryTerm
         * @return {string}
         */
        function decode(queryTerm) {
            return queryTerm.replace(/_/g, ' ');
        }

        // register routes and init the router manager after the registration
        RouteManager.registerRoute('#search/album-tracks/(\\w+)', function (params) {
            var albumId = params[0];
            lookupTracksByAlbumId(albumId);
        }).registerRoute('#search/artist-albums/(\\w+)', function (params) {
            var artistId = params[0];
            lookupAlbumsByArtistId(artistId);
        }).registerRoute('#search/artist/(\\w+)', function (params) {
            var query = decode(params[0]);
            searchArtists(query);
        }).registerRoute('#search/track/(\\w+)', function (params) {
            var query = decode(params[0]);
            searchTracks(query);
        }).registerRoute('#search/album/(\\w+)', function (params) {
            var query = decode(params[0]);
            searchAlbums(query);
        }).init();

        return {
            init: init
        };

    })();

    // init every manager to attach the needed events and load trackas from storage
    PlaylistManager.init();
    PlaylistManager.loadAll();

    TracklistManager.init();
    QueueManager.init();
    SearchManager.init();

})();