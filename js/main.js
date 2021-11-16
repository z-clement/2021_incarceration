//insert code here!
window.onload = function() {
    renderMap();
    renderNationalCharts();
}

// function to draw all the state borders
function renderMap() {
    let width = 1000;
    let height = 600;

    // set the map projection to be Albers USA
    let projection = d3.geoAlbersUsa()
        .translate([width / 2, height / 2]) // center the map on the screen
        .scale([1200]);

    // path generator to draw the borders of the states
    let path = d3.geoPath()
        .projection(projection);

    // an svg container to hold the map
    let svg = d3.select("body")
        .append("svg")
        .attr("width", width)
        .attr("height", height);

    // load the national csv data

    // load in the state data
    let incarcerationData;
    d3.csv("data/state_data.csv").then(function(data) {
        incarcerationData = data;
    })

    // load in the geoJSON data
    d3.json("data/better-states.json").then(function(data) {
        console.log(data);
        console.log(incarcerationData)

        // loop through each state & append the incarceration data
        for (let i = 0; i < data.features.length; i++) {
            // get the state name
            let stateName = data.features[i].properties.NAME;
            // loop through all the incarceration data to find the same state
            for (let j = 0; j < incarcerationData.length; j++) {
                let incarcerationState = incarcerationData[j].State;
                // if the states are the same, append all the incarceration data to the state object
                if (incarcerationState == stateName) {
                    for (let property in incarcerationData[j]) {
                        // add a new property to the geojson state data with the incarceration data
                        data.features[i][property] = Number(incarcerationData[j][property].replace(/,/g, ''));
                    }
                }
            }
        }
        console.log(data);

        // draw the state borders from the GeoJSON features
        svg.selectAll("path")
            .data(data.features)
            .enter()
            .append("path")
            .attr("d", path)
            .on("click", function(event, d) {
                clickState(event, d);
            })
            .style("stroke", "#000")
            .style("stroke-width", "1")
            .style("fill", function(d) {
                // get the data value for the overall jail population in 2019
                let value = d["2019_inmates_in_custody"]
                if (value) {
                    // console.log(value);
                }
                return "white";
            });

        // add an svg legend
        let legend = d3.select("body").append("svg")
            .attr("x", 0)
            .attr("y", height + 1)
            .append("rect")
            .attr("class", "legend")
            .attr("width", "100%")
            .attr("height", 10)
            .attr("fill", "salmon");

        // add svg to hold click boxes to change time scale
        let timeSelector = d3.select("body").append("svg")
            .attr("x", width / 2)
            .attr("y", height + 1)
            .append("rect")
            .attr("class", "timeSelector")
            .attr("width", "100%")
            .attr("height", 10)
            .attr("fill", "blue");
    });
}

// highlight state on click logic
function clickState(event, d) {
    console.log("click! " + d.properties.NAME); // TODO: highlight state logic
}

// render the national charts
function renderNationalCharts() {
    // import national data
}

// render state charts for selected state
function renderStateCharts(state) {

}

// render comparison charts
function renderComparisonCharts(state1, state2) {

}