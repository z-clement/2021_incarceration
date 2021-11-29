// global variable for the color scale so all functions can access it once the data is loaded
let colorScale;
// global variables to determine the size of the map container, map image, & legend elements
const width = 1000;
const height = 800;
const mapHeight = 600;
const titleHeight = 30;
const legendHeight = 150;
const legendWidth = 200;
const timeWidth = 200;

window.onload = function() {
    renderMap();
    renderNationalCharts();
}

var numStatesClicked = 0

// function to draw all the state borders
function renderMap() {
    // an svg container to hold the map
    let svg = d3.select("body")
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("class", "mapContainer");

    // load the national csv data

    // load in the state data
    let incarcerationData;
    d3.csv("data/state_data.csv").then(function(data) {
        incarcerationData = data;
    })

    // load in the geoJSON data
    d3.json("data/better-states.json").then(function(data) {
        console.log(incarcerationData)

        // loop through each state & append the incarceration data
        for (let i = 0; i < data.features.length; i++) {
            // get the state name
            let stateName = data.features[i].properties.NAME;
            // loop through all the incarceration data to find the same state
            for (let j = 0; j < incarcerationData.length; j++) {
                // if the states are the same, append all the incarceration data to the state object
                if (incarcerationData[j].State == stateName) {
                    for (let property in incarcerationData[j]) {
                        // add a new property to the geojson state data with the incarceration data
                        // the formatting of the raw data has commas, which need to be removed so that aren't read as Strings
                        data.features[i][property] = Number(incarcerationData[j][property].replace(/,/g, ''));
                    }
                }
            }
        }
        console.log(data);

        // create color scales for all national data, 2005, 2013, and 2019
        colorScale = makeColorScale(data.features);
        // set the default year/data to 2019
        let yearData = "2019_incarceration_rate";

        // draw the state borders from the GeoJSON features
        drawStateBorders(svg, data, yearData);
        // create a legend with a title that corresponds to the data being mapped
        createLegend(svg, yearData);
        // add svg to hold click boxes to change time scale
        createTimeSelect(svg);
        // create elements that display which states are selected
        createStateSelect(svg);
    });
}

// make a color scale for the state incarceration data
function makeColorScale(data) {
    let stateKeys = ["2005_incarceration_rate", "2013_incarceration_rate", "2019_incarceration_rate"];
    let colorClasses = [
        "#fef0d9",
        "#fdcc8a",
        "#fc8d59",
        "#e34a33",
        "#b30000"
    ];

    let domainArray = [];
    // loop through all the years
    for (let i = 0; i < stateKeys.length; i++) {
        // loop through all the state data values for that year
        for (let j = 0; j < data.length; j++) {
            // pull the data value for a state (data[j]) & the given year
            let value = data[j][stateKeys[i]];
            // make sure the data is not null/NaN
            if (value) {
                domainArray.push(value);
            }
        }
    };
    let max = Math.max(...domainArray);
    let min = Math.min(...domainArray);

    // give the array of incarceration data as the scale domain
    let colorScale = d3.scaleQuantize()
        .domain([min, max])
        .range(colorClasses);

    return colorScale;
}

// draw the state borders on the webpage
function drawStateBorders(svg, data, yearData) {
    // set the map projection to be Albers USA
    let projection = d3.geoAlbersUsa()
        .translate([width / 2, mapHeight / 2]) // center the map on the screen
        .scale([1200]);

    // path generator to draw the borders of the states
    let path = d3.geoPath()
        .projection(projection);

    svg.selectAll("path")
        .data(data.features)
        .enter()
        .append("path")
        .attr("d", path)
        .attr("class", function(d) { return "state " + d.properties.NAME.replace(" ", "_") })
        .on("click", function(event, d) {
            clickState(event, d);
        })
        .style("stroke", "#000")
        .style("stroke-width", "1")
        .style("fill", function(d) {
            // get the color from the scale based on the scaleQuantize function
            let color = colorScale(d[yearData]);
            // if the color is undefined/null (means there's no data for that state) make the state gray
            color = color ? color : "#ccc";
            return color
        });
}

// create a legend & draw it on the page
function createLegend(svg, yearData) {
    // container for the legend + legend title
    let legendContainer = svg.append("svg")
        .attr("class", "legend-container")
        .attr("transform", "translate(0," + mapHeight + ")")
        .attr("width", legendWidth)
        .attr("height", 200);

    // text element that holds the title
    // tspan elements to make this multiline
    let legendTitle = legendContainer.append("text")
        .attr("class", "legend-title")
        .attr("x", 0)
        .attr("y", 0);
    legendTitle.append("tspan")
        .attr("x", 0)
        .attr("dy", "1em")
        .text(yearData.replaceAll("_", " "));
    legendTitle.append("tspan")
        .attr("x", 0)
        .attr("dy", "1em")
        .text("\ Per 100,000 People");

    // add an svg legend for the initial data
    // adapted from Mike Bostock: http://bl.ocks.org/mbostock/3888852
    let legend = legendContainer.append("svg")
        .attr("class", "legend")
        .attr("height", legendHeight)
        .attr("y", titleHeight)
        .selectAll("g")
        .data(colorScale.range().slice().reverse())
        .enter().append("g")
        .attr("transform", function(d, i) {
            return "translate(0," + (10 + i * 20) + ")";
        });

    legend.append("rect")
        .attr("width", 18)
        .attr("height", 18)
        .style("fill", function(d) { return d; }); // d in this case is the color from the colorScale

    legend.append("text")
        .attr("x", 24)
        .attr("y", 9)
        .attr("dy", ".35em")
        .text(function(d) {
            // use invertExtent to go from range to domain for labels
            let extent = colorScale.invertExtent(d);
            let min = extent[0];
            let max = extent[1];
            return min + " - " + max;
        });
    // add a legend element for no data
    let extraBox = legendContainer.append("svg")
        .attr("class", "extra-box")
        .attr("height", 20)
        .attr("y", legendHeight - 10);
    extraBox.append("rect")
        .attr("width", 18)
        .attr("height", 18)
        .style("fill", "#ccc");
    extraBox.append("text")
        .attr("x", 24)
        .attr("y", 9)
        .attr("dy", ".35em")
        .text("No Data");
}

// create & render a selector to change the year
function createTimeSelect(svg) {
    let timeContainer = svg.append("svg")
        .attr("class", "time-container")
        .attr("transform", "translate(" + legendWidth + "," + mapHeight + ")")
        .attr("width", timeWidth)
        .attr("height", 200);
    // add a title to the time selector
    let timeTitle = timeContainer.append("text")
        .attr("class", "time-title")
        .attr("x", 0)
        .attr("y", 30)
        .text("Select year:");
    // similar to the legend, create 3 boxes for 2005, 2013, 2019
    let timeData = ["2005", "2013", "2019"]
    let timeSelector = timeContainer.append("svg")
        .attr("class", "time-selector")
        .attr("height", legendHeight)
        .attr("y", titleHeight)
        .selectAll("g")
        .data(timeData)
        .enter().append("g")
        .attr("transform", function(d, i) {
            return "translate(1," + (10 + i * 20) + ")";
        });
    timeSelector.append("rect")
        .attr("width", 18)
        .attr("height", 18)
        .attr("class", function(d) { return "y" + d })
        .style("outline-style", "solid")
        .style("outline-width", "thin")
        .style("outline-offset", "-1px")
        .style("fill", "white")
        .on("click", function(event, d) {
            changeYear(event, d);
        });
    timeSelector.append("text")
        .attr("x", 24)
        .attr("y", 8.5)
        .attr("dy", ".35em")
        .text(function(d) { return d });

    // shade in the default year, which is 2019
    d3.select(".y2019")
        .attr("id", "selected");
}

// change year when box is clicked
function changeYear(event, d) {
    let year = d;
    // deselect the current year that is selected
    d3.select("#selected")
        .attr("id", "");
    // add the "selected" id to the year that is clicked
    d3.select(".y" + year)
        .attr("id", "selected");
    // adjust the fill for all the states based on the data from the year that's selected
    d3.selectAll(".state")
        .style("fill", function(d) {
            let color = colorScale(d[year + "_incarceration_rate"]);
            color = color ? color : "#ccc";
            return color
        });
    // update the legend title to reflect which year is selected (maybe not needed?)
    d3.select(".legend-title").select("tspan")
        .text(year + " incarceration rate");
}

function createStateSelect(svg) {
    let stateSelectWidth = (width - timeWidth - legendWidth) / 2;
    let state1 = svg.append("svg")
        .attr("transform", "translate(" + (timeWidth + legendWidth) + "," + mapHeight + ")")
        .attr("width", stateSelectWidth)
        .attr("height", legendHeight);
    state1.append("text")
        .attr("class", "state1")
        .attr("x", 30)
        .attr("y", 30)
        .text("State 1: undefined");

    let state2 = svg.append("svg")
        .attr("transform", "translate(" + (timeWidth + legendWidth + stateSelectWidth) + "," + mapHeight + ")")
        .attr("width", stateSelectWidth)
        .attr("height", legendHeight);
    state2.append("text")
        .attr("class", "state2")
        .attr("x", 30)
        .attr("y", 30)
        .text("State 2: undefined");
}

let statesClicked = [];
// highlight state on click logic
function clickState(event, d) {

    var state = d.properties.NAME
    console.log(state)
        // if else highlighted or not 
    if (statesClicked.includes(state)) {
        d3.select("." + state.replace(" ", "_"))
            .attr("id", "")
        statesClicked.splice(statesClicked.indexOf(state), 1)
    } else {


        if (statesClicked.length < 2) {
            console.log("A:" + statesClicked.length)
            statesClicked.push(state);
            d3.select("." + state.replace(" ", "_"))
                .attr("id", "clicked")

        } else {
            d3.select("." + statesClicked[0].replace(" ", "_"))
                .attr("id", "");
            statesClicked[0] = statesClicked[1];
            statesClicked[1] = state;
            d3.select("." + state.replace(" ", "_"))
                .attr("id", "clicked")
        }
    }
    console.log("Array:" + statesClicked)

    console.log("Current States Selected: " + statesClicked[0] + " and " + statesClicked[1])
    console.log(numStatesClicked);

    console.log("click! " + d.properties.NAME);

    numStatesClicked += 1

    d3.select(".state1")
        .text("State 1: " + statesClicked[0]);

    d3.select(".state2")
        .text("State 2: " + statesClicked[1]);
}


// render the national charts
function renderNationalCharts() {
    // import national data
    let nationalData;
    d3.csv("data/national_data.csv").then(function(data) {
        nationalData = data;
        console.log(nationalData);
        // get the relevant data for the charts

        // create a container for the charts

        // render each chart
    })
}

// render state charts for selected state
function renderStateCharts(state) {

}

// render comparison charts
function renderComparisonCharts(state1, state2) {

}