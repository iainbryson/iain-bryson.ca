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
            raw_expenses.push(el);
            stack_data[i].push(el);
        }
    }
    
    _.each(raw_data, function(d) { d.x = reverse_dates[d.x]; d.label = labels[d.category_idx]; });
    var sorted_expenses = raw_data.sort(function(lhs, rhs) { return rhs.y > lhs.y ? 1 : (rhs.y < lhs.y ? -1 : 0) });
    var top_expenses = sorted_expenses.slice(0, 10);
    
    _.each(top_expenses, function(d, i) { d.expense_order = i; });
    
    var average_stack_data = [];
    _.each(labels, function(d, i) {
        average_stack_data.push([ { label : labels[i],
                                    x :     dates.length,
                                    y :     d3.sum(dates, function(d) { return date_map[d].y[i]; }) / dates.length }]);
    } );

    var stack_layout_data = d3.layout.stack().offset(0)(stack_data);
    var average_layout_data = d3.layout.stack().offset(0)(average_stack_data);

    var w = config.width,
        h = config.height,
        margin = 50,
        p = 20,
        inner_pad = 20,
        left_pad = 100,
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

    var legend_item = new Array(labels.length);

    for (i = 0; i < labels.length; i++) {
        legend_item[i] = { 'name'  : labels[i],
                           'color' : color_stacked(i/labels.length),
                           'text'  : descriptions[i] };
        average_stack_data[i][0].legend_item = legend_item[i];
        average_stack_data[i][0].legend_item.series_label = legend_item[i].name + " $"+average_stack_data[i][0].y.toFixed(2) + " Avg.";
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
    var vis =   chartsvg
                .append("svg:g")
                    .attr("transform", "translate(" + p + "," + p + ")")
                    .attr("id", "chartArea");

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

    var barrect = function(g) {
        g.each(function() {
            var g = d3.select(this);
            g
                .attr("width", (xScale(1)-xScale(0)) * 0.80 )
                .attr("y", function(d) { return yScale(d.y0+d.y); })
                .attr("x", function(d) { return xScale(d.x); })
                .attr("height", function(d) { return Math.abs(yScale(0) - yScale(d.y)); });
        });
    };
    
    var topbars = function(g) {

//g.each(function() {
  //          var g = d3.select(this);
            g
                .attr("width", (xScale(1)-xScale(0)) * 0.80 )
                .attr("y", function(d) { return yScale(bar_stack_y0[d.category_idx][d.x]+d.y); })
                .attr("x", function(d) { return xScale(d.x); })
                .attr("height", function(d) { return Math.abs(yScale(0) - yScale(d.y)); });
    //    });
    }
    
    var seriesLabel = function(g) {
        g.each(function() {
            var g = d3.select(this);
            g
                .attr("x", function(d) { return xScale(d.x); })
                .attr("y", function(d) { return yScale(d.y); });
        } );
    };

    var titleSeriesLabel = function(g) {
        g.each(function() {
            var g = d3.select(this);
            g
                .attr("x", function(d) { return xScale(d.x); })
                .attr("y", function(d) { return yScale(yExtent[1]*0.8); });
        } );
    };

    vis.selectAll(".barChart")
        .data(stack_layout_data).enter()
        .append("svg:g")
            .style("fill", function(d,i) { return legend_item[i % legend_item.length].color; })
            .selectAll(".bars")
        .data(function(d) { return d; }).enter()
        .append("rect")
            .attr("class", "barrect")
            .call(barrect)
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
            } )
            .call(d3.helper.tooltip(function (d,i) {
                var bodyNode = d3.select('#chartArea').node();
                var m = d3.mouse(bodyNode);
                var date_idx = Math.floor(xScale.invert(m[0]))+1;
                var date = xScaleDates.invert(m[0]);
                var tooltip_html = '<div class="tooltip"> '+ d3.time.format('%B %d')(date)  + '<br/>';//<table>';
                tooltip_html += "" + d.label + " &mdash; $" +  d.y + "</div>";
                return tooltip_html;
            }));

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
        .attr("transform", "translate(" + inner_pad + ",0)")
        .call(yAxis);

    // draw x axis with labels and move to the bottom of the chart area
    vis.append("g")
        .attr("class", "xaxis axis")  // two classes, one for css formatting, one for selection below
        .attr("transform", "translate(0," + (h - inner_pad) + ")")
        .call(xAxis);

    var lines = [];
    var averages = [];
    var line_fcn = function(legend_item_num) { return d3.svg.line()
            .interpolate(movingAvg(3))
            .x(function(d) { return xScale(d.x); })
            .y(function(d,i) { return yScale(d.y+d.y0); })(stack_layout_data[legend_item_num]);
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
            .attr("stroke", function(d,i) { return d3.rgb(legend_item[legend_item_num].color).toString(); })
            .attr("d", line());
    }

   var series_label = vis
        .append("svg:g")
        .selectAll(".series-label");
        
    var series_label_data = $.map(average_layout_data, function (d) { d[0].y += d[0].y0; return d; })
    var last_series_label = series_label_data[series_label_data.length-1];
    
    var titles_data = [({x: series_label_data[series_label_data.length-1].x, y: yScale.invert(40), legend_item : { series_label: "Daily Average $"+last_series_label.y.toFixed(2) }})];
    
   series_label
        .data(series_label_data)
        .enter()
            .append("svg:text")
            .attr("class", "series-label")
            .attr("text-anchor", "start")
            .attr("alignment-baseline", "middle")
            .text(function(d)      { return d.legend_item.series_label; })
            .call(seriesLabel);

   var titles = vis
          .append("svg:g")
        .selectAll(".title-series-label")
        .data(titles_data)
        .enter()
            .append("svg:text")
            .attr("class", "title-series-label")
            .attr("text-anchor", "start")
            .attr("alignment-baseline", "middle")
            .text(function(d)      { return d.legend_item.series_label; })
            .call(titleSeriesLabel);



    var top_bars = vis.selectAll(".topBars")
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
        .attr("dy", "1.5em")
        .attr("dx", "0.5em")
        .attr('opacity', 0);


    function resize() {
        var width = parseInt(d3.select(dom_element).style("width"), 10),
        height = parseInt(d3.select(dom_element).style("height"), 10);

        console.log("d3 w" + width + " h " + height);
        
        height -= margin * 2;
        width -= margin * 2;

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

        vis.selectAll(".barrect")
           .call(barrect);

        vis.selectAll(".topbars")
            .call(topbars);

        _.each(legend_item, function(d, i) {
            vis.selectAll(".series"+i).attr("d", lines[i]());
        } );
        
        var foci = [], labels=[];
        
        series_label_data.forEach(function(d, i) {
            foci.push({x: d.x, y: d.y});
        });

        // Create the force layout with a slightly weak charge
        var force = d3.layout.force()
            .nodes(series_label_data)
            .charge(-20)
            .chargeDistance(7)
            .gravity(0)
            .size([width, height]);

        force.on("tick", function(e) {
            console.log('tick');
            var k = .1 * e.alpha;
            series_label_data.forEach(function(o, j) {
                // The change in the position is proportional to the distance
                // between the label and the corresponding place (foci)
                o.y += (foci[j].y - o.y) * k;
                //o.x += (foci[j].x - o.x) * k;
            });

            // Update the position of the text element
            vis.selectAll(".series-label")
               .call(seriesLabel);
        });

        vis.selectAll(".series-label")
           .call(seriesLabel);
        vis.selectAll(".title-series-label")
           .call(titleSeriesLabel);

        force.start();

    }

    d3.select(window).on('resize', resize);

    resize();
    
    var showTop = function(show) {
        if (show) {
            vis.selectAll(".topbars")
                .attr('opacity', 10.0)
            .transition()
                .attr("x", (xScale(dates.length) - 400)/2)
                .attr("y", function(d) { return d.expense_order*50; } )
                .attr("height", 40 )
                .attr("width", 400)
                .each("end", function() {
                     vis.selectAll("text.topbars").attr('opacity', 1.0);
                });
        } else {
            vis.selectAll("text.topbars").attr('opacity', 0.0);
            vis.selectAll(".topbars")
            .transition().call(topbars)
                .each("end", function() {
                     vis.selectAll(".topbars").attr('opacity', 0.0);
                });

        }
    }
    
    return {
        showTop: showTop
    };
}
