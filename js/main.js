//insert code here!
window.onload = function() {
    let width = 1000;
    let height = 500;

    // set the map projection to be Albers USA
    let projection = d3.geoAlbersUsa()
        .translate([width / 2, height / 2]) // center the map on the screen
        .scale([1000]);

    // path generator to draw the borders of the states
    let path = d3.geoPath()
        .projection(projection);

    // an svg container to hold the map
    let svg = d3.select("body")
        .append("svg")
        .attr("width", width)
        .attr("height", height);

    // load in the geoJSON data
    d3.json("/data/better-states.json").then(function(data) {
        console.log(data);

        // draw the state borders from the GeoJSON features
        svg.selectAll("path")
            .data(data.features)
            .enter()
            .append("path")
            .attr("d", path)
            .style("stroke", "#000")
            .style("stroke-width", "1")
            .style("fill", "white");
    });


}