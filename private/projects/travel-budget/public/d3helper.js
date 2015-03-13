/*global d3 $*/

d3.helper = {};

d3.helper.tooltip = function (accessor) {
    return function (selection) {
        var tooltipDiv;
        var bodyNode = d3.select('body').node();
        selection.on("mouseover", function (d, i) {
            // Clean up lost tooltips
            d3.select('body').selectAll('div.tooltip').remove();
            // Append tooltip
            tooltipDiv = d3.select('body').append('div').attr('class', 'tooltip');
            var absoluteMousePos = d3.mouse(bodyNode);
            tooltipDiv.style('left', (absoluteMousePos[0] + 10) + 'px')
                .style('top', (absoluteMousePos[1] - 15) + 'px')
                .style('position', 'absolute')
                .style('z-index', 1001);
            // Add text using the accessor function
            var tooltipText = accessor(d, i) || '';
            // Crop text arbitrarily
            tooltipDiv.style('width', function (d, i) { return (tooltipText.length > 80) ? '300px' : null; })
            //.style('height', '200px')
                .html(tooltipText);
        })
        .on('mousemove', function (d, i) {
            // Move tooltip
            if (typeof (tooltipDiv) !== 'undefined') {
                var absoluteMousePos = d3.mouse(bodyNode);
                tooltipDiv.style('left', (absoluteMousePos[0] + 10) + 'px')
                .style('top', (absoluteMousePos[1] - 15) + 'px');
                var tooltipText = accessor(d, i) || '';
                tooltipDiv.html(tooltipText);
            }
        })
        .on("mouseout", function (d, i) {
            // Remove tooltip
            if (typeof (tooltipDiv) !== 'undefined') {
                tooltipDiv.remove();
            }
        });
    };
};

// http://jsfiddle.net/plmrry/ktLtN/
// use as interpolation function: d3.svg.line().interpolate(movingAvg(3));
movingAvg = function(n) {
    return function (points) {
        ma_points = points.map(function(each, index, array) {
            var to = index + n - 1;
            var subSeq, sum;
            if (to < points.length) {
                subSeq = array.slice(index, to + 1);
                sum = subSeq.reduce(function(a,b) { return [a[0] + b[0], a[1] + b[1]]; });
                return sum.map(function(each) { return each / n; });
            }
            return undefined;
        });
        avg = points.map(function(d) { return d[1]; }).reduce(function(a,b) {return a+b;}) / points.length;
        
        ma_points = ma_points.filter(function(each) { return typeof each !== 'undefined' });
        ma_points.push([points[points.length-1][0], avg]);//ma_points[ma_points.length-1][1]]);
// TODO: move this part out
        ma_points.push([points[points.length-1][0]+(points[points.length-1][0]-points[points.length-2][0])*0.8, avg]);
        // Transform the points into a basis line
        pathDesc = d3.svg.line().interpolate("basis")(ma_points)
        // Remove the extra "M"
        return pathDesc.slice(1, pathDesc.length);
    }
}

// Rotate text on x axis
// solution based on idea here: https://groups.google.com/forum/?fromgroups#!topic/d3-js/heOBPQF3sAY
// first move the text left so no longer centered on the tick
// then rotate up to get 45 degrees.
rotateLabelText = function(d) {
     return "translate(" + this.getBBox().height*-2 + "," + this.getBBox().height + ")rotate(-45)";
}
