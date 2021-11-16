//insert code here!
window.onload = function() {
    renderMap();
    renderNationalCharts();
}

var numStatesClicked = 0

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

        // create a base color scale for the national map of incarceration rates in 2019
        let baseData = "2019_incarceration_rate";
        let colorScale = makeColorScale(data.features, baseData);

        // draw the state borders from the GeoJSON features
        svg.selectAll("path")
            .data(data.features)
            .enter()
            .append("path")
            .attr("d", path)
            .attr("class", function(d) { return d.properties.NAME.replace(" ", "_") })
            .on("click", function(event, d) {
                clickState(event, d);
            })
            .style("stroke", "#000")
            .style("stroke-width", "1")
            .style("fill", function(d) {
                // get the color from the scale based on the scaleQuantize function
                let color = colorScale(d[baseData]);
                color = color ? color : "#ccc";
                return color
            });

        // create a legend with a title that corresponds to the data being mapped
        let titleHeight = 30;
        let legendHeight = 150;
        let legendWidth = 200;
        // container for the legend + legend title
        let legendContainer = d3.select("body").append("svg")
            .attr("class", "legend-container")
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
            .text(baseData.replaceAll("_", " "));
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

        // add svg to hold click boxes to change time scale
        let timeContainer = d3.select("body").append("svg")
            .attr("class", "time-container")
            .attr("width", 200)
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
            .style("outline-style", "solid")
            .style("outline-width", "thin")
            .style("outline-offset", "-1px")
            .style("fill", "white");
        timeSelector.append("text")
            .attr("x", 24)
            .attr("y", 8.5)
            .attr("dy", ".35em")
            .text(function(d) { return d });
    });
}

// make a color scale for some input data
function makeColorScale(data, key) {
    let colorClasses = [
        "#fef0d9",
        "#fdcc8a",
        "#fc8d59",
        "#e34a33",
        "#b30000"
    ];

    let domainArray = [];
    for (let i = 0; i < data.length; i++) {
        let value = data[i][key];
        if (value) {
            domainArray.push(value);
        };
    }
    let max = Math.max(...domainArray);
    let min = Math.min(...domainArray);

    // give the array of incarceration data as the scale domain
    let colorScale = d3.scaleQuantize()
        .domain([min, max])
        .range(colorClasses);

    return colorScale;
}


const statesClicked = [];
// highlight state on click logic
function clickState(event, d) {

    var state = d.properties.NAME

    statesClicked.push(state)

    console.log("Current States Selected: " + statesClicked[numStatesClicked] + " and " + statesClicked[numStatesClicked - 1])
        //console.log(statesClicked);
        //console.log(numStatesClicked);
        //console.log(statesClicked[numStatesClicked])
        //console.log(statesClicked[numStatesClicked-1])
        //console.log("selection:" + statesClicked[numStatesClicked]);
    d3.select("." + statesClicked[numStatesClicked].replace(" ", "_"))
        .style("stroke", "orange")
        .style("stroke-width", "8px")
        .style("fill", "#70808080");
    if (numStatesClicked > 1) {
        d3.select("." + statesClicked[numStatesClicked - 2].replace(" ", "_"))
            .style("stroke", "rgb(0,0,0)")
            .style("stroke-width", "1px")
            .style("fill", "transparent");

    }

    //console.log("clicked:"+numStatesClicked)
    console.log("click! " + d.properties.NAME); // TODO: highlight state logic

    numStatesClicked += 1
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



/*if (numStatesClicked == 0)
    {
        console.log("1: "+statesClicked[numStatesClicked]+"2: "+statesClicked[numStatesClicked+1]) 
        d3.select("."+state1.replace(" ","_"))
            .style("fill","orange");
    }
    else
    {
        var state2 = d.properties.NAME
        statesClicked.push(state2)
        if (numStatesClicked == 1)
        {
            console.log("1: "+statesClicked[numStatesClicked]+"2: "+statesClicked[numStatesClicked+1])
            d3.select("."+state2.replace(" ","_"))
                .style("fill","orange");
        }
        else
        {
            d3.select("."+state1.replace(" ","_"))
                .style("fill","transparent");
            state1 = state2;
            state2 = d.properties.NAME
            console.log("1: "+state1+"2: "+state2)
            d3.select("."+state2.replace(" ","_"))
                .style("fill","orange");
        }
    
        //console.log("Too many states clicked.")
    }
    /*else 
    {
        state1 = state2;
        state2 = d.properties.NAME
        d3.select("."+state2.replace(" ","_"))
            .style("fill","orange");
    */