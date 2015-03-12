function renderDailyAreaChart(data, rootElement, config) {
    "use strict";

    if (!data) return;

    var date_map = data.date_map;
    var descriptions = data.details;
    var labels = data.legend_labels;
    var title = data.title;
    var dom_element = '#'+rootElement;
    
    var stack_data = new Array();
    var stack_data2 = new Array(labels.length);
    var dates = [];
    for (var i = 0; i < labels.length; i++) { stack_data2[i] = [] };
    for (var date in date_map) {
        if (date_map.hasOwnProperty(date)) {
            dates.push(new Date(date))
        };
    };
    dates = dates.sort(function(lhs, rhs) { return (rhs.getTime() > lhs.getTime() ? 1 : (rhs.getTime() < lhs.getTime() ? -1 : 0 ) ) } ).reverse();
    for (var date_idx = 0; date_idx < dates.length; date_idx++) {
        stack_data.push(date_map[dates[date_idx]])
        for (var i = 0; i < date_map[dates[date_idx]].y.length; i++) {
            stack_data2[i].push({ label : labels[i], x:date_idx, y:date_map[dates[date_idx]].y[i], details:date_map[dates[date_idx]].details[i]})
        };
    };

    var average_stack_data = [];
    for (var i = 0; i < labels.length; i++) {
        average_stack_data.push([ { label : labels[i], x: dates.length, y: d3.sum(dates, function(d) { return date_map[d].y[i] }) / dates.length }]);
    }

    var stack_layout_data = d3.layout.stack().offset(0)(stack_data2);
    var average_layout_data = d3.layout.stack().offset(0)(average_stack_data);

    var w = config.width,
        h = config.height,
        margin = 50,
        p = 20,
        inner_pad = 20,
        left_pad = 100,
        sampsize = dates.length,
        maxval = d3.max(stack_data, function(d) { return d3.sum(d.y) }),
        bottom = h-inner_pad,
        xExtent = d3.extent([0,sampsize]),//stack_data, function(d) { return d.x; }),
        xExtentDates = [dates[0], dates[dates.length-1]],
        yExtent = d3.extent([0,maxval]),
        xScale = d3.scale.linear().domain(xExtent).range([inner_pad, w-left_pad-inner_pad]), // evidently the stack layout requires a numerical x axis
        xScaleDates = d3.time.scale().domain(xExtentDates).range([inner_pad, w-left_pad-inner_pad]),
        xScaleBand = d3.scale.ordinal().rangeRoundBands([inner_pad, w-left_pad-inner_pad], .1),
        yScale = d3.scale.linear().domain(yExtent).nice().range([h-inner_pad, inner_pad]);

    var color_stacked = defaultColors();

    var legend_item = new Array(labels.length);

    for (var i = 0; i < labels.length; i++) {
        legend_item[i] = { 'name'  : labels[i],
                           'color' : color_stacked(i/labels.length),
                           'text'  : descriptions[i] };
        average_stack_data[i][0].legend_item = legend_item[i];
        average_stack_data[i][0].legend_item.series_label = legend_item[i].name + " $"+average_stack_data[i][0].y.toFixed(2) + " Avg.";
    };

    var color_by_type = function(d) {
        if (!legend_item.hasOwnProperty(d.type)) return 'rgba(180,180,180, 0.5)';
        return legend_items[d.type].color;
    };

    var area = d3.svg.area()
                .x(function(d, i) { return xScale(d.x);})
                .y0(function(d) { return yScale(d.y0); })
                .y1(function(d) { return yScale(d.y+d.y0); });

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
                    .attr("id", "chartArea")

    $('#'+rootElement).append("<div id='areachartDialog'/>");
    var dialog_config = {
            autoOpen: false,
            modal: true,
            my: "center",
            at: "center",
            of: window,
            title: 'Spending Detail',
    };
    $('#areachartDialog').dialog(dialog_config).html();

    buildGradients(vis, labels.length, 'gradient');

  vis.selectAll(".barChart")
    .data(stack_layout_data).enter()
        .append("svg:g")
            .style("fill", function(d,i) { return legend_item[i % legend_item.length].color })
            .selectAll(".bars")
    .data(function(d) { return d; }).enter()
        .append("rect")
            .attr("class", "barrect")
            .attr("width", (xScale(1)-xScale(0))*.80 )
            .attr("y", function(d) { return yScale(d.y0+d.y); })
            .attr("x", function(d) { return xScale(d.x); })
            .attr("height", function(d) { return Math.abs(yScale(0) - yScale(d.y)); })
            .on('click', function (d, i) {
                var bodyNode = d3.select('#chartArea').node();
                var m = d3.mouse(bodyNode);
                var date_idx = Math.floor(xScale.invert(m[0]))+1;
                var date = xScaleDates.invert(m[0]);
                var dialog_html = '<h2> '+ d3.time.format('%B %d')(date) + '</h2><br/>';//<table>';
                console.log("dialog for i=" + i + " date_idx = " + date_idx);
                console.log(d)
                dialog_html += "<ul>" + d.details + "</ul>";
               // dialog_html += (stack_data2[i][date_idx].details || "") + "<br/>";
                //dialog_html += legend_item[i].name;
                console.log(dialog_html);
                var areachartDialog = $('#areachartDialog');
                areachartDialog.html(dialog_html)
                areachartDialog.dialog('open');
            } )
            .call(d3.helper.tooltip(function (d,i) {
                var bodyNode = d3.select('#chartArea').node();
                var m = d3.mouse(bodyNode);
                var date_idx = Math.floor(xScale.invert(m[0]))+1;
                var date = xScaleDates.invert(m[0]);
                var tooltip_html = '<div class="tooltip"> '+ d3.time.format('%B %d')(date)  + '<br/>';//<table>';
                tooltip_html += "" + d.label + " &mdash; $" +  d.y + "</div>";
                //tooltip_html += (stack_data2[i][date_idx].details || "") + "<br/>";
                //tooltip_html += legend_item[i].text;
               // tooltip_html += "</table>";
                return tooltip_html;
            }))

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
            .y(function(d,i) { return yScale(d.y+d.y0); })(stack_layout_data[legend_item_num])
            };
    
    var data_series = vis
        .append("svg:g")
        .attr("class", "series")
    
    for (var legend_item_num = 0; legend_item_num < legend_item.length; legend_item_num++){
        var line = line_fcn.bind(undefined, legend_item_num);
        lines.push(line);
        
        data_series
            .append("path")
            .attr("fill", "none")
            .attr("class", "chart-line series" + legend_item_num)
            .attr("stroke", function(d,i) { return d3.rgb(legend_item[legend_item_num].color).toString() })
            .attr("d", line());
    };
    

   var series_label = vis
        .append("svg:g")
        .selectAll(".series-label");
        
   series_label
        .data(average_layout_data)
        .enter()
            .append("svg:text")
            .attr("class", "series-label")
            .attr("x", function(d) { return xScale(d[0].x); })
            .attr("dy", 5)
            .attr("dx", ".5em")
            .attr("y", function(d) { return yScale(d[0].y + d[0].y0); })
            .text(function(d)      { return d[0].legend_item.series_label; })

    function resize() {
        var width = parseInt(d3.select(dom_element).style("width")) - margin*2,
        height = parseInt(d3.select(dom_element).style("height")) - margin*2;
//        var width = parseInt(d3.select('body').style("width")) - margin*2,
//        height = parseInt(d3.select('body').style("height")) - margin*2;

        console.log("d3 w" + width + " h " + height);
        height=width*0.66;

        xScale.range([inner_pad, width-left_pad-inner_pad]);
        xScaleDates.range([inner_pad, width-left_pad-inner_pad]);
        yScale.range([height, 0]).nice();

        if (width < 300 && height < 80) {
            vis.select('.xaxis').style("display", "none");
            vis.select('.yaxis').style("display", "none");

            vis.select(".first")
            .attr("transform", "translate(" + xScale(firstRecord.date) + "," + yScale(firstRecord.close) + ")")
            .style("display", "initial");

            vis.select(".last")
            .attr("transform", "translate(" + xScale(lastRecord.date) + "," + yScale(lastRecord.close) + ")")
            .style("display", "initial");
        } else {
            vis.select('.xaxis').style("display", "initial");
            vis.select('.yaxis').style("display", "initial");
            vis.select(".last")
            .style("display", "none");
            vis.select(".first")
            .style("display", "none");
        }

        yAxis.ticks(Math.max(height/50, 2));
        xAxis.ticks(Math.max(width/50, 2));

        chartsvg
          .attr("width", width + margin*2)
          .attr("height", height + margin*2)

        vis.select('.xaxis')
          .attr("transform", "translate(0," + height + ")")
          .call(xAxis);

        // now rotate text on x axis
        // solution based on idea here: https://groups.google.com/forum/?fromgroups#!topic/d3-js/heOBPQF3sAY
        // first move the text left so no longer centered on the tick
        // then rotate up to get 45 degrees.
        vis
        .selectAll(".xaxis text")  // select all the text elements for the xaxis
          .attr("transform", function(d) {
             return "translate(" + this.getBBox().height*-2 + "," + this.getBBox().height + ")rotate(-45)";
         });

        vis.select('.yaxis')
          .call(yAxis);

        vis.selectAll(".series-label")
                .attr("x", function(d) { return xScale(d[0].x); })
                .attr("y", function(d) { return yScale(d[0].y + d[0].y0); });
        
        vis.selectAll(".barrect")
           .attr("width", (xScale(1)-xScale(0))*.80 )
           .attr("y", function(d) { return yScale(d.y0+d.y); })
           .attr("x", function(d) { return xScale(d.x); })
           .attr("height", function(d) { return Math.abs(yScale(0) - yScale(d.y)); })

        for (var legend_item_num = 0; legend_item_num < legend_item.length; legend_item_num++)
        {
            vis.selectAll(".series"+legend_item_num).attr("d", lines[legend_item_num]());
        }
    }

    d3.select(window).on('resize', resize);

    resize();
}
