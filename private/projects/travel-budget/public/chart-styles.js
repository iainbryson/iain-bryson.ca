/*global d3 $*/

function defaultColors() {
    //var color_stacked = d3.interpolateRgb($.GLOBALS.chart_color_range_start, $.GLOBALS.chart_color_range_end);

    return d3.scale.category10(); //d3.scale.ordinal().range($.GLOBALS.chart_colors);
}

function buildGradients(vis, numGradients, gradientRootName) {
    "use strict";
    var i;
    var colors = defaultColors();

    for (i = 0; i < numGradients; i++) {
        var gradient = vis.append("svg:defs")
                          .append("svg:linearGradient")
                            .attr("id", gradientRootName + i)
                            .attr("x1", "100%")
                            .attr("y1", "0%")
                            .attr("x2", "100%")
                            .attr("y2", "100%")
                            .attr("spreadMethod", "pad");

        gradient.append("svg:stop")
                .attr("offset", "0%")
                .attr("stop-color", colors(i / numGradients))
                .attr("stop-opacity", 0.7);

        gradient.append("svg:stop")
                .attr("offset", "100%")
                .attr("stop-color", colors(i / numGradients))
                .attr("stop-opacity", 0);
    }
}

// roughly compute an appropriate xAxis label angle given the dimensions of the labels,
// the axis width and the number of ticks.
// MATHS!: http://math.stackexchange.com/questions/33150/in-the-equation-x-cos-theta-y-sin-theta-z-how-do-i-solve-in-terms-of
function computeXAxisLabelAngle(label_text_point_size, typical_label_length, axis_width, axis_ticks) {
    "use strict";

    var est_label_width = label_text_point_size * typical_label_length; // very rough
    var est_label_height = label_text_point_size;

    var tick_width = Math.ceil(axis_width / axis_ticks);

    if (tick_width < est_label_height) {
        return -90; // best we can do, but there will be overlap between the labels
    }

    if (tick_width > est_label_width) {
        return 0; // don't need any rotation at all
    }

    var phi = Math.asin(est_label_width / Math.sqrt(est_label_width * est_label_width + est_label_height * est_label_height));
    var theta_plus_phi = Math.asin(tick_width / Math.sqrt(est_label_width * est_label_width + est_label_height * est_label_height));
    var angle =180* (theta_plus_phi - phi)/Math.PI;

    return angle;
}

// rotate text on x axis
// solution based on idea here: https://groups.google.com/forum/?fromgroups#!topic/d3-js/heOBPQF3sAY
// first move the text left so no longer centered on the tick
// then rotate up to get 45 degrees.
function xAxisTransform(d) {
    "use strict";

    var angle = $.GLOBALS.xaxis_label_angle;

    if (this.parentNode && this.parentNode.parentNode && this.parentNode.parentNode.attributes.hasOwnProperty('label-rotation')) {
        angle = Number(this.parentNode.parentNode.attributes['label-rotation'].nodeValue);
    }
    var w = this.getBBox().width;
    var h = this.getBBox().height;
    var x = ((w*Math.cos(angle*Math.PI/180.0) + h*(-2)*Math.sin(angle*Math.PI/180.0))*-0.5); // 0* on the sin component is a hack to handle the whitespace above the text.
    var y = ((w*Math.sin(angle*Math.PI/180.0) + h*Math.cos(angle*Math.PI/180.0))*-0.5)+8; // +8 is a hack to move the text below the axis line.
    return "translate(" +  x + ","+ y + ")"+"rotate("+angle+")";
}
