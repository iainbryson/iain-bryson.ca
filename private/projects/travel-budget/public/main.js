/*global d3 $*/

$.GLOBALS = {
    load_start_time : (new Date()).getTime(),
    load_end_time : 0,
    bigchart_width : 600,
    bigchart_height: 400,
    tables_max_rows: 500,

    chart_color_range_start : "#0849b3",
    chart_color_range_start : "#b34908",
    chart_colors : ["#c6dbef", "#9ecae1", "#6baed6"],
    xaxis_label_angle : -50,
    axis_label_font_size : 12,
    axis_label_date_length : 7,
    axis_label_date_format : d3.time.format("%d %b"),
    min_tick_width: 30,

    default_milestone: 'W6M1',
    default_env: 'prod',

    data_root_url : 'http://' + (window.location.hostname.indexOf('localhost') !== -1 ? 'iainb35' : window.location.hostname) + '/telemetry/Data/',
    static_data : false,
    percents_as_reliability : true /* render percentages as reliability numbers, instead of defect rates */
};

// From https://github.com/jaubourg/ajaxHooks/blob/master/src/ajax/xdr.js to eliminate the "page is attempting to access data not under its control" in IE8+
function ieAjaxTransport( s ) {
    console.log("ajaxtransport being added for "+s);
        if ( s.crossDomain && s.async ) {
            if ( s.timeout ) {
                s.xdrTimeout = s.timeout;
                delete s.timeout;
            }

            var xdr;
            return {
                send: function( _, complete ) {
                    console.log('sending ajax request with XDomain');
                    function callback( status, statusText, responses, responseHeaders ) {
                        xdr.onload = xdr.onerror = xdr.ontimeout = jQuery.noop;
                        xdr = undefined;
                        complete( status, statusText, responses, responseHeaders );
                    }

                    xdr = new XDomainRequest();
                    xdr.open( s.type, s.url );
                    xdr.onload = function() {
                        callback( 200, "OK", { text: xdr.responseText }, "Content-Type: " + xdr.contentType );
                    };

                    xdr.onerror = function() {
                        callback( 404, "Not Found" );
                    };

                    if ( s.xdrTimeout ) {
                        xdr.ontimeout = function() {
                            callback( 0, "timeout" );
                        };

                        xdr.timeout = s.xdrTimeout;
                    }
                    xdr.send( ( s.hasContent && s.data ) || null );
                },

                abort: function() {
                    if ( xdr ) {
                        xdr.onerror = jQuery.noop();
                        xdr.abort();
                    }
                }
            };
        }
    }

(function( jQuery ) {
if ( window.XDomainRequest ) {
    jQuery.ajaxTransport(ieAjaxTransport);
}
})( jQuery );


// Dates coming from the .NET JavascriptSerializer doesn't parse correctly in JSON,
// so we have to do it manually.
function parseDotNetDateString(s) {
    return new Date(parseInt(s.slice(6,-2), 10));
}

function loadOn(message, subtext) {
    $('#loadingText').text("Loading Page...")
    $('#loadingSubText').text('')
    if (typeof(message) !== 'undefined') {
        $('#loadingText').text(message)
        if (typeof(subtext) !== 'undefined') {
            $('#loadingSubText').text(subtext)
        }
    }
    $('#loadingMessages').show().css('left','0');
    $('#loading').fadeIn(10, function() { $('#loading').show(); } );
}

function loadOff() {
/*
    $('#loadingMessages').animate({
//        opacity: 0.25,
        left: '+=1000',
      }, 700, function() {
        // Animation complete.
         $('#loading').hide() 
      });    
      */
    $('#loadingMessages').fadeOut(500, function() { $('#loading').hide(); } );
}

function onload() {
    "use strict";

    console.log('onload method begins...');
    $.GLOBALS.load_end_time = (new Date()).getTime();
    var load_time_s = ($.GLOBALS.load_end_time - $.GLOBALS.load_start_time) / 1000;
    $('#plt').text(load_time_s);
    
    if (!window.location.hash || window.location.hash === '#!') {
        loadOff();
// tutorial isn't great.  disabled till this can be tried again...
//        showTutorial();
    }
}

function showTutorial() {
    console.log('showing tutorial');
    // &uarr;   &#xa71b;
    //$('#template_content').append('<div id="tutorialWelcome" style="z-index:100;position:absolute;left:300px;top:60px;"><h1>Welcome to the DRX Client Telemetry Site!</h1></div>')
    // e7
    $('#template_content').append('<div id="filtersTutorial" style="z-index:100;position:absolute;left:'+($(window).width()-400)+'px;top:60px;"><h1>Set filters here <span style="vertical-align:top;top:-15px"> &#x21d1;</span></h1></div>')
    $('#filtersTutorial').animate({
        opacity: 1.00,
        left: '+=200'
        }, 5000, function() {
            console.log('done with filters tutorial');
            $('#filtersTutorial').show().attr('opacity', 1.0);
// e6
            $('#template_content').append('<div id="reportsTutorial" style="z-index:100;position:absolute;left:200px;top:100px;"><h1>&#x21d0; Choose reports here</h1></div>')
            $('#reportsTutorial').animate({
                opacity: 1.00,
                top: '+='+($(window).height()-200)
                }, 5000, function() {
                    console.log('done with reports tutorial');
                    $('#reportsTutorial').show().attr('opacity', 1.0);
                }
            );
        }
    );
}

function changePage(page) {
    $("#content").html('');
    $("#loadingText").text('Loading ...');

    loadOn();
}

function fatalError(err) {
    $("#content").html('');
    $.GLOBALS.fatal_error = err;
    $("#loadingText").text(err);

    loadOn();
}

function ensureConsoleExists() {
    // From HTML5 Boilerplate
    // Avoid `console` errors in browsers that lack a console.
    if (!(window.console && console.log)) {
        (function () {
            $('#template_content').append('<div id="debug">DEBUG</div>')
            var noop = function () { };
            var methods = ['assert', 'clear', 'count', 'debug', 'dir', 'dirxml', 'error', 'exception', 'group', 'groupCollapsed', 'groupEnd', 'info', 'log', 'markTimeline', 'profile', 'profileEnd', 'markTimeline', 'table', 'time', 'timeEnd', 'timeStamp', 'trace', 'warn'];
            var length = methods.length;
            var console = window.console = {};
            while (length--) {
                console[methods[length]] = noop;
            }
            console.log = function (d) { $('#debug').text($('#debug').text() + '\n'+d); };
        }());
    }
}

(ensureConsoleExists());

function buildNewQueryString() {
    "use strict";
    
    var x, idx;
    var newvars = [];
    var query_segments = new Array();

    for (x in $.GLOBALS.vars) {
        if ($.GLOBALS.vars.hasOwnProperty(x) && $.GLOBALS.vars[x] !== null) {
            newvars.push(x); //  + '=' + $.GLOBALS.vars[x]
        }
    }
    
    newvars = newvars.sort();
    
    for (idx = 0; idx < newvars.length; idx++) {
        query_segments.push(newvars[idx]+"="+$.GLOBALS.vars[newvars[idx]]);
    }

    return query_segments.join('&');
}

// build a new URL using the current values of the query parameter hash
// and the given base
function buildNewUrl(base) {
    "use strict";

    var qs = buildNewQueryString();

    if (null === base) {
        base = $.GLOBALS.currentPageBase;
    }
    
    if (base.indexOf('?') !== -1) {
        return base + '&' + qs;
    } else {
        return base + '?' + qs;
    }
}

function setQueryParam(param, val) {
    "use strict";

    $.GLOBALS.vars[param] = val;

    window.location.search = buildNewQueryString();
}

function setQueryParams(p) {
    "use strict";

    for (var k in p) {
        if (p.hasOwnProperty(k)) {
            $.GLOBALS.vars[k] = p[k];
        }
    }

    window.location.search = buildNewQueryString();
}

function getQueryParams() {
    "use strict";

    $.GLOBALS.vars = [];
    $.GLOBALS.cur_population = "all";
    $.GLOBALS.cur_version = "all";

    var hash;
    var hashes = [];
    var base;
    var queryParamIdx = window.location.href.indexOf('?');

    if (-1 != queryParamIdx) {
        base = window.location.href.slice(0, queryParamIdx);
        var qry_param = window.location.href.slice(queryParamIdx + 1);
        var hash_idx = qry_param.indexOf('#');
        if (hash_idx != -1) { qry_param = qry_param.slice(0, hash_idx) }
        hashes = qry_param.split('&');
        for (var i = 0; i < hashes.length; i++) {
            hash = hashes[i].split('=');
            $.GLOBALS.vars[hash[0]] = hash[1];
        }
    } else {
        base = window.location.href;
    }
    $.GLOBALS.currentPageBase = base;
}

$(document).ready(function () {
    "use strict";

    ensureConsoleExists();

    console.log('document ready begins')

    if ($(window).width() < 1450) {
        $.GLOBALS.bigchart_width = $(window).width() > 850 ? ($(window).width() - 250) : (600);
    }

    if ($(window).height() < 900) {
        $.GLOBALS.bigchart_height = $(window).height() > 400 ? ($(window).height() - 150) : (250);
    }

    var aspectRatio = $.GLOBALS.bigchart_width / $.GLOBALS.bigchart_height;

    console.log("chart width "  +$.GLOBALS.bigchart_width + " height " + $.GLOBALS.bigchart_height + " aspect " + aspectRatio);

    if ($.GLOBALS.renderFunc) { $.GLOBALS.renderFunc(); }
    else loadOff();

    console.log('document ready ends')
});

function loadDataAndRenderPage(dataName, renderFunction) {
    "use strict";
    
    ensureConsoleExists();

    var dataInfo = ({
                'exit-criteria'    : {root:'ExitCriteria',
                                      validQueryParams:['milestone',                 'office', 'version', 'riversion']},
                'exit-criteria2'   : {root:'ExitCriteria2',
                                      validQueryParams:['milestone',                 'office', 'version', 'riversion']},
                'exit-criteria-history':{root:'ExitCriteriaHistory',
                                      alidQueryParams:['milestone',                           'version', 'riversion']},
                'watson-detail'    : {root:'WatsonExitCriteriaDetail',
                                      validQueryParams:['milestone',     'minhits']},
                'watson-byday'     : {root:'WatsonHitsByDay',
                                      validQueryParams:['milestone']},
                'asserts-detail'   : {root:'AssertsExitCriteriaDetail',
                                      validQueryParams:['milestone', 'env', 'fatal', 'office', 'version', 'riversion']},
                'asserts-byday'    : {root:'AssertsByDay',
                                      validQueryParams:['milestone', 'env', 'fatal', 'office', 'version', 'riversion']},
                'stalls-detail'    : {root:'StallsExitCriteriaDetail',
                                      validQueryParams:['milestone', 'env', 'fatal', 'office', 'version']},
                'syncfails-detail' : {root:'SyncFailsExitCriteriaDetail',
                                      validQueryParams:['milestone', 'env', 'fatal', 'office', 'version']},
                'versions-wls'     : {root:'WlsVersions',
                                      validQueryParams:['milestone', 'env',                    'version'],
                                      forceDefaultQueryParams: ['milestone']},
                'versions-bici'    : {root:'BiCiVersions',
                                      validQueryParams:['milestone', 'env',                    'version'],
                                      forceDefaultQueryParams: ['milestone']},
                'versions-syncinfo': {root:'SyncInfoVersions',
                                      validQueryParams:['milestone', 'env',                    'version', 'riversion'],
                                      forceDefaultQueryParams: ['milestone']},
                'health-individual': {root:'SyncHealthIndividual',
                                      validQueryParams:['usercid']},
                'health-population': {root:'SyncConvergencePopulationHealth',
                                      validQueryParams:['milestone', 'env']},
                'stats-errors'     : {root:'StatsErrors',                     validQueryParams:[]},
                'stats-syncinfo'   : {root:'StatsSyncInfo',                   validQueryParams:[]},
                'pipeline-health'  : {root:'PipelineHealth',                  validQueryParams:[]},
                'backfiller'       : {root:'Backfiller',                      validQueryParams:[]},
                'runsched'         : {root:'RunSched',                        validQueryParams:[]}
                })[dataName];

    if (typeof(dataInfo) === undefined) {
        $("#content").html('<h1>Data info '+dataName+' failed! (is it valid?)</h1>');
        return;
    }

    var json_url;

    getQueryParams();

    var query_param_map = {};
    var query_params = new Array();
    var qp_idx = 0;
    var query_changed = false;
    while (qp_idx < dataInfo.validQueryParams.length) {
        var qp = dataInfo.validQueryParams[qp_idx]
        var qp_val = $.GLOBALS.vars[qp];
        // HACK
        if (qp == 'minhits')            { qp_val = '0';                query_changed = true; };
        if (qp == 'usercid' && !qp_val) { qp_val = 'daa8b779e09f939f'; query_changed = true; };
        // ENDHACK
        if (qp_val) {
            query_params.push(qp + "=" + qp_val)
        }
        
        if (dataInfo.hasOwnProperty('forceDefaultQueryParams')) {
            if (dataInfo.forceDefaultQueryParams.indexOf(qp) === -1) {
                qp_val = true;
            }
        }
        
        // without milestone filtering the values are unhelpful
        if (qp == 'milestone' && !qp_val) { qp_val = $.GLOBALS.vars[qp] = $.GLOBALS.default_milestone; query_changed = true; }
        if (qp == 'env' && !qp_val) { qp_val = $.GLOBALS.vars[qp] = $.GLOBALS.default_env; query_changed = true; }

        query_param_map[qp] = true;

        qp_idx++;
    }
    if ($.GLOBALS.vars['caching']) { query_params.push('caching='+$.GLOBALS.vars['caching']); query_param_map['caching'] = true; }
    query_params = query_params.sort();

    // if there are more filters in the current query set, clean it up
    for (var current_var in $.GLOBALS.vars) {
        if ($.GLOBALS.vars.hasOwnProperty(current_var)) {
            if (!query_param_map.hasOwnProperty(current_var)) {
                delete $.GLOBALS.vars[current_var];
                query_changed = true;
                console.log("parameter "+current_var+" is not supported");
            }
        }
    }
    if (query_changed) {
    console.log($.GLOBALS.vars);
        var base_url = window.location.href.split('#')[0].split('?')[0];
        var new_url = buildNewUrl(base_url) + "#"+dataName+".html";
        console.log("query had excess parameters.  trimming to " + new_url);
        window.location.href = new_url;
        return;
    }

    if ($.GLOBALS.static_data) {
        var base_and_query = dataInfo.root + (query_params.length == 0 ? (dataInfo.validQueryParams.length == 0 ? "" : "_") : ("_" + query_params.join("_")))
        json_url = 'data/' + base_and_query + '.json';
    } else {
        var base_and_query = dataInfo.root + (query_params.length == 0 ? (dataInfo.validQueryParams.length == 0 ? "" : "?") : ("?" + query_params.join("&")))
        json_url = $.GLOBALS.data_root_url + base_and_query;
    }
    
    $.support.cors = true;
    $.ajaxTransport = ieAjaxTransport;

    if (!$.GLOBALS.known_builds) {
        
        var known_builds_json_url;
        if ($.GLOBALS.static_data) {
            var base_and_query = "KnownBuilds";
            known_builds_json_url = 'data/' + base_and_query + '.json';
        } else {
            var base_and_query ="KnownBuilds" + (query_params.length == 0 ? (dataInfo.validQueryParams.length == 0 ? "" : "?") : ("?" + query_params.join("&")))
            known_builds_json_url = $.GLOBALS.data_root_url + base_and_query;
        }
        var request = $.ajax({
            url: known_builds_json_url,
            crossDomain: true,
            async: true,
            dataType: 'json',
        })

        var success = function(data) {
                             console.log("loading " + known_builds_json_url + " succeeded");

                            $.GLOBALS.known_builds = {};

                            data = data.data.Table;

                            var header_map = {};
                            for (var i = 0; i < data.header.length; i++) {
                                header_map[i] = data.header[i];
                            };

                            for (var row = 0 ; row < data.rows.length; row++) {
                                var row_map = {};
                                for (var c = 0; c < data.rows[row].length; c++) {
                                    row_map[header_map[c]] = data.rows[row][c];
                                }

                                $.GLOBALS.known_builds[row_map.AppVersion] = row_map;
                            };

                            console.log($.GLOBALS.known_builds);
                         };
    
        request.done(success)
        request.error(function(xhr, status, errorThrown) {
                            console.log("loading " + known_builds_json_url + " failed\n"+errorThrown+'\n'+status+'\n'+xhr.statusText);
                            if (xhr.responseText) {
                                var data = $.parseJSON(xhr.responseText);
                                if (data) {
                                    success(data);
                                    return;
                                }
                            }
                            $.GLOBALS.known_builds = undefined;
                        });
        request.always(function() { } );
    }

    var request = $.ajax({
        url: json_url,
        crossDomain: true,
        async: true,
        dataType: 'json',
//        headers: { 'Access-Control-Allow-Origin': '*' }
    })
    
    console.log("loading " + json_url);
    loadOn('Loading Data...', dataName == 'health-individual' ? '(this may take a while -- individual reports are not pre-cached)' : undefined);
    
    var success = function(data) {
                         console.log("loading " + json_url + " succeeded");
                         loadOn('begin rendering report');

                         console.log("hiding/showing filters based on whether the page uses them in its query parameters");
                         $('.commandbar .dropdown').each( function(d) {
                            var filter_class = $(this).attr('class').match(/([a-z]+)Filter/);
                            if (!filter_class) return;
                            filter_class = filter_class[1];
                            (filter_class && query_param_map[filter_class]) ? $(this).show() : $(this).hide();
                        } );

                         renderCachingInfo(data.caching_info);
                         console.log("rendered caching info for " + json_url );
                         renderDescription(dataName);
                         console.log("rendered description info for " + json_url);
                         renderMilestoneDescription();
                         console.log("rendered milestone info for " + json_url);
                         renderFunction(data);
                         console.log("rendered page for " + json_url);

                         // Rory analytics!
                         var analyticsUrl = 'http://wltest/usage/track.aspx?app=DRX Telemetry&b='+(new Date).getTime()+'&url='+encodeURIComponent(window.location.href);
                         console.log("uploading analytics to " + analyticsUrl + "");
                         $('body #analyticsScript').remove();
                         var analyticsScript  = document.createElement('script');
                         analyticsScript.type = 'text/javascript';
                         analyticsScript.src  = analyticsUrl;
                         analyticsScript.id   = 'analyticsScript';
                         //document.body.appendChild(analyticsScript);
                         //$('body').append('<script src="'+analyticsUrl+'" id="analyticsScript" type="text/javscript">(function(){})()</script>');
                         console.log("uploading analytics to " + analyticsUrl + "completed");
                     };
    
    request.done(success)
    request.error(function(xhr, status, errorThrown) {
                        console.log("loading " + json_url + " failed\n"+errorThrown+'\n'+status+'\n'+xhr.statusText);
                        if (xhr.responseText) {
                            var data = $.parseJSON(xhr.responseText);
                            if (data) {
                                success(data);
                                return;
                            }
                        }
                        $("#content").html('<h1>Loading: fetching '+json_url+' failed!</h1>');
                        $("#loadingText").text('Loading: fetching data failed!');
                    });
    request.always(function() { if (!$.GLOBALS.fatal_error) loadOff(); else $("#loadingText").text($.GLOBALS.fatal_error); } );
}

function renderDescription(dataName) {
}

function getNiceMilestone(cur_population, cur_riversion) {
    var nice_milestone_from_milestone = { 'all': 'All Milestones', 'W6M0': 'W6 Downlevel', 'W6M1': '8.1 MP', 'W6M2': '8.1 GA'};
    var nice_milestone_from_riversion = { 14: '8.1 GA', 15 : '8.1 M3', 16 : '8.1 S14', 20 : '8.1 M4' };

    if (cur_riversion) {
        return nice_milestone_from_riversion[cur_riversion];
    }

    return nice_milestone_from_milestone[cur_population];
}

function getNiceShortMilestone(cur_population, cur_riversion) {
    var nice_short_milestone_map_from_milestone = { 'all': 'All', 'W6M0': 'Downlevel', 'W6M1': '8.1 MP', 'W6M2': '8.1 GA' }
    var nice_short_milestone_from_riversion = { 14: '8.1 GA', 15 : '8.1 M3', 16 : '8.1 S14', 20 : '8.1 M4' };

    if (cur_riversion) {
        return nice_short_milestone_from_riversion[cur_riversion];
    }

    return nice_short_milestone_map_from_milestone[cur_population || 'all'];
}

function renderMilestoneDescription() {
    "use strict";

    var $prettyMilstoneLabel = $('#prettyMilestoneDescription');

    getQueryParams();

    var filter_pretty = '';

    $.GLOBALS.cur_population = $.GLOBALS.vars['milestone'];
    $.GLOBALS.cur_version = $.GLOBALS.vars['version'];
    $.GLOBALS.cur_riversion = $.GLOBALS.vars['riversion'];
    $.GLOBALS.cur_milestone = $.GLOBALS.vars['milestone'];
    $.GLOBALS.cur_office = $.GLOBALS.vars['office'];
    $.GLOBALS.cur_fatal = $.GLOBALS.vars['fatal'];
    $.GLOBALS.cur_env = $.GLOBALS.vars['env'];

    var nice_milestone = getNiceMilestone($.GLOBALS.cur_population, $.GLOBALS.cur_riversion);

    filter_pretty = ' from ';

    if ($.GLOBALS.cur_env) {
        filter_pretty += {'prod' : ' users external to Microsoft ', 'dogfood' : ' users internal to Microsoft '}[$.GLOBALS.cur_env] + ' using ';
    } else {
        filter_pretty += 'all user populations using '
    }

    filter_pretty += nice_milestone;

    if (typeof($.GLOBALS.cur_riversion) !== 'undefined') {
        filter_pretty += ' (RI version '+$.GLOBALS.cur_riversion+')';
    }

    if ($.GLOBALS.vars['office'] != undefined) {
        if ($.GLOBALS.vars['office'] == '1') {
            $.GLOBALS.cur_population = $.GLOBALS.cur_population + 'office'
            filter_pretty += ' using office'
        } else {
            $.GLOBALS.cur_population = $.GLOBALS.cur_population + 'notoffice'
            filter_pretty += ' not using office'
        }
    }


    $('#milestoneFilterLabel').text(getNiceShortMilestone($.GLOBALS.cur_milestone, $.GLOBALS.cur_riversion))
    $('#versionFilterLabel').text($.GLOBALS.cur_version || 'unfiltered')
    $('#riVersionFilterLabel').text($.GLOBALS.cur_riversion || 'unfiltered')

    if ($.GLOBALS.cur_office !== undefined) {
        if ($.GLOBALS.cur_office == '1') {
            $('#officeFilterLabel').text('Using O15')
        } else {
            $('#officeFilterLabel').text('Not using O15')
        }
    } else {
        $('#officeFilterLabel').text('unfiltered')
    }

    $('#envFilterLabel').text($.GLOBALS.cur_env || 'unfiltered')
    $('#fatalFilterLabel').text(typeof ($.GLOBALS.cur_fatal) === undefined ? 'unfiltered' : ($.GLOBALS.cur_fatal == '1' ? 'fatal' : 'non-fatal'))

    $.GLOBALS.pretty_filter_text = filter_pretty;
    if ($prettyMilstoneLabel) { $prettyMilstoneLabel.text(filter_pretty) }
}

function renderCachingInfo(caching_info) {
    "use strict";

    var provenance = $('#dataProvenance div');
    
    if (!caching_info) {
        provenance.html('<div>no caching info</div>')
        console.log('  no caching info')
        return
    }

    var h = "<div>";

    if (caching_info.cached) {
        h += "<h2>Report data is <b>cached</b></h2><br/>"
    } else {
        h += "<h2>Report data is <b>not cached</b></h2><br/>"
    }
    
    if (caching_info.hasOwnProperty('data_origin')) {
        h += "<h2>Report data from <b>"+caching_info.data_origin+"cached</b></h2><br/>"
    }

    if (caching_info.hasOwnProperty('last_updated')) {
        caching_info.last_updated = parseDotNetDateString(caching_info.last_updated)
        h += "<h2>Query Last Updated:</h2><p><br/>&nbsp;" + caching_info.last_updated.toString() + "</p><br/>"
    }

    var tables = new Array()
    for (var dep_table in caching_info.dependent_table_update_info) {
        if (caching_info.dependent_table_update_info.hasOwnProperty(dep_table)) { tables.push(dep_table) } 
    }
    if (tables.length) {
        var table = "";
        if (caching_info.hasOwnProperty('dependent_table_update_info')) {
            table += "<h2>Dependent Tables</h2>"
            table += "<table class='statGrid statGridDense dataProvenanceTable'>";
            table += "<thead><tr><td>table</td><td>last updated</td></tr></thead><tbody>";
            for (var dep_table_idx = 0; dep_table_idx < tables.length; dep_table_idx++) {
                var lut = caching_info.dependent_table_update_info[tables[dep_table_idx]];
                if (lut) {
                    var lutd = parseDotNetDateString(lut)
                    if (!isNaN(lutd.getTime()) ) {
                        lut = parseDotNetDateString(lut)
                    }
                } else {
                    lut = 'N/A'
                }
                table += "<tr><td>" + tables[dep_table_idx] + "</td><td>" + lut + "</td></tr>";
            }
            table += "</tbody></table>";
        }
        h += table;
    }

    h += "</div>";

    provenance.html(h);
}






