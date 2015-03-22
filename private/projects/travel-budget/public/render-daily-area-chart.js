function renderDailyAreaChart(data, rootElement, config) {
    "use strict";

    if (!data) return;

    var date_map = data.date_map;
    var descriptions = data.details;
    var labels = data.legend_labels;
    var raw_data = data.raw;
    var title = data.title;
    var dom_element = '#'+rootElement;
    
    var stack_data = new Array(labels.length);
    var dates = [];
    var i;
    
    for (i = 0; i < labels.length; i++) { stack_data[i] = []; }
    for (var date in date_map) {
        if (date_map.hasOwnProperty(date)) {
            dates.push(new Date(date));
        }
    }
    
    var raw_expenses = [];
    
    var reverse_dates = {}; // dunno why indexOf doesn't work
    
    dates = dates.sort(function(lhs, rhs) { return (rhs.getTime() > lhs.getTime() ? 1 : (rhs.getTime() < lhs.getTime() ? -1 : 0 ) ); } ).reverse();
    _.each(dates, function(d, i) { reverse_dates[d] = i; });
    
    for (var date_idx = 0; date_idx < dates.length; date_idx++) {
        for (i = 0; i < date_map[dates[date_idx]].y.length; i++) {
            var el = {
                  label :   labels[i],
                  label_idx : i,
                  x :       date_idx,
                  y :       date_map[dates[date_idx]].y[i],
                  details : date_map[dates[date_idx]].details[i]
            }
            console.assert(!isNaN(el.y));
            raw_expenses.push(el);
            stack_data[i].push(el);
        }
    }
    
    _.each(raw_data, function(d) { d.x = reverse_dates[d.Date]; d.label = labels[d.category_idx]; });
    var sorted_expenses = raw_data.sort(function(lhs, rhs) { return rhs.y > lhs.y ? 1 : (rhs.y < lhs.y ? -1 : 0) });
    var top_expenses = sorted_expenses.slice(0, 10);
    
    _.each(top_expenses, function(d, i) { d.expense_order = i; });
    
    var average_stack_data = [];
    var spent_labels = [];
    _.each(labels, function(d, i) {
        var avg = [ { label : labels[i],
                x :     dates.length,
                y :     d3.sum(dates, function(d) { return date_map[d].y[i]; }) / dates.length }];
        if (avg[0].y > 0) {
            average_stack_data.push(avg);
            spent_labels.push(labels[i]);
        };
    } );

    var stack_layout_data = d3.layout.stack().offset(0)(stack_data);
    var average_layout_data = d3.layout.stack().offset(0)(average_stack_data);

    var w = config.width,
        h = config.height,
        margin = 50,
        p = 20,
        inner_pad = 20,
        left_pad = 150,
        sampsize = dates.length,
        maxval = d3.max(_.map(dates, function(d) { return date_map[d]; }), function(d) { return d3.sum(d.y); }),
        bottom = h-inner_pad,
        xExtent = d3.extent([0,sampsize]),
        xExtentDates = [dates[0], dates[dates.length-1]],
        yExtent = d3.extent([0,maxval]),
        xScale = d3.scale.linear().domain(xExtent).range([inner_pad, w-left_pad-inner_pad]), // evidently the stack layout requires a numerical x axis
        xScaleDates = d3.time.scale().domain(xExtentDates).range([inner_pad, w-left_pad-inner_pad]),
        xScaleBand = d3.scale.ordinal().rangeRoundBands([inner_pad, w-left_pad-inner_pad], 0.1),
        yScale = d3.scale.linear().domain(yExtent).nice().range([h-inner_pad, inner_pad]);

    var color_stacked = defaultColors();

    var legend_item = new Array(spent_labels.length);

    for (i = 0; i < spent_labels.length; i++) {
        legend_item[i] = { 'name'  : spent_labels[i],
                           'color' : color_stacked(i/spent_labels.length),
                           'text'  : descriptions[i] };
        average_stack_data[i][0].legend_item = legend_item[i];
        average_stack_data[i][0].legend_item.series_label = legend_item[i].name + " $"+average_stack_data[i][0].y.toFixed(2) + "/d";
    }
    
    var bar_stack_y0 = {};
    _.each(stack_layout_data, function(d,i) {
        bar_stack_y0[i] = {};
        _.each(d, function(d, j) {
            bar_stack_y0[i][j] = d.y0;
        });
    });

    var color_by_type = function(d) {
        if (!legend_item.hasOwnProperty(d.type)) return 'rgba(180,180,180, 0.5)';
        return legend_items[d.type].color;
    };

    var chartsvg = d3.select(dom_element)
                .append("svg:svg")
                    .attr("ViewBox", "0 0 500 500")
                    .attr("preserveAspectRatio", "xMinYMin meet")
                    .attr("class", "chartsvg")
                    .attr("width", w + p * 2)
                    .attr("height", h + p * 2);

    var top_bar_g = chartsvg
                .append("svg:g")
                    .datum(0)
                    .attr("transform", "translate(" + p + "," + p + ")")
                    .attr("id", "topBarsArea")
                    .attr("class", "top-level-graphic");

    var vis =   chartsvg
                .append("svg:g")
                    .datum(1)
                    .attr("transform", "translate(" + p + "," + p + ")")
                    .attr("id", "chartArea")
                    .attr("class", "top-level-graphic");


    var dialogElementName = rootElement+'Dialog';
    $('#'+rootElement).append("<div id='"+dialogElementName+"'/>");
    var dialog_config = {
            autoOpen: false,
            modal: true,
            my: "center",
            at: "center",
            of: window,
            title: 'Spending Detail'
    };
    $('#'+dialogElementName).dialog(dialog_config).html();

    buildGradients(vis, labels.length, 'gradient');

    var topbars = function(g) {
            g
                .attr("width", (xScale(1)-xScale(0)) * 0.80 )
                .attr("y", function(d) {
                        console.assert( !isNaN(yScale(bar_stack_y0[d.category_idx][d.x])));
                        return yScale(bar_stack_y0[d.category_idx][d.x]+d.y); })
                .attr("x", function(d) { return xScale(d.x); })
                .attr("height", function(d) { return Math.abs(yScale(0) - yScale(d.y)); });
    }
    
    var seriesLabel = function(g) {
        g.each(function() {
            var g = d3.select(this);
            g
                .attr("x", function(d) { return xScale(d.x); })
                .attr("y", function(d) { return yScale(d.y + d.y0 + d.y_offset); });
        } );
    };

    var titleSeriesLabel = function(g) {
        g.each(function() {
            var g = d3.select(this);
            g
                .attr("x", function(d) { return xScale(d.x); })
                .attr("y", function(d) { return yScale(yScale.domain()[1] + yScale.invert(0) - yScale.invert(0)); });
        } );
    };

    var barCategoryEnter = vis.selectAll(".barChart")
        .data(stack_layout_data).enter()
        .append("svg:g")
            .style("fill", function(d,i) { return legend_item[i % legend_item.length].color; });
            
    var barRectEnter = barCategoryEnter.selectAll(".barrect")
        .data(function(d) { return d; }).enter()
        .append("rect")
        .classed({ "barrect" : true, "hide" : true });

   barRectEnter
            .call(d3.helper.tooltip(function (d,i) {
                var bodyNode = d3.select('#chartArea').node();
                var m = d3.mouse(bodyNode);
                var date_idx = Math.floor(xScale.invert(m[0]))+1;
                var date = xScaleDates.invert(m[0]);
                var tooltip_html = '<div class="tooltip"> '+ d3.time.format('%B %d')(date)  + '<br/>';//<table>';
                tooltip_html += "" + d.label + " &mdash; $" +  d.y.toFixed(2) + "</div>";
                return tooltip_html;
            }))
            .on('click', function (d, i) {
                var bodyNode = d3.select('#chartArea').node();
                var m = d3.mouse(bodyNode);
                var date_idx = Math.floor(xScale.invert(m[0]))+1;
                var date = xScaleDates.invert(m[0]);
                var dialog_html = '<h2> '+ d3.time.format('%B %d')(date) + '</h2><br/>';//<table>';
                dialog_html += "<ul>" + d.details + "</ul>";
                var areachartDialog = $('#'+dialogElementName);
                areachartDialog.html(dialog_html);
                areachartDialog.dialog('open');
            } );

    // define the y axis
    var yAxis = d3.svg.axis()
        .orient("left")
        .ticks(5)
        .scale(yScale);

    // define the x axis
    var xAxis = d3.svg.axis()
        .orient("bottom")
        .scale(xScaleDates)
        .tickFormat(config.axis_label_date_format);


    // draw y axis with labels and move in from the size by the amount of padding
    vis.append("g")
        .attr("class", "yaxis axis")
        .attr("transform", "translate(" + inner_pad + ",0)");

    // draw x axis with labels and move to the bottom of the chart area
    vis.append("g")
        .attr("class", "xaxis axis");  // two classes, one for css formatting, one for selection below

    // create line data by taking the series data and appending an average value to line up with the series label
    var series_label_line_data = [];
    _.each(stack_layout_data, function(d) { series_label_line_data.push(d); } );
    _.each(average_layout_data, function(d,i) { series_label_line_data[i].push(d[0]) } );

    var lines = [];
    var averages = [];
    var line_fcn = function(legend_item_num, data) { return d3.svg.line()
            .interpolate('basis')//movingAvg(3))
            .x(function(d) { return xScale(d.x); })
            .y(function(d) { return yScale(d.y+d.y0); })(data[legend_item_num]);
            };
    
    var data_series = vis
        .append("svg:g")
        .attr("class", "series");
    
    for (var legend_item_num = 0; legend_item_num < legend_item.length; legend_item_num++) {
        var line = line_fcn.bind(undefined, legend_item_num);
        lines.push(line);
        
        data_series
            .append("path")
            .attr("fill", "none")
            .attr("class", "chart-line series" + legend_item_num)
            .attr("stroke", function(d,i) { return d3.rgb(legend_item[legend_item_num].color).toString(); });
    }

   var series_label = vis
        .append("svg:g")
        .selectAll(".series-label");
        
    var series_label_data = $.map(average_layout_data, function (d) {
            var dnew = jQuery.extend({}, d[0]);
            dnew.y_offset = 0;
            dnew.class = "series-label";
            return dnew; });
    var last_series_label = series_label_data[series_label_data.length-1];
    
    // TODO: add title datum to the series to handle both with the same code
    var titles_data = [({x: series_label_data[series_label_data.length-1].x,
                         y: last_series_label.y,
                         legend_item : { series_label: "Daily Average $" + (last_series_label.y + last_series_label.y0).toFixed(2) },
                         class: "title-series-label"
                         })];
    
   series_label
        .data(series_label_data)
        .enter()
            .append("svg:text")
            .attr("class", function(d) { return d.class; })
            .attr("dx", "5")
            .attr("text-anchor", "start")
            .attr("alignment-baseline", "middle")
            .text(function(d)           { return d.legend_item.series_label; });

   var titles = vis
          .append("svg:g")
        .selectAll(".title-series-label")
        .data(titles_data)
        .enter()
            .append("svg:text")
            .attr("class", function(d) { return d.class; })
            .attr("text-anchor", "start")
            .attr("alignment-baseline", "middle")
            .text(function(d)      { return d.legend_item.series_label; });

    top_bar_g.append("svg:rect")
        .attr('class', "top-bar-shade")
        .attr("x", -p)
        .attr("y", -p)
        .attr('opacity', 0.0);
    
    var top_bars = top_bar_g.selectAll(".topBars")
        .append("svg:g")
        .data(top_expenses).enter()
        .append("svg:g");
        
    top_bars.append("rect")
        .style("fill", function(d) { return legend_item[d.category_idx % legend_item.length].color; })
        .attr("class", "topbars")
        .attr('opacity', 0)
        .call(topbars);
        
    top_bars.append("svg:text")
        .attr("class", "topbars")
        .text(function(d) { return d.detail; } )
        .call(topbars)
        .attr("dy", "5px")
        .attr("dx", "0.5em")
        .attr('opacity', 0);


    function getElementSize() {
        var element_width = parseInt(d3.select(dom_element).style("width"), 10);
        var element_height = parseInt(d3.select(dom_element).style("height"), 10);
        
        return [ element_width, element_height ];
    }
    
    function resize() {
        var element_size = getElementSize();

        var height = element_size[1] - margin * 2;
        var width  = element_size[0] - margin * 2;

        xScale.range([inner_pad, width-left_pad-inner_pad]);
        xScaleDates.range([inner_pad, width-left_pad-inner_pad]);
        yScale.range([height, 0]).nice();

        // if we have only a tiny space, just print the sparklines and series label
        if (width < 300 || height < 200) {
            vis.select('.xaxis').style("display", "none");
            vis.select('.yaxis').style("display", "none");
            vis.selectAll('.barrect').style("display", "none");
            xScale.range([0, width-left_pad]);
            xScaleDates.range([0, width-left_pad]);
            yScale.range([height+margin, -margin]).nice();
        // with a little more room we add the axes, but not the bars
        } else if (width < 600 && height < 500) {
            vis.select('.xaxis').style("display", "initial");
            vis.select('.yaxis').style("display", "initial");
            vis.selectAll('.barrect').style("display", "none");
        } else {
        // with enough space, you get the works!
            vis.select('.xaxis').style("display", "initial");
            vis.select('.yaxis').style("display", "initial");
            vis.selectAll('.barrect').style("display", "initial");
        }

        yAxis.ticks(Math.max(height/50, 2));
        xAxis.ticks(Math.max(width/50, 2));

        chartsvg
           .attr("width", width + margin*1)
           .attr("height", height + margin*2-2);

        vis.select('.xaxis')
           .attr("transform", "translate(0," + height + ")")
           .call(xAxis);

        vis.selectAll(".xaxis text")  // select all the text elements for the xaxis
           .attr("transform", rotateLabelText);

        vis.select('.yaxis')
           .call(yAxis);

        vis.selectAll("rect.barrect")
                .classed({"barrect": true, "hide" : false})
                .attr("y", function(d) { return yScale(0); })
                .attr("height", 0)
                .transition()
                    .duration(1000)
                        .attr("width", (xScale(1)-xScale(0)) * 0.80 )
                        .attr("y", function(d) { return yScale(d.y0+d.y); })
                        .attr("x", function(d) { return xScale(d.x); })
                        .attr("height", function(d) { return Math.abs(yScale(0) - yScale(d.y)); });
                
                
        vis.selectAll(".topbars")
            .call(topbars);
        top_bar_g.selectAll(".top-bar-shade")
            .attr("width", element_size[0])
            .attr("height", element_size[1])
            .attr('opacity', 0.0);
            
        // Tweak the positions of the series labels so that:
        // (1) they're as close as possible to their "true" position — the average value of the spending category
        // (2) they don't overlap
        // (3) they don't run off the end of the chart
        _.each(series_label_data, function(d, i) { d.y_offset = 0; } );
        
        var label_y_range = Math.abs(d3.max(series_label_data, function(d) { return d.y; } ) - d3.min(series_label_data, function(d) { return d.y; } ) );

        vis.selectAll(".series-label").each(function(d) {
            var n = d3.select(this);
            d.bbox = n.node().getBoundingClientRect();
        });
        
        // check if we need to shift (skew) the labels downward to fit them all in the height we have available
        var skew = (Math.abs(yScale.invert((series_label_data[0].bbox.height + 5)* series_label_data.length))  - yScale.invert(0)) - label_y_range;

        var bottom_skew = 0;
        if (skew > 0) {
            // not enough room to align both top and bottom series labels, so we have to skew them up and down
            if (series_label_data[0].y - (skew / 2) < 0) {
                // we can't skew as much as we'd like to the bottom, but go as far as possible
                bottom_skew = series_label_data[0].y;
            } else {
                // we have enough space to skew as much as we need and not hit the bottom of the chart
                bottom_skew = skew/2;
            }

            _.each(series_label_data, function(d) { d.y_offset -= bottom_skew; } );
        } else {
            skew = 0;
        }
        
        // prevent overlap between the labels
        _.each(series_label_data, function(d, i) {
        
            if (i > 0) {
                var line_height = Math.abs(yScale.invert(series_label_data[i-1].bbox.height + 5) - yScale.invert(0));

                var y = d.y + d.y0 + d.y_offset;
                var y_prev = series_label_data[i-1].y + series_label_data[i-1].y0 + series_label_data[i-1].y_offset;
                if (y < (y_prev + line_height)) {
                    d.y_offset += (y_prev + line_height) - y;
                }
            }
        } );
        
        vis.selectAll(".series-label")
           .call(seriesLabel);
        vis.selectAll(".title-series-label")
           .call(titleSeriesLabel);

        // join up the series lines with the new position of the labels
        _.each(series_label_data, function(d, i) { series_label_line_data[i][series_label_line_data[i].length-1].y = d.y + d.y_offset; } );

        _.each(legend_item, function(d, i) {
            var flat_line =
                d3.svg.line()
                    .interpolate('basis')
                    .x(function(d) { return xScale(d.x); })
                    .y(yScale(0))
                        (stack_layout_data[i]);
                        
            vis.selectAll(".series"+i)
                .attr( "d", flat_line )
                .transition()
                    .duration(1000)
                .attr( "d", lines[i](series_label_line_data) );
        } );

    }

    d3.select(window).on('resize', resize);

    resize();
    
    var showTop = function(show) {
        "use strict";
        
        if (show) {
            // show the top expenses.
            
            var element_size = getElementSize();
            var bar_width = 400;
            var bar_height = 40;
            var bar_margin = { x: 10, y: 5 };
            var bar_padding = 10;

            var text_bboxes = [];
            top_bar_g.selectAll("text.topbars").each(function(d) { text_bboxes.push( d3.select(this).node().getBoundingClientRect() ); });
            
            var max_text_width = d3.max(text_bboxes.map(function(d) { return d.width; }));
            var max_text_height = d3.max(text_bboxes.map(function(d) { return d.height; }));

            bar_width  = max_text_width  + bar_margin.x * 2;
            bar_height = max_text_height + bar_margin.y * 2;
            
            // bring top expenses visualization to the foreground
            chartsvg.selectAll(".top-level-graphic").sort(d3.descending);
            
            // make the top expense bars opaque then transition them to their new sizes
            top_bar_g.selectAll(".topbars")
                 .attr('opacity', function(d, i) { if (((d.expense_order) * (bar_height + bar_padding) + bar_height) > (element_size[1]-p)) return 0.0; return 10.0; })
            .transition()
                .attr("x", (element_size[0] - bar_width)/2)
                .attr("y", function(d) { return d.expense_order*(bar_height + bar_padding); } )
                .attr("height", bar_height )
                .attr("width", bar_width );
                
            top_bar_g.selectAll("text.topbars").attr("dy", function(d) { return (max_text_height + bar_margin.y) + "px" } );
            
            // blur the background
            vis.selectAll("*").transition().attr('filter', 'url(#blur)');
            
            // make any click on the top bar shade move us out of this mode.
            top_bar_g.selectAll("rect.top-bar-shade")
                    .on('click', function(d) { showTop(false); });
        } else {
            // hide the top expenses
            
            chartsvg.selectAll(".top-level-graphic").sort(d3.ascending);
            top_bar_g.selectAll("text.topbars").attr('opacity', 0.0);
            top_bar_g.selectAll(".topbars")
            .transition().attr('opacity', 0.0).call(topbars)
                .each("end", function() {
                    vis.selectAll("*").attr('filter', '');
                });
        }
    }
    
    return {
        showTop: showTop
    };
}
